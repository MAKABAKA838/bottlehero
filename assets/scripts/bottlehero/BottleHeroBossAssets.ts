import type { BossAnimationId, SpriteSheetPreviewAsset, SpriteSheetPreviewAssetId } from './BottleHeroTypes';
import { getLevelConfig } from './BottleHeroConfigLoader';
import type { LevelId } from './BottleHeroGameConfig';

export type SpritePreviewBossId = 'boss01Alien' | 'boss02Octopus' | 'boss03Marshmallow';

export interface BossBattleLayoutConfig {
  moveYMin: number;
  moveYMax: number;
  enterStartY: number;
  enterTweenYs: [number, number, number];
  moveTargetDefaultY: number;
}

export interface BossAnimationDisplayConfig {
  anchor: { x: number; y: number };
  wideDisplayScale?: number;
  /** 子节点本地 Y：补偿宽屏 idle 帧上方留白，使角色与 L1/L2 Boss 对齐。 */
  spriteLocalOffsetY: number;
  /** 相对 boss 根节点的子弹发射点 Y 偏移。 */
  bulletSpawnOffsetY: number;
}

export interface BossDisplayProfile {
  battleLayout?: Partial<BossBattleLayoutConfig>;
  animations?: Partial<Record<BossAnimationId | 'default', Partial<BossAnimationDisplayConfig>>>;
}

const DEFAULT_BOSS_BATTLE_LAYOUT: BossBattleLayoutConfig = {
  moveYMin: 330,
  moveYMax: 472,
  enterStartY: 850,
  enterTweenYs: [380, 404, 392],
  moveTargetDefaultY: 390,
};

const DEFAULT_ANIMATION_DISPLAY: BossAnimationDisplayConfig = {
  anchor: { x: 0.5, y: 0.5 },
  spriteLocalOffsetY: 0,
  bulletSpawnOffsetY: -58,
};

const bossDisplayProfiles: Partial<Record<string, BossDisplayProfile>> = {};

export function getBossBattleLayoutConfig(bossId: string): BossBattleLayoutConfig {
  const overrides = bossDisplayProfiles[bossId]?.battleLayout;
  return {
    ...DEFAULT_BOSS_BATTLE_LAYOUT,
    ...overrides,
  };
}

export function getBossAnimationDisplayConfig(
  bossId: string,
  animationId: BossAnimationId,
): BossAnimationDisplayConfig {
  const profile = bossDisplayProfiles[bossId];
  const animOverrides = profile?.animations?.[animationId] ?? profile?.animations?.default;
  return {
    ...DEFAULT_ANIMATION_DISPLAY,
    ...animOverrides,
    anchor: {
      ...DEFAULT_ANIMATION_DISPLAY.anchor,
      ...animOverrides?.anchor,
    },
  };
}

export interface SpritePreviewBossGroup {
  id: SpritePreviewBossId;
  label: string;
  assetIds: SpriteSheetPreviewAssetId[];
}

