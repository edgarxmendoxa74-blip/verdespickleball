const API_BASE = 'http://localhost:5000/api';

let allBookings = [];
let selectedBookingId = null;
let currentTracking = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  updateCurrentTime();
  setInterval(updateCurrentTime, 1000);
  refreshData();
  setInterval(refreshData, 30000); // Refresh every 30 seconds
});

function checkAdminAuth() {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    window.location.href = '/';
  }
}

function logout() {
  localStorage.removeItem('adminToken');
  window.location.href = '/';
}

function updateCurrentTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  document.getElementById('currentTime').textContent = timeStr;
}

function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });

  // Remove active class from nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });

  // Show selected section
  document.getElementById(sectionId).classList.add('active');

  // Add active class to clicked nav item
  event.target.classList.add('active');

  // Update page title
  const titles = {
    dashboard: 'Dashboard',
    bookings: 'All Bookings',
    'time-tracking': 'Time Tracking'
  };
  document.getElementById('pageTitle').textContent = titles[sectionId] || 'Dashboard';

  // Load data if needed
  if (sectionId === 'bookings') {
    loadAllBookings();
  } else if (sectionId === 'time-tracking') {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('trackingDate').value = today;
  }
}

async function refreshData() {
  try {
    const response = await fetch(`${API_BASE}/admin/stats`);
    const stats = await response.json();

    document.getElementById('totalBookings').textContent = stats.totalBookings;
    document.getElementById('completedBookings').textContent = stats.completedBookings;
    document.getElementById('totalRevenue').textContent = `₱${stats.totalRevenue.toLocaleString()}`;
    document.getElementById('todayBookings').textContent = stats.todayBookings;

    loadTodaySchedule();
    loadAllBookings();
  } catch (error) {
    console.error('Error refreshing data:', error);
  }
}

async function loadTodaySchedule() {
  try {
    const response = await fetch(`${API_BASE}/admin/bookings`);
    const bookings = await response.json();

    const today = new Date().toISOString().split('T')[0];
    const todayBookings = bookings.filter(b => b.booking_date === today);

    const scheduleList = document.getElementById('todaySchedule');
    
    if (todayBookings.length === 0) {
      scheduleList.innerHTML = '<p class="empty-state">No bookings for today</p>';
      return;
    }

    scheduleList.innerHTML = todayBookings
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .map(booking => `
        <div class="schedule-item">
          <div class="schedule-time">${booking.start_time} - ${booking.end_time}</div>
          <div class="schedule-details">
            <strong>Court ${booking.court_number}: ${booking.name}</strong>
            <small>${booking.email} | ${booking.phone}</small>
          </div>
          <span class="schedule-status status-${booking.status}">${capitalizeFirst(booking.status)}</span>
        </div>
      `).join('');
  } catch (error) {
    console.error('Error loading today schedule:', error);
  }
}

async function loadAllBookings() {
  try {
    const response = await fetch(`${API_BASE}/admin/bookings`);
    allBookings = await response.json();
    renderBookingsTable(allBookings);
  } catch (error) {
    console.error('Error loading bookings:', error);
  }
}

function renderBookingsTable(bookings) {
  const tbody = document.getElementById('bookingsTableBody');

  if (bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No bookings found</td></tr>';
    return;
  }

  tbody.innerHTML = bookings
    .sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date))
    .map(booking => {
      const dateObj = new Date(booking.booking_date);
      const formattedDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      return `
        <tr>
          <td>${formattedDate} ${booking.start_time}</td>
          <td>${booking.name}</td>
          <td>Court ${booking.court_number}</td>
          <td>${booking.duration_hours}h</td>
          <td>₱${booking.price_amount.toLocaleString()}</td>
          <td>
            <span class="schedule-status status-${booking.status}">
              ${capitalizeFirst(booking.status)}
            </span>
          </td>
          <td>
            <div class="action-buttons">
              <button class="btn-small btn-tracking" onclick="openTrackingModal('${booking.id}')">
                Track
              </button>
              <button class="btn-small btn-cancel" onclick="openCancelModal('${booking.id}')">
                Cancel
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
}

function filterBookings() {
  const status = document.getElementById('statusFilter').value;
  const date = document.getElementById('dateFilter').value;

  let filtered = allBookings;

  if (status) {
    filtered = filtered.filter(b => b.status === status);
  }

  if (date) {
    filtered = filtered.filter(b => b.booking_date === date);
  }

  renderBookingsTable(filtered);
}

function openTrackingModal(bookingId) {
  selectedBookingId = bookingId;
  const booking = allBookings.find(b => b.id === bookingId);

  if (!booking) return;

  const dateObj = new Date(booking.booking_date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const infoHtml = `
    <div class="tracking-info-row">
      <strong>Guest:</strong>
      <span>${booking.name}</span>
    </div>
    <div class="tracking-info-row">
      <strong>Court:</strong>
      <span>Court ${booking.court_number}</span>
    </div>
    <div class="tracking-info-row">
      <strong>Date & Time:</strong>
      <span>${formattedDate} ${booking.start_time} - ${booking.end_time}</span>
    </div>
    <div class="tracking-info-row">
      <strong>Booked Duration:</strong>
      <span>${booking.duration_hours} hour(s)</span>
    </div>
    ${booking.check_in_time ? `
      <div class="tracking-info-row">
        <strong>Checked In:</strong>
        <span>${new Date(booking.check_in_time).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })}</span>
      </div>
    ` : ''}
  `;

  document.getElementById('trackingInfo').innerHTML = infoHtml;

  const checkInBtn = document.getElementById('checkInBtn');
  const checkOutBtn = document.getElementById('checkOutBtn');

  if (booking.check_in_time) {
    checkInBtn.disabled = true;
    checkOutBtn.disabled = false;
  } else {
    checkInBtn.disabled = false;
    checkOutBtn.disabled = true;
  }

  document.getElementById('trackingResult').innerHTML = '';
  document.getElementById('trackingResult').classList.remove('show');

  document.getElementById('trackingModal').classList.add('active');
}

function closeTrackingModal() {
  document.getElementById('trackingModal').classList.remove('active');
  selectedBookingId = null;
}

async function checkIn() {
  try {
    const response = await fetch(`${API_BASE}/admin/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: selectedBookingId })
    });

    const result = await response.json();

    if (result.success) {
      showTrackingResult('✓ User checked in successfully', 'success');
      document.getElementById('checkInBtn').disabled = true;
      document.getElementById('checkOutBtn').disabled = false;
      setTimeout(refreshData, 1000);
    }
  } catch (error) {
    console.error('Error checking in:', error);
    showTrackingResult('Error checking in user', 'error');
  }
}

