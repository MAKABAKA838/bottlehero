/**
 * Move ambient/*.png into ambient/level_01/ (preserves .meta UUIDs).
 * Run from cocos/: node tools/migrate-level01-ambient.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { AMBIENT_FILES } = require('./ambient-paths');

const root = path.resolve(__dirname, '../assets/resources/bottlehero/ambient');
const dstDir = path.join(root, 'level_01');

function uuid() {
  return crypto.randomUUID();
}

fs.mkdirSync(dstDir, { recursive: true });

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

let moved = 0;
for (const file of AMBIENT_FILES) {
  const src = path.join(root, file);
  const dst = path.join(dstDir, file);
  const srcMeta = `${src}.meta`;
  const dstMeta = `${dst}.meta`;
  if (!fs.existsSync(src)) {
    if (fs.existsSync(dst)) {
      console.log(`already migrated: level_01/${file}`);
      continue;
    }
    console.error(`missing source: ${file}`);
    process.exitCode = 1;
    continue;
  }
  if (fs.existsSync(dst)) {
    console.warn(`skip existing: level_01/${file}`);
    fs.unlinkSync(src);
    if (fs.existsSync(srcMeta)) {
      fs.unlinkSync(srcMeta);
    }
    continue;
  }
  fs.renameSync(src, dst);
  if (fs.existsSync(srcMeta)) {
    fs.renameSync(srcMeta, dstMeta);
  }
  moved += 1;
}

console.log(`level_01 ambient migrated: ${moved} files`);
