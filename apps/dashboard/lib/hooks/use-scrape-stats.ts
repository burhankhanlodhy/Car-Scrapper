'use client';

import { useState, useEffect, useRef } from 'react';
import { getDb, collection, doc, onSnapshot, query, orderBy, limit, where } from '../firebase';

export interface ScrapeStats {
  totalDealerships: number;
  queueDepth: number;
  activeWorkers: number;
  errorsToday: number;
  urlsPerHour: number;
  lastUpdatedAt: number | null;
}

export interface ThroughputPoint {
  time: string;
  urlsPerMin: number;
  errorsPerMin: number;
}

const EMPTY_STATS: ScrapeStats = {
  totalDealerships: 0,
  queueDepth: 0,
  activeWorkers: 0,
  errorsToday: 0,
  urlsPerHour: 0,
  lastUpdatedAt: null,
};

export function useScrapeStats() {
  const [stats, setStats] = useState<ScrapeStats>(EMPTY_STATS);
  const [throughput, setThroughput] = useState<ThroughputPoint[]>([]);
  const prevDoneRef = useRef(0);

  useEffect(() => {
    const db = getDb();

    // 1. Total dealerships from stats/global (written after each scrape)
    const unsubStats = onSnapshot(
      doc(db, 'stats', 'global'),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setStats(prev => ({
          ...prev,
          totalDealerships: data.totalDealerships ?? 0,
          lastUpdatedAt: data.lastUpdatedAt?.toMillis?.() ?? null,
        }));
      },
      () => {} // silently ignore permission errors
    );

    // 2. Queue depth from discovery_urls pending count
    const unsubQueue = onSnapshot(
      query(
        collection(db, 'discovery_urls'),
        where('status', '==', 'pending'),
        limit(1000)
      ),
      (snap) => {
        setStats(prev => ({ ...prev, queueDepth: snap.size }));
      },
      () => {}
    );

    // 3. Running jobs → active workers + throughput
    const unsubJobs = onSnapshot(
      query(collection(db, 'scrape_jobs'), where('status', '==', 'running'), limit(5)),
      (snap) => {
        let workers = 0;
        let totalDone = 0;
        let totalFailed = 0;

        snap.forEach(d => {
          const data = d.data();
          workers = Math.max(workers, data.concurrency ?? 0);
          totalDone += data.progress?.done ?? 0;
          totalFailed += data.progress?.failed ?? 0;
        });

        setStats(prev => ({
          ...prev,
          activeWorkers: snap.size > 0 ? workers : 0,
          errorsToday: totalFailed,
        }));

        // Throughput: delta done since last poll
        const delta = Math.max(0, totalDone - prevDoneRef.current);
        prevDoneRef.current = totalDone;

        if (snap.size > 0) {
          const now = new Date();
          const label = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          setThroughput(prev => {
            const next = [...prev, { time: label, urlsPerMin: delta, errorsPerMin: 0 }];
            return next.slice(-20);
          });
          // Estimate urls/hr from recent throughput
          setStats(prev => ({ ...prev, urlsPerHour: delta * 60 }));
        }
      },
      () => {}
    );

    // 4. Fallback: count dealerships directly if stats/global doesn't exist yet
    const unsubDealers = onSnapshot(
      query(collection(db, 'dealerships'), limit(1000)),
      (snap) => {
        if (snap.size > 0) {
          setStats(prev => ({
            ...prev,
            totalDealerships: Math.max(prev.totalDealerships, snap.size),
          }));
        }
      },
      () => {}
    );

    return () => {
      unsubStats();
      unsubQueue();
      unsubJobs();
      unsubDealers();
    };
  }, []);

  return { stats, throughput };
}
