<<<<<<< HEAD
// script.js - everything the page does: form, list, filters, buttons, matches popup
// Talks to our API: /api/items (GET, POST), /api/items/:id (PUT, DELETE),
// /api/items/:id/resolve (PATCH), /api/items/:id/matches (GET)
=======
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
>>>>>>> 574ce84304ed262ea04c76c0612c0e9f7d6d025e

// ---------- page elements ----------
const form = document.getElementById("item-form");
const formCard = form.closest(".card");
const formHeading = document.getElementById("form-heading");
const submitBtn = document.getElementById("submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const notification = document.getElementById("notification");
const itemsGrid = document.getElementById("items-grid");
const itemCount = document.getElementById("item-count");

const searchInput = document.getElementById("search-input");
const filterStatus = document.getElementById("filter-status");
const filterLocation = document.getElementById("filter-location");
const filterCategory = document.getElementById("filter-category");
const showResolved = document.getElementById("show-resolved");
const clearBtn = document.getElementById("clear-search-btn");

<<<<<<< HEAD
const matchesOverlay = document.getElementById("matches-overlay");
const matchesBox = document.getElementById("matches-box");

let editingId = null; // id of the item being edited, or null when adding a new one
let currentItems = []; // items shown on the page right now

// ---------- small helpers ----------

// make text safe to put inside innerHTML (stops <script> tricks)
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : text;
  return div.innerHTML;
=======
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
>>>>>>> 574ce84304ed262ea04c76c0612c0e9f7d6d025e
}

// show a message above the form; kind = "success", "error" or "warning"
function notify(message, kind = "success") {
  notification.textContent = message;
  notification.className = kind;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => (notification.className = ""), 4000);
}

<<<<<<< HEAD
// today's date as YYYY-MM-DD
function today() {
  return new Date().toISOString().slice(0, 10);
}

// "2026-10-25" -> "Today", "Yesterday" or "3 days ago"
function daysAgo(dateText) {
  const days = Math.round((new Date(today()) - new Date(dateText)) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return days + " days ago";
}

// a picture for each category
const CATEGORY_ICONS = {
  Electronics: "💻",
  Stationery: "✏️",
  "ID Card / Documents": "🪪",
  "Wallet / Bag": "🎒",
  Keys: "🔑",
  Clothing: "👕",
  Other: "📦",
};

// fetch that always gives back { ok, data } and never throws
async function api(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    return { ok: false, data: { error: "Could not reach the server. Is node server.js running?" } };
  }
}

// ---------- stats ----------
async function loadStats() {
  const { ok, data } = await api("/api/items?showResolved=true");
  if (!ok) return;
  document.getElementById("stat-lost").textContent = data.filter((i) => i.type === "lost" && !i.resolved).length;
  document.getElementById("stat-found").textContent = data.filter((i) => i.type === "found" && !i.resolved).length;
  document.getElementById("stat-resolved").textContent = data.filter((i) => i.resolved).length;
}

// ---------- list ----------
async function loadItems() {
  const params = new URLSearchParams();
  if (filterStatus.value) params.set("type", filterStatus.value);
  if (filterLocation.value) params.set("location", filterLocation.value);
  if (filterCategory.value) params.set("category", filterCategory.value);
  if (searchInput.value.trim()) params.set("q", searchInput.value.trim());
  if (showResolved.checked) params.set("showResolved", "true");

  const { ok, data } = await api("/api/items?" + params.toString());
  if (!ok) {
    itemsGrid.innerHTML = `<p class="empty-state"><span class="empty-icon">🔌</span>${escapeHtml(data.error)}</p>`;
    return;
  }

  currentItems = data;
  itemCount.textContent = data.length;
  renderCards(data);
  loadStats();
}

