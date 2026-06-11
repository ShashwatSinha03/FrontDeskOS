'use client';

import { cn } from '@/lib/utils';

export interface Step {
  num: number;
  label: string;
}

interface WizardShellProps {
  steps: Step[];
  currentStep: number;
  children: React.ReactNode;
}

export function WizardShell({ steps, currentStep, children }: WizardShellProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Stepper */}
      <div className="mb-10 flex items-center justify-center gap-1 sm:gap-2">
        {steps.map((step, idx) => {
          const isActive = currentStep === step.num;
          const isCompleted = currentStep > step.num;

          return (
            <div key={step.num} className="flex items-center gap-1 sm:gap-2">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-medium transition-colors sm:h-8 sm:w-8 sm:text-xs',
                    isActive && 'bg-foreground text-background',
                    isCompleted && 'bg-foreground/10 text-foreground',
                    !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    step.num
                  )}
                </div>
                <span
                  className={cn(
                    'hidden text-[10px] font-medium sm:block',
                    isActive && 'text-foreground',
                    isCompleted && 'text-foreground',
                    !isActive && !isCompleted && 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    'h-px w-6 sm:w-10',
                    isCompleted ? 'bg-foreground/20' : 'bg-border'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="space-y-6">{children}</div>
    </div>
  );
}
