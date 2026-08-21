const API_BASE = 'http://localhost:5000/api';

// State management
let currentUser = null;
let currentBooking = null;
let currentPayment = null;

// DOM Elements
const bookingForm = document.getElementById('bookingForm');
const paymentModal = document.getElementById('paymentModal');
const closeBtn = document.querySelector('.close');
const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
const dateInput = document.getElementById('date');
const startTimeSelect = document.getElementById('startTime');
const durationSelect = document.getElementById('duration');
const totalPriceDisplay = document.getElementById('totalPrice');

// Pricing
const PRICES = {
  1: 500,
  2: 900,
  3: 1200
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setMinDate();
});

function setupEventListeners() {
  bookingForm.addEventListener('submit', handleBookingSubmit);
  closeBtn.addEventListener('click', closeModal);
  confirmPaymentBtn.addEventListener('click', processPayment);
  dateInput.addEventListener('change', loadAvailableSlots);
  durationSelect.addEventListener('change', updatePrice);
  window.addEventListener('click', (e) => {
    if (e.target === paymentModal) closeModal();
  });
}

function setMinDate() {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const minDate = tomorrow.toISOString().split('T')[0];
  dateInput.min = minDate;
  dateInput.value = minDate;
  loadAvailableSlots();
}

async function loadAvailableSlots() {
  const date = dateInput.value;
  if (!date) return;

  try {
    const response = await fetch(`${API_BASE}/available-slots/${date}`);
    const data = await response.json();

    startTimeSelect.innerHTML = '<option value="">Select start time</option>';
    
    if (data.availableSlots && data.availableSlots.length > 0) {
      data.availableSlots.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = slot;
        startTimeSelect.appendChild(option);
      });
    } else {
      const option = document.createElement('option');
      option.textContent = 'No available slots';
      option.disabled = true;
      startTimeSelect.appendChild(option);
    }
  } catch (error) {
    console.error('Error loading available slots:', error);
    showNotification('Error loading available time slots', 'error');
  }
}

function updatePrice() {
  const duration = parseInt(durationSelect.value) || 0;
  const price = PRICES[duration] || 0;
  totalPriceDisplay.textContent = `₱${price.toLocaleString()}`;
}

async function handleBookingSubmit(e) {
  e.preventDefault();

  // Validate form
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const phone = document.getElementById('phone').value;
  const court = document.getElementById('court').value;
  const date = dateInput.value;
  const startTime = startTimeSelect.value;
  const duration = parseInt(durationSelect.value);

  if (!name || !email || !phone || !court || !date || !startTime || !duration) {
    showNotification('Please fill in all required fields', 'error');
    return;
  }

  try {
    // Create or get user
    const userResponse = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone })
    });

    const user = await userResponse.json();
    currentUser = user;

    // Calculate end time
    const [hours, minutes] = startTime.split(':');
    const startHour = parseInt(hours);
    const endHour = startHour + duration;
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;

    // Create booking
    const price = PRICES[duration];
    const bookingResponse = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        courtNumber: parseInt(court),
        bookingDate: date,
        startTime: startTime,
        endTime: endTime,
        durationHours: duration,
        priceAmount: price
      })
    });

    const booking = await bookingResponse.json();
    currentBooking = booking;
    currentPayment = { ...booking, price };

    // Show payment modal
    showPaymentModal();
  } catch (error) {
    console.error('Error creating booking:', error);
    showNotification('Error creating booking', 'error');
  }
}

function showPaymentModal() {
  const date = new Date(currentBooking.bookingDate);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  document.getElementById('summaryCourtNumber').textContent = `Court ${currentBooking.courtNumber}`;
  document.getElementById('summaryDate').textContent = formattedDate;
  document.getElementById('summaryTime').textContent = `${currentBooking.startTime} - ${currentBooking.endTime}`;
  document.getElementById('summaryDuration').textContent = `${currentBooking.durationHours} hour(s)`;
  document.getElementById('summaryAmount').textContent = `₱${currentBooking.priceAmount.toLocaleString()}`;
  document.getElementById('paymentAmount').textContent = `₱${currentBooking.priceAmount.toLocaleString()}`;

  paymentModal.style.display = 'block';
}

function closeModal() {
  paymentModal.style.display = 'none';
  document.getElementById('gcashRef').value = '';
  document.getElementById('successMessage').style.display = 'none';
  document.querySelector('.payment-section').style.display = 'block';
}

async function processPayment() {
  const gcashRef = document.getElementById('gcashRef').value;

  if (!gcashRef) {
    showNotification('Please enter GCash reference number', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/payments/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: currentBooking.paymentId,
        bookingId: currentBooking.bookingId,
        userId: currentUser.id,
        amount: currentBooking.priceAmount,
        gcashReference: gcashRef
      })
    });

    const result = await response.json();

    if (result.success) {
      // Hide payment form and show success message
      document.querySelector('.payment-section').style.display = 'none';
      document.getElementById('successMessage').style.display = 'block';

      // Reset form after delay
      setTimeout(() => {
        bookingForm.reset();
        closeModal();
      }, 3000);
    } else {
      showNotification('Error processing payment', 'error');
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    showNotification('Error processing payment', 'error');
  }
}

async function adminLogin() {
  const password = document.getElementById('adminPassword').value;

  if (!password) {
    showNotification('Please enter password', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    const result = await response.json();

    if (result.success) {
      localStorage.setItem('adminToken', result.token);
      document.getElementById('adminLoginForm').style.display = 'none';
      document.getElementById('adminDashboard').style.display = 'block';
      showNotification('Admin login successful', 'success');
    } else {
      showNotification('Invalid password', 'error');
    }
  } catch (error) {
    console.error('Error logging in:', error);
    showNotification('Error logging in', 'error');
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
    color: white;
    border-radius: 5px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Add styles for notification animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);
