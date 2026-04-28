'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDb, collection, query, orderBy, limit, where, onSnapshot, getDocs, getDoc, doc } from '../firebase';
import type { Dealership } from '@dealership-scraper/shared';
import type { QueryConstraint } from 'firebase/firestore';

export interface DealerFilters {
  state?: string;
  cmsPlatform?: string;
  status?: string;
  search?: string;
}

export function useDealers(filters: DealerFilters = {}, pageSize = 50) {
  const [dealers, setDealers] = useState<Dealership[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const db = getDb();
    setLoading(true);

    const constraints: QueryConstraint[] = [];

    if (filters.state) constraints.push(where('state', '==', filters.state));
    if (filters.cmsPlatform) constraints.push(where('cms.platform', '==', filters.cmsPlatform));
    if (filters.status) constraints.push(where('status', '==', filters.status));

    constraints.push(orderBy('lastScrapedAt', 'desc'));
    constraints.push(limit(pageSize));

    const q = query(collection(db, 'dealerships'), ...constraints);

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ ...d.data(), id: d.id }) as Dealership);
      const filtered = filters.search
        ? docs.filter(d =>
            (d.name ?? '').toLowerCase().includes(filters.search!.toLowerCase()) ||
            (d.website?.url ?? '').toLowerCase().includes(filters.search!.toLowerCase()) ||
            (d.city ?? '').toLowerCase().includes(filters.search!.toLowerCase())
          )
        : docs;
      setDealers(filtered);
      setTotal(snap.size);
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, [filters.state, filters.cmsPlatform, filters.status, filters.search, pageSize]);

  return { dealers, loading, total };
}

export function useDealer(id: string) {
  const [dealer, setDealer] = useState<Dealership | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const db = getDb();
    const unsub = onSnapshot(doc(db, 'dealerships', id), (snap) => {
      setDealer(snap.exists() ? ({ ...snap.data(), id: snap.id } as Dealership) : null);
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  return { dealer, loading };
}
