import pool from '../config/db';

export interface NotificationRecord {
  id: string;
  businessId: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: Date;
}

export class NotificationRepository {
  async create(data: {
    businessId: string;
    type: string;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
  }): Promise<NotificationRecord> {
    const query = `
      INSERT INTO notifications (business_id, type, title, message, entity_type, entity_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const res = await pool.query(query, [
      data.businessId,
      data.type,
      data.title,
      data.message,
      data.entityType || null,
      data.entityId || null,
    ]);
    return this.mapToEntity(res.rows[0]);
  }

  async findByBusiness(
    businessId: string,
    pagination?: { page?: number; limit?: number },
  ): Promise<{ notifications: NotificationRecord[]; totalCount: number }> {
    const query = `
      SELECT *, COUNT(*) OVER() as total_count
      FROM notifications
      WHERE business_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const offset = (page - 1) * limit;
    const res = await pool.query(query, [businessId, limit, offset]);

    if (res.rows.length === 0) return { notifications: [], totalCount: 0 };

    const totalCount = parseInt(res.rows[0].total_count, 10);
    return {
      notifications: res.rows.map((r) => this.mapToEntity(r)),
      totalCount,
    };
  }

  async markRead(id: string, businessId: string): Promise<void> {
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND business_id = $2`,
      [id, businessId],
    );
  }

  async markAllRead(businessId: string): Promise<void> {
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE business_id = $1 AND is_read = FALSE`,
      [businessId],
    );
  }

  async countUnread(businessId: string): Promise<number> {
    const res = await pool.query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE business_id = $1 AND is_read = FALSE`,
      [businessId],
    );
    return res.rows[0].count;
  }

  private mapToEntity(row: any): NotificationRecord {
    return {
      id: row.id,
      businessId: row.business_id,
      type: row.type,
      title: row.title,
      message: row.message,
      entityType: row.entity_type,
      entityId: row.entity_id,
      isRead: row.is_read,
      createdAt: new Date(row.created_at),
    };
  }
}
