/**
 * Move gameplay/throw-items/*.png from root into gameplay/throw-items/level_01/.
 * Preserves existing .meta UUIDs. Run from cocos/: node tools/migrate-level01-throw-items.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '../assets/resources/bottlehero');
const throwItemsDir = path.join(root, 'gameplay/throw-items');
const dstDir = path.join(throwItemsDir, 'level_01');

function uuid() {
  return crypto.randomUUID();
}

fs.mkdirSync(dstDir, { recursive: true });

const rootPngs = fs
  .readdirSync(throwItemsDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.png'))
  .map((entry) => entry.name)
  .sort();

let moved = 0;
for (const file of rootPngs) {
  const src = path.join(throwItemsDir, file);
  const dst = path.join(dstDir, file);
  const srcMeta = `${src}.meta`;
  const dstMeta = `${dst}.meta`;
  if (fs.existsSync(dst)) {
    console.warn(`skip existing: level_01/${file}`);
    if (fs.existsSync(src)) {
      fs.unlinkSync(src);
      if (fs.existsSync(srcMeta)) {
        fs.unlinkSync(srcMeta);
      }
    }
    continue;
  }
  fs.renameSync(src, dst);
  if (fs.existsSync(srcMeta)) {
    fs.renameSync(srcMeta, dstMeta);
  }
  moved += 1;
}

const folderMeta = `${dstDir}.meta`;
if (!fs.existsSync(folderMeta)) {
  fs.writeFileSync(
    folderMeta,
    `${JSON.stringify(
      {
        ver: '1.2.0',
        importer: 'directory',
        imported: true,
        uuid: uuid(),
        files: [],
        subMetas: {},
        userData: {},
      },
      null,
      2,
    )}\n`,
  );
}

console.log(`level_01 throw items migrated: ${rootPngs.length} root pngs, moved=${moved}`);
