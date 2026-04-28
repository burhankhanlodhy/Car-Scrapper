'use client';

import { Database, Users, AlertTriangle, Zap, Clock, ArrowUp } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import type { ScrapeStats } from '@/lib/hooks/use-scrape-stats';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconColor?: string;
  valueColor?: string;
  glow?: string;
}

function StatCard({ label, value, sub, icon: Icon, iconColor = 'text-muted-foreground', valueColor = 'text-foreground', glow }: StatCardProps) {
  return (
    <div className={cn('glass-card p-4 flex items-start gap-3', glow)}>
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center bg-secondary border border-border shrink-0', iconColor)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className={cn('stat-value mt-0.5', valueColor)}>{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">{sub}</div>}
      </div>
    </div>
  );
}

export function StatsBar({ stats }: { stats: ScrapeStats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <StatCard
        label="Total Dealerships"
        value={formatNumber(stats.totalDealerships)}
        icon={Database}
        iconColor="text-primary"
        valueColor="text-foreground"
        glow="glow-purple"
      />
      <StatCard
        label="Active Workers"
        value={stats.activeWorkers}
        sub={stats.activeWorkers > 0 ? 'running' : 'idle'}
        icon={Users}
        iconColor={stats.activeWorkers > 0 ? 'text-neon-green' : 'text-muted-foreground'}
        valueColor={stats.activeWorkers > 0 ? 'text-neon-green' : 'text-foreground'}
        glow={stats.activeWorkers > 0 ? 'glow-green' : undefined}
      />
      <StatCard
        label="Queue Depth"
        value={formatNumber(stats.queueDepth)}
        sub="pending URLs"
        icon={Clock}
        iconColor="text-neon-cyan"
        valueColor="text-foreground"
      />
      <StatCard
        label="Throughput"
        value={`${formatNumber(stats.urlsPerHour)}/hr`}
        icon={Zap}
        iconColor="text-yellow-400"
        valueColor="text-yellow-400"
      />
      <StatCard
        label="Errors Today"
        value={formatNumber(stats.errorsToday)}
        icon={AlertTriangle}
        iconColor={stats.errorsToday > 0 ? 'text-red-400' : 'text-muted-foreground'}
        valueColor={stats.errorsToday > 0 ? 'text-red-400' : 'text-foreground'}
      />
    </div>
  );
}
