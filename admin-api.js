// Admin API Endpoints — Supabase version
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
const upload = multer({ storage });

// supabase is the @supabase/supabase-js client passed from server.js
export function setupAdminRoutes(app, supabase) {

  // Activity logger
  const logActivity = async (adminId, action, entityType, entityId) => {
    try {
      await supabase.from('admin_logs').insert({
        id: uuidv4(),
        admin_id: adminId || null,
        action,
        entity_type: entityType || null,
        entity_id: entityId || null
      });
    } catch (err) {
      console.error('Failed to write activity log:', err.message);
    }
  };

  const currentAdminId = async () => {
    try {
      const { data } = await supabase
        .from('admin_accounts')
        .select('id')
        .eq('username', 'admin')
        .maybeSingle();
      return data?.id || null;
    } catch {
      return null;
    }
  };

  // ===== FILE UPLOAD =====

  app.post('/api/admin/upload-image', upload.single('image'), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      res.json({ url: `/images/uploads/${req.file.filename}` });
    } catch {
      res.status(500).json({ error: 'Failed to upload image' });
    }
  });

  app.post('/api/admin/upload-logo', upload.single('logo'), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      res.json({ url: `/images/uploads/${req.file.filename}` });
    } catch {
      res.status(500).json({ error: 'Failed to upload logo' });
    }
  });

  // ===== ADMIN LOGIN =====

  app.post('/api/admin/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

      const { data: account } = await supabase
        .from('admin_accounts')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (!account || !account.is_active) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      if (account.password_hash !== password) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      await supabase
        .from('admin_accounts')
        .update({ last_login: new Date().toISOString() })
        .eq('id', account.id);

      logActivity(account.id, 'login', 'admin_account', account.id);

      res.json({
        success: true,
        token: 'admin-token-' + Date.now(),
        username: account.username,
        fullName: account.full_name,
        role: account.role
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // ===== WEBSITE SETTINGS =====

  app.get('/api/admin/website-settings', async (req, res) => {
    try {
      const { data } = await supabase
        .from('website_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      res.json(data || {
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
      const {
        site_name, phone, email, address,
        operating_hours_start, operating_hours_end,
        site_description, about_text, terms_text, logo_url
      } = req.body;

      // Try update first; insert if none exists
      const { data: existing } = await supabase
        .from('website_settings')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const payload = {
        site_name, phone, email, address,
        operating_hours_start, operating_hours_end,
        site_description, about_text, terms_text, logo_url,
        updated_at: new Date().toISOString()
      };

      let error;
      if (existing) {
        ({ error } = await supabase
          .from('website_settings')
          .update(payload)
          .eq('id', existing.id));
      } else {
        ({ error } = await supabase
          .from('website_settings')
          .insert({ id: uuidv4(), ...payload }));
      }

      if (error) throw error;

      logActivity(await currentAdminId(), 'update', 'Website settings', existing?.id);
      res.json({ success: true, message: 'Settings saved' });
    } catch (error) {
      console.error('Settings error:', error);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  // ===== COURTS MANAGEMENT =====

  app.get('/api/admin/courts', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .order('court_number');
      if (error) throw error;
      res.json(data || []);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch courts' });
    }
  });

  app.get('/api/admin/courts/:id', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .eq('id', req.params.id)
        .single();
      if (error || !data) return res.status(404).json({ error: 'Court not found' });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch court' });
    }
  });

  app.post('/api/admin/courts', async (req, res) => {
    try {
      const { court_number, name, description, capacity, surface_type, status, image_url } = req.body;
      const id = uuidv4();

      const { error } = await supabase.from('courts').insert({
        id, court_number, name, description,
        capacity: capacity || 4,
        surface_type,
        status: status || 'active',
        image_url
      });

      if (error) throw error;
      logActivity(await currentAdminId(), 'create', 'Court', id);
      res.status(201).json({ id, message: 'Court created' });
    } catch (error) {
      console.error('Court create error:', error);
      res.status(500).json({ error: 'Failed to create court' });
    }
  });

  app.put('/api/admin/courts/:id', async (req, res) => {
    try {
      const { court_number, name, description, capacity, surface_type, status, image_url } = req.body;

      const { error } = await supabase
        .from('courts')
        .update({
          court_number, name, description, capacity,
          surface_type, status, image_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', req.params.id);

      if (error) throw error;
      logActivity(await currentAdminId(), 'update', 'Court', req.params.id);
      res.json({ success: true, message: 'Court updated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update court' });
    }
  });

  app.delete('/api/admin/courts/:id', async (req, res) => {
    try {
      const { error } = await supabase.from('courts').delete().eq('id', req.params.id);
      if (error) throw error;
      logActivity(await currentAdminId(), 'delete', 'Court', req.params.id);
      res.json({ success: true, message: 'Court deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete court' });
    }
  });

  // ===== PRICING MANAGEMENT =====

  app.get('/api/admin/pricing', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('pricing')
        .select('*')
        .order('duration_hours');
      if (error) throw error;
      res.json(data || []);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch pricing' });
    }
  });

  app.get('/api/admin/pricing/:id', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('pricing')
        .select('*')
        .eq('id', req.params.id)
        .single();
      if (error || !data) return res.status(404).json({ error: 'Pricing not found' });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch pricing' });
    }
  });

  app.post('/api/admin/pricing', async (req, res) => {
    try {
      const { duration_hours, price_amount, day_type, description, is_active } = req.body;
      const id = uuidv4();

      const { error } = await supabase.from('pricing').insert({
        id, duration_hours, price_amount,
        day_type: day_type || 'weekday',
        description,
        is_active: is_active !== false
      });

      if (error) throw error;
      logActivity(await currentAdminId(), 'create', 'Pricing', id);
      res.status(201).json({ id, message: 'Pricing created' });
    } catch (error) {
      console.error('Pricing create error:', error);
      res.status(500).json({ error: 'Failed to create pricing' });
    }
  });

  app.put('/api/admin/pricing/:id', async (req, res) => {
    try {
      const { duration_hours, price_amount, day_type, description, is_active } = req.body;

      const { error } = await supabase
        .from('pricing')
        .update({
          duration_hours, price_amount, day_type, description,
          is_active: Boolean(is_active),
          updated_at: new Date().toISOString()
        })
        .eq('id', req.params.id);

      if (error) throw error;
      logActivity(await currentAdminId(), 'update', 'Pricing', req.params.id);
      res.json({ success: true, message: 'Pricing updated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update pricing' });
    }
  });

  app.delete('/api/admin/pricing/:id', async (req, res) => {
    try {
      const { error } = await supabase.from('pricing').delete().eq('id', req.params.id);
      if (error) throw error;
      logActivity(await currentAdminId(), 'delete', 'Pricing', req.params.id);
      res.json({ success: true, message: 'Pricing deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete pricing' });
    }
  });

  // ===== PAYMENT METHODS =====

  app.get('/api/admin/payment-methods', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      res.json(data || []);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
  });

  app.get('/api/admin/payment-methods/:id', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('id', req.params.id)
        .single();
      if (error || !data) return res.status(404).json({ error: 'Payment method not found' });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch payment method' });
    }
  });

  app.post('/api/admin/payment-methods', async (req, res) => {
    try {
      const { method_name, description, instructions, account_details, is_active, qr_code_url } = req.body;
      const id = uuidv4();

      const { error } = await supabase.from('payment_methods').insert({
        id, method_name, description, instructions,
        account_details,
        is_active: is_active !== false,
        qr_code_url
      });

      if (error) throw error;
      logActivity(await currentAdminId(), 'create', 'Payment method', id);
      res.status(201).json({ id, message: 'Payment method created' });
    } catch (error) {
      console.error('Payment method create error:', error);
      res.status(500).json({ error: 'Failed to create payment method' });
    }
  });

  app.put('/api/admin/payment-methods/:id', async (req, res) => {
    try {
      const { method_name, description, instructions, account_details, is_active, qr_code_url } = req.body;

      const { error } = await supabase
        .from('payment_methods')
        .update({
          method_name, description, instructions, account_details,
          is_active: Boolean(is_active),
          qr_code_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', req.params.id);

      if (error) throw error;
      logActivity(await currentAdminId(), 'update', 'Payment method', req.params.id);
      res.json({ success: true, message: 'Payment method updated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update payment method' });
    }
  });

  app.delete('/api/admin/payment-methods/:id', async (req, res) => {
    try {
      const { error } = await supabase.from('payment_methods').delete().eq('id', req.params.id);
      if (error) throw error;
      logActivity(await currentAdminId(), 'delete', 'Payment method', req.params.id);
      res.json({ success: true, message: 'Payment method deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete payment method' });
    }
  });

  // ===== BOOKINGS MANAGEMENT =====

  app.get('/api/admin/bookings', async (req, res) => {
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          users (name, email, phone),
          payments (status),
          time_tracking (check_in_time, check_out_time, actual_duration_minutes)
        `)
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (req.query.date)   query = query.eq('booking_date', req.query.date);
      if (req.query.status) query = query.eq('status', req.query.status);

      const { data, error } = await query;
      if (error) throw error;

      // Flatten nested relations to match old SQLite shape
      const result = (data || []).map(b => {
        const user    = b.users || {};
        const payment = b.payments?.[0] || {};
        const track   = b.time_tracking?.[0] || {};
        const { users: _u, payments: _p, time_tracking: _t, ...rest } = b;
        return {
          ...rest,
          name: user.name,
          email: user.email,
          phone: user.phone,
          payment_status: payment.status,
          check_in_time: track.check_in_time,
          check_out_time: track.check_out_time,
          actual_duration_minutes: track.actual_duration_minutes
        };
      });

      res.json(result);
    } catch (error) {
      console.error('Admin bookings error:', error);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  });

  app.get('/api/admin/bookings/:id', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, users (name, email, phone)')
        .eq('id', req.params.id)
        .single();

      if (error || !data) return res.status(404).json({ error: 'Booking not found' });

      const { users, ...rest } = data;
      res.json({ ...rest, ...users });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch booking' });
    }
  });

  app.put('/api/admin/bookings/:id', async (req, res) => {
    try {
      const { court_number, booking_date, start_time, duration_hours, status } = req.body;

      const startHour = parseInt(start_time.split(':')[0]);
      const endTime = `${String(startHour + parseInt(duration_hours)).padStart(2, '0')}:00`;

      const { error } = await supabase
        .from('bookings')
        .update({
          court_number, booking_date, start_time,
          end_time: endTime,
          duration_hours, status,
          updated_at: new Date().toISOString()
        })
        .eq('id', req.params.id);

      if (error) throw error;
      logActivity(await currentAdminId(), 'update', 'Booking', req.params.id);
      res.json({ success: true, message: 'Booking updated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update booking' });
    }
  });

  app.delete('/api/admin/bookings/:id', async (req, res) => {
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', req.params.id);
      if (error) throw error;
      logActivity(await currentAdminId(), 'delete', 'Booking', req.params.id);
      res.json({ success: true, message: 'Booking deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete booking' });
    }
  });

  // ===== ADMIN STATS =====

  app.get('/api/admin/stats', async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [
        { count: todayBookings },
        { count: activeCourts },
        { count: totalUsers },
        { data: revenueData }
      ] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('booking_date', today),
        supabase.from('courts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('amount').eq('status', 'completed').gte('paid_at', today + 'T00:00:00').lte('paid_at', today + 'T23:59:59')
      ]);

      const todayRevenue = (revenueData || []).reduce((sum, p) => sum + (p.amount || 0), 0);

      res.json({ todayBookings, activeCourts, todayRevenue, totalUsers });
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // ===== ADMIN ACCOUNTS =====

  app.get('/api/admin/accounts', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('admin_accounts')
        .select('id, username, email, full_name, role, is_active, last_login')
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data || []);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch admin accounts' });
    }
  });

  app.post('/api/admin/accounts', async (req, res) => {
    try {
      const { username, email, full_name, password, role, is_active } = req.body;
      const id = uuidv4();

      const { error } = await supabase.from('admin_accounts').insert({
        id, username, email, full_name,
        password_hash: password,
        role: role || 'admin',
        is_active: is_active !== false
      });

      if (error) throw error;
      logActivity(await currentAdminId(), 'create', 'Admin account', id);
      res.status(201).json({ id, message: 'Admin account created' });
    } catch (error) {
      console.error('Admin account create error:', error);
      res.status(500).json({ error: 'Failed to create admin account' });
    }
  });

  app.put('/api/admin/accounts/:id', async (req, res) => {
    try {
      const { username, email, full_name, password, role, is_active } = req.body;

      const payload = {
        username, email, full_name,
        role,
        is_active: Boolean(is_active)
      };
      if (password) payload.password_hash = password;

      const { error } = await supabase
        .from('admin_accounts')
        .update(payload)
        .eq('id', req.params.id);

      if (error) throw error;
      logActivity(await currentAdminId(), 'update', 'Admin account', req.params.id);
      res.json({ success: true, message: 'Admin account updated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update admin account' });
    }
  });

  app.delete('/api/admin/accounts/:id', async (req, res) => {
    try {
      const { error } = await supabase.from('admin_accounts').delete().eq('id', req.params.id);
      if (error) throw error;
      logActivity(await currentAdminId(), 'delete', 'Admin account', req.params.id);
      res.json({ success: true, message: 'Admin account deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete admin account' });
    }
  });

  // ===== ACTIVITY LOG =====

  app.get('/api/admin/activity-log', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*, admin_accounts (username)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const result = (data || []).map(log => {
        const { admin_accounts, ...rest } = log;
        return { ...rest, admin_name: admin_accounts?.username };
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch activity log' });
    }
  });
}
