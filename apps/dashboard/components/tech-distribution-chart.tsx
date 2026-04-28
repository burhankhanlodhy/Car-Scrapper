'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Layers } from 'lucide-react';
import type { Dealership } from '@dealership-scraper/shared';

const PLATFORM_COLORS: Record<string, string> = {
  'dealer.com': '#a855f7',
  'wordpress': '#3b82f6',
  'dealersocket': '#f97316',
  'cdk-global': '#ef4444',
  'dealer-inspire': '#06b6d4',
  'wix': '#ec4899',
  'squarespace': '#6b7280',
  'webflow': '#6366f1',
  'elead': '#84cc16',
  'dealerfire': '#eab308',
  'sincro': '#14b8a6',
  'podium': '#f43f5e',
  'unknown': '#374151',
  'custom': '#4b5563',
};

interface Props {
  dealers: Dealership[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-2 text-xs font-mono border border-border shadow-xl">
      <span className="text-foreground">{payload[0].name}: </span>
      <span className="text-neon-green">{payload[0].value}</span>
    </div>
  );
}

export function TechDistributionChart({ dealers }: Props) {
  const counts: Record<string, number> = {};
  for (const d of dealers) {
    const p = d.cms?.platform ?? 'unknown';
    counts[p] = (counts[p] ?? 0) + 1;
  }

  const data = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  if (!data.length) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-neon-purple" />
          <span className="text-sm font-medium">CMS Distribution</span>
        </div>
        <div className="h-[200px] flex items-center justify-center text-muted-foreground font-mono text-xs">
          No data yet
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">CMS Distribution</span>
        <span className="text-xs text-muted-foreground font-mono ml-auto">{dealers.length} dealers</span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={PLATFORM_COLORS[entry.name] ?? '#4b5563'}
                stroke="hsl(240 10% 3.9%)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-1 mt-2">
        {data.slice(0, 6).map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-xs font-mono">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: PLATFORM_COLORS[entry.name] ?? '#4b5563' }} />
            <span className="text-muted-foreground truncate">{entry.name}</span>
            <span className="text-foreground ml-auto">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
