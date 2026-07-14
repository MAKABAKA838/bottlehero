export type TimingTargetKind = 'star' | 'stability' | 'multiply' | 'bomb' | 'food' | 'comboAttack' | 'frozenSkill';
export type BalanceStageId = 'newbie' | 'familiar' | 'skilled' | 'challenge' | 'hard';
export type TimingTrackMode = 'line' | 'circle' | 'triangle' | 'path' | 'star' | 'infinity' | 'randomBasic' | 'randomCore' | 'random';
export type TimingBarAnchorMode = 'followTower' | 'sceneCenter';
export type TimingPointTierId = 'normal' | 'good' | 'rare' | 'treasure';
export type TimingItemCategory = 'normal' | 'reward' | 'penalty' | 'utility' | 'special';
export type TimingItemEffectId = 'normalHit' | 'recoverStability' | 'multiplyThrow' | 'bombDrop' | 'foodBoost' | 'comboAttackSkill' | 'frozenSkill';
export type BalanceHitKind = 'perfect' | 'good' | 'miss' | 'bomb';

export interface ScoreTitleBand {
  minScore: number;
  key: string;
  zhLabel: string;
  enLabel: string;
}

export interface BalanceStageConfig {
  id: BalanceStageId;
  labelZh: string;
  labelEn: string;
  durationSeconds: number;
  handleSpeed: number;
  handleVariance: number;
  targetCountMin: number;
  targetCountMax: number;
  rewardPenaltyBias: number;
  trackMode: TimingTrackMode;
  missStabilityPenalty: number;
  bombStabilityPenalty: number;
  dynamicAssistEnabled: boolean;
  dynamicPressureEnabled: boolean;
}

export interface TimingItemDefinition {
  id: TimingTargetKind;
  category: TimingItemCategory;
  effect: TimingItemEffectId;
  spriteKey: string;
  baseWeight: number;
  stageUnlock: BalanceStageId;
  maxPerRound: number;
  oneTimePerRun: boolean;
  enabled: boolean;
  debugLabelZh: string;
  debugLabelEn: string;
}

export interface TimingPointTierConfig {
  id: TimingPointTierId;
  labelZh: string;
  labelEn: string;
  spriteKey: string;
  score: number;
  baseWeight: number;
  stageUnlock: BalanceStageId;
  enabled: boolean;
}

export interface StabilityBalanceConfig {
  initialStability: number;
  stabilityRecoverAmount: number;
  bombDropMin: number;
  bombDropMax: number;
  foodHandleScale: number;
  foodDurationMin: number;
  foodDurationMax: number;
  bottleStepY: number;
  towerSwayScale: number;
  multiplyThrowMin: number;
  multiplyThrowMax: number;
  perfectRadiusScale: number;
  goodRadiusScale: number;
  circleTrackRadius: number;
}

export interface DynamicBalanceConfig {
  enabled: boolean;
  windowSize: number;
  assistMissRate: number;
  assistStabilityBelow: number;
  pressureMissRateBelow: number;
  pressureStabilityAbove: number;
  maxAssist: number;
  maxPressure: number;
}

export interface ComboBalanceConfig {
  perfectBaseScore: number;
  perfectMultiplierCap: number;
  goodScore: number;
  goodStabilityPenalty: number;
}

export interface BossBalanceConfig {
  enabled: boolean;
  triggerScore: number;
  maxHp: number;
  warningSeconds: number;
  normalAttackDamage: number;
  goodAttackDamage: number;
  rareAttackDamage: number;
  treasureAttackDamage: number;
  comboSkillDurationMin: number;
  comboSkillDurationMax: number;
  frozenSkillDurationMin: number;
  frozenSkillDurationMax: number;
  bossAttackInterval: number;
  minionSpawnInterval: number;
  bulletStabilityDamage: number;
  /** 场上小兵上限，默认 2 */
  maxMinions?: number;
  /** 单个小兵 HP，默认 160 */
  minionHp?: number;
  /** Boss 显示缩放，默认 2 */
  displayScale?: number;
  /** 小怪解锁 HP 比例（剩余血量 ≤ 该值时开始出小怪；未配置则开局即可出） */
  minionUnlockHpRatio?: number;
}

