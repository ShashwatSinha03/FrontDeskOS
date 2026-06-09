import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function CtaBanner({ slug }: { slug: string }) {
  return (
    <section className="bg-primary py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-primary-foreground">
          Ready to book your appointment?
        </h2>
        <p className="mt-4 text-lg text-primary-foreground/80">
          Take the first step toward a healthier, brighter smile.
        </p>
        <div className="mt-8">
          <Link href={`/${slug}/book`}>
            <Button size="lg" variant="secondary">
              Book Now
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
