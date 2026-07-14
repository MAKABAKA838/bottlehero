const fs = require('fs');
const path = require('path');
const { resolveBuildDirOrExit } = require('./resolve-build-dir');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'build-templates/web-desktop');
const dst = resolveBuildDirOrExit(root);
const feedbackAssetsSrc = path.join(root, 'assets/resources/bottlehero/feedback-assets');
const dirs = ['ambient', 'audio', 'avatar', 'backgrounds', 'boss', 'gameplay', 'player', 'timing', 'ui'];

console.log(`Using build output: ${dst}`);

for (const dir of dirs) {
  const from = path.join(src, dir);
  if (!fs.existsSync(from)) {
    console.warn(`skip missing template dir: ${dir}`);
    continue;
  }
  fs.cpSync(from, path.join(dst, dir), { recursive: true });
  console.log(`synced ${dir}`);
}

if (fs.existsSync(feedbackAssetsSrc)) {
  fs.cpSync(feedbackAssetsSrc, path.join(dst, 'feedback-assets'), { recursive: true });
  console.log('synced feedback-assets');
} else {
  console.warn('skip missing feedback-assets source in Cocos resources');
}

console.log(`Web runtime assets synced to ${dst}`);
