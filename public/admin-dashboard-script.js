const ADMIN_API = '/api/admin';

let currentUser = null;
let currentEditingId = null;
let isLoggedIn = false;
let courtsCache = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupLoginForm();
  checkAndInitialize();
});

function setupLoginForm() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
}

async function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const rememberMe = document.getElementById('rememberMe').checked;

  const errorDiv = document.getElementById('loginError');
  const errorMsg = document.getElementById('loginErrorMessage');
  const submitBtn = loginForm.querySelector('button[type="submit"]');

  errorDiv.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing In...';

  try {
    const response = await fetch(`${ADMIN_API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Invalid username or password');

    localStorage.setItem('adminToken', data.token);
    localStorage.setItem('adminUsername', data.username || username);
    if (data.fullName) localStorage.setItem('adminFullName', data.fullName);
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('rememberMe');
    }

    isLoggedIn = true;
    document.getElementById('loginModal').classList.remove('active');
    initializeDashboard();
  } catch (error) {
    // Fallback: allow local default credentials when the server is unreachable
    if (error instanceof TypeError && username === 'admin' && password === 'admin123') {
      localStorage.setItem('adminToken', 'token-' + Date.now());
      localStorage.setItem('adminUsername', username);
      isLoggedIn = true;
      document.getElementById('loginModal').classList.remove('active');
      showNotification('Server offline — using offline mode', 'info');
      initializeDashboard();
    } else {
      errorMsg.textContent = error.message || 'Login failed';
      errorDiv.style.display = 'flex';
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
  }
}

function checkAndInitialize() {
  const token = localStorage.getItem('adminToken');
  const savedUsername = localStorage.getItem('adminUsername');
  const rememberMe = localStorage.getItem('rememberMe');

  if (token) {
    isLoggedIn = true;
    document.getElementById('loginModal').classList.remove('active');
    initializeDashboard();
  } else {
    document.getElementById('loginModal').classList.add('active');
    if (rememberMe && savedUsername) {
      document.getElementById('loginUsername').value = savedUsername;
      document.getElementById('rememberMe').checked = true;
    }
  }
}

function initializeDashboard() {
  updateCurrentTime();
  setInterval(updateCurrentTime, 1000);
  updateAdminUser();
  setupFormListeners();
  loadDashboard();
  navigateTo('dashboard');
}

function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    localStorage.removeItem('adminFullName');
    localStorage.removeItem('rememberMe');
    isLoggedIn = false;

    document.getElementById('loginModal').classList.add('active');
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').style.display = 'none';
  }
}

function updateAdminUser() {
  const adminUserElement = document.getElementById('adminUser');
  if (adminUserElement) {
    adminUserElement.innerHTML = '';
  }
}

function updateCurrentTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const el = document.getElementById('currentTime');
  if (el) el.innerHTML = `<span class="clock-time">${timeStr}</span><span class="clock-date">${dateStr}</span>`;
}

function navigateTo(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

  const sectionId = section === 'dashboard' ? 'dashboard-section' : `${section}-section`;
  const section_elem = document.getElementById(sectionId);
  if (section_elem) section_elem.classList.add('active');

  document.querySelectorAll(`.nav-item[data-page="${section}"]`).forEach(item => item.classList.add('active'));

  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar && overlay) {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  }
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

  if (section === 'dashboard') loadDashboard();
  if (section === 'website-settings') loadWebsiteSettings();
  if (section === 'courts') loadCourts();
  if (section === 'pricing') loadPricing();
  if (section === 'payment-methods') loadPaymentMethods();
  if (section === 'bookings') loadBookings();
  if (section === 'time-monitoring') initTimeMonitoring();
  if (section === 'admin-accounts') loadAdminAccounts();
  if (section === 'activity-log') loadActivityLog();
}

// ===== HELPERS =====
async function apiFetch(url, options = {}) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (networkErr) {
    showNotification('Cannot reach server. Is it running?', 'error');
    throw networkErr;
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    /* non-JSON response */
  }

  if (!response.ok) {
    const message = (data && data.error) || `Request failed (${response.status})`;
    showNotification(message, 'error');
    throw new Error(message);
  }
  return data;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(amount) {
  return `₱${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function setupFormListeners() {
  setupFileUpload('logoDropArea', 'logoFileInput', 'logo', `${ADMIN_API}/upload-logo`, (url) => {
    document.getElementById('logoPreview').src = url;
    document.getElementById('logoPreview').dataset.url = url;
    document.getElementById('logoPreview').style.display = 'block';
    document.getElementById('logoPlaceholder').style.display = 'none';
    showNotification('Logo uploaded. Save settings to apply.', 'success');
  });

  setupFileUpload('courtImageDropArea', 'courtImageInput', 'image', `${ADMIN_API}/upload-image`, (url) => {
    document.getElementById('courtImageUrl').value = url;
    document.getElementById('courtImagePreview').src = url;
    document.getElementById('courtImagePreview').style.display = 'block';
    document.getElementById('courtImagePlaceholder').style.display = 'none';
    document.getElementById('removeCourtImageBtn').style.display = 'inline-block';
    showNotification('Court image uploaded', 'success');
  });

  setupFileUpload('qrDropArea', 'qrFileInput', 'image', `${ADMIN_API}/upload-image`, (url) => {
    document.getElementById('qrCodeUrl').value = url;
    document.getElementById('qrPreview').src = url;
    document.getElementById('qrPreview').style.display = 'block';
    document.getElementById('qrPlaceholder').style.display = 'none';
    document.getElementById('removeQrBtn').style.display = 'inline-block';
    showNotification('QR code uploaded', 'success');
  });
}

function removeQrImage() {
  document.getElementById('qrCodeUrl').value = '';
  document.getElementById('qrPreview').src = '';
  document.getElementById('qrPreview').style.display = 'none';
  document.getElementById('qrPlaceholder').style.display = 'flex';
  document.getElementById('removeQrBtn').style.display = 'none';
  document.getElementById('qrFileInput').value = '';
}

function setupFileUpload(dropAreaId, inputId, fieldName, url, onSuccess) {
  const dropArea = document.getElementById(dropAreaId);
  const fileInput = document.getElementById(inputId);
  if (!dropArea || !fileInput) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.add('drag-over'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.remove('drag-over'), false);
  });

  dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt.files && dt.files.length) handleFiles(dt.files);
  }, false);

  fileInput.addEventListener('change', function() {
    if (this.files && this.files.length) handleFiles(this.files);
  });

  // Click on drop area opens file dialog (if not clicking a button inside)
  dropArea.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON' && e.target.id !== 'removeCourtImageBtn') {
      fileInput.click();
    }
  });

  async function handleFiles(files) {
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      showNotification('Please upload an image file', 'error');
      return;
    }

    const formData = new FormData();
    formData.append(fieldName, file);

    const originalHtml = dropArea.innerHTML;
    // Add simple loading indicator
    dropArea.style.opacity = '0.5';

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');
      onSuccess(data.url);
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      dropArea.style.opacity = '1';
      fileInput.value = ''; // Reset input
    }
  }
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const stats = await apiFetch(`${ADMIN_API}/stats`);

    document.getElementById('dashTodayBookings').textContent = stats.todayBookings ?? stats.today_bookings ?? 0;
    document.getElementById('dashActiveCourts').textContent = stats.activeCourts ?? stats.active_courts ?? 0;
    document.getElementById('dashTodayRevenue').textContent = formatCurrency(stats.todayRevenue ?? stats.today_revenue ?? 0);
    document.getElementById('dashTotalUsers').textContent = stats.totalUsers ?? stats.total_users ?? 0;
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