export interface BottleHeroBalanceConfig {
  stages: BalanceStageConfig[];
  items: TimingItemDefinition[];
  timingPointTiers: TimingPointTierConfig[];
  stability: StabilityBalanceConfig;
  dynamic: DynamicBalanceConfig;
  combo: ComboBalanceConfig;
  boss: BossBalanceConfig;
  timingBarAnchorMode: TimingBarAnchorMode;
}

export interface RecentThrowStats {
  total: number;
  perfect: number;
  good: number;
  miss: number;
  bomb: number;
  missRate: number;
  bombRate: number;
  perfectRate: number;
  goodRate: number;
}

export interface DynamicDifficultyState {
  assist: number;
  pressure: number;
  reasonZh: string;
  reasonEn: string;
}

export interface ActiveStageState {
  stage: BalanceStageConfig;
  stageIndex: number;
  elapsedInStage: number;
  dynamic: DynamicDifficultyState;
  actualRewardPenaltyBias: number;
  actualHandleSpeed: number;
  actualHandleVariance: number;
  stats: RecentThrowStats;
}

export interface TimingTargetPlan {
  kinds: TimingTargetKind[];
  targetCount: number;
  rewardCount: number;
  penaltyCount: number;
  stageId: BalanceStageId;
  rewardPenaltyBias: number;
}

export const SCORE_TITLE_BANDS: ScoreTitleBand[] = [
  { minScore: 0, key: 'baby', zhLabel: '婴儿', enLabel: 'Baby' },
  { minScore: 1500, key: 'kindergarten', zhLabel: '幼儿园', enLabel: 'Kindergarten' },
  { minScore: 5000, key: 'primary', zhLabel: '小学生', enLabel: 'Primary Student' },
  { minScore: 12000, key: 'middle', zhLabel: '中学生', enLabel: 'Middle School Student' },
  { minScore: 26000, key: 'college', zhLabel: '大学生', enLabel: 'College Student' },
  { minScore: 52000, key: 'doctor', zhLabel: '博士', enLabel: 'Doctor' },
  { minScore: 90000, key: 'professor', zhLabel: '教授', enLabel: 'Professor' },
  { minScore: 140000, key: 'principal', zhLabel: '校长', enLabel: 'Principal' },
];

export const stageOrder: BalanceStageId[] = ['newbie', 'familiar', 'skilled', 'challenge', 'hard'];

