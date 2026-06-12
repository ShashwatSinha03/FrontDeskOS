import pool from '../config/db';
import { Appointment, AppointmentStatus } from '../types';

export class AppointmentRepository {
  /**
   * Register a new appointment slot.
   */
  async create(data: {
    customerId: string;
    businessId: string;
    serviceId: string | null;
    appointmentTime: Date;
    notes?: string;
  }): Promise<Appointment> {
    const query = `
      INSERT INTO appointments (customer_id, business_id, service_id, appointment_time, status, notes)
      VALUES ($1, $2, $3, $4, 'pending', $5)
      RETURNING *
    `;
    const res = await pool.query(query, [
      data.customerId,
      data.businessId,
      data.serviceId,
      data.appointmentTime,
      data.notes || null,
    ]);
    return this.mapToEntity(res.rows[0]);
  }

  /**
   * Find a single appointment by ID.
   */
  async findById(id: string, businessId: string): Promise<Appointment | null> {
    const query = `SELECT * FROM appointments WHERE id = $1 AND business_id = $2`;
    const res = await pool.query(query, [id, businessId]);
    if (res.rows.length === 0) return null;
    return this.mapToEntity(res.rows[0]);
  }

  /**
   * Reschedule an appointment: mark old as rescheduled and create a new one.
   */
  async reschedule(
    appointmentId: string,
    businessId: string,
    newTime: Date,
    notes?: string
  ): Promise<Appointment> {
    const old = await this.findById(appointmentId, businessId);
    if (!old) throw new Error('Appointment not found');

    await pool.query(
      `UPDATE appointments SET status = 'rescheduled', updated_at = NOW() WHERE id = $1`,
      [appointmentId]
    );

    const newAppt = await this.create({
      customerId: old.customerId,
      businessId: old.businessId,
      serviceId: old.serviceId,
      appointmentTime: newTime,
      notes: notes || `Rescheduled from ${old.appointmentTime.toISOString()}`,
    });

    await pool.query(
      `UPDATE appointments SET rescheduled_from_id = $2 WHERE id = $1`,
      [newAppt.id, appointmentId]
    );

    return newAppt;
  }

  /**
   * Cancel an appointment with an optional reason.
   */
  async cancelWithReason(id: string, businessId: string, reason?: string): Promise<void> {
    const query = `
      UPDATE appointments
      SET status = 'cancelled', cancellation_reason = $2, updated_at = NOW()
      WHERE id = $1 AND business_id = $3
    `;
    const res = await pool.query(query, [id, reason || null, businessId]);
    if (res.rowCount === 0) throw new Error('Appointment not found or does not belong to this business');
  }

  /**
   * Update status (e.g. pending, confirmed, cancelled, rescheduled).
   */
  async updateStatus(id: string, status: AppointmentStatus, businessId: string): Promise<void> {
    const query = `
      UPDATE appointments
      SET status = $2, updated_at = NOW()
      WHERE id = $1 AND business_id = $3
    `;
    const res = await pool.query(query, [id, status, businessId]);
    if (res.rowCount === 0) throw new Error('Appointment not found or does not belong to this business');
  }

  /**
   * List all appointments scheduled for a business.
   * Supports filtering by status, time ranges, and paging constraints.
   */
  async findByBusiness(
    businessId: string,
    filters?: {
      status?: AppointmentStatus;
      startDate?: Date;
      endDate?: Date;
      customerId?: string;
    },
    pagination?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ appointments: any[]; totalCount: number }> {
    let query = `
      SELECT a.id, a.customer_id, a.business_id, a.service_id, a.appointment_time, a.status, a.notes, a.cancellation_reason, a.rescheduled_from_id, a.created_at, a.updated_at,
             c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
             s.name as service_name,
             COUNT(*) OVER() as total_count
      FROM appointments a
      LEFT JOIN customers c ON c.id = a.customer_id
      LEFT JOIN services s ON s.id = a.service_id
      WHERE a.business_id = $1
    `;
    const params: any[] = [businessId];
    let paramIndex = 2;

    if (filters?.status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.startDate) {
      query += ` AND a.appointment_time >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters?.endDate) {
      query += ` AND a.appointment_time <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    if (filters?.customerId) {
      query += ` AND a.customer_id = $${paramIndex}`;
      params.push(filters.customerId);
      paramIndex++;
    }

    query += ` ORDER BY a.appointment_time ASC`;

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const res = await pool.query(query, params);
    
    if (res.rows.length === 0) {
      return { appointments: [], totalCount: 0 };
    }

    const totalCount = parseInt(res.rows[0].total_count, 10);
    const appointments = res.rows.map(row => ({
      ...this.mapToEntity(row),
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      serviceName: row.service_name,
    }));
    
    return { appointments, totalCount };
  }

  async findByCustomerWithDetails(customerId: string, businessId: string): Promise<any[]> {
    const query = `
      SELECT a.*, s.name as service_name
      FROM appointments a
      LEFT JOIN services s ON s.id = a.service_id
      WHERE a.customer_id = $1 AND a.business_id = $2
      ORDER BY a.appointment_time DESC
    `;
    const res = await pool.query(query, [customerId, businessId]);
    return res.rows.map(row => ({
      ...this.mapToEntity(row),
      serviceName: row.service_name,
    }));
  }

  /**
   * Retrieve appointments for a specific customer profile.
   */
  async findByCustomer(customerId: string, businessId: string): Promise<Appointment[]> {
    const query = `
      SELECT id, customer_id, business_id, service_id, appointment_time, status, notes, cancellation_reason, rescheduled_from_id, created_at, updated_at
      FROM appointments
      WHERE customer_id = $1 AND business_id = $2
      ORDER BY appointment_time DESC
    `;
    const res = await pool.query(query, [customerId, businessId]);
    return res.rows.map(row => this.mapToEntity(row));
  }

  /**
   * Check slot availability (ensures no scheduling overlap).
   * Uses a proper overlap check via LEFT JOIN with services for duration.
   * Detects: existing appointment starting before requestedEnd AND ending after requestedStart.
   */
  async checkAvailability(businessId: string, time: Date, durationMinutes: number = 30): Promise<boolean> {
    const startTime = new Date(time);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    const query = `
      SELECT a.id 
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      WHERE a.business_id = $1 
        AND a.status IN ('pending', 'confirmed')
        AND a.appointment_time < $3
        AND (a.appointment_time + COALESCE((s.duration_minutes || ' minutes')::interval, INTERVAL '30 minutes')) > $2
    `;
    const res = await pool.query(query, [businessId, startTime, endTime]);
    return res.rows.length === 0;
  }

  private mapToEntity(row: any): Appointment {
    return {
      id: row.id,
      customerId: row.customer_id,
      businessId: row.business_id,
      serviceId: row.service_id,
      appointmentTime: new Date(row.appointment_time),
      status: row.status as AppointmentStatus,
      notes: row.notes,
      cancellationReason: row.cancellation_reason || undefined,
      rescheduledFromId: row.rescheduled_from_id || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
export default AppointmentRepository;