// ===== WEBSITE SETTINGS =====
async function loadWebsiteSettings() {
  try {
    const settings = await apiFetch(`${ADMIN_API}/website-settings`);

    document.getElementById('siteName').value = settings.site_name || 'Velarde Courtside';
    document.getElementById('sitePhone').value = settings.phone || '';
    document.getElementById('siteEmail').value = settings.email || '';
    document.getElementById('siteAddress').value = settings.address || '';
    document.getElementById('operatingStart').value = settings.operating_hours_start || '07:00';
    document.getElementById('operatingEnd').value = settings.operating_hours_end || '19:00';
    document.getElementById('siteDescription').value = settings.site_description || '';
    document.getElementById('aboutText').value = settings.about_text || '';
    document.getElementById('termsText').value = settings.terms_text || '';
    if (settings.logo_url) {
      document.getElementById('logoPreview').src = settings.logo_url;
      document.getElementById('logoPreview').dataset.url = settings.logo_url;
      document.getElementById('logoPreview').style.display = 'block';
      document.getElementById('logoPlaceholder').style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading website settings:', error);
  }
}

document.getElementById('websiteSettingsForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const settings = {
    site_name: document.getElementById('siteName').value,
    phone: document.getElementById('sitePhone').value,
    email: document.getElementById('siteEmail').value,
    address: document.getElementById('siteAddress').value,
    operating_hours_start: document.getElementById('operatingStart').value,
    operating_hours_end: document.getElementById('operatingEnd').value,
    site_description: document.getElementById('siteDescription').value,
    about_text: document.getElementById('aboutText').value,
    terms_text: document.getElementById('termsText').value,
    logo_url: document.getElementById('logoPreview').dataset.url || null
  };

  try {
    await apiFetch(`${ADMIN_API}/website-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    showNotification('Website settings saved successfully', 'success');
  } catch (error) {
    console.error(error);
  }
});

// ===== COURTS MANAGEMENT =====
async function loadCourts() {
  const grid = document.getElementById('courtsGrid');
  try {
    const courts = await apiFetch(`${ADMIN_API}/courts`);
    courtsCache = courts;

    if (courts.length === 0) {
      grid.innerHTML = '<p class="empty-state">No courts configured yet. Click "Add Court" to create one.</p>';
      return;
    }

    grid.innerHTML = courts.map(court => `
      <div class="court-card">
        ${court.image_url ? `<div class="court-image" style="background-image: url('${escapeHtml(court.image_url)}')"></div>` : `<div class="court-image court-image-placeholder"><span class="placeholder-icon">📷</span></div>`}
        <div class="court-card-header">
          <h4>Court ${escapeHtml(court.court_number)}</h4>
          <span class="court-status status-${escapeHtml(court.status)}">${escapeHtml(court.status.toUpperCase())}</span>
        </div>
        <div class="court-card-body">
          <div class="court-card-info">
            <div class="court-info-item">
              <strong>Name:</strong>
              <span>${escapeHtml(court.name)}</span>
            </div>
            <div class="court-info-item">
              <strong>Capacity:</strong>
              <span>${escapeHtml(court.capacity)} players</span>
            </div>
            <div class="court-info-item">
              <strong>Surface:</strong>
              <span>${escapeHtml(court.surface_type || 'N/A')}</span>
            </div>
          </div>
          ${court.description ? `<p><small>${escapeHtml(court.description)}</small></p>` : ''}
          <div class="court-card-actions">
            <button onclick="editCourt('${court.id}')" class="btn-small btn-edit">Edit</button>
            <button onclick="deleteCourt('${court.id}')" class="btn-small btn-delete">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    grid.innerHTML = '<p class="empty-state">Failed to load courts.</p>';
    console.error('Error loading courts:', error);
  }
}

async function populateCourtSelect(selectedCourtNumber = null) {
  try {
    if (!courtsCache.length) {
      courtsCache = await apiFetch(`${ADMIN_API}/courts`);
    }
    const select = document.getElementById('bookingCourt');
    select.innerHTML = courtsCache.map(c =>
      `<option value="${c.court_number}">Court ${c.court_number} — ${escapeHtml(c.name)}</option>`
    ).join('');
    if (selectedCourtNumber != null) select.value = selectedCourtNumber;
  } catch (error) {
    console.error('Error populating court select:', error);
  }
}

function openCourtModal(courtId = null) {
  currentEditingId = courtId;
  const modal = document.getElementById('courtModal');

  if (courtId) {
    apiFetch(`${ADMIN_API}/courts/${courtId}`).then(court => {
      document.getElementById('courtNumber').value = court.court_number;
      document.getElementById('courtName').value = court.name;
      document.getElementById('courtDescription').value = court.description || '';
      document.getElementById('courtCapacity').value = court.capacity || 4;
      document.getElementById('courtSurface').value = court.surface_type || '';
      document.getElementById('courtStatus').value = court.status || 'active';
      document.getElementById('courtImageUrl').value = court.image_url || '';
      if (court.image_url) {
        document.getElementById('courtImagePreview').src = court.image_url;
        document.getElementById('courtImagePreview').style.display = 'block';
        document.getElementById('courtImagePlaceholder').style.display = 'none';
        document.getElementById('removeCourtImageBtn').style.display = 'inline-block';
      } else {
        removeCourtImage();
      }
    }).catch(() => {});
  } else {
    document.getElementById('courtForm').reset();
    removeCourtImage();
  }

  modal.classList.add('active');
}

function removeCourtImage() {
  document.getElementById('courtImageUrl').value = '';
  document.getElementById('courtImagePreview').src = '';
  document.getElementById('courtImagePreview').style.display = 'none';
  document.getElementById('courtImagePlaceholder').style.display = 'flex';
  document.getElementById('removeCourtImageBtn').style.display = 'none';
  document.getElementById('courtImageInput').value = '';
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
    status: document.getElementById('courtStatus').value,
    image_url: document.getElementById('courtImageUrl').value
  };

  try {
    const method = currentEditingId ? 'PUT' : 'POST';
    const url = currentEditingId ?
      `${ADMIN_API}/courts/${currentEditingId}` :
      `${ADMIN_API}/courts`;

    await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    showNotification('Court saved successfully', 'success');
    closeCourtModal();
    loadCourts();
  } catch (error) {
    console.error(error);
  }
});

