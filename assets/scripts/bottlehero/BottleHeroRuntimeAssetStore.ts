import { AudioClip, SpriteFrame } from 'cc';
import { toResourcesPath } from './BottleHeroAssetPaths';
import {
  BottleHeroAssetLoader,
  BottleHeroAssetPlayback,
  BottleHeroGameplayAssetProvider,
  BossSheetSink,
  CoreGameplayClipKey,
  EnsureLevelVisualAssetsOptions,
  LoadRuntimeAssetsOptions,
} from './BottleHeroAssetProvider';
import {
  getBossAnimationAssetIdForBoss,
  getBossBattleSheetAssetsForConfigBoss,
  getBossBulletSheetAssetId,
  getBossBulletSpriteKey,
  getBossFormFrozenAssetId,
  getBossFormHittedAssetId,
  getBossFormIdleAssetId,
  getBossMinionSheetAssetId,
  BOSS_MARSHMALLOW_STAGE2_BOMB_SPRITE_KEY,
  BOSS_OCTOPUS_JELLYFISH_IDLE_ASSET_ID,
  BOSS_OCTOPUS_JELLYFISH_MINION_SPRITE_KEY,
} from './BottleHeroBossAssets';
import { BottleHeroAssets, bottleHeroWebPaths } from './BottleHeroAssets';
import { getStagedThrowItemFiles } from './BottleHeroAvatarRuntime';
import { getBootRuntimeSpriteLoadEntries, coreAudioLoadEntries, coreAudioResourcePaths } from './BottleHeroRuntimeAssetManifest';
import { ensureBottleHeroLevelPackages } from './BottleHeroPlatform';
import { bottleHeroCocosResourceLoader,
  type BottleHeroResourceLoaderBackend,
  type SpriteSheetFrameCache,
} from './BottleHeroResourceLoader';
import { getLevelBackgroundSpriteEntries, getLevelConfig, getActiveLevelConfig } from './BottleHeroConfigLoader';
import { getLevelAmbientSpriteEntries, playableBossIds, playableLevelIds, type LevelId } from './BottleHeroGameConfig';
import { BossAnimationId, CoreAudioClipKey, HitKind, SpriteSheetPreviewAsset, TextureMap } from './BottleHeroTypes';

const numberDigitFiles = bottleHeroWebPaths.comboDigits;
const htmlSoundFiles = bottleHeroWebPaths.sfx;

export class BottleHeroRuntimeAssetStore implements BottleHeroGameplayAssetProvider, BottleHeroAssetLoader {
  constructor(private readonly loader: BottleHeroResourceLoaderBackend = bottleHeroCocosResourceLoader) {}

  private readonly sprites: TextureMap = {};
  private readonly levelBackgroundSprites: Partial<Record<LevelId, Record<string, SpriteFrame>>> = {};
  private readonly stagedThrowFramesByLevel: Partial<Record<LevelId, SpriteFrame[]>> = {};
  private bottleFrames: SpriteFrame[] = [];
  private stagedThrowFrames: SpriteFrame[] = [];
  private comboDigitFrames: SpriteFrame[] = [];
  private readonly feedbackFrames: Record<HitKind, SpriteFrame[]> = {
    perfect: [],
    good: [],
    miss: [],
  };
  private readonly clips: Partial<Record<CoreAudioClipKey, AudioClip>> = {};
  private readonly sfxClips: Record<string, AudioClip> = {};
  private readonly spritePreviewFrameCache: SpriteSheetFrameCache = {};
  private playback: BottleHeroAssetPlayback | null = null;

  bindPlayback(playback: BottleHeroAssetPlayback) {
    this.playback = playback;
  }

  getSpritePreviewFrameCache(): SpriteSheetFrameCache {
    return this.spritePreviewFrameCache;
  }

  hasSprite(key: string): boolean {
    const frame = this.sprites[key];
    return Boolean(frame?.texture);
  }

