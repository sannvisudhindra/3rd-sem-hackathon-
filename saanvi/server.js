/**
 * Lost and Found Application - Backend Server
 * 
 * Built with:
 * - Express.js (REST API + static file hosting)
 * - Native MongoDB Driver (MongoClient, ObjectId)
 * - CORS & JSON Middleware
 * 
 * Endpoints:
 * - GET    /items          (List items, optional ?search= & ?status=)
 * - GET    /items/:id      (Get item details by ID)
 * - POST   /items          (Report lost or found item -> 201 Created)
 * - PUT    /items/:id      (Update item details or status)
 * - DELETE /items/:id      (Delete an item record)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = 3000;

// ============================================================================
// 1. Middleware Configuration
// ============================================================================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================================
// 2. Database Configuration
// ============================================================================
const MONGO_URI = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'LostAndFoundDB';

let db;
let itemsCollection;

// Utility: Escape special characters for regex safety
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// Utility: Input Validation Middleware/Helper
function validateItem(body, isUpdate = false) {
  const { title, category, status, location, contact } = body;

  if (!isUpdate) {
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return 'Item title/name is required and must be non-empty text';
    }
    if (!category || typeof category !== 'string' || category.trim() === '') {
      return 'Category is required';
    }
    if (!status || !['Lost', 'Found', 'Resolved'].includes(status)) {
      return "Status must be 'Lost', 'Found', or 'Resolved'";
    }
    if (!location || typeof location !== 'string' || location.trim() === '') {
      return 'Location where item was lost/found is required';
    }
    if (!contact || typeof contact !== 'string' || contact.trim() === '') {
      return 'Contact information (phone or email) is required';
    }
  } else {
    if (status !== undefined && !['Lost', 'Found', 'Resolved'].includes(status)) {
      return "Status must be 'Lost', 'Found', or 'Resolved'";
    }
  }

  return null;
}

// ============================================================================
// 3. REST API Routes
// ============================================================================

// 1. POST /items (Report new item)
app.post('/items', async (req, res) => {
  try {
    const validationError = validateItem(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const newItem = {
      title: req.body.title.trim(),
      category: req.body.category.trim(),
      status: req.body.status, // 'Lost' or 'Found'
      location: req.body.location.trim(),
      date: req.body.date ? req.body.date.trim() : new Date().toISOString().split('T')[0],
      contact: req.body.contact.trim(),
      description: req.body.description ? req.body.description.trim() : '',
      createdAt: new Date()
    };

    const result = await itemsCollection.insertOne(newItem);
    res.status(201).json({
      _id: result.insertedId,
      ...newItem
    });
  } catch (error) {
    console.error('POST /items error:', error);
    res.status(500).json({ error: 'Failed to create item report' });
  }
});

// 2. GET /items (Read all with optional ?search= and ?status=)
app.get('/items', async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};

    if (status && ['Lost', 'Found', 'Resolved'].includes(status)) {
      filter.status = status;
    }

    if (search && search.trim() !== '') {
      const cleanSearch = escapeRegex(search.trim());
      const regex = new RegExp(cleanSearch, 'i');
      filter.$or = [
        { title: { $regex: regex } },
        { location: { $regex: regex } },
        { category: { $regex: regex } },
        { description: { $regex: regex } }
      ];
    }

    const items = await itemsCollection.find(filter).sort({ createdAt: -1 }).toArray();
    res.json(items);
  } catch (error) {
    console.error('GET /items error:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// 3. GET /items/:id (Read single item by ID)
app.get('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid item ID format' });
    }

    const item = await itemsCollection.findOne({ _id: new ObjectId(id) });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error(`GET /items/${req.params.id} error:`, error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// 4. PUT /items/:id (Update existing item)
app.put('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid item ID format' });
    }

    const validationError = validateItem(req.body, true);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const updateFields = {};
    if (req.body.title !== undefined) updateFields.title = req.body.title.trim();
    if (req.body.category !== undefined) updateFields.category = req.body.category.trim();
    if (req.body.status !== undefined) updateFields.status = req.body.status;
    if (req.body.location !== undefined) updateFields.location = req.body.location.trim();
    if (req.body.date !== undefined) updateFields.date = req.body.date.trim();
    if (req.body.contact !== undefined) updateFields.contact = req.body.contact.trim();
    if (req.body.description !== undefined) updateFields.description = req.body.description.trim();

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    const result = await itemsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const updatedItem = await itemsCollection.findOne({ _id: new ObjectId(id) });
    res.json(updatedItem);
  } catch (error) {
    console.error(`PUT /items/${req.params.id} error:`, error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// 5. DELETE /items/:id (Delete item by ID)
app.delete('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid item ID format' });
    }

    const result = await itemsCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully', id });
  } catch (error) {
    console.error(`DELETE /items/${req.params.id} error:`, error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ============================================================================
// 4. Server & Database Startup
// ============================================================================
async function startServer() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('✅ Connected successfully to MongoDB at ' + MONGO_URI);

    db = client.db(DB_NAME);
    itemsCollection = db.collection('items');

    const server = app.listen(PORT, () => {
      console.log(`🚀 Lost & Found Server running at http://127.0.0.1:${PORT}`);
    });

    // Graceful Shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down server gracefully...');
      await client.close();
      server.close(() => {
        console.log('MongoDB connection closed. Server terminated.');
        process.exit(0);
      });
    });

    return { app, client, db, itemsCollection };
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
