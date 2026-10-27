/**
 * CampusTrack Lost & Found - Client Script
 * 
 * Features:
 * - Dynamic CRUD interactions using fetch()
 * - Real-time statistics counters and multi-tier filter pills
 * - One-click "Mark as Resolved" and "Reopen" toggles
 * - Debounced search (300ms) with keyword matching
 * - Smooth form collapse/expand with XSS escaping
 */

const API_BASE = '/items';

// DOM Elements
const itemForm = document.getElementById('item-form');
const titleInput = document.getElementById('item-title');
const categoryInput = document.getElementById('item-category');
const statusInput = document.getElementById('item-status');
const locationInput = document.getElementById('item-location');
const dateInput = document.getElementById('item-date');
const contactInput = document.getElementById('item-contact');
const descInput = document.getElementById('item-description');

const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const formHeading = document.getElementById('form-heading');
const formSection = document.getElementById('form-section');

const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');

const tableBody = document.getElementById('items-table-body');
const itemCountBadge = document.getElementById('item-count');
const activeFilterLabel = document.getElementById('active-filter-label');
const notification = document.getElementById('notification');

// Metric Count Elements
const countAllEl = document.getElementById('count-all');
const countLostEl = document.getElementById('count-lost');
const countFoundEl = document.getElementById('count-found');
const countResolvedEl = document.getElementById('count-resolved');

// State Tracking
let editingItemId = null;
let currentFilterStatus = '';
let notificationTimeout = null;
let searchDebounceTimeout = null;

// ============================================================================
// 1. Utilities (XSS Escaping & Notifications)
// ============================================================================
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showNotification(message, type = 'success') {
  clearTimeout(notificationTimeout);
  notification.textContent = message;
  notification.className = type; // 'success', 'error', 'warning'

  notificationTimeout = setTimeout(() => {
    notification.className = '';
    notification.textContent = '';
  }, 4000);
}

function toggleFormVisibility() {
  if (formSection.style.display === 'none' || getComputedStyle(formSection).display === 'none') {
    formSection.style.display = 'block';
  }
  formSection.scrollIntoView({ behavior: 'smooth' });
  titleInput.focus();
}

function hideForm() {
  if (!editingItemId) {
    formSection.style.display = 'none';
  } else {
    resetFormToCreateMode();
  }
}

// Reset form back to "Report" mode
function resetFormToCreateMode() {
  editingItemId = null;
  itemForm.reset();
  dateInput.value = new Date().toISOString().split('T')[0];
  submitBtn.querySelector('span').textContent = 'Submit Report';
  submitBtn.className = 'btn btn-primary';
  formHeading.textContent = 'Report a Lost or Found Item';
  cancelEditBtn.style.display = 'none';
}

