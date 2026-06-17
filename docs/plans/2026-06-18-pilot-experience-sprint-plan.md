# Pilot Experience Sprint Plan

## Overview
Two workstreams:
1. Human Escalation Inbox
2. Mobile & PWA Readiness

## Architecture Decisions

### Conversation Ownership
Add to `conversations` table:
- `ownership_status` VARCHAR(50) DEFAULT 'ai_active'
  - Values: `ai_active`, `human_pending`, `human_active`, `returned_to_ai`
- `human_owner_id` UUID NULL (REFERENCES staff_profiles)
- `escalated_at` TIMESTAMPTZ NULL
- `assigned_at` TIMESTAMPTZ NULL

### Escalation Inbox (new concept)
Not replacing existing `escalations` table. The inbox queries conversations by `ownership_status` and joins with escalations, customers, messages. It's a **view/layer** over existing tables, not a new table.

### Message Flow
Existing `human_owner` sender type in messages table already exists. Owner messages route through the same `deliveryService.sendMessage()` pipeline.

### PWA
Use Next.js metadata API for manifest (no external packages). Generate 512x512 icon. Add viewport export.

### Mobile Nav
Use existing `Sheet` component for mobile sidebar drawer.

## Execution Order
1. Backend: conversation ownership schema migration + repository
2. Backend: escalation detection + human messaging API
3. Frontend: inbox page + conversation workspace
4. Mobile & PWA: manifest, viewport, mobile nav, responsive fixes
5. Security verification + regression testing
6. Report
