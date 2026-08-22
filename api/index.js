const express = require('express');
const cors    = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 }   = require('uuid');
const { setupAdminRoutes } = require('../admin-api');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── USER ROUTES ───────────────────────────────────────────────────────────────
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email || !phone)
      return res.status(400).json({ error: 'Missing required fields' });
    const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    if (existing) return res.json({ id: existing.id, message: 'User already exists' });
    const userId = uuidv4();
    const { error } = await supabase.from('users').insert({ id: userId, name, email, phone });
    if (error) throw error;
    res.status(201).json({ id: userId, name, email, phone });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create user' }); }
});

// ── AVAILABLE SLOTS ───────────────────────────────────────────────────────────
app.get('/api/available-slots/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const workingHours = [7,8,9,10,11,12,13,14,15,16,17,18];
    const { data: booked, error } = await supabase.from('bookings').select('start_time,end_time').eq('booking_date', date).neq('status','cancelled');
    if (error) throw error;
    const availableSlots = workingHours.filter(h => {
      const t = `${String(h).padStart(2,'0')}:00`;
      return !(booked||[]).some(s => s.start_time.substring(0,5) <= t && t < s.end_time.substring(0,5));
    }).map(h => `${String(h).padStart(2,'0')}:00`);
    res.json({ date, availableSlots });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch available slots' }); }
});

// ── BOOKINGS ──────────────────────────────────────────────────────────────────
app.post('/api/bookings', async (req, res) => {
  try {
    const { userId, courtNumber, bookingDate, startTime, endTime, durationHours, priceAmount } = req.body;
    if (!userId||!courtNumber||!bookingDate||!startTime||!endTime||!durationHours||!priceAmount)
      return res.status(400).json({ error: 'Missing required fields' });
    const bookingId = uuidv4();
    const { error: bErr } = await supabase.from('bookings').insert({ id: bookingId, user_id: userId, court_number: courtNumber, booking_date: bookingDate, start_time: startTime, end_time: endTime, duration_hours: durationHours, price_amount: priceAmount, status: 'pending' });
    if (bErr) throw bErr;
    const paymentId = uuidv4();
    const { error: pErr } = await supabase.from('payments').insert({ id: paymentId, booking_id: bookingId, user_id: userId, amount: priceAmount, status: 'pending' });
    if (pErr) throw pErr;
    res.status(201).json({ bookingId, paymentId, courtNumber, bookingDate, startTime, endTime, priceAmount, status: 'pending' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create booking' }); }
});

app.get('/api/bookings/user/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('bookings').select('*, payments(id,status)').eq('user_id', req.params.userId).order('booking_date', { ascending: false });
    if (error) throw error;
    res.json((data||[]).map(b => { const p=b.payments?.[0]||{}; const {payments:_,...r}=b; return {...r,payment_id:p.id,payment_status:p.status}; }));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch bookings' }); }
});

// ── PAYMENTS ──────────────────────────────────────────────────────────────────
app.post('/api/payments/process', async (req, res) => {
  try {
    const { paymentId, bookingId, userId, amount, gcashReference } = req.body;
    if (!paymentId||!bookingId||!userId||!amount||!gcashReference)
      return res.status(400).json({ error: 'Missing required fields' });
    const { error: pErr } = await supabase.from('payments').update({ status:'completed', reference_number: gcashReference, paid_at: new Date().toISOString() }).eq('id', paymentId);
    if (pErr) throw pErr;
    const { error: bErr } = await supabase.from('bookings').update({ status:'confirmed' }).eq('id', bookingId);
    if (bErr) throw bErr;
    await supabase.from('time_tracking').insert({ id: uuidv4(), booking_id: bookingId });
    res.json({ success: true, message: 'Payment processed successfully', bookingId, paymentId, status: 'completed' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to process payment' }); }
});

app.post('/api/payments/counter', async (req, res) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) return res.status(400).json({ error: 'Missing paymentId' });
    const { error } = await supabase.from('payments').update({ payment_method:'counter' }).eq('id', paymentId);
    if (error) throw error;
    res.json({ success: true, message: 'Payment method set to counter' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update payment method' }); }
});

app.get('/api/payments/:paymentId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('payments').select('*').eq('id', req.params.paymentId).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Payment not found' });
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch payment' }); }
});

// ── ADMIN CHECK-IN / CHECK-OUT ────────────────────────────────────────────────
app.post('/api/admin/checkin', async (req, res) => {
  try {
    const { bookingId, checkInTime } = req.body;
    if (!bookingId) return res.status(400).json({ error: 'Missing bookingId' });
    const t = checkInTime || new Date().toISOString();
    const { data: ex } = await supabase.from('time_tracking').select('id').eq('booking_id', bookingId).maybeSingle();
    if (ex) { await supabase.from('time_tracking').update({ check_in_time: t }).eq('booking_id', bookingId); }
    else     { await supabase.from('time_tracking').insert({ id: uuidv4(), booking_id: bookingId, check_in_time: t }); }
    res.json({ success: true, checkInTime: t });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to check in' }); }
});

app.post('/api/admin/checkout', async (req, res) => {
  try {
    const { bookingId, checkOutTime } = req.body;
    if (!bookingId) return res.status(400).json({ error: 'Missing bookingId' });
    const t = checkOutTime || new Date().toISOString();
    const { data: tr } = await supabase.from('time_tracking').select('check_in_time').eq('booking_id', bookingId).maybeSingle();
    const dur = tr?.check_in_time ? Math.round((new Date(t)-new Date(tr.check_in_time))/60000) : null;
    await supabase.from('time_tracking').update({ check_out_time: t, actual_duration_minutes: dur }).eq('booking_id', bookingId);
    res.json({ success: true, checkOutTime: t, durationMinutes: dur });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to check out' }); }
});

app.post('/api/admin/cancel-booking', async (req, res) => {
  try {
    const { bookingId, status } = req.body;
    if (!bookingId) return res.status(400).json({ error: 'Missing bookingId' });
    await supabase.from('bookings').update({ status: status||'cancelled' }).eq('id', bookingId);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to cancel booking' }); }
});

// ── ADMIN ROUTES ──────────────────────────────────────────────────────────────
setupAdminRoutes(app, supabase);

module.exports = app;
