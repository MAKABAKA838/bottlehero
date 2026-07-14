const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcRoot = path.join(root, 'build-templates/web-desktop');
const dstRoot = path.join(root, 'assets/resources/bottlehero');
const dirs = [
  'ambient',
  'audio',
  'avatar',
  'backgrounds',
  'boss',
  'feedback',
  'gameplay',
  'items',
  'npc',
  'player',
  'timing',
  'ui',
  'feedback-assets',
];
const mediaExt = new Set(['.png', '.jpg', '.jpeg', '.mp3', '.m4a']);

let copied = 0;
let skipped = 0;

for (const dir of dirs) {
  const fromDir = path.join(srcRoot, dir);
  if (!fs.existsSync(fromDir)) {
    console.warn(`skip missing: ${dir}`);
    continue;
  }
  for (const filePath of walkFiles(fromDir)) {
    const ext = path.extname(filePath).toLowerCase();
    if (!mediaExt.has(ext)) {
      continue;
    }
    const relative = path.relative(fromDir, filePath);
    const toPath = path.join(dstRoot, dir, relative);
    fs.mkdirSync(path.dirname(toPath), { recursive: true });
    if (fs.existsSync(toPath)) {
      skipped += 1;
      continue;
    }
    fs.copyFileSync(filePath, toPath);
    copied += 1;
    console.log(`copied bottlehero/${dir}/${relative.replace(/\\/g, '/')}`);
  }
}

console.log(`Import complete. copied=${copied}, skipped(existing)=${skipped}`);
console.log('Open Cocos Creator 3.8.8 to generate .meta for new files before building.');

function walkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}
