# Campus Lost & Found System

A complete full-stack web application built using the exact architecture and concepts taught in **Module 3 (Node.js & Express REST APIs)** and **Module 4 (MongoDB & Frontend Fetch Integration)**.

---

## 🏗️ Architecture Overview

```text
Browser (Vanilla HTML + CSS + JS) 
       │
       │ HTTP Request (GET, POST, PUT, DELETE with fetch)
       ▼
Express.js Server (:3000)
 ├── Middleware: express.json(), cors(), express.static('public')
 ├── Input Validation & Error Handling (400, 404, 500)
 ├── Query Filtering: ?search=... & ?status=...
 └── MongoDB Native Driver (MongoClient, ObjectId)
       │
       ▼
MongoDB Database (LostAndFoundDB -> items collection)
```

---

## 📁 Project Structure

```text
lost-and-found-project/
├── package.json              # Project dependencies (express, mongodb, cors)
├── server.js                 # Complete REST API & static file server
├── public/                   # Client-side web interface
│   ├── index.html            # UI layout (Form, Search, Items table)
│   ├── style.css             # Responsive styling & status badges
│   └── script.js             # Vanilla JS: fetch(), DOM updates, debounce
└── postman/                  # Ready-to-import API test collection
    └── Lost_and_Found_API.postman_collection.json
```

---

## 🚀 How to Run the Project (Step-by-Step)

### Step 1: Ensure MongoDB is Running
Make sure the MongoDB service is running on the machine:
- Default connection: `mongodb://127.0.0.1:27017`
- In MongoDB Compass, connect to `mongodb://127.0.0.1:27017` to verify.

### Step 2: Open Terminal in Project Directory
Open the `lost-and-found-project` folder in VS Code, open a terminal (`Ctrl + ~`):

```bash
cd e:/skill_lab_3rdsem/lost-and-found-project
```

### Step 3: Install Dependencies
Run:
```bash
npm install
```
*(If you already have `node_modules` from Module 4, you can also copy it here).*

### Step 4: Start the Server
Run:
```bash
node server.js
```
Or for auto-reload during edits:
```bash
node --watch server.js
```

You should see:
```text
✅ Connected successfully to MongoDB at mongodb://127.0.0.1:27017
🚀 Lost & Found Server running at http://127.0.0.1:3000
```

### Step 5: Open in Browser
Open your browser and navigate to:
```text
http://127.0.0.1:3000
```
- Report a new lost or found item.
- Try searching by item title or location with live debounce.
- Filter by "Lost Only" or "Found Only".
- Click **Edit** to update an item's details.
- Click **Delete** to remove a resolved report.

---

## 📮 Testing with Postman

1. Open Postman.
2. Click **Import** (top left).
3. Select or drag-and-drop `postman/Lost_and_Found_API.postman_collection.json`.
4. You will have 9 ready-to-test requests:
   - **POST /items**: Report a lost item (automatically saves `itemId`)
   - **POST /items**: Report a found item
   - **GET /items**: Retrieve all items
   - **GET /items?search=calculator**: Test live search query
   - **GET /items?status=Lost**: Test status filter
   - **GET /items/:id**: Fetch specific item
   - **PUT /items/:id**: Update status or description
   - **DELETE /items/:id**: Delete an item
   - **POST /items (Validation)**: Expects `400 Bad Request`

---

## 🍃 Viewing Data in MongoDB Compass

1. Open **MongoDB Compass**.
2. Connect to `mongodb://127.0.0.1:27017`.
3. In the left sidebar, look for `LostAndFoundDB`.
4. Click on the `items` collection to see the stored documents with `_id: ObjectId(...)`.
