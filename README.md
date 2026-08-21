# Velarde Courtside - Pickleball Court Booking System

A complete booking system for managing pickleball court reservations with GCash payment integration and admin dashboard for time tracking.

## Features

### 🎾 Customer Features
- **Easy Booking**: Simple form to reserve courts
- **Available Slots**: Real-time display of available time slots
- **GCash Payment**: Pay directly via GCash while booking
- **Booking Confirmation**: Instant confirmation after payment

### 👨‍💼 Admin Features
- **Dashboard**: Overview of bookings, revenue, and statistics
- **Booking Management**: View, filter, and manage all bookings
- **Time Tracking**: Check-in/check-out system for accurate time tracking
- **Real-time Updates**: Live updates of all bookings and payments

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite3
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Payment**: GCash (via reference numbers)

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```
   PORT=5000
   NODE_ENV=development
   ADMIN_PASSWORD=admin123
   GCASH_API_KEY=your_gcash_api_key
   GCASH_MERCHANT_ID=your_merchant_id
   JWT_SECRET=your_jwt_secret
   ```

3. **Start the server**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Customer Booking: `http://localhost:5000`
   - Admin Dashboard: `http://localhost:5000/admin.html`

## Usage

### For Customers

1. Navigate to the booking page
2. Fill in your information (Name, Email, Phone)
3. Select court, date, and time
4. Choose duration (1, 2, or 3 hours)
5. Review the total price
6. Proceed to payment
7. Enter your GCash reference number
8. Confirm booking

### For Admin

1. Go to Admin Dashboard (`/admin.html`)
2. Login with admin password
3. Use the dashboard to:
   - View today's schedule
   - Check booking statistics
   - Manage all bookings
   - Track time (check-in/check-out users)

## API Endpoints

### Users
- `POST /api/users` - Create or get user

### Bookings
- `GET /api/available-slots/:date` - Get available time slots
- `POST /api/bookings` - Create a new booking
- `GET /api/bookings/user/:userId` - Get user's bookings

### Payments
- `POST /api/payments/process` - Process GCash payment
- `GET /api/payments/:paymentId` - Get payment status

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/bookings` - Get all bookings
- `GET /api/admin/stats` - Get dashboard statistics
- `POST /api/admin/checkin` - Check in user
- `POST /api/admin/checkout` - Check out user
- `POST /api/admin/cancel-booking` - Cancel booking

## Database Schema

### Users
- id (UUID, PK)
- name
- email (Unique)
- phone
- created_at

### Bookings
- id (UUID, PK)
- user_id (FK)
- court_number
- booking_date
- start_time
- end_time
- duration_hours
- price_amount
- status (pending, confirmed, cancelled)
- created_at

### Payments
- id (UUID, PK)
- booking_id (FK, Unique)
- user_id (FK)
- amount
- payment_method (gcash)
- status (pending, completed, failed)
- reference_number
- gcash_transaction_id
- paid_at
- created_at

### Time Tracking
- id (UUID, PK)
- booking_id (FK, Unique)
- check_in_time
- check_out_time
- actual_duration_minutes
- notes
- created_at

## Court Details

- **Number of Courts**: 4
- **Operating Hours**: 7 AM to 7 PM
- **Pricing**:
  - 1 Hour: ₱500
  - 2 Hours: ₱900
  - 3 Hours: ₱1,200

## Security Considerations

⚠️ **Important**: This is a demo/development version. For production use:

1. Implement proper authentication (JWT)
2. Use HTTPS for all communications
3. Add input validation and sanitization
4. Implement rate limiting
5. Secure the GCash API integration
6. Add proper error handling
7. Use environment variables for all sensitive data
8. Implement proper CORS policies
9. Add database backups
10. Implement logging and monitoring

## Future Enhancements

- Email notifications for bookings
- SMS reminders
- Monthly reports
- Revenue analytics
- Integration with actual GCash API
- Mobile app
- Membership/Subscription plans
- Court maintenance scheduling
- User ratings and reviews

## Troubleshooting

### Port already in use
```bash
# Change PORT in .env file or kill the process using port 5000
```

### Database errors
```bash
# Delete database.db and restart the server to recreate it
del database.db
npm start
```

### Admin login fails
```bash
# Check ADMIN_PASSWORD in .env file
```

## License

Private - Velarde Courtside

## Support

For issues or questions, contact the development team.

---

**Made with ❤️ for Velarde Courtside Pickleball**
