-- ========================================
-- VELARDE COURTSIDE ADMIN DASHBOARD SQL
-- ========================================
-- This file contains all SQL queries used in the admin dashboard

-- ========================================
-- 1. DASHBOARD STATISTICS
-- ========================================

-- Get today's bookings count
SELECT COUNT(*) as count FROM bookings 
WHERE booking_date = DATE('now')
AND status != 'cancelled';

-- Get completed bookings count
SELECT COUNT(*) as count FROM bookings 
WHERE status = 'confirmed';

-- Get total revenue from completed payments
SELECT SUM(amount) as total FROM payments 
WHERE status = 'completed';

-- Get total bookings count
SELECT COUNT(*) as count FROM bookings;

-- Get all statistics at once (used by /api/admin/stats)
SELECT 
  (SELECT COUNT(*) FROM bookings) as total_bookings,
  (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') as completed_bookings,
  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') as total_revenue,
  (SELECT COUNT(*) FROM bookings WHERE booking_date = DATE('now')) as today_bookings;

-- ========================================
-- 2. TODAY'S SCHEDULE
-- ========================================

-- Get today's bookings with guest details
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
WHERE b.booking_date = DATE('now')
AND b.status != 'cancelled'
ORDER BY b.start_time ASC;

-- ========================================
-- 3. ALL BOOKINGS MANAGEMENT
-- ========================================

-- Get all bookings with full details
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

-- Filter bookings by status
SELECT 
  b.id,
  b.court_number,
  b.booking_date,
  b.start_time,
  b.end_time,
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
WHERE b.status = 'confirmed'
ORDER BY b.booking_date DESC;

-- Filter bookings by date
SELECT 
  b.id,
  b.court_number,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.duration_hours,
  b.price_amount,
  b.status,
  u.name,
  u.email,
  u.phone
FROM bookings b
JOIN users u ON b.user_id = u.id
WHERE b.booking_date = '2026-08-21'
ORDER BY b.start_time ASC;

-- Get booking details for a specific booking
SELECT 
  b.id,
  b.court_number,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.duration_hours,
  b.price_amount,
  b.status,
  u.name,
  u.email,
  u.phone,
  p.status as payment_status,
  p.reference_number,
  t.check_in_time,
  t.check_out_time,
  t.actual_duration_minutes
FROM bookings b
JOIN users u ON b.user_id = u.id
LEFT JOIN payments p ON b.id = p.booking_id
LEFT JOIN time_tracking t ON b.id = t.booking_id
WHERE b.id = 'booking-uuid-here';

-- ========================================
-- 4. TIME TRACKING - CHECK IN/OUT
-- ========================================

-- Get time tracking record
SELECT 
  id,
  booking_id,
  check_in_time,
  check_out_time,
  actual_duration_minutes,
  notes,
  created_at
FROM time_tracking
WHERE booking_id = 'booking-uuid-here';

-- Check in user (update check_in_time)
UPDATE time_tracking 
SET check_in_time = CURRENT_TIMESTAMP
WHERE booking_id = 'booking-uuid-here';

-- Check out user (update check_out_time and calculate duration)
UPDATE time_tracking 
SET 
  check_out_time = CURRENT_TIMESTAMP,
  actual_duration_minutes = CAST(
    (julianday(CURRENT_TIMESTAMP) - julianday(check_in_time)) * 24 * 60 
    AS INTEGER
  )
WHERE booking_id = 'booking-uuid-here';

-- Get time tracking for a specific date
SELECT 
  b.id,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.court_number,
  b.duration_hours,
  b.status,
  u.name,
  u.phone,
  t.check_in_time,
  t.check_out_time,
  t.actual_duration_minutes,
  CASE 
    WHEN t.check_out_time IS NOT NULL THEN 'completed'
    WHEN t.check_in_time IS NOT NULL THEN 'checked-in'
    ELSE 'pending'
  END as tracking_status
FROM bookings b
JOIN users u ON b.user_id = u.id
LEFT JOIN time_tracking t ON b.id = t.booking_id
WHERE b.booking_date = '2026-08-21'
ORDER BY b.start_time ASC;

-- ========================================
-- 5. BOOKING MANAGEMENT - CANCEL
-- ========================================

-- Cancel a booking
UPDATE bookings 
SET status = 'cancelled' 
WHERE id = 'booking-uuid-here';

-- Get cancelled bookings
SELECT 
  b.id,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.court_number,
  b.duration_hours,
  u.name,
  b.status,
  b.created_at
FROM bookings b
JOIN users u ON b.user_id = u.id
WHERE b.status = 'cancelled'
ORDER BY b.booking_date DESC;

-- ========================================
-- 6. PAYMENT TRACKING
-- ========================================

-- Get all payments with booking info
SELECT 
  p.id,
  p.booking_id,
  p.user_id,
  p.amount,
  p.payment_method,
  p.status,
  p.reference_number,
  p.gcash_transaction_id,
  p.paid_at,
  p.created_at,
  b.booking_date,
  b.start_time,
  b.court_number,
  u.name,
  u.email
FROM payments p
LEFT JOIN bookings b ON p.booking_id = b.id
LEFT JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC;

-- Get pending payments
SELECT 
  p.id,
  p.booking_id,
  p.amount,
  p.reference_number,
  p.created_at,
  b.booking_date,
  b.start_time,
  u.name,
  u.email
FROM payments p
LEFT JOIN bookings b ON p.booking_id = b.id
LEFT JOIN users u ON p.user_id = u.id
WHERE p.status = 'pending'
ORDER BY p.created_at DESC;

-- Get completed payments (revenue)
SELECT 
  p.id,
  p.booking_id,
  p.amount,
  p.reference_number,
  p.paid_at,
  b.booking_date,
  u.name
FROM payments p
LEFT JOIN bookings b ON p.booking_id = b.id
LEFT JOIN users u ON p.user_id = u.id
WHERE p.status = 'completed'
ORDER BY p.paid_at DESC;

-- ========================================
-- 7. REVENUE ANALYTICS
-- ========================================

-- Total revenue by date
SELECT 
  DATE(b.booking_date) as date,
  COUNT(p.id) as bookings,
  SUM(p.amount) as revenue
FROM payments p
LEFT JOIN bookings b ON p.booking_id = b.id
WHERE p.status = 'completed'
GROUP BY DATE(b.booking_date)
ORDER BY date DESC;

-- Revenue by court
SELECT 
  b.court_number,
  COUNT(p.id) as bookings,
  SUM(p.amount) as revenue,
  AVG(p.amount) as avg_amount
FROM payments p
LEFT JOIN bookings b ON p.booking_id = b.id
WHERE p.status = 'completed'
GROUP BY b.court_number
ORDER BY revenue DESC;

-- Monthly revenue
SELECT 
  strftime('%Y-%m', b.booking_date) as month,
  COUNT(p.id) as bookings,
  SUM(p.amount) as revenue
FROM payments p
LEFT JOIN bookings b ON p.booking_id = b.id
WHERE p.status = 'completed'
GROUP BY strftime('%Y-%m', b.booking_date)
ORDER BY month DESC;

-- ========================================
-- 8. BOOKING STATISTICS
-- ========================================

-- Bookings by status
SELECT 
  status,
  COUNT(*) as count
FROM bookings
GROUP BY status;

-- Bookings by court
SELECT 
  court_number,
  COUNT(*) as bookings,
  SUM(duration_hours) as total_hours
FROM bookings
WHERE status != 'cancelled'
GROUP BY court_number
ORDER BY court_number;

-- Popular time slots
SELECT 
  start_time,
  COUNT(*) as bookings
FROM bookings
WHERE status = 'confirmed'
GROUP BY start_time
ORDER BY bookings DESC;

-- Average booking duration
SELECT 
  AVG(duration_hours) as avg_duration,
  MIN(duration_hours) as min_duration,
  MAX(duration_hours) as max_duration
FROM bookings
WHERE status = 'confirmed';

-- ========================================
-- 9. GUEST INFORMATION
-- ========================================

-- Top guests (most bookings)
SELECT 
  u.id,
  u.name,
  u.email,
  u.phone,
  COUNT(b.id) as bookings,
  SUM(b.price_amount) as total_spent
FROM users u
LEFT JOIN bookings b ON u.id = b.user_id
GROUP BY u.id
ORDER BY bookings DESC
LIMIT 10;

-- Get all users
SELECT 
  id,
  name,
  email,
  phone,
  created_at
FROM users
ORDER BY created_at DESC;

-- ========================================
-- 10. TIME TRACKING ANALYTICS
-- ========================================

-- Actual vs Booked duration
SELECT 
  b.id,
  b.duration_hours as booked_hours,
  ROUND(t.actual_duration_minutes / 60.0, 2) as actual_hours,
  ROUND(t.actual_duration_minutes / 60.0 - b.duration_hours, 2) as variance,
  u.name
FROM time_tracking t
LEFT JOIN bookings b ON t.booking_id = b.id
LEFT JOIN users u ON b.user_id = u.id
WHERE t.check_out_time IS NOT NULL
ORDER BY b.booking_date DESC;

-- Average actual duration per court
SELECT 
  b.court_number,
  COUNT(*) as sessions,
  ROUND(AVG(t.actual_duration_minutes / 60.0), 2) as avg_actual_hours,
  ROUND(AVG(b.duration_hours), 2) as avg_booked_hours
FROM time_tracking t
LEFT JOIN bookings b ON t.booking_id = b.id
WHERE t.check_out_time IS NOT NULL
GROUP BY b.court_number;

-- ========================================
-- 11. PERFORMANCE METRICS
-- ========================================

-- Overall dashboard metrics
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM bookings) as total_bookings,
  (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') as confirmed_bookings,
  (SELECT COUNT(*) FROM bookings WHERE status = 'pending') as pending_bookings,
  (SELECT COUNT(*) FROM bookings WHERE status = 'cancelled') as cancelled_bookings,
  (SELECT COUNT(*) FROM payments WHERE status = 'completed') as completed_payments,
  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') as total_revenue,
  (SELECT COUNT(*) FROM time_tracking WHERE check_out_time IS NOT NULL) as completed_sessions,
  ROUND((SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') * 100.0 / (SELECT COUNT(*) FROM bookings), 2) as confirmation_rate;

-- Weekly bookings trend
SELECT 
  strftime('%Y-W%W', b.booking_date) as week,
  COUNT(*) as bookings,
  SUM(p.amount) as revenue
FROM bookings b
LEFT JOIN payments p ON b.id = p.booking_id AND p.status = 'completed'
WHERE b.status = 'confirmed'
GROUP BY strftime('%Y-W%W', b.booking_date)
ORDER BY week DESC
LIMIT 12;

-- ========================================
-- 12. USEFUL ADMIN QUERIES
-- ========================================

-- Bookings today (quick overview)
SELECT 
  b.start_time,
  b.end_time,
  CONCAT('Court ', b.court_number) as court,
  u.name,
  b.duration_hours,
  b.status
FROM bookings b
JOIN users u ON b.user_id = u.id
WHERE b.booking_date = DATE('now')
ORDER BY b.start_time;

-- Pending payments
SELECT 
  p.id,
  p.reference_number,
  u.name,
  p.amount,
  p.created_at
FROM payments p
JOIN users u ON p.user_id = u.id
WHERE p.status = 'pending'
ORDER BY p.created_at DESC;

-- No-shows (booked but not checked in)
SELECT 
  b.id,
  b.booking_date,
  b.start_time,
  u.name,
  u.phone
FROM bookings b
JOIN users u ON b.user_id = u.id
LEFT JOIN time_tracking t ON b.id = t.booking_id
WHERE b.status = 'confirmed'
AND b.booking_date < DATE('now')
AND t.check_in_time IS NULL;

-- Courts utilization
SELECT 
  b.court_number,
  COUNT(*) as total_bookings,
  SUM(b.duration_hours) as total_hours,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM bookings WHERE booking_date >= DATE('now', '-30 days')), 2) as utilization_percent
FROM bookings b
WHERE b.booking_date >= DATE('now', '-30 days')
AND b.status = 'confirmed'
GROUP BY b.court_number
ORDER BY utilization_percent DESC;

-- Peak hours (when courts are most booked)
SELECT 
  b.start_time,
  COUNT(*) as bookings,
  COUNT(DISTINCT b.court_number) as courts_used
FROM bookings b
WHERE b.status = 'confirmed'
AND b.booking_date >= DATE('now', '-7 days')
GROUP BY b.start_time
ORDER BY bookings DESC;

-- ========================================
-- END OF ADMIN DASHBOARD SQL
-- ========================================
