import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return '—';
  return new Intl.NumberFormat().format(n);
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function formatDate(ts: number | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(ts: number | null | undefined): string {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export const STATUS_COLORS: Record<string, string> = {
  complete: 'text-neon-green border-neon-green/30 bg-neon-green/10',
  partial: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  failed: 'text-red-400 border-red-400/30 bg-red-400/10',
  running: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10',
  pending: 'text-muted-foreground border-border bg-muted',
  idle: 'text-muted-foreground border-border bg-muted',
};

export const CMS_COLORS: Record<string, string> = {
  wordpress: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  'dealer.com': 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  dealersocket: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
  'cdk-global': 'text-red-400 border-red-400/30 bg-red-400/10',
  'dealer-inspire': 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
  wix: 'text-pink-400 border-pink-400/30 bg-pink-400/10',
  squarespace: 'text-gray-400 border-gray-400/30 bg-gray-400/10',
  webflow: 'text-indigo-400 border-indigo-400/30 bg-indigo-400/10',
  unknown: 'text-muted-foreground border-border bg-muted',
};

export function truncate(str: string | null | undefined, len = 40): string {
  if (!str) return '—';
  return str.length > len ? `${str.slice(0, len)}…` : str;
}