function renderCards(list) {
  if (list.length === 0) {
    itemsGrid.innerHTML = `
      <p class="empty-state">
        <span class="empty-icon">🍃</span>
        Nothing here yet. Try other filters, or report the first item!
      </p>`;
=======
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
>>>>>>> 574ce84304ed262ea04c76c0612c0e9f7d6d025e
    return;
  }

  let html = "";
  for (const it of list) {
    const icon = CATEGORY_ICONS[it.category] || "📦";
    html += `
      <article class="item-card ${it.type} ${it.resolved ? "resolved" : ""}">
        <div class="item-top">
          <div class="item-icon" aria-hidden="true">${icon}</div>
          <div>
            <span class="tag tag-${it.type}">${it.type === "lost" ? "😟 Lost" : "🙌 Found"}</span>
            ${it.resolved ? '<span class="tag tag-resolved">🎉 Reunited</span>' : ""}
          </div>
        </div>

        <h3>${escapeHtml(it.item)}</h3>
        ${it.description ? `<p class="item-desc">${escapeHtml(it.description)}</p>` : ""}

        <ul class="item-meta">
          <li>🗂️ ${escapeHtml(it.category || "Other")}</li>
          <li>📍 ${escapeHtml(it.location)}</li>
          <li>📅 ${escapeHtml(it.date)} <span class="when">· ${daysAgo(it.date)}</span></li>
          <li>📞 ${escapeHtml(it.contact)}</li>
        </ul>

        <div class="item-actions">
          <button class="chip-btn chip-match" data-action="matches" data-id="${it._id}">🔗 Matches</button>
          ${it.resolved ? "" : `<button class="chip-btn chip-resolve" data-action="resolve" data-id="${it._id}">✅ Resolve</button>`}
          <button class="chip-btn chip-edit" data-action="edit" data-id="${it._id}">✏️ Edit</button>
          <button class="chip-btn chip-delete" data-action="delete" data-id="${it._id}">🗑️ Delete</button>
        </div>
      </article>`;
  }
  itemsGrid.innerHTML = html;
}

// ---------- form: add (POST) and edit (PUT) ----------
function readForm() {
  return {
    type: form.elements.status.value,
    item: form.elements.title.value,
    category: form.elements.category.value,
    location: form.elements.location.value,
    date: form.elements.date.value,
    contact: form.elements.contact.value,
    description: form.elements.description.value,
  };
}

// quick check in the browser (the server checks again - it is the real guard)
function checkForm() {
  let ok = true;
  for (const name of ["title", "location", "date", "contact"]) {
    const input = form.elements[name];
    const empty = input.value.trim() === "";
    input.classList.toggle("invalid", empty);
    if (empty) ok = false;
  }
  if (!ok) notify("✋ Please fill in the fields marked with *", "warning");
  return ok;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault(); // stop the page from reloading
  if (!checkForm()) return;

  submitBtn.disabled = true;
  submitBtn.textContent = editingId ? "⏳ Saving..." : "⏳ Reporting...";

  const url = editingId ? "/api/items/" + editingId : "/api/items";
  const { ok, data } = await api(url, {
    method: editingId ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(readForm()),
  });

  if (ok) {
    notify(editingId ? "✏️ Item updated!" : "📮 Item reported!");
    const newId = data._id;
    const wasNew = !editingId;
    stopEdit();
    await loadItems();
    // straight after reporting, tell the user if we already see a match
    if (wasNew) {
      const matches = await api("/api/items/" + newId + "/matches");
      if (matches.ok && matches.data.length > 0) {
        notify(`📮 Reported! We spotted ${matches.data.length} possible match(es) - tap "🔗 Matches" on your item.`, "warning");
      }
    }
  } else {
    notify(data.error, "error");
  }

  submitBtn.disabled = false;
  submitBtn.textContent = editingId ? "💾 Save changes" : "📮 Report item";
});

function startEdit(item) {
  editingId = item._id;
  form.elements.status.value = item.type;
  form.elements.title.value = item.item;
  form.elements.category.value = item.category || "Other";
  form.elements.location.value = item.location;
  form.elements.date.value = item.date;
  form.elements.contact.value = item.contact;
  form.elements.description.value = item.description || "";

<<<<<<< HEAD
  formHeading.textContent = "✏️ Editing: " + item.item;
  submitBtn.textContent = "💾 Save changes";
  cancelEditBtn.hidden = false;
  formCard.classList.add("editing");
  formCard.scrollIntoView({ behavior: "smooth" });
}
=======
    if (editingItemId) {
      showNotification(`Item "${data.title}" updated successfully!`, 'success');
    } else {
      showNotification(`Report for "${data.title}" submitted successfully!`, 'success');
    }
