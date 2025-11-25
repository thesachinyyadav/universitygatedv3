-- ============================================
-- DATABASE CLEANUP & MAINTENANCE SCRIPT
-- Christ University Gated Access System
-- Date: November 25, 2025
-- ============================================

-- IMPORTANT: Review each section before running
-- Run these queries in your Supabase SQL Editor

-- ============================================
-- SECTION 1: REMOVE UNUSED COLUMNS
-- ============================================

-- Remove companions_inside column (we simplified to only use accompanying_count)
ALTER TABLE visitors 
DROP COLUMN IF EXISTS companions_inside CASCADE;

-- Remove verified_by, verified_at from visitors table
-- (Verification is now tracked in verification_history table)
ALTER TABLE visitors 
DROP COLUMN IF EXISTS verified_by CASCADE;

ALTER TABLE visitors 
DROP COLUMN IF EXISTS verified_at CASCADE;

-- Remove verification_count and last_verified_at from visitors
-- (All verification tracking moved to verification_history table)
ALTER TABLE visitors 
DROP COLUMN IF EXISTS verification_count CASCADE;

ALTER TABLE visitors 
DROP COLUMN IF EXISTS last_verified_at CASCADE;

-- ============================================
-- SECTION 2: REMOVE UNUSED TABLES
-- ============================================

-- Drop arrival_log table (not being used in current implementation)
-- Comment this out if you want to keep historical data
DROP TABLE IF EXISTS arrival_log CASCADE;

-- Drop system_logs table (not currently used for audit trail)
-- Comment this out if you want to keep audit logs
DROP TABLE IF EXISTS system_logs CASCADE;

-- ============================================
-- SECTION 3: CLEAN UP OLD DATA
-- ============================================

-- Delete visitors from past events (older than 90 days)
-- Uncomment to execute
-- DELETE FROM visitors 
-- WHERE date_of_visit_to < CURRENT_DATE - INTERVAL '90 days';

-- Delete old notifications (older than 30 days)
-- Uncomment to execute
-- DELETE FROM notifications 
-- WHERE created_at < NOW() - INTERVAL '30 days';

-- Delete verification history older than 90 days
-- Uncomment to execute
-- DELETE FROM verification_history 
-- WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete completed events older than 60 days
-- Uncomment to execute
-- DELETE FROM events 
-- WHERE status = 'completed' 
-- AND date_to < CURRENT_DATE - INTERVAL '60 days';

-- Delete rejected event requests older than 30 days
-- Uncomment to execute
-- DELETE FROM event_requests 
-- WHERE status = 'rejected' 
-- AND created_at < NOW() - INTERVAL '30 days';

-- ============================================
-- SECTION 4: DROP UNUSED TRIGGERS & FUNCTIONS
-- ============================================

-- Drop arrival log trigger (if arrival_log table is dropped)
DROP TRIGGER IF EXISTS log_arrival_trigger ON visitors;
DROP FUNCTION IF EXISTS log_arrival_changes();

-- ============================================
-- SECTION 5: REMOVE UNUSED INDEXES
-- ============================================

-- Drop indexes related to removed columns
DROP INDEX IF EXISTS idx_arrival_visitor;
DROP INDEX IF EXISTS idx_arrival_processed_by;
DROP INDEX IF EXISTS idx_arrival_date;
DROP INDEX IF EXISTS idx_arrival_action;

DROP INDEX IF EXISTS idx_system_logs_user;
DROP INDEX IF EXISTS idx_system_logs_date;

-- ============================================
-- SECTION 6: VACUUM AND ANALYZE
-- ============================================

-- NOTE: VACUUM cannot run inside a transaction block
-- You must run these commands SEPARATELY in Supabase SQL Editor
-- DO NOT run these with the rest of the script

-- Reclaim storage space and update statistics
-- Run after deleting large amounts of data
-- Copy and paste each command ONE AT A TIME:

-- VACUUM FULL visitors;
-- VACUUM FULL events;
-- VACUUM FULL event_requests;
-- VACUUM FULL notifications;
-- VACUUM FULL verification_history;

-- Update table statistics for better query planning
-- These can be run together or separately:
ANALYZE visitors;
ANALYZE events;
ANALYZE event_requests;
ANALYZE notifications;
ANALYZE verification_history;

-- ============================================
-- SECTION 7: VERIFICATION QUERIES
-- ============================================

-- Check remaining columns in visitors table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'visitors' 
ORDER BY ordinal_position;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Count records in each table
SELECT 'visitors' as table_name, COUNT(*) as record_count FROM visitors
UNION ALL
SELECT 'events', COUNT(*) FROM events
UNION ALL
SELECT 'event_requests', COUNT(*) FROM event_requests
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'verification_history', COUNT(*) FROM verification_history
UNION ALL
SELECT 'users', COUNT(*) FROM users;

-- ============================================
-- SECTION 8: BACKUP BEFORE CLEANUP
-- ============================================

-- Create backup tables before cleanup (optional but recommended)
-- Uncomment to create backups

-- CREATE TABLE visitors_backup_20251125 AS SELECT * FROM visitors;
-- CREATE TABLE events_backup_20251125 AS SELECT * FROM events;
-- CREATE TABLE event_requests_backup_20251125 AS SELECT * FROM event_requests;

-- ============================================
-- SECTION 9: DROP UNUSED VIEWS
-- ============================================

