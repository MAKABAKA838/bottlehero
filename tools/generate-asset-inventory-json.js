/**
 * 从磁盘扫描生成机器可读资产清单（阶段 2）。
 * 输出：docs/assets/asset-inventory.generated.json
 */
const fs = require('fs');
const path = require('path');

const cocosRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(cocosRoot, '..');
const assetRoot = path.join(cocosRoot, 'assets/resources/bottlehero');
const manifestPath = path.join(cocosRoot, 'assets/scripts/bottlehero/BottleHeroRuntimeAssetManifest.ts');
const outFile = path.join(projectRoot, 'docs/assets/asset-inventory.generated.json');
const mediaExt = new Set(['.png', '.jpg', '.jpeg', '.mp3', '.m4a']);

const legacyPaths = [
  'backgrounds/level_01.png',
  'backgrounds/level_01_new.png',
  'backgrounds/loop_01.png',
  'backgrounds/title.png',
  'ui/button_normal.png',
  'ui/button_pressed.png',
  'ui/timing_bar.png',
  'ui/timing_handle.png',
  'ui/timing_point.png',
  'ui/combo_bar.png',
  'player/arm_r.png',
  'npc/cat_npc.png',
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

function parseRuntimeSpriteManifest() {
  if (!fs.existsSync(manifestPath)) {
    return [];
  }
  const source = fs.readFileSync(manifestPath, 'utf8');
  const entries = [];
  const re = /\['([^']+)',\s*'[^']*',\s*'([^']+)'\]/g;
  let match = re.exec(source);
  while (match) {
    entries.push({ spriteKey: match[1], webPath: match[2] });
    match = re.exec(source);
  }
  return entries;
}

function main() {
  const files = walkFiles(assetRoot)
    .filter((f) => mediaExt.has(path.extname(f).toLowerCase()))
    .map((f) => {
      const rel = path.relative(assetRoot, f).replace(/\\/g, '/');
      const stat = fs.statSync(f);
      return {
        path: rel,
        webPath: rel,
        resourcesPath: `bottlehero/${rel.replace(/\.[^/.]+$/, '')}`,
        bytes: stat.size,
        hasMeta: fs.existsSync(`${f}.meta`),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  const byTop = {};
  const bySubdirectory = {};
  for (const file of files) {
    const parts = file.path.split('/');
    const top = parts[0] === 'gameplay' ? 'gameplay' : parts[0];
    byTop[top] = (byTop[top] || 0) + 1;
    const sub = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
    bySubdirectory[sub] = (bySubdirectory[sub] || 0) + 1;
  }

  const runtimeSprites = parseRuntimeSpriteManifest();
  const runtimeSpriteAudit = runtimeSprites.map((entry) => ({
    ...entry,
    exists: fs.existsSync(path.join(assetRoot, entry.webPath)),
    bytes: fs.existsSync(path.join(assetRoot, entry.webPath))
      ? fs.statSync(path.join(assetRoot, entry.webPath)).size
      : 0,
  }));
  const missingRuntimeSprites = runtimeSpriteAudit.filter((entry) => !entry.exists);

  const legacyAudit = legacyPaths.map((rel) => ({
    path: rel,
    exists: fs.existsSync(path.join(assetRoot, rel)),
    bytes: fs.existsSync(path.join(assetRoot, rel))
      ? fs.statSync(path.join(assetRoot, rel)).size
      : 0,
  }));

  const payload = {
    generatedAt: new Date().toISOString().slice(0, 10),
    sourceRoot: 'cocos/assets/resources/bottlehero',
    totalMediaFiles: files.length,
    byTopLevelDirectory: byTop,
    bySubdirectory,
    runtimeSpriteManifest: {
      source: 'cocos/assets/scripts/bottlehero/BottleHeroRuntimeAssetManifest.ts',
      entryCount: runtimeSpriteAudit.length,
      missingOnDisk: missingRuntimeSprites,
      entries: runtimeSpriteAudit,
    },
    legacyCandidates: legacyAudit,
    files,
  };

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${files.length} media entries to ${outFile}`);
  if (missingRuntimeSprites.length) {
    console.warn(`WARN ${missingRuntimeSprites.length} runtime manifest paths missing on disk`);
    for (const entry of missingRuntimeSprites) {
      console.warn(`  - ${entry.spriteKey}: ${entry.webPath}`);
    }
  }
}

main();
