/**
 * Seed ambient/<levelId>/ by copying Level 01 ambient PNGs.
 * Run from cocos/: node tools/seed-level-ambient.js level_02
 *            node tools/seed-level-ambient.js level_03
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { AMBIENT_FILES } = require('./ambient-paths');

const levelId = process.argv[2];
if (!levelId || !/^level_\d{2}$/.test(levelId) || levelId === 'level_01') {
  console.error('Usage: node tools/seed-level-ambient.js level_02|level_03');
  process.exit(1);
}

const root = path.resolve(__dirname, '../assets/resources/bottlehero/ambient');
const srcDir = path.join(root, 'level_01');
const dstDir = path.join(root, levelId);

function uuid() {
  return crypto.randomUUID();
}

function imageMeta(baseName, fileUuid) {
  const texUuid = `${fileUuid}@6c48a`;
  return {
    ver: '1.0.27',
    importer: 'image',
    imported: true,
    uuid: fileUuid,
    files: ['.json', '.png'],
    subMetas: {
      '6c48a': {
        importer: 'texture',
        uuid: texUuid,
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
          imageUuidOrDatabaseUri: fileUuid,
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
      hasAlpha: true,
      redirect: texUuid,
    },
  };
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

let copied = 0;
let metaCreated = 0;
for (const file of AMBIENT_FILES) {
  const src = path.join(srcDir, file);
  const dst = path.join(dstDir, file);
  if (!fs.existsSync(src)) {
    console.error(`missing source: level_01/${file}`);
    process.exitCode = 1;
    continue;
  }
  if (!fs.existsSync(dst)) {
    fs.copyFileSync(src, dst);
    copied += 1;
  }
  const metaPath = `${dst}.meta`;
  if (!fs.existsSync(metaPath)) {
    fs.writeFileSync(metaPath, `${JSON.stringify(imageMeta(path.basename(file, '.png'), uuid()), null, 2)}\n`);
    metaCreated += 1;
  }
}

console.log(`${levelId} ambient ready: ${AMBIENT_FILES.length} files, copied=${copied}, metaCreated=${metaCreated}`);
