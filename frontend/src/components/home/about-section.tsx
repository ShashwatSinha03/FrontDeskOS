import { Building2 } from 'lucide-react';

export function AboutSection({ businessName, description }: { businessName: string; description?: string | null }) {
  if (!description) return null;

  return (
    <section className="bg-muted/20 border-t border-b py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight">About {businessName}</h2>
          <div className="mt-6 flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-base leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
