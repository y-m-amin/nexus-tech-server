import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = path.join(__dirname, 'db.json');

// Middleware
app.use(cors());


app.use(express.json());
app.use(
  cors({
    origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    //credentials: true,
  })
);
// Helper function to read database
async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { products: [], orders: [], users: [] };
  }
}

// Helper function to write database
async function writeDB(data) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing database:', error);
    return false;
  }
}

function init() {
  if (!initPromise) initPromise = run();
  return initPromise;
}

app.use(async (req, res, next) => {
  try {
    await init();
    next();
  } catch (e) {
    next(e);
  }
});

async function run(){
  try {
    // Routes

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const db = await readDB();
    res.json(db.products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const db = await readDB();
    const product = db.products.find(p => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Get products by seller
app.get('/api/products/seller/:sellerId', async (req, res) => {
  try {
    const db = await readDB();
    const products = db.products.filter(p => p.sellerId === req.params.sellerId);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch seller products' });
  }
});

// Create new product
app.post('/api/products', async (req, res) => {
  try {
    const db = await readDB();
    const newProduct = {
      id: Date.now().toString(),
      ...req.body,
      rating: 5.0,
      createdAt: new Date().toISOString()
    };
    
    db.products.push(newProduct);
    const success = await writeDB(db);
    
    if (success) {
      res.status(201).json(newProduct);
    } else {
      res.status(500).json({ error: 'Failed to save product' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const db = await readDB();
    const productIndex = db.products.findIndex(p => p.id === req.params.id);
    
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Check if user owns the product
    if (db.products[productIndex].sellerId !== req.body.sellerId) {
      return res.status(403).json({ error: 'Unauthorized to update this product' });
    }
    
    db.products[productIndex] = {
      ...db.products[productIndex],
      ...req.body,
      id: req.params.id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };
    
    const success = await writeDB(db);
    
    if (success) {
      res.json(db.products[productIndex]);
    } else {
      res.status(500).json({ error: 'Failed to update product' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const db = await readDB();
    const productIndex = db.products.findIndex(p => p.id === req.params.id);
    
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Check if user owns the product (sellerId should be passed in request body or headers)
    const sellerId = req.body.sellerId || req.headers['x-seller-id'];
    if (db.products[productIndex].sellerId !== sellerId) {
      return res.status(403).json({ error: 'Unauthorized to delete this product' });
    }
    
    db.products.splice(productIndex, 1);
    const success = await writeDB(db);
    
    if (success) {
      res.json({ message: 'Product deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete product' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Orders endpoints
app.get('/api/orders/:userId', async (req, res) => {
  try {
    const db = await readDB();
    const orders = db.orders.filter(o => o.userId === req.params.userId);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const db = await readDB();
    const newOrder = {
      id: `ORD-${Date.now()}`,
      ...req.body,
      date: new Date().toISOString()
    };
    
    db.orders.push(newOrder);
    const success = await writeDB(db);
    
    if (success) {
      res.status(201).json(newOrder);
    } else {
      res.status(500).json({ error: 'Failed to save order' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
  } catch (err){
    console.error('startup error: ', err)
  }
}

// app.listen(PORT, () => {
//   console.log(`🚀 Server running on http://localhost:${PORT}`);
// });

//module.exports = app;

export default app;
