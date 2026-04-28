'use client';

import { cn, truncate } from '@/lib/utils';
import { Cpu } from 'lucide-react';
import type { WorkerStatus } from '@dealership-scraper/shared';

interface Props {
  workers: WorkerStatus[];
  concurrency: number;
}

const STATUS_DOT: Record<string, string> = {
  running: 'bg-neon-green animate-pulse-slow',
  idle: 'bg-muted-foreground',
  error: 'bg-red-400',
  cooldown: 'bg-yellow-400 animate-pulse-slow',
};

const STATUS_BORDER: Record<string, string> = {
  running: 'border-neon-green/20',
  idle: 'border-border',
  error: 'border-red-400/20',
  cooldown: 'border-yellow-400/20',
};

export function WorkerStatusGrid({ workers, concurrency }: Props) {
  // Fill to concurrency count with idle workers
  const displayed: WorkerStatus[] = Array.from({ length: concurrency }, (_, i) => {
    return workers[i] ?? {
      id: i + 1,
      status: 'idle',
      currentUrl: null,
      processedCount: 0,
      errorCount: 0,
      lastActivityAt: null,
    };
  });

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Cpu className="w-4 h-4 text-neon-cyan" />
        <span className="text-sm font-medium">Worker Grid</span>
        <span className="text-xs font-mono text-muted-foreground ml-auto">
          {workers.filter(w => w.status === 'running').length}/{concurrency} active
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {displayed.map((worker) => (
          <div
            key={worker.id}
            className={cn(
              'rounded border p-2 text-xs font-mono transition-colors',
              'bg-secondary/50',
              STATUS_BORDER[worker.status] ?? 'border-border'
            )}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[worker.status] ?? 'bg-muted-foreground')} />
              <span className="text-muted-foreground">W{worker.id}</span>
              <span className={cn(
                'ml-auto',
                worker.status === 'running' && 'text-neon-green',
                worker.status === 'error' && 'text-red-400',
                worker.status === 'cooldown' && 'text-yellow-400',
                worker.status === 'idle' && 'text-muted-foreground',
              )}>
                {worker.status}
              </span>
            </div>
            {worker.currentUrl ? (
              <div className="text-[10px] text-muted-foreground truncate">
                {truncate(worker.currentUrl.replace(/^https?:\/\//, ''), 28)}
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground/40">—</div>
            )}
            <div className="flex gap-2 mt-1 text-[10px]">
              <span className="text-muted-foreground/60">✓{worker.processedCount}</span>
              {worker.errorCount > 0 && <span className="text-red-400/70">✗{worker.errorCount}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