export const defaultBottleHeroBalance: BottleHeroBalanceConfig = {
  stages: [
    {
      id: 'newbie',
      labelZh: '新手轮',
      labelEn: 'Newbie',
      durationSeconds: 60,
      handleSpeed: 2.25,
      handleVariance: 0,
      targetCountMin: 1,
      targetCountMax: 1,
      rewardPenaltyBias: -100,
      trackMode: 'line',
      missStabilityPenalty: 8,
      bombStabilityPenalty: 0,
      dynamicAssistEnabled: false,
      dynamicPressureEnabled: false,
    },
    {
      id: 'familiar',
      labelZh: '熟悉轮',
      labelEn: 'Familiar',
      durationSeconds: 60,
      handleSpeed: 2.55,
      handleVariance: 0.08,
      targetCountMin: 1,
      targetCountMax: 2,
      rewardPenaltyBias: -65,
      trackMode: 'circle',
      missStabilityPenalty: 10,
      bombStabilityPenalty: 10,
      dynamicAssistEnabled: true,
      dynamicPressureEnabled: false,
    },
    {
      id: 'skilled',
      labelZh: '上手轮',
      labelEn: 'Skilled',
      durationSeconds: 60,
      handleSpeed: 3.05,
      handleVariance: 0.22,
      targetCountMin: 2,
      targetCountMax: 3,
      rewardPenaltyBias: -45,
      trackMode: 'randomBasic',
      missStabilityPenalty: 12,
      bombStabilityPenalty: 16,
      dynamicAssistEnabled: true,
      dynamicPressureEnabled: true,
    },
    {
      id: 'challenge',
      labelZh: '挑战轮',
      labelEn: 'Challenge',
      durationSeconds: 120,
      handleSpeed: 3.65,
      handleVariance: 0.44,
      targetCountMin: 2,
      targetCountMax: 3,
      rewardPenaltyBias: 0,
      trackMode: 'random',
      missStabilityPenalty: 14,
      bombStabilityPenalty: 22,
      dynamicAssistEnabled: true,
      dynamicPressureEnabled: true,
    },
    {
      id: 'hard',
      labelZh: '困难轮',
      labelEn: 'Hard',
      durationSeconds: 99999,
      handleSpeed: 3,
      handleVariance: 0.72,
      targetCountMin: 2,
      targetCountMax: 3,
      rewardPenaltyBias: 40,
      trackMode: 'random',
      missStabilityPenalty: 16,
      bombStabilityPenalty: 28,
      dynamicAssistEnabled: true,
      dynamicPressureEnabled: true,
    },
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
    initialStability: 100,
    stabilityRecoverAmount: 18,
    bombDropMin: 1,
    bombDropMax: 3,
    foodHandleScale: 3,
    foodDurationMin: 3,
    foodDurationMax: 8,
    bottleStepY: 118,
    towerSwayScale: 1,
    multiplyThrowMin: 2,
    multiplyThrowMax: 6,
    perfectRadiusScale: 1,
    goodRadiusScale: 1,
    circleTrackRadius: 196,
  },
  dynamic: {
    enabled: true,
    windowSize: 10,
    assistMissRate: 0.45,
    assistStabilityBelow: 35,
    pressureMissRateBelow: 0.12,
    pressureStabilityAbove: 78,
    maxAssist: 35,
    maxPressure: 28,
  },
  combo: {
    perfectBaseScore: 100,
    perfectMultiplierCap: 10,
    goodScore: 50,
    goodStabilityPenalty: 2,
  },
  boss: {
    enabled: true,
    triggerScore: 55000,
    maxHp: 2600,
    warningSeconds: 2.6,
    normalAttackDamage: 42,
    goodAttackDamage: 72,
    rareAttackDamage: 125,
    treasureAttackDamage: 210,
    comboSkillDurationMin: 3,
    comboSkillDurationMax: 8,
    frozenSkillDurationMin: 3,
    frozenSkillDurationMax: 6,
    bossAttackInterval: 2.7,
    minionSpawnInterval: 5.6,
    bulletStabilityDamage: 3,
    maxMinions: 2,
    minionHp: 160,
    displayScale: 2,
  },
  timingBarAnchorMode: 'sceneCenter',
};

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

export function getScoreTitle(score: number): { index: number; band: ScoreTitleBand } {
  let index = 0;
  const safeScore = Number.isFinite(score) ? score : 0;
  for (let i = 0; i < SCORE_TITLE_BANDS.length; i++) {
    if (safeScore >= SCORE_TITLE_BANDS[i].minScore) {
      index = i;
    }
  }
  return {
    index,
    band: SCORE_TITLE_BANDS[index],
  };
}

export function getStageOrderIndex(stageId: BalanceStageId): number {
  return Math.max(0, stageOrder.indexOf(stageId));
}

function clampBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function clampStageConfig(input: Partial<BalanceStageConfig> | undefined, fallback: BalanceStageConfig): BalanceStageConfig {
  const targetMin = Math.floor(clampNumber(Number(input?.targetCountMin ?? fallback.targetCountMin), 1, 3));
  const targetMax = Math.floor(clampNumber(Number(input?.targetCountMax ?? fallback.targetCountMax), targetMin, 3));
  const validTrackModes: TimingTrackMode[] = ['line', 'circle', 'triangle', 'path', 'star', 'infinity', 'randomBasic', 'randomCore', 'random'];
  const trackMode = validTrackModes.indexOf(input?.trackMode as TimingTrackMode) >= 0 ? input?.trackMode as TimingTrackMode : fallback.trackMode;
  return {
    ...fallback,
    durationSeconds: clampNumber(Number(input?.durationSeconds ?? fallback.durationSeconds), 15, 99999),
    handleSpeed: clampNumber(Number(input?.handleSpeed ?? fallback.handleSpeed), 0.5, 12),
    handleVariance: clampNumber(Number(input?.handleVariance ?? fallback.handleVariance), 0, 1),
    targetCountMin: targetMin,
    targetCountMax: targetMax,
    rewardPenaltyBias: clampNumber(Number(input?.rewardPenaltyBias ?? fallback.rewardPenaltyBias), -100, 100),
    trackMode,
    missStabilityPenalty: clampNumber(Number(input?.missStabilityPenalty ?? fallback.missStabilityPenalty), 0, 60),
    bombStabilityPenalty: clampNumber(Number(input?.bombStabilityPenalty ?? fallback.bombStabilityPenalty), 0, 100),
    dynamicAssistEnabled: clampBoolean(input?.dynamicAssistEnabled, fallback.dynamicAssistEnabled),
    dynamicPressureEnabled: clampBoolean(input?.dynamicPressureEnabled, fallback.dynamicPressureEnabled),
  };
}

function clampItemDefinition(input: Partial<TimingItemDefinition> | undefined, fallback: TimingItemDefinition): TimingItemDefinition {
  const category = input?.category === 'normal' || input?.category === 'reward' || input?.category === 'penalty' || input?.category === 'utility' || input?.category === 'special' ? input.category : fallback.category;
  const stageUnlock = stageOrder.indexOf(input?.stageUnlock as BalanceStageId) >= 0 ? input?.stageUnlock as BalanceStageId : fallback.stageUnlock;
  return {
    ...fallback,
    category,
    stageUnlock,
    baseWeight: clampNumber(Number(input?.baseWeight ?? fallback.baseWeight), 0, 20),
    maxPerRound: Math.floor(clampNumber(Number(input?.maxPerRound ?? fallback.maxPerRound), 0, 3)),
    oneTimePerRun: clampBoolean(input?.oneTimePerRun, fallback.oneTimePerRun),
    enabled: clampBoolean(input?.enabled, fallback.enabled),
  };
}

function clampTimingPointTier(input: Partial<TimingPointTierConfig> | undefined, fallback: TimingPointTierConfig): TimingPointTierConfig {
  const stageUnlock = stageOrder.indexOf(input?.stageUnlock as BalanceStageId) >= 0 ? input?.stageUnlock as BalanceStageId : fallback.stageUnlock;
  return {
    ...fallback,
    score: Math.floor(clampNumber(Number(input?.score ?? fallback.score), 0, 5000)),
    baseWeight: clampNumber(Number(input?.baseWeight ?? fallback.baseWeight), 0, 20),
    stageUnlock,
    enabled: clampBoolean(input?.enabled, fallback.enabled),
  };
}

