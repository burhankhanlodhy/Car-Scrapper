import { getDb, getTimestamp } from '../firebase/admin';
import { startWorkerPool } from './pool';

const JOBS_COLLECTION = 'scrape_jobs';
const POLL_INTERVAL_MS = 5000;

export async function startJobScheduler(): Promise<void> {
  console.log('[scheduler] Polling for pending jobs every', POLL_INTERVAL_MS, 'ms');

  while (true) {
    const db = getDb();
    const snapshot = await db.collection(JOBS_COLLECTION)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get()
      .catch(() => null);

    if (snapshot && !snapshot.empty) {
      const doc = snapshot.docs[0];
      const job = doc.data();

      console.log(`[scheduler] Found pending job ${doc.id}, starting...`);

      await doc.ref.update({ status: 'running', startedAt: getTimestamp() });

      await startWorkerPool({
        concurrency: job.concurrency ?? 10,
        forceRefresh: job.forceRefresh ?? false,
        jobId: doc.id,
      });
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}
