'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Database, Briefcase, Settings, Zap,
  Activity, ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Command Center', icon: LayoutDashboard },
  { href: '/dealers', label: 'Dealerships', icon: Database },
  { href: '/jobs', label: 'Job Queue', icon: Briefcase },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-w-[14rem] border-r border-border bg-card flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">CarPilot</div>
          <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Intelligence</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider px-3 mb-2">
          Navigation
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'nav-link group',
                isActive && 'active'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              <span>{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground" />}
            </Link>
          );
        })}
      </nav>

      {/* Status indicator */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse-slow" />
          <span className="text-muted-foreground font-mono">carpilothq</span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1 font-mono">Firestore connected</div>
      </div>
    </aside>
  );
}