function editCourt(courtId) {
  openCourtModal(courtId);
}

async function deleteCourt(courtId) {
  if (!confirm('Are you sure you want to delete this court?')) return;

  try {
    await apiFetch(`${ADMIN_API}/courts/${courtId}`, { method: 'DELETE' });
    showNotification('Court deleted successfully', 'success');
    loadCourts();
  } catch (error) {
    console.error(error);
  }
}

// ===== PRICING MANAGEMENT =====
async function loadPricing() {
  const tbody = document.getElementById('pricingTableBody');
  try {
    const pricing = await apiFetch(`${ADMIN_API}/pricing`);

    if (pricing.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No pricing configured yet.</td></tr>';
      return;
    }

    tbody.innerHTML = pricing.map(p => `
      <tr>
        <td>${escapeHtml(p.duration_hours)} hour(s)</td>
        <td>${formatCurrency(p.price_amount)}</td>
        <td>${escapeHtml(p.day_type)}</td>
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
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Failed to load pricing.</td></tr>';
    console.error('Error loading pricing:', error);
  }
}

function openPricingModal(pricingId = null) {
  currentEditingId = pricingId;
  const modal = document.getElementById('pricingModal');

  if (pricingId) {
    apiFetch(`${ADMIN_API}/pricing/${pricingId}`).then(pricing => {
      document.getElementById('pricingDuration').value = pricing.duration_hours;
      document.getElementById('pricingAmount').value = pricing.price_amount;
      document.getElementById('pricingDayType').value = pricing.day_type;
      document.getElementById('pricingDescription').value = pricing.description || '';
      document.getElementById('pricingActive').checked = !!pricing.is_active;
    }).catch(() => {});
  } else {
    document.getElementById('pricingForm').reset();
    document.getElementById('pricingActive').checked = true;
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

    await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    showNotification('Pricing saved successfully', 'success');
    closePricingModal();
    loadPricing();
  } catch (error) {
    console.error(error);
  }
});

function editPricing(pricingId) {
  openPricingModal(pricingId);
}

async function deletePricing(pricingId) {
  if (!confirm('Are you sure you want to delete this pricing?')) return;

  try {
    await apiFetch(`${ADMIN_API}/pricing/${pricingId}`, { method: 'DELETE' });
    showNotification('Pricing deleted successfully', 'success');
    loadPricing();
  } catch (error) {
    console.error(error);
  }
}

// ===== PAYMENT METHODS =====
async function loadPaymentMethods() {
  const grid = document.getElementById('paymentMethodsGrid');
  try {
    const methods = await apiFetch(`${ADMIN_API}/payment-methods`);

    if (methods.length === 0) {
      grid.innerHTML = '<p class="empty-state">No payment methods configured yet.</p>';
      return;
    }

    grid.innerHTML = methods.map(method => `
      <div class="payment-method-card">
        <div class="payment-method-top">
          <h4>${escapeHtml(method.method_name)}</h4>
          <span class="court-status status-${method.is_active ? 'active' : 'inactive'}">${method.is_active ? 'Active' : 'Inactive'}</span>
        </div>
        <div class="payment-method-details">
          ${method.description ? `
            <div class="detail-item">
              <strong>Description</strong>
              <span>${escapeHtml(method.description)}</span>
            </div>
          ` : ''}
          ${method.account_details ? `
            <div class="detail-item">
              <strong>Account</strong>
              <span>${escapeHtml(method.account_details)}</span>
            </div>
          ` : ''}
          ${method.instructions ? `
            <div class="detail-item">
              <strong>Instructions</strong>
              <span>${escapeHtml(method.instructions)}</span>
            </div>
          ` : ''}
          ${method.qr_code_url ? `
            <div class="detail-item">
              <strong>QR Code</strong>
              <div style="margin-top:0.5rem;"><img src="${escapeHtml(method.qr_code_url)}" alt="QR Code" style="max-height: 80px; border-radius:4px;"></div>
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
    grid.innerHTML = '<p class="empty-state">Failed to load payment methods.</p>';
    console.error('Error loading payment methods:', error);
  }
}

function openPaymentMethodModal(methodId = null) {
  currentEditingId = methodId;
  const modal = document.getElementById('paymentMethodModal');

  if (methodId) {
    apiFetch(`${ADMIN_API}/payment-methods/${methodId}`).then(method => {
      document.getElementById('methodName').value = method.method_name;
      document.getElementById('methodDescription').value = method.description || '';
      document.getElementById('methodInstructions').value = method.instructions || '';
      document.getElementById('methodAccountDetails').value = method.account_details || '';
      document.getElementById('methodActive').checked = !!method.is_active;
      document.getElementById('qrCodeUrl').value = method.qr_code_url || '';
      
      if (method.qr_code_url) {
        document.getElementById('qrPreview').src = method.qr_code_url;
        document.getElementById('qrPreview').style.display = 'block';
        document.getElementById('qrPlaceholder').style.display = 'none';
        document.getElementById('removeQrBtn').style.display = 'inline-block';
      } else {
        removeQrImage();
      }
    }).catch(() => {});
  } else {
    document.getElementById('paymentMethodForm').reset();
    document.getElementById('methodActive').checked = true;
    removeQrImage();
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
    is_active: document.getElementById('methodActive').checked,
    qr_code_url: document.getElementById('qrCodeUrl').value
  };

  try {
    const method = currentEditingId ? 'PUT' : 'POST';
    const url = currentEditingId ?
      `${ADMIN_API}/payment-methods/${currentEditingId}` :
      `${ADMIN_API}/payment-methods`;

    await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    showNotification('Payment method saved successfully', 'success');
    closePaymentMethodModal();
    loadPaymentMethods();
  } catch (error) {
    console.error(error);
  }
});

function editPaymentMethod(methodId) {
  openPaymentMethodModal(methodId);
}

async function deletePaymentMethod(methodId) {
  if (!confirm('Are you sure you want to delete this payment method?')) return;

  try {
    await apiFetch(`${ADMIN_API}/payment-methods/${methodId}`, { method: 'DELETE' });
    showNotification('Payment method deleted successfully', 'success');
    loadPaymentMethods();
  } catch (error) {
    console.error(error);
  }
}

// ===== BOOKINGS MANAGEMENT =====
async function loadBookings() {
  const tbody = document.getElementById('bookingsTableBody');
  try {
    const date = document.getElementById('bookingDateFilter').value;
    const status = document.getElementById('bookingStatusFilter').value;

    let url = `${ADMIN_API}/bookings`;
    const params = [];
    if (date) params.push(`date=${date}`);
    if (status) params.push(`status=${status}`);
    if (params.length) url += '?' + params.join('&');

    const bookings = await apiFetch(url);

    if (bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No bookings found</td></tr>';
      return;
    }

    tbody.innerHTML = bookings.map(b => {
      const dateObj = new Date(b.booking_date + 'T00:00:00');
      const dateStr = isNaN(dateObj) ? b.booking_date : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const paymentLabel = b.payment_status === 'completed' ? 'Paid'
        : b.payment_method === 'counter' ? 'At Counter' : '';

      return `
        <tr>
          <td>${escapeHtml(dateStr)}<small class="cell-sub">${escapeHtml(b.start_time)} – ${escapeHtml(b.end_time)}</small></td>
          <td>${escapeHtml(b.name)}<small class="cell-sub">${escapeHtml(b.phone || '')}</small></td>
          <td>Court ${escapeHtml(b.court_number)}</td>
          <td>${escapeHtml(b.duration_hours)}h</td>
          <td>${formatCurrency(b.price_amount)}${paymentLabel ? `<small class="cell-sub">${paymentLabel}</small>` : ''}</td>
          <td><span class="court-status status-${escapeHtml(b.status)}">${escapeHtml(b.status)}</span></td>
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
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Failed to load bookings.</td></tr>';
    console.error('Error loading bookings:', error);
  }
}

async function editBooking(bookingId) {
  currentEditingId = bookingId;
  document.getElementById('bookingModal').classList.add('active');

  try {
    const booking = await apiFetch(`${ADMIN_API}/bookings/${bookingId}`);
    await populateCourtSelect(booking.court_number);
    document.getElementById('bookingGuest').value = booking.name;
    document.getElementById('bookingDate').value = booking.booking_date;
    document.getElementById('bookingStartTime').value = booking.start_time;
    document.getElementById('bookingDuration').value = booking.duration_hours;
    document.getElementById('bookingStatus').value = booking.status;
  } catch (error) {
    closeBookingModal();
  }
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
    await apiFetch(`${ADMIN_API}/bookings/${currentEditingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    showNotification('Booking updated successfully', 'success');
    closeBookingModal();
    loadBookings();
  } catch (error) {
    console.error(error);
  }
});

async function deleteBooking(bookingId) {
  if (!confirm('Are you sure you want to delete this booking?')) return;

  try {
    await apiFetch(`${ADMIN_API}/bookings/${bookingId}`, { method: 'DELETE' });
    showNotification('Booking deleted successfully', 'success');
    loadBookings();
  } catch (error) {
    console.error(error);
  }
}

// Enter key in filter fields triggers filtering
document.getElementById('bookingDateFilter')?.addEventListener('change', () => loadBookings());
document.getElementById('bookingStatusFilter')?.addEventListener('change', () => loadBookings());

// ===== TIME MONITORING =====
function initTimeMonitoring() {
  const dateInput = document.getElementById('monitoringDate');
  if (!dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
  loadTimeMonitoring();
}

async function loadTimeMonitoring() {
  const list = document.getElementById('timeMonitoringList');
  const date = document.getElementById('monitoringDate').value;
  if (!date) { list.innerHTML = '<p class="empty-state">Select a date to view bookings.</p>'; return; }

  list.innerHTML = '<p class="empty-state">Loading…</p>';

  try {
    const bookings = await apiFetch(`${ADMIN_API}/bookings?date=${date}`);
    const active = bookings.filter(b => b.status !== 'cancelled');

    if (active.length === 0) {
      list.innerHTML = '<p class="empty-state">No bookings for this date.</p>';
      return;
    }

    list.innerHTML = active.map(b => {
      const statusKey  = b.check_out_time ? 'checked-out' : b.check_in_time ? 'checked-in' : 'pending';
      const statusLabel= b.check_out_time ? 'Completed'  : b.check_in_time ? 'In Progress' : 'Pending';

      // Format stored times nicely
      const fmtDT = iso => {
        if (!iso) return '—';
        const d = new Date(iso);
        return isNaN(d) ? iso : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      };

      // Compute actual duration label
      let durationLabel = '—';
      if (b.actual_duration_minutes != null) {
        const h = Math.floor(b.actual_duration_minutes / 60);
        const m = b.actual_duration_minutes % 60;
        durationLabel = h > 0 ? `${h}h ${m}m` : `${m}m`;
      }

      // Default time inputs: pre-fill with booked times if not yet set
      const defaultStart = b.check_in_time
        ? new Date(b.check_in_time).toTimeString().slice(0, 5)
        : b.start_time || '';
      const defaultEnd = b.check_out_time
        ? new Date(b.check_out_time).toTimeString().slice(0, 5)
        : b.end_time || '';

      return `
      <div class="monitoring-card" id="mc-${b.id}">
        <div class="monitoring-header">
          <div class="monitoring-header-left">
            <h4>Court ${escapeHtml(String(b.court_number))} &mdash; ${escapeHtml(b.name)}</h4>
            <small>${escapeHtml(b.phone || '')}</small>
          </div>
          <span class="monitoring-status status-${statusKey}">${statusLabel}</span>
        </div>

        <div class="monitoring-info">
          <div class="info-item"><strong>Booked Slot</strong>${escapeHtml(b.start_time)} – ${escapeHtml(b.end_time)}</div>
          <div class="info-item"><strong>Duration</strong>${escapeHtml(String(b.duration_hours))}h booked</div>
          <div class="info-item"><strong>Payment</strong>${b.payment_status === 'completed' ? '✅ Paid' : '⏳ Pending'}</div>
          <div class="info-item"><strong>Actual Duration</strong>${durationLabel}</div>
        </div>

        <div class="monitoring-time-inputs">
          <div class="time-input-group">
            <label for="start-${b.id}">⏱ Start Time</label>
            <input type="time" id="start-${b.id}" value="${defaultStart}"
              ${b.check_in_time ? '' : ''} class="time-input">
            ${b.check_in_time ? `<small class="time-recorded">Recorded: ${fmtDT(b.check_in_time)}</small>` : ''}
          </div>
          <div class="time-input-group">
            <label for="end-${b.id}">🏁 Finish Time</label>
            <input type="time" id="end-${b.id}" value="${defaultEnd}" class="time-input"
              ${!b.check_in_time ? 'disabled' : ''}>
            ${b.check_out_time ? `<small class="time-recorded">Recorded: ${fmtDT(b.check_out_time)}</small>` : ''}
          </div>
        </div>

        <div class="monitoring-actions">
          ${!b.check_in_time ? `
            <button onclick="checkIn('${b.id}')" class="btn btn-primary btn-sm">
              ▶ Set Start Time
            </button>
          ` : !b.check_out_time ? `
            <button onclick="checkOut('${b.id}')" class="btn btn-secondary btn-sm">
              ⏹ Set Finish Time
            </button>
            <button onclick="resetCheckin('${b.id}')" class="btn btn-outline btn-sm">
              ↩ Reset
            </button>
          ` : `
            <button onclick="resetCheckin('${b.id}')" class="btn btn-outline btn-sm">
              ↩ Reset Times
            </button>
          `}
        </div>
      </div>`;
    }).join('');

  } catch (err) {
    list.innerHTML = '<p class="empty-state">Failed to load monitoring data.</p>';
    console.error(err);
  }
}

async function checkIn(bookingId) {
  const timeInput = document.getElementById(`start-${bookingId}`);
  const timeVal   = timeInput ? timeInput.value : '';

  if (!timeVal) {
    showNotification('Please set a start time first', 'error');
    timeInput && timeInput.focus();
    return;
  }

  // Build a full ISO datetime from today's date + chosen time
  const monDate   = document.getElementById('monitoringDate').value;
  const isoString = `${monDate}T${timeVal}:00`;

  try {
    await apiFetch('/api/admin/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, checkInTime: isoString })
    });
    showNotification('Start time recorded ✓', 'success');
    loadTimeMonitoring();
  } catch (err) {
    console.error(err);
  }
}

async function checkOut(bookingId) {
  const timeInput = document.getElementById(`end-${bookingId}`);
  const timeVal   = timeInput ? timeInput.value : '';

  if (!timeVal) {
    showNotification('Please set a finish time first', 'error');
    timeInput && timeInput.focus();
    return;
  }

  const monDate   = document.getElementById('monitoringDate').value;
  const isoString = `${monDate}T${timeVal}:00`;

  try {
    const result = await apiFetch('/api/admin/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, checkOutTime: isoString })
    });
    const h = Math.floor(result.actualDuration / 60);
    const m = result.actualDuration % 60;
    const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
    showNotification(`Finish time recorded ✓  Actual duration: ${label}`, 'success');
    loadTimeMonitoring();
  } catch (err) {
    console.error(err);
  }
}

async function resetCheckin(bookingId) {
  if (!confirm('Reset start and finish times for this booking?')) return;
  try {
    await apiFetch('/api/admin/reset-tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId })
    });
    showNotification('Times reset successfully', 'success');
    loadTimeMonitoring();
  } catch (err) {
    console.error(err);
  }
}

// ===== ADMIN ACCOUNTS =====
async function loadAdminAccounts() {
  const tbody = document.getElementById('adminAccountsTableBody');
  try {
    const accounts = await apiFetch(`${ADMIN_API}/accounts`);

    if (accounts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No admin accounts</td></tr>';
      return;
    }

    tbody.innerHTML = accounts.map(account => `
      <tr>
        <td>@${escapeHtml(account.username)}</td>
        <td>${escapeHtml(account.full_name || 'N/A')}</td>
        <td>${escapeHtml(account.email || 'N/A')}</td>
        <td><span class="role-badge role-${escapeHtml(account.role)}">${escapeHtml(account.role.replace('_', ' '))}</span></td>
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
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Failed to load admin accounts.</td></tr>';
    console.error('Error loading admin accounts:', error);
  }
}

function openAdminAccountModal(accountId = null) {
  currentEditingId = accountId;
  const modal = document.getElementById('adminAccountModal');
  const passwordInput = document.getElementById('adminPassword');

  if (accountId) {
    apiFetch(`${ADMIN_API}/accounts/${accountId}`).then(account => {
      document.getElementById('adminUsername').value = account.username;
      document.getElementById('adminEmail').value = account.email || '';
      document.getElementById('adminFullName').value = account.full_name || '';
      document.getElementById('adminRole').value = account.role;
      document.getElementById('adminActive').checked = !!account.is_active;
      passwordInput.value = '';
      passwordInput.required = false;
    }).catch(() => {});
  } else {
    document.getElementById('adminAccountForm').reset();
    document.getElementById('adminActive').checked = true;
    passwordInput.required = true;
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

    await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    showNotification('Admin account saved successfully', 'success');
    closeAdminAccountModal();
    loadAdminAccounts();
  } catch (error) {
    console.error(error);
  }
});

function editAdminAccount(accountId) {
  openAdminAccountModal(accountId);
}

async function deleteAdminAccount(accountId) {
  if (!confirm('Are you sure you want to delete this admin account?')) return;

  try {
    await apiFetch(`${ADMIN_API}/accounts/${accountId}`, { method: 'DELETE' });
    showNotification('Admin account deleted successfully', 'success');
    loadAdminAccounts();
  } catch (error) {
    console.error(error);
  }
}

// ===== ACTIVITY LOG =====
async function loadActivityLog() {
  const tbody = document.getElementById('activityLogTableBody');
  try {
    const logs = await apiFetch(`${ADMIN_API}/activity-log`);

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No activity recorded yet</td></tr>';
      return;
    }

    tbody.innerHTML = logs.slice(0, 50).map(log => `
      <tr>
        <td>${escapeHtml(log.admin_name || 'System')}</td>
        <td>${escapeHtml(log.action)}</td>
        <td>${escapeHtml(log.entity_type || 'N/A')}</td>
        <td>${new Date(log.created_at + 'Z').toLocaleString()}</td>
      </tr>
    `).join('');
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Failed to load activity log.</td></tr>';
    console.error('Error loading activity log:', error);
  }
}

function exportActivityLog() {
  fetch(`${ADMIN_API}/activity-log`).then(r => r.json()).then(logs => {
    const csv = [
      ['Admin', 'Action', 'Entity Type', 'Timestamp'],
      ...logs.map(log => [
        log.admin_name || 'System',
        log.action,
        log.entity_type || 'N/A',
        log.created_at
      ])
    ].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'activity-log.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    showNotification('Activity log exported', 'success');
  }).catch(() => showNotification('Export failed', 'error'));
}

// ===== NOTIFICATIONS =====
function showNotification(message, type = 'info') {
  let container = document.querySelector('.notification-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'notification-container';
    document.body.appendChild(container);
  }

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  container.appendChild(notification);

  requestAnimationFrame(() => notification.classList.add('show'));

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3500);
}
