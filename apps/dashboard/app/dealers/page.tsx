'use client';

import { useState } from 'react';
import { DealerTable } from '@/components/dealer-table';
import { useDealers, type DealerFilters } from '@/lib/hooks/use-dealers';
import { Database } from 'lucide-react';

export default function DealersPage() {
  const [filters, setFilters] = useState<DealerFilters>({});
  const { dealers, loading, total } = useDealers(filters, 100);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Dealerships</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 font-mono">
            Browse and filter all scraped dealerships
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold font-mono text-foreground">{total.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground font-mono">total records</div>
        </div>
      </div>

      <DealerTable
        dealers={dealers}
        loading={loading}
        filters={filters}
        onFilterChange={setFilters}
      />
    </div>
  );
}
