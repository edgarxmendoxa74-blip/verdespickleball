# Velarde Courtside - Testing Guide

## Pre-Testing Checklist

✅ Node.js installed
✅ Dependencies installed (`npm install`)
✅ `.env` file configured
✅ Port 5000 available

## Starting the Application

```bash
npm start
```

You should see:
```
✅ Velarde Courtside server running on http://localhost:5000
```

## Test Scenarios

### Test 1: Access Customer Booking Page
**URL:** `http://localhost:5000`

**Expected:**
- Page loads successfully
- Velarde Courtside branding visible
- Booking form displayed
- Date picker shows tomorrow's date minimum
- Court options (1-4) available

**Test Steps:**
1. Open browser to localhost:5000
2. Verify form fields are visible
3. Try selecting different courts
4. Try changing the date
5. Verify available time slots load

---

### Test 2: Complete Booking Flow
**Scenario:** Customer books a court and pays via GCash

**Test Steps:**
1. Fill in customer information:
   - Name: "Juan Dela Cruz"
   - Email: "juan@example.com"
   - Phone: "+639123456789"

2. Select booking details:
   - Court: Court 1
   - Date: Tomorrow's date
   - Start Time: Any available time
   - Duration: 2 hours

3. Click "Book & Pay Now"

4. Verify payment modal appears with:
   - Correct court number
   - Correct date
   - Correct time slot
   - Correct duration
   - Correct total price (₱900 for 2 hours)

5. Enter GCash Reference: "TEST-12345678"

6. Click "Confirm Payment"

**Expected:**
- Payment processes successfully
- Success message displays
- Modal shows confirmation
- Form resets after 3 seconds

---

### Test 3: Admin Login
**URL:** `http://localhost:5000/admin.html`

**Test Steps:**
1. Open admin dashboard page
2. Try invalid password: "wrongpassword"
   - Should show error message
3. Enter correct password: "admin123"
   - Should grant access
   - Dashboard should load

**Expected:**
- Admin login form displays
- Invalid password rejected
- Correct password grants access
- Dashboard loads with all sections

---

### Test 4: Admin Dashboard - Statistics
**Scenario:** After successful booking, verify stats update

**Test Steps:**
1. Login to admin dashboard
2. Check Dashboard section
3. Verify statistics cards show:
   - Today's Bookings (should increase)
   - Completed Bookings count
   - Total Revenue
   - Total Bookings

4. Click "Refresh" button
5. Verify today's schedule updates

**Expected:**
- Stats reflect recent bookings
- Today's Schedule shows booking
- Data auto-refreshes every 30 seconds
- Manual refresh works

---

### Test 5: Admin Dashboard - Bookings List
**Scenario:** View and filter all bookings

**Test Steps:**
1. Navigate to "Bookings" section
2. Verify booking from Test 2 appears in table
3. Test status filter:
   - Select "Confirmed"
   - Verify only confirmed bookings show
4. Test date filter:
   - Select today's date
   - Verify today's bookings show
5. Click "Track" button on a booking
6. Verify check-in/check-out modal appears

**Expected:**
- All bookings listed with details
- Filters work correctly
- Guest name, court, duration, amount visible
- Status indicators color-coded
- Action buttons functional

---

### Test 6: Admin Dashboard - Time Tracking
**Scenario:** Test check-in and check-out functionality

**Test Steps:**
1. Navigate to "Time Tracking" section
2. Select today's date
3. Click "Load"
4. Verify bookings for today appear
5. Click "Track" on a pending booking
6. In tracking modal:
   - Click "Check In"
   - Verify success message
   - Button changes state
7. Click "Check Out"
   - Verify success message
   - Verify actual duration calculated
   - Shows time in minutes

**Expected:**
- Check-in records timestamp
- Check-out calculates actual duration
- Duration in minutes and hours shown
- Time tracking card updates
- Status changes to completed

---

### Test 7: Cancel Booking
**Scenario:** Admin cancels a booking

