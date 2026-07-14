/**
 * 阶段 2 资产完整性校验：扫描 assets/resources/bottlehero/ 媒体与 .meta 配对。
 *
 * 用法（在 cocos 目录）：
 *   node tools/verify-bottlehero-assets.js
 * 退出码：0 = 通过，1 = 存在问题
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const assetRoot = path.join(root, 'assets/resources/bottlehero');
const mediaExt = new Set(['.png', '.jpg', '.jpeg', '.mp3', '.m4a']);

/** 与 docs/ASSET_INVENTORY.md 一致的一级目录媒体数量（不含 config/） */
const expectedTopLevelCounts = {
  ambient: 23,
  audio: 16,
  avatar: 20,
  backgrounds: 22,
  boss: 20,
  feedback: 60,
  'feedback-assets': 5,
  gameplay: 82,
  items: 5,
  npc: 1,
  player: 4,
  timing: 20,
  ui: 47,
};

const criticalWebPaths = [
  'ui/buttons/enter_button.png',
  'ui/buttons/level_1.png',
  'ui/buttons/level_2.png',
  'ui/logo.png',
  'backgrounds/level_01/level_01_start.jpg',
  'backgrounds/level_01/level_01_loop.png',
  'backgrounds/level_02/level_02_start.jpg',
  'backgrounds/level_03/level_03_start.jpg',
  'backgrounds/level_03/level_03_loop.jpg',
  'player/paw_right.png',
  'audio/bgm.mp3',
  'audio/throw.mp3',
  'boss/atlases/boss01_Alien_idle.png',
  'boss/Octopus/boss02_Octopus_idle.png',
  'boss/Octopus/boss02_Octopus_attack.png',
  'boss/Octopus/boss02_Octopus_hitted.png',
  'boss/Octopus/boss02_Octopus_dead.png',
  'boss/Octopus/boss02_Octopus_frozen.png',
  'boss/Octopus/boss02_Jellyfish_idle.png',
  'boss/Marshmallow/Stage_1/boss03_Marshmallow_idle1.png',
  'boss/Marshmallow/Stage_2/boss03_Marshmallow_Stage_2_Bomb.png',
  'gameplay/throw-items/level_01/throw_item_00_kettle.png',
  'gameplay/throw-items/level_02/throw_item_00.png',
  'gameplay/throw-items/level_03/throw_item_00.png',
  'ambient/level_01/bee.png',
  'ambient/level_02/fish_01.png',
  'ambient/level_03/sugar-fed bee swarm.png',
  'feedback/perfect/0001.png',
];

function walkFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function topCategory(relativePath) {
  const parts = relativePath.replace(/\\/g, '/').split('/');
  if (parts[0] === 'gameplay') {
    return 'gameplay';
  }
  return parts[0];
}

function main() {
  if (!fs.existsSync(assetRoot)) {
    console.error('FAIL: missing directory', assetRoot);
    process.exit(1);
  }

  const allFiles = walkFiles(assetRoot);
  const mediaFiles = [];
  const metaFiles = [];
  const errors = [];
  const warnings = [];
  const actualTopCounts = {};

  for (const filePath of allFiles) {
    const ext = path.extname(filePath).toLowerCase();
    const rel = path.relative(assetRoot, filePath);
    if (ext === '.meta') {
      metaFiles.push(rel);
      continue;
    }
    if (!mediaExt.has(ext)) {
      continue;
    }
    mediaFiles.push(rel);
    const cat = topCategory(rel);
    actualTopCounts[cat] = (actualTopCounts[cat] || 0) + 1;

    const metaPath = `${filePath}.meta`;
    if (!fs.existsSync(metaPath)) {
      errors.push(`missing .meta: ${rel.replace(/\\/g, '/')}`);
    }
    const stat = fs.statSync(filePath);
    if (stat.size <= 0) {
      errors.push(`zero-byte media: ${rel.replace(/\\/g, '/')}`);
    }
  }

  for (const metaRel of metaFiles) {
    if (!metaRel.endsWith('.meta')) {
      continue;
    }
    const baseRel = metaRel.slice(0, -5);
    const ext = path.extname(baseRel).toLowerCase();
    if (!mediaExt.has(ext)) {
      continue;
    }
    const basePath = path.join(assetRoot, baseRel);
    if (!fs.existsSync(basePath)) {
      errors.push(`orphan .meta (no media file): ${baseRel.replace(/\\/g, '/')}`);
    }
  }

  let expectedTotal = 0;
  for (const [dir, count] of Object.entries(expectedTopLevelCounts)) {
    expectedTotal += count;
    const actual = actualTopCounts[dir] || 0;
    if (actual !== count) {
      errors.push(`count mismatch ${dir}: expected ${count}, got ${actual}`);
    }
  }

  const actualTotal = mediaFiles.length;
  if (actualTotal !== expectedTotal) {
    errors.push(`total media: expected ${expectedTotal}, got ${actualTotal}`);
  }

  for (const webPath of criticalWebPaths) {
    const diskPath = path.join(assetRoot, webPath);
    if (!fs.existsSync(diskPath)) {
      errors.push(`critical asset missing: ${webPath}`);
    }
  }

  console.log('Bottlehero asset verification');
  console.log('root:', assetRoot);
  console.log('media files:', actualTotal);
  console.log('meta files:', metaFiles.length);
  console.log('');
  console.log('By directory:');
  for (const [dir, count] of Object.entries(expectedTopLevelCounts)) {
    const actual = actualTopCounts[dir] || 0;
    const mark = actual === count ? 'OK' : '!!';
    console.log(`  ${mark} ${dir}: ${actual}/${count}`);
  }

  if (warnings.length) {
    console.log('\nWarnings:');
    for (const w of warnings) {
      console.log('  -', w);
    }
  }

  if (errors.length) {
    console.log('\nFAIL (' + errors.length + '):');
    for (const e of errors) {
      console.log('  -', e);
    }
    console.log('\nFix: restore missing binaries under assets/resources/bottlehero/, then refresh in Cocos Creator.');
    process.exit(1);
  }

  console.log('\nPASS: all media files present, paired with .meta, counts match ASSET_INVENTORY.md');
  process.exit(0);
}

main();
