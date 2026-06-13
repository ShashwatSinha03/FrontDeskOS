import pool from '../config/db';
import { BusinessChannel } from '../types';

export class BusinessChannelRepository {
  async getChannels(businessId: string): Promise<BusinessChannel[]> {
    const query = `
      SELECT id, business_id, channel_type, enabled, provider, config_json, created_at, updated_at
      FROM business_channels
      WHERE business_id = $1
      ORDER BY channel_type ASC
    `;
    const res = await pool.query(query, [businessId]);
    return res.rows.map(r => this.mapToEntity(r));
  }

  async getChannel(businessId: string, channelType: string): Promise<BusinessChannel | null> {
    const query = `
      SELECT id, business_id, channel_type, enabled, provider, config_json, created_at, updated_at
      FROM business_channels
      WHERE business_id = $1 AND channel_type = $2
    `;
    const res = await pool.query(query, [businessId, channelType]);
    if (res.rows.length === 0) return null;
    return this.mapToEntity(res.rows[0]);
  }

  async enableChannel(businessId: string, channelType: string): Promise<BusinessChannel> {
    const query = `
      UPDATE business_channels
      SET enabled = true, updated_at = NOW()
      WHERE business_id = $1 AND channel_type = $2
      RETURNING id, business_id, channel_type, enabled, provider, config_json, created_at, updated_at
    `;
    const res = await pool.query(query, [businessId, channelType]);
    if (res.rows.length === 0) {
      throw new Error(`Channel '${channelType}' not found for business '${businessId}'`);
    }
    return this.mapToEntity(res.rows[0]);
  }

  async disableChannel(businessId: string, channelType: string): Promise<BusinessChannel> {
    const query = `
      UPDATE business_channels
      SET enabled = false, updated_at = NOW()
      WHERE business_id = $1 AND channel_type = $2
      RETURNING id, business_id, channel_type, enabled, provider, config_json, created_at, updated_at
    `;
    const res = await pool.query(query, [businessId, channelType]);
    if (res.rows.length === 0) {
      throw new Error(`Channel '${channelType}' not found for business '${businessId}'`);
    }
    return this.mapToEntity(res.rows[0]);
  }

  async updateChannelConfig(
    businessId: string,
    channelType: string,
    config: { enabled?: boolean; provider?: string; configJson?: Record<string, any> }
  ): Promise<BusinessChannel> {
    const sets: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];
    let idx = 1;

    if (config.enabled !== undefined) {
      sets.push(`enabled = $${idx++}`);
      params.push(config.enabled);
    }
    if (config.provider !== undefined) {
      sets.push(`provider = $${idx++}`);
      params.push(config.provider);
    }
    if (config.configJson !== undefined) {
      sets.push(`config_json = $${idx++}`);
      params.push(JSON.stringify(config.configJson));
    }

    params.push(businessId, channelType);
    const query = `
      UPDATE business_channels
      SET ${sets.join(', ')}
      WHERE business_id = $${idx++} AND channel_type = $${idx}
      RETURNING id, business_id, channel_type, enabled, provider, config_json, created_at, updated_at
    `;
    const res = await pool.query(query, params);
    if (res.rows.length === 0) {
      throw new Error(`Channel '${channelType}' not found for business '${businessId}'`);
    }
    return this.mapToEntity(res.rows[0]);
  }

  async deleteChannel(businessId: string, channelType: string): Promise<void> {
    const query = `
      DELETE FROM business_channels
      WHERE business_id = $1 AND channel_type = $2
    `;
    await pool.query(query, [businessId, channelType]);
  }

  async findEnabledChannels(businessId: string): Promise<BusinessChannel[]> {
    const query = `
      SELECT id, business_id, channel_type, enabled, provider, config_json, created_at, updated_at
      FROM business_channels
      WHERE business_id = $1 AND enabled = true
      ORDER BY channel_type ASC
    `;
    const res = await pool.query(query, [businessId]);
    return res.rows.map(r => this.mapToEntity(r));
  }

  async countEnabledChannels(businessId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM business_channels
      WHERE business_id = $1 AND enabled = true
    `;
    const res = await pool.query(query, [businessId]);
    return parseInt(res.rows[0].count, 10);
  }

  private mapToEntity(row: any): BusinessChannel {
    return {
      id: row.id,
      businessId: row.business_id,
      channelType: row.channel_type,
      enabled: row.enabled,
      provider: row.provider,
      configJson: row.config_json || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
