'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, ReferenceLine
} from 'recharts';
import { Activity } from 'lucide-react';
import type { ThroughputPoint } from '@/lib/hooks/use-scrape-stats';

interface Props {
  data: ThroughputPoint[];
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-2 text-xs font-mono border border-border shadow-xl">
      <div className="text-muted-foreground mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex gap-2 items-center">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: p.color }}>{p.name}: {p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ThroughputChart({ data }: Props) {
  const hasData = data.length > 0;

  return (
    <div className="glass-card p-4 glow-green">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-neon-green" />
        <span className="text-sm font-medium">Scrape Throughput</span>
        <span className="text-xs text-muted-foreground font-mono ml-auto">URLs / min</span>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="colorUrls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00ff88" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 16%)" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: 'hsl(240 5% 58%)', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'hsl(240 5% 58%)', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="urlsPerMin" name="URLs" stroke="#00ff88" strokeWidth={2} fill="url(#colorUrls)" dot={false} />
            <Area type="monotone" dataKey="errorsPerMin" name="Errors" stroke="#ef4444" strokeWidth={1.5} fill="url(#colorErrors)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[180px] flex items-center justify-center text-muted-foreground font-mono text-xs">
          Waiting for data...
        </div>
      )}
    </div>
  );
}