export const spriteSheetPreviewAssets: SpriteSheetPreviewAsset[] = [
  {
    id: 'boss01AlienIdle',
    label: 'Boss Alien Idle',
    file: 'boss/atlases/boss01_Alien_idle.png',
    columns: 4,
    frameCount: 25,
    fps: 24,
    frameWidth: 216,
    frameHeight: 211,
    displayWidth: 430,
  },
  {
    id: 'boss01AlienAttack',
    label: 'Boss Alien Attack',
    file: 'boss/atlases/boss01_Alien_attack.png',
    columns: 4,
    frameCount: 5,
    fps: 12,
    frameWidth: 222,
    frameHeight: 240,
    displayWidth: 430,
  },
  {
    id: 'boss01AlienDead',
    label: 'Boss Alien Dead',
    file: 'boss/atlases/boss01_Alien_dead.png',
    columns: 4,
    frameCount: 39,
    fps: 18,
    frameWidth: 289,
    frameHeight: 282,
    displayWidth: 430,
  },
  {
    id: 'boss01AlienDizziness',
    label: 'Boss Alien Dizziness',
    file: 'boss/atlases/boss01_Alien_dizziness.png',
    columns: 4,
    frameCount: 15,
    fps: 18,
    frameWidth: 191,
    frameHeight: 200,
    displayWidth: 430,
  },
  {
    id: 'boss01AlienHitted',
    label: 'Boss Alien Hitted',
    file: 'boss/atlases/boss01_Alien_hitted.png',
    columns: 4,
    frameCount: 7,
    fps: 14,
    frameWidth: 214,
    frameHeight: 209,
    displayWidth: 430,
  },
  {
    id: 'boss01AlienFrozen',
    label: 'Boss Alien Frozen',
    file: 'boss/atlases/boss01_Alien_frozen.png',
    columns: 4,
    frameCount: 25,
    fps: 18,
    frameWidth: 216,
    frameHeight: 212,
    displayWidth: 430,
  },
  {
    id: 'boss01AlienHitFx',
    label: 'Boss Hit FX',
    file: 'boss/atlases/boss01_Alien_hitted_fx.png',
    columns: 4,
    frameCount: 9,
    fps: 20,
    frameWidth: 256,
    frameHeight: 256,
    displayWidth: 430,
  },
  {
    id: 'boss01AlienFrozenHitFx',
    label: 'Boss Frozen Hit FX',
    file: 'boss/atlases/boss01_Alien_frozen_hitted_fx.png',
    columns: 4,
    frameCount: 9,
    fps: 20,
    frameWidth: 256,
    frameHeight: 256,
    displayWidth: 430,
  },
  {
    id: 'boss02OctopusIdle',
    label: 'Boss Octopus Idle',
    file: 'boss/Octopus/boss02_Octopus_idle.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
    displayWidth: 430,
  },
  {
    id: 'boss02OctopusAttack',
    label: 'Boss Octopus Attack',
    file: 'boss/Octopus/boss02_Octopus_attack.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
    displayWidth: 430,
  },
  {
    id: 'boss02OctopusDizziness',
    label: 'Boss Octopus Dizziness',
    file: 'boss/Octopus/boss02_Octopus_dizziness.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
    displayWidth: 430,
  },
  {
    id: 'boss02OctopusHitted',
    label: 'Boss Octopus Hitted',
    file: 'boss/Octopus/boss02_Octopus_hitted.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
    displayWidth: 430,
    frameCellIndices: [1, 3, 5, 7],
  },
  {
    id: 'boss02OctopusDead',
    label: 'Boss Octopus Dead',
    file: 'boss/Octopus/boss02_Octopus_dead.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
    displayWidth: 430,
  },
  {
    id: 'boss02OctopusFrozen',
    label: 'Boss Octopus Frozen',
    file: 'boss/Octopus/boss02_Octopus_frozen.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
    displayWidth: 430,
    frozenPlayback: {
      holdFrameIndex: 0,
      thawFrameIndices: [1, 2, 3, 4, 5, 6, 7],
    },
  },
  {
    id: 'boss02JellyfishIdle',
    label: 'Boss 02 Jellyfish Minion Idle',
    file: 'boss/Octopus/boss02_Jellyfish_idle.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
    displayWidth: 120,
  },
  {
    id: 'boss03MarshmallowIdle',
    label: 'Boss 03 Marshmallow Idle',
    file: 'boss/Marshmallow/Stage_1/boss03_Marshmallow_idle1.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
    displayWidth: 430,
  },
  {
    id: 'boss03MarshmallowIdleStage2',
    label: 'Boss 03 Marshmallow Idle Stage 2',
    file: 'boss/Marshmallow/Stage_2/boss03_Marshmallow_Stage_2_idle1.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
    displayWidth: 430,
  },
  {
    id: 'boss03MarshmallowSwitchStage',
    label: 'Boss 03 Marshmallow Switch Stage',
    file: 'boss/Marshmallow/boss03_Marshmallow_Switch stage.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
    displayWidth: 430,
  },
  {
    id: 'boss03MarshmallowStage1Attack',
    label: 'Boss 03 Marshmallow Stage 1 Attack',
    file: 'boss/Marshmallow/Stage_1/boss03_Marshmallow_Stage_1_attack.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
    displayWidth: 430,
  },
  {
    id: 'boss03MarshmallowStage1Hitted',
    label: 'Boss 03 Marshmallow Stage 1 Hitted',
    file: 'boss/Marshmallow/Stage_1/boss03_Marshmallow_Stage_1_hitted.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
    displayWidth: 430,
  },
  {
    id: 'boss03MarshmallowStage2Hitted',
    label: 'Boss 03 Marshmallow Stage 2 Hitted',
    file: 'boss/Marshmallow/Stage_2/boss03_Marshmallow_Stage_2_hitted.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 497,
    frameHeight: 251,
    displayWidth: 430,
  },
  {
    id: 'boss03MarshmallowStage1Dizziness',
    label: 'Boss 03 Marshmallow Stage 1 Dizziness',
    file: 'boss/Marshmallow/Stage_1/boss03_Marshmallow_Stage_1_dizziness.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
    displayWidth: 430,
  },
  {
    id: 'boss03MarshmallowStage1Frozen',
    label: 'Boss 03 Marshmallow Stage 1 Frozen',
    file: 'boss/Marshmallow/Stage_1/boss03_Marshmallow_Stage_1_frozen.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 512,
    frameHeight: 256,
    displayWidth: 430,
    frozenPlayback: {
      holdFrameIndex: 0,
      thawFrameIndices: [1, 2, 3, 4, 5, 6, 7],
    },
  },
  {
    id: 'boss03MarshmallowStage2Frozen',
    label: 'Boss 03 Marshmallow Stage 2 Frozen',
    file: 'boss/Marshmallow/Stage_2/boss03_Marshmallow_Stage_2_frozen.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 498,
    frameHeight: 252,
    displayWidth: 430,
    frozenPlayback: {
      holdFrameIndex: 0,
      thawFrameIndices: [1, 2, 3, 4, 5, 6, 7],
    },
  },
  {
    id: 'boss03MarshmallowStage2Bomb',
    label: 'Boss 03 Marshmallow Stage 2 Bomb',
    file: 'boss/Marshmallow/Stage_2/boss03_Marshmallow_Stage_2_Bomb.png',
    columns: 3,
    frameCount: 9,
    fps: 12,
    frameWidth: 341,
    frameHeight: 341,
    displayWidth: 120,
  },
  {
    id: 'boss03MarshmallowDead',
    label: 'Boss 03 Marshmallow Dead',
    file: 'boss/Marshmallow/Stage_2/boss03_Marshmallow_dead.png',
    columns: 2,
    frameCount: 8,
    fps: 12,
    frameWidth: 497,
    frameHeight: 250,
    displayWidth: 430,
  },
];

