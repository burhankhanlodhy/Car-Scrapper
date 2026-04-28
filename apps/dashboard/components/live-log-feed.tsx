'use client';

import { useEffect, useRef } from 'react';
import { cn, timeAgo } from '@/lib/utils';
import { Terminal } from 'lucide-react';
import type { ScrapeLog } from '@dealership-scraper/shared';

interface Props {
  logs: ScrapeLog[];
  maxHeight?: string;
  jobId?: string | null;
  error?: string | null;
}

const LEVEL_STYLES: Record<string, string> = {
  info: 'text-muted-foreground',
  success: 'text-neon-green',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

const LEVEL_PREFIX: Record<string, string> = {
  info: '[INFO ]',
  success: '[DONE ]',
  warn: '[WARN ]',
  error: '[ERR  ]',
};

export function LiveLogFeed({ logs, maxHeight = '280px', jobId, error }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Terminal className="w-4 h-4 text-neon-green" />
        <span className="text-sm font-medium">Live Log</span>
        {jobId && (
          <span className="text-[10px] font-mono text-muted-foreground/50 ml-1">
            job:{jobId.slice(0, 8)}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {error ? (
            <span className="text-[11px] font-mono text-red-400">ERROR</span>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse-slow" />
              <span className="text-[11px] font-mono text-neon-green">LIVE</span>
            </>
          )}
        </div>
      </div>

      <div
        className="overflow-y-auto space-y-0.5"
        style={{ maxHeight, scrollbarWidth: 'thin' }}
      >
        {error ? (
          <div className="text-xs font-mono text-red-400/70 py-4 text-center px-4">
            Subscription error: {error}
          </div>
        ) : !jobId ? (
          <div className="text-xs font-mono text-muted-foreground/40 py-8 text-center">
            No active job found
          </div>
        ) : logs.length === 0 ? (
          <div className="text-xs font-mono text-muted-foreground/40 py-8 text-center">
            Waiting for scraper activity…
            <div className="text-[10px] mt-1 text-muted-foreground/25">subscribed to job {jobId.slice(0, 8)}</div>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-2 text-[11px] font-mono leading-5 group">
              <span className="text-muted-foreground/40 shrink-0 w-[80px]">
                {timeAgo(log.timestamp)}
              </span>
              <span className={cn('shrink-0 w-[50px]', LEVEL_STYLES[log.level])}>
                {LEVEL_PREFIX[log.level] ?? '[    ]'}
              </span>
              {log.workerId != null && (
                <span className="text-muted-foreground/50 shrink-0">W{log.workerId}</span>
              )}
              <span className={cn('flex-1 truncate', LEVEL_STYLES[log.level])}>
                {log.message}
              </span>
              {log.url && (
                <span className="text-muted-foreground/40 truncate max-w-[160px]">
                  {log.url.replace(/^https?:\/\//, '')}
                </span>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
