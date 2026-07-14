import type {
  BossBalanceConfig,
  TimingItemDefinition,
  TimingPointTierConfig,
} from './BottleHeroBalance';

export type AvatarId = 'cat01' | 'cat02' | 'cat03' | 'cat04';
export type AvatarGoodsId = 'none' | 'horns' | 'propeller' | 'hat' | 'helmet' | 'armor' | 'boots';
export type AvatarGoodsAttachSocket = 'head' | 'hand' | 'body' | 'feet';

export const AVATAR_GOODS_PANEL_SLOT_COUNT = 8;
export const AVATAR_GOODS_PANEL_COLUMNS = 4;
export type LevelId = 'level_01' | 'level_02' | 'level_03';
export type BossId = 'boss_alien_01' | 'boss_octopus_02' | 'boss_alien_03';

export const playableLevelIds: LevelId[] = ['level_01', 'level_02', 'level_03'];
export const playableBossIds: BossId[] = ['boss_alien_01', 'boss_octopus_02', 'boss_alien_03'];

/** 背景分段叠瓶阈值（按关卡）。 */
export interface LevelBackgroundProgression {
  scene03Height: number;
  scene04Height: number;
  scene03MinLoops: number;
}

/** Level 01 背景叠瓶阈值（交割包原始逻辑，勿随 L02/L03 改动）。 */
export const LEVEL_01_BACKGROUND_PROGRESSION: LevelBackgroundProgression = {
  scene03Height: 18,
  scene04Height: 42,
  scene03MinLoops: 2,
};

/** Level 02/03 背景叠瓶阈值。 */
export const LEVEL_BACKGROUND_PROGRESSION: Record<'level_02' | 'level_03', LevelBackgroundProgression> = {
  level_02: { scene03Height: 18, scene04Height: 36, scene03MinLoops: 1 },
  level_03: { scene03Height: 18, scene04Height: 36, scene03MinLoops: 1 },
};

export function getLevelBackgroundProgression(levelId: LevelId): LevelBackgroundProgression {
  if (levelId === 'level_01') {
    return LEVEL_01_BACKGROUND_PROGRESSION;
  }
  return LEVEL_BACKGROUND_PROGRESSION[levelId];
}

export const THROW_ITEM_FILES = [
  'throw_item_00_kettle.png',
  'throw_item_01_toy.png',
  'throw_item_02_toy.png',
  'throw_item_03_car.png',
  'throw_item_04_car.png',
  'throw_item_05_car.png',
  'throw_item_06_car.png',
  'throw_item_07_car.png',
  'throw_item_08_car.png',
  'throw_item_09_tv.png',
  'throw_item_10_tv.png',
  'throw_item_11_tire.png',
  'throw_item_12_tire.png',
  'throw_item_13_rocket_01.png',
  'throw_item_14_rocket_02.png',
  'throw_item_15_rocket_03.png',
  'throw_item_16_rocket_04.png',
  'throw_item_17_ship_01.png',
  'throw_item_18_ship_02.png',
  'throw_item_19_satellite_01.png',
  'throw_item_20_satellite_02.png',
  'throw_item_21_satellite_03.png',
  'throw_item_22_satellite_04.png',
  'throw_item_23_satellite_05.png',
  'throw_item_24_satellite_06.png',
  'throw_item_25_satellite_07.png',
  'throw_item_26_satellite_08.png',
] as const;

export const LEVEL_02_THROW_ITEM_FILES = Array.from(
  { length: 27 },
  (_, index) => `throw_item_${String(index).padStart(2, '0')}.png`,
);

export const LEVEL_03_THROW_ITEM_FILES = Array.from(
  { length: 28 },
  (_, index) => `throw_item_${String(index).padStart(2, '0')}.png`,
);

const THROW_ITEM_FILES_BY_LEVEL: Record<LevelId, readonly string[]> = {
  level_01: THROW_ITEM_FILES,
  level_02: LEVEL_02_THROW_ITEM_FILES,
  level_03: LEVEL_03_THROW_ITEM_FILES,
};

export function getLevelThrowItemPaths(levelFolder: LevelId): readonly string[] {
  return THROW_ITEM_FILES_BY_LEVEL[levelFolder].map((file) => `gameplay/throw-items/${levelFolder}/${file}`);
}

