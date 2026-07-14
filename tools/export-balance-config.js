/**
 * 将内置 balance 默认值导出到 Cocos resources 与 Web balance-configs。
 * 修改 BottleHeroBalance.ts 中 defaultBottleHeroBalance 后，应同步更新此对象并重新运行本脚本。
 */
const fs = require('fs');
const path = require('path');

const defaultBalance = {
  stages: [
    { id: 'newbie', labelZh: '新手轮', labelEn: 'Newbie', durationSeconds: 60, handleSpeed: 2.25, handleVariance: 0, targetCountMin: 1, targetCountMax: 1, rewardPenaltyBias: -100, trackMode: 'line', missStabilityPenalty: 8, bombStabilityPenalty: 0, dynamicAssistEnabled: false, dynamicPressureEnabled: false },
    { id: 'familiar', labelZh: '熟悉轮', labelEn: 'Familiar', durationSeconds: 60, handleSpeed: 2.55, handleVariance: 0.08, targetCountMin: 1, targetCountMax: 2, rewardPenaltyBias: -65, trackMode: 'circle', missStabilityPenalty: 10, bombStabilityPenalty: 10, dynamicAssistEnabled: true, dynamicPressureEnabled: false },
    { id: 'skilled', labelZh: '上手轮', labelEn: 'Skilled', durationSeconds: 60, handleSpeed: 3.05, handleVariance: 0.22, targetCountMin: 2, targetCountMax: 3, rewardPenaltyBias: -45, trackMode: 'randomBasic', missStabilityPenalty: 12, bombStabilityPenalty: 16, dynamicAssistEnabled: true, dynamicPressureEnabled: true },
    { id: 'challenge', labelZh: '挑战轮', labelEn: 'Challenge', durationSeconds: 120, handleSpeed: 3.65, handleVariance: 0.44, targetCountMin: 2, targetCountMax: 3, rewardPenaltyBias: 0, trackMode: 'random', missStabilityPenalty: 14, bombStabilityPenalty: 22, dynamicAssistEnabled: true, dynamicPressureEnabled: true },
    { id: 'hard', labelZh: '困难轮', labelEn: 'Hard', durationSeconds: 99999, handleSpeed: 3, handleVariance: 0.72, targetCountMin: 2, targetCountMax: 3, rewardPenaltyBias: 40, trackMode: 'random', missStabilityPenalty: 16, bombStabilityPenalty: 28, dynamicAssistEnabled: true, dynamicPressureEnabled: true },
  ],
  items: [
    { id: 'star', category: 'normal', effect: 'normalHit', spriteKey: 'timingPoint', baseWeight: 1, stageUnlock: 'newbie', maxPerRound: 1, oneTimePerRun: false, enabled: true, debugLabelZh: '普通点', debugLabelEn: 'Timing Point' },
    { id: 'food', category: 'reward', effect: 'foodBoost', spriteKey: 'timingItemFood', baseWeight: 0.3, stageUnlock: 'familiar', maxPerRound: 1, oneTimePerRun: false, enabled: true, debugLabelZh: 'RPT', debugLabelEn: 'RPT' },
    { id: 'stability', category: 'reward', effect: 'recoverStability', spriteKey: 'timingItemStability', baseWeight: 1.25, stageUnlock: 'familiar', maxPerRound: 1, oneTimePerRun: false, enabled: true, debugLabelZh: '恢复稳定', debugLabelEn: 'Stability' },
    { id: 'multiply', category: 'reward', effect: 'multiplyThrow', spriteKey: 'timingItemMultiply', baseWeight: 0.9, stageUnlock: 'skilled', maxPerRound: 1, oneTimePerRun: false, enabled: true, debugLabelZh: '多抛投', debugLabelEn: 'Multiply' },
    { id: 'bomb', category: 'penalty', effect: 'bombDrop', spriteKey: 'timingItemBomb', baseWeight: 1, stageUnlock: 'challenge', maxPerRound: 1, oneTimePerRun: false, enabled: true, debugLabelZh: 'Bomb', debugLabelEn: 'Bomb' },
    { id: 'comboAttack', category: 'special', effect: 'comboAttackSkill', spriteKey: 'timingItemComboAttack', baseWeight: 0.48, stageUnlock: 'challenge', maxPerRound: 1, oneTimePerRun: false, enabled: true, debugLabelZh: '连击技能', debugLabelEn: 'Combo Skill' },
    { id: 'frozenSkill', category: 'special', effect: 'frozenSkill', spriteKey: 'timingItemFrozenSkill', baseWeight: 0.34, stageUnlock: 'challenge', maxPerRound: 1, oneTimePerRun: false, enabled: true, debugLabelZh: '冰冻技能', debugLabelEn: 'Frozen Skill' },
  ],
  timingPointTiers: [
    { id: 'normal', labelZh: '普通点', labelEn: 'Normal', spriteKey: 'timingPointNormal', score: 100, baseWeight: 1, stageUnlock: 'newbie', enabled: true },
    { id: 'good', labelZh: '好的点', labelEn: 'Good', spriteKey: 'timingPointGood', score: 150, baseWeight: 0.62, stageUnlock: 'familiar', enabled: true },
    { id: 'rare', labelZh: '稀有点', labelEn: 'Rare', spriteKey: 'timingPointRare', score: 260, baseWeight: 0.28, stageUnlock: 'skilled', enabled: true },
    { id: 'treasure', labelZh: '宝贝点', labelEn: 'Treasure', spriteKey: 'timingPointTreasure', score: 500, baseWeight: 0.12, stageUnlock: 'challenge', enabled: true },
  ],
  stability: {
    initialStability: 100, stabilityRecoverAmount: 18, bombDropMin: 1, bombDropMax: 3, foodHandleScale: 3,
    foodDurationMin: 3, foodDurationMax: 8, bottleStepY: 118, towerSwayScale: 1, multiplyThrowMin: 2, multiplyThrowMax: 6,
    perfectRadiusScale: 1, goodRadiusScale: 1, circleTrackRadius: 196,
  },
  dynamic: {
    enabled: true, windowSize: 10, assistMissRate: 0.45, assistStabilityBelow: 35,
    pressureMissRateBelow: 0.12, pressureStabilityAbove: 78, maxAssist: 35, maxPressure: 28,
  },
  combo: {
    perfectBaseScore: 100, perfectMultiplierCap: 10, goodScore: 50, goodStabilityPenalty: 2,
  },
  boss: {
    enabled: true, triggerScore: 55000, maxHp: 2600, warningSeconds: 2.6,
    normalAttackDamage: 42, goodAttackDamage: 72, rareAttackDamage: 125, treasureAttackDamage: 210,
    comboSkillDurationMin: 3, comboSkillDurationMax: 8, frozenSkillDurationMin: 3, frozenSkillDurationMax: 6,
    bossAttackInterval: 2.7, minionSpawnInterval: 5.6, bulletStabilityDamage: 3,
  },
  timingBarAnchorMode: 'sceneCenter',
};

const root = path.resolve(__dirname, '..');
const targets = [
  path.join(root, 'assets/resources/bottlehero/config/balance/default.json'),
  path.join(root, 'build-templates/web-desktop/balance-configs/default.json'),
];

for (const target of targets) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(defaultBalance, null, 2)}\n`);
  console.log(`wrote ${target}`);
}
