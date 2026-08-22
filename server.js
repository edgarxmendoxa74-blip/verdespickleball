const express = require('express');
const cors    = require('cors');
require('dotenv').config();
const path    = require('path');
const { v4: uuidv4 } = require('uuid');
const { supabase }   = require('./database');
const { setupAdminRoutes } = require('./admin-api');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve static files only in local dev; Vercel CDN handles them in production
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
}

// ── USER ROUTES ───────────────────────────────────────────────────────────────

app.post('/api/users', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email || !phone)
      return res.status(400).json({ error: 'Missing required fields' });

    const { data: existing } = await supabase
      .from('users').select('id').eq('email', email).maybeSingle();

    if (existing) return res.json({ id: existing.id, message: 'User already exists' });

    const userId = uuidv4();
    const { error } = await supabase.from('users').insert({ id: userId, name, email, phone });
    if (error) throw error;

    res.status(201).json({ id: userId, name, email, phone });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ── BOOKING ROUTES ────────────────────────────────────────────────────────────

app.get('/api/available-slots/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const workingHours = [7,8,9,10,11,12,13,14,15,16,17,18];

    const { data: booked, error } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('booking_date', date)
      .neq('status', 'cancelled');

    if (error) throw error;

    const availableSlots = workingHours.filter(hour => {
      const timeStr = `${String(hour).padStart(2,'0')}:00`;
      return !(booked || []).some(slot => {
        const start = slot.start_time.substring(0, 5);
        const end   = slot.end_time.substring(0, 5);
        return start <= timeStr && timeStr < end;
      });
    }).map(h => `${String(h).padStart(2,'0')}:00`);

    res.json({ date, availableSlots });
  } catch (err) {
    console.error('Error fetching slots:', err);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const { userId, courtNumber, bookingDate, startTime, endTime, durationHours, priceAmount } = req.body;
    if (!userId || !courtNumber || !bookingDate || !startTime || !endTime || !durationHours || !priceAmount)
      return res.status(400).json({ error: 'Missing required fields' });

    const bookingId = uuidv4();
    const { error: bErr } = await supabase.from('bookings').insert({
      id: bookingId, user_id: userId, court_number: courtNumber,
      booking_date: bookingDate, start_time: startTime, end_time: endTime,
      duration_hours: durationHours, price_amount: priceAmount, status: 'pending'
    });
    if (bErr) throw bErr;

    const paymentId = uuidv4();
    const { error: pErr } = await supabase.from('payments').insert({
      id: paymentId, booking_id: bookingId, user_id: userId,
      amount: priceAmount, status: 'pending'
    });
    if (pErr) throw pErr;

    res.status(201).json({ bookingId, paymentId, courtNumber, bookingDate, startTime, endTime, priceAmount, status: 'pending' });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

app.get('/api/bookings/user/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, payments(id, status)')
      .eq('user_id', req.params.userId)
      .order('booking_date', { ascending: false });
    if (error) throw error;

    const result = (data || []).map(b => {
      const pay = b.payments?.[0] || {};
      const { payments: _, ...rest } = b;
      return { ...rest, payment_id: pay.id, payment_status: pay.status };
    });
    res.json(result);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// ── PAYMENT ROUTES ────────────────────────────────────────────────────────────

app.post('/api/payments/process', async (req, res) => {
  try {
    const { paymentId, bookingId, userId, amount, gcashReference } = req.body;
    if (!paymentId || !bookingId || !userId || !amount || !gcashReference)
      return res.status(400).json({ error: 'Missing required fields' });

    const { error: pErr } = await supabase.from('payments')
      .update({ status: 'completed', reference_number: gcashReference, paid_at: new Date().toISOString() })
      .eq('id', paymentId);
    if (pErr) throw pErr;

    const { error: bErr } = await supabase.from('bookings')
      .update({ status: 'confirmed' }).eq('id', bookingId);
    if (bErr) throw bErr;

    const { error: tErr } = await supabase.from('time_tracking')
      .insert({ id: uuidv4(), booking_id: bookingId });
    if (tErr) throw tErr;

    res.json({ success: true, message: 'Payment processed successfully', bookingId, paymentId, status: 'completed' });
  } catch (err) {
    console.error('Error processing payment:', err);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

app.post('/api/payments/counter', async (req, res) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) return res.status(400).json({ error: 'Missing paymentId' });

    const { error } = await supabase.from('payments')
      .update({ payment_method: 'counter' }).eq('id', paymentId);
    if (error) throw error;

    res.json({ success: true, message: 'Payment method set to counter' });
  } catch (err) {
    console.error('Error updating payment:', err);
    res.status(500).json({ error: 'Failed to update payment method' });
  }
});

app.get('/api/payments/:paymentId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('payments')
      .select('*').eq('id', req.params.paymentId).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Payment not found' });
    res.json(data);
  } catch (err) {
    console.error('Error fetching payment:', err);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// ── ADMIN CHECK-IN / CHECK-OUT ────────────────────────────────────────────────

app.post('/api/admin/checkin', async (req, res) => {
  try {
    const { bookingId, checkInTime } = req.body;
    if (!bookingId) return res.status(400).json({ error: 'Missing bookingId' });

    const timeToSet = checkInTime || new Date().toISOString();
    const { data: existing } = await supabase.from('time_tracking')
      .select('id').eq('booking_id', bookingId).maybeSingle();

    if (existing) {
      const { error } = await supabase.from('time_tracking')
        .update({ check_in_time: timeToSet }).eq('booking_id', bookingId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('time_tracking')
        .insert({ id: uuidv4(), booking_id: bookingId, check_in_time: timeToSet });
      if (error) throw error;
    }

    res.json({ success: true, message: 'Check-in recorded', checkInTime: timeToSet });
  } catch (err) {
    console.error('Error checking in:', err);
    res.status(500).json({ error: 'Failed to check in' });
  }
});

app.post('/api/admin/checkout', async (req, res) => {
  try {
    const { bookingId, checkOutTime } = req.body;
    if (!bookingId) return res.status(400).json({ error: 'Missing bookingId' });

    const timeToSet = checkOutTime || new Date().toISOString();
    const { data: tracking } = await supabase.from('time_tracking')
      .select('check_in_time').eq('booking_id', bookingId).maybeSingle();

    let durationMinutes = null;
    if (tracking?.check_in_time) {
      durationMinutes = Math.round((new Date(timeToSet) - new Date(tracking.check_in_time)) / 60000);
    }

    const { error } = await supabase.from('time_tracking')
      .update({ check_out_time: timeToSet, actual_duration_minutes: durationMinutes })
      .eq('booking_id', bookingId);
    if (error) throw error;

    res.json({ success: true, message: 'Check-out recorded', checkOutTime: timeToSet, durationMinutes });
  } catch (err) {
    console.error('Error checking out:', err);
    res.status(500).json({ error: 'Failed to check out' });
  }
});

app.post('/api/admin/cancel-booking', async (req, res) => {
  try {
    const { bookingId, status } = req.body;
    if (!bookingId) return res.status(400).json({ error: 'Missing bookingId' });

    const { error } = await supabase.from('bookings')
      .update({ status: status || 'cancelled' }).eq('id', bookingId);
    if (error) throw error;

    res.json({ success: true, message: 'Booking status updated' });
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// ── ADMIN ROUTES ──────────────────────────────────────────────────────────────
setupAdminRoutes(app, supabase);

// ── START (local dev only) ────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Velarde Courtside server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
