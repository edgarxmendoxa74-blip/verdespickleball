# Velarde Courtside - Deployment Guide

## Quick Start

### 1. Prerequisites
- Node.js v14+ installed
- npm or yarn package manager
- A terminal/command prompt

### 2. Installation & Setup

```bash
# Navigate to project directory
cd "path/to/pickle ball true"

# Install dependencies
npm install

# Start the server
npm start
```

The application will start on `http://localhost:5000`

### 3. Access Points

**Customer Booking Page:**
```
http://localhost:5000
```

**Admin Dashboard:**
```
http://localhost:5000/admin.html
```

Default Admin Password: `admin123` (Change in `.env`)

## Project Structure

```
pickle ball true/
├── server.js                    # Express server & API endpoints
├── database.js                  # Database initialization (reference)
├── package.json                 # Project dependencies
├── .env                         # Environment variables
├── README.md                    # Project documentation
├── DEPLOYMENT.md               # This file
├── database.db                 # SQLite database (created on first run)
├── public/
│   ├── index.html              # Customer booking page
│   ├── admin.html              # Admin dashboard
│   ├── script.js               # Booking form logic
│   ├── admin-script.js         # Admin dashboard logic
│   ├── styles.css              # Customer page styling
│   └── admin-styles.css        # Admin dashboard styling
└── node_modules/               # Dependencies (auto-generated)
```

## Features Overview

### 👥 Customer Features
✅ Browse available time slots
✅ Book pickleball courts
✅ Select date, time, and duration
✅ Calculate pricing automatically
✅ Pay via GCash
✅ Get instant confirmation

### 👨‍💼 Admin Features
✅ Dashboard with key statistics
✅ View all bookings
✅ Filter bookings by date and status
✅ Real-time check-in/check-out
✅ Time tracking with duration calculation
✅ Cancel bookings
✅ View daily schedule

## API Endpoints

### User Management
```
POST   /api/users                    Create or get user
```

### Bookings
```
GET    /api/available-slots/:date    Get available time slots
POST   /api/bookings                 Create booking
GET    /api/bookings/user/:userId    Get user bookings
```

### Payments
```
POST   /api/payments/process         Process GCash payment
GET    /api/payments/:paymentId      Get payment status
```

### Admin
```
POST   /api/admin/login              Admin login
GET    /api/admin/bookings           Get all bookings
GET    /api/admin/stats              Get dashboard statistics
POST   /api/admin/checkin            Check in user
POST   /api/admin/checkout           Check out user
POST   /api/admin/cancel-booking     Cancel booking
```

## Database

SQLite database is automatically created on first run with these tables:

- **users** - User information
- **bookings** - Court reservations
- **payments** - Payment records
- **time_tracking** - Check-in/check-out records

## Environment Variables

Create `.env` file with:

```env
PORT=5000                          # Server port
NODE_ENV=development               # Environment
DB_PATH=./database.db             # Database path
GCASH_API_KEY=your_api_key        # GCash API key
GCASH_MERCHANT_ID=your_merchant   # GCash merchant ID
JWT_SECRET=your_secret_key        # JWT secret
ADMIN_PASSWORD=admin123           # Admin password
```

## Development

### Start with Auto-Reload
```bash
npm run dev
```

Requires `nodemon` (included in devDependencies)

### Troubleshooting

**Port 5000 already in use:**
```bash
# Change PORT in .env or kill the process
```

**Database locked:**
```bash
# Close all instances and restart
del database.db
npm start
```

**Modules not found:**
```bash
# Reinstall dependencies
rm -r node_modules
npm install
```

## Pricing Configuration

Edit `public/script.js` to modify prices:

```javascript
const PRICES = {
  1: 500,    // 1 hour = ₱500
  2: 900,    // 2 hours = ₱900
  3: 1200    // 3 hours = ₱1,200
};
```

## Court Configuration

Currently configured for 4 courts (7 AM - 7 PM):

To modify:
1. Update court count in `public/index.html` (court select dropdown)
2. Update working hours in `server.js` (`workingHours` array)

## GCash Integration

Current implementation uses reference numbers for manual verification.

To integrate with actual GCash API:
1. Get API credentials from GCash
2. Update `GCASH_API_KEY` and `GCASH_MERCHANT_ID` in `.env`
3. Modify `POST /api/payments/process` in `server.js`
4. Implement webhook for payment verification

## Security Notes

⚠️ For production deployment:

- [ ] Change `ADMIN_PASSWORD` in `.env`
- [ ] Enable HTTPS
- [ ] Implement proper authentication (JWT)
- [ ] Add input validation
- [ ] Implement rate limiting
- [ ] Use environment-specific `.env` files
- [ ] Set up regular database backups
- [ ] Add proper error logging
- [ ] Implement CORS restrictions
- [ ] Use database encryption
- [ ] Add API rate limiting
- [ ] Implement audit logging

## Production Deployment

### Option 1: AWS EC2
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Clone/upload project
git clone <repo-url>
cd pickle-ball-true

# Install & start
npm install
npm start
```

### Option 2: Heroku
```bash
heroku create velarde-courtside
git push heroku main
```

### Option 3: DigitalOcean App Platform
- Connect GitHub repository
- Set environment variables
- Deploy automatically

## Monitoring

Recommended tools:
- PM2 for process management
- Winston for logging
- New Relic for monitoring
- DataDog for analytics

## Backup & Maintenance

```bash
# Backup database
cp database.db database.backup.db

# Check logs
tail -f server.log

# Update dependencies
npm update
```

## Support & Updates

For issues or feature requests, contact the development team.

---

**Version:** 1.0.0
**Last Updated:** August 2026
**Status:** Ready for Deployment ✅
