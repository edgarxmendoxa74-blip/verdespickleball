const API_BASE = 'http://localhost:5000/api';
const ADMIN_API = 'http://localhost:5000/api/admin';

let currentUser = null;
let currentEditingId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  updateCurrentTime();
  setInterval(updateCurrentTime, 1000);
  loadDashboard();
  setupFormListeners();
});

function checkAdminAuth() {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    window.location.href = '/admin.html';
  }
  
  const username = localStorage.getItem('adminUsername') || 'Admin';
  document.getElementById('adminUser').textContent = `👤 ${username}`;
}

function logout() {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUsername');
  window.location.href = '/admin.html';
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

function navigateTo(section) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  
  // Remove active from nav items
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  
  // Show selected section
  const sectionId = section === 'dashboard' ? 'dashboard-section' : `${section}-section`;
  const section_elem = document.getElementById(sectionId);
  if (section_elem) {
    section_elem.classList.add('active');
  }
  
  // Set nav item active
  event.target.classList.add('active');
  
  // Update page title
  const titles = {
    'dashboard': 'Dashboard',
    'website-settings': 'Website Settings',
    'courts': 'Court Management',
    'pricing': 'Pricing Management',
    'payment-methods': 'Payment Methods',
    'bookings': 'Bookings Management',
    'time-monitoring': 'Time Monitoring',
    'admin-accounts': 'Admin Accounts',
    'activity-log': 'Activity Log'
  };
  document.getElementById('pageTitle').textContent = titles[section] || 'Dashboard';
  
  // Load section data
  if (section === 'website-settings') loadWebsiteSettings();
  if (section === 'courts') loadCourts();
  if (section === 'pricing') loadPricing();
  if (section === 'payment-methods') loadPaymentMethods();
  if (section === 'bookings') loadBookings();
  if (section === 'admin-accounts') loadAdminAccounts();
  if (section === 'activity-log') loadActivityLog();
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const stats = await fetch(`${ADMIN_API}/stats`).then(r => r.json());
    
    document.getElementById('dashTodayBookings').textContent = stats.todayBookings || 0;
    document.getElementById('dashActiveCourts').textContent = stats.activeCourts || 0;
    document.getElementById('dashTodayRevenue').textContent = `₱${(stats.todayRevenue || 0).toLocaleString()}`;
    document.getElementById('dashTotalUsers').textContent = stats.totalUsers || 0;
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

// ===== WEBSITE SETTINGS =====
async function loadWebsiteSettings() {
  try {
    const settings = await fetch(`${ADMIN_API}/website-settings`).then(r => r.json());
    
    document.getElementById('siteName').value = settings.site_name || 'Velarde Courtside';
    document.getElementById('sitePhone').value = settings.phone || '';
    document.getElementById('siteEmail').value = settings.email || '';
    document.getElementById('siteAddress').value = settings.address || '';
    document.getElementById('operatingStart').value = settings.operating_hours_start || '07:00';
    document.getElementById('operatingEnd').value = settings.operating_hours_end || '19:00';
    document.getElementById('siteDescription').value = settings.site_description || '';
    document.getElementById('aboutText').value = settings.about_text || '';
    document.getElementById('termsText').value = settings.terms_text || '';
  } catch (error) {
    console.error('Error loading website settings:', error);
  }
}

document.getElementById('websiteSettingsForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const settings = {
      site_name: document.getElementById('siteName').value,
      phone: document.getElementById('sitePhone').value,
      email: document.getElementById('siteEmail').value,
      address: document.getElementById('siteAddress').value,
      operating_hours_start: document.getElementById('operatingStart').value,
      operating_hours_end: document.getElementById('operatingEnd').value,
      site_description: document.getElementById('siteDescription').value,
      about_text: document.getElementById('aboutText').value,
      terms_text: document.getElementById('termsText').value
    };
    
    await fetch(`${ADMIN_API}/website-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    
    showNotification('Website settings saved successfully', 'success');
  } catch (error) {
    showNotification('Error saving website settings', 'error');
  }
});

// ===== COURTS MANAGEMENT =====
async function loadCourts() {
  try {
    const courts = await fetch(`${ADMIN_API}/courts`).then(r => r.json());
    
    const grid = document.getElementById('courtsGrid');
    if (courts.length === 0) {
      grid.innerHTML = '<p class="text-muted">No courts configured</p>';
      return;
    }
    
    grid.innerHTML = courts.map(court => `
      <div class="court-card">
        <div class="court-card-header">
          <h4>Court ${court.court_number}</h4>
        </div>
        <div class="court-card-body">
          <div class="court-card-info">
            <div class="court-info-item">
              <strong>Name:</strong>
              <span>${court.name}</span>
            </div>
            <div class="court-info-item">
              <strong>Capacity:</strong>
              <span>${court.capacity} players</span>
            </div>
            <div class="court-info-item">
              <strong>Surface:</strong>
              <span>${court.surface_type || 'N/A'}</span>
            </div>
            <div class="court-info-item">
              <span class="court-status status-${court.status}">${court.status.toUpperCase()}</span>
            </div>
          </div>
          ${court.description ? `<p><small>${court.description}</small></p>` : ''}
          <div class="court-card-actions">
            <button onclick="editCourt('${court.id}')" class="btn-small btn-edit">Edit</button>
            <button onclick="deleteCourt('${court.id}')" class="btn-small btn-delete">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading courts:', error);
  }
}

