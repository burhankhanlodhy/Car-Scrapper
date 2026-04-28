import { getDb, getTimestamp } from './admin';
import { buildDealershipId } from '../discovery/url-normalizer';
import type { Dealership } from '@dealership-scraper/shared';

const COLLECTION = 'dealerships';
const INCREMENTAL_DAYS = 30;

export async function getDealershipByDomain(domain: string): Promise<Dealership | null> {
  const db = getDb();
  const id = buildDealershipId(`https://${domain}`);
  if (!id) return null;

  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;

  return doc.data() as Dealership;
}

export async function wasRecentlyScraped(domain: string): Promise<boolean> {
  const existing = await getDealershipByDomain(domain);
  if (!existing) return false;

  const cutoff = Date.now() - INCREMENTAL_DAYS * 24 * 60 * 60 * 1000;
  return existing.lastScrapedAt > cutoff;
}

export async function upsertDealership(dealership: Dealership): Promise<void> {
  const db = getDb();
  const id = buildDealershipId(dealership.website.url);
  if (!id) {
    console.warn('[firestore] Could not build ID for:', dealership.website.url);
    return;
  }

  const docRef = db.collection(COLLECTION).doc(id);

  await docRef.set(
    {
      ...dealership,
      id,
      lastScrapedAt: getTimestamp(dealership.lastScrapedAt),
    },
    { merge: true }
  );
}

export async function updateDealershipStatus(
  url: string,
  status: 'complete' | 'partial' | 'failed',
  error?: string
): Promise<void> {
  const db = getDb();
  const id = buildDealershipId(url);
  if (!id) return;

  await db.collection(COLLECTION).doc(id).set(
    {
      status,
      lastScrapedAt: getTimestamp(),
      ...(error ? { lastError: error } : {}),
    },
    { merge: true }
  );
}

export async function incrementStats(newDealership: boolean): Promise<void> {
  const db = getDb();
  const statsRef = db.collection('stats').doc('global');

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(statsRef);
    const data = doc.data() ?? {};
    tx.set(statsRef, {
      totalDealerships: (data.totalDealerships ?? 0) + 1,
      newToday: (data.newToday ?? 0) + (newDealership ? 1 : 0),
      lastUpdatedAt: getTimestamp(),
    }, { merge: true });
  });
}
