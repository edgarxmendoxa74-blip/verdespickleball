# Velarde Courtside - Supabase Setup Guide

## Overview

This project uses **Supabase** as the backend database. Supabase is a Firebase alternative built on PostgreSQL with real-time capabilities.

Your credentials are already configured in `.env`:
```env
VITE_SUPABASE_URL=https://ljgdjbuavmmnnzmiggxo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_QViaPI0uFrLYjL5P47HVHQ_pWr0RV8F
```

## Step-by-Step Setup

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase project: https://app.supabase.com
2. Select your project: **verdespickleball**
3. Click on **"SQL Editor"** (left sidebar)
4. Click **"New Query"**

### Step 2: Create Database Schema

1. Copy the entire content from: `sql/schema.sql`
2. Paste it into the SQL Editor
3. Click **"Run"** button
4. Wait for completion (you should see a green checkmark)

**Tables created:**
- ✅ `users` - Customer information
- ✅ `bookings` - Court reservations
- ✅ `payments` - Payment records
- ✅ `time_tracking` - Check-in/check-out records

### Step 3: Verify Tables Were Created

Run this query in SQL Editor to verify:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:
- bookings
- payments
- time_tracking
- users

### Step 4: Test Sample Data (Optional)

To populate with test data, run in SQL Editor:

```sql
-- Insert test user
INSERT INTO users (name, email, phone) VALUES
  ('Juan Dela Cruz', 'juan@example.com', '+639123456789');

-- Insert test booking
INSERT INTO bookings (user_id, court_number, booking_date, start_time, end_time, duration_hours, price_amount, status)
SELECT id, 1, CURRENT_DATE + INTERVAL '1 day', '09:00'::time, '11:00'::time, 2, 900, 'confirmed'
FROM users WHERE email = 'juan@example.com';

-- Insert test payment
INSERT INTO payments (booking_id, user_id, amount, status, reference_number, paid_at)
SELECT b.id, b.user_id, b.price_amount, 'completed', 'GCH-TEST-001', CURRENT_TIMESTAMP
FROM bookings b WHERE b.user_id = (SELECT id FROM users WHERE email = 'juan@example.com');

-- Insert test time tracking
INSERT INTO time_tracking (booking_id, check_in_time, check_out_time)
SELECT id, CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP
FROM bookings LIMIT 1;
```

## Database Tables Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Bookings Table
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  court_number INTEGER (1-4),
  booking_date DATE,
  start_time TIME,
  end_time TIME,
  duration_hours INTEGER,
  price_amount DECIMAL(10,2),
  status VARCHAR (pending|confirmed|cancelled),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Payments Table
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  booking_id UUID UNIQUE REFERENCES bookings(id),
  user_id UUID REFERENCES users(id),
  amount DECIMAL(10,2),
  payment_method VARCHAR (default: gcash),
  status VARCHAR (pending|completed|failed),
  reference_number VARCHAR(255),
  gcash_transaction_id VARCHAR(255),
  paid_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Time Tracking Table
```sql
CREATE TABLE time_tracking (
  id UUID PRIMARY KEY,
  booking_id UUID UNIQUE REFERENCES bookings(id),
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  actual_duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Available Views

The schema creates these views for easy data querying:

### dashboard_overview
```sql
SELECT * FROM dashboard_overview;
-- Returns: total_bookings, confirmed_bookings, total_revenue, today_bookings, total_users
```

### today_schedule
```sql
SELECT * FROM today_schedule;
-- Returns: Today's bookings with guest and payment details
```

### all_bookings_detail
```sql
SELECT * FROM all_bookings_detail;
-- Returns: All bookings with complete details including time tracking
```

### revenue_by_date
```sql
SELECT * FROM revenue_by_date;
-- Returns: Revenue analytics grouped by date
```

### court_utilization
```sql
SELECT * FROM court_utilization;
-- Returns: Court usage statistics for the last 30 days
```

### time_tracking_analytics
```sql
SELECT * FROM time_tracking_analytics;
-- Returns: Comparison of booked vs actual time
```

## Available Functions

### get_available_slots()
Get available time slots for a specific date:

```sql
SELECT * FROM get_available_slots('2026-08-21'::date);
-- Returns list of available times (e.g., 07:00, 08:00, 09:00, etc.)
```

## Admin Dashboard SQL Queries

All queries from `sql/admin-dashboard.sql` can now be run directly on Supabase:

### 1. Dashboard Statistics
```sql
SELECT * FROM dashboard_overview;
```

### 2. Today's Schedule
```sql
SELECT * FROM today_schedule;
```

### 3. All Bookings
```sql
SELECT * FROM all_bookings_detail;
```

### 4. Time Tracking
```sql
-- Get time tracking for today
SELECT * FROM time_tracking_analytics WHERE booking_date = CURRENT_DATE;
```

### 5. Revenue Analytics
```sql
SELECT * FROM revenue_by_date LIMIT 30;
```

### 6. Court Utilization
```sql
SELECT * FROM court_utilization;
```

## Connecting to Backend

To connect your Node.js backend to Supabase, install the client:

```bash
npm install @supabase/supabase-js
```

Update your API endpoints to use Supabase:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

// Example: Get all bookings
const { data, error } = await supabase
  .from('bookings')
  .select('*')
  .order('booking_date', { ascending: false });
```

