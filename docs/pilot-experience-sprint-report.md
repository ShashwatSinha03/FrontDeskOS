# Pilot Experience Sprint Report

## Date
2026-06-18

## Summary
Implemented the Human Escalation Inbox and Mobile & PWA Readiness for the Nuvora pilot.

## Changes

### Schema Migration
- `backend/migrations/1732000000000_add-conversation-ownership.ts`
  - Added `conversation_ownership` enum type (`ai_active`, `human_pending`, `human_active`, `returned_to_ai`)
  - Added `ownership_status`, `human_owner_id`, `escalated_at`, `assigned_at` columns to `conversations`
  - Added indexes on `ownership_status` and `human_owner_id`

### Backend Types
- Added `ConversationOwnershipStatus` type to `backend/src/types/index.ts`
- Updated `Conversation` interface with ownership fields

### Backend Repository
- `backend/src/repositories/conversation.repository.ts`:
  - `findById()` — new method to fetch a single conversation
  - `updateOwnershipStatus()` — transitions ownership with side-effects (timestamps, owner assignment)
  - `findByOwnershipStatus()` — query conversations by ownership filter
  - `getInboxConversations()` — full inbox query with customer info, last message, escalation reason, owner name, sorted by priority (pending > active > returned)
  - `getInboxCounts()` — returns `humanPending` and `humanActive` counts for badge display
- `backend/src/repositories/escalation.repository.ts`:
  - `resolveForConversation()` — resolves all pending escalations for a given conversation

### Backend Controller
- `backend/src/controllers/inbox.controller.ts` — new controller with endpoints:
  - `GET /api/inbox/conversations` — list inbox conversations with filtering
  - `GET /api/inbox/counts` — pending/active counts for badges
  - `POST /api/inbox/conversations/:conversationId/join` — staff joins conversation
  - `POST /api/inbox/conversations/:conversationId/return-to-ai` — release back to AI
  - `POST /api/inbox/conversations/:conversationId/message` — send message as human owner

### Backend Routes
- `backend/src/routes/inbox.routes.ts` — new routes with auth middleware
- `backend/src/app.ts` — registered inbox routes at `/api`

### Chat Service
- `backend/src/services/chat.service.ts`:
  - Added ownership bypass: if conversation is `human_pending` or `human_active`, the AI is skipped and a hold message is sent
  - On escalation detection (`escalationId` present), automatically sets ownership to `human_pending` and creates dashboard notification

### Frontend API
- `frontend/src/lib/api/ops.ts` — added `getInboxConversations()`, `getInboxCounts()`, `joinInboxConversation()`, `returnInboxToAI()`, `sendInboxMessage()`

### Frontend Pages
- `frontend/src/app/[businessSlug]/admin/inbox/page.tsx` — inbox list with tab navigation (Waiting / Active / Returned to AI), search, counts badge on tabs, pagination
- `frontend/src/app/[businessSlug]/admin/inbox/[conversationId]/page.tsx` — conversation workspace with message history, Join/ReturnToAI buttons, ownership status badge, send message input

### Frontend Sidebar
- `frontend/src/components/admin/sidebar.tsx` — added Inbox nav item with real-time pending count badge (polls every 30s)
- `frontend/src/components/admin/mobile-sidebar.tsx` — new Sheet-based mobile sidebar using Radix UI Sheet, with same nav items and inbox badge
- `frontend/src/app/[businessSlug]/admin/layout.tsx` — integrated MobileSidebar in header (visible on mobile, hidden on md+)

### PWA
- `frontend/public/icon-512.svg` — 512x512 icon for PWA manifest
- `frontend/src/app/manifest.json/route.ts` — web app manifest route handler
- `frontend/src/app/layout.tsx` — added `manifest` metadata link and `viewport` export (device-width, initial-scale, theme-color)

## Verification
- `npx tsc --noEmit` passed on both frontend and backend with zero errors.

## Files Changed
```
NEW: backend/migrations/1732000000000_add-conversation-ownership.ts
NEW: backend/src/controllers/inbox.controller.ts
NEW: backend/src/routes/inbox.routes.ts
NEW: frontend/public/icon-512.svg
NEW: frontend/src/app/manifest.json/route.ts
NEW: frontend/src/app/[businessSlug]/admin/inbox/page.tsx
NEW: frontend/src/app/[businessSlug]/admin/inbox/[conversationId]/page.tsx
NEW: frontend/src/components/admin/mobile-sidebar.tsx
MOD: backend/src/types/index.ts
MOD: backend/src/repositories/conversation.repository.ts
MOD: backend/src/repositories/escalation.repository.ts
MOD: backend/src/services/chat.service.ts
MOD: backend/src/app.ts
MOD: frontend/src/lib/api/ops.ts
MOD: frontend/src/components/admin/sidebar.tsx
MOD: frontend/src/app/layout.tsx
MOD: frontend/src/app/[businessSlug]/admin/layout.tsx
```

## Key Design Decisions
- Ownership is tracked on `conversations` (not `escalations`) so the AI bypass is a single status check
- `human_pending` triggers a dashboard notification and shows in the "Waiting" tab
- `human_active` allows the staff member to send messages through the same delivery pipeline
- `returned_to_ai` releases the conversation back to the AI agent
- Mobile sidebar uses the existing `Sheet` component (Radix UI) — no new dependencies
- PWA uses Next.js metadata API + route handler — no external PWA packages
