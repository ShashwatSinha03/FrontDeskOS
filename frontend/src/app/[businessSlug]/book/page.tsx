'use client';

import { useReducer, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useBusiness } from '@/hooks/use-business';
import { useServices } from '@/hooks/use-services';
import { StepService } from '@/components/booking/step-service';
import { StepDate } from '@/components/booking/step-date';
import { StepTime } from '@/components/booking/step-time';
import { StepInfo } from '@/components/booking/step-info';
import { StepConfirm } from '@/components/booking/step-confirm';
import { Skeleton } from '@/components/design/skeleton';
import { cn } from '@/lib/utils';

const STEPS = [
  { num: 1, label: 'Service' },
  { num: 2, label: 'Date' },
  { num: 3, label: 'Time' },
  { num: 4, label: 'Info' },
  { num: 5, label: 'Confirm' },
];

interface BookingState {
  step: number;
  serviceId: string | null;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
}

type BookingAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_SERVICE'; serviceId: string }
  | { type: 'SET_DATE'; date: string }
  | { type: 'SET_TIME'; time: string }
  | { type: 'SET_INFO'; field: 'name' | 'email' | 'phone'; value: string }
  | { type: 'RESET' };

const initialState: BookingState = {
  step: 1,
  serviceId: null,
  date: '',
  time: '',
  name: '',
  email: '',
  phone: '',
};

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_STEP': return { ...state, step: action.step };
    case 'SET_SERVICE': return { ...state, serviceId: action.serviceId };
    case 'SET_DATE': return { ...state, date: action.date, time: '' };
    case 'SET_TIME': return { ...state, time: action.time };
    case 'SET_INFO': return { ...state, [action.field]: action.value };
    case 'RESET': return initialState;
    default: return state;
  }
}

export default function BookPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.businessSlug as string;
  const { business, isLoading: bizLoading, error: bizError } = useBusiness(slug);
  const { services, isLoading: svcLoading, error: svcError } = useServices(slug);

  const [state, dispatch] = useReducer(bookingReducer, initialState);

  useEffect(() => {
    const serviceParam = searchParams.get('service');
    if (serviceParam && services.some(s => s.id === serviceParam)) {
      dispatch({ type: 'SET_SERVICE', serviceId: serviceParam });
    }
  }, [searchParams, services]);

  const selectedService = services.find(s => s.id === state.serviceId) || null;

  const onDone = useCallback(() => {
    dispatch({ type: 'RESET' });
    window.location.href = `/${slug}`;
  }, [slug]);

  if (bizLoading || svcLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 space-y-8">
        <Skeleton className="h-6 w-48 mx-auto" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (bizError || svcError || !business) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Unable to load booking information.</p>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">No Services Available</h1>
        <p className="text-muted-foreground mt-2">Please contact us directly to book an appointment.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:py-20">
      <div className="mb-10">
        <div className="flex items-start justify-between">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-medium transition-colors duration-300',
                    state.step === s.num
                      ? 'bg-foreground text-background'
                      : state.step > s.num
                      ? 'bg-foreground/10 text-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {state.step > s.num ? (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    s.num
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium leading-none transition-colors duration-300',
                    state.step === s.num
                      ? 'text-foreground'
                      : state.step > s.num
                      ? 'text-muted-foreground/60'
                      : 'text-muted-foreground/40'
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  'h-px w-8 sm:w-14 mt-[-18px] mx-1.5 transition-colors duration-300',
                  state.step > s.num ? 'bg-foreground/20' : 'bg-border'
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="transition-all duration-300">
        {state.step === 1 && (
          <StepService
            services={services}
            selected={state.serviceId}
            onSelect={(id) => dispatch({ type: 'SET_SERVICE', serviceId: id })}
            onNext={() => dispatch({ type: 'SET_STEP', step: 2 })}
          />
        )}
        {state.step === 2 && (
          <StepDate
            selected={state.date}
            onSelect={(date) => dispatch({ type: 'SET_DATE', date })}
            onBack={() => dispatch({ type: 'SET_STEP', step: 1 })}
            onNext={() => dispatch({ type: 'SET_STEP', step: 3 })}
          />
        )}
        {state.step === 3 && (
          <StepTime
            businessId={business.id}
            serviceId={state.serviceId}
            date={state.date}
            selected={state.time}
            onSelect={(time) => dispatch({ type: 'SET_TIME', time })}
            onBack={() => dispatch({ type: 'SET_STEP', step: 2 })}
            onNext={() => dispatch({ type: 'SET_STEP', step: 4 })}
          />
        )}
        {state.step === 4 && (
          <StepInfo
            name={state.name}
            email={state.email}
            phone={state.phone}
            onChange={(field, value) => dispatch({ type: 'SET_INFO', field, value })}
            onBack={() => dispatch({ type: 'SET_STEP', step: 3 })}
            onNext={() => dispatch({ type: 'SET_STEP', step: 5 })}
          />
        )}
        {state.step === 5 && (
          <StepConfirm
            businessId={business.id}
            businessSlug={slug}
            service={selectedService}
            date={state.date}
            time={state.time}
            customerName={state.name}
            customerEmail={state.email}
            customerPhone={state.phone}
            onBack={() => dispatch({ type: 'SET_STEP', step: 4 })}
            onDone={onDone}
          />
        )}
      </div>
    </div>
  );
}
