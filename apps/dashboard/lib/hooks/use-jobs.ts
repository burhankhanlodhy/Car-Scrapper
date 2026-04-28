'use client';

import { useState, useEffect } from 'react';
import { getDb, collection, query, orderBy, limit, where, onSnapshot, doc } from '../firebase';
import type { ScrapeJob, ScrapeLog } from '@dealership-scraper/shared';

export function useJobs(statusFilter?: string) {
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDb();
    const constraints = statusFilter
      ? [where('status', '==', statusFilter), orderBy('createdAt', 'desc'), limit(20)]
      : [orderBy('createdAt', 'desc'), limit(20)];

    const q = query(collection(db, 'scrape_jobs'), ...constraints);
    const unsub = onSnapshot(q, (snap) => {
      setJobs(snap.docs.map(d => ({ ...d.data(), id: d.id }) as ScrapeJob));
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, [statusFilter]);

  return { jobs, loading };
}

export function useJobLogs(jobId: string | null) {
  const [logs, setLogs] = useState<ScrapeLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    setLogs([]);
    setError(null);
    const db = getDb();

    // No orderBy — sort client-side to avoid needing a Firestore index
    const q = query(
      collection(db, 'scrape_jobs', jobId, 'logs'),
      limit(200)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const entries = snap.docs
          .map(d => ({ ...d.data(), id: d.id }) as ScrapeLog)
          .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
        setLogs(entries);
        setError(null);
      },
      (err) => {
        console.error('[logs] Firestore subscription error:', err.message);
        setError(err.message);
      }
    );
    return () => unsub();
  }, [jobId]);

  return { logs, error };
}

export function useJob(jobId: string | null) {
  const [job, setJob] = useState<ScrapeJob | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const db = getDb();
    const unsub = onSnapshot(doc(db, 'scrape_jobs', jobId), (snap) => {
      setJob(snap.exists() ? ({ ...snap.data(), id: snap.id } as ScrapeJob) : null);
    });
    return () => unsub();
  }, [jobId]);

  return { job };
}
