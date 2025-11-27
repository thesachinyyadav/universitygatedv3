-- ============================================
-- CHRIST UNIVERSITY GATED ACCESS SYSTEM
-- Complete Database Schema for Supabase
-- Version 2.0.0
-- Last Updated: November 25, 2025
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CLEAN START - Drop existing tables
-- ============================================
DROP TABLE IF EXISTS system_logs CASCADE;
DROP TABLE IF EXISTS arrival_log CASCADE;
DROP TABLE IF EXISTS verification_history CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS visitors CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS event_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- 1. USERS TABLE (Guards, Organisers, CSO, IT Services)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('guard', 'organiser', 'cso', 'it_services')),
    full_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    department VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. EVENT REQUESTS TABLE
-- ============================================
CREATE TABLE event_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organiser_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    event_description TEXT,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    expected_students INTEGER DEFAULT 0,
    max_capacity INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. EVENTS TABLE (Approved Events)
-- ============================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_request_id UUID REFERENCES event_requests(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    description TEXT,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    max_capacity INTEGER NOT NULL,
    current_registrations INTEGER DEFAULT 0,
    total_people INTEGER DEFAULT 0,
    available_slots INTEGER,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'approved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. VISITORS TABLE (Main Registration)
-- ============================================
CREATE TABLE visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    register_number VARCHAR(100),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    visitor_category VARCHAR(50) DEFAULT 'student' CHECK (visitor_category IN ('student', 'speaker', 'vip')),
    qr_color VARCHAR(50) DEFAULT 'blue',
    qr_code TEXT UNIQUE,
    purpose TEXT,
    area_of_interest JSONB,
    photo_url TEXT,
    
    -- Companion tracking
    accompanying_count INTEGER DEFAULT 0,
    companions_inside INTEGER DEFAULT 0,
    
    -- Visit dates
    date_of_visit_from DATE NOT NULL,
    date_of_visit_to DATE NOT NULL,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'revoked')),
    
    -- Arrival tracking (NEW)
    has_arrived BOOLEAN DEFAULT FALSE,
    arrived_at TIMESTAMP WITH TIME ZONE,
    checked_in_by UUID REFERENCES users(id),
    
    -- Verification tracking
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_count INTEGER DEFAULT 0,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. VERIFICATION HISTORY TABLE
-- ============================================
CREATE TABLE verification_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
    verified_by UUID REFERENCES users(id),
    verified_by_name VARCHAR(255),
    verified_by_role VARCHAR(50),
    verification_type VARCHAR(50) DEFAULT 'qr_scan' CHECK (verification_type IN ('qr_scan', 'manual_entry', 'it_services_checkin')),
    verification_status VARCHAR(50) CHECK (verification_status IN ('success', 'denied')),
    denial_reason TEXT,
    visitor_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. ARRIVAL LOG TABLE (NEW - Track Entry/Exit)
-- ============================================
CREATE TABLE arrival_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
    visitor_name VARCHAR(255) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    
    -- Arrival details
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('check_in', 'check_out', 'companion_update')),
    previous_companion_count INTEGER,
    new_companion_count INTEGER,
    companions_inside INTEGER,
    
    -- Staff tracking
    processed_by UUID REFERENCES users(id),
    processed_by_name VARCHAR(255),
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error', 'event_request', 'system')),
    related_id UUID,
    related_type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. SYSTEM LOGS TABLE (Audit Trail)
-- ============================================
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_username ON users(username);

-- Event Requests
CREATE INDEX idx_event_requests_status ON event_requests(status);
CREATE INDEX idx_event_requests_organiser ON event_requests(organiser_id);
CREATE INDEX idx_event_requests_dates ON event_requests(date_from, date_to);

-- Events
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_dates ON events(date_from, date_to);

