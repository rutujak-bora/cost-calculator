const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure storage for multer to overwrite sample-products.xlsx in the root folder
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname);
  },
  filename: function (req, file, cb) {
    cb(null, 'sample-products.xlsx');
  }
});

const upload = multer({ storage: storage });

// API endpoint to handle catalog upload
app.post('/api/upload', upload.single('catalog'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  console.log(`Saved new catalog file: ${req.file.path}`);
  res.json({ status: 'success', message: 'Catalog uploaded and updated permanently.' });
});

// Serve static files from the root directory
app.use(express.static(__dirname));

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