  getSprite(key: string): SpriteFrame {
    return this.sprites[key] || new SpriteFrame();
  }

  getBottleFrames(): readonly SpriteFrame[] {
    return this.bottleFrames;
  }

  getStagedThrowFrames(): readonly SpriteFrame[] {
    return this.stagedThrowFrames;
  }

  getComboDigitFrames(): readonly SpriteFrame[] {
    return this.comboDigitFrames;
  }

  getFeedbackFrames(kind: HitKind): readonly SpriteFrame[] {
    return this.feedbackFrames[kind];
  }

  getBossBulletFrames(bossId: string, form: 1 | 2): readonly SpriteFrame[] {
    const sheetAssetId = getBossBulletSheetAssetId(bossId, form);
    if (sheetAssetId) {
      return this.spritePreviewFrameCache[sheetAssetId] ?? [];
    }
    const frame = this.sprites[getBossBulletSpriteKey(bossId, form)];
    return frame?.texture ? [frame] : [];
  }

  getBossMinionFrames(spriteKey: string): readonly SpriteFrame[] {
    const sheetAssetId = getBossMinionSheetAssetId(spriteKey);
    if (sheetAssetId) {
      return this.spritePreviewFrameCache[sheetAssetId] ?? [];
    }
    const frame = this.sprites[spriteKey];
    return frame?.texture ? [frame] : [];
  }

  getCoreClip(name: CoreAudioClipKey): AudioClip | undefined {
    return this.clips[name];
  }

  getSfxClip(webPath: string): AudioClip | undefined {
    return this.sfxClips[webPath];
  }

  playCoreClip(name: CoreGameplayClipKey) {
    const clip = this.clips[name as CoreAudioClipKey];
    if (!clip || !this.playback) {
      return;
    }
    this.playback.playOneShot(clip, name === 'throw' ? 0.65 : 0.85);
  }

  playSfx(webPath: string, volume: number) {
    const clip = this.sfxClips[webPath];
    if (!clip || !this.playback) {
      return;
    }
    this.playback.playOneShot(clip, volume);
  }

  async loadLevelBackgroundSprites(levelId: LevelId): Promise<void> {
    for (const [key, label, fileName] of getLevelBackgroundSpriteEntries(levelId)) {
      try {
        const frame = await this.loader.loadRemoteSprite(fileName);
        if (!this.levelBackgroundSprites[levelId]) {
          this.levelBackgroundSprites[levelId] = {};
        }
        this.levelBackgroundSprites[levelId]![key] = frame;
      } catch (error) {
        console.warn(`BottleHero level background failed (${levelId}): ${label}`, fileName, error);
      }
    }
    this.applyLevelBackgroundSprites(levelId);
  }

  applyLevelBackgroundSprites(levelId: LevelId): void {
    const cached = this.levelBackgroundSprites[levelId];
    if (!cached) {
      return;
    }
    for (const [key, frame] of Object.entries(cached)) {
      this.sprites[key] = frame;
    }
  }

  async loadLevelAmbientSprites(levelId: LevelId): Promise<void> {
    for (const [key, label, fileName] of getLevelAmbientSpriteEntries(levelId)) {
      try {
        this.sprites[key] = await this.loader.loadRemoteSprite(fileName);
      } catch (error) {
        console.warn(`BottleHero level ambient failed (${levelId}): ${label}`, fileName, error);
      }
    }
  }

  /** 开局按关：分包占位 + 切换背景/投掷缓存 + 绑定 Boss 动画（资源已在 Loading 预载）。 */
  async ensureLevelVisualAssets(levelId: LevelId, options?: EnsureLevelVisualAssetsOptions): Promise<void> {
    await ensureBottleHeroLevelPackages(levelId);
    this.applyLevelBackgroundSprites(levelId);
    this.applyStagedThrowFrames(levelId);
    const bossId = options?.bossId ?? getLevelConfig(levelId).boss.id;
    await this.ensureBossBattleAssets(bossId, options?.bossSheetSink);
  }

