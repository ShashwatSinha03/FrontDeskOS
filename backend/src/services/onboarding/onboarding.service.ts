import onboardingRepository, { CreateBusinessInput, CreateServiceInput, CreateScheduleInput } from '../../repositories/onboarding.repository';
import { templates, IndustryTemplate } from './templates';

export interface PublishRequest {
  sessionId: string;
  business: {
    name: string;
    slug: string;
    tagline?: string;
    description?: string;
    phone?: string;
    email?: string;
    address?: string;
    timezone?: string;
  };
  services: {
    name: string;
    description?: string;
    durationMinutes: number;
    price: number;
    category?: string;
  }[];
  hours: {
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }[];
  faqs: {
    question: string;
    answer: string;
    category?: string;
  }[];
  ai: {
    greeting: string;
    escalationEmail: string;
    slotDurationMinutes: number;
    autoEscalateKeywords?: string[];
  };
  industryTemplate: string;
  templateVersion: string;
}

export interface PublishResult {
  idempotent: boolean;
  businessId: string;
  slug: string;
  tenantUrl: string;
  adminUrl: string;
  bookingUrl: string;
  createdAt: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export class OnboardingService {
  getTemplate(industry: string): IndustryTemplate | null {
    return templates[industry] || null;
  }

  listIndustries(): { id: string; label: string }[] {
    return Object.entries(templates).map(([id, t]) => ({
      id,
      label: t.label,
    }));
  }

  validatePublishRequest(req: PublishRequest): ValidationError[] {
    const errors: ValidationError[] = [];

    // Business validation
    if (!req.business.name || req.business.name.trim().length < 2) {
      errors.push({ field: 'business.name', message: 'Business name is required (minimum 2 characters)' });
    }
    if (!req.business.slug || req.business.slug.trim().length < 3) {
      errors.push({ field: 'business.slug', message: 'URL slug is required (minimum 3 characters)' });
    } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(req.business.slug)) {
      errors.push({ field: 'business.slug', message: 'Slug must be lowercase alphanumeric with hyphens only' });
    }
    if (!req.business.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.business.email)) {
      errors.push({ field: 'business.email', message: 'A valid business email is required' });
    }

    // Services validation
    if (!req.services || req.services.length < 1) {
      errors.push({ field: 'services', message: 'At least one service is required' });
    } else {
      req.services.forEach((svc, i) => {
        if (!svc.name || svc.name.trim().length < 2) {
          errors.push({ field: `services[${i}].name`, message: `Service ${i + 1}: name is required` });
        }
        if (!svc.durationMinutes || svc.durationMinutes < 5) {
          errors.push({ field: `services[${i}].durationMinutes`, message: `Service ${i + 1}: duration must be at least 5 minutes` });
        }
        if (svc.price == null || svc.price < 0) {
          errors.push({ field: `services[${i}].price`, message: `Service ${i + 1}: price must be 0 or greater` });
        }
      });
    }

    // Hours validation
    if (!req.hours || req.hours.filter(h => !h.isClosed).length === 0) {
      errors.push({ field: 'hours', message: 'At least one open day is required' });
    } else {
      req.hours.forEach((hr, i) => {
        if (!hr.isClosed) {
          if (!hr.openTime) errors.push({ field: `hours[${i}].openTime`, message: `Day ${i}: open time is required` });
          if (!hr.closeTime) errors.push({ field: `hours[${i}].closeTime`, message: `Day ${i}: close time is required` });
        }
      });
    }

    // AI validation
    if (!req.ai?.greeting || req.ai.greeting.trim().length < 5) {
      errors.push({ field: 'ai.greeting', message: 'AI greeting message is required (minimum 5 characters)' });
    }
    if (!req.ai?.escalationEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.ai.escalationEmail)) {
      errors.push({ field: 'ai.escalationEmail', message: 'A valid escalation email is required' });
    }

    return errors;
  }

  async publish(req: PublishRequest): Promise<PublishResult> {
    // 1. Check idempotency — has this session already created a tenant?
    const existing = await onboardingRepository.findBusinessByOnboardingSession(req.sessionId);
    if (existing) {
      return {
        idempotent: true,
        businessId: existing.id,
        slug: existing.slug,
        tenantUrl: `https://frontdeskos.vercel.app/${existing.slug}`,
        adminUrl: `https://frontdeskos.vercel.app/${existing.slug}/admin`,
        bookingUrl: `https://frontdeskos.vercel.app/${existing.slug}/booking`,
        createdAt: new Date().toISOString(),
      };
    }

    // 2. Check slug availability
    const slugAvailable = await onboardingRepository.checkSlugAvailable(req.business.slug);
    if (!slugAvailable) {
      throw new Error(`Business slug "${req.business.slug}" is already taken`);
    }

    // 3. Build metadata
    const onboardingMeta = {
      onboarding: {
        sessionId: req.sessionId,
        version: req.templateVersion || '1.0.0',
        industry: req.industryTemplate || 'professional_services',
        method: 'wizard_v1',
        completedAt: new Date().toISOString(),
      },
    };

    // 4. Build appointment settings (preserve existing structure, add onboarding)
    const appointmentSettings = {
      slotDurationMinutes: req.ai.slotDurationMinutes || 30,
      workingHours: {
        weekday: { start: '09:00', end: '18:00' },
        saturday: { start: '09:00', end: '17:00' },
        sunday: null,
      },
      bufferMinutesBefore: 0,
      bufferMinutesAfter: 0,
      ...onboardingMeta,
    };

    // 5. Build escalation rules
    const escalationRules = {
      autoEscalateKeywords: req.ai.autoEscalateKeywords || ['emergency', 'complaint', 'refund', 'manager'],
      alertMethods: ['dashboard'],
      notifyEmail: req.ai.escalationEmail,
      inactivityTimeoutMinutes: 10,
    };

    // 6. Prepare business record
    const businessInput: CreateBusinessInput = {
      name: req.business.name,
      slug: req.business.slug,
      businessType: req.industryTemplate || 'professional_services',
      phone: req.business.phone,
      email: req.business.email,
      description: req.business.description || req.business.tagline || '',
      timezone: req.business.timezone || 'Asia/Kolkata',
      faqs: req.faqs.map(f => ({
        question: f.question,
        answer: f.answer,
        category: f.category,
      })),
      appointmentSettings: appointmentSettings as unknown as Record<string, unknown>,
      escalationRules: escalationRules as unknown as Record<string, unknown>,
    };

    // 7. Prepare services
    const serviceInputs: CreateServiceInput[] = req.services.map(s => ({
      name: s.name,
      description: s.description,
      durationMinutes: s.durationMinutes,
      price: s.price,
    }));

    // 8. Prepare schedules (filter closed days)
    const scheduleInputs = req.hours
      .filter(h => !h.isClosed)
      .map(h => ({
        dayOfWeek: h.dayOfWeek,
        startTime: h.openTime,
        endTime: h.closeTime,
      }));

    // 9. Execute transaction
    const result = await onboardingRepository.createTenant(businessInput, serviceInputs, scheduleInputs);

    return {
      idempotent: false,
      businessId: result.businessId,
      slug: result.slug,
      tenantUrl: `https://frontdeskos.vercel.app/${result.slug}`,
      adminUrl: `https://frontdeskos.vercel.app/${result.slug}/admin`,
      bookingUrl: `https://frontdeskos.vercel.app/${result.slug}/booking`,
      createdAt: result.createdAt.toISOString(),
    };
  }
}

export const onboardingService = new OnboardingService();
export default onboardingService;
