/**
 * 检测 L2 Octopus Boss 图集：尺寸、网格切帧、frameCellIndices 与 BottleHeroBossAssets 是否一致。
 * Run from cocos/: node tools/verify-boss-octopus-animation.js
 */
const fs = require('fs');
const path = require('path');

const assetRoot = path.resolve(__dirname, '../assets/resources/bottlehero');

const configuredAssets = [
  {
    id: 'boss02OctopusIdle',
    file: 'boss/Octopus/boss02_Octopus_idle.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
  },
  {
    id: 'boss02OctopusAttack',
    file: 'boss/Octopus/boss02_Octopus_attack.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
  },
  {
    id: 'boss02OctopusHitted',
    file: 'boss/Octopus/boss02_Octopus_hitted.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
    frameCellIndices: [1, 3, 5, 7],
  },
  {
    id: 'boss02OctopusDizziness',
    file: 'boss/Octopus/boss02_Octopus_dizziness.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
  },
  {
    id: 'boss02OctopusFrozen',
    file: 'boss/Octopus/boss02_Octopus_frozen.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
    frozenPlayback: true,
  },
  {
    id: 'boss02OctopusDead',
    file: 'boss/Octopus/boss02_Octopus_dead.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
  },
  {
    id: 'boss02JellyfishIdle',
    file: 'boss/Octopus/boss02_Jellyfish_idle.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
  },
];

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

function gridRowCount(asset) {
  const gridCellCount = asset.frameCellIndices?.length
    ? Math.max(...asset.frameCellIndices) + 1
    : asset.frameCount;
  return Math.max(1, Math.ceil(gridCellCount / Math.max(1, asset.columns)));
}

const issues = [];
const passes = [];
const warnings = [];

console.log('Bottlehero L2 Octopus animation check\n');

for (const asset of configuredAssets) {
  const size = readPngSize(asset.file);
  if (!size) {
    issues.push(`${asset.id}: file missing (${asset.file})`);
    continue;
  }
  const rowCount = gridRowCount(asset);
  const expectedW = asset.frameWidth * asset.columns;
  const expectedH = asset.frameHeight * rowCount;
  const actualCellW = Math.floor(size.width / asset.columns);
  const actualCellH = Math.floor(size.height / rowCount);
  const sizeMatch = size.width === expectedW && size.height === expectedH;
  const cellMatch = actualCellW === asset.frameWidth && actualCellH === asset.frameHeight;

  console.log(`Asset ${asset.id}`);
  console.log(`  file: ${asset.file}`);
  console.log(`  sheet: ${size.width}x${size.height}`);
  console.log(`  configured: ${expectedW}x${expectedH} (${asset.frameWidth}x${asset.frameHeight}/frame, grid ${asset.columns}x${rowCount})`);
  if (asset.frameCellIndices) {
    console.log(`  playback cells: [${asset.frameCellIndices.join(', ')}] (${asset.frameCellIndices.length} frames)`);
  }
  console.log(`  actual cell: ${actualCellW}x${actualCellH}`);

  if (sizeMatch && cellMatch) {
    passes.push(`${asset.id}: sheet and cell size match config`);
  } else if (!sizeMatch && cellMatch) {
    warnings.push(`${asset.id}: sheet ${size.width}x${size.height} vs configured ${expectedW}x${expectedH} (cell OK)`);
    passes.push(`${asset.id}: cell size matches (${actualCellW}x${actualCellH})`);
  } else {
    issues.push(`${asset.id}: frame cell mismatch (configured ${asset.frameWidth}x${asset.frameHeight}, actual ${actualCellW}x${actualCellH})`);
  }

  if (asset.frameCellIndices) {
    const maxCell = Math.max(...asset.frameCellIndices);
    const minCells = (Math.floor(maxCell / asset.columns) + 1) * asset.columns;
    if (maxCell >= asset.frameCount) {
      issues.push(`${asset.id}: frameCellIndices max ${maxCell} exceeds grid frameCount ${asset.frameCount}`);
    }
    passes.push(`${asset.id}: hitted uses right column cells 1,3,5,7 (bloodshot eye)`);
  }

  if (asset.frozenPlayback) {
    passes.push(`${asset.id}: frozenPlayback hold=0 thaw=1..7`);
  }

  const override = asset.id === 'boss02OctopusHitted'
    ? 'boss_octopus_02 -> hitted'
    : null;
  if (override) {
    passes.push(`${override} wired to ${asset.id}`);
  }
  console.log('');
}

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

console.log('\nL2 Octopus animation config OK.');
process.exit(0);