export const BASE_AMBIENT_SPRITE_ENTRIES = [
  ['ambientBee', 'bee.png'],
  ['ambientBird01', 'bird_01.png'],
  ['ambientBird02', 'bird_02.png'],
  ['ambientAlien01', 'alien_01.png'],
  ['ambientAlien02', 'alien_02.png'],
  ['ambientAlien03', 'alien_03.png'],
] as const;

export const LEVEL_02_AMBIENT_SPRITE_ENTRIES = [
  ['ambientFish', 'fish_01.png'],
  ['ambientFishAngler', 'anglerfish.png'],
  ['ambientFishArowana', 'Arowana.png'],
  ['ambientFishSquid', 'Squid.png'],
  ['ambientFishSunfish', 'Sunfish.png'],
  ['ambientFishViper', 'Viperfish.png'],
] as const;

/** Level 03 糖果氛围：叠瓶 0–42 / 42–138 / 138+ 分三段出场（42、138 为过渡叠瓶数，可并存相邻段角色）。 */
export const LEVEL_03_AMBIENT_STAGE_MAX_BOTTLES = {
  stage1: 42,
  stage2: 138,
} as const;
export const LEVEL_03_AMBIENT_SPRITE_ENTRIES = [
  ['ambientL03SugarBee', 'sugar-fed bee swarm.png'],
  ['ambientL03MilkDrip', 'Milk Drip Sprite.png'],
  ['ambientL03CaramelBalloon', 'Caramel Balloon Monster.png'],
  ['ambientL03CocoaBean', 'Cocoa Bean Balloon.png'],
  ['ambientL03ToffeeMoth', 'Toffee Moth.png'],
  ['ambientL03StirringPaddle', 'Stirring Paddle Sprite.png'],
  ['ambientL03CottonCandy', 'Cotton Candy Balloon.png'],
  ['ambientL03LollipopHeli', 'Lollipop helicopter.png'],
  ['ambientL03RainbowElf', 'Rainbow Candy Elf.png'],
  ['ambientL03CookieUfo', 'Cookie Frisbee UFO.png'],
  ['ambientL03ChocolateSoldier', 'Chocolate Ball Flying Soldier.png'],
] as const;

export type Level03AmbientSpriteKey = (typeof LEVEL_03_AMBIENT_SPRITE_ENTRIES)[number][0];

export interface Level03AmbientDisplayWidth {
  back: readonly [number, number];
  front: readonly [number, number];
}

export interface Level03AmbientVariantConfig {
  key: Level03AmbientSpriteKey;
  minBottleCount: number;
  maxBottleCount?: number;
  flightBand: 'low' | 'mid' | 'high';
  /** 按角色区分的屏幕宽度（设计像素）；back 略小营造景深。 */
  displayWidth: Level03AmbientDisplayWidth;
}

export const LEVEL_03_AMBIENT_VARIANTS: Level03AmbientVariantConfig[] = [
  { key: 'ambientL03SugarBee', minBottleCount: 0, maxBottleCount: 42, flightBand: 'low', displayWidth: { back: [64, 84], front: [78, 102] } },
  { key: 'ambientL03MilkDrip', minBottleCount: 0, maxBottleCount: 42, flightBand: 'mid', displayWidth: { back: [88, 112], front: [104, 132] } },
  { key: 'ambientL03CaramelBalloon', minBottleCount: 0, maxBottleCount: 42, flightBand: 'mid', displayWidth: { back: [188, 236], front: [228, 292] } },
  { key: 'ambientL03CocoaBean', minBottleCount: 0, maxBottleCount: 42, flightBand: 'high', displayWidth: { back: [120, 152], front: [144, 184] } },
  { key: 'ambientL03ToffeeMoth', minBottleCount: 42, maxBottleCount: 138, flightBand: 'low', displayWidth: { back: [72, 96], front: [88, 116] } },
  { key: 'ambientL03StirringPaddle', minBottleCount: 42, maxBottleCount: 138, flightBand: 'mid', displayWidth: { back: [156, 200], front: [188, 244] } },
  { key: 'ambientL03CottonCandy', minBottleCount: 42, maxBottleCount: 138, flightBand: 'high', displayWidth: { back: [204, 256], front: [244, 308] } },
  { key: 'ambientL03LollipopHeli', minBottleCount: 42, maxBottleCount: 138, flightBand: 'high', displayWidth: { back: [168, 212], front: [200, 256] } },
  { key: 'ambientL03RainbowElf', minBottleCount: 138, flightBand: 'low', displayWidth: { back: [112, 144], front: [136, 176] } },
  { key: 'ambientL03CookieUfo', minBottleCount: 138, flightBand: 'mid', displayWidth: { back: [176, 224], front: [208, 268] } },
  { key: 'ambientL03ChocolateSoldier', minBottleCount: 138, flightBand: 'high', displayWidth: { back: [236, 296], front: [276, 348] } },
];