export const spritePreviewBossGroups: SpritePreviewBossGroup[] = [
  {
    id: 'boss01Alien',
    label: 'Boss 01 Alien',
    assetIds: [
      'boss01AlienIdle',
      'boss01AlienAttack',
      'boss01AlienHitted',
      'boss01AlienDead',
      'boss01AlienDizziness',
      'boss01AlienFrozen',
      'boss01AlienHitFx',
      'boss01AlienFrozenHitFx',
    ],
  },
  {
    id: 'boss02Octopus',
    label: 'Boss 02 Octopus',
    assetIds: [
      'boss02OctopusIdle',
      'boss02OctopusAttack',
      'boss02OctopusDizziness',
      'boss02OctopusHitted',
      'boss02OctopusDead',
      'boss02OctopusFrozen',
      'boss02JellyfishIdle',
    ],
  },
  {
    id: 'boss03Marshmallow',
    label: 'Boss 03 Marshmallow',
    assetIds: [
      'boss03MarshmallowIdle',
      'boss03MarshmallowIdleStage2',
      'boss03MarshmallowSwitchStage',
      'boss03MarshmallowStage1Attack',
      'boss03MarshmallowStage1Hitted',
      'boss03MarshmallowStage2Hitted',
      'boss03MarshmallowStage1Dizziness',
      'boss03MarshmallowStage1Frozen',
      'boss03MarshmallowStage2Frozen',
      'boss03MarshmallowStage2Bomb',
      'boss03MarshmallowDead',
      'boss01AlienHitFx',
      'boss01AlienFrozenHitFx',
    ],
  },
];

export const bossAnimationAssets: Record<BossAnimationId, SpriteSheetPreviewAssetId> = {
  idle: 'boss01AlienIdle',
  attack: 'boss01AlienAttack',
  hitted: 'boss01AlienHitted',
  dead: 'boss01AlienDead',
  dizziness: 'boss01AlienDizziness',
  frozen: 'boss01AlienFrozen',
  switchStage: 'boss01AlienIdle',
};

export const MARSHMALLOW_STAGE_SWITCH_HP_RATIO = 0.5;

export const BOSS_MARSHMALLOW_STAGE2_BOMB_SPRITE_KEY = 'bossMarshmallowStage2Bomb';
export const BOSS_MARSHMALLOW_STAGE2_BOMB_ASSET_ID = 'boss03MarshmallowStage2Bomb';
export const BOSS_MARSHMALLOW_STAGE2_BOMB_FPS = 12;