## Common Operations

### Create a Booking
```sql
INSERT INTO bookings (
  user_id, court_number, booking_date, start_time, end_time, 
  duration_hours, price_amount, status
) VALUES (
  'user-uuid', 1, '2026-08-21', '09:00', '11:00', 2, 900, 'pending'
);
```

### Update Booking Status
```sql
UPDATE bookings 
SET status = 'confirmed' 
WHERE id = 'booking-uuid';
```

### Process Payment
```sql
UPDATE payments 
SET status = 'completed', paid_at = NOW() 
WHERE booking_id = 'booking-uuid';
```

### Check In User
```sql
UPDATE time_tracking 
SET check_in_time = NOW() 
WHERE booking_id = 'booking-uuid';
```

### Check Out User
```sql
UPDATE time_tracking 
SET check_out_time = NOW() 
WHERE booking_id = 'booking-uuid';
```

## Troubleshooting

### Tables Don't Exist
**Problem:** "relation does not exist"
**Solution:** Run `sql/schema.sql` in Supabase SQL Editor

### Permission Denied Errors
**Problem:** Row Level Security (RLS) policies blocking access
**Solution:** 
1. Go to Supabase dashboard
2. Click "Authentication" → "Policies"
3. Ensure policies allow public access (for development)

### Can't Connect from Frontend
**Problem:** CORS or connection errors
**Solution:**
1. Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env
2. Verify they match your Supabase project settings
3. Check RLS policies are configured

### Real-time Not Working
**Problem:** Real-time subscriptions not updating
**Solution:**
1. Enable real-time for tables: Supabase Dashboard → Tables → (Table name) → Enable Realtime
2. Ensure SUPABASE_SECRET_KEY is set on backend

## Useful Supabase Dashboard Links

- Project Dashboard: https://app.supabase.com
- SQL Editor: https://app.supabase.com/project/[project-id]/sql
- Database Browser: https://app.supabase.com/project/[project-id]/editor
- Authentication: https://app.supabase.com/project/[project-id]/auth/users

## Best Practices

1. **Backup Data Regularly**
   - Use Supabase's backup feature in Settings
   
2. **Enable RLS in Production**
   - Current setup uses permissive policies (development only)
   - Implement proper authentication policies before going live

3. **Monitor Performance**
   - Check slow query logs in Supabase Dashboard
   - Add indexes for frequently queried columns

4. **Use Views for Complex Queries**
   - Simpler for frontend developers
   - Better query optimization

5. **Set Up Triggers for Automation**
   - Auto-calculate durations
   - Auto-update timestamps

## Next Steps

1. ✅ Create schema using `sql/schema.sql`
2. ✅ Verify tables and views
3. ✅ Insert sample data (optional)
4. ✅ Connect frontend to Supabase
5. ✅ Update backend API to use Supabase queries
6. ✅ Test admin dashboard queries
7. ✅ Set up real-time subscriptions
8. ✅ Deploy to production

## Support

For Supabase documentation: https://supabase.com/docs

For issues specific to this project, check:
- `README.md` - Project overview
- `DEPLOYMENT.md` - Deployment guide
- `sql/schema.sql` - Database schema
- `sql/admin-dashboard.sql` - All admin queries

---

**Ready to set up Supabase!** Follow Step 1-4 above to get started. 🚀
