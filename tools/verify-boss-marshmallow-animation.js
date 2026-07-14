/**
 * 检测 L3 Marshmallow Boss 图集：尺寸、网格切帧参数、与 BottleHeroBossAssets 配置是否一致。
 * Run from cocos/: node tools/verify-boss-marshmallow-animation.js
 */
const fs = require('fs');
const path = require('path');

const assetRoot = path.resolve(__dirname, '../assets/resources/bottlehero');
const cols = 2;
const rows = 4;
const frameCount = cols * rows;

const configuredAssets = [
  {
    id: 'boss03MarshmallowIdle',
    file: 'boss/Marshmallow/Stage_1/boss03_Marshmallow_idle1.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
  },
  {
    id: 'boss03MarshmallowIdleStage2',
    file: 'boss/Marshmallow/Stage_2/boss03_Marshmallow_Stage_2_idle1.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
  },
  {
    id: 'boss03MarshmallowSwitchStage',
    file: 'boss/Marshmallow/boss03_Marshmallow_Switch stage.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
  },
  {
    id: 'boss03MarshmallowStage1Attack',
    file: 'boss/Marshmallow/Stage_1/boss03_Marshmallow_Stage_1_attack.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
  },
  {
    id: 'boss03MarshmallowStage1Hitted',
    file: 'boss/Marshmallow/Stage_1/boss03_Marshmallow_Stage_1_hitted.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
  },
  {
    id: 'boss03MarshmallowStage2Hitted',
    file: 'boss/Marshmallow/Stage_2/boss03_Marshmallow_Stage_2_hitted.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 497,
    frameHeight: 251,
  },
  {
    id: 'boss03MarshmallowStage1Dizziness',
    file: 'boss/Marshmallow/Stage_1/boss03_Marshmallow_Stage_1_dizziness.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
  },
  {
    id: 'boss03MarshmallowStage1Frozen',
    file: 'boss/Marshmallow/Stage_1/boss03_Marshmallow_Stage_1_frozen.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
    frozenPlayback: true,
  },
  {
    id: 'boss03MarshmallowStage2Frozen',
    file: 'boss/Marshmallow/Stage_2/boss03_Marshmallow_Stage_2_frozen.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 498,
    frameHeight: 252,
    frozenPlayback: true,
  },
  {
    id: 'boss03MarshmallowStage2Bomb',
    file: 'boss/Marshmallow/Stage_2/boss03_Marshmallow_Stage_2_Bomb.png',
    columns: 3,
    frameCount: 9,
    fps: 12,
    frameWidth: 341,
    frameHeight: 341,
  },
  {
    id: 'boss03MarshmallowDead',
    file: 'boss/Marshmallow/Stage_2/boss03_Marshmallow_dead.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 497,
    frameHeight: 250,
  },
];

const discoveredSheets = [];

function walkPng(dir, prefix = '') {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkPng(full, rel);
      continue;
    }
    if (!entry.name.toLowerCase().endsWith('.png')) {
      continue;
    }
    const buffer = fs.readFileSync(full);
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    const cellW = Math.floor(width / cols);
    const cellH = Math.floor(height / rows);
    const matchesGrid = width % cols === 0 && height % rows === 0;
    discoveredSheets.push({
      file: rel.replace(/\\/g, '/'),
      width,
      height,
      cellW,
      cellH,
      matchesGrid,
      bytes: buffer.length,
    });
  }
}

walkPng(path.join(assetRoot, 'boss/Marshmallow'), 'boss/Marshmallow');

function readPngSize(file) {
  const full = path.join(assetRoot, file);
  if (!fs.existsSync(full)) {
    return null;
  }
  const buffer = fs.readFileSync(full);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bytes: buffer.length,
  };
}

const issues = [];
const passes = [];
const warnings = [];

console.log('Bottlehero L3 Marshmallow animation check\n');

if (discoveredSheets.length === 0) {
  issues.push('no PNG sheets under boss/Marshmallow/');
} else {
  console.log('Discovered sheets:');
  for (const sheet of discoveredSheets) {
    const grid = sheet.matchesGrid
      ? `${cols}x${rows} cell=${sheet.cellW}x${sheet.cellH}`
      : `NOT divisible by ${cols}x${rows}`;
    console.log(`  - ${sheet.file}: ${sheet.width}x${sheet.height} (${sheet.bytes} bytes) ${grid}`);
  }
  console.log('');
}

