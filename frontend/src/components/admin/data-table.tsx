'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, AlertCircle, Inbox } from 'lucide-react';
import { TableSkeleton } from '@/components/design/skeleton';
import { EmptyState } from '@/components/design/empty-state';

export interface Column<T = any> {
  key: string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  totalCount: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  totalCount,
  page,
  limit,
  onPageChange,
  isLoading,
  error,
  onRetry,
  onRowClick,
  emptyMessage = 'No items found.',
}: DataTableProps<T>) {
  const totalPages = Math.ceil(totalCount / limit);

  if (isLoading) {
    return <TableSkeleton columns={columns.length} rows={5} />;
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Failed to load data"
        description={error}
        action={onRetry ? <Button variant="outline" size="sm" onClick={onRetry}>Try Again</Button> : undefined}
      />
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={emptyMessage}
      />
    );
  }

  return (
    <div>
      <div className="overflow-hidden product-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 bg-black/50">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {data.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-zinc-800/30 transition-colors duration-150" onClick={() => onRowClick?.(row)}>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-zinc-300">
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-zinc-400">
          <span>
            Page {page} of {totalPages} ({totalCount} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