function openCourtModal(courtId = null) {
  currentEditingId = courtId;
  const modal = document.getElementById('courtModal');
  
  if (courtId) {
    // Load court data
    fetch(`${ADMIN_API}/courts/${courtId}`).then(r => r.json()).then(court => {
      document.getElementById('courtNumber').value = court.court_number;
      document.getElementById('courtName').value = court.name;
      document.getElementById('courtDescription').value = court.description || '';
      document.getElementById('courtCapacity').value = court.capacity || 4;
      document.getElementById('courtSurface').value = court.surface_type || '';
      document.getElementById('courtStatus').value = court.status || 'active';
    });
  } else {
    document.getElementById('courtForm').reset();
  }
  
  modal.classList.add('active');
}

function closeCourtModal() {
  document.getElementById('courtModal').classList.remove('active');
  currentEditingId = null;
}

document.getElementById('courtForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const data = {
    court_number: document.getElementById('courtNumber').value,
    name: document.getElementById('courtName').value,
    description: document.getElementById('courtDescription').value,
    capacity: document.getElementById('courtCapacity').value,
    surface_type: document.getElementById('courtSurface').value,
    status: document.getElementById('courtStatus').value
  };
  
  try {
    const method = currentEditingId ? 'PUT' : 'POST';
    const url = currentEditingId ? 
      `${ADMIN_API}/courts/${currentEditingId}` : 
      `${ADMIN_API}/courts`;
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    showNotification('Court saved successfully', 'success');
    closeCourtModal();
    loadCourts();
  } catch (error) {
    showNotification('Error saving court', 'error');
  }
});

function editCourt(courtId) {
  openCourtModal(courtId);
}

async function deleteCourt(courtId) {
  if (!confirm('Are you sure you want to delete this court?')) return;
  
  try {
    await fetch(`${ADMIN_API}/courts/${courtId}`, { method: 'DELETE' });
    showNotification('Court deleted successfully', 'success');
    loadCourts();
  } catch (error) {
    showNotification('Error deleting court', 'error');
  }
}

