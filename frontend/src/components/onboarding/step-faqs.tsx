'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { TemplateFaq } from '@/lib/onboarding';

interface StepFaqsProps {
  faqs: TemplateFaq[];
  onChange: (faqs: TemplateFaq[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const categories = ['General', 'Booking', 'Pricing', 'Services', 'Policies', 'Billing', 'Membership', 'Training', 'Products', 'Insurance', 'Emergency'];

export function StepFaqs({ faqs, onChange, onNext, onBack }: StepFaqsProps) {
  const update = (index: number, field: keyof TemplateFaq, value: string) => {
    const next = faqs.map((f, i) => (i === index ? { ...f, [field]: value } : f));
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(faqs.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...faqs, { question: '', answer: '', category: 'General' }]);
  };

  const filledCount = faqs.filter((f) => f.question.trim() && f.answer.trim()).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">FAQs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add frequently asked questions the AI will answer. {filledCount} of 5 recommended.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <Card key={i} className="product-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Question</label>
                      <Input
                        placeholder="What are your opening hours?"
                        value={faq.question}
                        onChange={(e) => update(i, 'question', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Answer</label>
                      <textarea
                        className="flex h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        placeholder="We are open..."
                        value={faq.answer}
                        onChange={(e) => update(i, 'answer', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Category</label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={faq.category}
                        onChange={(e) => update(i, 'category', e.target.value)}
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(i)}
                  className="text-destructive hover:text-destructive shrink-0"
                >
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" onClick={add} className="w-full">
        + Add FAQ
      </Button>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>Continue</Button>
      </div>
    </div>
  );
}
