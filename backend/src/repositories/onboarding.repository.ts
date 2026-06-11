import pool from '../config/db';

export interface CreateBusinessInput {
  name: string;
  slug: string;
  businessType: string;
  phone?: string;
  email?: string;
  description?: string;
  timezone: string;
  faqs: { question: string; answer: string; category?: string }[];
  appointmentSettings: Record<string, unknown>;
  escalationRules: Record<string, unknown>;
}

export interface CreateServiceInput {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
}

export interface CreateScheduleInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface OnboardingResult {
  businessId: string;
  slug: string;
  createdAt: Date;
}

export class OnboardingRepository {
  async findBusinessByOnboardingSession(sessionId: string): Promise<{ id: string; slug: string } | null> {
    const query = `
      SELECT id, slug FROM businesses
      WHERE appointment_settings->'onboarding'->>'sessionId' = $1
      LIMIT 1
    `;
    const res = await pool.query(query, [sessionId]);
    if (res.rows.length === 0) return null;
    return { id: res.rows[0].id, slug: res.rows[0].slug };
  }

  async checkSlugAvailable(slug: string): Promise<boolean> {
    const query = `SELECT 1 FROM businesses WHERE slug = $1 LIMIT 1`;
    const res = await pool.query(query, [slug]);
    return res.rows.length === 0;
  }

  async createTenant(
    business: CreateBusinessInput,
    services: CreateServiceInput[],
    schedules: CreateScheduleInput[],
  ): Promise<OnboardingResult> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert business
      const businessQuery = `
        INSERT INTO businesses (name, slug, business_type, phone, email, description, timezone, faqs, appointment_settings, escalation_rules)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, slug, created_at
      `;
      const businessRes = await client.query(businessQuery, [
        business.name,
        business.slug,
        business.businessType,
        business.phone || null,
        business.email || null,
        business.description || null,
        business.timezone,
        JSON.stringify(business.faqs),
        JSON.stringify(business.appointmentSettings),
        JSON.stringify(business.escalationRules),
      ]);
      const { id: businessId, slug, created_at: createdAt } = businessRes.rows[0];

      // 2. Insert services
      if (services.length > 0) {
        const serviceValues: string[] = [];
        const serviceParams: unknown[] = [];
        let paramIdx = 1;

        for (const svc of services) {
          const price = svc.price;
          serviceValues.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5})`);
          serviceParams.push(businessId, svc.name, svc.description || null, price, price, svc.durationMinutes);
          paramIdx += 6;
        }

        const serviceQuery = `
          INSERT INTO services (business_id, name, description, price_min, price_max, duration_minutes)
          VALUES ${serviceValues.join(', ')}
        `;
        await client.query(serviceQuery, serviceParams);
      }

      // 3. Insert schedules
      if (schedules.length > 0) {
        const scheduleValues: string[] = [];
        const scheduleParams: unknown[] = [];
        let paramIdx = 1;

        for (const sch of schedules) {
          scheduleValues.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, CURRENT_DATE)`);
          scheduleParams.push(businessId, sch.dayOfWeek, sch.startTime, sch.endTime);
          paramIdx += 4;
        }

        const scheduleQuery = `
          INSERT INTO availability_schedules (business_id, day_of_week, start_time, end_time, effective_from)
          VALUES ${scheduleValues.join(', ')}
        `;
        await client.query(scheduleQuery, scheduleParams);
      }

      await client.query('COMMIT');

      return {
        businessId,
        slug,
        createdAt: new Date(createdAt),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const onboardingRepository = new OnboardingRepository();
export default onboardingRepository;