function clampStabilityConfig(saved: Partial<StabilityBalanceConfig> | undefined, defaults: StabilityBalanceConfig): StabilityBalanceConfig {
  const bombDropMin = Math.floor(clampNumber(Number(saved?.bombDropMin ?? defaults.bombDropMin), 0, 10));
  const bombDropMax = Math.floor(clampNumber(Number(saved?.bombDropMax ?? defaults.bombDropMax), bombDropMin, 10));
  const foodDurationMin = clampNumber(Number(saved?.foodDurationMin ?? defaults.foodDurationMin), 0.5, 30);
  const foodDurationMax = clampNumber(Number(saved?.foodDurationMax ?? defaults.foodDurationMax), foodDurationMin, 45);
  const multiplyThrowMin = Math.floor(clampNumber(Number(saved?.multiplyThrowMin ?? defaults.multiplyThrowMin), 1, 12));
  const multiplyThrowMax = Math.floor(clampNumber(Number(saved?.multiplyThrowMax ?? defaults.multiplyThrowMax), multiplyThrowMin, 12));
  return {
    initialStability: clampNumber(Number(saved?.initialStability ?? defaults.initialStability), 1, 200),
    stabilityRecoverAmount: clampNumber(Number(saved?.stabilityRecoverAmount ?? defaults.stabilityRecoverAmount), 0, 100),
    bombDropMin,
    bombDropMax,
    foodHandleScale: clampNumber(Number(saved?.foodHandleScale ?? defaults.foodHandleScale), 1, 5),
    foodDurationMin,
    foodDurationMax,
    bottleStepY: clampNumber(Number(saved?.bottleStepY ?? defaults.bottleStepY), 60, 220),
    towerSwayScale: clampNumber(Number(saved?.towerSwayScale ?? defaults.towerSwayScale), 0, 3),
    multiplyThrowMin,
    multiplyThrowMax,
    perfectRadiusScale: clampNumber(Number(saved?.perfectRadiusScale ?? defaults.perfectRadiusScale), 0.25, 3),
    goodRadiusScale: clampNumber(Number(saved?.goodRadiusScale ?? defaults.goodRadiusScale), 0.25, 3),
    circleTrackRadius: clampNumber(Number(saved?.circleTrackRadius ?? defaults.circleTrackRadius), 120, 260),
  };
}

function clampComboConfig(saved: Partial<ComboBalanceConfig> | undefined, defaults: ComboBalanceConfig): ComboBalanceConfig {
  return {
    perfectBaseScore: Math.floor(clampNumber(Number(saved?.perfectBaseScore ?? defaults.perfectBaseScore), 0, 1000)),
    perfectMultiplierCap: Math.floor(clampNumber(Number(saved?.perfectMultiplierCap ?? defaults.perfectMultiplierCap), 1, 30)),
    goodScore: Math.floor(clampNumber(Number(saved?.goodScore ?? defaults.goodScore), 0, 1000)),
    goodStabilityPenalty: clampNumber(Number(saved?.goodStabilityPenalty ?? defaults.goodStabilityPenalty), 0, 50),
  };
}

function clampBossConfig(saved: Partial<BossBalanceConfig> | undefined, defaults: BossBalanceConfig): BossBalanceConfig {
  const comboSkillDurationMin = clampNumber(Number(saved?.comboSkillDurationMin ?? defaults.comboSkillDurationMin), 1, 20);
  const comboSkillDurationMax = clampNumber(Number(saved?.comboSkillDurationMax ?? defaults.comboSkillDurationMax), comboSkillDurationMin, 30);
  const frozenSkillDurationMin = clampNumber(Number(saved?.frozenSkillDurationMin ?? defaults.frozenSkillDurationMin), 1, 20);
  const frozenSkillDurationMax = clampNumber(Number(saved?.frozenSkillDurationMax ?? defaults.frozenSkillDurationMax), frozenSkillDurationMin, 30);
  return {
    enabled: clampBoolean(saved?.enabled, defaults.enabled),
    triggerScore: Math.floor(clampNumber(Number(saved?.triggerScore ?? defaults.triggerScore), 1000, 500000)),
    maxHp: Math.floor(clampNumber(Number(saved?.maxHp ?? defaults.maxHp), 500, 20000)),
    warningSeconds: clampNumber(Number(saved?.warningSeconds ?? defaults.warningSeconds), 0.5, 8),
    normalAttackDamage: Math.floor(clampNumber(Number(saved?.normalAttackDamage ?? defaults.normalAttackDamage), 1, 2000)),
    goodAttackDamage: Math.floor(clampNumber(Number(saved?.goodAttackDamage ?? defaults.goodAttackDamage), 1, 2000)),
    rareAttackDamage: Math.floor(clampNumber(Number(saved?.rareAttackDamage ?? defaults.rareAttackDamage), 1, 3000)),
    treasureAttackDamage: Math.floor(clampNumber(Number(saved?.treasureAttackDamage ?? defaults.treasureAttackDamage), 1, 5000)),
    comboSkillDurationMin,
    comboSkillDurationMax,
    frozenSkillDurationMin,
    frozenSkillDurationMax,
    bossAttackInterval: clampNumber(Number(saved?.bossAttackInterval ?? defaults.bossAttackInterval), 0.5, 12),
    minionSpawnInterval: clampNumber(Number(saved?.minionSpawnInterval ?? defaults.minionSpawnInterval), 1, 20),
    bulletStabilityDamage: clampNumber(Number(saved?.bulletStabilityDamage ?? defaults.bulletStabilityDamage), 0, 50),
    maxMinions: saved?.maxMinions === undefined
      ? defaults.maxMinions
      : Math.floor(clampNumber(Number(saved.maxMinions), 0, 4)),
    minionHp: saved?.minionHp === undefined
      ? defaults.minionHp
      : Math.floor(clampNumber(Number(saved.minionHp), 50, 500)),
    displayScale: saved?.displayScale === undefined
      ? defaults.displayScale
      : clampNumber(Number(saved.displayScale), 1.2, 3),
    minionUnlockHpRatio: saved?.minionUnlockHpRatio === undefined
      ? defaults.minionUnlockHpRatio
      : clampNumber(Number(saved.minionUnlockHpRatio), 0, 1),
  };
}

