# Admin Dashboard + AI Learning Inbox — Implementation Plan

> **For Claude:** Use subagent-driven-development to implement task-by-task.

**Goal:** Build a functional admin dashboard with 6 pages (Dashboard, Leads, Appointments, Follow-Ups, Escalations, Learning Inbox) and a shared sidebar layout.

**Architecture:** Admin pages at `/{slug}/admin/*` under the existing tenant routing. Client-side data fetching with SWR. Shared DataTable component for all list views.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS v4, shadcn/ui, SWR, Express.js (backend)

---

### Task 1: Backend — Conversation messages endpoint

**Files:**
- Modify: `backend/src/routes/api.routes.ts`

Add route:
```typescript
router.get('/conversations/:id/messages', (req, res) => conversationController.getMessages(req, res));
```

Create `backend/src/controllers/conversation.controller.ts`:
```typescript
import { Request, Response } from 'express';
import { conversationRepository } from '../repositories';

export class ConversationController {
  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const messages = await conversationRepository.getMessages(id);
      res.status(200).json({ success: true, data: messages });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const conversationController = new ConversationController();
```

Import and use in api.routes.ts.

---

### Task 2: Frontend — Missing API functions + Admin layout + Sidebar

**Files:**
- Modify: `frontend/src/lib/api.ts` — add fetchDashboardSummary, fetchAppointments, fetchFollowUps, fetchConversationMessages; enhance fetchKnowledgeRequests, fetchEscalations, fetchLeads
- Create: `frontend/src/app/[businessSlug]/admin/layout.tsx`
- Create: `frontend/src/components/admin/sidebar.tsx`

**API additions:**
```typescript
fetchDashboardSummary(businessId): Promise<ApiResponse<DashboardSummary>>
fetchAppointments(businessId, filters?): Promise<ApiResponse<Appointment[]>>
fetchFollowUps(businessId, filters?): Promise<ApiResponse<FollowUp[]>>
fetchConversationMessages(conversationId): Promise<ApiResponse<Message[]>>
```

**Admin layout:** Server component that fetches business data, renders sidebar + main content.

**Sidebar:** Client component with lucide icons, 6 nav links, active state via usePathname().

---

### Task 3: Frontend — DataTable component + Dashboard page

**Files:**
- Create: `frontend/src/components/admin/data-table.tsx`
- Create: `frontend/src/app/[businessSlug]/admin/page.tsx`

**DataTable:** Reusable with columns config, pagination, loading/empty/error states.

**Dashboard:** 4 summary cards from dashboard/summary API.

---

### Task 4: Frontend — Leads + Appointments pages

**Files:**
- Create: `frontend/src/app/[businessSlug]/admin/leads/page.tsx`
- Create: `frontend/src/app/[businessSlug]/admin/appointments/page.tsx`

Both use DataTable with appropriate columns and status filter dropdowns.

---

### Task 5: Frontend — Follow-Ups + Escalations pages

**Files:**
- Create: `frontend/src/app/[businessSlug]/admin/follow-ups/page.tsx`
- Create: `frontend/src/app/[businessSlug]/admin/escalations/page.tsx`

Use DataTable with status filters.

---

### Task 6: Frontend — Learning Inbox page + detail panel

**Files:**
- Create: `frontend/src/app/[businessSlug]/admin/learning-inbox/page.tsx`
- Create: `frontend/src/components/admin/learning-inbox-detail.tsx`

**Learning Inbox:** Split view — table on left, detail panel on right (or stacked on mobile). Status filter tabs (All/Pending/Approved/Rejected).

**Detail panel:** Shows question, editable suggested answer textarea, conversation transcript, Approve/Reject buttons.
