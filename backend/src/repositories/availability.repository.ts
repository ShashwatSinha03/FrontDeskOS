import pool from '../config/db';
import { AvailabilitySchedule, AvailabilityOverride } from '../types';

export class AvailabilityRepository {
  async findSchedules(businessId: string, serviceId?: string | null): Promise<AvailabilitySchedule[]> {
    let query = `SELECT * FROM availability_schedules WHERE business_id = $1`;
    const params: any[] = [businessId];
    if (serviceId) {
      query += ` AND (service_id = $2 OR service_id IS NULL)`;
      params.push(serviceId);
    }
    query += ` ORDER BY day_of_week, start_time`;
    const res = await pool.query(query, params);
    return res.rows.map(r => this.mapSchedule(r));
  }

  async findSchedulesByDay(businessId: string, dayOfWeek: number, serviceId?: string | null): Promise<AvailabilitySchedule[]> {
    let query = `SELECT * FROM availability_schedules WHERE business_id = $1 AND day_of_week = $2`;
    const params: any[] = [businessId, dayOfWeek];
    if (serviceId) {
      query += ` AND (service_id = $3 OR service_id IS NULL)`;
      params.push(serviceId);
    }
    query += ` ORDER BY start_time`;
    const res = await pool.query(query, params);
    return res.rows.map(r => this.mapSchedule(r));
  }

  async createSchedule(data: {
    businessId: string;
    serviceId?: string | null;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    effectiveFrom?: Date;
    effectiveUntil?: Date | null;
  }): Promise<AvailabilitySchedule> {
    const query = `
      INSERT INTO availability_schedules (business_id, service_id, day_of_week, start_time, end_time, effective_from, effective_until)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const res = await pool.query(query, [
      data.businessId,
      data.serviceId || null,
      data.dayOfWeek,
      data.startTime,
      data.endTime,
      data.effectiveFrom || new Date(),
      data.effectiveUntil || null,
    ]);
    return this.mapSchedule(res.rows[0]);
  }

  async deleteSchedule(id: string, businessId: string): Promise<void> {
    const res = await pool.query(`DELETE FROM availability_schedules WHERE id = $1 AND business_id = $2`, [id, businessId]);
    if (res.rowCount === 0) throw new Error('Schedule not found or does not belong to this business');
  }

  async findOverrides(businessId: string, date?: Date): Promise<AvailabilityOverride[]> {
    let query = `SELECT * FROM availability_overrides WHERE business_id = $1`;
    const params: any[] = [businessId];
    if (date) {
      query += ` AND date = $2`;
      params.push(date);
    }
    query += ` ORDER BY date, start_time`;
    const res = await pool.query(query, params);
    return res.rows.map(r => this.mapOverride(r));
  }

  async findOverridesByDateRange(businessId: string, startDate: Date, endDate: Date): Promise<AvailabilityOverride[]> {
    const query = `SELECT * FROM availability_overrides WHERE business_id = $1 AND date >= $2 AND date <= $3 ORDER BY date, start_time`;
    const res = await pool.query(query, [businessId, startDate, endDate]);
    return res.rows.map(r => this.mapOverride(r));
  }

  async createOverride(data: {
    businessId: string;
    serviceId?: string | null;
    date: Date;
    startTime?: string | null;
    endTime?: string | null;
    reason?: string | null;
    isAvailable?: boolean;
  }): Promise<AvailabilityOverride> {
    const query = `
      INSERT INTO availability_overrides (business_id, service_id, date, start_time, end_time, reason, is_available)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const res = await pool.query(query, [
      data.businessId,
      data.serviceId || null,
      data.date,
      data.startTime || null,
      data.endTime || null,
      data.reason || null,
      data.isAvailable ?? true,
    ]);
    return this.mapOverride(res.rows[0]);
  }

  async deleteOverride(id: string, businessId: string): Promise<void> {
    const res = await pool.query(`DELETE FROM availability_overrides WHERE id = $1 AND business_id = $2`, [id, businessId]);
    if (res.rowCount === 0) throw new Error('Override not found or does not belong to this business');
  }

  private mapSchedule(row: any): AvailabilitySchedule {
    return {
      id: row.id,
      businessId: row.business_id,
      serviceId: row.service_id,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time,
      endTime: row.end_time,
      effectiveFrom: new Date(row.effective_from),
      effectiveUntil: row.effective_until ? new Date(row.effective_until) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapOverride(row: any): AvailabilityOverride {
    return {
      id: row.id,
      businessId: row.business_id,
      serviceId: row.service_id,
      date: new Date(row.date),
      startTime: row.start_time,
      endTime: row.end_time,
      reason: row.reason,
      isAvailable: row.is_available,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