export function getLevel03AmbientStage(bottleCount: number): 1 | 2 | 3 {
  if (bottleCount >= LEVEL_03_AMBIENT_STAGE_MAX_BOTTLES.stage2) {
    return 3;
  }
  if (bottleCount >= LEVEL_03_AMBIENT_STAGE_MAX_BOTTLES.stage1) {
    return 2;
  }
  return 1;
}

export function isLevel03AmbientVariantActive(bottleCount: number, variant: Level03AmbientVariantConfig): boolean {
  if (bottleCount < variant.minBottleCount) {
    return false;
  }
  if (variant.maxBottleCount !== undefined && bottleCount > variant.maxBottleCount) {
    return false;
  }
  return true;
}

export type AmbientSpriteKey =
  | (typeof BASE_AMBIENT_SPRITE_ENTRIES)[number][0]
  | (typeof LEVEL_02_AMBIENT_SPRITE_ENTRIES)[number][0]
  | Level03AmbientSpriteKey;

export const ALL_AMBIENT_SPRITE_KEYS: AmbientSpriteKey[] = [
  ...BASE_AMBIENT_SPRITE_ENTRIES.map(([key]) => key),
  ...LEVEL_02_AMBIENT_SPRITE_ENTRIES.map(([key]) => key),
  ...LEVEL_03_AMBIENT_SPRITE_ENTRIES.map(([key]) => key),
];

export function getLevelAmbientSpriteEntries(levelId: LevelId): Array<[AmbientSpriteKey, string, string]> {
  const entries = levelId === 'level_02'
    ? LEVEL_02_AMBIENT_SPRITE_ENTRIES
    : levelId === 'level_03'
      ? LEVEL_03_AMBIENT_SPRITE_ENTRIES
      : BASE_AMBIENT_SPRITE_ENTRIES;
  return entries.map(([key, file]) => [
    key,
    key.replace(/^ambientL03/, 'L03 ').replace(/^ambient/, 'Ambient '),
    `ambient/${levelId}/${file}`,
  ]);
}

export interface AvatarDefinitionConfig {
  id: AvatarId;
  label: string;
  spriteKey: string;
  iconKey: string;
  homeWidth: number;
  homeHeight: number;
  goodsSocket: { x: number; y: number };
  /** Raised-hand attach point for held goods (relative to avatar home preview center). */
  handSocket: { x: number; y: number };
  /** Chest attach point for body goods such as armor. */
  bodySocket: { x: number; y: number };
  /** Feet attach point for footwear goods. */
  feetSocket: { x: number; y: number };
}

export interface AvatarGoodsDefinitionConfig {
  id: Exclude<AvatarGoodsId, 'none'>;
  label: string;
  spriteKey: string;
  unlocked: boolean;
  source: 'demo' | 'bossReward' | 'eventReward';
  width: number;
  height: number;
  /** Fixed slot index (0-7) in the 2x4 accessories panel; omit to auto-fill in list order. */
  panelSlot?: number;
  /** When true, keep sprite aspect ratio inside width/height box. */
  keepAspect?: boolean;
  attachSocket?: AvatarGoodsAttachSocket;
  socketOffset: { x: number; y: number; scale: number; rotation?: number };
}

export interface AvatarConfigFile {
  avatars: AvatarDefinitionConfig[];
  goods: AvatarGoodsDefinitionConfig[];
  homeLayout: {
    normalY: number;
    focusY: number;
    focusScale: number;
  };
}

