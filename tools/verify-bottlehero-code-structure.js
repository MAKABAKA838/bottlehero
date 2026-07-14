/**
 * Phase 4 code-split acceptance checks.
 * Run from cocos/: node tools/verify-bottlehero-code-structure.js
 */
const fs = require('fs');
const path = require('path');

const scriptsDir = path.join(__dirname, '../assets/scripts/bottlehero');
const mvpPath = path.join(scriptsDir, 'BottleHeroMvp.ts');
const buildIndex = path.join(__dirname, '../build/web-desktop-001/assets/main/index.js');

const requiredModules = [
  'BottleHeroTypes.ts',
  'BottleHeroResourceLoader.ts',
  'BottleHeroRuntimeAssetManifest.ts',
  'BottleHeroStorage.ts',
  'BottleHeroBalanceConfigResolver.ts',
  'BottleHeroTimingMath.ts',
  'BottleHeroTowerMath.ts',
  'BottleHeroBossTimingPlan.ts',
  'BottleHeroBossBattle.ts',
  'BottleHeroAvatarUi.ts',
  'BottleHeroDebugPanel.ts',
  'BottleHeroFeedbackEntry.ts',
  'BottleHeroConfigLoader.ts',
  'BottleHeroAssetProvider.ts',
  'BottleHeroRuntimeAssetStore.ts',
  'BottleHeroBgmController.ts',
  'BottleHeroFeedbackFxPlayer.ts',
  'BottleHeroBuildFlags.ts',
  'BottleHeroUiFactory.ts',
  'BottleHeroBackgroundController.ts',
  'BottleHeroAmbientController.ts',
  'BottleHeroTimingController.ts',
  'BottleHeroPlatform.ts',
  'BottleHeroWorldTowerController.ts',
  'BottleHeroThrowFxController.ts',
];

const controllerChecks = [
  { file: 'BottleHeroBossBattle.ts', symbol: 'BottleHeroBossBattleController', host: 'BossBattleHost' },
  { file: 'BottleHeroAvatarUi.ts', symbol: 'BottleHeroAvatarUiController', host: 'AvatarUiHost' },
  { file: 'BottleHeroDebugPanel.ts', symbol: 'BottleHeroDebugPanelController', host: 'DebugPanelHost' },
  { file: 'BottleHeroBackgroundController.ts', symbol: 'BottleHeroBackgroundController', host: 'BackgroundHost' },
  { file: 'BottleHeroAmbientController.ts', symbol: 'BottleHeroAmbientController', host: 'AmbientHost' },
  { file: 'BottleHeroTimingController.ts', symbol: 'BottleHeroTimingController', host: 'TimingHost' },
  { file: 'BottleHeroWorldTowerController.ts', symbol: 'BottleHeroWorldTowerController', host: 'WorldTowerHost' },
  { file: 'BottleHeroThrowFxController.ts', symbol: 'BottleHeroThrowFxController', host: 'ThrowFxHost' },
];

const mvpHostFactories = [
  'createBossBattleHost',
  'createAvatarUiHost',
  'createDebugPanelHost',
  'createTimingHost',
  'createWorldTowerHost',
  'createThrowFxHost',
];

const mvpControllers = [
  'BottleHeroBossBattleController',
  'BottleHeroAvatarUiController',
  'BottleHeroDebugPanelController',
  'BottleHeroTimingController',
  'BottleHeroWorldTowerController',
  'BottleHeroThrowFxController',
];

const platformSourcePath = path.join(scriptsDir, 'BottleHeroPlatform.ts');

let failed = false;

function fail(message) {
  failed = true;
  console.error(`FAIL ${message}`);
}

function pass(message) {
  console.log(`PASS ${message}`);
}

const moduleFiles = fs.readdirSync(scriptsDir).filter((name) => name.endsWith('.ts'));
if (moduleFiles.length < 24) {
  fail(`expected >= 24 module files, found ${moduleFiles.length}`);
} else {
  pass(`module count ${moduleFiles.length}`);
}

for (const name of requiredModules) {
  if (!fs.existsSync(path.join(scriptsDir, name))) {
    fail(`missing module ${name}`);
  }
}
if (!failed) {
  pass(`required modules (${requiredModules.length})`);
}

const platformSource = fs.readFileSync(platformSourcePath, 'utf8');
for (const symbol of ['unlockBottleHeroAudio', 'ensureBottleHeroLevelPackages', 'getBottleHeroSubpackagePlan', 'detectBottleHeroPlatform']) {
  if (!platformSource.includes(`export function ${symbol}`) && !platformSource.includes(`export async function ${symbol}`)) {
    fail(`BottleHeroPlatform.ts missing ${symbol}`);
  }
}
if (!failed) {
  pass('platform adapter skeleton exports');
}

