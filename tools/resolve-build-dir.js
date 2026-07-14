/**
 * Resolve Cocos Web build output directory.
 * Priority: BOTTLEHERO_BUILD_TARGET env > web-mobile (if present) > web-desktop.
 */
const fs = require('fs');
const path = require('path');

const SUPPORTED_TARGETS = ['web-mobile', 'web-desktop'];

function resolveBuildDir(cocosRoot, options = {}) {
  const buildRoot = path.join(cocosRoot, 'build');
  const explicit = options.target || process.env.BOTTLEHERO_BUILD_TARGET;
  const candidates = [];

  if (explicit) {
    candidates.push(path.join(buildRoot, explicit));
  } else if (fs.existsSync(buildRoot)) {
    for (const name of fs.readdirSync(buildRoot)) {
      if (SUPPORTED_TARGETS.includes(name)) {
        candidates.push(path.join(buildRoot, name));
      }
    }
    candidates.sort((a, b) => {
      const score = (dir) => {
        if (dir.endsWith(`${path.sep}web-mobile`)) return 0;
        if (dir.endsWith(`${path.sep}web-desktop`)) return 1;
        return 2;
      };
      return score(a) - score(b);
    });
  } else {
    candidates.push(path.join(buildRoot, 'web-mobile'), path.join(buildRoot, 'web-desktop'));
  }

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) {
      return dir;
    }
  }
  return null;
}

function resolveBuildDirOrExit(cocosRoot, options = {}) {
  const dir = resolveBuildDir(cocosRoot, options);
  if (!dir) {
    const hint = process.env.BOTTLEHERO_BUILD_TARGET || 'web-mobile / web-desktop';
    console.error(`FAIL Missing build output. Build Web Mobile or Web Desktop in Cocos Creator first.`);
    console.error(`Expected: build/<target>/index.html (tried ${hint}).`);
    console.error('Or set: set BOTTLEHERO_BUILD_TARGET=web-mobile');
    process.exit(1);
  }
  return dir;
}

module.exports = {
  SUPPORTED_TARGETS,
  resolveBuildDir,
  resolveBuildDirOrExit,
};
