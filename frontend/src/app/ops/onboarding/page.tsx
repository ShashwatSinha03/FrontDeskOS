'use client';

import { useReducer, useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardShell } from '@/components/onboarding/wizard-shell';
import { ResumeDraftModal } from '@/components/onboarding/resume-draft-modal';
import { Loader } from '@/components/ui/loader';
import { StepIndustry } from '@/components/onboarding/step-industry';
import { StepBusiness } from '@/components/onboarding/step-business';
import { StepServices } from '@/components/onboarding/step-services';
import { StepHours } from '@/components/onboarding/step-hours';
import { StepFaqs } from '@/components/onboarding/step-faqs';
import { StepAi } from '@/components/onboarding/step-ai';
import { StepReview } from '@/components/onboarding/step-review';
import { StepPublish } from '@/components/onboarding/step-publish';
import { publishTenant, IndustryTemplate, TemplateService, TemplateFaq, PublishResult } from '@/lib/onboarding';

const STEPS = [
  { num: 0, label: 'Industry' },
  { num: 1, label: 'Business' },
  { num: 2, label: 'Services' },
  { num: 3, label: 'Hours' },
  { num: 4, label: 'FAQs' },
  { num: 5, label: 'AI' },
  { num: 6, label: 'Review' },
];

const DRAFT_KEY = 'fdos_onboarding_draft';

interface DayHours {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface WizardState {
  step: number;
  sessionId: string;
  industry: string;
  templateVersion: string;
  business: {
    name: string;
    slug: string;
    tagline: string;
    description: string;
    phone: string;
    email: string;
    address: string;
    timezone: string;
  };
  services: TemplateService[];
  hours: DayHours[];
  faqs: TemplateFaq[];
  ai: {
    greeting: string;
    escalationEmail: string;
    slotDurationMinutes: number;
  };
  publishStatus: 'idle' | 'publishing' | 'success' | 'error';
  publishError: string | null;
  publishResult: PublishResult | null;
}

function defaultHours(): DayHours[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    openTime: '09:00',
    closeTime: '18:00',
    isClosed: i === 0,
  }));
}

function initialState(): WizardState {
  return {
    step: 0,
    sessionId: crypto.randomUUID(),
    industry: '',
    templateVersion: '',
    business: {
      name: '',
      slug: '',
      tagline: '',
      description: '',
      phone: '',
      email: '',
      address: '',
      timezone: 'Asia/Kolkata',
    },
    services: [],
    hours: defaultHours(),
    faqs: [],
    ai: {
      greeting: '',
      escalationEmail: '',
      slotDurationMinutes: 30,
    },
    publishStatus: 'idle',
    publishError: null,
    publishResult: null,
  };
}

type Action =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_INDUSTRY'; industry: string; template: IndustryTemplate }
  | { type: 'SET_BUSINESS'; business: WizardState['business'] }
  | { type: 'SET_SERVICES'; services: TemplateService[] }
  | { type: 'SET_HOURS'; hours: DayHours[] }
  | { type: 'SET_FAQS'; faqs: TemplateFaq[] }
  | { type: 'SET_AI'; ai: WizardState['ai'] }
  | { type: 'SET_PUBLISHING' }
  | { type: 'SET_PUBLISH_SUCCESS'; result: PublishResult }
  | { type: 'SET_PUBLISH_ERROR'; error: string }
  | { type: 'RESET' };

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_INDUSTRY':
      return {
        ...state,
        step: 1,
        industry: action.industry,
        templateVersion: action.template.version,
        services: action.template.suggestedServices.map((s) => ({ ...s })),
        hours: action.template.defaultHours.map((h) => ({ ...h })),
        faqs: action.template.suggestedFaqs.map((f) => ({ ...f })),
        ai: {
          greeting: action.template.suggestedGreeting,
          escalationEmail: '',
          slotDurationMinutes: action.template.slotDurationMinutes,
        },
      };
    case 'SET_BUSINESS':
      return { ...state, business: action.business };
    case 'SET_SERVICES':
      return { ...state, services: action.services };
    case 'SET_HOURS':
      return { ...state, hours: action.hours };
    case 'SET_FAQS':
      return { ...state, faqs: action.faqs };
    case 'SET_AI':
      return { ...state, ai: action.ai };
    case 'SET_PUBLISHING':
      return { ...state, publishStatus: 'publishing', publishError: null };
    case 'SET_PUBLISH_SUCCESS':
      return { ...state, publishStatus: 'success', publishResult: action.result };
    case 'SET_PUBLISH_ERROR':
      return { ...state, publishStatus: 'error', publishError: action.error };
    case 'RESET':
      return initialState();
    default:
      return state;
  }
}

