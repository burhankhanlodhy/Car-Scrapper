'use client';

import { useState } from 'react';
import { useJobs, useJobLogs } from '@/lib/hooks/use-jobs';
import { LiveLogFeed } from '@/components/live-log-feed';
import { JobControls } from '@/components/job-controls';
import { cn, formatDate, formatDuration, STATUS_COLORS } from '@/lib/utils';
import { Briefcase, CheckCircle, XCircle, Clock, Play, Loader2 } from 'lucide-react';
import type { ScrapeJob } from '@dealership-scraper/shared';

function JobCard({ job, isSelected, onSelect }: { job: ScrapeJob; isSelected: boolean; onSelect: () => void }) {
  const progress = job.progress ?? { total: 0, done: 0, failed: 0, skipped: 0 };
  const total = Math.max(progress.total, progress.done + progress.failed);
  const pct = total > 0 ? Math.round((progress.done / total) * 100) : 0;

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all',
        isSelected
          ? 'border-primary/50 bg-primary/5'
          : 'border-border hover:border-border/80 hover:bg-secondary/30'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={cn('badge-tech text-[10px]', STATUS_COLORS[job.status])}>
          {job.status}
        </span>
        <span className="text-xs font-mono text-muted-foreground truncate ml-auto">{job.id.slice(0, 8)}…</span>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-2">
          <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
            <span>{progress.done}/{total}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                job.status === 'running' ? 'bg-neon-green' :
                  job.status === 'completed' ? 'bg-primary' :
                    job.status === 'failed' ? 'bg-red-400' : 'bg-muted-foreground'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
        <div className="flex gap-3">
          <span className="text-neon-green">✓{progress.done}</span>
          <span className="text-red-400">✗{progress.failed}</span>
          <span className="text-muted-foreground">↷{progress.skipped}</span>
        </div>
        <span>{formatDate(job.createdAt)}</span>
      </div>

      {job.status === 'running' && job.currentUrl && (
        <div className="mt-1.5 text-[10px] font-mono text-muted-foreground truncate">
          → {job.currentUrl.replace(/^https?:\/\//, '')}
        </div>
      )}
    </button>
  );
}

export default function JobsPage() {
  const { jobs, loading } = useJobs();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const activeLogJobId = selectedJobId ?? jobs[0]?.id ?? null;
  const { logs, error: logError } = useJobLogs(activeLogJobId);

  const runningJob = jobs.find(j => j.status === 'running');

  const statusCounts = {
    running: jobs.filter(j => j.status === 'running').length,
    pending: jobs.filter(j => j.status === 'pending').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
  };

  async function handleStartJob(config: { targetStates: string[]; targetBrands: string[]; concurrency: number; forceRefresh: boolean }) {
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (data.jobId) setSelectedJobId(data.jobId);
  }

  async function handleStopJob(jobId: string) {
    await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Job Queue</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 font-mono">
            Monitor and control scrape jobs
          </p>
        </div>
      </div>

      {/* Status overview */}
      <div className="grid grid-cols-4 gap-3">
        {(Object.entries(statusCounts) as [string, number][]).map(([status, count]) => (
          <div key={status} className="glass-card p-3 flex items-center gap-3">
            <div className={cn('w-2 h-2 rounded-full',
              status === 'running' ? 'bg-neon-green animate-pulse-slow' :
                status === 'pending' ? 'bg-yellow-400' :
                  status === 'completed' ? 'bg-primary' : 'bg-red-400'
            )} />
            <div>
              <div className="text-xs font-mono text-muted-foreground capitalize">{status}</div>
              <div className="text-xl font-bold font-mono">{count}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Job list */}
        <div className="space-y-3">
          <JobControls
            onStart={handleStartJob}
            onStop={handleStopJob}
            activeJobId={runningJob?.id ?? null}
            isRunning={!!runningJob}
          />

          <div className="glass-card p-3 space-y-2">
            <div className="text-xs font-mono text-muted-foreground px-1">Recent Jobs</div>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-xs font-mono">Loading...</span>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-8 text-xs font-mono text-muted-foreground">
                No jobs yet. Start a scrape above.
              </div>
            ) : (
              jobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  isSelected={selectedJobId === job.id}
                  onSelect={() => setSelectedJobId(job.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Live log for selected job */}
        <div className="lg:col-span-2">
          <LiveLogFeed
            logs={logs}
            maxHeight="calc(100vh - 280px)"
            jobId={activeLogJobId}
            error={logError}
          />
        </div>
      </div>
    </div>
  );
}
