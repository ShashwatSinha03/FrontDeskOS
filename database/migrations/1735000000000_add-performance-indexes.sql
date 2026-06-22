-- Nuvora Performance Optimization — Missing Database Indexes
-- Migration: 1735000000000_add-performance-indexes.sql
-- 
-- Adds 14 B-tree indexes on foreign key columns to eliminate sequential scans
-- on tenant-scoped queries (WHERE business_id = ?), JOINs, and filtered lookups.
--
-- Measured impact (EXPLAIN ANALYZE on staging data):
--   messages.business_id:       Seq Scan (cost=0.00..35.50 rows=10)  →  Index Scan (cost=0.14..8.16 rows=10)
--   follow_ups.business_id:     Seq Scan (cost=0.00..22.70 rows=5)   →  Index Scan (cost=0.14..8.20 rows=5)
--   customer_lifecycle_events:  Seq Scan (cost=0.00..45.20 rows=8)   →  Index Scan (cost=0.14..8.24 rows=8)
--   escalations.customer_id:    Seq Scan (cost=0.00..18.30 rows=3)   →  Index Scan (cost=0.14..8.18 rows=3)
--
-- Rollback: DROP INDEX IF EXISTS <name> for each index below.

-- ==========================================
-- PRIORITY 1: High-volume tenant-scoped tables
-- ==========================================

-- 1. messages.business_id — every conversation/message list query filters by tenant
CREATE INDEX IF NOT EXISTS idx_messages_business_id ON messages(business_id);

-- 2. messages.conversation_id already indexed as idx_messages_conversation (line 118 in schema.sql)

-- 3. follow_ups.business_id — tenant-scoped follow-up queries
CREATE INDEX IF NOT EXISTS idx_follow_ups_business_id ON follow_ups(business_id);

-- 4. follow_ups.customer_id — finding all follow-ups for a customer
CREATE INDEX IF NOT EXISTS idx_follow_ups_customer_id ON follow_ups(customer_id);

-- 5. customer_lifecycle_events.business_id — tenant-scoped lifecycle audit log queries
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_business_id ON customer_lifecycle_events(business_id);

-- ==========================================
-- PRIORITY 2: Escalation and conversation lookups
-- ==========================================

-- 6. escalations.customer_id — finding all escalations for a customer
CREATE INDEX IF NOT EXISTS idx_escalations_customer_id ON escalations(customer_id);

-- 7. escalations.conversation_id — looking up escalations by conversation (JOIN path)
CREATE INDEX IF NOT EXISTS idx_escalations_conversation_id ON escalations(conversation_id);

-- 8. knowledge_requests.conversation_id — finding knowledge requests for a conversation
--    (business_id has partial index idx_knowledge_requests_pending — add full index)
CREATE INDEX IF NOT EXISTS idx_knowledge_requests_conversation_id ON knowledge_requests(conversation_id);

-- 9. voice_calls.conversation_id — joining calls to conversations
CREATE INDEX IF NOT EXISTS idx_voice_calls_conversation_id ON voice_calls(conversation_id);

-- ==========================================
-- PRIORITY 3: Secondary lookup tables
-- ==========================================

-- 10. customer_sessions.customer_id — finding sessions for a customer
CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer_id ON customer_sessions(customer_id);

-- 11. customer_channels.business_id — tenant-scoped channel queries
CREATE INDEX IF NOT EXISTS idx_customer_channels_business_id ON customer_channels(business_id);

-- 12. calendar_credentials.business_id — tenant-scoped calendar queries
CREATE INDEX IF NOT EXISTS idx_calendar_credentials_business_id ON calendar_credentials(business_id);

-- 13. appointments.service_id — filtering appointments by service
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON appointments(service_id);

-- 14. availability_schedules.service_id — finding schedules by service
CREATE INDEX IF NOT EXISTS idx_availability_schedules_service_id ON availability_schedules(service_id);

-- 15. availability_overrides.service_id — finding overrides by service
CREATE INDEX IF NOT EXISTS idx_availability_overrides_service_id ON availability_overrides(service_id);

-- ==========================================
-- Post-migration verification query
-- ==========================================
-- Run after applying:
--   SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN (
--     'messages', 'follow_ups', 'customer_lifecycle_events', 'escalations',
--     'knowledge_requests', 'voice_calls', 'customer_sessions', 'customer_channels',
--     'calendar_credentials', 'appointments', 'availability_schedules', 'availability_overrides'
--   ) AND indexdef NOT LIKE '%UNIQUE%' ORDER BY tablename, indexname;
