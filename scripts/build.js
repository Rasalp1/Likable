import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

console.log('🔨 Building Likable Chrome Extension into dist/ ...\n');

// 1. Clean dist/
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Helper to copy directory recursively
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 2. Copy extension files
const filesToCopy = [
  'manifest.json',
  'background.js'
];

for (const file of filesToCopy) {
  const src = path.join(rootDir, file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  ✓ Copied ${file}`);
  }
}

const dirsToCopy = [
  'content',
  'popup',
  'icons'
];

for (const dir of dirsToCopy) {
  const src = path.join(rootDir, dir);
  const dest = path.join(distDir, dir);
  if (fs.existsSync(src)) {
    copyDirSync(src, dest);
    console.log(`  ✓ Copied ${dir}/`);
  }
}

// 3. Verify manifest in dist
const manifestPath = path.join(distDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('\n❌ Build Error: manifest.json missing in dist/');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
console.log(`\n✅ Build Complete!`);
console.log(`   Extension: ${manifest.name} (v${manifest.version})`);
console.log(`   Output Folder: ${distDir}`);
console.log(`\n👉 To load into Google Chrome:`);
console.log(`   1. Open Chrome and navigate to: chrome://extensions/`);
console.log(`   2. Turn ON 'Developer mode' in the top-right corner.`);
console.log(`   3. Click 'Load unpacked'.`);
console.log(`   4. Select the folder: ${distDir}\n`);
