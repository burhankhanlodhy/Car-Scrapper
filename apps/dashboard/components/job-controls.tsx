'use client';

import { useState } from 'react';
import { Play, Square, RefreshCw, Loader2, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { US_STATES, CAR_BRANDS } from '@dealership-scraper/shared';

interface JobConfig {
  targetStates: string[];
  targetBrands: string[];
  concurrency: number;
  forceRefresh: boolean;
}

interface Props {
  onStart?: (config: JobConfig) => Promise<void>;
  onStop?: (jobId: string) => Promise<void>;
  activeJobId?: string | null;
  isRunning?: boolean;
}

export function JobControls({ onStart, onStop, activeJobId, isRunning = false }: Props) {
  const [config, setConfig] = useState<JobConfig>({
    targetStates: [],
    targetBrands: [],
    concurrency: 10,
    forceRefresh: false,
  });
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  async function handleStart() {
    if (!onStart) return;
    setLoading(true);
    try { await onStart(config); } finally { setLoading(false); }
  }

  async function handleStop() {
    if (!onStop || !activeJobId) return;
    setLoading(true);
    try { await onStop(activeJobId); } finally { setLoading(false); }
  }

  function toggleState(code: string) {
    setConfig(prev => ({
      ...prev,
      targetStates: prev.targetStates.includes(code)
        ? prev.targetStates.filter(s => s !== code)
        : [...prev.targetStates, code],
    }));
  }

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Job Controls</span>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
        >
          {showSettings ? 'Hide' : 'Configure'}
        </button>
      </div>

      {showSettings && (
        <div className="space-y-4 border-t border-border pt-4 animate-fade-in">
          {/* Concurrency slider */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs font-mono text-muted-foreground">Workers</label>
              <span className="text-xs font-mono text-neon-green">{config.concurrency}</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={config.concurrency}
              onChange={e => setConfig(prev => ({ ...prev, concurrency: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-0.5">
              <span>1</span><span>50</span>
            </div>
          </div>

          {/* Force refresh toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono text-muted-foreground">Force Re-scrape</label>
            <button
              onClick={() => setConfig(prev => ({ ...prev, forceRefresh: !prev.forceRefresh }))}
              className={cn(
                'w-10 h-5 rounded-full transition-colors border',
                config.forceRefresh ? 'bg-primary/30 border-primary/50' : 'bg-secondary border-border'
              )}
            >
              <div className={cn(
                'w-3.5 h-3.5 rounded-full bg-foreground transition-transform mx-0.5',
                config.forceRefresh ? 'translate-x-5 bg-primary' : 'translate-x-0'
              )} />
            </button>
          </div>

          {/* State selection */}
          <div>
            <div className="text-xs font-mono text-muted-foreground mb-2">
              Target States {config.targetStates.length > 0 && `(${config.targetStates.length})`}
            </div>
            <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
              {Object.entries(US_STATES).map(([code]) => (
                <button
                  key={code}
                  onClick={() => toggleState(code)}
                  className={cn(
                    'text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors',
                    config.targetStates.includes(code)
                      ? 'bg-primary/20 border-primary/40 text-primary'
                      : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                  )}
                >
                  {code}
                </button>
              ))}
            </div>
            {config.targetStates.length > 0 && (
              <button
                onClick={() => setConfig(prev => ({ ...prev, targetStates: [] }))}
                className="text-[10px] text-muted-foreground hover:text-foreground font-mono mt-1"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2 border-t border-border">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={loading}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              'bg-neon-green/15 hover:bg-neon-green/25 border border-neon-green/30 text-neon-green',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Start Scrape
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={loading || !activeJobId}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              'bg-red-400/15 hover:bg-red-400/25 border border-red-400/30 text-red-400',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
            Stop Job
          </button>
        )}
      </div>
    </div>
  );
}
