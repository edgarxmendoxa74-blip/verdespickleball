-- ========================================
-- VELARDE COURTSIDE DATABASE SCHEMA
-- ========================================
-- Run this script to create all necessary tables for the booking system

-- ========================================
-- 1. USERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ========================================
-- 2. BOOKINGS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  court_number INTEGER NOT NULL CHECK (court_number BETWEEN 1 AND 4),
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours INTEGER NOT NULL CHECK (duration_hours > 0),
  price_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_court_number ON bookings(court_number);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- ========================================
-- 3. PAYMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'gcash',
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  reference_number VARCHAR(255),
  gcash_transaction_id VARCHAR(255),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_reference_number ON payments(reference_number);

-- ========================================
-- 4. TIME TRACKING TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS time_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  actual_duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_time_tracking_booking_id ON time_tracking(booking_id);

-- ========================================
-- 5. CREATE VIEWS FOR ADMIN DASHBOARD
-- ========================================

-- Dashboard overview view
CREATE OR REPLACE VIEW dashboard_overview AS
SELECT 
  (SELECT COUNT(*) FROM bookings) as total_bookings,
  (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') as confirmed_bookings,
  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') as total_revenue,
  (SELECT COUNT(*) FROM bookings WHERE booking_date = CURRENT_DATE) as today_bookings,
  (SELECT COUNT(*) FROM users) as total_users;

-- Today's schedule view
CREATE OR REPLACE VIEW today_schedule AS
SELECT 
  b.id,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.court_number,
  b.duration_hours,
  b.price_amount,
  b.status,
  u.name,
  u.email,
  u.phone,
  p.status as payment_status
FROM bookings b
JOIN users u ON b.user_id = u.id
LEFT JOIN payments p ON b.id = p.booking_id
WHERE b.booking_date = CURRENT_DATE AND b.status != 'cancelled'
ORDER BY b.start_time ASC;

-- All bookings detailed view
CREATE OR REPLACE VIEW all_bookings_detail AS
SELECT 
  b.id,
  b.user_id,
  b.court_number,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.duration_hours,
  b.price_amount,
  b.status,
  b.created_at,
  u.name,
  u.email,
  u.phone,
  p.id as payment_id,
  p.status as payment_status,
  p.reference_number,
  p.paid_at,
  t.check_in_time,
  t.check_out_time,
  t.actual_duration_minutes
FROM bookings b
JOIN users u ON b.user_id = u.id
LEFT JOIN payments p ON b.id = p.booking_id
LEFT JOIN time_tracking t ON b.id = t.booking_id
ORDER BY b.booking_date DESC, b.start_time DESC;

-- Revenue analytics view
CREATE OR REPLACE VIEW revenue_by_date AS
SELECT 
  DATE(b.booking_date) as date,
  COUNT(p.id) as bookings,
  SUM(p.amount) as revenue
FROM payments p
LEFT JOIN bookings b ON p.booking_id = b.id
WHERE p.status = 'completed'
GROUP BY DATE(b.booking_date)
ORDER BY date DESC;

-- Court utilization view
CREATE OR REPLACE VIEW court_utilization AS
SELECT 
  b.court_number,
  COUNT(*) as total_bookings,
  SUM(b.duration_hours) as total_hours,
  ROUND((COUNT(*) * 100.0) / NULLIF((SELECT COUNT(*) FROM bookings WHERE booking_date >= CURRENT_DATE - INTERVAL '30 days'), 0), 2) as utilization_percent
FROM bookings b
WHERE b.booking_date >= CURRENT_DATE - INTERVAL '30 days' AND b.status = 'confirmed'
GROUP BY b.court_number
ORDER BY utilization_percent DESC;

-- Time tracking analytics view
CREATE OR REPLACE VIEW time_tracking_analytics AS
SELECT 
  b.id,
  b.duration_hours as booked_hours,
  ROUND(t.actual_duration_minutes / 60.0, 2) as actual_hours,
  ROUND(t.actual_duration_minutes / 60.0 - b.duration_hours, 2) as variance_hours,
  u.name,
  b.booking_date
FROM time_tracking t
LEFT JOIN bookings b ON t.booking_id = b.id
LEFT JOIN users u ON b.user_id = u.id
WHERE t.check_out_time IS NOT NULL
ORDER BY b.booking_date DESC;

-- ========================================
-- 6. ENABLE ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for development)
-- WARNING: For production, implement proper authentication policies