for (const { file, symbol, host } of controllerChecks) {
  const source = fs.readFileSync(path.join(scriptsDir, file), 'utf8');
  if (!source.includes(`export class ${symbol}`) || !source.includes(`export interface ${host}`)) {
    fail(`${file} missing ${symbol} or ${host}`);
  }
}
if (!failed) {
  pass('controller + host interfaces');
}

const mvpSource = fs.readFileSync(mvpPath, 'utf8');
const mvpLines = mvpSource.split('\n').length;
if (mvpLines > 4200) {
  fail(`BottleHeroMvp.ts too large: ${mvpLines} lines (limit 4200)`);
} else {
  pass(`BottleHeroMvp.ts ${mvpLines} lines (<= 4200)`);
}

for (const factory of mvpHostFactories) {
  if (!mvpSource.includes(`private ${factory}(`)) {
    fail(`Mvp missing ${factory}`);
  }
}
for (const controller of mvpControllers) {
  if (!mvpSource.includes(controller)) {
    fail(`Mvp missing ${controller} usage`);
  }
}
if (!failed) {
  pass('Mvp host factories and controllers wired');
}

if (!mvpSource.includes('unlockBottleHeroAudio')) {
  fail('Mvp must call unlockBottleHeroAudio');
} else {
  pass('Mvp audio unlock wiring');
}

for (const file of moduleFiles) {
  if (file === 'BottleHeroMvp.ts') {
    continue;
  }
  const source = fs.readFileSync(path.join(scriptsDir, file), 'utf8');
  if (/from ['"]\.\/BottleHeroMvp['"]/.test(source)) {
    fail(`reverse import in ${file} -> BottleHeroMvp`);
  }
}
if (!failed) {
  pass('no reverse imports into BottleHeroMvp');
}

const bgControllerSource = fs.readFileSync(path.join(scriptsDir, 'BottleHeroBackgroundController.ts'), 'utf8');
const gameConfigSource = fs.readFileSync(path.join(scriptsDir, 'BottleHeroGameConfig.ts'), 'utf8');
if (/private readonly scene04Height\s*=/.test(bgControllerSource)) {
  fail('BackgroundController must not hardcode scene04Height; use BackgroundHost thresholds');
} else {
  pass('BackgroundController uses per-level scene04 threshold from host');
}
if (!/LEVEL_01_BACKGROUND_PROGRESSION[\s\S]*scene03Height:\s*18[\s\S]*scene04Height:\s*42[\s\S]*scene03MinLoops:\s*2/.test(gameConfigSource)) {
  fail('LEVEL_01_BACKGROUND_PROGRESSION must stay 18/42/2 (earliest L01 background)');
} else {
  pass('LEVEL_01_BACKGROUND_PROGRESSION frozen at 18/42/2');
}
if (!/LEVEL_BACKGROUND_PROGRESSION[\s\S]*level_02:[\s\S]*scene04Height:\s*36/.test(gameConfigSource)) {
  fail('LEVEL_BACKGROUND_PROGRESSION level_02 scene04Height must be 36');
} else {
  pass('LEVEL_BACKGROUND_PROGRESSION level_02 scene04Height=36');
}
if (!/LEVEL_BACKGROUND_PROGRESSION[\s\S]*level_03:[\s\S]*scene04Height:\s*36/.test(gameConfigSource)) {
  fail('LEVEL_BACKGROUND_PROGRESSION level_03 scene04Height must be 36');
} else {
  pass('LEVEL_BACKGROUND_PROGRESSION level_03 scene04Height=36');
}
if (!/pickNextSegmentKind\(\): BackgroundSegmentKind \| null/.test(bgControllerSource)
  || !/usesSingleScene03Loop\(\)\) \{\s*return null/.test(bgControllerSource)) {
  fail('Level 03 must stall background until scene03/scene04 thresholds (no early scene04Loop)');
} else if (!/currentLevelId === 'level_03'/.test(fs.readFileSync(path.join(scriptsDir, 'BottleHeroMvp.ts'), 'utf8'))) {
  fail('Level 03 must enable usesSingleScene03Loop background mode');
} else {
  pass('Level 03 usesSingleScene03Loop wired');
}

if (fs.existsSync(buildIndex)) {
  const bundle = fs.readFileSync(buildIndex, 'utf8');
  const bundleModules = [
    'BottleHeroBossBattle.ts',
    'BottleHeroAvatarUi.ts',
    'BottleHeroDebugPanel.ts',
    'BottleHeroConfigLoader.ts',
    'BottleHeroBuildFlags.ts',
  ];
  for (const mod of bundleModules) {
    if (!bundle.includes(mod)) {
      fail(`build/web-desktop-001 missing chunk ${mod}`);
    }
  }
  if (!failed) {
    pass('web-desktop-001 bundle registers split modules');
  }
} else {
  console.warn('WARN build/web-desktop-001 not found; rebuild Web Desktop in Creator to verify bundle');
}

if (failed) {
  process.exit(1);
}

console.log('Phase 4 code structure OK.');