  applyStagedThrowFrames(levelId: LevelId): void {
    const cached = this.stagedThrowFramesByLevel[levelId];
    if (cached?.length) {
      this.stagedThrowFrames = cached;
    }
  }

  /** 按配置 BossId 加载图集（已缓存帧跳过）；可选绑定到战场 sink。 */
  async ensureBossBattleAssets(bossId: string, bossSheetSink?: BossSheetSink): Promise<void> {
    for (const asset of getBossBattleSheetAssetsForConfigBoss(bossId)) {
      if (this.spritePreviewFrameCache[asset.id]?.length) {
        continue;
      }
      try {
        await this.loader.loadSpriteSheetPreviewFrames(asset, this.spritePreviewFrameCache);
      } catch (error) {
        console.warn(`BottleHero boss sheet failed (${bossId}):`, asset.label, error);
      }
    }
    this.applyBossDerivedSprites();
    if (bossSheetSink) {
      this.bindBossBattleAnimations(bossId, bossSheetSink);
    }
  }

  async loadAll(options: LoadRuntimeAssetsOptions): Promise<void> {
    const { step } = options;
    const remoteSpriteEntries = getBootRuntimeSpriteLoadEntries();
    const audioEntries = coreAudioLoadEntries;

    for (const [key, label, fileName] of remoteSpriteEntries) {
      this.sprites[key] = await step(label, () => this.loader.loadRemoteSprite(fileName));
    }

    for (const levelId of playableLevelIds) {
      for (const [key, label, fileName] of getLevelBackgroundSpriteEntries(levelId)) {
        const frame = await step(`${levelId} ${label}`, () => this.loader.loadRemoteSprite(fileName));
        if (!this.levelBackgroundSprites[levelId]) {
          this.levelBackgroundSprites[levelId] = {};
        }
        this.levelBackgroundSprites[levelId]![key] = frame;
      }
    }
    this.applyLevelBackgroundSprites('level_01');

    for (const levelId of playableLevelIds) {
      for (const [key, label, fileName] of getLevelAmbientSpriteEntries(levelId)) {
        this.sprites[key] = await step(`${levelId} ${label}`, () => this.loader.loadRemoteSprite(fileName));
      }
    }

    for (const levelId of playableLevelIds) {
      const frames: SpriteFrame[] = [];
      for (const fileName of getLevelConfig(levelId).throwItems) {
        const frame = await step(`${levelId} throw`, () => this.loader.loadRemoteSprite(fileName));
        frames.push(frame);
      }
      this.stagedThrowFramesByLevel[levelId] = frames;
    }
    this.applyStagedThrowFrames('level_01');

    const loadedBossSheetIds = new Set<string>();
    for (const bossId of playableBossIds) {
      for (const asset of getBossBattleSheetAssetsForConfigBoss(bossId)) {
        if (loadedBossSheetIds.has(asset.id)) {
          continue;
        }
        loadedBossSheetIds.add(asset.id);
        await step(`Boss ${asset.label}`, () => this.loader.loadSpriteSheetPreviewFrames(asset, this.spritePreviewFrameCache));
      }
    }
    this.applyBossDerivedSprites();

    this.bottleFrames = await step('Base throw items', () => this.loader.loadSpriteList(BottleHeroAssets.textures.bottles));
    this.stagedThrowFrames = [];
    this.comboDigitFrames = [];
    for (const fileName of numberDigitFiles) {
      const frame = await step(`Combo ${fileName}`, () => this.loader.loadRemoteSprite(fileName));
      this.comboDigitFrames.push(frame);
    }
    for (const [key, label, path] of audioEntries) {
      await step(label, async () => {
        try {
          const clip = await this.loader.loadAudio(path);
          this.clips[key] = clip;
          return clip;
        } catch (error) {
          console.warn('BottleHero core audio missing, continuing:', path, error);
          return undefined;
        }
      });
    }
    for (const fileName of htmlSoundFiles) {
      await step(`SFX ${fileName}`, async () => {
        try {
          const clip = await this.loader.loadAudio(toResourcesPath(fileName));
          this.sfxClips[fileName] = clip;
          return clip;
        } catch (error) {
          console.warn('BottleHero SFX missing, continuing:', fileName, error);
          return undefined;
        }
      });
    }
    this.feedbackFrames.perfect = await step('Perfect effect', () => this.loader.loadSpriteList(BottleHeroAssets.feedback.perfect));
    this.feedbackFrames.good = await step('Good effect', () => this.loader.loadSpriteList(BottleHeroAssets.feedback.good));
    this.feedbackFrames.miss = await step('Miss effect', () => this.loader.loadSpriteList(BottleHeroAssets.feedback.miss));
  }