// ===== PRICING MANAGEMENT =====
async function loadPricing() {
  try {
    const pricing = await fetch(`${ADMIN_API}/pricing`).then(r => r.json());
    
    const tbody = document.getElementById('pricingTableBody');
    if (pricing.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-muted">No pricing configured</td></tr>';
      return;
    }
    
    tbody.innerHTML = pricing.map(p => `
      <tr>
        <td>${p.duration_hours} hour(s)</td>
        <td>₱${p.price_amount.toLocaleString()}</td>
        <td>${p.day_type}</td>
        <td><span class="court-status status-${p.is_active ? 'active' : 'inactive'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
        <td>
          <div class="table-actions">
            <button onclick="editPricing('${p.id}')" class="btn-small btn-edit">Edit</button>
            <button onclick="deletePricing('${p.id}')" class="btn-small btn-delete">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading pricing:', error);
  }
}

function openPricingModal(pricingId = null) {
  currentEditingId = pricingId;
  const modal = document.getElementById('pricingModal');
  
  if (pricingId) {
    fetch(`${ADMIN_API}/pricing/${pricingId}`).then(r => r.json()).then(pricing => {
      document.getElementById('pricingDuration').value = pricing.duration_hours;
      document.getElementById('pricingAmount').value = pricing.price_amount;
      document.getElementById('pricingDayType').value = pricing.day_type;
      document.getElementById('pricingDescription').value = pricing.description || '';
      document.getElementById('pricingActive').checked = pricing.is_active;
    });
  } else {
    document.getElementById('pricingForm').reset();
  }
  
  modal.classList.add('active');
}

function closePricingModal() {
  document.getElementById('pricingModal').classList.remove('active');
  currentEditingId = null;
}

document.getElementById('pricingForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const data = {
    duration_hours: document.getElementById('pricingDuration').value,
    price_amount: document.getElementById('pricingAmount').value,
    day_type: document.getElementById('pricingDayType').value,
    description: document.getElementById('pricingDescription').value,
    is_active: document.getElementById('pricingActive').checked
  };
  
  try {
    const method = currentEditingId ? 'PUT' : 'POST';
    const url = currentEditingId ? 
      `${ADMIN_API}/pricing/${currentEditingId}` : 
      `${ADMIN_API}/pricing`;
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    showNotification('Pricing saved successfully', 'success');
    closePricingModal();
    loadPricing();
  } catch (error) {
    showNotification('Error saving pricing', 'error');
  }
});

function editPricing(pricingId) {
  openPricingModal(pricingId);
}

async function deletePricing(pricingId) {
  if (!confirm('Are you sure you want to delete this pricing?')) return;
  
  try {
    await fetch(`${ADMIN_API}/pricing/${pricingId}`, { method: 'DELETE' });
    showNotification('Pricing deleted successfully', 'success');
    loadPricing();
  } catch (error) {
    showNotification('Error deleting pricing', 'error');
  }
}

// ===== PAYMENT METHODS =====
async function loadPaymentMethods() {
  try {
    const methods = await fetch(`${ADMIN_API}/payment-methods`).then(r => r.json());
    
    const grid = document.getElementById('paymentMethodsGrid');
    if (methods.length === 0) {
      grid.innerHTML = '<p class="text-muted">No payment methods configured</p>';
      return;
    }
    
    grid.innerHTML = methods.map(method => `
      <div class="payment-method-card">
        <h4>${method.method_name}</h4>
        <div class="payment-method-details">
          <div class="detail-item">
            <strong>Status</strong>
            <span>${method.is_active ? '✓ Active' : '✗ Inactive'}</span>
          </div>
          ${method.description ? `
            <div class="detail-item">
              <strong>Description</strong>
              <span>${method.description}</span>
            </div>
          ` : ''}
          ${method.account_details ? `
            <div class="detail-item">
              <strong>Account</strong>
              <span>${method.account_details}</span>
            </div>
          ` : ''}
        </div>
        <div class="payment-method-actions">
          <button onclick="editPaymentMethod('${method.id}')" class="btn-small btn-edit">Edit</button>
          <button onclick="deletePaymentMethod('${method.id}')" class="btn-small btn-delete">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading payment methods:', error);
  }
}

function openPaymentMethodModal(methodId = null) {
  currentEditingId = methodId;
  const modal = document.getElementById('paymentMethodModal');
  
  if (methodId) {
    fetch(`${ADMIN_API}/payment-methods/${methodId}`).then(r => r.json()).then(method => {
      document.getElementById('methodName').value = method.method_name;
      document.getElementById('methodDescription').value = method.description || '';
      document.getElementById('methodInstructions').value = method.instructions || '';
      document.getElementById('methodAccountDetails').value = method.account_details || '';
      document.getElementById('methodActive').checked = method.is_active;
    });
  } else {
    document.getElementById('paymentMethodForm').reset();
  }
  
  modal.classList.add('active');
}

function closePaymentMethodModal() {
  document.getElementById('paymentMethodModal').classList.remove('active');
  currentEditingId = null;
}

document.getElementById('paymentMethodForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const data = {
    method_name: document.getElementById('methodName').value,
    description: document.getElementById('methodDescription').value,
    instructions: document.getElementById('methodInstructions').value,
    account_details: document.getElementById('methodAccountDetails').value,
    is_active: document.getElementById('methodActive').checked
  };
  
  try {
    const method = currentEditingId ? 'PUT' : 'POST';
    const url = currentEditingId ? 
      `${ADMIN_API}/payment-methods/${currentEditingId}` : 
      `${ADMIN_API}/payment-methods`;
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    showNotification('Payment method saved successfully', 'success');
    closePaymentMethodModal();
    loadPaymentMethods();
  } catch (error) {
    showNotification('Error saving payment method', 'error');
  }
});

