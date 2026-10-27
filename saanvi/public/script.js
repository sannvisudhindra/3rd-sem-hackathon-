/**
 * Campus Lost & Found System - Client Script
 * 
 * Handles:
 * - Dynamic CRUD interactions using fetch()
 * - Add and Edit mode switching
 * - Live search with 300ms debouncing & status dropdown filtering
 * - Inline alerts and notifications
 * - Safe HTML escaping to prevent XSS
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

const searchInput = document.getElementById('search-input');
const filterStatus = document.getElementById('filter-status');
const clearSearchBtn = document.getElementById('clear-search-btn');

const tableBody = document.getElementById('items-table-body');
const itemCountBadge = document.getElementById('item-count');
const notification = document.getElementById('notification');

// State tracking
let editingItemId = null;
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

// Reset form back to "Report" mode
function resetFormToCreateMode() {
  editingItemId = null;
  itemForm.reset();
  dateInput.value = new Date().toISOString().split('T')[0];
  submitBtn.textContent = 'Report Item';
  submitBtn.className = 'btn btn-primary';
  formHeading.textContent = 'Report Lost or Found Item';
  cancelEditBtn.style.display = 'none';
}

// ============================================================================
// 2. Fetch & Render Items
// ============================================================================
async function loadItems() {
  const searchQuery = searchInput.value.trim();
  const status = filterStatus.value.trim();

  try {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (status) params.append('status', status);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_BASE}${queryString}`);

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const items = await response.json();
    renderItemsTable(items);
  } catch (error) {
    console.error('Failed to load items:', error);
    showNotification('Could not load items. Ensure MongoDB and Node server are running.', 'error');
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state" style="color: var(--error);">
          ⚠️ Failed to connect to server/database.
        </td>
      </tr>
    `;
  }
}

function renderItemsTable(items) {
  itemCountBadge.textContent = items.length;

  if (items.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">No matching items found.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = items.map(item => {
    const statusClass = item.status === 'Lost' ? 'badge-lost' : 'badge-found';
    const descriptionHtml = item.description 
      ? `<div class="item-desc-text">${escapeHtml(item.description)}</div>` 
      : '';

    return `
      <tr data-id="${item._id}">
        <td><span class="badge ${statusClass}">${escapeHtml(item.status)}</span></td>
        <td>
          <strong>${escapeHtml(item.title)}</strong>
          ${descriptionHtml}
        </td>
        <td>${escapeHtml(item.category)}</td>
        <td>📍 ${escapeHtml(item.location)}</td>
        <td>${escapeHtml(item.date || '-')}</td>
        <td>${escapeHtml(item.contact)}</td>
        <td>
          <button class="btn btn-sm btn-edit" onclick="handleEditClick('${item._id}')">Edit</button>
          <button class="btn btn-sm btn-delete" onclick="handleDeleteClick('${item._id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================================================
// 3. Form Submit (Create or Update)
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
      showNotification(`Report for "${data.title}" created successfully!`, 'success');
    }

    resetFormToCreateMode();
    loadItems();
  } catch (error) {
    console.error('Submit error:', error);
    showNotification('Network error while saving item.', 'error');
  }
});

// ============================================================================
// 4. Edit Item
// ============================================================================
window.handleEditClick = async function(id) {
  try {
    const response = await fetch(`${API_BASE}/${id}`);
    if (!response.ok) {
      showNotification('Failed to fetch item for editing', 'error');
      return;
    }

    const item = await response.json();

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
    formHeading.textContent = `Edit Item: ${item.title}`;
    submitBtn.textContent = 'Save Changes';
    cancelEditBtn.style.display = 'inline-flex';

    // Scroll smoothly to form
    itemForm.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('Edit fetch error:', error);
    showNotification('Could not retrieve item details.', 'error');
  }
};

cancelEditBtn.addEventListener('click', () => {
  resetFormToCreateMode();
});

// ============================================================================
// 5. Delete Item
// ============================================================================
window.handleDeleteClick = async function(id) {
  const confirmed = confirm('Are you sure you want to delete this reported item?');
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
// 6. Search & Filter Handlers (Live 300ms Debounce)
// ============================================================================
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(() => {
    loadItems();
  }, 300);
});

filterStatus.addEventListener('change', () => {
  loadItems();
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  filterStatus.value = '';
  loadItems();
});

// ============================================================================
// 7. Initial Load
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Set default date to today
  dateInput.value = new Date().toISOString().split('T')[0];
  loadItems();
});
