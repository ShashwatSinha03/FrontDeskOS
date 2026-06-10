'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const FAQS = [
  {
    q: 'How do I book an appointment?',
    a: 'You can book directly through our website by clicking the "Book Appointment" button. Select your preferred service, date, and time, then enter your details to confirm.',
  },
  {
    q: 'Can I cancel or reschedule?',
    a: 'Yes. Please contact us at least 24 hours in advance to cancel or reschedule. You can reach us by phone or through the contact form on our site.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards, debit cards, and cash. Payment is due at the time of service unless other arrangements have been made.',
  },
  {
    q: 'Do you accept insurance?',
    a: 'We work with a variety of insurance providers. Please contact us to verify your coverage and understand any out-of-pocket costs before your visit.',
  },
  {
    q: 'How long will my appointment take?',
    a: 'Appointment duration varies by service. Each service page lists the estimated time. You can also check when booking your appointment.',
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
          <p className="mt-3 text-base text-muted-foreground">
            Everything you need to know before your visit.
          </p>
        </div>
        <div className="max-w-2xl divide-y border-t">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i} className="py-4">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="text-sm font-medium">{faq.q}</span>
                  <span className={cn(
                    'ml-4 text-xl text-muted-foreground transition-transform duration-200 shrink-0',
                    isOpen && 'rotate-45'
                  )}>
                    +
                  </span>
                </button>
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-200',
                    isOpen ? 'mt-3 max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