  async loadSpriteSheetPreview(asset: SpriteSheetPreviewAsset): Promise<SpriteFrame[]> {
    return this.loader.loadSpriteSheetPreviewFrames(asset, this.spritePreviewFrameCache);
  }

  bindBossBattleAnimations(bossId: string, bossSheetSink: BossSheetSink): void {
    const bossAnimationIds: BossAnimationId[] = ['idle', 'attack', 'hitted', 'dead', 'dizziness', 'frozen', 'switchStage'];
    for (const animationId of bossAnimationIds) {
      const previewId = getBossAnimationAssetIdForBoss(bossId, animationId);
      const frames = this.spritePreviewFrameCache[previewId];
      if (frames?.length) {
        bossSheetSink.setAnimationFrame(animationId, frames);
      }
    }
    if (bossId === 'boss_alien_03' && bossSheetSink.setBossFormIdleFrames) {
      const form1Frames = this.spritePreviewFrameCache[getBossFormIdleAssetId(bossId, 1)];
      if (form1Frames?.length) {
        bossSheetSink.setBossFormIdleFrames(1, form1Frames);
      }
      const form2Frames = this.spritePreviewFrameCache[getBossFormIdleAssetId(bossId, 2)];
      if (form2Frames?.length) {
        bossSheetSink.setBossFormIdleFrames(2, form2Frames);
      }
    }
    if (bossId === 'boss_alien_03' && bossSheetSink.setBossFormHittedFrames) {
      const form1HittedFrames = this.spritePreviewFrameCache[getBossFormHittedAssetId(bossId, 1)];
      if (form1HittedFrames?.length) {
        bossSheetSink.setBossFormHittedFrames(1, form1HittedFrames);
      }
      const form2HittedFrames = this.spritePreviewFrameCache[getBossFormHittedAssetId(bossId, 2)];
      if (form2HittedFrames?.length) {
        bossSheetSink.setBossFormHittedFrames(2, form2HittedFrames);
      }
    }
    if (bossId === 'boss_alien_03' && bossSheetSink.setBossFormFrozenFrames) {
      const form1FrozenFrames = this.spritePreviewFrameCache[getBossFormFrozenAssetId(bossId, 1)];
      if (form1FrozenFrames?.length) {
        bossSheetSink.setBossFormFrozenFrames(1, form1FrozenFrames);
      }
      const form2FrozenFrames = this.spritePreviewFrameCache[getBossFormFrozenAssetId(bossId, 2)];
      if (form2FrozenFrames?.length) {
        bossSheetSink.setBossFormFrozenFrames(2, form2FrozenFrames);
      }
    }
    const hitFrames = this.spritePreviewFrameCache.boss01AlienHitFx;
    if (hitFrames?.length) {
      bossSheetSink.setFxFrame('hit', hitFrames);
    }
    const frozenHitFrames = this.spritePreviewFrameCache.boss01AlienFrozenHitFx;
    if (frozenHitFrames?.length) {
      bossSheetSink.setFxFrame('frozenHit', frozenHitFrames);
    }
  }

