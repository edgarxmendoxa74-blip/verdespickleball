import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './database.js';
import { setupAdminRoutes } from './admin-api.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ===== USER ROUTES =====

// Create user or get existing
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return res.json({ id: existing.id, message: 'User already exists' });
    }

    const userId = uuidv4();
    const { error } = await supabase
      .from('users')
      .insert({ id: userId, name, email, phone });

    if (error) throw error;

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

    const workingHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

    const { data: bookedSlots, error } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('booking_date', date)
      .neq('status', 'cancelled');

    if (error) throw error;

    const availableSlots = [];
    for (const hour of workingHours) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      const isBooked = (bookedSlots || []).some(slot => {
        const start = slot.start_time.substring(0, 5);
        const end   = slot.end_time.substring(0, 5);
        return start <= timeStr && timeStr < end;
      });
      if (!isBooked) availableSlots.push(timeStr);
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
    const { error: bookingError } = await supabase
      .from('bookings')
      .insert({
        id: bookingId,
        user_id: userId,
        court_number: courtNumber,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        duration_hours: durationHours,
        price_amount: priceAmount,
        status: 'pending'
      });

    if (bookingError) throw bookingError;

    const paymentId = uuidv4();
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        id: paymentId,
        booking_id: bookingId,
        user_id: userId,
        amount: priceAmount,
        status: 'pending'
      });

    if (paymentError) throw paymentError;

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

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        payments (id, status)
      `)
      .eq('user_id', userId)
      .order('booking_date', { ascending: false });

    if (error) throw error;

    // Flatten payment fields to match old SQLite shape
    const result = (bookings || []).map(b => {
      const payment = b.payments?.[0] || {};
      const { payments: _, ...rest } = b;
      return { ...rest, payment_id: payment.id, payment_status: payment.status };
    });

    res.json(result);
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

    const { error: payErr } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        reference_number: gcashReference,
        paid_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (payErr) throw payErr;

    const { error: bookErr } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId);

    if (bookErr) throw bookErr;

    // Create time tracking record
    const { error: trackErr } = await supabase
      .from('time_tracking')
      .insert({ id: uuidv4(), booking_id: bookingId });

    if (trackErr) throw trackErr;

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

// Mark payment as pay-at-counter
app.post('/api/payments/counter', async (req, res) => {
  try {
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'Missing paymentId' });
    }

    const { error } = await supabase
      .from('payments')
      .update({ payment_method: 'counter' })
      .eq('id', paymentId);

    if (error) throw error;

    res.json({ success: true, message: 'Payment method set to counter' });
  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({ error: 'Failed to update payment method' });
  }
});

// Get payment status
app.get('/api/payments/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Payment not found' });

    res.json(data);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// ===== ADMIN CHECK-IN / CHECK-OUT =====

// Check in user
app.post('/api/admin/checkin', async (req, res) => {
  try {
    const { bookingId, checkInTime } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: 'Missing bookingId' });
    }

    const timeToSet = checkInTime || new Date().toISOString();

    // Upsert time_tracking record
    const { data: existing } = await supabase
      .from('time_tracking')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('time_tracking')
        .update({ check_in_time: timeToSet })
        .eq('booking_id', bookingId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('time_tracking')
        .insert({ id: uuidv4(), booking_id: bookingId, check_in_time: timeToSet });
      if (error) throw error;
    }

    res.json({ success: true, message: 'Check-in recorded', checkInTime: timeToSet });
  } catch (error) {
    console.error('Error checking in:', error);
    res.status(500).json({ error: 'Failed to check in' });
  }
});

// Check out user
app.post('/api/admin/checkout', async (req, res) => {
  try {
    const { bookingId, checkOutTime } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: 'Missing bookingId' });
    }

    const timeToSet = checkOutTime || new Date().toISOString();

    // Get check-in time to calculate duration
    const { data: tracking } = await supabase
      .from('time_tracking')
      .select('check_in_time')
      .eq('booking_id', bookingId)
      .maybeSingle();

    let durationMinutes = null;
    if (tracking?.check_in_time) {
      const diffMs = new Date(timeToSet) - new Date(tracking.check_in_time);
      durationMinutes = Math.round(diffMs / 60000);
    }

    const { error } = await supabase
      .from('time_tracking')
      .update({
        check_out_time: timeToSet,
        actual_duration_minutes: durationMinutes
      })
      .eq('booking_id', bookingId);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Check-out recorded',
      checkOutTime: timeToSet,
      durationMinutes
    });
  } catch (error) {
    console.error('Error checking out:', error);
    res.status(500).json({ error: 'Failed to check out' });
  }
});

// Cancel booking
app.post('/api/admin/cancel-booking', async (req, res) => {
  try {
    const { bookingId, status } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: 'Missing bookingId' });
    }

    const { error } = await supabase
      .from('bookings')
      .update({ status: status || 'cancelled' })
      .eq('id', bookingId);

    if (error) throw error;

    res.json({ success: true, message: 'Booking status updated' });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// ===== SETUP ADMIN ROUTES =====
setupAdminRoutes(app, supabase);

// ===== START SERVER (local dev) / EXPORT (Vercel) =====
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Velarde Courtside server running on http://localhost:${PORT}`);
  });
}

export default app;
