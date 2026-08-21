import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
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

        // Time tracking table (for admin)
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
          else resolve(db);
        });
      });
    });
  });
}

export function getDatabase() {
  return sqlite3.Database;
}
