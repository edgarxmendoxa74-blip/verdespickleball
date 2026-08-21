-- ========================================
-- ADMIN DASHBOARD MANAGEMENT TABLES
-- SUPABASE POSTGRESQL COMPATIBLE VERSION
-- ========================================

-- Website Settings Table
CREATE TABLE IF NOT EXISTS website_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name VARCHAR(255) NOT NULL DEFAULT 'Velarde Courtside',
  site_description TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  operating_hours_start TIME DEFAULT '07:00'::time,
  operating_hours_end TIME DEFAULT '19:00'::time,
  logo_url VARCHAR(500),
  about_text TEXT,
  terms_text TEXT,
  privacy_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courts Management Table
CREATE TABLE IF NOT EXISTS courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_number INTEGER NOT NULL UNIQUE CHECK (court_number BETWEEN 1 AND 10),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  capacity INTEGER DEFAULT 4,
  surface_type VARCHAR(100),
  amenities TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pricing Table
CREATE TABLE IF NOT EXISTS pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duration_hours INTEGER NOT NULL UNIQUE CHECK (duration_hours > 0),
  price_amount NUMERIC(10, 2) NOT NULL,
  day_type VARCHAR(50) DEFAULT 'weekday' CHECK (day_type IN ('weekday', 'weekend', 'holiday')),
  description VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  instructions TEXT,
  account_details TEXT,
  qr_code_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin Accounts Table
CREATE TABLE IF NOT EXISTS admin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'manager')),
  permissions TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin Activity Log
CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_accounts(id) ON DELETE CASCADE,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_courts_court_number ON courts(court_number);
CREATE INDEX IF NOT EXISTS idx_courts_status ON courts(status);
CREATE INDEX IF NOT EXISTS idx_pricing_duration ON pricing(duration_hours);
CREATE INDEX IF NOT EXISTS idx_pricing_active ON pricing(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON payment_methods(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_username ON admin_accounts(username);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- ========================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ========================================

ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for development)
-- WARNING: For production, implement proper authentication policies

-- ========================================
-- CREATE RLS POLICIES (drop and recreate)
-- ========================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Enable read for all users" ON website_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON website_settings;
DROP POLICY IF EXISTS "Enable update for authenticated" ON website_settings;

DROP POLICY IF EXISTS "Enable read for all users" ON courts;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON courts;
DROP POLICY IF EXISTS "Enable update for authenticated" ON courts;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON courts;

DROP POLICY IF EXISTS "Enable read for all users" ON pricing;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON pricing;
DROP POLICY IF EXISTS "Enable update for authenticated" ON pricing;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON pricing;

DROP POLICY IF EXISTS "Enable read for all users" ON payment_methods;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON payment_methods;
DROP POLICY IF EXISTS "Enable update for authenticated" ON payment_methods;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON payment_methods;

DROP POLICY IF EXISTS "Enable read for all users" ON admin_accounts;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON admin_accounts;
DROP POLICY IF EXISTS "Enable update for authenticated" ON admin_accounts;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON admin_accounts;

DROP POLICY IF EXISTS "Enable read for all users" ON admin_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON admin_logs;

-- ========================================
-- CREATE RLS POLICIES (drop and recreate)
-- ========================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Enable read for all users" ON website_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON website_settings;
DROP POLICY IF EXISTS "Enable update for authenticated" ON website_settings;

DROP POLICY IF EXISTS "Enable read for all users" ON courts;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON courts;
DROP POLICY IF EXISTS "Enable update for authenticated" ON courts;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON courts;

DROP POLICY IF EXISTS "Enable read for all users" ON pricing;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON pricing;
DROP POLICY IF EXISTS "Enable update for authenticated" ON pricing;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON pricing;

DROP POLICY IF EXISTS "Enable read for all users" ON payment_methods;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON payment_methods;
DROP POLICY IF EXISTS "Enable update for authenticated" ON payment_methods;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON payment_methods;

DROP POLICY IF EXISTS "Enable read for all users" ON admin_accounts;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON admin_accounts;
DROP POLICY IF EXISTS "Enable update for authenticated" ON admin_accounts;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON admin_accounts;

DROP POLICY IF EXISTS "Enable read for all users" ON admin_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON admin_logs;

-- Website Settings policies
CREATE POLICY "Enable read for all users" ON website_settings FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated" ON website_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated" ON website_settings FOR UPDATE USING (true);

-- Courts policies
CREATE POLICY "Enable read for all users" ON courts FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated" ON courts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated" ON courts FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated" ON courts FOR DELETE USING (true);

-- Pricing policies
CREATE POLICY "Enable read for all users" ON pricing FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated" ON pricing FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated" ON pricing FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated" ON pricing FOR DELETE USING (true);

-- Payment methods policies
CREATE POLICY "Enable read for all users" ON payment_methods FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated" ON payment_methods FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated" ON payment_methods FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated" ON payment_methods FOR DELETE USING (true);

-- Admin accounts policies
CREATE POLICY "Enable read for all users" ON admin_accounts FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated" ON admin_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated" ON admin_accounts FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated" ON admin_accounts FOR DELETE USING (true);

-- Admin logs policies
CREATE POLICY "Enable read for all users" ON admin_logs FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated" ON admin_logs FOR INSERT WITH CHECK (true);

-- ========================================
-- INSERT SAMPLE DATA (PostgreSQL Compatible)
-- ========================================

INSERT INTO website_settings (site_name, phone, email, address, operating_hours_start, operating_hours_end, site_description, about_text)
VALUES ('Velarde Courtside', '+639123456789', 'info@velardepickleball.com', '123 Main St, City', '07:00', '19:00', 'Welcome to Velarde Courtside Pickleball', 'Your premier pickleball facility')
ON CONFLICT DO NOTHING;

INSERT INTO courts (court_number, name, description, capacity, surface_type, status)
VALUES 
  (1, 'Court 1', 'Premium court', 4, 'Acrylic', 'active'),
  (2, 'Court 2', 'Standard court', 4, 'Acrylic', 'active'),
  (3, 'Court 3', 'Standard court', 4, 'Acrylic', 'active'),
  (4, 'Court 4', 'Practice court', 4, 'Clay', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO pricing (duration_hours, price_amount, day_type, description, is_active)
VALUES 
  (1, 500, 'weekday', 'One hour weekday rate', true),
  (2, 900, 'weekday', 'Two hour weekday rate', true),
  (3, 1200, 'weekday', 'Three hour weekday rate', true),
  (1, 600, 'weekend', 'One hour weekend rate', true),
  (2, 1100, 'weekend', 'Two hour weekend rate', true)
ON CONFLICT DO NOTHING;

INSERT INTO payment_methods (method_name, description, instructions, account_details, is_active)
VALUES 
  ('GCash', 'Pay via GCash mobile wallet', 'Send payment to the provided GCash account number', '09171234567', true),
  ('Bank Transfer', 'Transfer via bank account', 'Use the provided bank account details', 'BDO: 123-456-789012', true)
ON CONFLICT DO NOTHING;

INSERT INTO admin_accounts (username, email, full_name, password_hash, role, is_active)
VALUES 
  ('admin', 'admin@velardepickleball.com', 'Administrator', 'admin123', 'super_admin', true)
ON CONFLICT DO NOTHING;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Run these to verify the setup:

-- Check all tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_type = 'BASE TABLE' 
-- ORDER BY table_name;

-- Check admin accounts
-- SELECT id, username, email, role, is_active FROM admin_accounts;

-- Check courts
-- SELECT court_number, name, status FROM courts ORDER BY court_number;

-- Check pricing
-- SELECT duration_hours, price_amount, day_type FROM pricing ORDER BY duration_hours;

-- Check payment methods
-- SELECT method_name, is_active FROM payment_methods;

-- ========================================
-- END OF ADMIN TABLES SETUP - SUPABASE VERSION
-- ========================================