export interface LevelBackgroundConfig {
  start: string;
  loop: string;
  loopOnce?: string;
  scene03Bridge: string;
  scene03Loop: string;
  scene04Bridge: string;
  scene04Loop: string;
}

export interface LevelConfigFile {
  id: string;
  labelZh: string;
  labelEn: string;
  balanceConfig: string;
  backgrounds: LevelBackgroundConfig;
  boss: {
    id: string;
    balanceSection: 'boss';
  };
  rewardsConfig?: string;
  throwItems: readonly string[];
}

export interface TimingPointsConfigFile {
  timingPointTiers: TimingPointTierConfig[];
}

export interface TimingItemsConfigFile {
  items: TimingItemDefinition[];
}

export interface BossConfigFile {
  id: string;
  labelZh: string;
  labelEn: string;
  /** 小兵贴图键名（对应 `BottleHeroAssets` / ambient 资源） */
  minionSpriteKeys?: string[];
  /** Boss 本体色调（无则保持原色） */
  displayTint?: { r: number; g: number; b: number };
  balance: BossBalanceConfig;
}

export interface AvatarGoodsConfigFile {
  goods: AvatarGoodsDefinitionConfig[];
}

export interface LevelRewardsConfigFile {
  levelId: string;
  bossId: string;
  victoryScoreBonus: number;
  goods: Exclude<AvatarGoodsId, 'none'>[];
}

export const fallbackLevel03Rewards: LevelRewardsConfigFile = {
  levelId: 'level_03',
  bossId: 'boss_alien_03',
  victoryScoreBonus: 3500,
  goods: ['horns', 'hat'],
};

export const fallbackLevel02Rewards: LevelRewardsConfigFile = {
  levelId: 'level_02',
  bossId: 'boss_octopus_02',
  victoryScoreBonus: 3000,
  goods: ['propeller', 'hat'],
};

export const fallbackLevel01Rewards: LevelRewardsConfigFile = {
  levelId: 'level_01',
  bossId: 'boss_alien_01',
  victoryScoreBonus: 2500,
  goods: ['horns', 'propeller'],
};

export const fallbackAvatarConfig: AvatarConfigFile = {
  avatars: [
    { id: 'cat01', label: 'HERO CAT', spriteKey: 'avatarCat01', iconKey: 'avatarCat01Icon', homeWidth: 720, homeHeight: 720, goodsSocket: { x: -28, y: 278 }, handSocket: { x: 164, y: 104 }, bodySocket: { x: 0, y: 52 }, feetSocket: { x: 0, y: -252 } },
    { id: 'cat02', label: 'KNIGHT CAT', spriteKey: 'avatarCat02', iconKey: 'avatarCat02Icon', homeWidth: 720, homeHeight: 720, goodsSocket: { x: -30, y: 280 }, handSocket: { x: 160, y: 98 }, bodySocket: { x: 0, y: 50 }, feetSocket: { x: 0, y: -254 } },
    { id: 'cat03', label: 'GUARD CAT', spriteKey: 'avatarCat03', iconKey: 'avatarCat03Icon', homeWidth: 720, homeHeight: 720, goodsSocket: { x: -32, y: 276 }, handSocket: { x: 174, y: 110 }, bodySocket: { x: 0, y: 48 }, feetSocket: { x: 0, y: -256 } },
    { id: 'cat04', label: 'MAGE CAT', spriteKey: 'avatarCat04', iconKey: 'avatarCat04Icon', homeWidth: 720, homeHeight: 720, goodsSocket: { x: -30, y: 274 }, handSocket: { x: 170, y: 116 }, bodySocket: { x: 0, y: 46 }, feetSocket: { x: 0, y: -258 } },
  ],
  goods: [
    { id: 'horns', label: 'Horns', spriteKey: 'avatarGoods01', unlocked: true, source: 'bossReward', panelSlot: 0, width: 220, height: 176, socketOffset: { x: -2, y: -10, scale: 0.98 } },
    { id: 'propeller', label: 'Propeller', spriteKey: 'avatarGoods02', unlocked: true, source: 'bossReward', panelSlot: 1, width: 228, height: 228, socketOffset: { x: 16, y: -12, scale: 0.88 } },
    { id: 'hat', label: 'Patch Hat', spriteKey: 'avatarGoods03', unlocked: true, source: 'bossReward', panelSlot: 2, width: 230, height: 170, socketOffset: { x: 23, y: -34, scale: 0.95 } },
    { id: 'helmet', label: 'Helmet', spriteKey: 'avatarGoodsHelmet', unlocked: true, source: 'catalog', panelSlot: 3, width: 220, height: 180, socketOffset: { x: 20, y: -126, scale: 1.728 } },
    { id: 'armor', label: 'Armor', spriteKey: 'avatarGoodsArmor', unlocked: true, source: 'catalog', panelSlot: 4, attachSocket: 'body', width: 280, height: 320, socketOffset: { x: -10, y: -108, scale: 1.0 } },
    { id: 'boots', label: 'Boots', spriteKey: 'avatarGoodsBoots', unlocked: true, source: 'catalog', panelSlot: 5, attachSocket: 'feet', keepAspect: true, width: 240, height: 120, socketOffset: { x: -10, y: 20, scale: 4.0 } },
  ],
  homeLayout: {
    normalY: -58,
    focusY: -170,
    focusScale: 1.45,
  },
};

