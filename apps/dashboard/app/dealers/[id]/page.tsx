'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { DealerDetailPanel } from '@/components/dealer-detail-panel';
import { useDealer } from '@/lib/hooks/use-dealers';

export default function DealerDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { dealer, loading } = useDealer(id);

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div className="flex items-center gap-3">
        <Link
          href="/dealers"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors font-mono"
        >
          <ChevronLeft className="w-4 h-4" />
          Dealerships
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-sm font-mono text-foreground truncate max-w-[300px]">{id}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="font-mono text-sm">Loading dealership data...</span>
        </div>
      ) : !dealer ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
          <div className="text-lg font-medium">Dealership not found</div>
          <div className="font-mono text-sm text-muted-foreground/60">ID: {id}</div>
          <Link href="/dealers" className="text-primary hover:underline text-sm mt-2">
            ← Back to dealerships
          </Link>
        </div>
      ) : (
        <DealerDetailPanel dealer={dealer} />
      )}
    </div>
  );
}
