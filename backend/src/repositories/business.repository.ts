import pool from '../config/db';
import { Business, FAQ, EscalationRules, AppointmentSettings } from '../types';

export class BusinessRepository {
  /**
   * Find a business by its UUID.
   */
  async findById(id: string): Promise<Business | null> {
    const query = `
      SELECT id, name, slug, business_type, archetype, phone, email, address, description, logo_url, timezone, faqs, escalation_rules, appointment_settings, created_at, updated_at
      FROM businesses
      WHERE id = $1
    `;
    const res = await pool.query(query, [id]);
    if (res.rows.length === 0) return null;
    
    const row = res.rows[0];
    return this.mapToEntity(row);
  }

  /**
   * Update the FAQs list for a business.
   */
  async updateFaqs(id: string, faqs: FAQ[]): Promise<void> {
    const query = `
      UPDATE businesses
      SET faqs = $2, updated_at = NOW()
      WHERE id = $1
    `;
    await pool.query(query, [id, JSON.stringify(faqs)]);
  }

  /**
   * Update escalation rules.
   */
  async updateEscalationRules(id: string, rules: EscalationRules): Promise<void> {
    const query = `
      UPDATE businesses
      SET escalation_rules = $2, updated_at = NOW()
      WHERE id = $1
    `;
    await pool.query(query, [id, JSON.stringify(rules)]);
  }

  /**
   * Update appointment settings.
   */
  async updateAppointmentSettings(id: string, settings: AppointmentSettings): Promise<void> {
    const query = `
      UPDATE businesses
      SET appointment_settings = $2, updated_at = NOW()
      WHERE id = $1
    `;
    await pool.query(query, [id, JSON.stringify(settings)]);
  }

  /**
   * Find a business by its URL slug.
   */
  async findBySlug(slug: string): Promise<Business | null> {
    const query = `
      SELECT id, name, slug, business_type, archetype, phone, email, address, description, logo_url, timezone, faqs, escalation_rules, appointment_settings, created_at, updated_at
      FROM businesses
      WHERE slug = $1
    `;
    const res = await pool.query(query, [slug]);
    if (res.rows.length === 0) return null;
    return this.mapToEntity(res.rows[0]);
  }

  /**
   * Maps a database row to a typed Business entity.
   */
  private mapToEntity(row: any): Business {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      businessType: row.business_type,
      archetype: row.archetype,
      phone: row.phone || undefined,
      email: row.email || undefined,
      address: row.address || undefined,
      description: row.description || undefined,
      logoUrl: row.logo_url || undefined,
      timezone: row.timezone || 'UTC',
      faqs: row.faqs as FAQ[],
      escalationRules: row.escalation_rules as EscalationRules,
      appointmentSettings: row.appointment_settings as AppointmentSettings,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
export default BusinessRepository;