export const fallbackLevel01Config: LevelConfigFile = {
  id: 'level_01',
  labelZh: 'Level 01',
  labelEn: 'Level 01',
  balanceConfig: 'bottlehero/config/balance/default',
  backgrounds: {
    start: 'backgrounds/level_01/level_01_start.jpg',
    loop: 'backgrounds/level_01/level_01_loop.png',
    scene03Bridge: 'backgrounds/level_01/level_01_scene_03_bridge.jpg',
    scene03Loop: 'backgrounds/level_01/level_01_scene_03_loop.jpg',
    scene04Bridge: 'backgrounds/level_01/level_01_scene_04_bridge.jpg',
    scene04Loop: 'backgrounds/level_01/level_01_scene_04_loop.jpg',
  },
  boss: {
    id: 'boss_alien_01',
    balanceSection: 'boss',
  },
  throwItems: getLevelThrowItemPaths('level_01'),
};

export const fallbackLevel02Config: LevelConfigFile = {
  id: 'level_02',
  labelZh: 'Level 02',
  labelEn: 'Level 02',
  balanceConfig: 'bottlehero/config/balance/level_02',
  backgrounds: {
    start: 'backgrounds/level_02/level_02_start.jpg',
    loopOnce: 'backgrounds/level_02/level_02_loop.jpg',
    loop: 'backgrounds/level_02/level_02_scene_03_loop.jpg',
    scene03Bridge: 'backgrounds/level_02/level_02_scene_03_bridge.jpg',
    scene03Loop: 'backgrounds/level_02/level_02_scene_03_loop.jpg',
    scene04Bridge: 'backgrounds/level_02/level_02_scene_04_bridge.jpg',
    scene04Loop: 'backgrounds/level_02/level_02_scene_04_loop.jpg',
  },
  boss: {
    id: 'boss_octopus_02',
    balanceSection: 'boss',
  },
  rewardsConfig: 'bottlehero/config/rewards/level_02_rewards',
  throwItems: getLevelThrowItemPaths('level_02'),
};

export const fallbackLevel03Config: LevelConfigFile = {
  id: 'level_03',
  labelZh: 'Level 03',
  labelEn: 'Level 03',
  balanceConfig: 'bottlehero/config/balance/level_03',
  backgrounds: {
    start: 'backgrounds/level_03/level_03_start.jpg',
    loopOnce: 'backgrounds/level_03/level_03_loop.jpg',
    loop: 'backgrounds/level_03/level_03_scene_03_loop.jpg',
    scene03Bridge: 'backgrounds/level_03/level_03_scene_03_bridge.jpg',
    scene03Loop: 'backgrounds/level_03/level_03_scene_03_loop.jpg',
    scene04Bridge: 'backgrounds/level_03/level_03_scene_04_bridge.jpg',
    scene04Loop: 'backgrounds/level_03/level_03_scene_04_loop.jpg',
  },
  boss: {
    id: 'boss_alien_03',
    balanceSection: 'boss',
  },
  rewardsConfig: 'bottlehero/config/rewards/level_03_rewards',
  throwItems: getLevelThrowItemPaths('level_03'),
};
