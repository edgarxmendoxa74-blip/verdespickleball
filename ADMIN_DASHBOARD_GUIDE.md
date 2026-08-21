# Admin Dashboard - Complete Management Guide

## Overview

The comprehensive admin dashboard provides complete control over all aspects of the Velarde Courtside booking system.

**Access:** `http://localhost:5000/admin-dashboard.html`
**Default Login:** 
- Username: `admin`
- Password: `admin123`

---

## 🎯 Features

### 1. Dashboard Overview
**Location:** Home screen (default view)

**Displays:**
- 📅 Today's Bookings count
- ✅ Active Courts available
- 💰 Today's Revenue
- 👥 Total registered users

**Actions:**
- Real-time statistics refresh
- Quick overview of business metrics

---

### 2. Website Settings
**Location:** Website Settings menu

**Editable Fields:**
- **Site Name** - Main website title
- **Site Description** - Short description
- **Phone** - Contact phone number
- **Email** - Contact email
- **Address** - Physical location
- **Operating Hours Start** - Opening time (default: 07:00)
- **Operating Hours End** - Closing time (default: 19:00)
- **About Us** - Detailed about section
- **Terms & Conditions** - Legal terms

**How to Edit:**
1. Click "Website Settings" in sidebar
2. Modify desired fields
3. Click "Save Settings"

---

### 3. Court Management
**Location:** Court Management menu

**Manage Courts:**
- View all courts (1-10)
- Add new courts
- Edit existing courts
- Delete courts

**Court Details:**
- Court Number (1-10, unique)
- Court Name
- Description
- Capacity (players)
- Surface Type (e.g., Acrylic, Clay)
- Status (Active/Maintenance/Inactive)

**How to Add Court:**
1. Click "Court Management"
2. Click "+ Add Court" button
3. Fill in court details
4. Click "Save Court"

**How to Edit Court:**
1. Find court in the grid
2. Click "Edit" button
3. Modify details
4. Click "Save Court"

**How to Delete Court:**
1. Find court in the grid
2. Click "Delete" button
3. Confirm deletion

---

### 4. Pricing Management
**Location:** Pricing menu

**Manage Pricing:**
- Set prices for different durations
- Support weekday/weekend/holiday rates
- Activate/deactivate prices

**Price Configuration:**
- **Duration (Hours)** - 1, 2, 3+ hours
- **Price Amount (₱)** - Cost in Philippine Pesos
- **Day Type** - Weekday, Weekend, Holiday
- **Description** - Optional label
- **Status** - Active/Inactive

**Current Default Prices:**
- 1 Hour: ₱500
- 2 Hours: ₱900
- 3 Hours: ₱1,200

**How to Change Prices:**
1. Click "Pricing" in sidebar
2. Click "Edit" on existing price
3. Modify amount or duration
4. Click "Save Price"

**How to Add New Price:**
1. Click "+ Add Price" button
2. Enter duration and price
3. Select day type
4. Click "Save Price"

---

### 5. Payment Methods
**Location:** Payment Methods menu

**Manage Payment Methods:**
- Configure available payment options
- Add new payment methods
- Edit method details
- Set account information

**Payment Method Details:**
- **Payment Method Name** - e.g., "GCash"
- **Description** - How it works
- **Payment Instructions** - Step-by-step guide
- **Account Details** - Account number or ID
- **QR Code URL** - Optional QR code link
- **Status** - Active/Inactive

**Default Payment Methods:**
- GCash (Active)
- Bank Transfer (Active)

**How to Edit Payment Method:**
1. Click "Payment Methods"
2. Click "Edit" on method card
3. Update details (account, instructions, etc.)
4. Click "Save Payment Method"

**How to Add Payment Method:**
1. Click "+ Add Method" button
2. Enter method details
3. Add instructions and account info
4. Click "Save Payment Method"

---

### 6. Bookings Management
**Location:** Bookings menu

**Manage All Bookings:**
- View all bookings
- Filter by date and status
- Edit booking details
- Cancel bookings

**Filter Options:**
- Filter by Date - Select specific date
- Filter by Status - Pending, Confirmed, Cancelled

**Edit Booking:**
1. Click "Bookings" in sidebar
2. Set filters if needed
3. Click "Edit" button
4. Modify:
   - Court number
   - Booking date
   - Start time
   - Duration
   - Status
5. Click "Save Booking"

**Cancel Booking:**
1. Find booking in table
2. Click "Delete" button
3. Confirm cancellation

---

### 7. Time Monitoring
**Location:** Time Monitoring menu

**Monitor Court Usage:**
- Track guest check-in/check-out
- Monitor actual court usage time
- Compare booked vs actual duration
- Real-time session tracking

**Time Monitoring View:**
- **Display Date Selector** - Choose date to monitor
- **Court Status Indicators:**
  - 🟡 Pending - Booked but not checked in
  - 🟢 In Progress - Checked in, still playing
  - 🔵 Completed - Checked in and out

**Guest Information Shown:**
- Guest name
- Phone number
- Booked duration
- Check-in time
- Check-out time
- Actual duration in minutes

**How to Check In Guest:**
1. Click "Time Monitoring"
2. Select date
3. Find booking
4. Click "Check In" button
5. Time is recorded automatically

**How to Check Out Guest:**
1. Booking must be checked in first
2. Click "Check Out" button
3. Actual duration calculates automatically
4. Display shows duration in minutes and hours