>>>>>>> 574ce84304ed262ea04c76c0612c0e9f7d6d025e

function stopEdit() {
  editingId = null;
  form.reset();
  form.elements.date.value = today();
  form.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
  formHeading.textContent = "📮 Report an item";
  submitBtn.textContent = "📮 Report item";
  cancelEditBtn.hidden = true;
  formCard.classList.remove("editing");
}

cancelEditBtn.addEventListener("click", stopEdit);

// ---------- card buttons (one listener for all cards) ----------
itemsGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "matches") {
    showMatches(id);
  }

  if (action === "edit") {
    startEdit(currentItems.find((i) => i._id === id));
  }

  if (action === "resolve") {
    if (!confirm("Has this item been returned to its owner? 🎉")) return;
    const { ok, data } = await api("/api/items/" + id + "/resolve", { method: "PATCH" });
    notify(ok ? "🎉 Yay! Marked as reunited" : data.error, ok ? "success" : "error");
    loadItems();
  }

  if (action === "delete") {
    if (!confirm("Delete this item permanently?")) return;
    const { ok, data } = await api("/api/items/" + id, { method: "DELETE" });
    notify(ok ? "🗑️ Item deleted" : data.error, ok ? "success" : "error");
    if (ok && editingId === id) stopEdit();
    loadItems();
  }
});

<<<<<<< HEAD
// ---------- matches popup ----------
async function showMatches(id) {
  const item = currentItems.find((i) => i._id === id);
  const { ok, data } = await api("/api/items/" + id + "/matches");
  if (!ok) {
    notify(data.error, "error");
    return;
=======
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
>>>>>>> 574ce84304ed262ea04c76c0612c0e9f7d6d025e
  }

<<<<<<< HEAD
  const other = item.type === "lost" ? "found" : "lost";
  let html = `
    <h3 id="matches-heading">🔗 Possible matches for "${escapeHtml(item.item)}"</h3>
    <p class="subtitle">${other} items at ${escapeHtml(item.location)} with a similar name</p>`;

  if (data.length === 0) {
    html += '<p class="empty-state"><span class="empty-icon">🔍</span>No matches yet. Check again later!</p>';
  } else {
    for (const m of data) {
      html += `
        <div class="match">
          <span class="tag tag-${m.type}">${m.type === "lost" ? "😟 Lost" : "🙌 Found"}</span>
          <b>${escapeHtml(m.item)}</b>
          <p>📍 ${escapeHtml(m.location)} · 📅 ${escapeHtml(m.date)} · 📞 ${escapeHtml(m.contact)}</p>
          ${m.description ? `<p>${escapeHtml(m.description)}</p>` : ""}
        </div>`;
=======
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
>>>>>>> 574ce84304ed262ea04c76c0612c0e9f7d6d025e
    }
  }
  html += '<button class="btn btn-primary" id="close-matches">👍 Got it</button>';

<<<<<<< HEAD
  matchesBox.innerHTML = html;
  matchesOverlay.hidden = false;
  document.getElementById("close-matches").focus();
}

function closeMatches() {
  matchesOverlay.hidden = true;
}

matchesOverlay.addEventListener("click", (event) => {
  // close when clicking the dark background or the Close button
  if (event.target === matchesOverlay || event.target.id === "close-matches") closeMatches();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMatches();
});

// ---------- search & filters ----------
let searchTimer;
searchInput.addEventListener("input", () => {
  // wait 300 ms after typing stops, so we don't call the server on every key
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadItems, 300);
});

filterStatus.addEventListener("change", loadItems);
filterLocation.addEventListener("change", loadItems);
filterCategory.addEventListener("change", loadItems);
showResolved.addEventListener("change", loadItems);

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  filterStatus.value = "";
  filterLocation.value = "";
  filterCategory.value = "";
  showResolved.checked = false;
  loadItems();
});

// ---------- start ----------
form.elements.date.value = today();
form.elements.date.max = today(); // can't pick a future date
loadItems();
=======
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
>>>>>>> 574ce84304ed262ea04c76c0612c0e9f7d6d025e
