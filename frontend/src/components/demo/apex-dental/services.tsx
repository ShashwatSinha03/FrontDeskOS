const services = [
  { name: 'Teeth Whitening', description: 'Professional whitening treatments that brighten your smile by several shades in a single visit.', price: '$350+' },
  { name: 'Routine Cleaning', description: 'Regular cleanings to maintain optimal oral health and prevent gum disease.', price: '$120+' },
  { name: 'Dental Checkup', description: 'Comprehensive exams with digital X-rays and oral cancer screening.', price: '$150+' },
  { name: 'Fillings', description: 'Tooth-colored composite fillings that blend naturally with your teeth.', price: '$200+' },
  { name: 'Dental Implants', description: 'Permanent tooth replacement solutions that look and feel natural.', price: '$3,500+' },
  { name: 'Emergency Care', description: 'Same-day emergency appointments for urgent dental needs.', price: 'Varies' },
];

export function ApexServices() {
  return (
    <section className="border-t border-zinc-800 bg-black px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Our Services</h2>
          <p className="mt-4 text-zinc-400">Comprehensive dental care for the whole family</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.name}
              className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-6 transition-colors hover:border-blue-500/20"
            >
              <h3 className="text-lg font-semibold text-white">{service.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{service.description}</p>
              <p className="mt-4 text-sm font-medium text-blue-400">{service.price}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
