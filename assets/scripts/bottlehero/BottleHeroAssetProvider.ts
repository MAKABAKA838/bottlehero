import { AudioClip, SpriteFrame } from 'cc';
import { bottleHeroWebPaths } from './BottleHeroAssets';
import type { LevelId } from './BottleHeroGameConfig';
import type { SpriteSheetFrameCache } from './BottleHeroResourceLoader';
import { BossAnimationId, BossFxId, CoreAudioClipKey, HitKind, SpriteSheetPreviewAsset } from './BottleHeroTypes';

/** Web 相对路径（带扩展名），与 `sfxClips` 键名一致。 */
export const BottleHeroSfxPaths = {
  recoverStability: 'audio/recover_stability.m4a',
  timingItemBomb: 'audio/timing_item_bomb.m4a',
  button: 'audio/button.m4a',
  avatarHomeBgm: 'audio/avatar_home_bgm.m4a',
  bossFightingBgm: 'audio/boss_fighting_bgm.mp3',
  bossWarning: 'audio/boss_warning.mp3',
  bossBulletAttack: 'audio/boss_bullet_attack.mp3',
  bossHitted: 'audio/boss_hitted.mp3',
  bossFrozened: 'audio/boss_frozened.mp3',
  bossDead: 'audio/boss_dead.mp3',
  rewardIcon: 'audio/reward_icon.mp3',
} as const satisfies Record<string, (typeof bottleHeroWebPaths.sfx)[number]>;

export type BottleHeroSfxPath = (typeof bottleHeroWebPaths.sfx)[number];

export type CoreGameplayClipKey = CoreAudioClipKey | HitKind | 'throw';

export interface BottleHeroAssetPlayback {
  playOneShot(clip: AudioClip, volume: number): void;
}

/** 只读贴图访问：模块通过 key 取图，不直接依赖加载实现或整表 `TextureMap`。 */
export interface BottleHeroSpriteProvider {
  hasSprite(key: string): boolean;
  getSprite(key: string): SpriteFrame;
  getBottleFrames(): readonly SpriteFrame[];
  getStagedThrowFrames(): readonly SpriteFrame[];
  getComboDigitFrames(): readonly SpriteFrame[];
  getFeedbackFrames(kind: HitKind): readonly SpriteFrame[];
  getBossBulletFrames(bossId: string, form: 1 | 2): readonly SpriteFrame[];
  getBossMinionFrames(spriteKey: string): readonly SpriteFrame[];
}

/** 音效访问与一次性播放。 */
export interface BottleHeroAudioProvider {
  getCoreClip(name: CoreAudioClipKey): AudioClip | undefined;
  getSfxClip(webPath: string): AudioClip | undefined;
  playCoreClip(name: CoreGameplayClipKey): void;
  playSfx(webPath: string, volume: number): void;
}

/** 循环 BGM，由 Mvp 绑定 AudioSource 后注入。 */
export interface BottleHeroBgmProvider {
  playMainBgm(): void;
  stopMainBgm(): void;
  playAvatarHomeBgm(): void;
  stopAvatarHomeBgm(): void;
  playBossBgm(): void;
  stopBossBgm(): void;
  stopAllBgm(): void;
}

/** 命中反馈序列帧。 */
export interface BottleHeroFeedbackFxProvider {
  play(kind: HitKind | 'miss'): void;
}

export interface BottleHeroGameplayAssetProvider extends BottleHeroSpriteProvider, BottleHeroAudioProvider {}

/** 玩法模块统一入口：贴图、一次性音效、BGM、反馈特效。 */
export interface BottleHeroGameplayPresentation
  extends BottleHeroGameplayAssetProvider, BottleHeroBgmProvider, BottleHeroFeedbackFxProvider {}

export interface BossSheetSink {
  setAnimationFrame(animationId: BossAnimationId, frames: SpriteFrame[]): void;
  setBossFormIdleFrames?(form: 1 | 2, frames: SpriteFrame[]): void;
  setBossFormHittedFrames?(form: 1 | 2, frames: SpriteFrame[]): void;
  setBossFormFrozenFrames?(form: 1 | 2, frames: SpriteFrame[]): void;
  setFxFrame(fxId: BossFxId, frames: SpriteFrame[]): void;
}

