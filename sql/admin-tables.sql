-- ========================================
-- ADMIN DASHBOARD MANAGEMENT TABLES
-- ========================================

-- Website Settings Table
CREATE TABLE IF NOT EXISTS website_settings (
  id TEXT PRIMARY KEY,
  site_name VARCHAR(255) NOT NULL DEFAULT 'Velarde Courtside',
  site_description TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  operating_hours_start TEXT DEFAULT '07:00',
  operating_hours_end TEXT DEFAULT '19:00',
  logo_url VARCHAR(500),
  about_text TEXT,
  terms_text TEXT,
  privacy_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Courts Management Table
CREATE TABLE IF NOT EXISTS courts (
  id TEXT PRIMARY KEY,
  court_number INTEGER NOT NULL UNIQUE CHECK (court_number BETWEEN 1 AND 10),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  capacity INTEGER DEFAULT 4,
  surface_type VARCHAR(100),
  amenities TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
  image_url VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pricing Table
CREATE TABLE IF NOT EXISTS pricing (
  id TEXT PRIMARY KEY,
  duration_hours INTEGER NOT NULL UNIQUE CHECK (duration_hours > 0),
  price_amount DECIMAL(10, 2) NOT NULL,
  day_type VARCHAR(50) DEFAULT 'weekday' CHECK (day_type IN ('weekday', 'weekend', 'holiday')),
  description VARCHAR(255),
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  method_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  instructions TEXT,
  account_details TEXT,
  qr_code_url VARCHAR(500),
  is_active BOOLEAN DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin Accounts Table
CREATE TABLE IF NOT EXISTS admin_accounts (
  id TEXT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'manager')),
  permissions TEXT,
  is_active BOOLEAN DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin Activity Log
CREATE TABLE IF NOT EXISTS admin_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id TEXT,
  old_values TEXT,
  new_values TEXT,
  ip_address VARCHAR(45),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admin_accounts(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_courts_court_number ON courts(court_number);
CREATE INDEX IF NOT EXISTS idx_courts_status ON courts(status);
CREATE INDEX IF NOT EXISTS idx_pricing_duration ON pricing(duration_hours);
CREATE INDEX IF NOT EXISTS idx_pricing_active ON pricing(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON payment_methods(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_username ON admin_accounts(username);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- Insert sample data
INSERT OR IGNORE INTO website_settings (id, site_name, phone, email, address, operating_hours_start, operating_hours_end, site_description, about_text)
VALUES ('default-settings', 'Velarde Courtside', '+639123456789', 'info@velardepickleball.com', '123 Main St, City', '07:00', '19:00', 'Welcome to Velarde Courtside Pickleball', 'Your premier pickleball facility');

INSERT OR IGNORE INTO courts (id, court_number, name, description, capacity, surface_type, status)
VALUES 
  ('court-1', 1, 'Court 1', 'Premium court', 4, 'Acrylic', 'active'),
  ('court-2', 2, 'Court 2', 'Standard court', 4, 'Acrylic', 'active'),
  ('court-3', 3, 'Court 3', 'Standard court', 4, 'Acrylic', 'active'),
  ('court-4', 4, 'Court 4', 'Practice court', 4, 'Clay', 'active');

INSERT OR IGNORE INTO pricing (id, duration_hours, price_amount, day_type, description, is_active)
VALUES 
  ('price-1', 1, 500, 'weekday', 'One hour weekday rate', 1),
  ('price-2', 2, 900, 'weekday', 'Two hour weekday rate', 1),
  ('price-3', 3, 1200, 'weekday', 'Three hour weekday rate', 1),
  ('price-4', 1, 600, 'weekend', 'One hour weekend rate', 1),
  ('price-5', 2, 1100, 'weekend', 'Two hour weekend rate', 1);

INSERT OR IGNORE INTO payment_methods (id, method_name, description, instructions, account_details, is_active)
VALUES 
  ('gcash', 'GCash', 'Pay via GCash mobile wallet', 'Send payment to the provided GCash account number', '09171234567', 1),
  ('bank', 'Bank Transfer', 'Transfer via bank account', 'Use the provided bank account details', 'BDO: 123-456-789012', 1);

INSERT OR IGNORE INTO admin_accounts (id, username, email, full_name, password_hash, role, is_active)
VALUES 
  ('admin-default', 'admin', 'admin@velardepickleball.com', 'Administrator', 'admin123', 'super_admin', 1);

-- Verify tables exist
-- SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