async function checkOut() {
  try {
    const response = await fetch(`${API_BASE}/admin/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: selectedBookingId })
    });

    const result = await response.json();

    if (result.success) {
      showTrackingResult(
        `✓ User checked out<br>Actual Duration: ${result.durationHours} hours (${result.actualDuration} minutes)`,
        'success'
      );
      document.getElementById('checkOutBtn').disabled = true;
      setTimeout(refreshData, 1000);
    }
  } catch (error) {
    console.error('Error checking out:', error);
    showTrackingResult('Error checking out user', 'error');
  }
}

function showTrackingResult(message, type) {
  const resultDiv = document.getElementById('trackingResult');
  resultDiv.innerHTML = message;
  resultDiv.style.background = type === 'success' ? '#d4edda' : '#f8d7da';
  resultDiv.style.color = type === 'success' ? '#155724' : '#721c24';
  resultDiv.classList.add('show');
}

async function loadTimeTracking() {
  const date = document.getElementById('trackingDate').value;
  if (!date) return;

  try {
    const response = await fetch(`${API_BASE}/admin/bookings`);
    const bookings = await response.json();

    const dateBookings = bookings.filter(b => b.booking_date === date);

    const trackingList = document.getElementById('trackingList');

    if (dateBookings.length === 0) {
      trackingList.innerHTML = '<p class="empty-state">No bookings for this date</p>';
      return;
    }

    trackingList.innerHTML = dateBookings
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .map(booking => {
        const statusClass = booking.check_out_time ? 'completed' : booking.check_in_time ? 'checked-in' : 'pending';
        
        return `
          <div class="tracking-card">
            <div class="tracking-card-header">
              <h4>${booking.start_time} - ${booking.end_time} | Court ${booking.court_number}</h4>
              <span class="schedule-status status-${statusClass}">${capitalizeFirst(statusClass)}</span>
            </div>
            <div class="tracking-card-info">
              <div class="tracking-info-item">
                <strong>Guest:</strong>
                ${booking.name}
              </div>
              <div class="tracking-info-item">
                <strong>Phone:</strong>
                ${booking.phone}
              </div>
              <div class="tracking-info-item">
                <strong>Booked:</strong>
                ${booking.duration_hours}h
              </div>
              ${booking.check_in_time ? `
                <div class="tracking-info-item">
                  <strong>Check In:</strong>
                  ${new Date(booking.check_in_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              ` : ''}
              ${booking.check_out_time ? `
                <div class="tracking-info-item">
                  <strong>Check Out:</strong>
                  ${new Date(booking.check_out_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div class="tracking-info-item">
                  <strong>Actual:</strong>
                  ${booking.actual_duration_minutes} min
                </div>
              ` : ''}
            </div>
            <button class="btn-small btn-tracking" onclick="openTrackingModal('${booking.id}')">
              ${booking.check_out_time ? 'View' : 'Update Tracking'}
            </button>
          </div>
        `;
      }).join('');
  } catch (error) {
    console.error('Error loading time tracking:', error);
    document.getElementById('trackingList').innerHTML = '<p class="empty-state">Error loading bookings</p>';
  }
}

function openCancelModal(bookingId) {
  selectedBookingId = bookingId;
  document.getElementById('cancelModal').classList.add('active');
}

function closeCancelModal() {
  document.getElementById('cancelModal').classList.remove('active');
  selectedBookingId = null;
}

async function confirmCancel() {
  try {
    const response = await fetch(`${API_BASE}/admin/cancel-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: selectedBookingId })
    });

    const result = await response.json();

    if (result.success) {
      closeCancelModal();
      showNotification('Booking cancelled successfully', 'success');
      refreshData();
    }
  } catch (error) {
    console.error('Error cancelling booking:', error);
    showNotification('Error cancelling booking', 'error');
  }
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
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
