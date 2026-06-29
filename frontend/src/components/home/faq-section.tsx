'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FaqItem {
  question: string;
  answer: string;
}

export function FaqSection({ faqs }: { faqs?: FaqItem[] | null }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!faqs || faqs.length === 0) return null;

  return (
    <section className="border-t border-zinc-800 bg-black py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-white">Frequently Asked Questions</h2>
        </div>
        <div className="max-w-2xl divide-y divide-zinc-800 border-t border-zinc-800">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i} className="border-b border-zinc-800 py-4">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="text-sm font-medium text-white">{faq.question}</span>
                  <span className={cn(
                    'ml-4 text-xl text-zinc-400 transition-transform duration-200 shrink-0',
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
                  <p className="text-sm text-zinc-400 leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
