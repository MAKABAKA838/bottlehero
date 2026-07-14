/**
 * Ensures BottleHeroMvp create*Host() factories wire every method on their Host interfaces.
 * Run from cocos/: node tools/verify-bottlehero-host-wiring.js
 */
const fs = require('fs');
const path = require('path');

const scriptsDir = path.join(__dirname, '../assets/scripts/bottlehero');
const mvpPath = path.join(scriptsDir, 'BottleHeroMvp.ts');
const mvpSource = fs.readFileSync(mvpPath, 'utf8');

const hostPairs = [
  { file: 'BottleHeroBossBattle.ts', interfaceName: 'BossBattleHost', factoryName: 'createBossBattleHost' },
  { file: 'BottleHeroAvatarUi.ts', interfaceName: 'AvatarUiHost', factoryName: 'createAvatarUiHost' },
  { file: 'BottleHeroDebugPanel.ts', interfaceName: 'DebugPanelHost', factoryName: 'createDebugPanelHost' },
  { file: 'BottleHeroBackgroundController.ts', interfaceName: 'BackgroundHost', factoryName: 'createBackgroundHost' },
];

function extractInterfaceMethods(content, interfaceName) {
  const re = new RegExp(`export interface ${interfaceName}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const match = content.match(re);
  if (!match) {
    throw new Error(`Interface ${interfaceName} not found`);
  }
  const methods = [];
  for (const line of match[1].split('\n')) {
    const methodMatch = line.match(/^\s*(\w+)\s*\(/);
    if (methodMatch) {
      methods.push(methodMatch[1]);
    }
  }
  return methods;
}

function extractFactoryKeys(source, factoryName) {
  const re = new RegExp(`private ${factoryName}\\(\\)[^{]*\\{[\\s\\S]*?return \\{([\\s\\S]*?)\\n    \\};`, 'm');
  const match = source.match(re);
  if (!match) {
    throw new Error(`Factory ${factoryName} not found in BottleHeroMvp.ts`);
  }
  const keys = [];
  for (const line of match[1].split('\n')) {
    const keyMatch = line.match(/^\s*(\w+)\s*:/);
    if (keyMatch) {
      keys.push(keyMatch[1]);
    }
  }
  return keys;
}

let failed = false;

for (const { file, interfaceName, factoryName } of hostPairs) {
  const interfaceSource = fs.readFileSync(path.join(scriptsDir, file), 'utf8');
  const required = extractInterfaceMethods(interfaceSource, interfaceName);
  const wired = extractFactoryKeys(mvpSource, factoryName);
  const missing = required.filter((name) => !wired.includes(name));
  const extra = wired.filter((name) => !required.includes(name));

  if (missing.length) {
    failed = true;
    console.error(`FAIL ${factoryName} -> ${interfaceName}: missing ${missing.join(', ')}`);
  } else {
    console.log(`PASS ${factoryName}: ${required.length} methods wired`);
  }
  if (extra.length) {
    console.warn(`WARN ${factoryName}: extra keys not on interface: ${extra.join(', ')}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log('All host wiring checks passed.');
