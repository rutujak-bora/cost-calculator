const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup upload directory and storage for multer to overwrite sample-products.xlsx
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

// Parses sample-products.xlsx and returns products list
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
    console.error('Error reading excel file:', err);
    return [];
  }
}

// Enable JSON request body parsing
app.use(express.json());

// API: Get products list
app.get('/api/products', (req, res) => {
  const products = getProductsFromExcel();
  res.json(products);
});

// API: Handle file upload
app.post('/api/upload', upload.single('catalog'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  // Validate the uploaded file has valid product rows
  const products = getProductsFromExcel();
  if (products.length === 0) {
    // If invalid, delete the file and return error
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {}
    return res.status(400).json({ error: 'No valid products found in the sheet. Make sure headers match.' });
  }

  console.log(`Saved new catalog file. Loaded ${products.length} products.`);
  res.json({ 
    status: 'success', 
    message: `Catalog uploaded and saved. Loaded ${products.length} products.`,
    count: products.length
  });
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
