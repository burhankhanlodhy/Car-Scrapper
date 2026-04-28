export type JobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface ScrapeJobProgress {
  total: number;
  done: number;
  failed: number;
  skipped: number;
}

export interface ScrapeJob {
  id: string;
  status: JobStatus;
  targetStates: string[];
  targetCities: string[];
  targetBrands: string[];
  concurrency: number;
  forceRefresh: boolean;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  progress: ScrapeJobProgress;
  currentUrl: string | null;
  errorMessage: string | null;
  workerCount: number;
}

export interface ScrapeRun {
  id: string;
  jobId: string;
  startedAt: number;
  completedAt: number | null;
  totalUrls: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  newDealerships: number;
  updatedDealerships: number;
  durationMs: number | null;
}

export interface DiscoveryUrl {
  id: string;
  url: string;
  domain: string;
  source: string;
  depth: number;
  enqueuedAt: number;
  scrapedAt: number | null;
  status: 'pending' | 'processing' | 'done' | 'failed';
  jobId: string | null;
}

export interface ScrapeLog {
  id: string;
  jobId: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  url: string | null;
  timestamp: number;
  workerId: number | null;
  meta: Record<string, unknown>;
}

export interface WorkerStatus {
  id: number;
  status: 'idle' | 'running' | 'error' | 'cooldown';
  currentUrl: string | null;
  processedCount: number;
  errorCount: number;
  lastActivityAt: number | null;
}
