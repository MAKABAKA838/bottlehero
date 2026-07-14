/**
 * Validates Phase 3 split config layout under resources/bottlehero/config/.
 * Run from cocos/: node tools/verify-bottlehero-config.js
 */
const fs = require('fs');
const path = require('path');

const configRoot = path.join(__dirname, '../assets/resources/bottlehero/config');

const requiredFiles = [
  'balance/default.json',
  'balance/level_02.json',
  'balance/level_03.json',
  'timing/points.json',
  'timing/items.json',
  'bosses/boss_alien_01.json',
  'bosses/boss_octopus_02.json',
  'bosses/boss_alien_03.json',
  'avatars/avatars.json',
  'avatars/goods.json',
  'levels/level_01.json',
  'levels/level_02.json',
  'levels/level_03.json',
  'rewards/level_01_rewards.json',
  'rewards/level_02_rewards.json',
  'rewards/level_03_rewards.json',
];

const requiredMeta = requiredFiles.map((file) => `${file}.meta`);

function readJson(relativePath) {
  const fullPath = path.join(configRoot, relativePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

let failed = false;

for (const file of requiredFiles) {
  const fullPath = path.join(configRoot, file);
  if (!fs.existsSync(fullPath)) {
    failed = true;
    console.error(`FAIL missing file: ${file}`);
  }
}

for (const meta of requiredMeta) {
  const fullPath = path.join(configRoot, meta);
  if (!fs.existsSync(fullPath)) {
    failed = true;
    console.error(`FAIL missing meta: ${meta}`);
  }
}

if (failed) {
  process.exit(1);
}

const balance = readJson('balance/default.json');
const points = readJson('timing/points.json');
const items = readJson('timing/items.json');
const boss = readJson('bosses/boss_alien_01.json');
const boss02 = readJson('bosses/boss_octopus_02.json');
const boss03 = readJson('bosses/boss_alien_03.json');
const avatars = readJson('avatars/avatars.json');
const goods = readJson('avatars/goods.json');
const level = readJson('levels/level_01.json');
const level02 = readJson('levels/level_02.json');
const level03 = readJson('levels/level_03.json');
const rewards = readJson('rewards/level_01_rewards.json');
const rewards02 = readJson('rewards/level_02_rewards.json');
const rewards03 = readJson('rewards/level_03_rewards.json');

const checks = [
  ['balance.stages', Array.isArray(balance.stages) && balance.stages.length === 5],
  ['balance has no inline items', !balance.items],
  ['balance has no inline boss', !balance.boss],
  ['timing points', Array.isArray(points.timingPointTiers) && points.timingPointTiers.length === 4],
  ['timing items', Array.isArray(items.items) && items.items.length === 7],
  ['boss balance', boss.id === 'boss_alien_01' && boss.balance?.maxHp > 0],
  ['boss 02 balance', boss02.id === 'boss_octopus_02' && boss02.balance?.maxHp > 0],
  ['boss 03 balance', boss03.id === 'boss_alien_03' && boss03.balance?.maxHp > 0],
  ['boss profiles differ', boss.balance.maxHp !== boss02.balance.maxHp && boss02.balance.maxHp !== boss03.balance.maxHp],
  ['boss 02 minions', Array.isArray(boss02.minionSpriteKeys) && boss02.minionSpriteKeys.includes('bossOctopusJellyfishMinion')],
  ['boss 03 solo minion', boss03.balance.maxMinions === 1],
  ['avatars', Array.isArray(avatars.avatars) && avatars.avatars.length === 4],
  ['goods split', Array.isArray(goods.goods) && goods.goods.length === 6],
  ['avatars has no inline goods', !avatars.goods],
  ['level boss ref', level.boss?.id === 'boss_alien_01'],
  ['level 02 id', level02.id === 'level_02'],
  ['level 02 boss ref', level02.boss?.id === 'boss_octopus_02'],
  ['level 02 balance ref', level02.balanceConfig === 'bottlehero/config/balance/level_02'],
  ['level 02 balance file', fs.existsSync(path.join(configRoot, 'balance/level_02.json'))],
  ['rewards goods', Array.isArray(rewards.goods) && rewards.goods.length >= 1],
  ['rewards score', Number.isFinite(rewards.victoryScoreBonus)],
  ['level 02 rewards', rewards02.levelId === 'level_02' && rewards02.bossId === 'boss_octopus_02'],
  ['level 03 id', level03.id === 'level_03'],
  ['level 03 boss ref', level03.boss?.id === 'boss_alien_03'],
  ['level 03 balance ref', level03.balanceConfig === 'bottlehero/config/balance/level_03'],
  ['level 03 balance file', fs.existsSync(path.join(configRoot, 'balance/level_03.json'))],
  ['level 03 rewards', rewards03.levelId === 'level_03' && rewards03.bossId === 'boss_alien_03'],
];

for (const [label, ok] of checks) {
  if (!ok) {
    failed = true;
    console.error(`FAIL shape: ${label}`);
  } else {
    console.log(`PASS ${label}`);
  }
}

const assetRoot = path.join(__dirname, '../assets/resources/bottlehero');
for (const levelFile of ['levels/level_01.json', 'levels/level_02.json', 'levels/level_03.json']) {
  const levelConfig = readJson(levelFile);
  const throwItems = Array.isArray(levelConfig.throwItems) ? levelConfig.throwItems : [];
  const backgrounds = levelConfig.backgrounds || {};
  const backgroundKeys = ['start', 'loop', 'scene03Bridge', 'scene03Loop', 'scene04Bridge', 'scene04Loop'];
  if (backgrounds.loopOnce) {
    backgroundKeys.push('loopOnce');
  }
  for (const key of backgroundKeys) {
    const bgPath = backgrounds[key];
    if (!bgPath) {
      failed = true;
      console.error(`FAIL missing background key ${key} in ${levelFile}`);
      continue;
    }
    if (!fs.existsSync(path.join(assetRoot, bgPath))) {
      failed = true;
      console.error(`FAIL missing background file: ${levelFile} -> ${bgPath}`);
    }
  }
  console.log(`PASS ${levelFile} backgrounds (6) on disk`);
  if (!throwItems.length) {
    continue;
  }
  for (const throwItem of throwItems) {
    const mediaPath = path.join(assetRoot, throwItem);
    if (!fs.existsSync(mediaPath)) {
      failed = true;
      console.error(`FAIL missing throw item: ${levelFile} -> ${throwItem}`);
    }
  }
  console.log(`PASS ${levelFile} throwItems (${throwItems.length}) on disk`);
}

if (failed) {
  process.exit(1);
}

console.log('Phase 3 config layout OK.');