export function mergeBalanceConfig(
  saved: Partial<BottleHeroBalanceConfig> | null | undefined,
  base: BottleHeroBalanceConfig = defaultBottleHeroBalance,
): BottleHeroBalanceConfig {
  const defaults = base;
  const savedStages = Array.isArray(saved?.stages) ? saved?.stages : [];
  const savedItems = Array.isArray(saved?.items) ? saved?.items : [];
  const savedTimingPointTiers = Array.isArray(saved?.timingPointTiers) ? saved?.timingPointTiers : [];
  const timingBarAnchorMode = saved?.timingBarAnchorMode === 'sceneCenter' || saved?.timingBarAnchorMode === 'followTower'
    ? saved.timingBarAnchorMode
    : defaults.timingBarAnchorMode;
  return {
    stages: defaults.stages.map((stage) => clampStageConfig(savedStages.find((entry) => entry?.id === stage.id), stage)),
    items: defaults.items.map((item) => clampItemDefinition(savedItems.find((entry) => entry?.id === item.id), item)),
    timingPointTiers: defaults.timingPointTiers.map((tier) => clampTimingPointTier(savedTimingPointTiers.find((entry) => entry?.id === tier.id), tier)),
    stability: clampStabilityConfig(saved?.stability, defaults.stability),
    dynamic: {
      enabled: clampBoolean(saved?.dynamic?.enabled, defaults.dynamic.enabled),
      windowSize: Math.floor(clampNumber(Number(saved?.dynamic?.windowSize ?? defaults.dynamic.windowSize), 3, 30)),
      assistMissRate: clampNumber(Number(saved?.dynamic?.assistMissRate ?? defaults.dynamic.assistMissRate), 0, 1),
      assistStabilityBelow: clampNumber(Number(saved?.dynamic?.assistStabilityBelow ?? defaults.dynamic.assistStabilityBelow), 0, 100),
      pressureMissRateBelow: clampNumber(Number(saved?.dynamic?.pressureMissRateBelow ?? defaults.dynamic.pressureMissRateBelow), 0, 1),
      pressureStabilityAbove: clampNumber(Number(saved?.dynamic?.pressureStabilityAbove ?? defaults.dynamic.pressureStabilityAbove), 0, 100),
      maxAssist: clampNumber(Number(saved?.dynamic?.maxAssist ?? defaults.dynamic.maxAssist), 0, 100),
      maxPressure: clampNumber(Number(saved?.dynamic?.maxPressure ?? defaults.dynamic.maxPressure), 0, 100),
    },
    combo: clampComboConfig(saved?.combo, defaults.combo),
    boss: clampBossConfig(saved?.boss, defaults.boss),
    timingBarAnchorMode,
  };
}

export function serializeBalanceConfig(config: BottleHeroBalanceConfig): string {
  return JSON.stringify(mergeBalanceConfig(config));
}

