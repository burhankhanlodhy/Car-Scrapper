'use client';

import { useState } from 'react';
import { StatsBar } from '@/components/stats-bar';
import { ThroughputChart } from '@/components/throughput-chart';
import { TechDistributionChart } from '@/components/tech-distribution-chart';
import { WorkerStatusGrid } from '@/components/worker-status-grid';
import { LiveLogFeed } from '@/components/live-log-feed';
import { JobControls } from '@/components/job-controls';
import { useScrapeStats } from '@/lib/hooks/use-scrape-stats';
import { useDealers } from '@/lib/hooks/use-dealers';
import { useJobs, useJobLogs } from '@/lib/hooks/use-jobs';
import { formatDate, cn, STATUS_COLORS, CMS_COLORS, truncate } from '@/lib/utils';
import Link from 'next/link';
import type { WorkerStatus } from '@dealership-scraper/shared';

export default function CommandCenter() {
  const { stats, throughput } = useScrapeStats();
  const { dealers } = useDealers({}, 10);
  const { jobs } = useJobs();
  // Pick the most recent running job, fall back to most recent job of any status
  const runningJob = jobs.find(j => j.status === 'running') ?? jobs[0] ?? null;
  const logJobId = runningJob?.id ?? null;
  const { logs, error: logError } = useJobLogs(logJobId);

  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  async function handleStartJob(jobConfig: { targetStates: string[]; targetBrands: string[]; concurrency: number; forceRefresh: boolean }) {
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobConfig),
    });
    const data = await res.json();
    if (data.jobId) setActiveJobId(data.jobId);
  }

  async function handleStopJob(jobId: string) {
    await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
    setActiveJobId(null);
  }

  // Synthetic worker statuses from running job
  const workerStatuses: WorkerStatus[] = runningJob
    ? Array.from({ length: runningJob.concurrency ?? 10 }, (_, i) => ({
        id: i + 1,
        status: i < (runningJob.workerCount ?? 0) ? 'running' : 'idle',
        currentUrl: i === 0 ? runningJob.currentUrl ?? null : null,
        processedCount: Math.floor((runningJob.progress?.done ?? 0) / Math.max(1, runningJob.concurrency ?? 10)),
        errorCount: Math.floor((runningJob.progress?.failed ?? 0) / Math.max(1, runningJob.concurrency ?? 10)),
        lastActivityAt: Date.now(),
      } as WorkerStatus))
    : [];

  return (
    <div className="p-6 space-y-5 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-mono">
            Real-time dealership intelligence — carpilothq
          </p>
        </div>
        <div className="text-xs font-mono text-muted-foreground text-right">
          {stats.lastUpdatedAt ? (
            <>Last sync<br />{formatDate(stats.lastUpdatedAt)}</>
          ) : (
            <span className="text-muted-foreground/50">No data yet</span>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <StatsBar stats={stats} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left: Charts stacked */}
        <div className="xl:col-span-2 space-y-4">
          <ThroughputChart data={throughput} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TechDistributionChart dealers={dealers} />
            <WorkerStatusGrid
              workers={workerStatuses}
              concurrency={runningJob?.concurrency ?? 10}
            />
          </div>
        </div>

        {/* Right: Controls + Log */}
        <div className="space-y-4">
          <JobControls
            onStart={handleStartJob}
            onStop={handleStopJob}
            activeJobId={runningJob?.id ?? activeJobId}
            isRunning={!!runningJob}
          />
          <LiveLogFeed logs={logs} maxHeight="380px" jobId={logJobId} error={logError} />
        </div>
      </div>

      {/* Recent Dealerships */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-medium">Recent Dealerships</span>
          <Link href="/dealers" className="text-xs font-mono text-primary hover:underline">View all →</Link>
        </div>
        <div className="divide-y divide-border">
          {dealers.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs font-mono text-muted-foreground">
              No dealerships scraped yet
            </div>
          ) : (
            dealers.slice(0, 8).map(d => (
              <Link
                key={d.id}
                href={`/dealers/${d.id}`}
                className="flex items-center gap-4 px-4 py-2.5 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{d.name ?? '—'}</div>
                  <div className="text-xs font-mono text-muted-foreground truncate">
                    {d.website?.url?.replace(/^https?:\/\//, '') ?? '—'}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {d.city && <span className="text-xs text-muted-foreground font-mono">{d.city}, {d.state}</span>}
                  <span className={cn('badge-tech text-[10px]', CMS_COLORS[d.cms?.platform ?? 'unknown'])}>
                    {d.cms?.platform}
                  </span>
                  <span className={cn('badge-tech text-[10px]', STATUS_COLORS[d.status])}>
                    {d.status}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
