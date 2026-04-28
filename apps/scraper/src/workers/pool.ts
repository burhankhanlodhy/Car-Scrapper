import PQueue from 'p-queue';
import { dequeueNextUrls, getOrCreateJob, completeJob, updateJobProgress } from '../firebase/queue';
import { scrapeUrl } from './scrape-worker';
import { sleep } from '../http/retry';

export interface PoolOptions {
  concurrency: number;
  forceRefresh: boolean;
  jobId?: string;
}

const POLL_INTERVAL_MS = 2000;
const BATCH_SIZE = 20;
const COOLDOWN_MAP = new Map<number, number>(); // workerId -> cooldown until

let activeWorkerCount = 0;
let shuttingDown = false;

process.on('SIGINT', () => { shuttingDown = true; });
process.on('SIGTERM', () => { shuttingDown = true; });

export async function startWorkerPool(opts: PoolOptions): Promise<void> {
  const { concurrency, forceRefresh } = opts;
  const jobId = await getOrCreateJob(opts.jobId);

  console.log(`[pool] Starting ${concurrency} workers for job ${jobId}`);

  // Write workerCount so dashboard can display active workers
  const db = (await import('../firebase/admin')).getDb();
  await db.collection('scrape_jobs').doc(jobId).update({ workerCount: concurrency, status: 'running' }).catch(() => {});

  const queue = new PQueue({ concurrency });
  let emptyPolls = 0;

  activeWorkerCount = concurrency;

  while (!shuttingDown) {
    if (queue.size + queue.pending >= concurrency * 2) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    const urls = await dequeueNextUrls(BATCH_SIZE, jobId);

    if (!urls.length) {
      emptyPolls++;
      if (emptyPolls >= 5) {
        console.log('[pool] Queue appears empty after 5 polls, waiting for more...');
        if (emptyPolls >= 15) {
          console.log('[pool] Queue empty for 30s — completing job');
          break;
        }
      }
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    emptyPolls = 0;

    for (const item of urls) {
      const workerId = (queue.size % concurrency) + 1;

      // Check cooldown
      const coolUntil = COOLDOWN_MAP.get(workerId) ?? 0;
      if (Date.now() < coolUntil) {
        await sleep(coolUntil - Date.now());
      }

      queue.add(async () => {
        const result = await scrapeUrl({
          id: item.id,
          url: item.url,
          domain: item.domain,
          jobId,
          workerId,
          forceRefresh,
        });

        if (result.error === 'rate-limited') {
          // Cooldown this worker for 30s
          COOLDOWN_MAP.set(workerId, Date.now() + 30_000);
          console.warn(`[pool] Worker ${workerId} cooling down 30s (rate limited)`);
        }
      });
    }

    await updateJobProgress(jobId, {
      total: urls.length + (queue.size + queue.pending),
    }).catch(() => {});
  }

  await queue.onIdle();
  await completeJob(jobId);
  console.log(`[pool] Job ${jobId} completed`);
}