**Example:**
- Booked: 2 hours
- Check-in: 14:05
- Check-out: 16:18
- Actual Duration: 133 minutes (2.2 hours)

---

### 8. Admin Accounts
**Location:** Admin Accounts menu

**Manage Admin Users:**
- Create new admin accounts
- Edit existing accounts
- Change roles and permissions
- Deactivate accounts

**Admin Roles:**
- **Super Admin** - Full access to all features
- **Admin** - Full access to most features
- **Manager** - Limited access for operational management

**Admin Account Fields:**
- **Username** - Unique login name
- **Email** - Contact email
- **Full Name** - Admin's real name
- **Password** - Secure password
- **Role** - Super Admin, Admin, or Manager
- **Status** - Active/Inactive
- **Last Login** - Timestamp of last login

**How to Add Admin Account:**
1. Click "Admin Accounts"
2. Click "+ Add Admin" button
3. Enter:
   - Username (unique)
   - Email
   - Full Name
   - Password
   - Select Role
4. Click "Save Admin Account"

**How to Edit Admin Account:**
1. Find account in table
2. Click "Edit"
3. Modify details
4. Leave password blank to keep current
5. Click "Save Admin Account"

**How to Deactivate Admin:**
1. Click "Edit" on account
2. Uncheck "Active" checkbox
3. Click "Save Admin Account"

**Security Best Practices:**
- Change default admin password immediately
- Create individual admin accounts per user
- Use strong passwords (8+ characters)
- Regularly review admin activity logs

---

### 9. Activity Log
**Location:** Activity Log menu

**Track System Activities:**
- View all admin actions
- Track what was changed and by whom
- Monitor security and compliance
- Export activity logs

**Activity Log Information:**
- Admin name who performed action
- Action type (Create, Edit, Delete, etc.)
- Entity type (Court, Booking, Payment, etc.)
- Timestamp of action

**How to Export Activity Log:**
1. Click "Activity Log"
2. Click "Export" button
3. CSV file downloads with all logs
4. Open in Excel or spreadsheet app

**Activity Log Example:**
```
Admin          | Action        | Entity Type      | Timestamp
admin          | Create        | Court            | 2026-08-21 10:30:45
admin          | Update        | Pricing          | 2026-08-21 11:15:22
manager        | Create        | PaymentMethod    | 2026-08-21 14:22:10
admin          | Delete        | AdminAccount     | 2026-08-21 15:45:33
```

---

## 📊 Use Cases

### Use Case 1: Setting Up Your Business
1. Go to **Website Settings**
   - Update site name, phone, email
   - Set operating hours
   - Add about us text

2. Go to **Court Management**
   - Create courts (1-4)
   - Add descriptions and specifications

3. Go to **Pricing**
   - Set your hourly rates
   - Create different rates for weekends

4. Go to **Payment Methods**
   - Add payment instructions
   - Update account details

### Use Case 2: Managing Today's Bookings
1. Go to **Bookings**
2. Filter by today's date
3. Monitor bookings
4. Go to **Time Monitoring**
5. Check guests in/out as they arrive

### Use Case 3: Adding Staff
1. Go to **Admin Accounts**
2. Click "+ Add Admin"
3. Create account for staff member
4. Assign appropriate role
5. Share login credentials securely

### Use Case 4: Analyzing Business
1. Go to **Dashboard**
   - Check today's revenue
   - Monitor number of bookings
2. Go to **Time Monitoring**
   - Compare booked vs actual usage
3. Go to **Activity Log**
   - Export for record keeping

---

## 🔒 Security Features

### Access Control
- Admin authentication required
- Session management
- Activity logging for compliance

### Data Protection
- Password-protected admin accounts
- Role-based access control
- Audit trail of all changes

### Best Practices
1. **Change Default Password**
   - Access: Admin Accounts → Edit admin
   - Set strong password immediately

2. **Create Individual Accounts**
   - Each staff member gets unique account
   - Better tracking and accountability

3. **Review Activity Log**
   - Monitor who made what changes
   - Catch unauthorized access

4. **Use Strong Passwords**
   - Minimum 8 characters
   - Mix of letters, numbers, symbols
   - No personal information

---

## 📱 Mobile Responsiveness

The admin dashboard is fully responsive:
- **Desktop** - Full feature set
- **Tablet** - Optimized layout
- **Mobile** - Condensed navigation

---

## 🛠️ Troubleshooting

### Can't Access Admin Dashboard
**Problem:** Login fails
**Solution:**
1. Verify default credentials: admin/admin123
2. Clear browser cache and cookies
3. Check database is initialized

### Changes Not Saving
**Problem:** Updates don't appear
**Solution:**
1. Check browser console for errors
2. Verify API endpoints are running
3. Refresh page after save

### Time Monitoring Not Working
**Problem:** Check-in/check-out buttons don't work
**Solution:**
1. Ensure booking status is "Confirmed"
2. Check network connection
3. Verify API is responding

---

## 📞 Support

For issues or feature requests:
1. Check ADMIN_DASHBOARD_GUIDE.md (this file)
2. Review API endpoints in admin-api.js
3. Check browser console for errors
4. Contact development team

---

## 📝 Notes

- All changes are saved immediately
- Time is recorded in 24-hour format
- Prices are in Philippine Pesos (₱)
- Activity log is unlimited
- Database backups recommended daily

---

**Version:** 1.0.0  
**Last Updated:** August 2026  
**Status:** Production Ready ✅
