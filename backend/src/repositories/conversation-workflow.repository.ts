import pool from '../config/db';
import { ConversationWorkflow, CollectedData, WorkflowState, WorkflowType } from '../types';

export class ConversationWorkflowRepository {
  async findByConversation(
    conversationId: string,
    workflowType: WorkflowType,
  ): Promise<ConversationWorkflow | null> {
    const res = await pool.query(
      `SELECT * FROM conversation_workflows
       WHERE conversation_id = $1 AND workflow_type = $2
       ORDER BY created_at DESC LIMIT 1`,
      [conversationId, workflowType],
    );
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async upsert(data: {
    conversationId: string;
    workflowType: WorkflowType;
    workflowState: WorkflowState;
    workflowVersion: number;
    collectedData: CollectedData;
    lastAskedField?: string;
    availableSlots?: string[];
    slotsFetchedAt?: Date;
  }): Promise<ConversationWorkflow> {
    const existing = await this.findByConversation(data.conversationId, data.workflowType);
    if (existing) {
      const res = await pool.query(
        `UPDATE conversation_workflows
         SET workflow_state = $1,
             collected_data = $2,
             last_asked_field = $3,
             available_slots = $4,
             slots_fetched_at = $5,
             last_updated_at = now()
         WHERE id = $6
         RETURNING *`,
        [
          data.workflowState,
          JSON.stringify(data.collectedData),
          data.lastAskedField ?? null,
          data.availableSlots ? JSON.stringify(data.availableSlots) : null,
          data.slotsFetchedAt ?? null,
          existing.id,
        ],
      );
      return this.mapRow(res.rows[0]);
    }

    const res = await pool.query(
      `INSERT INTO conversation_workflows
       (conversation_id, workflow_type, workflow_state, workflow_version, collected_data, last_asked_field, available_slots, slots_fetched_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.conversationId,
        data.workflowType,
        data.workflowState,
        data.workflowVersion,
        JSON.stringify(data.collectedData),
        data.lastAskedField ?? null,
        data.availableSlots ? JSON.stringify(data.availableSlots) : null,
        data.slotsFetchedAt ?? null,
      ],
    );
    return this.mapRow(res.rows[0]);
  }

  async updateCollectedData(
    id: string,
    collectedData: CollectedData,
    lastAskedField?: string,
  ): Promise<void> {
    await pool.query(
      `UPDATE conversation_workflows
       SET collected_data = collected_data || $2,
           last_asked_field = COALESCE($3, last_asked_field),
           last_updated_at = now()
       WHERE id = $1`,
      [id, JSON.stringify(collectedData), lastAskedField ?? null],
    );
  }

  async expireOldWorkflows(hours: number = 24): Promise<number> {
    const res = await pool.query(
      `DELETE FROM conversation_workflows
       WHERE workflow_state NOT IN ('BOOKED', 'CANCELLED')
         AND last_updated_at < now() - make_interval(hours => $1)
       RETURNING id`,
      [hours],
    );
    return res.rowCount ?? 0;
  }

  async delete(id: string): Promise<void> {
    await pool.query('DELETE FROM conversation_workflows WHERE id = $1', [id]);
  }

  private mapRow(row: any): ConversationWorkflow {
    const collectedData: CollectedData =
      typeof row.collected_data === 'string'
        ? JSON.parse(row.collected_data)
        : row.collected_data || {};

    const availableSlots: string[] | undefined =
      row.available_slots
        ? (typeof row.available_slots === 'string'
            ? JSON.parse(row.available_slots)
            : row.available_slots)
        : undefined;

    return {
      id: row.id,
      conversationId: row.conversation_id,
      workflowType: row.workflow_type as WorkflowType,
      workflowState: row.workflow_state as WorkflowState,
      workflowVersion: row.workflow_version,
      collectedData,
      lastAskedField: row.last_asked_field || undefined,
      availableSlots,
      slotsFetchedAt: row.slots_fetched_at ? new Date(row.slots_fetched_at) : undefined,
      lastUpdatedAt: new Date(row.last_updated_at),
      createdAt: new Date(row.created_at),
    };
  }
}

export default ConversationWorkflowRepository;