-- Drop daily_arrivals view (uses companions_inside which is removed)
DROP VIEW IF EXISTS daily_arrivals CASCADE;

-- Recreate daily_arrivals view without companions_inside
CREATE OR REPLACE VIEW daily_arrivals AS
SELECT 
    DATE(created_at) as visit_date,
    event_name,
    COUNT(*) as total_registered,
    COUNT(CASE WHEN has_arrived = true THEN 1 END) as total_arrived,
    SUM(accompanying_count) as total_companions_registered,
    COUNT(*) + SUM(accompanying_count) as total_people_registered,
    COUNT(CASE WHEN has_arrived = true THEN 1 END) + SUM(accompanying_count) as total_people_arrived,
    ROUND(
        (COUNT(CASE WHEN has_arrived = true THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
        2
    ) as arrival_percentage
FROM visitors
GROUP BY DATE(created_at), event_name
ORDER BY visit_date DESC;

-- Drop visitor_statistics view (uses removed columns)
DROP VIEW IF EXISTS visitor_statistics CASCADE;

-- Recreate visitor_statistics view without removed columns
CREATE OR REPLACE VIEW visitor_statistics AS
SELECT 
    visitor_category,
    COUNT(*) as total_visitors,
    COUNT(CASE WHEN has_arrived = true THEN 1 END) as arrived_count,
    SUM(accompanying_count) as total_companions_registered,
    COUNT(CASE WHEN has_arrived = true THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100 as arrival_rate
FROM visitors
GROUP BY visitor_category
ORDER BY total_visitors DESC;

-- Drop recent_verifications view (uses removed columns from visitors)
DROP VIEW IF EXISTS recent_verifications CASCADE;

-- Recreate recent_verifications view
CREATE OR REPLACE VIEW recent_verifications AS
SELECT 
    vh.id,
    vh.visitor_id,
    v.name as visitor_name,
    v.event_name,
    vh.verified_by,
    vh.verified_by_name,
    vh.verified_by_role,
    vh.verification_type,
    vh.verification_status,
    vh.created_at
FROM verification_history vh
LEFT JOIN visitors v ON vh.visitor_id = v.id
ORDER BY vh.created_at DESC
LIMIT 100;

-- ============================================
-- SECTION 10: UPDATE HELPER FUNCTIONS
-- ============================================

-- Drop and recreate get_visitor_analytics without companions_inside
DROP FUNCTION IF EXISTS get_visitor_analytics(DATE, DATE);

CREATE OR REPLACE FUNCTION get_visitor_analytics(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_registered BIGINT,
    total_arrived BIGINT,
    total_companions_reg BIGINT,
    arrival_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_registered,
        COUNT(CASE WHEN has_arrived = true THEN 1 END)::BIGINT as total_arrived,
        COALESCE(SUM(accompanying_count), 0)::BIGINT as total_companions_reg,
        ROUND(
            (COUNT(CASE WHEN has_arrived = true THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
            2
        ) as arrival_rate
    FROM visitors
    WHERE created_at::DATE BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate get_event_arrival_summary without companions_inside
DROP FUNCTION IF EXISTS get_event_arrival_summary(UUID);

CREATE OR REPLACE FUNCTION get_event_arrival_summary(event_id_param UUID)
RETURNS TABLE (
    event_name VARCHAR,
    total_registered BIGINT,
    total_arrived BIGINT,
    companions_registered BIGINT,
    pending_arrivals BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.event_name,
        COUNT(*)::BIGINT as total_registered,
        COUNT(CASE WHEN v.has_arrived = true THEN 1 END)::BIGINT as total_arrived,
        COALESCE(SUM(v.accompanying_count), 0)::BIGINT as companions_registered,
        COUNT(CASE WHEN v.has_arrived = false THEN 1 END)::BIGINT as pending_arrivals
    FROM visitors v
    WHERE v.event_id = event_id_param
    GROUP BY v.event_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SECTION 11: SUMMARY REPORT
-- ============================================

-- Run this after cleanup to see what's left
SELECT 
    'Cleanup Summary' as report,
    (SELECT COUNT(*) FROM visitors) as total_visitors,
    (SELECT COUNT(*) FROM events) as total_events,
    (SELECT COUNT(*) FROM event_requests) as total_event_requests,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM notifications) as total_notifications,
    (SELECT COUNT(*) FROM verification_history) as total_verifications;

-- ============================================
-- NOTES
-- ============================================

/*
REMOVED COLUMNS FROM VISITORS TABLE:
1. companions_inside - Simplified to only use accompanying_count
2. verified_by - Moved to verification_history
3. verified_at - Moved to verification_history
4. verification_count - Tracked in verification_history
5. last_verified_at - Tracked in verification_history

REMOVED TABLES:
1. arrival_log - Not used in current implementation
2. system_logs - Not used in current implementation

KEPT COLUMNS IN VISITORS TABLE:
- id, name, email, phone, register_number
- event_id, event_name
- visitor_category, qr_color, qr_code
- purpose, area_of_interest (JSONB), photo_url
- accompanying_count (simplified companion tracking)
- date_of_visit_from, date_of_visit_to
- status
- has_arrived, arrived_at, checked_in_by (IT Services check-in)
- created_at, updated_at

IMPACT:
- Database size reduced
- Simpler schema maintenance
- Faster queries (fewer indexes)
- All essential functionality preserved
*/

-- ============================================
-- END OF CLEANUP SCRIPT
-- ============================================
