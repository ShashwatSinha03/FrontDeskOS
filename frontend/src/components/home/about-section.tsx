import { Shield, Calendar, Clock, UserCheck } from 'lucide-react';

const FEATURES = [
  {
    icon: Shield,
    title: 'Professional Care',
    description: 'Experienced providers committed to the highest standards of quality and safety.',
  },
  {
    icon: Calendar,
    title: 'Easy Scheduling',
    description: 'Book appointments online in seconds. No phone tag, no hassle.',
  },
  {
    icon: Clock,
    title: 'Timely Service',
    description: 'We respect your time. Our streamlined process minimizes wait times.',
  },
  {
    icon: UserCheck,
    title: 'Personalized Experience',
    description: 'Care tailored to your unique needs, every step of the way.',
  },
];

export function AboutSection({ businessName }: { businessName: string }) {
  return (
    <section className="bg-muted/20 border-t border-b py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Why Choose {businessName}</h2>
          <p className="mt-3 text-base text-muted-foreground">
            We believe in a better approach to care &mdash; one built on respect, transparency, and modern practice.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="flex gap-4 p-4 -mx-4 rounded-lg">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