function saveDraft(state: WizardState) {
  try {
    const data = {
      sessionId: state.sessionId,
      industry: state.industry,
      templateVersion: state.templateVersion,
      business: state.business,
      services: state.services,
      hours: state.hours,
      faqs: state.faqs,
      ai: state.ai,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {}
}

function loadDraft(): Partial<WizardState> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export default function OnboardingWizard() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, null, initialState);
  const [showResume, setShowResume] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [publishProgress, setPublishProgress] = useState('');

  // Check for draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.business && draft.sessionId) {
      setShowResume(true);
    }
    setInitialized(true);
    console.log('[Onboarding] wizard_started sessionId=' + crypto.randomUUID());
  }, []);

  // Auto-save draft on meaningful state changes
  useEffect(() => {
    if (initialized && state.step > 0 && state.publishStatus !== 'success') {
      saveDraft(state);
    }
  }, [state.business, state.services, state.hours, state.faqs, state.ai, state.step, state.industry, initialized, state.publishStatus]);

  const handleResume = useCallback(() => {
    const draft = loadDraft();
    if (draft) {
      dispatch({ type: 'SET_STEP', step: 0 });
      if (draft.industry && draft.templateVersion) {
        // Reconstruct template from draft data to dispatch SET_INDUSTRY
        dispatch({ type: 'SET_INDUSTRY', industry: draft.industry, template: {
          version: draft.templateVersion,
          industry: draft.industry,
          label: draft.industry.charAt(0).toUpperCase() + draft.industry.slice(1),
          suggestedServices: draft.services || [],
          defaultHours: draft.hours?.map(h => ({ ...h })) || [],
          suggestedFaqs: draft.faqs?.map(f => ({ ...f })) || [],
          suggestedGreeting: draft.ai?.greeting || '',
          escalationRules: { autoEscalateKeywords: [], alertMethods: [], notifyEmail: '', inactivityTimeoutMinutes: 30 },
          slotDurationMinutes: draft.ai?.slotDurationMinutes || 30,
        } });
      }
      if (draft.business) dispatch({ type: 'SET_BUSINESS', business: draft.business });
      if (draft.services) dispatch({ type: 'SET_SERVICES', services: draft.services });
      if (draft.hours) dispatch({ type: 'SET_HOURS', hours: draft.hours });
      if (draft.faqs) dispatch({ type: 'SET_FAQS', faqs: draft.faqs });
      if (draft.ai) dispatch({ type: 'SET_AI', ai: draft.ai });

      let estimatedStep = draft.industry ? 1 : 0;
      if (draft.business?.name) estimatedStep = Math.max(estimatedStep, 2);
      if (draft.services?.length) estimatedStep = Math.max(estimatedStep, 3);
      if (draft.hours?.length) estimatedStep = Math.max(estimatedStep, 4);
      if (draft.faqs?.length) estimatedStep = Math.max(estimatedStep, 5);
      if (draft.ai?.greeting) estimatedStep = Math.max(estimatedStep, 6);
      dispatch({ type: 'SET_STEP', step: estimatedStep });
    }
    setShowResume(false);
  }, []);

  // Simple resume: just close modal and continue with existing state
  // The draft data was already loaded into state during initialization
  useEffect(() => {
    if (!showResume && initialized) {
      const draft = loadDraft();
      if (draft?.sessionId && draft?.business?.name) {
        // State already has the data from the rehydrated initial state
        console.log('[Onboarding] wizard_resumed sessionId=' + draft.sessionId);
      }
    }
  }, [showResume, initialized]);

  const handleStartFresh = useCallback(() => {
    clearDraft();
    setShowResume(false);
    window.location.reload();
  }, []);

  const handleIndustrySelect = (industry: string, template: IndustryTemplate) => {
    console.log('[Onboarding] template_loaded industry=' + industry + ' version=' + template.version);
    dispatch({ type: 'SET_INDUSTRY', industry, template });
  };

  const goToStep = (step: number) => {
    dispatch({ type: 'SET_STEP', step });
  };

  const handlePublish = async () => {
    dispatch({ type: 'SET_PUBLISHING' });
    console.log('[Onboarding] publish_attempted session=' + state.sessionId + ' industry=' + state.industry);

    try {
      const result = await publishTenant({
        sessionId: state.sessionId,
        business: {
          name: state.business.name.trim(),
          slug: state.business.slug.trim(),
          tagline: state.business.tagline,
          description: state.business.description,
          phone: state.business.phone,
          email: state.business.email.trim(),
          address: state.business.address,
          timezone: state.business.timezone,
        },
        services: state.services.map((s) => ({
          name: s.name.trim(),
          description: s.description,
          durationMinutes: s.durationMinutes,
          price: s.price,
          category: s.category,
        })),
        hours: state.hours,
        faqs: state.faqs.map((f) => ({
          question: f.question.trim(),
          answer: f.answer.trim(),
          category: f.category,
        })),
        ai: {
          greeting: state.ai.greeting.trim(),
          escalationEmail: state.ai.escalationEmail.trim(),
          slotDurationMinutes: state.ai.slotDurationMinutes,
        },
        industryTemplate: state.industry,
        templateVersion: state.templateVersion,
      });

      console.log('[Onboarding] publish_succeeded session=' + state.sessionId + ' businessId=' + result.businessId + ' action=' + (result.idempotent ? 'idempotent_replay' : 'created'));

      clearDraft();
      dispatch({ type: 'SET_PUBLISH_SUCCESS', result });
    } catch (err: any) {
      console.error('[Onboarding] publish_error session=' + state.sessionId, err);
      dispatch({ type: 'SET_PUBLISH_ERROR', error: err.message || 'Publication failed' });
    }
  };

  const handlePublishSuccess = () => {
    if (!state.publishResult) return;
    const params = new URLSearchParams({
      businessId: state.publishResult.businessId,
      tenantUrl: state.publishResult.tenantUrl,
      adminUrl: state.publishResult.adminUrl,
      bookingUrl: state.publishResult.bookingUrl,
      slug: state.publishResult.slug,
    });
    router.push(`/ops/onboarding/success?${params.toString()}`);
  };

  const handlePublishRetry = () => {
    handlePublish();
  };

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size={40} color="#a3a3a3" />
      </div>
    );
  }

  return (
    <>
      {showResume && (
        <ResumeDraftModal
          businessName={state.business.name || ''}
          onResume={() => setShowResume(false)}
          onStartFresh={handleStartFresh}
        />
      )}

      {state.publishStatus === 'success' && state.publishResult ? (
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
          <StepPublish
            status="success"
            result={state.publishResult}
            onRetry={handlePublishRetry}
            onSuccess={handlePublishSuccess}
          />
        </div>
      ) : null}

      {state.publishStatus === 'publishing' ? (
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
          <StepPublish
            status="publishing"
            onRetry={handlePublishRetry}
            onSuccess={handlePublishSuccess}
          />
        </div>
      ) : null}

      {state.publishStatus === 'error' ? (
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
          <StepPublish
            status="error"
            error={state.publishError || undefined}
            onRetry={handlePublishRetry}
            onSuccess={handlePublishSuccess}
          />
        </div>
      ) : null}

      {state.publishStatus === 'idle' ? (
        <WizardShell steps={STEPS} currentStep={state.step}>
          {state.step === 0 && (
            <StepIndustry onSelect={handleIndustrySelect} />
          )}

          {state.step === 1 && (
            <StepBusiness
              data={state.business}
              onChange={(business) => dispatch({ type: 'SET_BUSINESS', business })}
              onNext={() => goToStep(2)}
              onBack={() => goToStep(0)}
            />
          )}

          {state.step === 2 && (
            <StepServices
              services={state.services}
              onChange={(services) => dispatch({ type: 'SET_SERVICES', services })}
              onNext={() => goToStep(3)}
              onBack={() => goToStep(1)}
            />
          )}

          {state.step === 3 && (
            <StepHours
              hours={state.hours}
              onChange={(hours) => dispatch({ type: 'SET_HOURS', hours })}
              onNext={() => goToStep(4)}
              onBack={() => goToStep(2)}
            />
          )}

          {state.step === 4 && (
            <StepFaqs
              faqs={state.faqs}
              onChange={(faqs) => dispatch({ type: 'SET_FAQS', faqs })}
              onNext={() => goToStep(5)}
              onBack={() => goToStep(3)}
            />
          )}

          {state.step === 5 && (
            <StepAi
              data={state.ai}
              onChange={(ai) => dispatch({ type: 'SET_AI', ai })}
              onNext={() => goToStep(6)}
              onBack={() => goToStep(4)}
            />
          )}

          {state.step === 6 && (
            <StepReview
              data={{
                business: state.business,
                services: state.services,
                hours: state.hours,
                faqs: state.faqs,
                ai: state.ai,
              }}
              onEdit={(step) => goToStep(step)}
              onPublish={handlePublish}
              publishing={false}
            />
          )}
        </WizardShell>
      ) : null}
    </>
  );
}