function editPaymentMethod(methodId) {
  openPaymentMethodModal(methodId);
}

async function deletePaymentMethod(methodId) {
  if (!confirm('Are you sure you want to delete this payment method?')) return;
  
  try {
    await fetch(`${ADMIN_API}/payment-methods/${methodId}`, { method: 'DELETE' });
    showNotification('Payment method deleted successfully', 'success');
    loadPaymentMethods();
  } catch (error) {
    showNotification('Error deleting payment method', 'error');
  }
}

// ===== BOOKINGS MANAGEMENT =====
async function loadBookings() {
  try {
    const date = document.getElementById('bookingDateFilter').value;
    const status = document.getElementById('bookingStatusFilter').value;
    
    let url = `${ADMIN_API}/bookings`;
    const params = [];
    if (date) params.push(`date=${date}`);
    if (status) params.push(`status=${status}`);
    if (params.length) url += '?' + params.join('&');
    
    const bookings = await fetch(url).then(r => r.json());
    
    const tbody = document.getElementById('bookingsTableBody');
    if (bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-muted">No bookings found</td></tr>';
      return;
    }
    
    tbody.innerHTML = bookings.map(b => {
      const dateObj = new Date(b.booking_date);
      const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      return `
        <tr>
          <td>${dateStr} ${b.start_time}</td>
          <td>${b.name}</td>
          <td>Court ${b.court_number}</td>
          <td>${b.duration_hours}h</td>
          <td>₱${b.price_amount}</td>
          <td><span class="court-status status-${b.status}">${b.status}</span></td>
          <td>
            <div class="table-actions">
              <button onclick="editBooking('${b.id}')" class="btn-small btn-edit">Edit</button>
              <button onclick="deleteBooking('${b.id}')" class="btn-small btn-delete">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading bookings:', error);
  }
}

function editBooking(bookingId) {
  currentEditingId = bookingId;
  document.getElementById('bookingModal').classList.add('active');
  
  // Load booking data
  fetch(`${ADMIN_API}/bookings/${bookingId}`).then(r => r.json()).then(booking => {
    document.getElementById('bookingGuest').value = booking.name;
    document.getElementById('bookingCourt').value = booking.court_number;
    document.getElementById('bookingDate').value = booking.booking_date;
    document.getElementById('bookingStartTime').value = booking.start_time;
    document.getElementById('bookingDuration').value = booking.duration_hours;
    document.getElementById('bookingStatus').value = booking.status;
  });
}

function closeBookingModal() {
  document.getElementById('bookingModal').classList.remove('active');
  currentEditingId = null;
}

document.getElementById('bookingForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const data = {
    court_number: document.getElementById('bookingCourt').value,
    booking_date: document.getElementById('bookingDate').value,
    start_time: document.getElementById('bookingStartTime').value,
    duration_hours: document.getElementById('bookingDuration').value,
    status: document.getElementById('bookingStatus').value
  };
  
  try {
    await fetch(`${ADMIN_API}/bookings/${currentEditingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    showNotification('Booking updated successfully', 'success');
    closeBookingModal();
    loadBookings();
  } catch (error) {
    showNotification('Error updating booking', 'error');
  }
});

async function deleteBooking(bookingId) {
  if (!confirm('Are you sure you want to delete this booking?')) return;
  
  try {
    await fetch(`${ADMIN_API}/bookings/${bookingId}`, { method: 'DELETE' });
    showNotification('Booking deleted successfully', 'success');
    loadBookings();
  } catch (error) {
    showNotification('Error deleting booking', 'error');
  }
}

// ===== TIME MONITORING =====
async function loadTimeMonitoring() {
  try {
    const date = document.getElementById('monitoringDate').value;
    if (!date) return;
    
    const bookings = await fetch(`${ADMIN_API}/bookings?date=${date}`).then(r => r.json());
    const list = document.getElementById('timeMonitoringList');
    
    if (bookings.length === 0) {
      list.innerHTML = '<p class="text-muted">No bookings for this date</p>';
      return;
    }
    
    list.innerHTML = bookings
      .filter(b => b.status === 'confirmed')
      .map(b => `
        <div class="monitoring-card">
          <div class="monitoring-header">
            <h4>${b.start_time} - ${b.end_time} | Court ${b.court_number}</h4>
            <span class="monitoring-status status-${b.check_out_time ? 'checked-out' : b.check_in_time ? 'checked-in' : 'pending'}">
              ${b.check_out_time ? 'Completed' : b.check_in_time ? 'In Progress' : 'Pending'}
            </span>
          </div>
          <div class="monitoring-info">
            <div class="info-item">
              <strong>Guest</strong>
              ${b.name}
            </div>
            <div class="info-item">
              <strong>Phone</strong>
              ${b.phone}
            </div>
            <div class="info-item">
              <strong>Booked</strong>
              ${b.duration_hours}h
            </div>
            ${b.check_in_time ? `
              <div class="info-item">
                <strong>Checked In</strong>
                ${new Date(b.check_in_time).toLocaleTimeString()}
              </div>
            ` : ''}
            ${b.check_out_time ? `
              <div class="info-item">
                <strong>Checked Out</strong>
                ${new Date(b.check_out_time).toLocaleTimeString()}
              </div>
              <div class="info-item">
                <strong>Actual Duration</strong>
                ${b.actual_duration_minutes} min
              </div>
            ` : ''}
          </div>
          <div class="monitoring-actions">
            ${!b.check_in_time ? `
              <button onclick="checkIn('${b.id}')" class="btn-small btn-primary">Check In</button>
            ` : !b.check_out_time ? `
              <button onclick="checkOut('${b.id}')" class="btn-small btn-secondary">Check Out</button>
            ` : ''}
          </div>
        </div>
      `).join('');
  } catch (error) {
    console.error('Error loading time monitoring:', error);
  }
}

async function checkIn(bookingId) {
  try {
    await fetch(`${ADMIN_API}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId })
    });
    
    showNotification('Guest checked in successfully', 'success');
    loadTimeMonitoring();
  } catch (error) {
    showNotification('Error checking in', 'error');
  }
}

async function checkOut(bookingId) {
  try {
    const response = await fetch(`${ADMIN_API}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId })
    }).then(r => r.json());
    
    showNotification(`Guest checked out. Actual duration: ${response.durationHours}h`, 'success');
    loadTimeMonitoring();
  } catch (error) {
    showNotification('Error checking out', 'error');
  }
}

