// Post-build script to rewrite asset URLs in dist/index.html and manifest to /npc/material-allocator/assets/
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '../dist');
const HTML_FILE = path.join(DIST_DIR, 'index.html');
const ASSET_PREFIX_FROM = '/material-allocator/assets/';
const ASSET_PREFIX_TO = '/npc/material-allocator/assets/';

function rewriteFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  const replaced = content.split(ASSET_PREFIX_FROM).join(ASSET_PREFIX_TO);
  if (replaced !== content) {
    fs.writeFileSync(filePath, replaced, 'utf8');
    console.log(`Rewrote asset URLs in ${filePath}`);
  }
}

// Rewrite index.html
rewriteFile(HTML_FILE);

// Optionally, rewrite manifest.json if present
const manifestFile = path.join(DIST_DIR, 'manifest.json');
rewriteFile(manifestFile);

// Optionally, rewrite all .js and .css files in dist (for dynamic imports)
function rewriteAssetsInDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      rewriteAssetsInDir(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.css')) {
      rewriteFile(fullPath);
    }
  });
}

rewriteAssetsInDir(DIST_DIR);
