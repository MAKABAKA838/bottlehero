import { Node, Sprite, SpriteFrame } from 'cc';
import type { BottleHeroBalanceConfig, TimingPointTierId, TimingTargetKind } from './BottleHeroBalance';

export type HitKind = 'perfect' | 'good' | 'miss';
export type GameState = 'loading' | 'title' | 'avatarselect' | 'avatarhome' | 'playing' | 'paused' | 'handselect' | 'gameover' | 'bossvictory';
export type TimingPointSize = 'small' | 'medium' | 'large';
export type DebugPage = 'STAGE' | 'STABILITY' | 'ITEMS' | 'POINTS' | 'COMBO' | 'BOSS' | 'MONITOR' | 'PRESETS';
export type DebugStageField = 'durationSeconds' | 'handleSpeed' | 'handleVariance' | 'targetCountMin' | 'targetCountMax' | 'rewardPenaltyBias' | 'missStabilityPenalty' | 'bombStabilityPenalty';
export type DebugStabilityField = keyof BottleHeroBalanceConfig['stability'];
export type DebugComboField = keyof BottleHeroBalanceConfig['combo'];
export type DebugBossField = keyof BottleHeroBalanceConfig['boss'];
export type DebugPointTierField = 'score' | 'baseWeight';
export type DebugDynamicField = keyof BottleHeroBalanceConfig['dynamic'];
export type DebugLanguage = 'zh' | 'en';
export type TimingTrackShape = 'line' | 'circle' | 'triangle' | 'path' | 'star' | 'infinity';
export type BackgroundSegmentKind = 'levelIntro' | 'loopOnce' | 'baseLoop' | 'scene03Bridge' | 'scene03Loop' | 'scene04Bridge' | 'scene04Loop';
export type AmbientActorKind = 'bee' | 'bird' | 'alien' | 'fish' | 'candy';
export type AmbientCandyFlightBand = 'low' | 'mid' | 'high';
export type AmbientActorDepth = 'back' | 'front';
export type HandPreference = 'left' | 'right';
export type HandChoiceReturnState = 'playing' | 'paused' | 'avatarselect';
export type BossAnimationId = 'idle' | 'attack' | 'hitted' | 'dead' | 'dizziness' | 'frozen' | 'switchStage';
export type BossFxId = 'hit' | 'frozenHit';
export type SpriteSheetPreviewAssetId =
  | 'boss01AlienIdle'
  | 'boss01AlienAttack'
  | 'boss01AlienDead'
  | 'boss01AlienDizziness'
  | 'boss01AlienHitted'
  | 'boss01AlienFrozen'
  | 'boss01AlienHitFx'
  | 'boss01AlienFrozenHitFx'
  | 'boss02OctopusIdle'
  | 'boss02OctopusAttack'
  | 'boss02OctopusDizziness'
  | 'boss02OctopusHitted'
  | 'boss02OctopusDead'
  | 'boss02OctopusFrozen'
  | 'boss02JellyfishIdle'
  | 'boss03MarshmallowIdle'
  | 'boss03MarshmallowIdleStage2'
  | 'boss03MarshmallowSwitchStage'
  | 'boss03MarshmallowStage1Attack'
  | 'boss03MarshmallowStage1Hitted'
  | 'boss03MarshmallowStage2Hitted'
  | 'boss03MarshmallowStage1Frozen'
  | 'boss03MarshmallowStage2Frozen'
  | 'boss03MarshmallowStage1Dizziness'
  | 'boss03MarshmallowStage2Bomb'
  | 'boss03MarshmallowDead';

export type CoreAudioClipKey = 'bgm' | 'throw' | 'perfect' | 'good' | 'miss';

/** Hold-then-thaw playback for boss frozen animations (frame 0 = encased, tail = thaw). */
export interface SpriteSheetFrozenPlayback {
  holdFrameIndex: number;
  thawFrameIndices: number[];
}

export interface SpriteSheetPreviewAsset {
  id: SpriteSheetPreviewAssetId;
  label: string;
  file: string;
  columns: number;
  frameCount: number;
  fps: number;
  frameWidth: number;
  frameHeight: number;
  displayWidth: number;
  /** 独立帧文件列表；设置后按顺序加载整图，不再对 `file` 做网格切割。 */
  frameFiles?: string[];
  /** When set, only these grid cell indices are exported as animation frames (row-major). */
  frameCellIndices?: number[];
  /** When set, frozen anim holds `holdFrameIndex` until the trailing thaw window, then plays `thawFrameIndices` once. */
  frozenPlayback?: SpriteSheetFrozenPlayback;
}

export interface BossBulletState {
  node: Node;
  sprite: Sprite;
  targetIndex: number;
  life: number;
  maxLife: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  damage: number;
  frames: SpriteFrame[];
  frameIndex: number;
  frameTimer: number;
  fps: number;
}

export interface BossMinionState {
  node: Node;
  sprite: Sprite;
  hp: number;
  phase: number;
  attackCooldown: number;
  shootsBullets: boolean;
  frames: SpriteFrame[];
  frameIndex: number;
  frameTimer: number;
  fps: number;
}

export interface BossFxState {
  node: Node;
  sprite: Sprite;
  frames: SpriteFrame[];
  frameIndex: number;
  frameTimer: number;
  fps: number;
}

export interface TextureMap {
  [key: string]: SpriteFrame;
}

export interface ThrowBottleState {
  node: Node;
  onIntercept: () => void;
  intercepted: boolean;
}

export interface BackgroundSegmentState {
  node: Node;
  kind: BackgroundSegmentKind;
  startY: number;
  height: number;
}

export interface AmbientActorState {
  node: Node;
  sprite: Sprite;
  kind: AmbientActorKind;
  depth: AmbientActorDepth;
  variant?: string;
  direction: number;
  speed: number;
  baseY: number;
  amplitude: number;
  phase: number;
  life: number;
  maxLife: number;
  baseScale: number;
  rotationAmplitude: number;
  verticalDrift: number;
}

export interface TimingTargetState {
  node: Node;
  highlightGlowNode: Node;
  highlightGlowSprite: Sprite;
  highlightNode: Node;
  highlightSprite: Sprite;
  kind: TimingTargetKind;
  pointTier: TimingPointTierId | null;
  scoreValue: number;
  size: TimingPointSize;
  x: number;
  y: number;
  angle: number;
  perfectRadius: number;
  goodRadius: number;
  highlightActive: boolean;
}

export interface TimingPathPoint {
  x: number;
  y: number;
}

export const debugPages: DebugPage[] = ['STAGE', 'STABILITY', 'ITEMS', 'POINTS', 'COMBO', 'BOSS', 'MONITOR', 'PRESETS'];
