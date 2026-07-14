/**
 * Boss 图集动画注册校验：对比磁盘上的 Boss sprite sheet 与 BottleHeroBossAssets.ts。
 *
 * 用法（在 cocos 目录）：
 *   node tools/verify-bottlehero-boss-animations.js
 * 退出码：0 = 全部已注册，1 = 存在未接入的新动画或缺失文件
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const assetRoot = path.join(root, 'assets/resources/bottlehero');
const bossAssetsTsPath = path.join(root, 'assets/scripts/bottlehero/BottleHeroBossAssets.ts');

const BOSS_SHEET_PREFIXES = ['boss/atlases/boss01_Alien_', 'boss/Octopus/boss02_Octopus_'];
const BODY_ANIMATION_IDS = new Set(['idle', 'attack', 'hitted', 'dead', 'dizziness', 'frozen']);

function normalizeRel(filePath) {
  return filePath.replace(/\\/g, '/');
}

function walkPngFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkPngFiles(full));
    } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.png') {
      out.push(normalizeRel(path.relative(assetRoot, full)));
    }
  }
  return out;
}

function discoverBossSpriteSheets() {
  return walkPngFiles(assetRoot).filter((rel) => BOSS_SHEET_PREFIXES.some((prefix) => rel.startsWith(prefix)));
}

function readRegisteredBossSheets() {
  const source = fs.readFileSync(bossAssetsTsPath, 'utf8');
  return [...source.matchAll(/file:\s*'([^']+)'/g)].map((match) => match[1]);
}

function readBossAnimationOverrides(bossId) {
  const source = fs.readFileSync(bossAssetsTsPath, 'utf8');
  const block = source.match(new RegExp(`${bossId}:\\s*\\{[\\s\\S]*?\\n\\s*\\},`));
  if (!block) {
    return new Map();
  }
  const overrides = new Map();
  for (const match of block[0].matchAll(/(\w+):\s*'(boss02[^']+)'/g)) {
    overrides.set(match[1], match[2]);
  }
  return overrides;
}

function parseBoss02AnimationId(relPath) {
  const base = path.basename(relPath, '.png');
  const match = base.match(/^boss02_Octopus_(.+)$/);
  if (!match) {
    return null;
  }
  const suffix = match[1];
  if (suffix.includes('fx')) {
    return null;
  }
  return BODY_ANIMATION_IDS.has(suffix) ? suffix : null;
}

function main() {
  const errors = [];
  const warnings = [];
  const discovered = discoverBossSpriteSheets().sort();
  const registered = new Set(readRegisteredBossSheets());
  const octopusOverrides = readBossAnimationOverrides('boss_octopus_02');

  const unregistered = discovered.filter((rel) => !registered.has(rel));
  const missing = [...registered].filter((rel) => rel.startsWith('boss/atlases/') || rel.startsWith('boss/Octopus/')).filter((rel) => !fs.existsSync(path.join(assetRoot, rel)));

  console.log('Bottlehero boss animation verification');
  console.log('discovered sprite sheets:', discovered.length);
  console.log('registered sprite sheets:', registered.size);
  console.log('');

  if (discovered.length) {
    console.log('On disk:');
    for (const rel of discovered) {
      const mark = registered.has(rel) ? 'OK' : '!!';
      console.log(`  ${mark} ${rel}`);
    }
  }

  for (const rel of unregistered) {
    errors.push(`unregistered boss sprite sheet: ${rel} (add to BottleHeroBossAssets.ts)`);
  }

  for (const rel of missing) {
    errors.push(`registered boss sprite sheet missing on disk: ${rel}`);
  }

  for (const rel of discovered.filter((item) => item.startsWith('boss/Octopus/boss02_Octopus_'))) {
    const animationId = parseBoss02AnimationId(rel);
    if (!animationId || !BODY_ANIMATION_IDS.has(animationId)) {
      continue;
    }
    const registeredAsset = [...registered].find((item) => item === rel);
    if (!registeredAsset) {
      continue;
    }
    if (!octopusOverrides.has(animationId)) {
      warnings.push(`boss_octopus_02 uses Alien fallback for '${animationId}' (${rel})`);
    }
  }

  if (warnings.length) {
    console.log('\nWarnings:');
    for (const warning of warnings) {
      console.log('  -', warning);
    }
  }

  if (errors.length) {
    console.log('\nFAIL (' + errors.length + '):');
    for (const error of errors) {
      console.log('  -', error);
    }
    process.exit(1);
  }

  console.log('\nPASS: all boss sprite sheets are registered in BottleHeroBossAssets.ts');
  process.exit(0);
}

main();
