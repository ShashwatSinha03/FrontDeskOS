import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function CtaBanner({ slug }: { slug: string }) {
  return (
    <section className="border-y bg-muted/20 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Ready to get started?
        </h2>
        <p className="mt-3 text-base text-muted-foreground max-w-md mx-auto">
          Book your appointment today. We look forward to welcoming you.
        </p>
        <div className="mt-8">
          <Link href={`/${slug}/book`}>
            <Button size="lg">
              Book Now
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
