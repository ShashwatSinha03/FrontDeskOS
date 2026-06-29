import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: React.ElementType;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export function MetricCard({ label, value, icon: Icon, trend, className }: MetricCardProps) {
  return (
    <div className={cn('rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border bg-muted/30">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {trend && (
        <p className={cn('mt-1 text-xs font-medium', trend.positive ? 'text-emerald-600' : 'text-red-600')}>
          {trend.value}
        </p>
      )}
    </div>
  );
}
