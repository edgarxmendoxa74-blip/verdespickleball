import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { setupAdminRoutes } from './admin-api.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database initialization
let db;

function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
      if (err) reject(err);
      
      db.serialize(() => {
        // Users table
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Bookings table
        db.run(`
          CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            court_number INTEGER NOT NULL,
            booking_date DATE NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            duration_hours INTEGER NOT NULL,
            price_amount REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `);

        // Payments table
        db.run(`
          CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            booking_id TEXT NOT NULL UNIQUE,
            user_id TEXT NOT NULL,
            amount REAL NOT NULL,
            payment_method TEXT DEFAULT 'gcash',
            status TEXT DEFAULT 'pending',
            reference_number TEXT,
            gcash_transaction_id TEXT,
            paid_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (booking_id) REFERENCES bookings(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `);

        // Time tracking table
        db.run(`
          CREATE TABLE IF NOT EXISTS time_tracking (
            id TEXT PRIMARY KEY,
            booking_id TEXT NOT NULL UNIQUE,
            check_in_time DATETIME,
            check_out_time DATETIME,
            actual_duration_minutes INTEGER,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (booking_id) REFERENCES bookings(id)
          )
        `);

        // Courts table
        db.run(`
          CREATE TABLE IF NOT EXISTS courts (
            id TEXT PRIMARY KEY,
            court_number INTEGER UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            capacity INTEGER DEFAULT 4,
            surface_type TEXT,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME
          )
        `);

        // Pricing table
        db.run(`
          CREATE TABLE IF NOT EXISTS pricing (
            id TEXT PRIMARY KEY,
            duration_hours INTEGER NOT NULL,
            price_amount REAL NOT NULL,
            day_type TEXT DEFAULT 'weekday',
            description TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME
          )
        `);

        // Payment methods table
        db.run(`
          CREATE TABLE IF NOT EXISTS payment_methods (
            id TEXT PRIMARY KEY,
            method_name TEXT NOT NULL,
            description TEXT,
            instructions TEXT,
            account_details TEXT,
            is_active INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME
          )
        `);

        // Website settings table
        db.run(`
          CREATE TABLE IF NOT EXISTS website_settings (
            id TEXT PRIMARY KEY,
            site_name TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            operating_hours_start TEXT DEFAULT '07:00',
            operating_hours_end TEXT DEFAULT '19:00',
            site_description TEXT,
            about_text TEXT,
            terms_text TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME
          )
        `);

        // Admin accounts table
        db.run(`
          CREATE TABLE IF NOT EXISTS admin_accounts (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT,
            full_name TEXT,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            is_active INTEGER DEFAULT 1,
            last_login DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME
          )
        `);

        // Admin activity log table
        db.run(`
          CREATE TABLE IF NOT EXISTS admin_logs (
            id TEXT PRIMARY KEY,
            admin_id TEXT,
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, async (err) => {
          if (err) { reject(err); return; }
          try {
            // Apply schema migrations (ignore errors if columns exist)
            await new Promise(r => db.run("ALTER TABLE courts ADD COLUMN image_url TEXT", () => r()));
            await new Promise(r => db.run("ALTER TABLE website_settings ADD COLUMN logo_url TEXT", () => r()));
            await new Promise(r => db.run("ALTER TABLE payment_methods ADD COLUMN qr_code_url TEXT", () => r()));
            
            await seedDefaultData();
            resolve();
          } catch (seedErr) {
            reject(seedErr);
          }
        });
      });
    });
  });
}

async function seedDefaultData() {
  const courtsCount = await dbGet('SELECT COUNT(*) as count FROM courts');
  if (courtsCount.count === 0) {
    const courtNames = ['Court 1 - Main', 'Court 2 - Main', 'Court 3 - Side', 'Court 4 - Side'];
    for (let i = 0; i < courtNames.length; i++) {
      await dbRun(
        `INSERT INTO courts (id, court_number, name, description, capacity, surface_type, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), i + 1, courtNames[i], null, 4, 'Acrylic', 'active']
      );
    }
    console.log('✅ Seeded default courts');
  }

  const pricingCount = await dbGet('SELECT COUNT(*) as count FROM pricing');
  if (pricingCount.count === 0) {
    const rates = [
      [1, 250, 'weekday', 'Regular Rate'],
      [1, 300, 'weekend', 'Weekend Rate'],
      [2, 450, 'weekday', '2-Hour Weekday'],
      [2, 550, 'weekend', '2-Hour Weekend']
    ];
    for (const [hours, amount, dayType, desc] of rates) {
      await dbRun(
        `INSERT INTO pricing (id, duration_hours, price_amount, day_type, description, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [uuidv4(), hours, amount, dayType, desc]
      );
    }
    console.log('✅ Seeded default pricing');
  }

  const methodsCount = await dbGet('SELECT COUNT(*) as count FROM payment_methods');
  if (methodsCount.count === 0) {
    await dbRun(
      `INSERT INTO payment_methods (id, method_name, description, instructions, account_details, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, 1, 0)`,
      [uuidv4(), 'GCash', 'Pay instantly via GCash QR', 'Scan the GCash QR code and enter the reference number below.', '09171234567']
    );
    await dbRun(
      `INSERT INTO payment_methods (id, method_name, description, instructions, account_details, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, 1, 1)`,
      [uuidv4(), 'Pay at Counter', 'Reserve now and pay at the venue', 'Pay in cash at the front desk before your session starts.', null]
    );
    console.log('✅ Seeded default payment methods');
  }

  const settingsCount = await dbGet('SELECT COUNT(*) as count FROM website_settings');
  if (settingsCount.count === 0) {
    await dbRun(
      `INSERT INTO website_settings (id, site_name, phone, email, address, operating_hours_start, operating_hours_end, site_description, about_text, terms_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        'Velarde Courtside',
        '',
        '',
        '',
        '07:00',
        '19:00',
        'Premium indoor pickleball courts with flexible hourly rates and instant online booking.',
        'Velarde Courtside offers 4 premium pickleball courts open daily from 7AM to 7PM. Book online in under a minute.',
        'All bookings are final once confirmed. Please arrive 10 minutes before your scheduled time. Cancellations must be made at least 2 hours in advance.'
      ]
    );
    console.log('✅ Seeded default website settings');
  }

  const adminsCount = await dbGet('SELECT COUNT(*) as count FROM admin_accounts');
  if (adminsCount.count === 0) {
    await dbRun(
      `INSERT INTO admin_accounts (id, username, email, full_name, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [uuidv4(), 'admin', 'admin@velardecourtside.com', 'System Administrator', process.env.ADMIN_PASSWORD || 'admin123', 'super_admin']
    );
    console.log('✅ Seeded default admin account (admin / admin123)');
  }
}

// Helper function for database queries
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

// ===== USER ROUTES =====

// Create user or get existing
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists
    const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.json({ id: existing.id, message: 'User already exists' });
    }

    const userId = uuidv4();
    await dbRun(
      'INSERT INTO users (id, name, email, phone) VALUES (?, ?, ?, ?)',
      [userId, name, email, phone]
    );

    res.status(201).json({ id: userId, name, email, phone });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ===== BOOKING ROUTES =====

// Get available time slots
app.get('/api/available-slots/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Define working hours (7 AM to 7 PM)
    const workingHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    const bookedSlots = await dbAll(
      `SELECT start_time, end_time FROM bookings 
       WHERE booking_date = ? AND status != 'cancelled'`,
      [date]
    );

    const availableSlots = [];
    for (let hour of workingHours) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      const isBooked = bookedSlots.some(slot => {
        return slot.start_time <= timeStr && timeStr < slot.end_time;
      });
      if (!isBooked) {
        availableSlots.push(timeStr);
      }
    }

    res.json({ date, availableSlots });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
});

// Create booking
app.post('/api/bookings', async (req, res) => {
  try {
    const { userId, courtNumber, bookingDate, startTime, endTime, durationHours, priceAmount } = req.body;

    if (!userId || !courtNumber || !bookingDate || !startTime || !endTime || !durationHours || !priceAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const bookingId = uuidv4();
    await dbRun(
      `INSERT INTO bookings (id, user_id, court_number, booking_date, start_time, end_time, duration_hours, price_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [bookingId, userId, courtNumber, bookingDate, startTime, endTime, durationHours, priceAmount]
    );

    // Create payment record
    const paymentId = uuidv4();
    await dbRun(
      `INSERT INTO payments (id, booking_id, user_id, amount, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [paymentId, bookingId, userId, priceAmount]
    );

    res.status(201).json({
      bookingId,
      paymentId,
      courtNumber,
      bookingDate,
      startTime,
      endTime,
      priceAmount,
      status: 'pending'
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Get user bookings
app.get('/api/bookings/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const bookings = await dbAll(
      `SELECT b.*, p.status as payment_status, p.id as payment_id 
       FROM bookings b 
       LEFT JOIN payments p ON b.id = p.booking_id
       WHERE b.user_id = ? 
       ORDER BY b.booking_date DESC`,
      [userId]
    );

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// ===== PAYMENT ROUTES =====

// Process GCash payment
app.post('/api/payments/process', async (req, res) => {
  try {
    const { paymentId, bookingId, userId, amount, gcashReference } = req.body;

    if (!paymentId || !bookingId || !userId || !amount || !gcashReference) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Update payment status to completed
    await dbRun(
      `UPDATE payments 
       SET status = 'completed', reference_number = ?, paid_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [gcashReference, paymentId]
    );

    // Update booking status to confirmed
    await dbRun(
      `UPDATE bookings SET status = 'confirmed' WHERE id = ?`,
      [bookingId]
    );

    // Create time tracking record
    const trackingId = uuidv4();
    await dbRun(
      `INSERT INTO time_tracking (id, booking_id) VALUES (?, ?)`,
      [trackingId, bookingId]
    );

    res.json({
      success: true,
      message: 'Payment processed successfully',
      bookingId,
      paymentId,
      status: 'completed'
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// Mark payment as pay-at-counter (stays pending until paid at venue)
app.post('/api/payments/counter', async (req, res) => {
  try {
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'Missing paymentId' });
    }

    await dbRun(
      `UPDATE payments SET payment_method = 'counter' WHERE id = ?`,
      [paymentId]
    );

    res.json({
      success: true,
      message: 'Reservation saved. Payment pending at counter.',
      paymentId,
      status: 'pending'
    });
  } catch (error) {
    console.error('Error setting counter payment:', error);
    res.status(500).json({ error: 'Failed to set counter payment' });
  }
});

// Get payment status
app.get('/api/payments/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await dbGet(
      'SELECT * FROM payments WHERE id = ?',
      [paymentId]
    );

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// ===== ADMIN ROUTES =====
// Courts, pricing, payment methods, website settings, accounts,
// activity log and stats routes are registered via setupAdminRoutes() below.

// Check in user
app.post('/api/admin/checkin', async (req, res) => {
  try {
    const { bookingId } = req.body;

    // Ensure a tracking record exists for this booking
    const existing = await dbGet('SELECT id FROM time_tracking WHERE booking_id = ?', [bookingId]);
    if (!existing) {
      await dbRun('INSERT INTO time_tracking (id, booking_id) VALUES (?, ?)', [uuidv4(), bookingId]);
    }

    await dbRun(
      `UPDATE time_tracking 
       SET check_in_time = CURRENT_TIMESTAMP
       WHERE booking_id = ?`,
      [bookingId]
    );

    res.json({ success: true, message: 'User checked in' });
  } catch (error) {
    console.error('Error checking in:', error);
    res.status(500).json({ error: 'Failed to check in' });
  }
});

// Check out user
app.post('/api/admin/checkout', async (req, res) => {
  try {
    const { bookingId } = req.body;

    const tracking = await dbGet(
      'SELECT check_in_time FROM time_tracking WHERE booking_id = ?',
      [bookingId]
    );

    if (!tracking || !tracking.check_in_time) {
      return res.status(400).json({ error: 'User has not checked in' });
    }

    const checkInTime = new Date(tracking.check_in_time);
    const checkOutTime = new Date();
    const durationMinutes = Math.round((checkOutTime - checkInTime) / (1000 * 60));

    await dbRun(
      `UPDATE time_tracking 
       SET check_out_time = CURRENT_TIMESTAMP, actual_duration_minutes = ?
       WHERE booking_id = ?`,
      [durationMinutes, bookingId]
    );

    res.json({
      success: true,
      message: 'User checked out',
      actualDuration: durationMinutes,
      durationHours: (durationMinutes / 60).toFixed(2)
    });
  } catch (error) {
    console.error('Error checking out:', error);
    res.status(500).json({ error: 'Failed to check out' });
  }
});

// Cancel booking
app.post('/api/admin/cancel-booking', async (req, res) => {
  try {
    const { bookingId } = req.body;

    await dbRun(
      'UPDATE bookings SET status = ? WHERE id = ?',
      ['cancelled', bookingId]
    );

    res.json({ success: true, message: 'Booking cancelled' });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// Initialize and start server
initDatabase().then(() => {
  setupAdminRoutes(app, db);
  app.listen(PORT, () => {
    console.log(`✅ Velarde Courtside server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