export function calculateRecentThrowStats(history: BalanceHitKind[], windowSize: number): RecentThrowStats {
  const recent = history.slice(-Math.max(1, Math.floor(windowSize)));
  const perfect = recent.filter((entry) => entry === 'perfect').length;
  const good = recent.filter((entry) => entry === 'good').length;
  const miss = recent.filter((entry) => entry === 'miss').length;
  const bomb = recent.filter((entry) => entry === 'bomb').length;
  const total = recent.length;
  return {
    total,
    perfect,
    good,
    miss,
    bomb,
    missRate: total > 0 ? miss / total : 0,
    bombRate: total > 0 ? bomb / total : 0,
    perfectRate: total > 0 ? perfect / total : 0,
    goodRate: total > 0 ? good / total : 0,
  };
}

export function getDynamicDifficultyState(config: BottleHeroBalanceConfig, stage: BalanceStageConfig, stability: number, stats: RecentThrowStats): DynamicDifficultyState {
  if (!config.dynamic.enabled || stats.total < Math.min(5, config.dynamic.windowSize)) {
    return { assist: 0, pressure: 0, reasonZh: '未触发', reasonEn: 'None' };
  }
  const assistByMiss = stage.dynamicAssistEnabled && stats.missRate >= config.dynamic.assistMissRate;
  const assistByBomb = stage.dynamicAssistEnabled && stats.bombRate >= 0.2;
  const assistByStability = stage.dynamicAssistEnabled && stability <= config.dynamic.assistStabilityBelow;
  if (assistByMiss || assistByBomb || assistByStability) {
    const missStrength = clampNumber((stats.missRate - config.dynamic.assistMissRate) / Math.max(0.01, 1 - config.dynamic.assistMissRate), 0, 1);
    const bombStrength = clampNumber(stats.bombRate / 0.5, 0, 1);
    const stabilityStrength = clampNumber((config.dynamic.assistStabilityBelow - stability) / Math.max(1, config.dynamic.assistStabilityBelow), 0, 1);
    const assist = Math.max(missStrength, bombStrength, stabilityStrength) * config.dynamic.maxAssist;
    return { assist, pressure: 0, reasonZh: assistByStability ? '稳定值保护' : (assistByBomb ? '惩罚保护' : '失误保护'), reasonEn: assistByStability ? 'Low stability assist' : (assistByBomb ? 'Penalty assist' : 'Miss assist') };
  }
  const pressureReady = stage.dynamicPressureEnabled && stats.missRate <= config.dynamic.pressureMissRateBelow && stability >= config.dynamic.pressureStabilityAbove;
  if (pressureReady) {
    const pressure = clampNumber(stability / 100, 0, 1) * config.dynamic.maxPressure;
    return { assist: 0, pressure, reasonZh: '高手加压', reasonEn: 'Pressure' };
  }
  return { assist: 0, pressure: 0, reasonZh: '未触发', reasonEn: 'None' };
}

export function getCurrentStageState(config: BottleHeroBalanceConfig, elapsedSeconds: number, stability: number, history: BalanceHitKind[]): ActiveStageState {
  const safeElapsed = Math.max(0, Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0);
  let cursor = 0;
  let stageIndex = 0;
  for (let i = 0; i < config.stages.length; i++) {
    const duration = Math.max(1, config.stages[i].durationSeconds);
    if (safeElapsed < cursor + duration || i === config.stages.length - 1) {
      stageIndex = i;
      break;
    }
    cursor += duration;
  }
  const stage = config.stages[stageIndex];
  const stats = calculateRecentThrowStats(history, config.dynamic.windowSize);
  const dynamic = getDynamicDifficultyState(config, stage, stability, stats);
  const actualRewardPenaltyBias = clampNumber(stage.rewardPenaltyBias - dynamic.assist + dynamic.pressure, -100, 100);
  const actualHandleSpeed = clampNumber(stage.handleSpeed * (1 - dynamic.assist / 180 + dynamic.pressure / 160), 0.5, 12);
  const actualHandleVariance = clampNumber(stage.handleVariance * (1 - dynamic.assist / 140 + dynamic.pressure / 120), 0, 1);
  return {
    stage,
    stageIndex,
    elapsedInStage: safeElapsed - cursor,
    dynamic,
    actualRewardPenaltyBias,
    actualHandleSpeed,
    actualHandleVariance,
    stats,
  };
}