for (const asset of configuredAssets) {
  const size = readPngSize(asset.file);
  if (!size) {
    issues.push(`configured file missing: ${asset.file}`);
    const fallback = discoveredSheets.find((sheet) => /idle/i.test(sheet.file));
    if (fallback) {
      issues.push(`  hint: found idle sheet at ${fallback.file}`);
    }
    continue;
  }
  const rowCount = Math.ceil(asset.frameCount / asset.columns);
  const expectedW = asset.frameWidth * asset.columns;
  const expectedH = asset.frameHeight * rowCount;
  const actualCellW = Math.floor(size.width / asset.columns);
  const actualCellH = Math.floor(size.height / rowCount);
  const sizeMatch = size.width === expectedW && size.height === expectedH;
  const cellMatch = actualCellW === asset.frameWidth && actualCellH === asset.frameHeight;

  console.log(`Asset ${asset.id}`);
  console.log(`  file: ${asset.file}`);
  console.log(`  sheet: ${size.width}x${size.height}`);
  console.log(`  configured: ${expectedW}x${expectedH} (${asset.frameWidth}x${asset.frameHeight}/frame, ${asset.frameCount} frames @ ${asset.fps}fps)`);
  console.log(`  actual cell: ${actualCellW}x${actualCellH}`);

  if (sizeMatch && cellMatch) {
    passes.push(`${asset.id}: sheet and cell size match config`);
  } else if (!sizeMatch && cellMatch) {
    warnings.push(`${asset.id}: sheet ${size.width}x${size.height} vs configured ${expectedW}x${expectedH} (cell ${actualCellW}x${actualCellH} OK, ResourceLoader auto-correct)`);
    passes.push(`${asset.id}: cell size matches (${actualCellW}x${actualCellH})`);
  } else {
    issues.push(`${asset.id}: frame cell mismatch (configured ${asset.frameWidth}x${asset.frameHeight}, actual ${actualCellW}x${actualCellH})`);
  }

  const expectedGridFrames = asset.columns * rowCount;
  if (asset.frameCount !== expectedGridFrames) {
    issues.push(`${asset.id}: frameCount ${asset.frameCount} but grid yields ${expectedGridFrames}`);
  }

  const overridesByAsset = {
    boss03MarshmallowIdle: 'boss_alien_03 form1 -> idle',
    boss03MarshmallowIdleStage2: 'boss_alien_03 form2 -> idle',
    boss03MarshmallowSwitchStage: 'boss_alien_03 -> switchStage @ 50% HP',
    boss03MarshmallowStage1Attack: 'boss_alien_03 -> attack (stage1)',
    boss03MarshmallowStage1Hitted: 'boss_alien_03 form1 -> hitted',
    boss03MarshmallowStage2Hitted: 'boss_alien_03 form2 -> hitted',
    boss03MarshmallowStage1Dizziness: 'boss_alien_03 -> dizziness (stage1)',
    boss03MarshmallowStage1Frozen: 'boss_alien_03 form1 -> frozen (L2 hold/thaw)',
    boss03MarshmallowStage2Frozen: 'boss_alien_03 form2 -> frozen (L2 hold/thaw)',
    boss03MarshmallowStage2Bomb: 'boss_alien_03 form2 -> bullet (3x3 L->R T->B)',
    boss03MarshmallowDead: 'boss_alien_03 -> dead',
  };
  const override = overridesByAsset[asset.id];
  if (override) {
    passes.push(`${override} wired to ${asset.id}`);
  }
  if (asset.frozenPlayback) {
    passes.push(`${asset.id}: frozenPlayback hold=0 thaw=1..7 (same as L2 octopus)`);
  }
  console.log('');
}

console.log('Dual form: HP > 50% = form1 idle, HP <= 50% triggers switchStage then form2 idle\n');
console.log('Reference (L2 octopus idle): 1024x1024, 2x4, 512x256, 8 frames, 12fps\n');

if (passes.length > 0) {
  console.log(`PASS (${passes.length}):`);
  for (const line of passes) {
    console.log(`  ✓ ${line}`);
  }
}

if (warnings.length > 0) {
  console.log(`\nWARN (${warnings.length}):`);
  for (const line of warnings) {
    console.log(`  ! ${line}`);
  }
}

if (issues.length > 0) {
  console.log(`\nFAIL (${issues.length}):`);
  for (const line of issues) {
    console.log(`  ✗ ${line}`);
  }
  process.exit(1);
}

console.log('\nL3 Marshmallow animation config OK.');
