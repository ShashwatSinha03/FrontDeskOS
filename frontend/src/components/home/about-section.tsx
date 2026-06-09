export function AboutSection() {
  const features = [
    { title: 'Expert Care', description: 'Led by experienced dental professionals committed to excellence.' },
    { title: 'Modern Technology', description: 'State-of-the-art equipment for accurate diagnosis and treatment.' },
    { title: 'Comfort First', description: 'Relaxing environment designed to make every visit pleasant.' },
    { title: 'Flexible Scheduling', description: 'Convenient hours that work with your busy schedule.' },
  ];

  return (
    <section className="bg-muted/40 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Why Choose Us</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            We put your comfort and care first
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="text-center">
              <h3 className="font-semibold text-lg">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
