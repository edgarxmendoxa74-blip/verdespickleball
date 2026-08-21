import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

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
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  });
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

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true, token: 'admin-token-' + Date.now() });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Get all bookings (admin)
app.get('/api/admin/bookings', async (req, res) => {
  try {
    const bookings = await dbAll(
      `SELECT b.*, u.name, u.email, u.phone, p.status as payment_status, t.check_in_time, t.check_out_time, t.actual_duration_minutes
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       LEFT JOIN payments p ON b.id = p.booking_id
       LEFT JOIN time_tracking t ON b.id = t.booking_id
       ORDER BY b.booking_date DESC, b.start_time DESC`
    );

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching admin bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Check in user
app.post('/api/admin/checkin', async (req, res) => {
  try {
    const { bookingId } = req.body;

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

// Get dashboard statistics
app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalBookings = await dbGet('SELECT COUNT(*) as count FROM bookings');
    const completedBookings = await dbGet('SELECT COUNT(*) as count FROM bookings WHERE status = ?', ['confirmed']);
    const totalRevenue = await dbGet('SELECT SUM(amount) as total FROM payments WHERE status = ?', ['completed']);
    const todayBookings = await dbGet(
      'SELECT COUNT(*) as count FROM bookings WHERE booking_date = DATE(?)',
      [new Date().toISOString().split('T')[0]]
    );

    res.json({
      totalBookings: totalBookings.count,
      completedBookings: completedBookings.count,
      totalRevenue: totalRevenue.total || 0,
      todayBookings: todayBookings.count
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Initialize and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Velarde Courtside server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