export const BOSS_OCTOPUS_JELLYFISH_MINION_SPRITE_KEY = 'bossOctopusJellyfishMinion';
export const BOSS_OCTOPUS_JELLYFISH_IDLE_ASSET_ID = 'boss02JellyfishIdle';
export const BOSS_OCTOPUS_JELLYFISH_MINION_FPS = 12;
/** Jellyfish 显示宽（512×256 图集，2× 于原 100px 级占位）。 */
export const BOSS_OCTOPUS_JELLYFISH_MINION_DISPLAY_WIDTH = 200;
/** 相对 Boss 单发弹幕（×0.82）更低；约为 Boss 弹幕 58% 伤害。 */
export const BOSS_OCTOPUS_JELLYFISH_MINION_BULLET_DAMAGE_RATIO = 0.4;
export const BOSS_OCTOPUS_JELLYFISH_MINION_BULLET_LIFE_MIN = 1.05;
export const BOSS_OCTOPUS_JELLYFISH_MINION_BULLET_LIFE_MAX = 1.38;

const bossMinionSheetBySpriteKey: Partial<Record<string, SpriteSheetPreviewAssetId>> = {
  [BOSS_OCTOPUS_JELLYFISH_MINION_SPRITE_KEY]: BOSS_OCTOPUS_JELLYFISH_IDLE_ASSET_ID,
};

export function getBossMinionSheetAssetId(spriteKey: string): SpriteSheetPreviewAssetId | null {
  return bossMinionSheetBySpriteKey[spriteKey] ?? null;
}

export function getBossBulletSpriteKey(bossId: string, form: 1 | 2): string {
  if (bossId === 'boss_alien_03' && form === 2) {
    return BOSS_MARSHMALLOW_STAGE2_BOMB_SPRITE_KEY;
  }
  return 'bossBullet';
}

export function getBossBulletSheetAssetId(bossId: string, form: 1 | 2): SpriteSheetPreviewAssetId | null {
  if (bossId === 'boss_alien_03' && form === 2) {
    return BOSS_MARSHMALLOW_STAGE2_BOMB_ASSET_ID;
  }
  return null;
}

export function bossHasDualForm(bossId: string): boolean {
  return bossId === 'boss_alien_03';
}

export function getBossFormIdleAssetId(bossId: string, form: 1 | 2): SpriteSheetPreviewAssetId {
  if (bossId === 'boss_alien_03') {
    return form === 2 ? 'boss03MarshmallowIdleStage2' : 'boss03MarshmallowIdle';
  }
  return getBossAnimationAssetIdForBoss(bossId, 'idle');
}

export function getBossFormHittedAssetId(bossId: string, form: 1 | 2): SpriteSheetPreviewAssetId {
  if (bossId === 'boss_alien_03') {
    return form === 2 ? 'boss03MarshmallowStage2Hitted' : 'boss03MarshmallowStage1Hitted';
  }
  return getBossAnimationAssetIdForBoss(bossId, 'hitted');
}

export function getBossFormFrozenAssetId(bossId: string, form: 1 | 2): SpriteSheetPreviewAssetId {
  if (bossId === 'boss_alien_03') {
    return form === 2 ? 'boss03MarshmallowStage2Frozen' : 'boss03MarshmallowStage1Frozen';
  }
  return getBossAnimationAssetIdForBoss(bossId, 'frozen');
}

export function resolveBossAnimationAssetId(
  bossId: string,
  animationId: BossAnimationId,
  form: 1 | 2,
): SpriteSheetPreviewAssetId {
  if (bossHasDualForm(bossId)) {
    if (animationId === 'idle') {
      return getBossFormIdleAssetId(bossId, form);
    }
    // Stage 2 attack sheet not ready — reuse stage 2 idle until dedicated attack is imported.
    if (bossId === 'boss_alien_03' && form === 2 && animationId === 'attack') {
      return getBossFormIdleAssetId(bossId, 2);
    }
    if (animationId === 'hitted') {
      return getBossFormHittedAssetId(bossId, form);
    }
    if (animationId === 'frozen') {
      return getBossFormFrozenAssetId(bossId, form);
    }
  }
  return getBossAnimationAssetIdForBoss(bossId, animationId);
}

