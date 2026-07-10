const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// GitHub config for permanent catalog persistence
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'rutujak-bora';
const GITHUB_REPO = process.env.GITHUB_REPO || 'cost-calculator';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

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
app.post('/api/upload', upload.single('catalog'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  const filePath = req.file.path;
  console.log(`Saved new catalog file locally: ${filePath}`);

  // If GITHUB_TOKEN is set, sync the file to GitHub for permanent cloud storage
  if (GITHUB_TOKEN) {
    try {
      console.log('GitHub Token found. Syncing catalog file to GitHub...');
      const fileContent = fs.readFileSync(filePath);
      const base64Content = fileContent.toString('base64');
      const apiPath = 'sample-products.xlsx';

      // 1. Get the current file's SHA (required for file updates in GitHub API)
      const getFileUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${apiPath}?ref=${GITHUB_BRANCH}`;
      const getResponse = await fetch(getFileUrl, {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'Express-Backend-Catalog-Uploader'
        }
      });

      let sha = null;
      if (getResponse.ok) {
        const fileData = await getResponse.json();
        sha = fileData.sha;
      } else if (getResponse.status !== 404) {
        throw new Error(`Failed to fetch file metadata (status ${getResponse.status}): ${getResponse.statusText}`);
      }

      // 2. Commit the updated file directly to the repository
      const putFileUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${apiPath}`;
      const putResponse = await fetch(putFileUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'Express-Backend-Catalog-Uploader'
        },
        body: JSON.stringify({
          message: 'Update product catalog via web upload',
          content: base64Content,
          sha: sha || undefined,
          branch: GITHUB_BRANCH
        })
      });

      if (!putResponse.ok) {
        const errData = await putResponse.json();
        throw new Error(`GitHub API put failed: ${errData.message || putResponse.statusText}`);
      }

      console.log('Successfully committed file to GitHub!');
      return res.json({
        status: 'success',
        message: 'Catalog uploaded, saved locally, and permanently committed to GitHub.'
      });

    } catch (err) {
      console.error('Error committing to GitHub:', err);
      return res.json({
        status: 'warning',
        message: `Catalog loaded locally, but failed to sync to GitHub: ${err.message}`
      });
    }
  }

  // Fallback if no token is configured (e.g. local environment)
  res.json({
    status: 'success',
    message: 'Catalog uploaded and saved locally. Configure GITHUB_TOKEN on your server for cloud sync.'
  });
});

// Serve static files from the root directory
app.use(express.static(__dirname));

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
