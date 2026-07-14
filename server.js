require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://cost-calculator:Bora%4012345@cost-calculator.ubb3kxd.mongodb.net/cost_calculator?retryWrites=true&w=majority";

// Connect to MongoDB Atlas
mongoose.connect(MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB Atlas!'))
  .catch(err => console.error('MongoDB Atlas connection error:', err));

// Mongoose schema for Catalogs
const catalogSchema = new mongoose.Schema({
  filename: String,
  uploadedAt: { type: Date, default: Date.now },
  productCount: Number,
  products: [{
    name: String,
    l: Number,
    w: Number,
    h: Number
  }],
  active: { type: Boolean, default: true }
});

const Catalog = mongoose.model('Catalog', catalogSchema);

// Setup upload directory and storage for multer to temporary files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname);
  },
  filename: function (req, file, cb) {
    cb(null, 'sample-products.xlsx');
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls') {
      return cb(new Error('Only Excel files (.xlsx, .xls) are allowed.'));
    }
    cb(null, true);
  }
});

// Maps a loosely-matched Excel row to {name, l, w, h}, tolerant of
// header variations like "Length (L)", "Length", "L (cm)", etc.
function mapRowToProduct(row) {
  const keys = Object.keys(row);

  const findKey = (patterns) =>
    keys.find(k => patterns.some(p => k.toLowerCase().replace(/[^a-z]/g, '').includes(p)));

  const nameKey = findKey(['productname', 'product', 'name', 'item']);
  const lKey    = findKey(['length', 'l']);
  const wKey    = findKey(['width', 'w']);
  const hKey    = findKey(['height', 'h']);

  if (!nameKey) return null;

  return {
    name: String(row[nameKey]).trim(),
    l: parseFloat(row[lKey]) || 0,
    w: parseFloat(row[wKey]) || 0,
    h: parseFloat(row[hKey]) || 0,
  };
}

// Parses local file as fallback
function getProductsFromExcel() {
  const filePath = path.join(__dirname, 'sample-products.xlsx');
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  try {
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return rows.map(mapRowToProduct).filter(p => p && p.name);
  } catch (err) {
    console.error('Error reading excel file fallback:', err);
    return [];
  }
}

// Enable JSON request body parsing
app.use(express.json());

// API: Get products list (Active catalog from database, or fallback to local disk)
app.get('/api/products', async (req, res) => {
  try {
    const activeCatalog = await Catalog.findOne({ active: true });
    if (activeCatalog && activeCatalog.products && activeCatalog.products.length > 0) {
      return res.json(activeCatalog.products);
    }
    // Fallback to local xlsx file if no database records exist
    const fallbackProducts = getProductsFromExcel();
    res.json(fallbackProducts);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products from database.' });
  }
});

// API: Handle file upload and save to MongoDB
app.post('/api/upload', upload.single('catalog'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    // Parse uploaded file locally first to extract products
    const products = getProductsFromExcel();
    if (products.length === 0) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ error: 'No valid products found in the sheet. Make sure headers match.' });
    }

    // Set all previous catalogs to inactive
    await Catalog.updateMany({}, { active: false });

    // Save new catalog to MongoDB Atlas
    const newCatalog = new Catalog({
      filename: req.file.originalname,
      productCount: products.length,
      products: products,
      active: true
    });
    await newCatalog.save();

    console.log(`Saved new catalog to database: "${req.file.originalname}". Loaded ${products.length} products.`);
    res.json({ 
      status: 'success', 
      message: `Catalog uploaded and saved permanently to database. Loaded ${products.length} products.`,
      count: products.length
    });
  } catch (err) {
    console.error('Error saving uploaded file:', err);
    res.status(500).json({ error: 'Server error saving catalog to database.' });
  }
});

// Serve static files from the current directory
app.use(express.static(__dirname));

// Error handler for multer/upload errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
