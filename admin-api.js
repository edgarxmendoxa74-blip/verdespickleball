// Admin API Endpoints Extension
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'public', 'images', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

export function setupAdminRoutes(app, db) {
  const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });

  const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });

  // Activity logger
  const logActivity = async (adminId, action, entityType, entityId) => {
    try {
      await dbRun(
        'INSERT INTO admin_logs (id, admin_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), adminId || null, action, entityType || null, entityId || null]
      );
    } catch (err) {
      console.error('Failed to write activity log:', err.message);
    }
  };

  const currentAdminId = async () => {
    try {
      const admin = await dbGet("SELECT id FROM admin_accounts WHERE username = ? LIMIT 1", ['admin']);
      return admin ? admin.id : null;
    } catch {
      return null;
    }
  };

  // ===== FILE UPLOAD =====

  app.post('/api/admin/upload-image', upload.single('image'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      res.json({ url: `/images/uploads/${req.file.filename}` });
    } catch (error) {
      res.status(500).json({ error: 'Failed to upload image' });
    }
  });

  app.post('/api/admin/upload-logo', upload.single('logo'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      // Usually, you'd save it to a specific logo location or return the URL
      // We'll return the URL of the new upload and update the website settings
      res.json({ url: `/images/uploads/${req.file.filename}` });
    } catch (error) {
      res.status(500).json({ error: 'Failed to upload logo' });
    }
  });

  // ===== ADMIN LOGIN =====

  app.post('/api/admin/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

      const account = await dbGet('SELECT * FROM admin_accounts WHERE username = ?', [username]);
      if (!account || !account.is_active) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      if (account.password_hash !== password) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      await dbRun('UPDATE admin_accounts SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [account.id]);
      logActivity(account.id, 'login', 'admin_account', account.id);

      res.json({ success: true, token: 'admin-token-' + Date.now(), username: account.username, fullName: account.full_name, role: account.role });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // ===== WEBSITE SETTINGS =====
  
  app.get('/api/admin/website-settings', async (req, res) => {
    try {
      const settings = await dbGet(`
        SELECT * FROM website_settings 
        ORDER BY created_at DESC LIMIT 1
      `);
      
      res.json(settings || {
        site_name: 'Velarde Courtside',
        operating_hours_start: '07:00',
        operating_hours_end: '19:00'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.post('/api/admin/website-settings', async (req, res) => {
    try {
      const { site_name, phone, email, address, operating_hours_start, operating_hours_end, site_description, about_text, terms_text, logo_url } = req.body;
      
      const id = uuidv4();
      await dbRun(`
        INSERT OR REPLACE INTO website_settings 
        (id, site_name, phone, email, address, operating_hours_start, operating_hours_end, site_description, about_text, terms_text, logo_url, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [id, site_name, phone, email, address, operating_hours_start, operating_hours_end, site_description, about_text, terms_text, logo_url]);
      
      await logActivity(await currentAdminId(), 'update', 'Website settings', id);
      res.json({ success: true, message: 'Settings saved' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  // ===== COURTS MANAGEMENT =====
  
  app.get('/api/admin/courts', async (req, res) => {
    try {
      const courts = await dbAll(`
        SELECT * FROM courts ORDER BY court_number
      `);
      res.json(courts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch courts' });
    }
  });

  app.get('/api/admin/courts/:id', async (req, res) => {
    try {
      const court = await dbGet('SELECT * FROM courts WHERE id = ?', [req.params.id]);
      if (!court) return res.status(404).json({ error: 'Court not found' });
      res.json(court);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch court' });
    }
  });

  app.post('/api/admin/courts', async (req, res) => {
    try {
      const { court_number, name, description, capacity, surface_type, status, image_url } = req.body;
      const id = uuidv4();
      
      await dbRun(`
        INSERT INTO courts (id, court_number, name, description, capacity, surface_type, status, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, court_number, name, description, capacity || 4, surface_type, status || 'active', image_url]);
      
      await logActivity(await currentAdminId(), 'create', 'Court', id);
      res.status(201).json({ id, message: 'Court created' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create court' });
    }
  });

  app.put('/api/admin/courts/:id', async (req, res) => {
    try {
      const { court_number, name, description, capacity, surface_type, status, image_url } = req.body;
      
      await dbRun(`
        UPDATE courts 
        SET court_number = ?, name = ?, description = ?, capacity = ?, surface_type = ?, status = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [court_number, name, description, capacity, surface_type, status, image_url, req.params.id]);
      
      await logActivity(await currentAdminId(), 'update', 'Court', req.params.id);
      res.json({ success: true, message: 'Court updated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update court' });
    }
  });

  app.delete('/api/admin/courts/:id', async (req, res) => {
    try {
      await dbRun('DELETE FROM courts WHERE id = ?', [req.params.id]);
      await logActivity(await currentAdminId(), 'delete', 'Court', req.params.id);
      res.json({ success: true, message: 'Court deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete court' });
    }
  });

  // ===== PRICING MANAGEMENT =====
  
  app.get('/api/admin/pricing', async (req, res) => {
    try {
      const pricing = await dbAll(`
        SELECT * FROM pricing ORDER BY duration_hours
      `);
      res.json(pricing);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch pricing' });
    }
  });

  app.get('/api/admin/pricing/:id', async (req, res) => {
    try {
      const pricing = await dbGet('SELECT * FROM pricing WHERE id = ?', [req.params.id]);
      if (!pricing) return res.status(404).json({ error: 'Pricing not found' });
      res.json(pricing);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch pricing' });
    }
  });

  app.post('/api/admin/pricing', async (req, res) => {
    try {
      const { duration_hours, price_amount, day_type, description, is_active } = req.body;
      const id = uuidv4();
      
      await dbRun(`
        INSERT INTO pricing (id, duration_hours, price_amount, day_type, description, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id, duration_hours, price_amount, day_type || 'weekday', description, is_active !== false ? 1 : 0]);
      
      await logActivity(await currentAdminId(), 'create', 'Pricing', id);
      res.status(201).json({ id, message: 'Pricing created' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create pricing' });
    }
  });

  app.put('/api/admin/pricing/:id', async (req, res) => {
    try {
      const { duration_hours, price_amount, day_type, description, is_active } = req.body;
      
      await dbRun(`
        UPDATE pricing 
        SET duration_hours = ?, price_amount = ?, day_type = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [duration_hours, price_amount, day_type, description, is_active ? 1 : 0, req.params.id]);
      
      await logActivity(await currentAdminId(), 'update', 'Pricing', req.params.id);
      res.json({ success: true, message: 'Pricing updated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update pricing' });
    }
  });

  app.delete('/api/admin/pricing/:id', async (req, res) => {
    try {
      await dbRun('DELETE FROM pricing WHERE id = ?', [req.params.id]);
      await logActivity(await currentAdminId(), 'delete', 'Pricing', req.params.id);
      res.json({ success: true, message: 'Pricing deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete pricing' });
    }
  });

  // ===== PAYMENT METHODS =====
  
  app.get('/api/admin/payment-methods', async (req, res) => {
    try {
      const methods = await dbAll(`
        SELECT * FROM payment_methods ORDER BY sort_order
      `);
      res.json(methods);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
  });

  app.get('/api/admin/payment-methods/:id', async (req, res) => {
    try {
      const method = await dbGet('SELECT * FROM payment_methods WHERE id = ?', [req.params.id]);
      if (!method) return res.status(404).json({ error: 'Payment method not found' });
      res.json(method);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch payment method' });
    }
  });

  app.post('/api/admin/payment-methods', async (req, res) => {
    try {
      const { method_name, description, instructions, account_details, is_active, qr_code_url } = req.body;
      const id = uuidv4();
      
      await dbRun(`
        INSERT INTO payment_methods (id, method_name, description, instructions, account_details, is_active, qr_code_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [id, method_name, description, instructions, account_details, is_active !== false ? 1 : 0, qr_code_url]);
      
      await logActivity(await currentAdminId(), 'create', 'Payment method', id);
      res.status(201).json({ id, message: 'Payment method created' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create payment method' });
    }
  });

  app.put('/api/admin/payment-methods/:id', async (req, res) => {
    try {
      const { method_name, description, instructions, account_details, is_active, qr_code_url } = req.body;
      
      await dbRun(`
        UPDATE payment_methods 
        SET method_name = ?, description = ?, instructions = ?, account_details = ?, is_active = ?, qr_code_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [method_name, description, instructions, account_details, is_active ? 1 : 0, qr_code_url, req.params.id]);
      
      await logActivity(await currentAdminId(), 'update', 'Payment method', req.params.id);
      res.json({ success: true, message: 'Payment method updated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update payment method' });
    }
  });

  app.delete('/api/admin/payment-methods/:id', async (req, res) => {
    try {
      await dbRun('DELETE FROM payment_methods WHERE id = ?', [req.params.id]);
      await logActivity(await currentAdminId(), 'delete', 'Payment method', req.params.id);
      res.json({ success: true, message: 'Payment method deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete payment method' });
    }
  });

  // ===== BOOKINGS MANAGEMENT =====
  
  app.get('/api/admin/bookings', async (req, res) => {
    try {
      let query = `
        SELECT b.*, u.name, u.email, u.phone, p.status as payment_status, t.check_in_time, t.check_out_time, t.actual_duration_minutes
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        LEFT JOIN payments p ON b.id = p.booking_id
        LEFT JOIN time_tracking t ON b.id = t.booking_id
      `;
      
      const params = [];
      if (req.query.date) {
        query += ' WHERE b.booking_date = ?';
        params.push(req.query.date);
      }
      if (req.query.status) {
        query += params.length > 0 ? ' AND b.status = ?' : ' WHERE b.status = ?';
        params.push(req.query.status);
      }
      
      query += ' ORDER BY b.booking_date DESC, b.start_time DESC';
      const bookings = await dbAll(query, params);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  app.get('/api/admin/bookings/:id', async (req, res) => {
    try {
      const booking = await dbGet(`
        SELECT b.*, u.name, u.email, u.phone
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        WHERE b.id = ?
      `, [req.params.id]);
      
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      res.json(booking);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch booking' });
    }
  });

  app.put('/api/admin/bookings/:id', async (req, res) => {
    try {
      const { court_number, booking_date, start_time, duration_hours, status } = req.body;
      
      // Calculate end time
      const [hours] = start_time.split(':');
      const startHour = parseInt(hours);
      const endHour = startHour + parseInt(duration_hours);
      const endTime = `${endHour.toString().padStart(2, '0')}:00`;
      
      await dbRun(`
        UPDATE bookings 
        SET court_number = ?, booking_date = ?, start_time = ?, end_time = ?, duration_hours = ?, status = ?
        WHERE id = ?
      `, [court_number, booking_date, start_time, endTime, duration_hours, status, req.params.id]);
      
      await logActivity(await currentAdminId(), 'update', 'Booking', req.params.id);
      res.json({ success: true, message: 'Booking updated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update booking' });
    }
  });

  app.delete('/api/admin/bookings/:id', async (req, res) => {
    try {
      await dbRun('DELETE FROM bookings WHERE id = ?', [req.params.id]);
      await logActivity(await currentAdminId(), 'delete', 'Booking', req.params.id);
      res.json({ success: true, message: 'Booking deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete booking' });
    }
  });

  // ===== ADMIN STATS =====
  
  app.get('/api/admin/stats', async (req, res) => {
    try {
      const stats = await dbGet(`
        SELECT 
          (SELECT COUNT(*) FROM bookings WHERE booking_date = DATE('now')) as todayBookings,
          (SELECT COUNT(*) FROM courts WHERE status = 'active') as activeCourts,
          (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND DATE(paid_at) = DATE('now')) as todayRevenue,
          (SELECT COUNT(*) FROM users) as totalUsers
      `);
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // ===== ADMIN ACCOUNTS =====
  
  app.get('/api/admin/accounts', async (req, res) => {
    try {
      const accounts = await dbAll(`
        SELECT id, username, email, full_name, role, is_active, last_login FROM admin_accounts ORDER BY created_at DESC
      `);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch admin accounts' });
    }
  });

  app.post('/api/admin/accounts', async (req, res) => {
    try {
      const { username, email, full_name, password, role, is_active } = req.body;
      const id = uuidv4();
      
      await dbRun(`
        INSERT INTO admin_accounts (id, username, email, full_name, password_hash, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [id, username, email, full_name, password, role || 'admin', is_active !== false ? 1 : 0]);
      
      await logActivity(await currentAdminId(), 'create', 'Admin account', id);
      res.status(201).json({ id, message: 'Admin account created' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create admin account' });
    }
  });

  app.put('/api/admin/accounts/:id', async (req, res) => {
    try {
      const { username, email, full_name, password, role, is_active } = req.body;
      
      let query = `UPDATE admin_accounts SET username = ?, email = ?, full_name = ?, role = ?, is_active = ?`;
      const params = [username, email, full_name, role, is_active ? 1 : 0];
      
      if (password) {
        query += `, password_hash = ?`;
        params.push(password);
      }
      
      query += ` WHERE id = ?`;
      params.push(req.params.id);
      
      await dbRun(query, params);
      await logActivity(await currentAdminId(), 'update', 'Admin account', req.params.id);
      res.json({ success: true, message: 'Admin account updated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update admin account' });
    }
  });

  app.delete('/api/admin/accounts/:id', async (req, res) => {
    try {
      await dbRun('DELETE FROM admin_accounts WHERE id = ?', [req.params.id]);
      await logActivity(await currentAdminId(), 'delete', 'Admin account', req.params.id);
      res.json({ success: true, message: 'Admin account deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete admin account' });
    }
  });

  // ===== ACTIVITY LOG =====
  
  app.get('/api/admin/activity-log', async (req, res) => {
    try {
      const logs = await dbAll(`
        SELECT al.*, aa.username as admin_name 
        FROM admin_logs al
        LEFT JOIN admin_accounts aa ON al.admin_id = aa.id
        ORDER BY al.created_at DESC
        LIMIT 100
      `);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch activity log' });
    }
  });
}
