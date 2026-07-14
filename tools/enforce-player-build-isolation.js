/**
 * Phase 5 deployment isolation guard.
 * Removes internal tool pages from player build output.
 *
 * Usage:
 *   node tools/enforce-player-build-isolation.js
 *   node tools/enforce-player-build-isolation.js --check
 */
const fs = require('fs');
const path = require('path');
const { resolveBuildDirOrExit } = require('./resolve-build-dir');

const buildDir = resolveBuildDirOrExit(path.join(__dirname, '..'));
console.log(`Using build output: ${buildDir}`);
const internalPages = [
  'balance-editor.html',
  'feedback-admin.html',
];

const checkOnly = process.argv.includes('--check');

if (!fs.existsSync(buildDir)) {
  console.error(`FAIL build output not found: ${buildDir}`);
  process.exit(1);
}

let failed = false;

for (const page of internalPages) {
  const pagePath = path.join(buildDir, page);
  const exists = fs.existsSync(pagePath);
  if (checkOnly) {
    if (exists) {
      failed = true;
      console.error(`FAIL player build still exposes ${page}`);
    } else {
      console.log(`PASS ${page} not present`);
    }
    continue;
  }

  if (exists) {
    fs.unlinkSync(pagePath);
    console.log(`REMOVED ${page}`);
  } else {
    console.log(`SKIP ${page} (already absent)`);
  }
}

if (!checkOnly) {
  // Re-run a quick check after deletion.
  for (const page of internalPages) {
    const pagePath = path.join(buildDir, page);
    if (fs.existsSync(pagePath)) {
      failed = true;
      console.error(`FAIL failed to remove ${page}`);
    } else {
      console.log(`PASS ${page} not present`);
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log('Phase 5 player build isolation OK.');
