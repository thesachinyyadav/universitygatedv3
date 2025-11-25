-- =====================================================
-- CHRIST UNIVERSITY GATED ACCESS MANAGEMENT SYSTEM
-- Complete Database Schema - Production Ready
-- Version 1.0.0
-- Last Updated: October 9, 2025
-- =====================================================

-- =====================================================
-- CLEAN START - Drop existing tables
-- =====================================================
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS visitors CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS event_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- 1. USERS TABLE
-- Stores all system users (Guards, Organisers, CSO)
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT CHECK(role IN ('guard', 'organiser', 'cso')) NOT NULL,
  full_name TEXT NOT NULL,
  department TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 2. EVENT REQUESTS TABLE  
-- Organisers submit event requests for CSO approval
-- =====================================================
CREATE TABLE event_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  department TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_description TEXT,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  expected_students INTEGER NOT NULL,
  max_capacity INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')) NOT NULL,
  rejection_reason TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 3. EVENTS TABLE
-- Auto-created when CSO approves event requests
-- =====================================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_request_id UUID REFERENCES event_requests(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  department TEXT NOT NULL,
  organiser_id UUID REFERENCES users(id) ON DELETE SET NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  max_capacity INTEGER NOT NULL,
  current_registrations INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 4. VISITORS TABLE
-- Stores all registered visitors with QR data
-- =====================================================
CREATE TABLE visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  event_name TEXT NOT NULL,
  date_of_visit_from DATE NOT NULL,
  date_of_visit_to DATE NOT NULL,
  purpose TEXT,
  visitor_category TEXT DEFAULT 'student' CHECK(visitor_category IN ('student', 'speaker', 'vip')) NOT NULL,
  qr_color TEXT DEFAULT '#1e40af',
  status TEXT DEFAULT 'approved' CHECK(status IN ('approved', 'revoked')) NOT NULL,
  photo_url TEXT,
  register_number TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 5. NOTIFICATIONS TABLE
-- CSO receives notifications for new event requests
-- =====================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK(type IN ('event_request', 'system')) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES for Performance Optimization
-- =====================================================
CREATE INDEX idx_event_requests_status ON event_requests(status);
CREATE INDEX idx_event_requests_organiser ON event_requests(organiser_id);
CREATE INDEX idx_events_date ON events(date_from, date_to);
CREATE INDEX idx_events_capacity ON events(current_registrations, max_capacity);
CREATE INDEX idx_visitors_event ON visitors(event_id);
CREATE INDEX idx_visitors_category ON visitors(visitor_category);
CREATE INDEX idx_visitors_status ON visitors(status);
CREATE INDEX idx_visitors_register_number ON visitors(register_number);
CREATE INDEX idx_visitors_verified_by ON visitors(verified_by);
CREATE INDEX idx_visitors_verified_at ON visitors(verified_at);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- Enable RLS for all tables
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow all operations (configure stricter policies as needed)
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on event_requests" ON event_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on events" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on visitors" ON visitors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Function 1: Notify CSO when event request is submitted
CREATE OR REPLACE FUNCTION notify_cso_on_event_request()
RETURNS TRIGGER AS $$
DECLARE
  cso_user_id UUID;
BEGIN
  FOR cso_user_id IN SELECT id FROM users WHERE role = 'cso' LOOP
    INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES (
      cso_user_id,
      'event_request',
      'New Event Request',
      'New event request from ' || NEW.department || ' for ' || NEW.event_name,
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Auto-create event when request is approved
CREATE OR REPLACE FUNCTION create_event_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO events (
      event_request_id,
      event_name,
      department,
      organiser_id,
      date_from,
      date_to,
      max_capacity,
      description
    ) VALUES (
      NEW.id,
      NEW.event_name,
      NEW.department,
      NEW.organiser_id,
      NEW.date_from,
      NEW.date_to,
      NEW.max_capacity,
      NEW.event_description
    );
    
    NEW.approved_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Increment event registrations count
CREATE OR REPLACE FUNCTION increment_event_registrations()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events 
  SET current_registrations = current_registrations + 1
  WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Set QR color based on visitor category
CREATE OR REPLACE FUNCTION set_qr_color()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.visitor_category
    WHEN 'student' THEN NEW.qr_color := '#092987';   -- Deep Blue
    WHEN 'speaker' THEN NEW.qr_color := '#d97706';   -- Amber
    WHEN 'vip' THEN NEW.qr_color := '#991b1b';       -- Maroon
    ELSE NEW.qr_color := '#092987';
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger 1: Notify CSO on new event request
CREATE TRIGGER trigger_notify_cso
AFTER INSERT ON event_requests
FOR EACH ROW
EXECUTE FUNCTION notify_cso_on_event_request();

-- Trigger 2: Create event when request approved
CREATE TRIGGER trigger_create_event
BEFORE UPDATE ON event_requests
FOR EACH ROW
EXECUTE FUNCTION create_event_on_approval();

-- Trigger 3: Increment event registration count
CREATE TRIGGER trigger_increment_registrations
AFTER INSERT ON visitors
FOR EACH ROW
EXECUTE FUNCTION increment_event_registrations();

-- Trigger 4: Set QR color on visitor insert
CREATE TRIGGER trigger_set_qr_color
BEFORE INSERT OR UPDATE ON visitors
FOR EACH ROW
EXECUTE FUNCTION set_qr_color();

-- =====================================================
-- INITIAL ADMIN USERS
-- ⚠️ IMPORTANT: Change these passwords in production!
-- =====================================================

INSERT INTO users (username, password, role, full_name, department) VALUES
  ('cso_admin', 'CHANGE_THIS_PASSWORD', 'cso', 'Chief Security Officer', 'Security'),
  ('guard1', 'CHANGE_THIS_PASSWORD', 'guard', 'Security Guard 1', 'Security'),
  ('organiser1', 'CHANGE_THIS_PASSWORD', 'organiser', 'Event Organiser', 'Cultural Department');

-- =====================================================
-- SAMPLE DATA (Optional - Remove in Production)
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
  (SELECT id FROM users WHERE username = 'organiser1' LIMIT 1),
  'Cultural Department',
  'Annual Tech Fest 2025',
  'Three-day technology and innovation festival',
  CURRENT_DATE + INTERVAL '30 days',
  CURRENT_DATE + INTERVAL '32 days',
  300,
  350,
  'pending'
);

-- Sample Event Request (Approved) - Will auto-create event
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
  (SELECT id FROM users WHERE username = 'organiser1' LIMIT 1),
  'Sports Department',
  'Sports Day 2025',
  'Annual inter-departmental sports competition',
  CURRENT_DATE + INTERVAL '15 days',
  CURRENT_DATE + INTERVAL '17 days',
  200,
  250,
  'approved',
  (SELECT id FROM users WHERE username = 'cso_admin' LIMIT 1)
);

-- =====================================================
-- COLUMN COMMENTS
-- =====================================================

-- Add comments to visitor tracking columns
COMMENT ON COLUMN visitors.photo_url IS 'URL of the visitor photo stored in Supabase storage';
COMMENT ON COLUMN visitors.register_number IS 'University register/ID number of the visitor';
COMMENT ON COLUMN visitors.verified_by IS 'Username of the guard who verified this visitor';
COMMENT ON COLUMN visitors.verified_at IS 'Timestamp when the visitor was verified by guard';

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