export type AssetLoadStep = <T>(label: string, task: () => Promise<T>) => Promise<T>;

export interface LoadRuntimeAssetsOptions {
  step: AssetLoadStep;
}

export interface EnsureLevelVisualAssetsOptions {
  bossId?: string;
  bossSheetSink?: BossSheetSink;
}

export interface BottleHeroAssetLoader {
  bindBossBattleAnimations(bossId: string, bossSheetSink: BossSheetSink): void;
  loadAll(options: LoadRuntimeAssetsOptions): Promise<void>;
  loadLevelBackgroundSprites(levelId: LevelId): Promise<void>;
  loadLevelAmbientSprites(levelId: LevelId): Promise<void>;
  loadOptionalWorldAssetsInBackground(levelId?: LevelId): Promise<void>;
  loadControlArtInBackground(onPlayerArmLoaded?: (frame: SpriteFrame) => void): Promise<void>;
  loadStagedThrowFramesInBackground(): Promise<void>;
  reloadStagedThrowFrames(): Promise<void>;
  ensureBossBattleAssets(bossId: string, bossSheetSink?: BossSheetSink): Promise<void>;
  ensureLevelVisualAssets(levelId: LevelId, options?: EnsureLevelVisualAssetsOptions): Promise<void>;
  loadAudioClipsInBackground(onBgmReady?: () => void): Promise<void>;
  loadComboDigitsInBackground(): Promise<void>;
  getSpritePreviewFrameCache(): SpriteSheetFrameCache;
  loadSpriteSheetPreview(asset: SpriteSheetPreviewAsset): Promise<SpriteFrame[]>;
}

export class BottleHeroGameplayPresentationAdapter implements BottleHeroGameplayPresentation {
  constructor(
    private readonly assets: BottleHeroGameplayAssetProvider,
    private readonly bgm: BottleHeroBgmProvider,
    private readonly feedbackFx: BottleHeroFeedbackFxProvider,
  ) {}

  hasSprite(key: string) {
    return this.assets.hasSprite(key);
  }

  getSprite(key: string) {
    return this.assets.getSprite(key);
  }

  getBottleFrames() {
    return this.assets.getBottleFrames();
  }

  getStagedThrowFrames() {
    return this.assets.getStagedThrowFrames();
  }

  getComboDigitFrames() {
    return this.assets.getComboDigitFrames();
  }

  getFeedbackFrames(kind: HitKind) {
    return this.assets.getFeedbackFrames(kind);
  }

  getBossBulletFrames(bossId: string, form: 1 | 2) {
    return this.assets.getBossBulletFrames(bossId, form);
  }

  getBossMinionFrames(spriteKey: string) {
    return this.assets.getBossMinionFrames(spriteKey);
  }

  getCoreClip(name: CoreAudioClipKey) {
    return this.assets.getCoreClip(name);
  }

  getSfxClip(webPath: string) {
    return this.assets.getSfxClip(webPath);
  }

  playCoreClip(name: CoreGameplayClipKey) {
    this.assets.playCoreClip(name);
  }

  playSfx(webPath: string, volume: number) {
    this.assets.playSfx(webPath, volume);
  }

  playMainBgm() {
    this.bgm.playMainBgm();
  }

  stopMainBgm() {
    this.bgm.stopMainBgm();
  }

  playAvatarHomeBgm() {
    this.bgm.playAvatarHomeBgm();
  }

  stopAvatarHomeBgm() {
    this.bgm.stopAvatarHomeBgm();
  }

  playBossBgm() {
    this.bgm.playBossBgm();
  }

  stopBossBgm() {
    this.bgm.stopBossBgm();
  }

  stopAllBgm() {
    this.bgm.stopAllBgm();
  }

  play(kind: HitKind | 'miss') {
    this.feedbackFx.play(kind);
  }
}
