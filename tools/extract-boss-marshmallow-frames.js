/**
 * 打印 boss03_Marshmallow_idle1 图集尺寸与 2×4 网格单帧大小（美术核对用）。
 * 运行时 idle 与 L1/L2 相同：图集网格切割（见 BottleHeroBossAssets boss03MarshmallowIdle）。
 * Run from cocos/: node tools/extract-boss-marshmallow-frames.js
 */
const fs = require('fs');
const path = require('path');

const sheetPath = path.resolve(
  __dirname,
  '../assets/resources/bottlehero/boss/Marshmallow/Stage_1/boss03_Marshmallow_idle1.png',
);
const cols = 2;
const rows = 4;

if (!fs.existsSync(sheetPath)) {
  console.error('missing sheet:', sheetPath);
  process.exit(1);
}

const buffer = fs.readFileSync(sheetPath);
const width = buffer.readUInt32BE(16);
const height = buffer.readUInt32BE(20);
const cellW = Math.floor(width / cols);
const cellH = Math.floor(height / rows);

console.log(`sheet=${width}x${height}`);
console.log(`grid=${cols}x${rows} cell=${cellW}x${cellH} frames=${cols * rows}`);
console.log('BossAssets idle: frameWidth=%d frameHeight=%d fps=12 columns=%d frameCount=%d', cellW, cellH, cols, cols * rows);