-- Visitors
CREATE INDEX idx_visitors_event ON visitors(event_id);
CREATE INDEX idx_visitors_status ON visitors(status);
CREATE INDEX idx_visitors_qr ON visitors(qr_code);
CREATE INDEX idx_visitors_category ON visitors(visitor_category);
CREATE INDEX idx_visitors_has_arrived ON visitors(has_arrived);
CREATE INDEX idx_visitors_name ON visitors(name);
CREATE INDEX idx_visitors_phone ON visitors(phone);
CREATE INDEX idx_visitors_dates ON visitors(date_of_visit_from, date_of_visit_to);
CREATE INDEX idx_visitors_area_of_interest ON visitors USING GIN (area_of_interest);

-- Verification History
CREATE INDEX idx_verification_visitor ON verification_history(visitor_id);
CREATE INDEX idx_verification_by ON verification_history(verified_by);
CREATE INDEX idx_verification_date ON verification_history(created_at);

-- Arrival Log
CREATE INDEX idx_arrival_visitor ON arrival_log(visitor_id);
CREATE INDEX idx_arrival_processed_by ON arrival_log(processed_by);
CREATE INDEX idx_arrival_date ON arrival_log(created_at);
CREATE INDEX idx_arrival_action ON arrival_log(action_type);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- System Logs
CREATE INDEX idx_system_logs_user ON system_logs(user_id);
CREATE INDEX idx_system_logs_date ON system_logs(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE arrival_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations (configure stricter policies as needed)
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on event_requests" ON event_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on events" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on visitors" ON visitors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on verification_history" ON verification_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on arrival_log" ON arrival_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on system_logs" ON system_logs FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- TRIGGERS
-- ============================================

-- 1. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_requests_updated_at BEFORE UPDATE ON event_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visitors_updated_at BEFORE UPDATE ON visitors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Assign QR color based on visitor category
CREATE OR REPLACE FUNCTION assign_qr_color()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.visitor_category = 'student' THEN
        NEW.qr_color := 'blue';
    ELSIF NEW.visitor_category = 'speaker' THEN
        NEW.qr_color := 'amber';
    ELSIF NEW.visitor_category = 'vip' THEN
        NEW.qr_color := 'maroon';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_qr_color BEFORE INSERT OR UPDATE ON visitors
    FOR EACH ROW EXECUTE FUNCTION assign_qr_color();

-- 3. Create event when request is approved
CREATE OR REPLACE FUNCTION create_event_on_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        INSERT INTO events (
            event_request_id,
            event_name,
            department,
            description,
            date_from,
            date_to,
            max_capacity,
            total_people,
            available_slots,
            status
        ) VALUES (
            NEW.id,
            NEW.event_name,
            NEW.department,
            NEW.event_description,
            NEW.date_from,
            NEW.date_to,
            NEW.max_capacity,
            0,
            NEW.max_capacity,
            'approved'
        );
        
        -- Notify organiser
        INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
        VALUES (NEW.organiser_id, 'Event Approved', 'Your event "' || NEW.event_name || '" has been approved', 'success', NEW.id, 'event_request');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_event_trigger AFTER UPDATE ON event_requests
    FOR EACH ROW EXECUTE FUNCTION create_event_on_approval();

-- 4. Update event registration count and available slots
CREATE OR REPLACE FUNCTION update_event_registrations()
RETURNS TRIGGER AS $$
DECLARE
    visitor_total INTEGER;
BEGIN
    -- Calculate total people for this visitor (1 visitor + companions)
    visitor_total := 1 + COALESCE(NEW.accompanying_count, 0);
    
    UPDATE events
    SET 
        current_registrations = current_registrations + 1,
        total_people = total_people + visitor_total,
        available_slots = max_capacity - (total_people + visitor_total)
    WHERE id = NEW.event_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_event_registrations AFTER INSERT ON visitors
    FOR EACH ROW EXECUTE FUNCTION update_event_registrations();

-- 5. Log arrival updates
CREATE OR REPLACE FUNCTION log_arrival_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log check-in
    IF NEW.has_arrived = TRUE AND OLD.has_arrived = FALSE THEN
        INSERT INTO arrival_log (
            visitor_id,
            visitor_name,
            event_name,
            action_type,
            companions_inside,
            processed_by,
            created_at
        ) VALUES (
            NEW.id,
            NEW.name,
            NEW.event_name,
            'check_in',
            NEW.companions_inside,
            NEW.checked_in_by,
            NOW()
        );
    END IF;
    
    -- Log companion count updates
    IF NEW.accompanying_count != OLD.accompanying_count OR NEW.companions_inside != OLD.companions_inside THEN
        INSERT INTO arrival_log (
            visitor_id,
            visitor_name,
            event_name,
            action_type,
            previous_companion_count,
            new_companion_count,
            companions_inside,
            processed_by,
            created_at
        ) VALUES (
            NEW.id,
            NEW.name,
            NEW.event_name,
            'companion_update',
            OLD.accompanying_count,
            NEW.accompanying_count,
            NEW.companions_inside,
            NEW.checked_in_by,
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_arrival_trigger AFTER UPDATE ON visitors
    FOR EACH ROW EXECUTE FUNCTION log_arrival_changes();

-- 6. Notify CSO of new event requests
CREATE OR REPLACE FUNCTION notify_cso_new_request()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
    SELECT id, 'New Event Request', 'New event request: "' || NEW.event_name || '" from ' || NEW.department, 'info', NEW.id, 'event_request'
    FROM users WHERE role = 'cso';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_cso_trigger AFTER INSERT ON event_requests
    FOR EACH ROW EXECUTE FUNCTION notify_cso_new_request();

-- =====================================================
-- SEED DATA - USERS
-- ⚠️ NOTE: Passwords are plain text for initial setup
-- Production systems should implement password hashing
-- =====================================================

-- Master User (SACHIN)
INSERT INTO users (username, password, role, full_name, department, email, phone) VALUES
  ('2341551', '34864261', 'cso', 'SACHIN', 'Central Security Office', 'sachin@christuniversity.in', NULL);

-- Guard Users
INSERT INTO users (username, password, role, full_name, department, email, phone) VALUES
  ('guard1', 'Christ@2025', 'guard', 'Security Guard 1', 'Security', 'guard1@christuniversity.in', NULL),
  ('guard2', 'Christ@2025', 'guard', 'Security Guard 2', 'Security', 'guard2@christuniversity.in', NULL);

-- Organiser Users
INSERT INTO users (username, password, role, full_name, department, email, phone) VALUES
  ('org1', 'Christ@2025', 'organiser', 'Event Organiser 1', 'Cultural Department', 'org1@christuniversity.in', NULL),
  ('org2', 'Christ@2025', 'organiser', 'Event Organiser 2', 'Sports Department', 'org2@christuniversity.in', NULL);

-- CSO Users
INSERT INTO users (username, password, role, full_name, department, email, phone) VALUES
  ('cso1', 'Christ@2025', 'cso', 'CSO Officer 1', 'Central Security Office', 'cso1@christuniversity.in', NULL),
  ('cso2', 'Christ@2025', 'cso', 'CSO Officer 2', 'Central Security Office', 'cso2@christuniversity.in', NULL);

-- IT Services Users
INSERT INTO users (username, password, role, full_name, department, email, phone) VALUES
  ('it1', 'Christ@2025', 'it_services', 'IT Services 1', 'IT Department', 'it1@christuniversity.in', NULL),
  ('it2', 'Christ@2025', 'it_services', 'IT Services 2', 'IT Department', 'it2@christuniversity.in', NULL),
  ('manoj.t', 'Manoj@2025', 'it_services', 'Manoj T', 'IT Department', 'manoj.t@christuniversity.in', NULL);

-- =====================================================
-- SAMPLE DATA - EVENT REQUESTS & EVENTS
-- (Optional - for testing purposes)
-- =====================================================

-- Sample Event Request (Pending)
INSERT INTO event_requests (
  organiser_id, 
  department, 
  event_name, 
  event_description,
  date_from, 
  date_to, 
  expected_students, 
  max_capacity,
  status
) VALUES (
  (SELECT id FROM users WHERE username = 'org1' LIMIT 1),
  'Cultural Department',
  'Annual Tech Fest 2025',
  'Three-day technology and innovation festival featuring workshops, competitions, and exhibitions',
  CURRENT_DATE + INTERVAL '30 days',
  CURRENT_DATE + INTERVAL '32 days',
  300,
  350,
  'pending'
);

-- Sample Event Request (Approved) - Will auto-create event via trigger
INSERT INTO event_requests (
  organiser_id, 
  department, 
  event_name, 
  event_description,
  date_from, 
  date_to, 
  expected_students, 
  max_capacity,
  status,
  approved_by
) VALUES (
  (SELECT id FROM users WHERE username = 'org2' LIMIT 1),
  'Sports Department',
  'Sports Day 2025',
  'Annual inter-departmental sports competition with athletics, team games, and cultural performances',
  CURRENT_DATE + INTERVAL '15 days',
  CURRENT_DATE + INTERVAL '17 days',
  200,
  250,
  'approved',
  (SELECT id FROM users WHERE username = '2341551' LIMIT 1)
);

-- Sample Event (Manually created for testing IT Services check-in)
INSERT INTO events (
  event_request_id,
  event_name,
  department,
  description,
  date_from,
  date_to,
  max_capacity,
  current_registrations,
  total_people,
  available_slots,
  status
) VALUES (
  NULL,
  'Guest Lecture Series',
  'Computer Science Department',
  'Weekly guest lecture series by industry experts',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '90 days',
  100,
  0,
  0,
  100,
  'approved'
);

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- View: Daily Arrival Statistics
CREATE OR REPLACE VIEW daily_arrivals AS
SELECT 
    DATE(created_at) as visit_date,
    event_name,
    COUNT(*) as total_registered,
    COUNT(CASE WHEN has_arrived = true THEN 1 END) as total_arrived,
    SUM(accompanying_count) as total_companions_registered,
    SUM(companions_inside) as total_companions_arrived,
    COUNT(*) + SUM(accompanying_count) as total_people_registered,
    COUNT(CASE WHEN has_arrived = true THEN 1 END) + SUM(companions_inside) as total_people_arrived,
    ROUND(
        (COUNT(CASE WHEN has_arrived = true THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
        2
    ) as arrival_percentage
FROM visitors
GROUP BY DATE(created_at), event_name
ORDER BY visit_date DESC;

-- View: Visitor Statistics by Category
CREATE OR REPLACE VIEW visitor_statistics AS
SELECT 
    visitor_category,
    COUNT(*) as total_visitors,
    COUNT(CASE WHEN has_arrived = true THEN 1 END) as arrived_count,
    COUNT(CASE WHEN verified_at IS NOT NULL THEN 1 END) as verified_count,
    SUM(accompanying_count) as total_companions_registered,
    SUM(companions_inside) as total_companions_arrived,
    AVG(verification_count) as avg_verification_count,
    COUNT(CASE WHEN has_arrived = true THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100 as arrival_rate
FROM visitors
GROUP BY visitor_category
ORDER BY total_visitors DESC;

-- View: Event Capacity and Arrival Tracking
CREATE OR REPLACE VIEW event_capacity_status AS
SELECT 
    e.id,
    e.event_name,
    e.department,
    e.date_from,
    e.date_to,
    e.max_capacity,
    e.current_registrations as registered_visitors,
    e.total_people as total_registered_people,
    (SELECT COUNT(*) FROM visitors v WHERE v.event_id = e.id AND v.has_arrived = true) as arrived_visitors,
    (SELECT COUNT(*) + COALESCE(SUM(companions_inside), 0) 
     FROM visitors v WHERE v.event_id = e.id AND v.has_arrived = true) as total_people_arrived,
    e.max_capacity - e.total_people as slots_available,
    ROUND((e.total_people::NUMERIC / e.max_capacity * 100), 2) as capacity_percentage,
    e.status
FROM events e
WHERE e.status = 'approved'
ORDER BY e.date_from;

-- View: Recent Verifications
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

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get Visitor Analytics for a specific date range
CREATE OR REPLACE FUNCTION get_visitor_analytics(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_registered BIGINT,
    total_arrived BIGINT,
    total_companions_reg BIGINT,
    total_companions_arr BIGINT,
    arrival_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_registered,
        COUNT(CASE WHEN has_arrived = true THEN 1 END)::BIGINT as total_arrived,
        COALESCE(SUM(accompanying_count), 0)::BIGINT as total_companions_reg,
        COALESCE(SUM(companions_inside), 0)::BIGINT as total_companions_arr,
        ROUND(
            (COUNT(CASE WHEN has_arrived = true THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
            2
        ) as arrival_rate
    FROM visitors
    WHERE created_at::DATE BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- Function: Search Visitors by Name or Phone
CREATE OR REPLACE FUNCTION search_visitors(
    search_term TEXT,
    limit_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    phone VARCHAR,
    email VARCHAR,
    visitor_category VARCHAR,
    event_name VARCHAR,
    has_arrived BOOLEAN,
    companions_inside INT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.name,
        v.phone,
        v.email,
        v.visitor_category,
        v.event_name,
        v.has_arrived,
        v.companions_inside,
        v.created_at
    FROM visitors v
    WHERE 
        v.name ILIKE '%' || search_term || '%'
        OR v.phone ILIKE '%' || search_term || '%'
        OR v.email ILIKE '%' || search_term || '%'
    ORDER BY v.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Get Event Arrival Summary
CREATE OR REPLACE FUNCTION get_event_arrival_summary(event_id_param UUID)
RETURNS TABLE (
    event_name VARCHAR,
    total_registered BIGINT,
    total_arrived BIGINT,
    companions_registered BIGINT,
    companions_arrived BIGINT,
    pending_arrivals BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.event_name,
        COUNT(*)::BIGINT as total_registered,
        COUNT(CASE WHEN v.has_arrived = true THEN 1 END)::BIGINT as total_arrived,
        COALESCE(SUM(v.accompanying_count), 0)::BIGINT as companions_registered,
        COALESCE(SUM(v.companions_inside), 0)::BIGINT as companions_arrived,
        COUNT(CASE WHEN v.has_arrived = false THEN 1 END)::BIGINT as pending_arrivals
    FROM visitors v
    WHERE v.event_id = event_id_param
    GROUP BY v.event_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COLUMN COMMENTS
-- =====================================================

-- Users table comments
COMMENT ON COLUMN users.role IS 'User role: guard, organiser, cso, or it_services';
COMMENT ON COLUMN users.email IS 'Email address for notifications and communication';
COMMENT ON COLUMN users.phone IS 'Contact phone number';

-- Visitors table comments
COMMENT ON COLUMN visitors.photo_url IS 'URL of the visitor photo stored in Supabase storage';
COMMENT ON COLUMN visitors.register_number IS 'University register/ID number of the visitor';
COMMENT ON COLUMN visitors.verified_by IS 'Username of the guard who verified this visitor';
COMMENT ON COLUMN visitors.verified_at IS 'Timestamp when the visitor was verified by guard';
COMMENT ON COLUMN visitors.accompanying_count IS 'Number of companions registered during visitor registration';
COMMENT ON COLUMN visitors.companions_inside IS 'Actual number of companions who arrived and checked in';
COMMENT ON COLUMN visitors.has_arrived IS 'Boolean flag indicating if visitor has physically arrived and been checked in';
COMMENT ON COLUMN visitors.arrived_at IS 'Timestamp when visitor was checked in at the counter';
COMMENT ON COLUMN visitors.checked_in_by IS 'Username of IT Services staff who checked in this visitor';
COMMENT ON COLUMN visitors.verification_count IS 'Number of times this QR code has been scanned/verified';
COMMENT ON COLUMN visitors.last_verified_at IS 'Timestamp of the most recent QR verification';
COMMENT ON COLUMN visitors.area_of_interest IS 'JSONB array of visitor interests/specializations - supports multiple selections';

-- Events table comments
COMMENT ON COLUMN events.current_registrations IS 'Count of visitors registered (not including companions)';
COMMENT ON COLUMN events.total_people IS 'Total count of all people (visitors + all companions)';
COMMENT ON COLUMN events.available_slots IS 'Calculated available capacity (max_capacity - total_people)';

-- Verification History table comments
COMMENT ON TABLE verification_history IS 'Audit log of all QR code scans and verifications';
COMMENT ON COLUMN verification_history.verification_type IS 'Type of verification: qr_scan, manual_entry, it_services_checkin';
COMMENT ON COLUMN verification_history.visitor_details IS 'JSONB field for additional verification metadata';

-- Arrival Log table comments
COMMENT ON TABLE arrival_log IS 'Tracks check-in, check-out, and companion count changes at IT Services counter';
COMMENT ON COLUMN arrival_log.action_type IS 'Action type: check_in, check_out, companion_update';
COMMENT ON COLUMN arrival_log.previous_companion_count IS 'Previous companion count before update';
COMMENT ON COLUMN arrival_log.new_companion_count IS 'New companion count after update';

-- System Logs table comments
COMMENT ON TABLE system_logs IS 'System-wide audit trail for all critical actions and events';
COMMENT ON COLUMN system_logs.action IS 'Type of system action performed';
COMMENT ON COLUMN system_logs.details IS 'JSONB field containing detailed action metadata';

-- =====================================================
-- LOBBY TRACKING & BATCH EXIT SYSTEM
-- =====================================================

-- Create lobby tracking table for visitor batch management
CREATE TABLE IF NOT EXISTS lobby_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lobby_name VARCHAR(50) NOT NULL UNIQUE,
    current_count INTEGER DEFAULT 0,
    total_checked_in INTEGER DEFAULT 0,
    total_sent_out INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_lobby_tracking_name ON lobby_tracking(lobby_name);

-- Insert initial lobby records
INSERT INTO lobby_tracking (lobby_name, current_count, total_checked_in, total_sent_out) 
VALUES 
    ('Lobby 1', 0, 0, 0),
    ('Lobby 2', 0, 0, 0),
    ('Lobby 3', 0, 0, 0)
ON CONFLICT (lobby_name) DO NOTHING;

-- Create batch exits table with volunteer tracking
CREATE TABLE IF NOT EXISTS batch_exits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lobby_name VARCHAR(50) NOT NULL,
    batch_number INTEGER NOT NULL,
    people_count INTEGER NOT NULL,
    volunteers JSONB NOT NULL, -- Array of {name, register_number}
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_people_count CHECK (people_count > 0)
);

-- Create indexes for batch exits
CREATE INDEX IF NOT EXISTS idx_batch_exits_lobby ON batch_exits(lobby_name);
CREATE INDEX IF NOT EXISTS idx_batch_exits_date ON batch_exits(created_at);
CREATE INDEX IF NOT EXISTS idx_batch_exits_batch_number ON batch_exits(batch_number);

-- Add lobby assignment columns to visitors table
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS assigned_lobby VARCHAR(50) DEFAULT 'Lobby 1';
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS lobby_entry_time TIMESTAMP WITH TIME ZONE;

-- Function to get next batch number (resets daily)
CREATE OR REPLACE FUNCTION get_next_batch_number()
RETURNS INTEGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(batch_number), 0) + 1 INTO next_number
    FROM batch_exits
    WHERE DATE(created_at) = CURRENT_DATE
    AND batch_number > 0;
    
    IF next_number IS NULL THEN
        next_number := 1;
    END IF;
    
    RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-increment lobby count on check-in
CREATE OR REPLACE FUNCTION auto_increment_lobby_on_checkin()
RETURNS TRIGGER AS $$
DECLARE
    people_count INTEGER;
BEGIN
    IF NEW.has_arrived = true AND (OLD.has_arrived = false OR OLD.has_arrived IS NULL) THEN
        people_count := 1 + COALESCE(NEW.accompanying_count, 0);
        NEW.lobby_entry_time := NOW();
        
        IF NEW.assigned_lobby IS NULL THEN
            NEW.assigned_lobby := 'Lobby 1';
        END IF;
        
        UPDATE lobby_tracking
        SET 
            current_count = current_count + people_count,
            total_checked_in = total_checked_in + people_count,
            last_updated = NOW()
        WHERE lobby_name = NEW.assigned_lobby;
        
        IF NOT FOUND THEN
            INSERT INTO lobby_tracking (lobby_name, current_count, total_checked_in, total_sent_out)
            VALUES (NEW.assigned_lobby, people_count, people_count, 0);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-increment on check-in
DROP TRIGGER IF EXISTS trigger_auto_increment_lobby ON visitors;
CREATE TRIGGER trigger_auto_increment_lobby
BEFORE UPDATE ON visitors
FOR EACH ROW
EXECUTE FUNCTION auto_increment_lobby_on_checkin();

-- Function to create batch exit
CREATE OR REPLACE FUNCTION create_batch_exit(
    p_lobby_name VARCHAR(50),
    p_people_count INTEGER,
    p_volunteers JSONB,
    p_user_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_current_count INTEGER;
    v_batch_number INTEGER;
    v_result JSONB;
BEGIN
    IF p_volunteers IS NULL OR jsonb_array_length(p_volunteers) = 0 THEN
        RAISE EXCEPTION 'At least one volunteer is required';
    END IF;
    
    SELECT current_count INTO v_current_count
    FROM lobby_tracking
    WHERE lobby_name = p_lobby_name;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lobby % not found', p_lobby_name;
    END IF;
    
    IF v_current_count < p_people_count THEN
        RAISE EXCEPTION 'Not enough people in lobby. Current: %, Requested: %', v_current_count, p_people_count;
    END IF;
    
    v_batch_number := get_next_batch_number();
    
    UPDATE lobby_tracking
    SET 
        current_count = current_count - p_people_count,
        total_sent_out = total_sent_out + p_people_count,
        last_updated = NOW(),
        updated_by = p_user_id
    WHERE lobby_name = p_lobby_name;
    
    INSERT INTO batch_exits (lobby_name, batch_number, people_count, volunteers, notes, created_by)
    VALUES (p_lobby_name, v_batch_number, p_people_count, p_volunteers, p_notes, p_user_id)
    RETURNING 
        jsonb_build_object(
            'id', id,
            'batch_number', batch_number,
            'lobby_name', lobby_name,
            'people_count', people_count,
            'volunteers', volunteers,
            'created_at', created_at
        ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- View: Current lobby status
CREATE OR REPLACE VIEW lobby_status AS
SELECT 
    lobby_name,
    current_count,
    total_checked_in,
    total_sent_out,
    (total_checked_in - total_sent_out) as should_be_count,
    last_updated,
    EXTRACT(EPOCH FROM (NOW() - last_updated))/60 as minutes_since_update
FROM lobby_tracking
ORDER BY lobby_name;

-- View: Batch history (all dates)
CREATE OR REPLACE VIEW batch_history AS
SELECT 
    be.id,
    be.batch_number,
    be.lobby_name,
    be.people_count,
    be.volunteers,
    be.notes,
    be.created_at,
    u.username as created_by_username,
    lt.current_count as lobby_current_count
FROM batch_exits be
LEFT JOIN users u ON be.created_by = u.id
LEFT JOIN lobby_tracking lt ON be.lobby_name = lt.lobby_name
ORDER BY be.created_at DESC;

-- =====================================================
-- STORAGE BUCKET FOR VISITOR PHOTOS
-- =====================================================

-- Create storage bucket for visitor photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('visitor-photos', 'visitor-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for visitor photos bucket
-- Allow public read access
CREATE POLICY "Public read access for visitor photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'visitor-photos');

-- Allow authenticated uploads
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'visitor-photos');

-- Allow authenticated updates
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'visitor-photos');

-- Allow authenticated deletes
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'visitor-photos');

-- =====================================================
-- VERIFICATION QUERIES
-- Run these to verify setup
-- =====================================================

-- Check all users
SELECT id, username, role, full_name, department FROM users;

-- Check event requests
SELECT 
  er.event_name,
  u.full_name as organiser,
  er.department,
  er.date_from,
  er.date_to,
  er.status
FROM event_requests er
LEFT JOIN users u ON er.organiser_id = u.id;

-- Check approved events
SELECT 
  e.event_name,
  e.department,
  e.date_from,
  e.date_to,
  e.current_registrations,
  e.max_capacity,
  (e.max_capacity - e.current_registrations) as slots_available
FROM events e;

-- Check notifications
SELECT 
  n.title,
  n.message,
  n.is_read,
  n.created_at
FROM notifications n
WHERE user_id = (SELECT id FROM users WHERE username = 'cso_admin' LIMIT 1);

-- =====================================================
-- USEFUL QUERIES FOR PRODUCTION
-- =====================================================

-- Get visitor statistics
SELECT 
  visitor_category,
  COUNT(*) as total_visitors,
  COUNT(CASE WHEN verified_at IS NOT NULL THEN 1 END) as verified_count
FROM visitors
GROUP BY visitor_category;

-- Get event capacity status
SELECT 
  e.event_name,
  e.date_from,
  e.max_capacity,
  e.current_registrations,
  ROUND((CAST(e.current_registrations AS NUMERIC) / e.max_capacity * 100), 2) as fill_percentage
FROM events e
WHERE e.date_from >= CURRENT_DATE
ORDER BY e.date_from;

-- Get pending event requests
SELECT 
  er.event_name,
  u.full_name as organiser,
  er.department,
  er.expected_students,
  er.date_from,
  er.created_at
FROM event_requests er
LEFT JOIN users u ON er.organiser_id = u.id
WHERE er.status = 'pending'
ORDER BY er.created_at DESC;

-- Get today's visitors
SELECT 
  v.name,
  v.visitor_category,
  v.event_name,
  v.verified_at,
  u.full_name as verified_by_guard
FROM visitors v
LEFT JOIN users u ON v.verified_by = u.id
WHERE CURRENT_DATE BETWEEN v.date_of_visit_from AND v.date_of_visit_to
ORDER BY v.created_at DESC;

-- =====================================================
-- MAINTENANCE QUERIES
-- =====================================================

-- Delete old notifications (older than 30 days)
-- DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days';

-- Archive past events (move to archive table if needed)
-- UPDATE events SET archived = true WHERE date_to < CURRENT_DATE - INTERVAL '30 days';

-- Reset event registration count (if needed)
-- UPDATE events e SET current_registrations = (
--   SELECT COUNT(*) FROM visitors v WHERE v.event_id = e.id
-- );

-- =====================================================
-- SECURITY RECOMMENDATIONS
-- =====================================================

/*
1. PASSWORDS:
   - Never use default passwords in production
   - Use bcrypt or similar hashing
   - Minimum 12 characters with complexity

2. RLS POLICIES:
   - Customize policies based on user roles
   - Restrict SELECT queries to relevant data
   - Implement proper authentication checks

3. API SECURITY:
   - Use environment variables for secrets
   - Implement rate limiting
   - Validate all inputs
   - Use HTTPS only

4. DATABASE:
   - Regular backups (daily recommended)
   - Monitor for unusual activity
   - Keep Supabase updated
   - Use connection pooling

5. MONITORING:
   - Enable Supabase logs
   - Track failed login attempts
   - Monitor QR verification patterns
   - Alert on capacity issues
*/

-- =====================================================
-- END OF DATABASE SCHEMA
-- =====================================================

-- To verify everything is set up correctly:
-- SELECT 'Setup Complete!' as status;

-- Verify new visitor columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'visitors' 
AND column_name IN ('photo_url', 'register_number', 'verified_by', 'verified_at');

-- Verify storage bucket
SELECT * FROM storage.buckets WHERE id = 'visitor-photos';

-- Verify storage policies
SELECT * FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
