# Pilot Operations Readiness Sprint

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build operational visibility tooling so business owners and founders can debug issues without database access.

**Architecture:** 9 new read-only backend endpoints (6 operational + 3 founder), 7 new frontend pages (5 admin + 2 founder), sidebar updates, enhanced escalations page. All pages reuse existing DataTable/MetricCard/PageHeader/EmptyState components.

**Tech Stack:** Express + PostgreSQL (backend), Next.js App Router + Tailwind v4 (frontend)

---

### Task 1: Backend — GET /api/operate/conversations

**Files:**
- Modify: `backend/src/controllers/operational.controller.ts` (add method)
- Modify: `backend/src/routes/operational.routes.ts` (add route)
- Verify: `backend/src/types/index.ts` (check Conversation type)

**Step 1: Add getConversations method to OperationalController**

In `operational.controller.ts`, add after `resolveEscalation`:

```typescript
async getConversations(req: Request, res: Response): Promise<void> {
  try {
    const businessId = req.membership!.businessId;
    const schema = z.object({
      search: z.string().optional(),
      channel: z.string().optional(),
      workflowState: z.string().optional(),
      escalated: z.coerce.boolean().optional(),
      hasLead: z.coerce.boolean().optional(),
      hasAppointment: z.coerce.boolean().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(25),
    });
    const params = schema.parse(req.query);
    const page = params.page;
    const limit = params.limit;
    const offset = (page - 1) * limit;

    let where = 'WHERE c.business_id = $1';
    const queryParams: unknown[] = [businessId];
    let paramIdx = 2;

    if (params.search) {
      // Search across customer name, phone, conversation id
      where += ` AND (cst.name ILIKE $${paramIdx} OR cst.phone ILIKE $${paramIdx} OR c.id::text ILIKE $${paramIdx})`;
      queryParams.push(`%${params.search}%`);
      paramIdx++;
    }

    if (params.channel) {
      where += ` AND c.channel_type = $${paramIdx}`;
      queryParams.push(params.channel);
      paramIdx++;
    }

    if (params.dateFrom) {
      where += ` AND c.updated_at >= $${paramIdx}`;
      queryParams.push(params.dateFrom);
      paramIdx++;
    }

    if (params.dateTo) {
      where += ` AND c.updated_at <= $${paramIdx}`;
      queryParams.push(params.dateTo);
      paramIdx++;
    }

    if (params.escalated) {
      where += ` AND EXISTS (SELECT 1 FROM escalations e WHERE e.conversation_id = c.id AND e.status = 'pending')`;
    }

    let havingClause = '';
    if (params.hasLead) {
      havingClause = `HAVING cst.id IS NOT NULL`;
    }

    let workflowJoin = '';
    let workflowSelect = '';
    if (params.workflowState) {
      workflowJoin = `LEFT JOIN conversation_workflows cw ON cw.conversation_id = c.id`;
      where += ` AND cw.workflow_state = $${paramIdx}`;
      queryParams.push(params.workflowState);
      paramIdx++;
    }

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM conversations c
      LEFT JOIN customers cst ON cst.id = c.customer_id
      ${workflowJoin}
      ${where}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = countResult.rows[0].total;

    const dataQuery = `
      SELECT
        c.id, c.customer_id, c.status AS conversation_status, c.channel_type,
        c.created_at, c.updated_at,
        cst.name AS customer_name, cst.phone AS customer_phone, cst.email AS customer_email,
        cst.lifecycle_state,
        cw.workflow_type, cw.workflow_state,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
        EXISTS (SELECT 1 FROM escalations WHERE conversation_id = c.id AND status = 'pending') AS has_pending_escalation
      FROM conversations c
      LEFT JOIN customers cst ON cst.id = c.customer_id
      LEFT JOIN conversation_workflows cw ON cw.conversation_id = c.id
      ${where}
      ORDER BY c.updated_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    queryParams.push(limit, offset);

    const result = await pool.query(dataQuery, queryParams);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: result.rows,
      meta: { totalCount, totalPages, currentPage: page, limit },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: error.errors });
      return;
    }
    logger.error('Failed to load conversations', { route: 'Operate', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to load conversations' });
  }
}
```

**Step 2: Add route**

In `operational.routes.ts`, add:
```typescript
router.get('/operate/conversations', (req, res) => operationalController.getConversations(req, res));
```

**Step 3: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: 0 errors.

**Step 4: Verify route registration**

Check that the route is accessible:
```bash
cd backend && node -e "require('tsx').register(); const app = require('./src/app').app; console.log('Routes:', app._router.stack.filter(r => r.route).map(r => r.route.path))"
```

---

### Task 2: Backend — GET /api/operate/conversations/:id

**Files:**
- Modify: `backend/src/controllers/operational.controller.ts`
- Modify: `backend/src/routes/operational.routes.ts`

**Step 1: Add getConversationDetail method**

```typescript
async getConversationDetail(req: Request, res: Response): Promise<void> {
  try {
    const businessId = req.membership!.businessId;
    const { id } = req.params;

    // Verify conversation belongs to business
    const convResult = await pool.query(
      `SELECT c.*, cst.name AS customer_name, cst.phone AS customer_phone,
        cst.email AS customer_email, cst.lifecycle_state,
        cw.workflow_type, cw.workflow_state, cw.collected_data, cw.last_asked_field,
        cw.available_slots, cw.last_updated_at AS workflow_last_updated
      FROM conversations c
      LEFT JOIN customers cst ON cst.id = c.customer_id
      LEFT JOIN conversation_workflows cw ON cw.conversation_id = c.id
      WHERE c.id = $1 AND c.business_id = $2`,
      [id, businessId]
    );

    if (convResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    const conversation = convResult.rows[0];

    // Messages
    const messagesResult = await pool.query(
      `SELECT id, sender, content, metadata, created_at
      FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    // Linked appointment
    const appointmentResult = await pool.query(
      `SELECT a.id, a.appointment_time, a.status, a.notes, a.cancellation_reason,
        a.created_at, s.name AS service_name
      FROM appointments a
      LEFT JOIN services s ON s.id = a.service_id
      WHERE a.customer_id = $1 AND a.business_id = $2
      ORDER BY a.created_at DESC LIMIT 5`,
      [conversation.customer_id, businessId]
    );

    // Delivery records for messages in this conversation
    const deliveryResult = await pool.query(
      `SELECT md.id, md.message_id, md.channel_type, md.delivery_status,
        md.provider, md.failure_reason, md.created_at,
        m.sender, LEFT(m.content, 100) AS message_preview
      FROM message_deliveries md
      JOIN messages m ON m.id = md.message_id
      WHERE m.conversation_id = $1
      ORDER BY md.created_at DESC LIMIT 50`,
      [id]
    );

    res.json({
      success: true,
      data: {
        conversation: {
          id: conversation.id,
          customerId: conversation.customer_id,
          customerName: conversation.customer_name,
          customerPhone: conversation.customer_phone,
          customerEmail: conversation.customer_email,
          lifecycleState: conversation.lifecycle_state,
          status: conversation.status,
          channelType: conversation.channel_type,
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at,
        },
        messages: messagesResult.rows,
        workflow: conversation.workflow_type ? {
          workflowType: conversation.workflow_type,
          workflowState: conversation.workflow_state,
          collectedData: conversation.collected_data,
          lastAskedField: conversation.last_asked_field,
          availableSlots: conversation.available_slots,
          lastUpdatedAt: conversation.workflow_last_updated,
        } : null,
        appointments: appointmentResult.rows,
        deliveries: deliveryResult.rows,
      },
    });
  } catch (error: any) {
    logger.error('Failed to load conversation detail', { route: 'Operate', businessId: req.membership?.businessId, conversationId: req.params?.id, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to load conversation detail' });
  }
}
```

**Step 2: Add route**

```typescript
router.get('/operate/conversations/:id', (req, res) => operationalController.getConversationDetail(req, res));
```

**Step 3: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

---

### Task 3: Backend — GET /api/operate/deliveries/health + /failed

**Files:**
- Modify: `backend/src/controllers/operational.controller.ts`
- Modify: `backend/src/routes/operational.routes.ts`

**Step 1: Add getDeliveryHealth method**

```typescript
async getDeliveryHealth(req: Request, res: Response): Promise<void> {
  try {
    const businessId = req.membership!.businessId;

    const healthResult = await pool.query(`
      SELECT
        COUNT(*)::int AS total_deliveries,
        COUNT(*) FILTER (WHERE delivery_status = 'delivered' OR delivery_status = 'read')::int AS successful_deliveries,
        COUNT(*) FILTER (WHERE delivery_status = 'failed')::int AS failed_deliveries,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(COUNT(*) FILTER (WHERE delivery_status = 'delivered' OR delivery_status = 'read')::numeric / COUNT(*)::numeric * 100, 1)
          ELSE 0
        END AS delivery_rate,
        MAX(CASE WHEN delivery_status = 'failed' THEN created_at ELSE NULL END) AS last_failure_at
      FROM message_deliveries md
      JOIN messages m ON m.id = md.message_id
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.business_id = $1
    `, [businessId]);

    const channelResult = await pool.query(`
      SELECT
        md.channel_type,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE md.delivery_status = 'delivered' OR md.delivery_status = 'read')::int AS successful,
        COUNT(*) FILTER (WHERE md.delivery_status = 'failed')::int AS failed,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(COUNT(*) FILTER (WHERE md.delivery_status = 'delivered' OR md.delivery_status = 'read')::numeric / COUNT(*)::numeric * 100, 1)
          ELSE 0
        END AS rate
      FROM message_deliveries md
      JOIN messages m ON m.id = md.message_id
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.business_id = $1
      GROUP BY md.channel_type
    `, [businessId]);

    res.json({
      success: true,
      data: {
        summary: healthResult.rows[0],
        channelBreakdown: channelResult.rows,
      },
    });
  } catch (error: any) {
    logger.error('Failed to load delivery health', { route: 'Operate', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to load delivery health' });
  }
}
```

**Step 2: Add getFailedDeliveries method**

```typescript
async getFailedDeliveries(req: Request, res: Response): Promise<void> {
  try {
    const businessId = req.membership!.businessId;
    const schema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(25),
    });
    const { page, limit } = schema.parse(req.query);
    const offset = (page - 1) * limit;

    const countResult = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM message_deliveries md
      JOIN messages m ON m.id = md.message_id
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.business_id = $1 AND md.delivery_status = 'failed'
    `, [businessId]);

    const totalCount = countResult.rows[0].total;

    const result = await pool.query(`
      SELECT
        md.id, md.message_id, md.channel_type, md.delivery_status,
        md.provider, md.failure_reason, md.created_at,
        c.id AS conversation_id,
        LEFT(m.content, 200) AS message_preview
      FROM message_deliveries md
      JOIN messages m ON m.id = md.message_id
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.business_id = $1 AND md.delivery_status = 'failed'
      ORDER BY md.created_at DESC
      LIMIT $2 OFFSET $3
    `, [businessId, limit, offset]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: result.rows,
      meta: { totalCount, totalPages, currentPage: page, limit },
    });
  } catch (error: any) {
    logger.error('Failed to load failed deliveries', { route: 'Operate', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to load failed deliveries' });
  }
}
```

**Step 3: Add routes**

```typescript
router.get('/operate/deliveries/health', (req, res) => operationalController.getDeliveryHealth(req, res));
router.get('/operate/deliveries/failed', (req, res) => operationalController.getFailedDeliveries(req, res));
```

**Step 4: Verify TypeScript**

---

### Task 4: Backend — GET /api/operate/activity

**Files:**
- Modify: `backend/src/controllers/operational.controller.ts`
- Modify: `backend/src/routes/operational.routes.ts`

**Step 1: Add getActivity method**

```typescript
async getActivity(req: Request, res: Response): Promise<void> {
  try {
    const businessId = req.membership!.businessId;
    const schema = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(50),
    });
    const { limit } = schema.parse(req.query);

    const activities = await this.getRecentActivity(businessId, limit);

    res.json({
      success: true,
      data: activities.map((a: any) => ({
        eventType: a.event_type,
        occurredAt: a.occurred_at,
        description: a.description,
        customerId: a.customer_id,
        customerName: a.customer_name,
      })),
    });
  } catch (error: any) {
    logger.error('Failed to load activity', { route: 'Operate', businessId: req.membership?.businessId, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to load activity' });
  }
}
```

**Step 2: Add route**

```typescript
router.get('/operate/activity', (req, res) => operationalController.getActivity(req, res));
```

**Step 3: Verify TypeScript**

---

### Task 5: Backend — Founder endpoints (pilot/health, support/search, businesses/:id/health)

**Files:**
- Modify: `backend/src/controllers/founder.controller.ts`
- Modify: `backend/src/routes/founder.routes.ts`

**Step 1: Add getPilotHealth method**

```typescript
async getPilotHealth(req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query(`
      SELECT
        b.id, b.name, b.slug, b.status, b.created_at,
        COALESCE(conv_today.conversations, 0) AS conversations_today,
        COALESCE(leads_today.leads, 0) AS leads_today,
        COALESCE(appts_today.appointments, 0) AS appointments_today,
        COALESCE(pending_escs.escalations, 0) AS escalations,
        COALESCE(failed_dels.failed_deliveries, 0) AS failed_deliveries,
        COALESCE(delivery_stats.total_deliveries, 0) AS total_deliveries,
        CASE WHEN COALESCE(delivery_stats.total_deliveries, 0) > 0
          THEN ROUND(COALESCE(delivery_stats.successful, 0)::numeric / delivery_stats.total_deliveries::numeric * 100, 1)
          ELSE NULL
        END AS delivery_rate
      FROM businesses b
      LEFT JOIN (
        SELECT business_id, COUNT(*)::int AS conversations
        FROM conversations WHERE created_at::date = CURRENT_DATE
        GROUP BY business_id
      ) conv_today ON conv_today.business_id = b.id
      LEFT JOIN (
        SELECT business_id, COUNT(*)::int AS leads
        FROM customers WHERE created_at::date = CURRENT_DATE
        GROUP BY business_id
      ) leads_today ON leads_today.business_id = b.id
      LEFT JOIN (
        SELECT business_id, COUNT(*)::int AS appointments
        FROM appointments WHERE appointment_time::date = CURRENT_DATE
        GROUP BY business_id
      ) appts_today ON appts_today.business_id = b.id
      LEFT JOIN (
        SELECT business_id, COUNT(*)::int AS escalations
        FROM escalations WHERE status = 'pending'
        GROUP BY business_id
      ) pending_escs ON pending_escs.business_id = b.id
      LEFT JOIN (
        SELECT c.business_id,
          COUNT(*) FILTER (WHERE md.delivery_status = 'failed')::int AS failed_deliveries,
          COUNT(*)::int AS total_deliveries,
          COUNT(*) FILTER (WHERE md.delivery_status = 'delivered' OR md.delivery_status = 'read')::int AS successful
        FROM message_deliveries md
        JOIN messages m ON m.id = md.message_id
        JOIN conversations c ON c.id = m.conversation_id
        WHERE md.created_at > NOW() - INTERVAL '7 days'
        GROUP BY c.business_id
      ) delivery_stats ON delivery_stats.business_id = b.id
      ORDER BY b.created_at DESC
    `);

    const rows = result.rows.map((r: any) => ({
      ...r,
      riskLevel: !r.total_deliveries ? 'unknown'
        : r.failed_deliveries > 0 && r.delivery_rate < 80 ? 'critical'
        : r.escalations > 5 ? 'warning'
        : r.failed_deliveries > 0 ? 'warning'
        : 'healthy',
    }));

    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error('Failed to load pilot health', { route: 'Founder', error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to load pilot health' });
  }
}
```

**Step 2: Add supportSearch method**

```typescript
async supportSearch(req: Request, res: Response): Promise<void> {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q || q.length < 2) {
      res.json({ success: true, data: [] });
      return;
    }

    const searchTerm = `%${q}%`;

    // Search businesses
    const bizResult = await pool.query(`
      SELECT id, name, slug, 'business' AS entity_type
      FROM businesses WHERE name ILIKE $1 OR slug ILIKE $1
      LIMIT 5
    `, [searchTerm]);

    // Search customers (leads) — join with business for context
    const custResult = await pool.query(`
      SELECT c.id AS customer_id, c.name AS customer_name, c.phone, c.email,
        b.id AS business_id, b.name AS business_name, b.slug AS business_slug,
        c.lifecycle_state, 'lead' AS entity_type
      FROM customers c
      JOIN businesses b ON b.id = c.business_id
      WHERE c.name ILIKE $1 OR c.phone ILIKE $1 OR c.email ILIKE $1
      LIMIT 10
    `, [searchTerm]);

    // Search conversations by ID
    const convResult = await pool.query(`
      SELECT c.id AS conversation_id, c.channel_type, c.status AS conversation_status,
        cst.id AS customer_id, cst.name AS customer_name,
        b.id AS business_id, b.name AS business_name, b.slug AS business_slug,
        'conversation' AS entity_type
      FROM conversations c
      LEFT JOIN customers cst ON cst.id = c.customer_id
      JOIN businesses b ON b.id = c.business_id
      WHERE c.id::text ILIKE $1
      LIMIT 5
    `, [searchTerm]);

    // Search appointments by ID
    const apptResult = await pool.query(`
      SELECT a.id AS appointment_id, a.appointment_time, a.status AS appointment_status,
        cst.id AS customer_id, cst.name AS customer_name,
        b.id AS business_id, b.name AS business_name, b.slug AS business_slug,
        'appointment' AS entity_type
      FROM appointments a
      LEFT JOIN customers cst ON cst.id = a.customer_id
      JOIN businesses b ON b.id = a.business_id
      WHERE a.id::text ILIKE $1
      LIMIT 5
    `, [searchTerm]);

    res.json({
      success: true,
      data: {
        businesses: bizResult.rows,
        leads: custResult.rows,
        conversations: convResult.rows,
        appointments: apptResult.rows,
      },
    });
  } catch (error: any) {
    logger.error('Failed to search', { route: 'Founder', query: req.query.q, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to search' });
  }
}
```

**Step 3: Add getBusinessHealth method**

```typescript
async getBusinessHealth(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Business info
    const bizResult = await pool.query(`
      SELECT b.id, b.name, b.slug, b.status, b.business_type, b.phone, b.email,
        b.timezone, b.created_at,
        sp.full_name AS owner_name, p.email AS owner_email
      FROM businesses b
      LEFT JOIN staff_profiles sp ON sp.business_id = b.id AND sp.role = 'owner'
      LEFT JOIN profiles p ON p.id = sp.user_id
      WHERE b.id = $1
    `, [id]);

    if (bizResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Business not found' });
      return;
    }

    // Today's metrics
    const todayResult = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM conversations WHERE business_id = $1 AND created_at::date = CURRENT_DATE) AS conversations_today,
        (SELECT COUNT(*)::int FROM customers WHERE business_id = $1 AND created_at::date = CURRENT_DATE) AS leads_today,
        (SELECT COUNT(*)::int FROM appointments WHERE business_id = $1 AND appointment_time::date = CURRENT_DATE) AS appointments_today,
        (SELECT COUNT(*)::int FROM escalations WHERE business_id = $1 AND status = 'pending') AS pending_escalations,
        (SELECT COUNT(*)::int FROM escalations WHERE business_id = $1) AS total_escalations
    `, [id]);

    // Delivery health
    const deliveryResult = await pool.query(`
      SELECT
        COUNT(*)::int AS total_deliveries,
        COUNT(*) FILTER (WHERE md.delivery_status = 'failed')::int AS failed_deliveries,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(COUNT(*) FILTER (WHERE md.delivery_status = 'delivered' OR md.delivery_status = 'read')::numeric / COUNT(*)::numeric * 100, 1)
          ELSE NULL
        END AS delivery_rate
      FROM message_deliveries md
      JOIN messages m ON m.id = md.message_id
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.business_id = $1 AND md.created_at > NOW() - INTERVAL '7 days'
    `, [id]);

    // Recent activity
    const recentActivity = await pool.query(`
      SELECT event_type, occurred_at, description
      FROM (
        SELECT 'lead_created' AS event_type, created_at AS occurred_at,
          'Lead: ' || COALESCE(name, 'Unknown') AS description
        FROM customers WHERE business_id = $1 AND created_at > NOW() - INTERVAL '7 days'
        UNION ALL
        SELECT 'appointment_created', created_at,
          'Appointment ' || status, NULL
        FROM appointments WHERE business_id = $1 AND created_at > NOW() - INTERVAL '7 days'
        UNION ALL
        SELECT 'escalation_raised', created_at,
          'Escalation: ' || LEFT(reason, 80)
        FROM escalations WHERE business_id = $1 AND created_at > NOW() - INTERVAL '7 days'
      ) AS activity
      ORDER BY occurred_at DESC LIMIT 20
    `, [id]);

    res.json({
      success: true,
      data: {
        business: bizResult.rows[0],
        today: todayResult.rows[0],
        delivery: deliveryResult.rows[0],
        recentActivity: recentActivity.rows,
      },
    });
  } catch (error: any) {
    logger.error('Failed to load business health', { route: 'Founder', businessId: req.params?.id, error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to load business health' });
  }
}
```

**Step 4: Add routes**

```typescript
founderRouter.get('/pilot/health', (req, res) => founderController.getPilotHealth(req, res));
founderRouter.get('/support/search', (req, res) => founderController.supportSearch(req, res));
founderRouter.get('/businesses/:id/health', (req, res) => founderController.getBusinessHealth(req, res));
```

**Step 5: Verify TypeScript**

---

### Task 6: Frontend — Conversation List Page

**Files:**
- Create: `frontend/src/app/[businessSlug]/admin/conversations/page.tsx`
- Modify: `frontend/src/components/admin/sidebar.tsx`
- Modify: `frontend/src/lib/api/ops.ts`

**Step 1: Add getConversations to ops.ts**

```typescript
export async function getConversations(params?: {
  search?: string;
  channel?: string;
  workflowState?: string;
  escalated?: boolean;
  hasLead?: boolean;
  hasAppointment?: boolean;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.channel) q.set('channel', params.channel);
  if (params?.workflowState) q.set('workflowState', params.workflowState);
  if (params?.escalated) q.set('escalated', 'true');
  if (params?.hasLead) q.set('hasLead', 'true');
  if (params?.hasAppointment) q.set('hasAppointment', 'true');
  if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
  if (params?.dateTo) q.set('dateTo', params.dateTo);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return opsFetch(`/operate/conversations${qs ? `?${qs}` : ''}`);
}

export async function getConversationDetail(id: string) {
  return opsFetch(`/operate/conversations/${id}`);
}
```

**Step 2: Create conversations page**

Key patterns:
- 'use client'
- useParams, useState, useEffect, useCallback
- Use PageHeader, DataTable, StatusBadge
- Search input, channel filter, status filter
- Columns: Customer, Channel, Last Message, Last Activity, Workflow State, Badges
- Rows link to conversation detail page
- Loading skeleton, empty state, error state

**Step 3: Add nav item to AdminSidebar**

Add to NAV_ITEMS:
```typescript
{ label: 'Conversations', href: '/conversations', icon: MessageSquare },
```

Import `MessageSquare` from `lucide-react`.

**Step 4: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

---

### Task 7: Frontend — Conversation Detail Page

**Files:**
- Create: `frontend/src/app/[businessSlug]/admin/conversations/[id]/page.tsx`

This is the primary debugging screen. Sections:
1. Conversation header (customer, channel, timestamps)
2. Messages thread (chronological, sender badges)
3. Workflow State card (type, state, collected data, missing fields)
4. Lead card (linked lead, lifecycle state)
5. Appointments card (linked appointments with status)
6. Delivery Records card (provider, status, error, timestamp)

Use Section component for each section. Use StatusBadge for statuses. Use Skeleton for loading. Use EmptyState for empty sections.

---

### Task 8: Frontend — Escalation Center Enhancement

**Files:**
- Modify: `frontend/src/app/[businessSlug]/admin/escalations/page.tsx`

Changes:
- Replace raw table with DataTable component
- Add search input
- Show customer phone and conversation link
- Add loading skeleton, error state, empty state
- Keep resolve functionality

---

### Task 9: Frontend — Delivery Health Page

**Files:**
- Create: `frontend/src/app/[businessSlug]/admin/deliveries/page.tsx`
- Modify: `frontend/src/lib/api/ops.ts`
- Modify: `frontend/src/components/admin/sidebar.tsx`

**Step 1: Add API functions**

```typescript
export async function getDeliveryHealth() {
  return opsFetch('/operate/deliveries/health');
}

export async function getFailedDeliveries(params?: { page?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return opsFetch(`/operate/deliveries/failed${qs ? `?${qs}` : ''}`);
}
```

**Step 2: Create deliveries page**

Sections:
1. MetricCards row: Total Deliveries, Successful, Failed, Delivery Rate
2. Channel Breakdown section (Web Chat, WhatsApp)
3. Failed Deliveries table with DataTable (provider, error, timestamp, conversation link)

**Step 3: Add nav item to AdminSidebar**

```typescript
{ label: 'Deliveries', href: '/deliveries', icon: Activity },
```

Import `Activity` from `lucide-react`.

---

### Task 10: Frontend — Audit Trail Page

**Files:**
- Create: `frontend/src/app/[businessSlug]/admin/activity/page.tsx`
- Modify: `frontend/src/lib/api/ops.ts`
- Modify: `frontend/src/components/admin/sidebar.tsx`

**Step 1: Add API function**

```typescript
export async function getActivity(params?: { limit?: number }) {
  const q = new URLSearchParams();
  if (params?.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return opsFetch(`/operate/activity${qs ? `?${qs}` : ''}`);
}
```

**Step 2: Create activity page**

List of events with icon per type, timestamp, description.

**Step 3: Add nav item to AdminSidebar**

```typescript
{ label: 'Activity', href: '/activity', icon: ActivitySquare },
```

Import `ActivitySquare` from `lucide-react`.

---

### Task 11: Frontend — Founder Pages (Pilot Health + Support Search)

**Files:**
- Create: `frontend/src/app/ops/pilot/page.tsx`
- Create: `frontend/src/app/ops/support/page.tsx`
- Modify: `frontend/src/components/founder/sidebar.tsx`
- Modify: `frontend/src/lib/api/founder.ts`

**Step 1: Add founder API functions**

```typescript
export async function getPilotHealth() {
  return founderFetcher(founderUrl('/ops/pilot/health'));
}

export async function supportSearch(q: string) {
  return founderFetcher(founderUrl(`/ops/support/search?q=${encodeURIComponent(q)}`));
}

export async function getBusinessHealth(id: string) {
  return founderFetcher(founderUrl(`/ops/businesses/${id}/health`));
}
```

**Step 2: Create pilot health page**

Table per business with: name, conversations today, leads today, appointments today, escalations, failed deliveries, delivery rate, risk indicator.

**Step 3: Create support search page**

Search input + results grouped by entity type (businesses, leads, conversations, appointments). Each result links to the detail page.

**Step 4: Update FounderSidebar**

Add nav items:
```typescript
{ label: 'Pilot Health', href: '/ops/pilot', icon: HeartPulse },
{ label: 'Support', href: '/ops/support', icon: Search },
```

Import `HeartPulse`, `Search` from `lucide-react`.

---

### Task 12: Frontend — Business Health View

**Files:**
- Create: `frontend/src/app/ops/businesses/[id]/health/page.tsx`
- Modify: `frontend/src/lib/api/founder.ts` (getBusinessHealth added above)

Single-page operational overview:
1. Business info card (name, type, status, owner, contacts)
2. Today's metrics row (MetricCards: conversations, leads, appointments, escalations)
3. Delivery health card
4. Recent activity list

---

### Task 13: Security Verification

Verify tenant isolation:
- Business owners only see their own data (the `/operate/*` endpoints use `req.membership!.businessId`)
- Founder can see all businesses (the `/ops/*` endpoints have `requireSuperAdmin`)
- No cross-tenant leakage (all queries are scoped by `business_id = $1`)

Document in report.

---

### Task 14: Regression Verification

Re-verify core functionality:
- Website Chat → POST /api/chat
- WhatsApp webhooks
- Booking flow
- Workflow engine
- Lead capture
- Analytics endpoints
- Founder OS pages
- Legal pages
- Turnstile

Document in report.

---

### Task 15: Write docs/pilot-operations-readiness-report.md

Include all 13 sections from deliverables.

Final verdict: READY FOR PILOT OPERATIONS or NOT READY.
