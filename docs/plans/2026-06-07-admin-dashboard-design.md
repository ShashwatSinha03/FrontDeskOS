# Admin Dashboard + AI Learning Inbox — Design Document

## Architecture

- **Location**: `/{businessSlug}/admin/*` — shares the same subdomain-based tenant routing as the customer site
- **Rendering**: Client-side data fetching with SWR (simple table views, no SSR needed for admin)
- **Style**: Same Tailwind v4 + shadcn/ui — functional, not decorative
- **No auth gate** — admin pages accessible by URL for local dev; auth can be added later

## Backend Addition

### New endpoint: Conversation messages

`GET /api/conversations/:id/messages` uses existing `conversationRepository.getMessages()` to return the full transcript for a conversation. Needed so the Learning Inbox can show the owner the conversation context that led to an unknown question.

### Existing endpoints used

| Page | Endpoint | Filters |
|---|---|---|
| Dashboard | `GET /api/dashboard/summary` | businessId |
| Leads | `GET /api/leads` | businessId, state, search, page, limit |
| Appointments | `GET /api/appointments` | businessId, status, startDate, endDate, page, limit |
| Follow-Ups | `GET /api/follow-ups` | businessId, status, type, page, limit |
| Escalations | `GET /api/escalations` | businessId, status, page, limit |
| Learning Inbox | `GET /api/knowledge-base/requests` | businessId, status, page, limit |
| Learning Inbox detail | `GET /api/conversations/:id/messages` | — |

## Frontend Structure

```
src/app/[businessSlug]/admin/
├── layout.tsx              # Server: fetch business → render sidebar + children
├── page.tsx                # Dashboard: summary cards
├── leads/page.tsx          # Customer table
├── appointments/page.tsx   # Appointment table
├── follow-ups/page.tsx     # Follow-up table
├── escalations/page.tsx    # Escalation table
└── learning-inbox/
    └── page.tsx            # Knowledge requests + detail panel

src/components/admin/
├── sidebar.tsx             # Vertical nav with 6 links + active highlighting
├── data-table.tsx          # Reusable: columns config, pagination, loading/empty/error
└── learning-inbox-detail.tsx  # Detail panel: question, suggested answer, conversation transcript, approve/reject
```

## Component Details

### AdminLayout
- Server component that fetches business data by slug
- Renders sidebar (fixed width) + main scrollable content area
- Passes businessId to children via context or a simple prop-based pattern

### Sidebar
- Vertical nav: 6 items with icons (lucide-react)
- Active link highlighted based on `usePathname()`
- Collapsible on mobile (hamburger toggle)

### DataTable
- Props: `columns: Column[]`, `data: any[]`, `totalCount`, `page`, `limit`, `onPageChange`, `isLoading`, `error`
- Column config: `{ key: string, label: string, render?: (value, row) => ReactNode }`
- States: loading (5 skeleton rows), empty (centered message), error (message + retry button)
- Pagination: prev/next buttons with page indicator

### Dashboard Page
- Grid of 4 summary cards from `/api/dashboard/summary`:
  - Total Leads
  - Pending Escalations
  - Pending Knowledge Requests
  - Appointments Today
- Each card: icon, label, count number

### Learning Inbox Page
- Split view: table on left (or top on mobile), detail panel on right
- Table: question text, status badge, created date, suggested answer preview
- Detail panel (opens on row click): full question, editable suggested answer textarea, conversation transcript, Approve/Reject buttons
- Approve: sends answer text → POST `/api/knowledge-base/requests/:id/approve` → request moves to approved
- Reject: POST `/api/knowledge-base/requests/:id/reject` → request moves to rejected
- Status filter tabs: All / Pending / Approved / Rejected

### Other Pages (Leads, Appointments, Follow-Ups, Escalations)
- Simple table with relevant columns
- Status filter dropdown/buttons at top
- Pagination at bottom
- No detail/edit functionality (just viewing)

## API Enhancements

```typescript
// New API functions needed in api.ts:
fetchDashboardSummary(businessId)
fetchAppointments(businessId, filters?)
fetchFollowUps(businessId, filters?)
fetchConversationMessages(conversationId)

// Enhance existing:
fetchKnowledgeRequests(businessId, status?, page?, limit?)
fetchEscalations(businessId, status?)
fetchLeads(businessId, state?, search?, page?, limit?)
```

## States

All components handle:
- **Loading**: skeleton rows/spinner
- **Empty**: "No [items] found" with helpful message
- **Error**: error message + "Try again" button
- **Success**: normal data display

## Post-Implementation Verification

- Backend: `npx tsc --noEmit` passes
- Frontend: `npx next build` succeeds
- All 6 admin routes resolve without error