export function getTimingItemDefinition(config: BottleHeroBalanceConfig, kind: TimingTargetKind): TimingItemDefinition | null {
  return config.items.find((item) => item.id === kind) || null;
}

export function createTimingTargetPlan(config: BottleHeroBalanceConfig, stageState: ActiveStageState, collectedRewardItems: Set<TimingTargetKind>): TimingTargetPlan {
  const stage = stageState.stage;
  const minCount = Math.floor(clampNumber(stage.targetCountMin, 1, 3));
  const maxCount = Math.floor(clampNumber(stage.targetCountMax, minCount, 3));
  const targetCount = minCount === maxCount ? minCount : minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
  const kinds: TimingTargetKind[] = ['star'];
  while (kinds.length < targetCount) {
    const nextKind = pickRegistryItemKind(config, stageState, kinds, collectedRewardItems);
    if (!nextKind) {
      break;
    }
    kinds.push(nextKind);
  }
  return {
    kinds,
    targetCount: kinds.length,
    rewardCount: kinds.filter((kind) => getTimingItemDefinition(config, kind)?.category === 'reward').length,
    penaltyCount: kinds.filter((kind) => getTimingItemDefinition(config, kind)?.category === 'penalty').length,
    stageId: stage.id,
    rewardPenaltyBias: stageState.actualRewardPenaltyBias,
  };
}

function pickRegistryItemKind(config: BottleHeroBalanceConfig, stageState: ActiveStageState, existingKinds: TimingTargetKind[], collectedRewardItems: Set<TimingTargetKind>): TimingTargetKind | null {
  const stageIndex = getStageOrderIndex(stageState.stage.id);
  const rewardPool = config.items.filter((item) => item.enabled && item.category === 'reward' && getStageOrderIndex(item.stageUnlock) <= stageIndex && existingKinds.indexOf(item.id) < 0 && (!item.oneTimePerRun || !collectedRewardItems.has(item.id)));
  const penaltyPool = config.items.filter((item) => item.enabled && item.category === 'penalty' && getStageOrderIndex(item.stageUnlock) <= stageIndex && existingKinds.indexOf(item.id) < 0);
  const bias = clampNumber(stageState.actualRewardPenaltyBias, -100, 100);
  const rewardCategoryWeight = Math.max(0, 100 - bias);
  const penaltyCategoryWeight = Math.max(0, 100 + bias);
  const hasRewards = rewardPool.some((item) => item.baseWeight > 0);
  const hasPenalties = penaltyPool.some((item) => item.baseWeight > 0);
  if (!hasRewards && !hasPenalties) {
    return null;
  }
  const totalCategoryWeight = (hasRewards ? rewardCategoryWeight : 0) + (hasPenalties ? penaltyCategoryWeight : 0);
  const choosePenalty = totalCategoryWeight > 0 && Math.random() * totalCategoryWeight >= (hasRewards ? rewardCategoryWeight : 0);
  const preferredPool = choosePenalty && hasPenalties ? penaltyPool : rewardPool;
  const fallbackPool = choosePenalty ? rewardPool : penaltyPool;
  return pickWeightedItem(preferredPool) || pickWeightedItem(fallbackPool);
}

function pickWeightedItem(pool: TimingItemDefinition[]): TimingTargetKind | null {
  const total = pool.reduce((sum, item) => sum + Math.max(0, item.baseWeight), 0);
  if (total <= 0) {
    return null;
  }
  let roll = Math.random() * total;
  for (const item of pool) {
    roll -= Math.max(0, item.baseWeight);
    if (roll <= 0) {
      return item.id;
    }
  }
  return pool[pool.length - 1]?.id || null;
}