// ===== ADMIN ACCOUNTS =====
async function loadAdminAccounts() {
  try {
    const accounts = await fetch(`${ADMIN_API}/accounts`).then(r => r.json());
    
    const tbody = document.getElementById('adminAccountsTableBody');
    if (accounts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">No admin accounts</td></tr>';
      return;
    }
    
    tbody.innerHTML = accounts.map(account => `
      <tr>
        <td>${account.username}</td>
        <td>${account.full_name || 'N/A'}</td>
        <td>${account.email || 'N/A'}</td>
        <td><span class="court-status status-${account.role === 'super_admin' ? 'active' : 'maintenance'}">${account.role}</span></td>
        <td><span class="court-status status-${account.is_active ? 'active' : 'inactive'}">${account.is_active ? 'Active' : 'Inactive'}</span></td>
        <td>${account.last_login ? new Date(account.last_login).toLocaleString() : 'Never'}</td>
        <td>
          <div class="table-actions">
            <button onclick="editAdminAccount('${account.id}')" class="btn-small btn-edit">Edit</button>
            <button onclick="deleteAdminAccount('${account.id}')" class="btn-small btn-delete">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading admin accounts:', error);
  }
}

function openAdminAccountModal(accountId = null) {
  currentEditingId = accountId;
  const modal = document.getElementById('adminAccountModal');
  
  if (accountId) {
    fetch(`${ADMIN_API}/accounts/${accountId}`).then(r => r.json()).then(account => {
      document.getElementById('adminUsername').value = account.username;
      document.getElementById('adminEmail').value = account.email;
      document.getElementById('adminFullName').value = account.full_name;
      document.getElementById('adminRole').value = account.role;
      document.getElementById('adminActive').checked = account.is_active;
      document.getElementById('adminPassword').value = '';
    });
  } else {
    document.getElementById('adminAccountForm').reset();
  }
  
  modal.classList.add('active');
}

function closeAdminAccountModal() {
  document.getElementById('adminAccountModal').classList.remove('active');
  currentEditingId = null;
}

document.getElementById('adminAccountForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const data = {
    username: document.getElementById('adminUsername').value,
    email: document.getElementById('adminEmail').value,
    full_name: document.getElementById('adminFullName').value,
    role: document.getElementById('adminRole').value,
    is_active: document.getElementById('adminActive').checked
  };
  
  if (document.getElementById('adminPassword').value) {
    data.password = document.getElementById('adminPassword').value;
  }
  
  try {
    const method = currentEditingId ? 'PUT' : 'POST';
    const url = currentEditingId ? 
      `${ADMIN_API}/accounts/${currentEditingId}` : 
      `${ADMIN_API}/accounts`;
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    showNotification('Admin account saved successfully', 'success');
    closeAdminAccountModal();
    loadAdminAccounts();
  } catch (error) {
    showNotification('Error saving admin account', 'error');
  }
});

function editAdminAccount(accountId) {
  openAdminAccountModal(accountId);
}

async function deleteAdminAccount(accountId) {
  if (!confirm('Are you sure you want to delete this admin account?')) return;
  
  try {
    await fetch(`${ADMIN_API}/accounts/${accountId}`, { method: 'DELETE' });
    showNotification('Admin account deleted successfully', 'success');
    loadAdminAccounts();
  } catch (error) {
    showNotification('Error deleting admin account', 'error');
  }
}

// ===== ACTIVITY LOG =====
async function loadActivityLog() {
  try {
    const logs = await fetch(`${ADMIN_API}/activity-log`).then(r => r.json());
    
    const tbody = document.getElementById('activityLogTableBody');
    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">No activity recorded</td></tr>';
      return;
    }
    
    tbody.innerHTML = logs.slice(0, 50).map(log => `
      <tr>
        <td>${log.admin_name || 'System'}</td>
        <td>${log.action}</td>
        <td>${log.entity_type || 'N/A'}</td>
        <td>${new Date(log.created_at).toLocaleString()}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading activity log:', error);
  }
}

function exportActivityLog() {
  // Simple CSV export
  fetch(`${ADMIN_API}/activity-log`).then(r => r.json()).then(logs => {
    const csv = [
      ['Admin', 'Action', 'Entity Type', 'Timestamp'],
      ...logs.map(log => [
        log.admin_name || 'System',
        log.action,
        log.entity_type || 'N/A',
        log.created_at
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'activity-log.csv';
    a.click();
  });
}

// ===== HELPERS =====
function setupFormListeners() {
  // Any additional setup needed
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}