// ============================================================================
// 2. Filter Tabs & Quick Stats Synchronization
// ============================================================================
window.setFilterStatus = function(status) {
  currentFilterStatus = status;

  // Sync Metric Cards active state
  document.querySelectorAll('.metric-card').forEach(card => {
    if (card.dataset.status === status) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  // Sync Filter Pills active state
  document.querySelectorAll('.filter-pill').forEach(pill => {
    if (pill.dataset.status === status) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });

  // Update text indicator
  if (!status) {
    activeFilterLabel.textContent = 'Showing all items';
  } else {
    activeFilterLabel.textContent = `Filtered by: ${status}`;
  }

  loadItems();
};

async function updateOverallCounts() {
  try {
    const response = await fetch(API_BASE);
    if (!response.ok) return;

    const allItems = await response.json();
    let lostCount = 0;
    let foundCount = 0;
    let resolvedCount = 0;

    allItems.forEach(item => {
      if (item.status === 'Lost') lostCount++;
      else if (item.status === 'Found') foundCount++;
      else if (item.status === 'Resolved') resolvedCount++;
    });

    countAllEl.textContent = allItems.length;
    countLostEl.textContent = lostCount;
    countFoundEl.textContent = foundCount;
    countResolvedEl.textContent = resolvedCount;
  } catch (err) {
    console.error('Count update error:', err);
  }
}

// Category Emoji helper
function getCategoryEmoji(category) {
  if (!category) return '📦';
  const cat = category.toLowerCase();
  if (cat.includes('elect')) return '📱';
  if (cat.includes('station') || cat.includes('book')) return '📚';
  if (cat.includes('id') || cat.includes('doc')) return '🪪';
  if (cat.includes('wallet') || cat.includes('bag')) return '🎒';
  if (cat.includes('key')) return '🔑';
  if (cat.includes('cloth') || cat.includes('watch') || cat.includes('bottle')) return '👕';
  return '📦';
}

// ============================================================================
// 3. Fetch & Render Items
// ============================================================================
async function loadItems() {
  const searchQuery = searchInput.value.trim();

  try {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (currentFilterStatus) params.append('status', currentFilterStatus);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_BASE}${queryString}`);

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const items = await response.json();
    renderItemsTable(items);
    updateOverallCounts();
  } catch (error) {
    console.error('Failed to load items:', error);
    showNotification('Could not load items. Ensure MongoDB and Node server are running.', 'error');
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <div class="empty-state-content">
            <span style="font-size: 2rem;">⚠️</span>
            <p style="color: var(--lost-color); font-weight: 600;">Failed to connect to database/server.</p>
            <p style="font-size: 0.85rem;">Make sure MongoDB Compass and 'node server.js' are running.</p>
          </div>
        </td>
      </tr>
    `;
  }
}

function renderItemsTable(items) {
  itemCountBadge.textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'}`;

  if (items.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <div class="empty-state-content">
            <span style="font-size: 2.2rem;">🔍</span>
            <p style="font-weight: 600; color: var(--text-main);">No matching items found</p>
            <p style="font-size: 0.85rem;">Try modifying your search query or status filter.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = items.map(item => {
    const isResolved = item.status === 'Resolved';
    
    // Status Badge & Classes
    let badgeClass = 'badge-lost';
    let badgeIcon = '🔴';
    if (item.status === 'Found') {
      badgeClass = 'badge-found';
      badgeIcon = '🟢';
    } else if (isResolved) {
      badgeClass = 'badge-resolved';
      badgeIcon = '✅';
    }

    const descriptionHtml = item.description 
      ? `<div class="item-desc">${escapeHtml(item.description)}</div>` 
      : '';

    // "Mark as Resolved" vs "Reopen" action button
    const resolveBtnHtml = isResolved
      ? `<button class="btn-sm btn-reopen" onclick="handleToggleResolve('${item._id}', 'Lost')" title="Reopen this record">↩ Reopen</button>`
      : `<button class="btn-sm btn-resolve" onclick="handleToggleResolve('${item._id}', 'Resolved')" title="Mark item as resolved/returned">✓ Resolve</button>`;

    return `
      <tr data-id="${item._id}" class="${isResolved ? 'row-resolved' : ''}">
        <td>
          <span class="badge ${badgeClass}">${badgeIcon} ${escapeHtml(item.status)}</span>
        </td>
        <td>
          <span class="item-title">${escapeHtml(item.title)}</span>
          ${descriptionHtml}
        </td>
        <td>
          <span class="category-pill">${getCategoryEmoji(item.category)} ${escapeHtml(item.category)}</span>
        </td>
        <td>📍 ${escapeHtml(item.location)}</td>
        <td>${escapeHtml(item.date || '-')}</td>
        <td>📞 ${escapeHtml(item.contact)}</td>
        <td>
          <div class="actions-cell">
            ${resolveBtnHtml}
            <button class="btn-sm btn-edit" onclick="handleEditClick('${item._id}')" title="Edit details">✏️ Edit</button>
            <button class="btn-sm btn-delete" onclick="handleDeleteClick('${item._id}')" title="Delete record">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================================================
// 4. Mark as Resolved / Reopen Status Toggle
// ============================================================================
window.handleToggleResolve = async function(id, targetStatus) {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: targetStatus })
    });

    const data = await response.json();

    if (!response.ok) {
      showNotification(data.error || 'Failed to update item status', 'error');
      return;
    }

    if (targetStatus === 'Resolved') {
      showNotification(`🎉 Item "${data.title}" marked as Resolved!`, 'success');
    } else {
      showNotification(`Item "${data.title}" reopened as Active!`, 'warning');
    }

    loadItems();
  } catch (error) {
    console.error('Resolve toggle error:', error);
    showNotification('Network error updating item status.', 'error');
  }
};

// ============================================================================
// 5. Form Submit (Create or Update)
// ============================================================================
itemForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const category = categoryInput.value.trim();
  const status = statusInput.value.trim();
  const location = locationInput.value.trim();
  const date = dateInput.value.trim();
  const contact = contactInput.value.trim();
  const description = descInput.value.trim();

  // Basic validation check
  if (!title || !category || !status || !location || !contact) {
    showNotification('Please fill in all required fields marked with *', 'warning');
    return;
  }

  const payload = { title, category, status, location, date, contact, description };

  try {
    let response;
    if (editingItemId) {
      // PUT update
      response = await fetch(`${API_BASE}/${editingItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      // POST create
      response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const data = await response.json();

    if (!response.ok) {
      showNotification(data.error || 'Operation failed', 'error');
      return;
    }

    if (editingItemId) {
      showNotification(`Item "${data.title}" updated successfully!`, 'success');
    } else {
      showNotification(`Report for "${data.title}" submitted successfully!`, 'success');
    }

    resetFormToCreateMode();
    loadItems();
  } catch (error) {
    console.error('Submit error:', error);
    showNotification('Network error while saving item.', 'error');
  }
});

// ============================================================================
// 6. Edit Item
// ============================================================================
window.handleEditClick = async function(id) {
  try {
    const response = await fetch(`${API_BASE}/${id}`);
    if (!response.ok) {
      showNotification('Failed to fetch item for editing', 'error');
      return;
    }

    const item = await response.json();

    // Ensure form is visible
    formSection.style.display = 'block';

    // Populate inputs
    editingItemId = item._id;
    titleInput.value = item.title || '';
    categoryInput.value = item.category || 'Other';
    statusInput.value = item.status || 'Lost';
    locationInput.value = item.location || '';
    dateInput.value = item.date || '';
    contactInput.value = item.contact || '';
    descInput.value = item.description || '';

    // Switch UI to edit mode
    formHeading.textContent = `Edit Details: ${item.title}`;
    submitBtn.querySelector('span').textContent = 'Save Changes';
    cancelEditBtn.style.display = 'inline-flex';

    // Scroll smoothly to form
    formSection.scrollIntoView({ behavior: 'smooth' });
    titleInput.focus();
  } catch (error) {
    console.error('Edit fetch error:', error);
    showNotification('Could not retrieve item details.', 'error');
  }
};

// ============================================================================
// 7. Delete Item
// ============================================================================
window.handleDeleteClick = async function(id) {
  const confirmed = confirm('Are you sure you want to permanently delete this record?');
  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      showNotification(data.error || 'Failed to delete item', 'error');
      return;
    }

    showNotification('Item record deleted successfully.', 'success');
    loadItems();
  } catch (error) {
    console.error('Delete error:', error);
    showNotification('Error deleting item record.', 'error');
  }
};

// ============================================================================
// 8. Search & Filter Handlers (Live 300ms Debounce)
// ============================================================================
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(() => {
    loadItems();
  }, 300);
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  loadItems();
});

// ============================================================================
// 9. Initial Load
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Set default date to today
  dateInput.value = new Date().toISOString().split('T')[0];
  loadItems();
});