const bossAnimationOverridesByBossId: Partial<Record<string, Partial<Record<BossAnimationId, SpriteSheetPreviewAssetId>>>> = {
  boss_octopus_02: {
    idle: 'boss02OctopusIdle',
    attack: 'boss02OctopusAttack',
    dizziness: 'boss02OctopusDizziness',
    hitted: 'boss02OctopusHitted',
    dead: 'boss02OctopusDead',
    frozen: 'boss02OctopusFrozen',
  },
  boss_alien_03: {
    idle: 'boss03MarshmallowIdle',
    attack: 'boss03MarshmallowStage1Attack',
    hitted: 'boss03MarshmallowStage1Hitted',
    dizziness: 'boss03MarshmallowStage1Dizziness',
    frozen: 'boss03MarshmallowStage1Frozen',
    switchStage: 'boss03MarshmallowSwitchStage',
    dead: 'boss03MarshmallowDead',
  },
};

export function getBossAnimationAssetIdForBoss(bossId: string, animationId: BossAnimationId): SpriteSheetPreviewAssetId {
  const overrides = bossAnimationOverridesByBossId[bossId];
  return overrides?.[animationId] ?? bossAnimationAssets[animationId];
}

export function getBossAnimationAssetId(levelId: LevelId, animationId: BossAnimationId): SpriteSheetPreviewAssetId {
  return getBossAnimationAssetIdForBoss(getLevelConfig(levelId).boss.id, animationId);
}

export function getSpritePreviewBossGroup(bossId: SpritePreviewBossId): SpritePreviewBossGroup {
  return spritePreviewBossGroups.find((group) => group.id === bossId) || spritePreviewBossGroups[0];
}

export function getSpritePreviewBossForAsset(assetId: SpriteSheetPreviewAssetId): SpritePreviewBossId {
  return spritePreviewBossGroups.find((group) => group.assetIds.includes(assetId))?.id || spritePreviewBossGroups[0].id;
}

export function getSpritePreviewAssetsForBoss(bossId: SpritePreviewBossId): SpriteSheetPreviewAsset[] {
  return getSpritePreviewBossGroup(bossId).assetIds.map((assetId) => getSpritePreviewAsset(assetId));
}

/** 配置 BossId（`boss_alien_01` 等）→ Debug / 图集分组 Id。 */
export function getSpritePreviewBossIdForConfigBoss(bossId: string): SpritePreviewBossId {
  if (bossId === 'boss_octopus_02') {
    return 'boss02Octopus';
  }
  if (bossId === 'boss_alien_03') {
    return 'boss03Marshmallow';
  }
  return 'boss01Alien';
}

/** 战斗受击 FX 仍共用 L1 Alien 图集；按关加载时补上缺失条目。 */
export const SHARED_BOSS_BATTLE_FX_ASSET_IDS: readonly SpriteSheetPreviewAssetId[] = [
  'boss01AlienHitFx',
  'boss01AlienFrozenHitFx',
];

/** 开局按关：该 Boss 图集 + 共用受击 FX（已缓存的跳过）。 */
export function getBossBattleSheetAssetsForConfigBoss(bossId: string): SpriteSheetPreviewAsset[] {
  const previewBossId = getSpritePreviewBossIdForConfigBoss(bossId);
  const seen = new Set<SpriteSheetPreviewAssetId>();
  const assets: SpriteSheetPreviewAsset[] = [];
  for (const asset of getSpritePreviewAssetsForBoss(previewBossId)) {
    if (seen.has(asset.id)) {
      continue;
    }
    seen.add(asset.id);
    assets.push(asset);
  }
  for (const fxId of SHARED_BOSS_BATTLE_FX_ASSET_IDS) {
    if (seen.has(fxId)) {
      continue;
    }
    seen.add(fxId);
    assets.push(getSpritePreviewAsset(fxId));
  }
  return assets;
}

export function getSpritePreviewAssetShortLabel(asset: SpriteSheetPreviewAsset): string {
  return asset.label
    .replace(/^Boss Alien /, '')
    .replace(/^Boss Octopus /, '')
    .replace(/^Boss 03 Marshmallow /, '')
    .replace(/^Boss /, '');
}

export function getSpritePreviewAsset(assetId: SpriteSheetPreviewAssetId): SpriteSheetPreviewAsset {
  return spriteSheetPreviewAssets.find((asset) => asset.id === assetId) || spriteSheetPreviewAssets[0];
}
