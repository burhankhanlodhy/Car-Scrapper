'use client';

import { useState } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  flexRender, type ColumnDef, type SortingState
} from '@tanstack/react-table';
import { ArrowUpDown, ExternalLink, Download, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import { cn, truncate, timeAgo, STATUS_COLORS, CMS_COLORS } from '@/lib/utils';
import type { Dealership } from '@dealership-scraper/shared';
import type { DealerFilters } from '@/lib/hooks/use-dealers';

interface Props {
  dealers: Dealership[];
  loading: boolean;
  filters: DealerFilters;
  onFilterChange: (f: DealerFilters) => void;
}

const COLUMNS: ColumnDef<Dealership>[] = [
  {
    accessorKey: 'name',
    header: 'Dealership',
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link href={`/dealers/${row.original.id}`} className="font-medium text-foreground hover:text-primary transition-colors truncate block">
          {row.original.name ?? '—'}
        </Link>
        <div className="text-[11px] font-mono text-muted-foreground truncate">
          {row.original.website?.url?.replace(/^https?:\/\//, '') ?? '—'}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'city',
    header: 'Location',
    cell: ({ row }) => (
      <div className="font-mono text-xs">
        <span>{row.original.city ?? '—'}</span>
        {row.original.state && <span className="text-muted-foreground">, {row.original.state}</span>}
      </div>
    ),
  },
  {
    id: 'cms',
    header: 'CMS',
    accessorFn: row => row.cms?.platform,
    cell: ({ row }) => {
      const platform = row.original.cms?.platform ?? 'unknown';
      return (
        <span className={cn('badge-tech', CMS_COLORS[platform] ?? CMS_COLORS.unknown)}>
          {platform}
        </span>
      );
    },
  },
  {
    id: 'tech',
    header: 'Tech Stack',
    cell: ({ row }) => {
      const ts = row.original.techStack;
      const items = [
        ...ts.frontend.slice(0, 2),
        ...ts.analytics.slice(0, 1),
        ...ts.chatWidgets.slice(0, 1),
      ].slice(0, 3);
      return (
        <div className="flex flex-wrap gap-1">
          {items.map(t => (
            <span key={t} className="badge-tech text-neon-cyan border-neon-cyan/20 bg-neon-cyan/5">
              {t}
            </span>
          ))}
          {items.length === 0 && <span className="text-muted-foreground text-xs">—</span>}
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <span className={cn('badge-tech', STATUS_COLORS[status] ?? STATUS_COLORS.complete)}>
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: 'lastScrapedAt',
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Last Scraped <ArrowUpDown className="w-3 h-3" />
      </button>
    ),
    cell: ({ row }) => (
      <span className="text-xs font-mono text-muted-foreground">
        {timeAgo(row.original.lastScrapedAt)}
      </span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Link href={`/dealers/${row.original.id}`} className="p-1 hover:text-primary text-muted-foreground transition-colors">
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
        {row.original.website?.url && (
          <a href={row.original.website.url} target="_blank" rel="noopener noreferrer"
            className="p-1 hover:text-neon-cyan text-muted-foreground transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    ),
  },
];

export function DealerTable({ dealers, loading, filters, onFilterChange }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data: dealers,
    columns: COLUMNS,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function handleExport() {
    window.open('/api/export', '_blank');
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search dealers..."
            value={globalFilter}
            onChange={e => { setGlobalFilter(e.target.value); onFilterChange({ ...filters, search: e.target.value }); }}
            className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-secondary border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <select
          value={filters.state ?? ''}
          onChange={e => onFilterChange({ ...filters, state: e.target.value || undefined })}
          className="text-xs font-mono bg-secondary border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All States</option>
          {['TX', 'CA', 'FL', 'NY', 'OH', 'IL', 'PA', 'GA', 'NC', 'MI', 'WA', 'AZ', 'CO', 'TN'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={filters.cmsPlatform ?? ''}
          onChange={e => onFilterChange({ ...filters, cmsPlatform: e.target.value || undefined })}
          className="text-xs font-mono bg-secondary border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All Platforms</option>
          {['wordpress', 'dealer.com', 'dealersocket', 'cdk-global', 'dealer-inspire', 'wix', 'squarespace', 'webflow', 'unknown'].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-secondary hover:bg-accent border border-border rounded-md text-muted-foreground hover:text-foreground transition-colors ml-auto"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map(header => (
                  <th key={header.id} className="px-4 py-2.5 text-left text-xs font-mono text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-xs font-mono text-muted-foreground">
                  Loading dealerships...
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-xs font-mono text-muted-foreground">
                  No dealerships found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="data-row hover:bg-secondary/30 transition-colors cursor-pointer"
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-border flex items-center justify-between text-xs font-mono text-muted-foreground">
        <span>{table.getFilteredRowModel().rows.length} of {dealers.length} shown</span>
        <span>Realtime · Firestore</span>
      </div>
    </div>
  );
}
