import { cn } from '@/lib/utils';

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'default' | 'muted' | 'border';
}

export function Section({ variant = 'default', className, children, ...props }: SectionProps) {
  return (
    <section
      className={cn(
        'py-16 sm:py-20 lg:py-24',
        variant === 'muted' && 'bg-muted/20',
        variant === 'border' && 'border-t',
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}
