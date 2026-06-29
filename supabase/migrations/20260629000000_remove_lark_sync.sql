-- ============================================================================
-- Remove Lark sync integration
-- ============================================================================
--
-- Lark Base is no longer an operational source of truth. Application behavior
-- depends on Postgres data and the in-app admin dashboard. This migration
-- removes the database trigger/function side effects for environments where the
-- older Lark sync migration was already applied.

DROP TRIGGER IF EXISTS trigger_lark_sync_visits ON visits;
DROP FUNCTION IF EXISTS notify_lark_sync();
