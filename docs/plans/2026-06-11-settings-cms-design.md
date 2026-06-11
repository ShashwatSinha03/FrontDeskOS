# Business Control Center — Architecture Design

**Date:** 2026-06-11
**Status:** Approved

## Goal

Allow business owners to independently manage business configuration (profile, services, hours, FAQs, AI behavior, team) without founder involvement.

## Core Principle

Configuration management only. Every change affects website, booking, AI, or escalation immediately. No business logic rewrites.

## Data Storage Decisions

- **AI greeting**: Stored in `businesses.appointment_settings` JSONB (no new column)
- **Services pricing**: Single price input stored as `price_min = price_max`
- **Services soft-delete**: New `is_active` column on services table

## Backend Architecture

### New files
- `database/migrations/006_services_add_is_active.sql`
- `backend/src/controllers/settings.controller.ts`
- `backend/src/routes/settings.routes.ts`

### Mount point
`/api/admin/settings/*` with middleware:
```
authenticate → loadProfile → loadMembership → requireBusinessRole('owner', 'manager', 'staff')
```
Editing endpoints enforce `['owner', 'manager']` additionally.

### Endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | /api/admin/settings/business | owner/manager/staff | Read business profile |
| PATCH | /api/admin/settings/business | owner/manager | Update business profile |
| GET | /api/admin/settings/services | owner/manager/staff | List services |
| POST | /api/admin/settings/services | owner/manager | Create service |
| PATCH | /api/admin/settings/services/:id | owner/manager | Update service |
| DELETE | /api/admin/settings/services/:id | owner/manager | Soft-delete service |
| GET | /api/admin/settings/hours | owner/manager/staff | Get hours + overrides |
| PATCH | /api/admin/settings/hours | owner/manager | Update hours (UPSERT) |
| GET | /api/admin/settings/faqs | owner/manager/staff | Get FAQs |
| PATCH | /api/admin/settings/faqs | owner/manager | Replace FAQs |
| GET | /api/admin/settings/ai | owner/manager/staff | Get AI settings |
| PATCH | /api/admin/settings/ai | owner/manager | Update AI settings |
| POST | /api/admin/settings/preview-chat | owner/manager | Preview AI chat (read-only) |

## Frontend Architecture

### New/modified files
- `frontend/src/app/[businessSlug]/admin/settings/page.tsx` — tabbed settings page
- `frontend/src/components/admin/sidebar.tsx` — update Team link to point to `/settings`

### Tab navigation
URL-based: `?tab=business|services|hours|faqs|ai|team`

### Component usage
Use existing UI components: Card, Input, Select, Button, Badge, Dialog, EmptyState.

## Migration

```sql
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
```

## Verification

- Business: edit → website reflects
- Services: create/edit/disable → booking reflects
- Hours: update → booking slots update
- FAQs: add/edit → AI uses new answers
- AI: change greeting → live chat reflects
- Team: invite/change role/suspend
- Permissions: Owner/Manager can edit, Staff cannot
