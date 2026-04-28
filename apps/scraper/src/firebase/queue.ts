import { getDb, getTimestamp } from './admin';
import type { DiscoveryUrl as SharedDiscoveryUrl, ScrapeJob, ScrapeLog } from '@dealership-scraper/shared';
import type { DiscoveredUrl } from '../discovery/google-cse';
import { normalizeDomain } from '../discovery/url-normalizer';

const DISCOVERY_COLLECTION = 'discovery_urls';
const JOBS_COLLECTION = 'scrape_jobs';
const LOGS_SUBCOLLECTION = 'logs';

export async function enqueueDiscoveryUrls(urls: DiscoveredUrl[]): Promise<void> {
  if (!urls.length) return;
  const db = getDb();

  const BATCH_SIZE = 499;
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = urls.slice(i, i + BATCH_SIZE);

    for (const item of chunk) {
      const domain = normalizeDomain(item.url);
      if (!domain) continue;
      const id = domain.replace(/[^a-z0-9.-]/g, '_');
      const ref = db.collection(DISCOVERY_COLLECTION).doc(id);

      batch.set(ref, {
        url: item.url,
        domain,
        source: item.source,
        depth: 0,
        enqueuedAt: Date.now(),
        scrapedAt: null,
        status: 'pending',
        jobId: null,
      }, { merge: false });
    }

    await batch.commit();
  }
}

export async function dequeueNextUrls(
  limit: number,
  jobId: string
): Promise<Array<{ id: string; url: string; domain: string }>> {
  const db = getDb();

  const snapshot = await db.collection(DISCOVERY_COLLECTION)
    .where('status', '==', 'pending')
    .orderBy('enqueuedAt', 'asc')
    .limit(limit)
    .get();

  if (snapshot.empty) return [];

  const results: Array<{ id: string; url: string; domain: string }> = [];
  const batch = db.batch();

  for (const doc of snapshot.docs) {
    batch.update(doc.ref, { status: 'processing', jobId });
    results.push({ id: doc.id, url: doc.data().url, domain: doc.data().domain });
  }

  await batch.commit();
  return results;
}

export async function markUrlDone(id: string, status: 'done' | 'failed'): Promise<void> {
  const db = getDb();
  await db.collection(DISCOVERY_COLLECTION).doc(id).update({
    status,
    scrapedAt: getTimestamp(),
  });
}

export async function getOrCreateJob(jobId?: string): Promise<string> {
  const db = getDb();

  if (jobId) {
    const doc = await db.collection(JOBS_COLLECTION).doc(jobId).get();
    if (doc.exists) return jobId;
  }

  const ref = db.collection(JOBS_COLLECTION).doc();
  await ref.set({
    status: 'running',
    targetStates: [],
    targetCities: [],
    targetBrands: [],
    concurrency: 10,
    forceRefresh: false,
    createdAt: Date.now(),
    startedAt: Date.now(),
    completedAt: null,
    progress: { total: 0, done: 0, failed: 0, skipped: 0 },
    currentUrl: null,
    errorMessage: null,
    workerCount: 0,
  });

  return ref.id;
}

export async function updateJobProgress(
  jobId: string,
  delta: { done?: number; failed?: number; skipped?: number; total?: number; currentUrl?: string | null }
): Promise<void> {
  const db = getDb();
  const ref = db.collection(JOBS_COLLECTION).doc(jobId);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const data = doc.data();
    if (!data) return;

    const progress = data.progress ?? { total: 0, done: 0, failed: 0, skipped: 0 };
    tx.update(ref, {
      'progress.done': progress.done + (delta.done ?? 0),
      'progress.failed': progress.failed + (delta.failed ?? 0),
      'progress.skipped': progress.skipped + (delta.skipped ?? 0),
      'progress.total': Math.max(progress.total, delta.total ?? 0),
      ...(delta.currentUrl !== undefined ? { currentUrl: delta.currentUrl } : {}),
    });
  });
}

export async function completeJob(jobId: string): Promise<void> {
  const db = getDb();
  await db.collection(JOBS_COLLECTION).doc(jobId).update({
    status: 'completed',
    completedAt: getTimestamp(),
    currentUrl: null,
  });
}

export async function appendLog(jobId: string, log: Omit<ScrapeLog, 'id' | 'jobId'>): Promise<void> {
  try {
    const db = getDb();
    const ref = db.collection(JOBS_COLLECTION).doc(jobId).collection(LOGS_SUBCOLLECTION).doc();
    await ref.set({ ...log, jobId, id: ref.id, timestamp: log.timestamp ?? Date.now() });
  } catch (err) {
    // Non-critical — never crash workers over log failures, but warn once
    console.warn('[appendLog] Failed to write log entry:', err instanceof Error ? err.message : String(err));
  }
}
