// script.js - everything the page does: form, list, filters, buttons, matches popup
// Talks to our API: /api/items (GET, POST), /api/items/:id (PUT, DELETE),
// /api/items/:id/resolve (PATCH), /api/items/:id/matches (GET)

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
}

// show a message above the form; kind = "success", "error" or "warning"
function notify(message, kind = "success") {
  notification.textContent = message;
  notification.className = kind;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => (notification.className = ""), 4000);
}

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

  formHeading.textContent = "✏️ Editing: " + item.item;
  submitBtn.textContent = "💾 Save changes";
  cancelEditBtn.hidden = false;
  formCard.classList.add("editing");
  formCard.scrollIntoView({ behavior: "smooth" });
}

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

// ---------- matches popup ----------
async function showMatches(id) {
  const item = currentItems.find((i) => i._id === id);
  const { ok, data } = await api("/api/items/" + id + "/matches");
  if (!ok) {
    notify(data.error, "error");
    return;
  }

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
    }
  }
  html += '<button class="btn btn-primary" id="close-matches">👍 Got it</button>';

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