-- Users table policies
CREATE POLICY "Enable insert for authenticated users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read for all users" ON users
  FOR SELECT USING (true);

-- Bookings table policies
CREATE POLICY "Enable insert for authenticated users" ON bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read for all users" ON bookings
  FOR SELECT USING (true);

CREATE POLICY "Enable update for all users" ON bookings
  FOR UPDATE USING (true);

-- Payments table policies
CREATE POLICY "Enable insert for authenticated users" ON payments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read for all users" ON payments
  FOR SELECT USING (true);

CREATE POLICY "Enable update for all users" ON payments
  FOR UPDATE USING (true);

-- Time tracking table policies
CREATE POLICY "Enable insert for authenticated users" ON time_tracking
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read for all users" ON time_tracking
  FOR SELECT USING (true);

CREATE POLICY "Enable update for all users" ON time_tracking
  FOR UPDATE USING (true);

-- ========================================
-- 7. CREATE FUNCTIONS FOR COMMON OPERATIONS
-- ========================================

-- Function to get available time slots
CREATE OR REPLACE FUNCTION get_available_slots(p_date DATE)
RETURNS TABLE(time_slot TIME) AS $$
WITH working_hours AS (
  SELECT generate_series('07:00'::time, '18:00'::time, '1 hour'::interval) as hour
),
booked_slots AS (
  SELECT DISTINCT start_time
  FROM bookings
  WHERE booking_date = p_date AND status != 'cancelled'
)
SELECT hour::time
FROM working_hours
WHERE NOT EXISTS (
  SELECT 1 FROM booked_slots WHERE start_time = hour::time
)
ORDER BY hour;
$$ LANGUAGE SQL;

-- Function to calculate actual duration
CREATE OR REPLACE FUNCTION calculate_actual_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.check_out_time IS NOT NULL THEN
    NEW.actual_duration_minutes := EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate duration on checkout
CREATE TRIGGER trigger_calculate_duration
BEFORE UPDATE ON time_tracking
FOR EACH ROW
EXECUTE FUNCTION calculate_actual_duration();

-- ========================================
-- 8. SAMPLE DATA (For Testing - Optional)
-- ========================================

-- Uncomment the lines below to insert sample data for testing

/*
-- Insert sample user
INSERT INTO users (name, email, phone) VALUES
  ('Juan Dela Cruz', 'juan@example.com', '+639123456789'),
  ('Maria Santos', 'maria@example.com', '+639987654321');

-- Insert sample booking
INSERT INTO bookings (user_id, court_number, booking_date, start_time, end_time, duration_hours, price_amount, status)
SELECT id, 1, CURRENT_DATE + INTERVAL '1 day', '09:00'::time, '11:00'::time, 2, 900, 'confirmed'
FROM users WHERE email = 'juan@example.com';

-- Insert sample payment
INSERT INTO payments (booking_id, user_id, amount, status, reference_number, paid_at)
SELECT b.id, b.user_id, b.price_amount, 'completed', 'GCH-123456789', CURRENT_TIMESTAMP
FROM bookings b WHERE b.user_id = (SELECT id FROM users WHERE email = 'juan@example.com');

-- Insert sample time tracking
INSERT INTO time_tracking (booking_id, check_in_time, check_out_time)
SELECT id, CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP
FROM bookings WHERE user_id = (SELECT id FROM users WHERE email = 'juan@example.com');
*/

-- ========================================
-- 9. USEFUL QUERIES FOR VERIFICATION
-- ========================================

-- Check all tables exist
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check all views exist
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'VIEW';

-- ========================================
-- END OF SCHEMA SETUP
-- ========================================
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Click "New Query"
-- 4. Copy and paste the entire content of this file
-- 5. Click "Run"
-- 6. All tables and views will be created
--
-- ========================================