**Test Steps:**
1. From Bookings section, click "Cancel" button
2. Confirmation modal appears
3. Click "Yes, Cancel"
4. Verify booking status changes to "Cancelled"

**Expected:**
- Cancellation modal appears
- Booking marked as cancelled
- Removed from active bookings list
- Stats updated

---

### Test 8: Available Slots Logic
**Scenario:** Verify slot availability calculation

**Test Steps:**
1. Return to booking page
2. Select a date
3. Observe available time slots
4. Verify no overlapping bookings
5. Switch to admin and create another booking for same time
6. Return to booking page, change date to same date
7. Verify slot is no longer available

**Expected:**
- Only non-booked slots shown
- No double-bookings possible
- Real-time availability updates

---

### Test 9: Data Persistence
**Scenario:** Verify data saves and loads

**Test Steps:**
1. Create a booking and pay
2. Check admin dashboard (should show booking)
3. Restart server: `npm start`
4. Return to admin dashboard
5. Verify booking still appears

**Expected:**
- Booking persists after restart
- All data saved to database.db
- Statistics accurate after restart

---

### Test 10: Mobile Responsiveness
**Scenario:** Test on mobile viewport

**Test Steps:**
1. Open browser DevTools (F12)
2. Toggle device toolbar (mobile view)
3. Test iPhone/Android size
4. Try booking on mobile
5. Try admin dashboard on mobile
6. Test touch interactions

**Expected:**
- Form fields easily tappable
- Layout responsive
- No horizontal scrolling
- Admin dashboard adjusts to mobile
- Buttons easily clickable

---

## Performance Testing

### Load Times
```
Booking page load: < 1 second
Admin dashboard load: < 1.5 seconds
API response: < 500ms
```

### Database Operations
```
User creation: < 100ms
Booking creation: < 100ms
Stats fetch: < 200ms
```

---

## Edge Cases to Test

### Test E1: Double Booking Attempt
- Try to book same court/time twice
- Expected: Second booking should fail or show unavailable

### Test E2: Past Date Selection
- Try to select past date
- Expected: Date picker should prevent past dates

### Test E3: Invalid Data Submission
- Submit form with empty fields
- Expected: Validation errors shown

### Test E4: Multiple Admin Tabs
- Open admin in two tabs
- Make changes in one
- Expected: Other tab updates on refresh

### Test E5: Network Error Simulation
- Throttle network in DevTools
- Try making a booking
- Expected: Graceful error handling

### Test E6: Database Backup
- Stop server
- Backup database.db
- Delete database.db
- Start server
- Expected: New database created, clean slate

---

## Debugging Tips

### Check Server Console
```bash
# Server should output:
✅ Velarde Courtside server running on http://localhost:5000
```

### Check Browser Console
- Open DevTools (F12)
- Go to Console tab
- Look for any errors
- Check Network tab for failed requests

### Verify Database
```bash
# Install SQLite browser or use CLI
sqlite3 database.db

# Check tables
.tables

# Check bookings
SELECT * FROM bookings;
```

### Check Environment Variables
```bash
# Verify .env is properly configured
# Key values needed:
# - PORT=5000
# - ADMIN_PASSWORD=admin123
```

---

## Browser Compatibility

Tested on:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile Chrome
- ✅ Mobile Safari

---

## Success Criteria

All tests should pass:
- [x] Customer can book courts
- [x] Payments process successfully
- [x] Admin can manage bookings
- [x] Time tracking works
- [x] Data persists
- [x] Responsive design works
- [x] No console errors
- [x] All API endpoints respond

---

## Reporting Issues

If tests fail, check:
1. Server is running (`npm start`)
2. No port conflicts
3. Database is accessible
4. All dependencies installed
5. .env file properly configured
6. Browser console for errors
7. Network tab for failed requests

---

**Ready for Testing!** ✅

Start with `npm start` and navigate to `http://localhost:5000`