  private applyBossDerivedSprites() {
    const stage2BombFrames = this.spritePreviewFrameCache.boss03MarshmallowStage2Bomb;
    if (stage2BombFrames?.[0]) {
      this.sprites[BOSS_MARSHMALLOW_STAGE2_BOMB_SPRITE_KEY] = stage2BombFrames[0];
    }
    const jellyfishFrames = this.spritePreviewFrameCache[BOSS_OCTOPUS_JELLYFISH_IDLE_ASSET_ID];
    if (jellyfishFrames?.[0]) {
      this.sprites[BOSS_OCTOPUS_JELLYFISH_MINION_SPRITE_KEY] = jellyfishFrames[0];
    }
  }

  async loadAudioClipsInBackground(onBgmReady?: () => void) {
    for (const [key, path] of coreAudioResourcePaths) {
      try {
        this.clips[key] = await this.loader.loadAudio(path);
        if (key === 'bgm') {
          onBgmReady?.();
        }
      } catch (error) {
        console.warn('BottleHero audio failed:', path, error);
      }
    }
  }

  async loadComboDigitsInBackground() {
    const frames: SpriteFrame[] = [];
    for (const fileName of numberDigitFiles) {
      try {
        frames.push(await this.loader.loadRemoteSprite(fileName));
      } catch (error) {
        console.warn('BottleHero combo digit failed:', fileName, error);
        return;
      }
    }
    this.comboDigitFrames = frames;
  }

  async loadOptionalWorldAssetsInBackground(levelId: LevelId = 'level_01') {
    const levelBackgrounds = getLevelBackgroundSpriteEntries(levelId);
    const optionalSprites: Array<[string, string]> = levelBackgrounds
      .filter(([key]) => key !== 'levelBackground' && key !== 'titleBackground')
      .map(([key, , fileName]) => [key, fileName] as [string, string]);
    for (const [key, fileName] of optionalSprites) {
      if (this.sprites[key]) {
        continue;
      }
      try {
        this.sprites[key] = await this.loader.loadRemoteSprite(fileName);
      } catch (error) {
        console.warn('BottleHero optional world asset failed:', fileName, error);
      }
    }
  }

  async loadControlArtInBackground(onPlayerArmLoaded?: (frame: SpriteFrame) => void) {
    try {
      const playerArm = await this.loader.loadRemoteSprite('player/paw_right.png');
      this.sprites.playerArm = playerArm;
      onPlayerArmLoaded?.(playerArm);
    } catch (error) {
      console.warn('BottleHero player paw failed:', error);
    }

    try {
      this.sprites.catNpc = await this.loader.loadRemoteSprite('player/cat_helper.png');
    } catch (error) {
      console.warn('BottleHero cat helper failed:', error);
    }
  }

  async reloadStagedThrowFrames(): Promise<void> {
    const levelId = getActiveLevelConfig().id;
    const frames: SpriteFrame[] = [];
    for (const fileName of getStagedThrowItemFiles()) {
      try {
        frames.push(await this.loader.loadRemoteSprite(fileName));
      } catch (error) {
        console.warn('BottleHero staged throw prop failed:', fileName, error);
      }
    }
    this.stagedThrowFramesByLevel[levelId] = frames;
    this.stagedThrowFrames = frames;
  }

  async loadStagedThrowFramesInBackground() {
    if (this.stagedThrowFrames.length) {
      return;
    }
    const frames: SpriteFrame[] = [];
    for (const fileName of getStagedThrowItemFiles()) {
      try {
        frames.push(await this.loader.loadRemoteSprite(fileName));
        this.stagedThrowFrames = frames.slice();
      } catch (error) {
        console.warn('BottleHero staged throw prop failed:', fileName, error);
      }
    }
  }
}
