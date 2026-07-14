/**
 * Seed per-level background folders for Level 02 / 03 (copies from Level 01 placeholders).
 * Run from cocos/: node tools/seed-level-backgrounds.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '../assets/resources/bottlehero/backgrounds');

const level01Sources = [
  ['start', 'level_01/level_01_start.jpg'],
  ['loop', 'level_01/level_01_loop.png'],
  ['scene03Bridge', 'level_01/level_01_scene_03_bridge.jpg'],
  ['scene03Loop', 'level_01/level_01_scene_03_loop.jpg'],
  ['scene04Bridge', 'level_01/level_01_scene_04_bridge.jpg'],
  ['scene04Loop', 'level_01/level_01_scene_04_loop.jpg'],
];

function uuid() {
  return crypto.randomUUID();
}

function writeImageMeta(metaPath, baseName, ext) {
  const imageUuid = uuid();
  const meta = {
    ver: '1.0.27',
    importer: 'image',
    imported: true,
    uuid: imageUuid,
    files: [ext, '.json'],
    subMetas: {
      '6c48a': {
        importer: 'texture',
        uuid: `${imageUuid}@6c48a`,
        displayName: baseName,
        id: '6c48a',
        name: 'texture',
        userData: {
          wrapModeS: 'repeat',
          wrapModeT: 'repeat',
          minfilter: 'linear',
          magfilter: 'linear',
          mipfilter: 'none',
          anisotropy: 0,
          isUuid: true,
          imageUuidOrDatabaseUri: imageUuid,
          visible: false,
        },
        ver: '1.0.22',
        imported: true,
        files: ['.json'],
        subMetas: {},
      },
    },
    userData: {
      type: 'texture',
      fixAlphaTransparencyArtifacts: false,
      hasAlpha: ext === '.png',
      redirect: `${imageUuid}@6c48a`,
    },
  };
  fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
}

function ensureFolderMeta(folderPath) {
  const folderMeta = `${folderPath}.meta`;
  if (fs.existsSync(folderMeta)) {
    return;
  }
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

function seedLevel(levelId) {
  const dstDir = path.join(root, levelId);
  fs.mkdirSync(dstDir, { recursive: true });
  ensureFolderMeta(dstDir);
  let copied = 0;
  for (const [, sourceName] of level01Sources) {
    const ext = path.extname(sourceName);
    const base = path.basename(sourceName, ext).replace(/^level_01_/, '');
    const targetName = `${levelId}_${base}${ext}`;
    const src = path.join(root, sourceName);
    const dst = path.join(dstDir, targetName);
    if (!fs.existsSync(src)) {
      console.error(`missing source: ${sourceName}`);
      process.exitCode = 1;
      continue;
    }
    if (!fs.existsSync(dst)) {
      fs.copyFileSync(src, dst);
      writeImageMeta(`${dst}.meta`, targetName.replace(ext, ''), ext);
      copied += 1;
    }
  }
  console.log(`${levelId}: copied ${copied} background files`);
}

for (const levelId of ['level_02', 'level_03']) {
  seedLevel(levelId);
}

console.log('Level background seed complete.');
