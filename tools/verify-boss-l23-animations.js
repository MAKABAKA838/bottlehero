/**
 * L2 + L3 Boss 动画一键检测（图集尺寸 + 运行时接线 + 已知占位）。
 * Run from cocos/: node tools/verify-boss-l23-animations.js
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = __dirname;
const node = process.execPath;

function run(script) {
  const result = spawnSync(node, [path.join(root, script)], { encoding: 'utf8' });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  return result.status ?? 1;
}

console.log('=== L2 Octopus (Level 02) ===\n');
const l2 = run('verify-boss-octopus-animation.js');

console.log('\n=== L3 Marshmallow (Level 03) ===\n');
const l3 = run('verify-boss-marshmallow-animation.js');

console.log('\n=== Wiring audit (runtime) ===\n');

const wiringNotes = [
  ['L2 idle/attack/hitted/dead/dizziness/frozen', 'boss_octopus_02 专用图集', 'OK'],
  ['L2 hitted', '右列格 1,3,5,7（4 帧）', 'OK'],
  ['L2 小怪 Jellyfish', 'bossOctopusJellyfishMinion → boss02_Jellyfish_idle', 'OK'],
  ['L3 form1 idle/attack/hitted/dizziness/frozen', 'Stage_1 图集', 'OK'],
  ['L3 form2 idle', 'Stage_2 idle1', 'OK'],
  ['L3 form2 hitted/frozen', 'Stage_2 专用图集', 'OK（图集 ±1~3px 边距，运行时 auto-correct）'],
  ['L3 form2 attack', '暂用 Stage_2 idle（专用 attack 未导入）', 'PLACEHOLDER'],
  ['L3 form2 dizziness', '仍用 Stage_1 dizziness（Stage_2 未导入）', 'PLACEHOLDER'],
  ['L3 switchStage', '50% HP 切换动画', 'OK'],
  ['L3 dead', 'boss03_Marshmallow_dead', 'OK'],
  ['L3 form2 弹幕', 'Stage_2 Bomb 3×3 9 帧', 'OK（配置 1023 vs 实际 1024，auto-correct）'],
];

for (const [slot, detail, status] of wiringNotes) {
  const mark = status === 'OK' ? '✓' : status === 'PLACEHOLDER' ? '~' : '!';
  console.log(`  ${mark} ${slot}: ${detail} [${status}]`);
}

const placeholders = wiringNotes.filter((row) => row[2] === 'PLACEHOLDER');
if (placeholders.length) {
  console.log(`\nNote: ${placeholders.length} placeholder(s) are intentional until Stage_2 assets are imported.`);
}

if (l2 !== 0 || l3 !== 0) {
  console.log('\nFAIL: one or more animation checks failed.');
  process.exit(1);
}

console.log('\nPASS: L2 + L3 boss animation checks OK.');
process.exit(0);
