import {
  _decorator,
  AudioClip,
  AudioSource,
  Button,
  Camera,
  Canvas,
  Color,
  Component,
  director,
  EditBox,
  Graphics,
  Label,
  Node,
  profiler,
  Sprite,
  SpriteFrame,
  sys,
  Tween,
  tween,
  UITransform,
  Vec3,
  view,
} from 'cc';
import { BottleHeroGameplayPresentation, BottleHeroGameplayPresentationAdapter, BottleHeroSfxPaths } from './BottleHeroAssetProvider';
import { isInternalToolsEnabled } from './BottleHeroBuildFlags';
import { BottleHeroAmbientController, type AmbientHost } from './BottleHeroAmbientController';
import { BottleHeroBackgroundController, type BackgroundHost } from './BottleHeroBackgroundController';
import { BottleHeroTimingController, type TimingHost } from './BottleHeroTimingController';
import { BottleHeroWorldTowerController, type WorldTowerHost } from './BottleHeroWorldTowerController';
import { BottleHeroThrowFxController, type ThrowFxHost } from './BottleHeroThrowFxController';
import { BottleHeroMobileNameInput, isMobileWebBrowser } from './BottleHeroMobileNameInput';
import { unlockBottleHeroAudio } from './BottleHeroPlatform';
import { BottleHeroBgmController } from './BottleHeroBgmController';
import { BottleHeroFeedbackFxPlayer } from './BottleHeroFeedbackFxPlayer';
import { BottleHeroRuntimeAssetStore } from './BottleHeroRuntimeAssetStore';
import { BottleHeroAvatarUiController, type AvatarUiHost } from './BottleHeroAvatarUi';
import { BottleHeroBossBattleController, type BossBattleHost } from './BottleHeroBossBattle';
import {
  BottleHeroDebugPanelController,
  styleDebugButton,
  type DebugPanelHost,
} from './BottleHeroDebugPanel';
import { submitLeaderboardScores } from './BottleHeroLeaderboardClient';
import {
  openFeedbackSurveyInBrowser,
  persistFeedbackRunStats as persistFeedbackRunStatsEntry,
  readBestScoreForFeedback,
} from './BottleHeroFeedbackEntry';
import {
  addPressScale,
  addTransform,
  clearNodeChildren,
  createLabel,
  createNode,
  createRectNode,
  createSpriteNode,
  createTextButton,
} from './BottleHeroUiFactory';
import { randomRange } from './BottleHeroMathUtil';
import { resolveBalanceConfig } from './BottleHeroBalanceConfigResolver';
import {
  computeDifficulty,
  getDifficultyRatio,
  getGoodTimingPointScore,
  getPerfectComboScore,
} from './BottleHeroTimingMath';
import {
  clampTowerDrift,
  getBottleLandingLocalY,
  getBottleSize,
  getBottleWorldPosition,
  getTowerCameraTargetWorldY,
  getTowerItemMaxHp,
  getTowerTopLocalY,
  keepTowerTopInView,
  pickThrowBottleFrame,
} from './BottleHeroTowerMath';
import {
  getSpritePreviewAsset,
  getSpritePreviewAssetShortLabel,
  getSpritePreviewAssetsForBoss,
  getSpritePreviewBossForAsset,
  getSpritePreviewBossGroup,
  spritePreviewBossGroups,
  spriteSheetPreviewAssets,
  type SpritePreviewBossId,
} from './BottleHeroBossAssets';
import {
  AvatarGoodsId,
  getLevelBackgroundProgression,
  playableLevelIds,
} from './BottleHeroGameConfig';
import { getActiveLevelRewards, getBossConfigById, getLevelConfig, loadGameConfigs, loadPackagedBalanceConfigForLevel, setActiveLevelId, ensureBossConfigLoaded } from './BottleHeroConfigLoader';
import type { AvatarId, BossId, LevelId } from './BottleHeroGameConfig';
import { playableBossIds } from './BottleHeroGameConfig';
import { getLevelUnlockedAfterBossWin, isLevelUnlocked, unlockLevel } from './BottleHeroLevelProgress';
import { getLastGrantedBossRewardGoods, grantRandomBossRewardGoods } from './BottleHeroAvatarGoodsUnlock';
import {
  getFullBootLoadStepCount,
} from './BottleHeroRuntimeAssetManifest';
import {
  applyBestScoreUrlOverride,
  clearStoredLevelBestScores,
  ensureLevelBestScoresMigrated,
  persistLevelBestScore,
  readRankingPlayerScore,
  readStoredLevelBestScore,
  readStoredTotalBestScore,
  setStoredLevelBestScore,
} from './BottleHeroLevelBestScores';
import {
  bottleHeroStorageKeys,
  clearDebugBalanceOverride,
  getDebugBalanceStorageKey,
  readStoredHandPreference,
  readStoredPlayerProfile,
  readStoredIntInRange,
  readStoredNumber,
  removeStored,
  clearStoredPlayerName,
  isValidPlayerName,
  shouldClearPlayerNameFromUrl,
  writeStoredPlayerName,
  writeStoredHandPreference,
  writeStoredString,
} from './BottleHeroStorage';
import {
  GameState,
  HandChoiceReturnState,
  HandPreference,
  HitKind,
  SpriteSheetPreviewAssetId,
  ThrowBottleState,
  TimingTargetState,
} from './BottleHeroTypes';
import {
  ActiveStageState,
  BalanceHitKind,
  BalanceStageConfig,
  BottleHeroBalanceConfig,
  defaultBottleHeroBalance,
  getCurrentStageState,
  getScoreTitle,
  getTimingItemDefinition,
  mergeBalanceConfig,
  SCORE_TITLE_BANDS,
  serializeBalanceConfig,
  TimingBarAnchorMode,
  TimingItemDefinition,
  TimingTargetKind,
  TimingTrackMode,
} from './BottleHeroBalance';

const { ccclass, property } = _decorator;

@ccclass('BottleHeroMvp')
export class BottleHeroMvp extends Component {
  @property
  designWidth = 864;

  @property
  designHeight = 1536;

  @property
  perfectWindow = 0.12;

  @property
  goodWindow = 0.36;

  @property
  missStabilityPenalty = 12;

  @property
  minChargeSeconds = 0.35;

  @property
  maxChargeSeconds = 2.2;

  @property
  timeoutSeconds = 2.8;

  @property
  bottleStepY = 118;

  @property
  timingHandleRange = 250;

  @property
  timingPointRange = 205;

  @property
  armBaseAngle = 48;

  @property
  armChargeAngle = 8;

  private state: GameState = 'loading';
  private rootCanvas!: Node;
  private cameraNode!: Node;
  private worldLayer!: Node;
  private bgLayer!: Node;
  private ambientBackLayer!: Node;
  private ambientFrontLayer!: Node;
  private bossLayer!: Node;
  private towerPivotLayer!: Node;
  private towerLayer!: Node;
  private missLayer!: Node;
  private throwFxLayer!: Node;
  private hudLayer!: Node;
  private loadingLayer!: Node;
  private loadingLabel!: Label;
  private titleLayer!: Node;
  private avatarSelectLayer!: Node;
  private avatarHomeLayer!: Node;
  private avatarPanelLayer!: Node;
  private pauseLayer!: Node;
  private pauseAnchorButton!: Node;
  private handChoiceLayer!: Node;
  private debugLayer!: Node;
  private debugPanel: BottleHeroDebugPanelController | null = null;
  private spritePreviewLayer!: Node;
  private spritePreviewStage!: Node;
  private spritePreviewSprite!: Sprite;
  private spritePreviewStatusLabel!: Label;
  private spritePreviewBossSelectLabel!: Label;
  private spritePreviewAssetSelectLabel!: Label;
  private spritePreviewBossMenuLayer!: Node;
  private spritePreviewAssetMenuLayer!: Node;
  private localDebugConfigActive = false;
  private handPreferenceSaved = false;
  private gameOverLayer!: Node;
  private bossWarningNode!: Node;
  private bossHudLayer!: Node;
  private bossNode!: Node;
  private bossSprite!: Sprite;
  private bossHpFillNode!: Node;
  private bossHpFillSprite!: Sprite;
  private bossHpLabel!: Label;
  private bossSkillLabel!: Label;
  private bossComboTipNode!: Node;
  private bossComboTipSprite!: Sprite;
  private bossComboCountdownNode!: Node;
  private bossVictoryLayer!: Node;
  private bossRewardDimmerNode!: Node;
  private bossRewardIconNode!: Node;
  private bossRewardPanelNode!: Node;
  private bossRewardGoodsLayer!: Node;
  private bossRewardGetButton!: Node;
  private bossRewardNextButton!: Node;
  private timingPanel!: Node;
  private timingHandle!: Node;
  private timingPoint!: Node;
  private timingPerfectFx!: Node;
  private stabilityBarNode!: Node;
  private stabilityStateNode!: Node;
  private stabilityShieldGlowNode!: Node;
  private comboNode!: Node;
  private comboMultiplierLabel!: Label;
  private comboDigitsLayer!: Node;
  private comboScoreFxNode!: Node;
  private comboScoreFxLabel!: Label;
  private comboDigitNodes: Node[] = [];
  private comboAuraNodes: Node[] = [];
  private comboAuraGraphics: Graphics[] = [];
  private throwArea!: Node;
  private armNode!: Node;
  private handPreference: HandPreference = 'right';
  private handChoiceReturnState: HandChoiceReturnState = 'playing';
  private readonly assets = new BottleHeroRuntimeAssetStore();
  private presentation!: BottleHeroGameplayPresentation;
  private bgm!: BottleHeroBgmController;
  private feedbackFx!: BottleHeroFeedbackFxPlayer;
  private avatarUi!: BottleHeroAvatarUiController;
  private feedbackNode!: Node;
  private feedbackSprite!: Sprite;
  private gameOverDimmer!: Node;
  private scoreLabel!: Label;
  private bestLabel!: Label;
  private stabilityLabel!: Label;
  private bottleCountLabel!: Label;
  private idleCountdownLabel!: Label;
  private gameOverScoreLabel!: Label;
  private audio!: AudioSource;
  private timingBarNode!: Node;
  private timingCircleNode!: Node;
  private timingTriangleNode!: Node;
  private timingPathNode!: Node;
  private timingStarNode!: Node;
  private timingInfinityNode!: Node;

  private feedbackTick: (() => void) | null = null;
  private avatarBgmSource!: AudioSource;
  private bossBgmSource!: AudioSource;
  private spritePreviewBossId: SpritePreviewBossId = 'boss01Alien';
  private spritePreviewAssetId: SpriteSheetPreviewAssetId = 'boss01AlienIdle';
  private spritePreviewFrameIndex = 0;
  private spritePreviewFrameTimer = 0;
  private spritePreviewLoading = false;
  private timingController!: BottleHeroTimingController;
  private worldTowerController!: BottleHeroWorldTowerController;
  private throwFxController!: BottleHeroThrowFxController;
  private resolvedHandleX = 0;
  private pointX = 0;
  private pointY = 0;
  private balanceConfig: BottleHeroBalanceConfig = mergeBalanceConfig(defaultBottleHeroBalance);
  private pendingBalanceConfig: BottleHeroBalanceConfig = mergeBalanceConfig(defaultBottleHeroBalance);
  private packagedBalanceConfig: BottleHeroBalanceConfig = mergeBalanceConfig(defaultBottleHeroBalance);
  private runElapsedSeconds = 0;
  private roundCount = 0;
  private currentStageState: ActiveStageState = getCurrentStageState(this.balanceConfig, 0, 100, []);
  private recentThrowHistory: BalanceHitKind[] = [];
  private bestTitleIndex = 0;
  private collectedRewardTimingItems: Set<TimingTargetKind> = new Set();
  private score = 0;
  private bestScore = 0;
  private stability = 100;
  private combo = 0;
  private comboShieldSeconds = 0;
  private comboAuraSeconds = 0;
  private bottleCount = 0;
  private towerDrift = 0;
  private targetWorldY = 0;
  private currentWorldY = 0;
  private towerShakeTime = 0;
  private towerLean = 0;
  private towerLeanVelocity = 0;
  private towerVisualX = 0;
  private foodBoostSeconds = 0;
  private mobileAudioPrimed = false;
  private activeThrowBottles: ThrowBottleState[] = [];
  private towerItemHp: Record<number, number> = {};
  private backgroundController!: BottleHeroBackgroundController;
  private ambientController!: BottleHeroAmbientController;
  private bossBattle!: BottleHeroBossBattleController;
  private waitingForFirstAction = false;
  private idleCountdownSeconds = 10;
  private loadingProgress = 0;
  private loadingTotal = 1;
  private lastScore = 0;
  private idleWarningVisible = false;
  private debugBossTestRun = false;
  private playerId = '';
  private playerName = '';
  private profilePromptLayer!: Node;
  private profileNameEditBox!: EditBox;
  private profileNameInputBack!: Node;
  private profilePromptErrorLabel!: Label;
  private profileMobileInputActive = false;
  private readonly mobileNameInput = new BottleHeroMobileNameInput();
  private beginRunInProgress = false;
  private pendingProfileReturnState: HandChoiceReturnState = 'avatarselect';
  private pendingOpenRankingPanel = false;
  private currentLevelId: LevelId = 'level_01';
  private debugBossIdOverride: BossId | null = null;
  private debugEditLevelId: LevelId = 'level_01';
  private debugPackagedBalanceConfig!: BottleHeroBalanceConfig;

  private getActiveBossId(): BossId {
    if (isInternalToolsEnabled() && this.debugBossIdOverride) {
      return this.debugBossIdOverride;
    }
    return getLevelConfig(this.currentLevelId).boss.id as BossId;
  }

  private rebindBossAnimations(): void {
    this.assets.bindBossBattleAnimations(this.getActiveBossId(), this.bossBattle);
    this.bossBattle.applyAnimationBindings();
  }

  private async switchDebugBoss(bossId: BossId): Promise<void> {
    this.debugBossIdOverride = bossId;
    const bossConfig = await ensureBossConfigLoaded(bossId);
    const mergedBossBalance = mergeBalanceConfig({ boss: bossConfig.balance }).boss;
    this.pendingBalanceConfig = mergeBalanceConfig({ ...this.pendingBalanceConfig, boss: mergedBossBalance });
    this.balanceConfig = mergeBalanceConfig({ ...this.balanceConfig, boss: mergedBossBalance });
    await this.assets.ensureBossBattleAssets(bossId, this.bossBattle);
    this.rebindBossAnimations();
    this.bossBattle.reset();
    this.updateHud();
  }

  async start() {
    profiler.hideStats();
    ensureLevelBestScoresMigrated();
    const bestScoreOverride = applyBestScoreUrlOverride();
    if (bestScoreOverride !== null) {
      this.bestScore = readStoredLevelBestScore(this.currentLevelId);
    }
    this.configureView();
    this.createBaseScene();
    this.createLoadingScreen();
    try {
      const configs = await loadGameConfigs();
      this.packagedBalanceConfig = configs.balance;
      this.debugPackagedBalanceConfig = mergeBalanceConfig(configs.balance);
      await this.loadBalanceConfig('level_01');
      this.bossBattle = new BottleHeroBossBattleController(this.createBossBattleHost());
      this.avatarUi = new BottleHeroAvatarUiController();
      this.avatarUi.init(this.createAvatarUiHost());
      this.avatarUi.attachUi({
        avatarSelectLayer: this.avatarSelectLayer,
        avatarHomeLayer: this.avatarHomeLayer,
        avatarPanelLayer: this.avatarPanelLayer,
      });
      if (isInternalToolsEnabled()) {
        this.debugPanel = new BottleHeroDebugPanelController();
        this.debugPanel.init(this.createDebugPanelHost());
      }
      await this.loadAssets();
      this.warnIfRuntimeMediaMissing();
    } catch (error) {
      this.showLoadingError('RESOURCE ERROR', error);
      return;
    }
    try {
      this.loadStoredHandPreference();
      if (isInternalToolsEnabled() && shouldClearPlayerNameFromUrl()) {
        clearStoredPlayerName();
      }
      this.loadStoredPlayerProfile();
      this.loadStoredAvatarState();
      this.bestScore = readStoredLevelBestScore(this.currentLevelId);
      this.populateScene();
      this.hideLoadingScreen();
      this.showTitle();
    } catch (error) {
      this.showLoadingError('INIT ERROR', error);
    }
  }

  update(deltaTime: number) {
    if (isInternalToolsEnabled()) {
      this.updateSpriteSheetPreview(deltaTime);
    }
    if (this.state !== 'playing') {
      return;
    }

    this.runElapsedSeconds += deltaTime;
    if (!this.bossBattle.warningActive) {
      this.timingController.update(deltaTime);
    }
    this.bossBattle.update(deltaTime);
    this.backgroundController.updateLoop();
    this.ambientController.update(deltaTime);
    this.worldTowerController.updateWorldScroll(deltaTime);
    this.worldTowerController.updateTowerShake(deltaTime);
    this.updateIdleCountdown(deltaTime);
    this.updateFoodBoost(deltaTime);
    this.updateComboRewardVisuals(deltaTime);
  }

  private configureView() {
    view.setDesignResolutionSize(this.designWidth, this.designHeight, 4);
  }

  private createBaseScene() {
    this.rootCanvas = new Node('BottleHeroCanvas');
    this.rootCanvas.setParent(director.getScene());
    this.rootCanvas.addComponent(Canvas);
    addTransform(this.rootCanvas, this.designWidth, this.designHeight);

    const cameraNode = new Node('Camera');
    cameraNode.setParent(this.rootCanvas);
    cameraNode.setPosition(0, 0, 1000);
    this.cameraNode = cameraNode;
    const camera = cameraNode.addComponent(Camera);
    camera.projection = Camera.ProjectionType.ORTHO;
    camera.orthoHeight = this.designHeight / 2;
    const canvas = this.rootCanvas.getComponent(Canvas);
    if (canvas) {
      canvas.cameraComponent = camera;
    }

    this.audio = this.rootCanvas.addComponent(AudioSource);
    this.assets.bindPlayback({
      playOneShot: (clip, volume) => this.audio.playOneShot(clip, volume),
    });
    this.avatarBgmSource = this.rootCanvas.addComponent(AudioSource);
    this.bossBgmSource = this.rootCanvas.addComponent(AudioSource);
    this.bgLayer = createNode('BackgroundLayer', this.rootCanvas, 0, 0, this.designWidth, this.designHeight);
    this.ambientBackLayer = createNode('AmbientBackLayer', this.rootCanvas, 0, 0, this.designWidth, this.designHeight);
    this.worldLayer = createNode('WorldLayer', this.rootCanvas, 0, 0, this.designWidth, this.designHeight);
    this.towerPivotLayer = createNode('TowerPivotLayer', this.worldLayer, 0, -560, this.designWidth, this.designHeight);
    this.towerLayer = createNode('TowerLayer', this.towerPivotLayer, 0, 560, this.designWidth, this.designHeight);
    this.missLayer = createNode('MissLayer', this.worldLayer, 0, 0, this.designWidth, this.designHeight);
    this.throwFxLayer = createNode('ThrowFxLayer', this.worldLayer, 0, 0, this.designWidth, this.designHeight);
    this.ambientFrontLayer = createNode('AmbientFrontLayer', this.rootCanvas, 0, 0, this.designWidth, this.designHeight);
    this.bossLayer = createNode('BossLayer', this.rootCanvas, 0, 0, this.designWidth, this.designHeight);
    this.hudLayer = createNode('HudLayer', this.rootCanvas, 0, 0, this.designWidth, this.designHeight);
    this.feedbackNode = createNode('Feedback', this.hudLayer, 0, 420, 420, 220);
    this.feedbackSprite = this.feedbackNode.addComponent(Sprite);
    this.feedbackNode.active = false;
    this.initPresentation();
    this.loadingLayer = createNode('LoadingLayer', this.rootCanvas, 0, 0, this.designWidth, this.designHeight);
    this.titleLayer = createNode('TitleLayer', this.rootCanvas, 0, 0, this.designWidth, this.designHeight);
    this.avatarSelectLayer = createNode('AvatarSelectLayer', this.rootCanvas, 0, 0, this.designWidth, this.designHeight);
    this.avatarHomeLayer = createNode('AvatarHomeLayer', this.rootCanvas, 0, 0, this.designWidth, this.designHeight);
    this.avatarPanelLayer = createNode('AvatarPanelLayer', this.rootCanvas, 0, 0, this.designWidth, this.designHeight);
    this.avatarSelectLayer.active = false;
    this.avatarHomeLayer.active = false;
    this.avatarPanelLayer.active = false;
    this.pauseLayer = createNode('PauseLayer', this.rootCanvas, 0, 0, this.designWidth, this.designHeight);
    this.handChoiceLayer = createNode('HandChoiceLayer', this.rootCanvas, 0, 0, this.designWidth, this.designHeight);
    this.gameOverLayer = createNode('GameOverLayer', this.rootCanvas, 0, 0, this.designWidth, this.designHeight);
    this.debugLayer = createNode('DebugLayer', this.rootCanvas, 0, 0, this.designWidth, this.designHeight);
    this.debugLayer.active = false;
    this.spritePreviewLayer = createNode('SpriteSheetPreviewLayer', this.rootCanvas, 0, 0, this.designWidth, this.designHeight);
    this.spritePreviewLayer.active = false;
    this.createPlayerProfilePromptLayer();
    this.initWorldControllers();
  }

  private initWorldControllers() {
    this.backgroundController = new BottleHeroBackgroundController(this.createBackgroundHost());
    this.ambientController = new BottleHeroAmbientController(this.createAmbientHost());
    this.timingController = new BottleHeroTimingController(this.createTimingHost());
    this.worldTowerController = new BottleHeroWorldTowerController(this.createWorldTowerHost());
    this.throwFxController = new BottleHeroThrowFxController(this.createThrowFxHost());
  }

  private createThrowFxHost(): ThrowFxHost {
    return {
      getThrowFxLayer: () => this.throwFxLayer,
      getCurrentWorldY: () => this.currentWorldY,
      getHandSide: () => this.getHandSide(),
      getActiveThrowBottles: () => this.activeThrowBottles,
      setActiveThrowBottles: (value) => { this.activeThrowBottles = value; },
    };
  }

  private createWorldTowerHost(): WorldTowerHost {
    return {
      getWorldLayer: () => this.worldLayer,
      getTowerPivotLayer: () => this.towerPivotLayer,
      getTowerLayer: () => this.towerLayer,
      getMissLayer: () => this.missLayer,
      getThrowFxLayer: () => this.throwFxLayer,
      getCurrentWorldY: () => this.currentWorldY,
      setCurrentWorldY: (value) => { this.currentWorldY = value; },
      getTargetWorldY: () => this.targetWorldY,
      isTimingPanelActive: () => Boolean(this.timingPanel?.active),
      updateTimingPanelPosition: () => this.timingController.updatePanelPosition(),
      getBalanceConfig: () => this.balanceConfig,
      getStability: () => this.stability,
      getBottleCount: () => this.bottleCount,
      getTowerDrift: () => this.towerDrift,
      getTowerLean: () => this.towerLean,
      setTowerLean: (value) => { this.towerLean = value; },
      getTowerLeanVelocity: () => this.towerLeanVelocity,
      setTowerLeanVelocity: (value) => { this.towerLeanVelocity = value; },
      getTowerShakeTime: () => this.towerShakeTime,
      setTowerShakeTime: (value) => { this.towerShakeTime = value; },
      getTowerVisualX: () => this.towerVisualX,
      setTowerVisualX: (value) => { this.towerVisualX = value; },
      getTowerTopLocalY: () => this.getTowerTopLocalY(),
      isChargeActive: () => this.timingController.isChargeActive(),
      getDesignWidth: () => this.designWidth,
      getActiveThrowBottles: () => this.activeThrowBottles,
      setActiveThrowBottles: (value) => { this.activeThrowBottles = value; },
      clearTowerItemHp: () => { this.towerItemHp = {}; },
    };
  }

  private createBackgroundHost(): BackgroundHost {
    return {
      getDesignWidth: () => this.designWidth,
      getDesignHeight: () => this.designHeight,
      getBottleCount: () => this.bottleCount,
      getCurrentWorldY: () => this.currentWorldY,
      getBgLayer: () => this.bgLayer,
      getSprite: (spriteKey) => this.assets.getSprite(spriteKey as never),
      hasLoopOnceSegment: () => this.currentLevelId !== 'level_01'
        && Boolean(this.assets.getSprite('loopOnceBackground' as never)),
      getScene03HeightThreshold: () => getLevelBackgroundProgression(this.currentLevelId).scene03Height,
      getScene04HeightThreshold: () => getLevelBackgroundProgression(this.currentLevelId).scene04Height,
      getScene03MinLoops: () => getLevelBackgroundProgression(this.currentLevelId).scene03MinLoops,
      usesSingleScene03Loop: () => this.currentLevelId === 'level_03',
    };
  }

  private createAmbientHost(): AmbientHost {
    return {
      getLevelId: () => this.currentLevelId,
      getDesignWidth: () => this.designWidth,
      getDesignHeight: () => this.designHeight,
      getBottleCount: () => this.bottleCount,
      isScene03BridgeAdded: () => this.backgroundController.isScene03BridgeAdded(),
      isScene04BridgeAdded: () => this.backgroundController.isScene04BridgeAdded(),
      getScene04HeightThreshold: () => this.backgroundController.getScene04HeightThreshold(),
      getAmbientBackLayer: () => this.ambientBackLayer,
      getAmbientFrontLayer: () => this.ambientFrontLayer,
      getSprite: (spriteKey) => this.assets.getSprite(spriteKey as never),
    };
  }

  private createTimingHost(): TimingHost {
    return {
      getBalanceConfig: () => this.balanceConfig,
      isPlaying: () => this.state === 'playing',
      getMinChargeSeconds: () => this.minChargeSeconds,
      getMaxChargeSeconds: () => this.maxChargeSeconds,
      getTimeoutSeconds: () => this.timeoutSeconds,
      getTimingHandleRange: () => this.timingHandleRange,
      getTimingPointRange: () => this.timingPointRange,
      getArmBaseAngle: () => this.armBaseAngle,
      getArmChargeAngle: () => this.armChargeAngle,
      getActiveStageState: () => this.getActiveStageState(),
      getDifficultyRatio: () => this.getDifficultyRatio(),
      getCollectedRewardTimingItems: () => this.collectedRewardTimingItems,
      isRewardTimingItem: (kind) => this.isRewardTimingItem(kind),
      markCollectedRewardTimingItem: (kind) => { this.collectedRewardTimingItems.add(kind); },
      isBossBattleActive: () => this.bossBattle.battleActive,
      isBossDeathSequenceActive: () => this.bossBattle.deathSequenceActive,
      getBossComboAttackTaps: () => this.bossBattle.comboAttackTaps,
      fireBossComboTap: () => this.bossBattle.fireComboTap(),
      bossApplyMiss: () => this.bossBattle.applyMiss(),
      bossApplyTimingItem: (target) => this.bossBattle.applyTimingItem(target),
      bossApplyPointHit: (kind, target) => this.bossBattle.applyPointHit(kind, target),
      getTimingUi: () => ({
        timingPanel: this.timingPanel,
        timingHandle: this.timingHandle,
        timingPoint: this.timingPoint,
        timingPerfectFx: this.timingPerfectFx,
        timingBarNode: this.timingBarNode,
        timingCircleNode: this.timingCircleNode,
        timingTriangleNode: this.timingTriangleNode,
        timingPathNode: this.timingPathNode,
        timingStarNode: this.timingStarNode,
        timingInfinityNode: this.timingInfinityNode,
        throwArea: this.throwArea,
        armNode: this.armNode,
      }),
      getSprite: (spriteKey) => this.assets.getSprite(spriteKey as never),
      getTowerDrift: () => this.towerDrift,
      getTowerTopLocalY: () => this.getTowerTopLocalY(),
      getBottleWorldPosition: (localX, localY) => this.getBottleWorldPosition(localX, localY),
      getCurrentWorldY: () => this.currentWorldY,
      isFoodBoostActive: () => this.isFoodBoostActive(),
      getHandSide: () => this.getHandSide(),
      getArmBaseX: () => this.getArmBaseX(),
      getHandedAngle: (angle) => this.getHandedAngle(angle),
      setArmScale: (scale) => this.setArmScale(scale),
      setThrowButtonPressed: (pressed) => this.setThrowButtonPressed(pressed),
      incrementRoundCount: () => { this.roundCount += 1; },
      notePlayerAction: () => this.notePlayerAction(),
      applyGameplayHit: (kind, normalizedError, pointScore) => this.applyHit(kind, normalizedError, pointScore),
      applyGameplayTimingItem: (target) => this.applyTimingItem(target),
      penalizeChargeFailure: (reason) => this.penalizeChargeFailure(reason),
      setResolvedTimingSnapshot: (handleX, _handleY, pointX, pointY) => {
        this.resolvedHandleX = handleX;
        this.pointX = pointX;
        this.pointY = pointY;
      },
      playTimingPerfectFx: () => this.playTimingPerfectFx(),
    };
  }

  private async loadAssets() {
    this.resetLoadingProgress(getFullBootLoadStepCount());
    await this.assets.loadAll({
      step: (label, task) => this.loadStep(label, task),
    });
    this.updateLoadingProgress('Ready', true);
  }

  private populateScene() {
    this.backgroundController.createLoopBackground();
    this.createHud();
    this.createThrowControl();
    this.createTimingPanel();
    this.timingController.attachUi({
      timingPanel: this.timingPanel,
      timingHandle: this.timingHandle,
      timingPoint: this.timingPoint,
      timingPerfectFx: this.timingPerfectFx,
      timingBarNode: this.timingBarNode,
      timingCircleNode: this.timingCircleNode,
      timingTriangleNode: this.timingTriangleNode,
      timingPathNode: this.timingPathNode,
      timingStarNode: this.timingStarNode,
      timingInfinityNode: this.timingInfinityNode,
      throwArea: this.throwArea,
      armNode: this.armNode,
    });
    this.timingController.bindThrowInput(this);
    this.createFeedback();
    this.createComboHud();
    this.createBossLayer();
    this.createTitle();
    this.avatarUi.attachUi({
      avatarSelectLayer: this.avatarSelectLayer,
      avatarHomeLayer: this.avatarHomeLayer,
      avatarPanelLayer: this.avatarPanelLayer,
    });
    this.avatarUi.buildSelectionLayer();
    this.avatarUi.buildHomeLayer();
    this.createPauseLayer();
    this.createHandChoiceLayer();
    if (isInternalToolsEnabled() && this.debugPanel) {
      this.debugPanel.attachUi({ debugLayer: this.debugLayer });
      this.debugPanel.buildLayer();
      this.createSpriteSheetPreviewLayer();
    }
    this.createGameOver();
  }

  private initPresentation() {
    this.bgm = new BottleHeroBgmController(this.assets, {
      getMainBgmSource: () => this.audio,
      getAvatarHomeBgmSource: () => this.avatarBgmSource,
      getBossBgmSource: () => this.bossBgmSource,
      getGameState: () => this.state,
      scheduleOnce: (callback, delay) => this.scheduleOnce(callback, delay),
    });
    this.feedbackFx = new BottleHeroFeedbackFxPlayer(this.assets, {
      getFeedbackNode: () => this.feedbackNode,
      getFeedbackSprite: () => this.feedbackSprite,
      schedule: (callback, interval) => this.schedule(callback, interval),
      unschedule: (callback) => this.unschedule(callback),
      setFeedbackTick: (tick) => { this.feedbackTick = tick; },
      getFeedbackTick: () => this.feedbackTick,
    });
    this.presentation = new BottleHeroGameplayPresentationAdapter(this.assets, this.bgm, this.feedbackFx);
  }

  private createLoadingScreen() {
    createRectNode('LoadingBack', this.loadingLayer, 0, 0, this.designWidth, this.designHeight, new Color(255, 250, 238, 255));
    createRectNode('LoadingWash', this.loadingLayer, 0, 0, this.designWidth, this.designHeight, new Color(255, 255, 255, 80));
    this.loadingLabel = createLabel('LoadingText', this.loadingLayer, 'LOADING 0%', 0, -20, 22, new Color(54, 39, 30, 255), 4, 520, Label.HorizontalAlign.CENTER);
    if (this.assets.hasSprite('loadingPaw')) {
      const paw = createSpriteNode('LoadingPaw', this.loadingLayer, this.assets.getSprite('loadingPaw'), 0, -108, 54, 54);
      tween(paw)
        .repeatForever(
          tween()
            .to(0.35, { scale: new Vec3(1.42, 1.42, 1) })
            .to(0.35, { scale: new Vec3(0.9, 0.9, 1) }),
        )
        .start();
    }
  }

  private resetLoadingProgress(total: number) {
    this.loadingProgress = 0;
    this.loadingTotal = Math.max(1, total);
    this.updateLoadingProgress('Preparing');
  }

  private async loadStep<T>(label: string, loader: () => Promise<T>): Promise<T> {
    try {
      const value = await loader();
      this.loadingProgress += 1;
      this.updateLoadingProgress(label);
      return value;
    } catch (error) {
      this.showLoadingError(label, error);
      throw error;
    }
  }

  private updateLoadingProgress(label: string, complete = false) {
    if (!this.loadingLabel) {
      return;
    }
    const percent = complete ? 100 : Math.min(99, Math.max(0, Math.round((this.loadingProgress / this.loadingTotal) * 100)));
    const labelComponent = this.loadingLabel.getComponent(Label);
    if (labelComponent) {
      labelComponent.string = `LOADING ${percent}%\n${label.toUpperCase()}`;
    }
  }

  private warnIfRuntimeMediaMissing() {
    if (this.assets.hasSprite('logo') && this.assets.getCoreClip('bgm')) {
      return;
    }
    const hint = 'BottleHero media missing: copy png/mp3/m4a into assets/resources/bottlehero/ (see docs/ASSET_INVENTORY.md), then refresh Cocos assets.';
    console.warn(hint);
  }

  private showLoadingError(label: string, error: unknown) {
    console.error('BottleHero loading failed:', label, error);
    if (!this.loadingLabel) {
      return;
    }
    const labelComponent = this.loadingLabel.getComponent(Label);
    if (labelComponent) {
      labelComponent.string = `LOAD FAILED\n${label.toUpperCase()}`;
      labelComponent.fontSize = 38;
      labelComponent.color = new Color(200, 42, 42, 255);
    }
  }

  private hideLoadingScreen() {
    if (!this.loadingLayer) {
      return;
    }
    tween(this.loadingLayer).stop();
    this.loadingLayer.active = false;
  }

  private createHud() {
    const scorePanel = createSpriteNode('ScorePanel', this.hudLayer, this.assets.getSprite('scorePanel'), 0, 708, 286, 79);
    this.scoreLabel = createLabel('ScoreLabel', scorePanel, '0', 34, 0, 30, new Color(255, 255, 255, 255), 5, 176, Label.HorizontalAlign.CENTER);
    this.bestLabel = createLabel('BestLabel', this.hudLayer, 'BEST 0', -260, 664, 23, new Color(255, 232, 151, 255), 4, 300, Label.HorizontalAlign.LEFT);
    this.bottleCountLabel = createLabel('BottleCountLabel', this.hudLayer, '叠瓶 0', 0, 652, 28, new Color(215, 243, 255, 255), 5, 220, Label.HorizontalAlign.CENTER);
    this.bottleCountLabel.node.active = false;
    this.stabilityLabel = createLabel('StabilityLabel', this.hudLayer, 'STABILITY 100', 196, 708, 24, new Color(255, 255, 255, 255), 5, 260, Label.HorizontalAlign.RIGHT);
    this.bestLabel.node.active = false;
    this.stabilityLabel.node.active = false;

    this.stabilityBarNode = createSpriteNode('StabilityBar', this.hudLayer, this.assets.getSprite('stabilityBar'), -392, 74, 60, 555);
    this.stabilityShieldGlowNode = createSpriteNode('StabilityShieldGlow', this.hudLayer, this.assets.getSprite('stabilityBar'), -392, 74, 80, 590);
    const glowSprite = this.stabilityShieldGlowNode.getComponent(Sprite);
    if (glowSprite) {
      glowSprite.color = new Color(92, 246, 255, 150);
    }
    this.stabilityShieldGlowNode.active = false;
    this.stabilityStateNode = createSpriteNode('StabilityState', this.hudLayer, this.assets.getSprite('stabilityState'), -392, 74, 28, 493);
    this.createComboAura();

    const pauseButton = createSpriteNode('PauseButton', this.hudLayer, this.assets.getSprite('pauseButton'), 334, 708, 176, 176);
    pauseButton.addComponent(Button);
    addPressScale(pauseButton, 1, this.bindUiButtonSound(), this);
    pauseButton.on(Node.EventType.TOUCH_END, this.pauseRun, this);
    this.idleCountdownLabel = createLabel('IdleCountdown', this.hudLayer, 'AUTO EXIT 10', 0, 330, 48, new Color(255, 246, 120, 255), 6, 520, Label.HorizontalAlign.CENTER);
    this.idleCountdownLabel.node.active = false;
  }

  private createThrowControl() {
    this.armNode = createSpriteNode('PlayerArm', this.hudLayer, this.assets.getSprite('playerArm'), 314, -566, 760, 760);
    this.throwArea = createNode('CatPawThrowArea', this.hudLayer, 306, -538, 292, 292);
    this.throwArea.addComponent(Button);
    this.applyHandLayout();
  }

  private getHandSide() {
    return this.handPreference === 'left' ? -1 : 1;
  }

  private getArmBaseX() {
    return 314 * this.getHandSide();
  }

  private getThrowAreaBaseX() {
    return 306 * this.getHandSide();
  }

  private getHandedAngle(angle: number) {
    return angle * this.getHandSide();
  }

  private setArmScale(scale: number) {
    if (!this.armNode) {
      return;
    }
    this.armNode.setScale(this.getHandSide() * scale, scale, 1);
  }

  private applyHandLayout() {
    if (this.armNode) {
      this.armNode.setPosition(this.getArmBaseX(), -566, 0);
      this.setArmScale(1);
      this.armNode.setRotationFromEuler(0, 0, this.getHandedAngle(this.armBaseAngle));
    }
    if (this.throwArea) {
      this.throwArea.setPosition(this.getThrowAreaBaseX(), -538, 0);
      this.throwArea.setScale(1, 1, 1);
    }
    this.updateBossComboTipPosition();
  }

  private getPlayerArmSpriteKey(avatarId: AvatarId): string {
    // cat_04 has a dedicated arm sprite; others currently fall back to cat01's.
    return avatarId === 'cat04' ? 'playerArmCat04' : 'playerArm';
  }

  private refreshPlayerArmSprite() {
    if (!this.armNode) {
      return;
    }
    const sprite = this.armNode.getComponent(Sprite);
    if (!sprite) {
      return;
    }
    sprite.spriteFrame = this.assets.getSprite(this.getPlayerArmSpriteKey(this.avatarUi.selectedAvatarId));
  }

  private updateBossComboTipPosition() {
    if (!this.bossComboTipNode || !this.bossComboCountdownNode) {
      return;
    }
    const x = this.getThrowAreaBaseX();
    this.bossComboCountdownNode.setPosition(x, -220, 0);
    this.bossComboTipNode.setPosition(x, -306, 0);
  }

  private createTimingPanel() {
    this.timingPanel = createNode('TimingPanel', this.hudLayer, 0, -220, 620, 520);
    this.timingBarNode = createSpriteNode('TimingBar', this.timingPanel, this.assets.getSprite('timingBar'), 0, 0, 560, 92);
    this.timingCircleNode = createSpriteNode('TimingCircleBar', this.timingPanel, this.assets.getSprite('timingBarCircle'), 0, 0, 430, 430);
    this.timingCircleNode.active = false;
    this.timingTriangleNode = createSpriteNode('TimingTriangleBar', this.timingPanel, this.assets.getSprite('timingBarTriangle'), 0, 0, 490, 432);
    this.timingTriangleNode.active = false;
    this.timingPathNode = createSpriteNode('TimingPathBar', this.timingPanel, this.assets.getSprite('timingBarPath'), 0, 0, 560, 193);
    this.timingPathNode.active = false;
    this.timingStarNode = createSpriteNode('TimingStarBar', this.timingPanel, this.assets.getSprite('timingBarStar'), 0, 0, 490, 490);
    this.timingStarNode.active = false;
    this.timingInfinityNode = createSpriteNode('TimingInfinityBar', this.timingPanel, this.assets.getSprite('timingBarInfinity'), 0, 0, 490, 490);
    this.timingInfinityNode.active = false;
    this.timingPoint = createSpriteNode('TimingPoint', this.timingPanel, this.assets.getSprite('timingPointNormal') || this.assets.getSprite('timingPoint'), 0, 0, 66, 61);
    this.timingPoint.active = false;
    this.timingHandle = createSpriteNode('TimingHandle', this.timingPanel, this.assets.getSprite('timingHandle'), 0, 0, 72, 72);
    this.timingPerfectFx = createSpriteNode('TimingPerfectFx', this.timingPanel, this.assets.getSprite('timingPointNormal') || this.assets.getSprite('timingPoint'), 0, 0, 66, 61);
    this.timingPerfectFx.active = false;
    this.timingPanel.active = false;
  }

  private createFeedback() {
    this.feedbackNode.active = false;
  }

  private createComboHud() {
    this.comboNode = createNode('ComboHud', this.hudLayer, -600, 340, 420, 130);
    createSpriteNode('ComboBar', this.comboNode, this.assets.getSprite('comboBar'), -36, 0, 256, 128);
    this.comboMultiplierLabel = createLabel('ComboMultiplier', this.comboNode, '1', 118, 12, 72, new Color(18, 18, 18, 255), 5, 150, Label.HorizontalAlign.LEFT);
    this.comboMultiplierLabel.outlineColor = new Color(255, 246, 198, 245);
    this.comboDigitsLayer = createNode('ComboDigitsLayer', this.comboNode, 118, 8, 190, 100);
    this.comboScoreFxNode = createNode('ComboScoreFx', this.comboNode, 26, 96, 292, 68);
    createSpriteNode('ComboScoreFxIcon', this.comboScoreFxNode, this.assets.getSprite('leftsideScoreIcon'), -44, 0, 156, 46);
    this.comboScoreFxLabel = createLabel('ComboScoreFxLabel', this.comboScoreFxNode, '+0', 84, 0, 34, new Color(255, 246, 120, 255), 5, 150, Label.HorizontalAlign.LEFT);
    this.comboScoreFxNode.active = false;
    this.comboNode.active = false;
  }

  private createBossLayer() {
    this.bossLayer.active = false;
    this.bossWarningNode = createSpriteNode('BossWarning', this.bossLayer, this.assets.getSprite('bossWarning'), 0, 470, 540, 82);
    this.bossWarningNode.active = false;

    this.bossHudLayer = createNode('BossHudLayer', this.bossLayer, 0, 0, this.designWidth, this.designHeight);
    const hpBack = createSpriteNode('BossHpBar', this.bossHudLayer, this.assets.getSprite('bossHpBar'), 0, 594, 790, 51);
    this.bossHpFillNode = createSpriteNode('BossHpFill', hpBack, this.assets.getSprite('bossHpFill'), 0, 0, 724, 24);
    this.bossHpFillSprite = this.bossHpFillNode.getComponent(Sprite)!;
    createSpriteNode('BossHpText', this.bossHudLayer, this.assets.getSprite('bossHpText'), 0, 594, 118, 50);
    this.bossHpLabel = createLabel('BossHpLabel', this.bossHudLayer, '', 0, 620, 18, new Color(255, 247, 160, 0), 0, 420, Label.HorizontalAlign.CENTER);
    this.bossHpLabel.node.active = false;
    this.bossSkillLabel = createLabel('BossSkillLabel', this.bossHudLayer, '', 0, 540, 24, new Color(132, 245, 255, 255), 3, 520, Label.HorizontalAlign.CENTER);

    this.bossNode = createNode('BossRoot', this.bossLayer, 0, 305, 276, 270);
    const bossSpriteNode = createSpriteNode('BossSprite', this.bossNode, new SpriteFrame(), 0, 0, 276, 270);
    this.bossSprite = bossSpriteNode.getComponent(Sprite)!;
    this.bossNode.active = false;
    this.bossHudLayer.active = false;

    this.bossComboCountdownNode = createNode('BossComboCountdown', this.hudLayer, this.getThrowAreaBaseX(), -222, 180, 76);
    this.bossComboCountdownNode.active = false;
    this.bossComboTipNode = createSpriteNode('BossComboTapTip', this.hudLayer, this.assets.getSprite('bossComboTip01'), this.getThrowAreaBaseX(), -310, 116, 116);
    this.bossComboTipSprite = this.bossComboTipNode.getComponent(Sprite)!;
    this.bossComboTipNode.active = false;

    this.bossVictoryLayer = createNode('BossVictoryLayer', this.rootCanvas, 0, 0, this.designWidth, this.designHeight);
    this.bossVictoryLayer.active = false;
    this.bossRewardDimmerNode = createRectNode('BossRewardDimmer', this.bossVictoryLayer, 0, 0, this.designWidth, this.designHeight, new Color(0, 0, 0, 178));
    this.bossRewardIconNode = createSpriteNode('BossRewardIcon', this.bossVictoryLayer, this.assets.getSprite('rewardIcon'), 0, 126, 232, 232);
    this.bossRewardIconNode.addComponent(Button);
    addPressScale(this.bossRewardIconNode, 1.08, this.bindUiButtonSound(), this);
    this.bossRewardIconNode.on(Node.EventType.TOUCH_END, () => this.bossBattle.openRewardPanel(), this);

    // Extend reward panel downward while keeping top edge aligned.
    this.bossRewardPanelNode = createSpriteNode('BossRewardPanel', this.bossVictoryLayer, this.assets.getSprite('rewardIconPanel'), 0, -170, 860, 741);
    this.bossRewardGoodsLayer = createNode('BossRewardGoodsLayer', this.bossRewardPanelNode, 0, -2, 520, 116);
    this.bossRewardGetButton = createSpriteNode('BossRewardGetButton', this.bossRewardPanelNode, this.assets.getSprite('buttonGet'), 0, -162, 230, 97);
    this.bossRewardGetButton.addComponent(Button);
    addPressScale(this.bossRewardGetButton, 1, this.bindUiButtonSound(), this);
    this.bossRewardGetButton.on(Node.EventType.TOUCH_END, () => this.bossBattle.closeVictoryToAvatarHome(), this);
    this.bossRewardNextButton = createSpriteNode('BossRewardNextButton', this.bossRewardPanelNode, this.assets.getSprite('continueButton'), 0, -288, 300, 142);
    this.bossRewardNextButton.addComponent(Button);
    addPressScale(this.bossRewardNextButton, 1, this.bindUiButtonSound(), this);
    this.bossRewardNextButton.on(Node.EventType.TOUCH_END, () => this.bossBattle.closeVictoryToNextLevel(), this);
    this.bossRewardNextButton.active = false;
    this.bossRewardPanelNode.active = false;

    this.bossBattle.attachUi({
      bossLayer: this.bossLayer,
      bossWarningNode: this.bossWarningNode,
      bossHudLayer: this.bossHudLayer,
      bossNode: this.bossNode,
      bossSprite: this.bossSprite,
      bossHpFillNode: this.bossHpFillNode,
      bossHpLabel: this.bossHpLabel,
      bossSkillLabel: this.bossSkillLabel,
      bossComboTipNode: this.bossComboTipNode,
      bossComboTipSprite: this.bossComboTipSprite,
      bossComboCountdownNode: this.bossComboCountdownNode,
      bossVictoryLayer: this.bossVictoryLayer,
      bossRewardDimmerNode: this.bossRewardDimmerNode,
      bossRewardIconNode: this.bossRewardIconNode,
      bossRewardPanelNode: this.bossRewardPanelNode,
      bossRewardGoodsLayer: this.bossRewardGoodsLayer,
      bossRewardNextButton: this.bossRewardNextButton,
      timingPanel: this.timingPanel,
      hudLayer: this.hudLayer,
      armNode: this.armNode,
    });
  }

  private createComboAura() {
    const specs = [
      { name: 'ComboAuraTop', x: 0, y: this.designHeight * 0.5 - 22, width: this.designWidth, height: 44 },
      { name: 'ComboAuraBottom', x: 0, y: -this.designHeight * 0.5 + 22, width: this.designWidth, height: 44 },
      { name: 'ComboAuraLeft', x: -this.designWidth * 0.5 + 18, y: 0, width: 36, height: this.designHeight },
      { name: 'ComboAuraRight', x: this.designWidth * 0.5 - 18, y: 0, width: 36, height: this.designHeight },
    ];
    for (const spec of specs) {
      const node = createRectNode(spec.name, this.hudLayer, spec.x, spec.y, spec.width, spec.height, new Color(255, 130, 255, 0));
      const graphics = node.getComponent(Graphics);
      if (graphics) {
        this.comboAuraGraphics.push(graphics);
      }
      node.active = false;
      this.comboAuraNodes.push(node);
    }
  }

  private createTitle() {
    createSpriteNode('TitleBackground', this.titleLayer, this.assets.getSprite('titleBackground'), 0, 0, this.designWidth, this.designHeight);
    createRectNode('TitleBrightWash', this.titleLayer, 0, 0, this.designWidth, this.designHeight, new Color(255, 255, 255, 105));
    createSpriteNode('Logo', this.titleLayer, this.assets.getSprite('logo'), 0, 175, 1080, 1080);
    const startButton = createSpriteNode('StartButton', this.titleLayer, this.assets.getSprite('enterButton'), 0, -455, 390, 170);
    startButton.addComponent(Button);
    startButton.on(Node.EventType.TOUCH_START, () => {
      this.primeMobileAudio();
      tween(startButton).stop();
      tween(startButton).to(0.05, { scale: new Vec3(0.94, 0.94, 1) }).start();
    }, this);
    startButton.on(Node.EventType.TOUCH_END, () => {
      this.primeMobileAudio();
      this.playButtonSound();
      tween(startButton).stop();
      tween(startButton).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
      this.enterAvatarFlow();
    }, this);
    startButton.on(Node.EventType.TOUCH_CANCEL, () => {
      tween(startButton).stop();
      tween(startButton).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
    }, this);

    const feedbackButton = createSpriteNode('TitleFeedbackButton', this.titleLayer, this.assets.getSprite('feedbackButton'), 0, -650, 272, 118);
    feedbackButton.addComponent(Button);
    addPressScale(feedbackButton, 1, this.bindUiButtonSound(), this);
    feedbackButton.on(Node.EventType.TOUCH_END, () => {
      this.primeMobileAudio();
      this.showFeedbackPanel();
    }, this);
  }

  private showFeedbackPanel() {
    this.openFeedbackSurvey();
  }

  private openFeedbackSurvey() {
    this.primeMobileAudio();
    const bossWin = this.state === 'bossvictory';
    this.persistFeedbackRunStats(bossWin);
    openFeedbackSurveyInBrowser({
      bestScore: readBestScoreForFeedback(this.bestScore),
      score: this.score || 0,
      avatarId: this.avatarUi.selectedAvatarId,
    });
  }

  private persistFeedbackRunStats(bossWin: boolean) {
    persistFeedbackRunStatsEntry({
      runElapsedSeconds: this.runElapsedSeconds,
      bossTriggeredThisRun: this.bossBattle.triggeredThisRun,
      bossBattleActive: this.bossBattle.battleActive,
      bossWin,
    });
  }

  private createPauseLayer() {
    this.pauseLayer.active = false;
    createRectNode('PauseDimmer', this.pauseLayer, 0, 0, this.designWidth, this.designHeight, new Color(255, 255, 255, 128));
    const resumeButton = createSpriteNode('ResumeButton', this.pauseLayer, this.assets.getSprite('continueButton'), 0, 276, 470, 221);
    resumeButton.addComponent(Button);
    resumeButton.on(Node.EventType.TOUCH_END, this.resumeRun, this);
    const handButton = createTextButton('PauseHandButton', this.pauseLayer, 'HAND', 0, 118, 420, 74, 24, this.bindUiButtonSound(), this);
    handButton.on(Node.EventType.TOUCH_END, this.openHandChoiceFromPause, this);
    this.pauseAnchorButton = createTextButton('PauseAnchorButton', this.pauseLayer, '', 0, 28, 420, 74, 22, this.bindUiButtonSound(), this);
    this.pauseAnchorButton.on(Node.EventType.TOUCH_END, this.toggleTimingBarAnchorMode, this);
    const exitY = isInternalToolsEnabled() ? -336 : -62;
    if (isInternalToolsEnabled()) {
      const debugButton = createTextButton('PauseDebugButton', this.pauseLayer, 'DEBUG', 0, -62, 420, 74, 24, this.bindUiButtonSound(), this);
      debugButton.on(Node.EventType.TOUCH_END, this.openDebugPanel, this);
      const spriteButton = createTextButton('PauseSpriteButton', this.pauseLayer, 'SPRITE', 0, -152, 420, 74, 24, this.bindUiButtonSound(), this);
      spriteButton.on(Node.EventType.TOUCH_END, this.openSpriteSheetPreview, this);
    }
    const exitButton = createSpriteNode('PauseExitButton', this.pauseLayer, this.assets.getSprite('quitButton'), 0, exitY, 470, 221);
    exitButton.addComponent(Button);
    exitButton.on(Node.EventType.TOUCH_END, this.exitToTitle, this);
    this.updatePauseAnchorButton();
  }

  private createSpriteSheetPreviewLayer() {
    this.spritePreviewLayer.active = false;
    createRectNode('SpritePreviewBack', this.spritePreviewLayer, 0, 0, this.designWidth, this.designHeight, new Color(16, 19, 32, 242));
    createRectNode('SpritePreviewStageBack', this.spritePreviewLayer, 0, 82, 680, 760, new Color(42, 50, 72, 245));
    createLabel('SpritePreviewTitle', this.spritePreviewLayer, 'SPRITE SHEET PREVIEW', 0, 664, 34, new Color(255, 244, 166, 255), 3, 720, Label.HorizontalAlign.CENTER);
    this.spritePreviewStatusLabel = createLabel('SpritePreviewStatus', this.spritePreviewLayer, 'READY', 0, 596, 22, new Color(222, 244, 255, 255), 2, 760, Label.HorizontalAlign.CENTER);
    this.spritePreviewStage = createSpriteNode('SpritePreviewStage', this.spritePreviewLayer, new SpriteFrame(), 0, 108, 430, 420);
    this.spritePreviewSprite = this.spritePreviewStage.getComponent(Sprite)!;

    const closeButton = createTextButton('SpritePreviewClose', this.spritePreviewLayer, 'BACK', -286, -658, 210, 74, 22, this.bindUiButtonSound(), this);
    closeButton.on(Node.EventType.TOUCH_END, this.closeSpriteSheetPreview, this);

    const bossSelectorY = -586;
    const assetSelectorY = -658;
    const bossSelector = createTextButton('SpritePreviewBossSelector', this.spritePreviewLayer, '', 118, bossSelectorY, 520, 74, 21, this.bindUiButtonSound(), this);
    this.spritePreviewBossSelectLabel = bossSelector.getChildByName('SpritePreviewBossSelectorText')?.getComponent(Label)!;
    bossSelector.on(Node.EventType.TOUCH_END, this.toggleSpritePreviewBossMenu, this);

    const assetSelector = createTextButton('SpritePreviewAssetSelector', this.spritePreviewLayer, '', 118, assetSelectorY, 520, 74, 21, this.bindUiButtonSound(), this);
    this.spritePreviewAssetSelectLabel = assetSelector.getChildByName('SpritePreviewAssetSelectorText')?.getComponent(Label)!;
    assetSelector.on(Node.EventType.TOUCH_END, this.toggleSpritePreviewAssetMenu, this);

    this.spritePreviewBossMenuLayer = createNode('SpritePreviewBossMenuLayer', this.spritePreviewLayer, 118, bossSelectorY, 520, 180);
    this.spritePreviewBossMenuLayer.active = false;
    this.spritePreviewAssetMenuLayer = createNode('SpritePreviewAssetMenuLayer', this.spritePreviewLayer, 118, assetSelectorY, 520, 180);
    this.spritePreviewAssetMenuLayer.active = false;

    this.layoutSpritePreviewBossMenu(bossSelectorY);
    this.rebuildSpritePreviewAssetMenu(assetSelectorY);
    this.updateSpritePreviewSelectorLabels();
  }

  private layoutSpritePreviewBossMenu(selectorY: number) {
    const rowHeight = 56;
    const padding = 20;
    const optionCount = spritePreviewBossGroups.length;
    const menuHeight = padding * 2 + optionCount * rowHeight - 8;
    const menuY = selectorY + 37 + 12 + menuHeight / 2;
    this.spritePreviewBossMenuLayer.setPosition(118, menuY, 0);
    this.spritePreviewBossMenuLayer.getComponent(UITransform)?.setContentSize(520, menuHeight);
    this.spritePreviewBossMenuLayer.removeAllChildren();
    createRectNode('SpritePreviewBossMenuBack', this.spritePreviewBossMenuLayer, 0, 0, 520, menuHeight - 18, new Color(32, 40, 58, 250));
    const firstRowY = menuHeight / 2 - padding - rowHeight / 2 + 9;
    for (let i = 0; i < spritePreviewBossGroups.length; i++) {
      const group = spritePreviewBossGroups[i];
      const option = createTextButton(
        `SpritePreviewBossOption_${group.id}`,
        this.spritePreviewBossMenuLayer,
        group.label,
        0,
        firstRowY - i * rowHeight,
        470,
        48,
        18,
        this.bindUiButtonSound(),
        this,
      );
      option.on(Node.EventType.TOUCH_END, () => this.selectSpritePreviewBoss(group.id), this);
    }
  }

  private rebuildSpritePreviewAssetMenu(selectorY = -658) {
    const assets = getSpritePreviewAssetsForBoss(this.spritePreviewBossId);
    const rowHeight = 56;
    const padding = 20;
    const menuHeight = padding * 2 + assets.length * rowHeight - 8;
    const menuY = selectorY + 37 + 12 + menuHeight / 2;
    this.spritePreviewAssetMenuLayer.setPosition(118, menuY, 0);
    this.spritePreviewAssetMenuLayer.getComponent(UITransform)?.setContentSize(520, menuHeight);
    this.spritePreviewAssetMenuLayer.removeAllChildren();
    createRectNode('SpritePreviewAssetMenuBack', this.spritePreviewAssetMenuLayer, 0, 0, 520, menuHeight - 18, new Color(32, 40, 58, 250));
    const firstRowY = menuHeight / 2 - padding - rowHeight / 2 + 9;
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const option = createTextButton(
        `SpritePreviewAssetOption_${asset.id}`,
        this.spritePreviewAssetMenuLayer,
        getSpritePreviewAssetShortLabel(asset),
        0,
        firstRowY - i * rowHeight,
        470,
        48,
        18,
        this.bindUiButtonSound(),
        this,
      );
      option.on(Node.EventType.TOUCH_END, () => this.selectSpritePreviewAsset(asset.id), this);
    }
  }

  private closeSpritePreviewMenus() {
    if (this.spritePreviewBossMenuLayer) {
      this.spritePreviewBossMenuLayer.active = false;
    }
    if (this.spritePreviewAssetMenuLayer) {
      this.spritePreviewAssetMenuLayer.active = false;
    }
  }

  private createHandChoiceLayer() {
    this.handChoiceLayer.active = false;
    createRectNode('HandChoiceDimmer', this.handChoiceLayer, 0, 0, this.designWidth, this.designHeight, new Color(255, 255, 255, 153));
    createLabel('HandChoiceTitle', this.handChoiceLayer, 'CHOOSE HAND', 0, 178, 44, new Color(55, 38, 24, 255), 3, 620, Label.HorizontalAlign.CENTER);
    const leftButton = createSpriteNode('HandChoiceLeft', this.handChoiceLayer, this.assets.getSprite('clawLeftButton'), -205, -26, 330, 267);
    leftButton.addComponent(Button);
    addPressScale(leftButton, 1, this.bindUiButtonSound(), this);
    leftButton.on(Node.EventType.TOUCH_END, () => this.selectHandPreference('left'), this);
    const rightButton = createSpriteNode('HandChoiceRight', this.handChoiceLayer, this.assets.getSprite('clawRightButton'), 205, -26, 330, 267);
    rightButton.addComponent(Button);
    addPressScale(rightButton, 1, this.bindUiButtonSound(), this);
    rightButton.on(Node.EventType.TOUCH_END, () => this.selectHandPreference('right'), this);
  }

  private openDebugPanel() {
    if (!isInternalToolsEnabled()) {
      return;
    }
    this.debugPanel?.openPanel();
  }

  private openSpriteSheetPreview() {
    if (!isInternalToolsEnabled() || this.state !== 'paused') {
      return;
    }
    this.pauseLayer.active = false;
    this.debugLayer.active = false;
    this.handChoiceLayer.active = false;
    this.spritePreviewLayer.active = true;
    this.spritePreviewBossId = getSpritePreviewBossForAsset(this.spritePreviewAssetId);
    this.closeSpritePreviewMenus();
    this.rebuildSpritePreviewAssetMenu();
    this.updateSpritePreviewSelectorLabels();
    void this.selectSpritePreviewAsset(this.spritePreviewAssetId);
  }

  private closeSpriteSheetPreview() {
    this.spritePreviewLayer.active = false;
    this.closeSpritePreviewMenus();
    if (this.state !== 'gameover' && this.state !== 'title') {
      this.state = 'paused';
      this.pauseLayer.active = true;
    }
  }

  private toggleSpritePreviewBossMenu() {
    if (!this.spritePreviewBossMenuLayer) {
      return;
    }
    const nextActive = !this.spritePreviewBossMenuLayer.active;
    this.closeSpritePreviewMenus();
    this.spritePreviewBossMenuLayer.active = nextActive;
  }

  private toggleSpritePreviewAssetMenu() {
    if (!this.spritePreviewAssetMenuLayer) {
      return;
    }
    const nextActive = !this.spritePreviewAssetMenuLayer.active;
    this.closeSpritePreviewMenus();
    this.spritePreviewAssetMenuLayer.active = nextActive;
  }

  private selectSpritePreviewBoss(bossId: SpritePreviewBossId) {
    this.closeSpritePreviewMenus();
    if (this.spritePreviewBossId === bossId) {
      return;
    }
    this.spritePreviewBossId = bossId;
    this.rebuildSpritePreviewAssetMenu();
    this.updateSpritePreviewSelectorLabels();
    const firstAssetId = getSpritePreviewBossGroup(bossId).assetIds[0];
    void this.selectSpritePreviewAsset(firstAssetId);
  }

  private async selectSpritePreviewAsset(assetId: SpriteSheetPreviewAssetId) {
    const asset = getSpritePreviewAsset(assetId);
    this.spritePreviewAssetId = asset.id;
    this.spritePreviewFrameIndex = 0;
    this.spritePreviewFrameTimer = 0;
    const nextBossId = getSpritePreviewBossForAsset(asset.id);
    if (nextBossId !== this.spritePreviewBossId) {
      this.spritePreviewBossId = nextBossId;
      this.rebuildSpritePreviewAssetMenu();
    }
    this.updateSpritePreviewSelectorLabels();
    this.closeSpritePreviewMenus();
    this.spritePreviewStatusLabel.string = `LOADING ${asset.label}`;
    this.spritePreviewLoading = true;
    try {
      const frames = await this.assets.loadSpriteSheetPreview(asset);
      if (this.spritePreviewAssetId !== asset.id) {
        return;
      }
      this.spritePreviewSprite.spriteFrame = frames[0] || new SpriteFrame();
      this.spritePreviewStage.getComponent(UITransform)?.setContentSize(asset.displayWidth, asset.displayWidth * (asset.frameHeight / asset.frameWidth));
      this.spritePreviewStatusLabel.string = `${asset.label} | ${asset.frameCount}F | ${asset.fps} FPS | GRID ${asset.columns} COL`;
    } catch (error) {
      console.warn('BottleHero sprite sheet preview failed:', asset.file, error);
      this.spritePreviewSprite.spriteFrame = new SpriteFrame();
      this.spritePreviewStatusLabel.string = `LOAD FAILED: ${asset.label}`;
    } finally {
      this.spritePreviewLoading = false;
    }
  }

  private updateSpriteSheetPreview(deltaTime: number) {
    if (!this.spritePreviewLayer || !this.spritePreviewLayer.active || this.spritePreviewLoading) {
      return;
    }
    const asset = getSpritePreviewAsset(this.spritePreviewAssetId);
    const frames = this.assets.getSpritePreviewFrameCache()[asset.id];
    if (!frames || frames.length === 0) {
      return;
    }
    this.spritePreviewFrameTimer += deltaTime;
    const frameDuration = 1 / Math.max(1, asset.fps);
    while (this.spritePreviewFrameTimer >= frameDuration) {
      this.spritePreviewFrameTimer -= frameDuration;
      this.spritePreviewFrameIndex = (this.spritePreviewFrameIndex + 1) % frames.length;
      this.spritePreviewSprite.spriteFrame = frames[this.spritePreviewFrameIndex];
    }
  }

  private updateSpritePreviewSelectorLabels() {
    if (this.spritePreviewBossSelectLabel) {
      this.spritePreviewBossSelectLabel.string = `${getSpritePreviewBossGroup(this.spritePreviewBossId).label}  v`;
    }
    if (this.spritePreviewAssetSelectLabel) {
      const asset = getSpritePreviewAsset(this.spritePreviewAssetId);
      this.spritePreviewAssetSelectLabel.string = `${getSpritePreviewAssetShortLabel(asset)}  v`;
    }
  }

  private async loadBalanceConfig(levelId: LevelId = this.currentLevelId) {
    const packaged = await loadPackagedBalanceConfigForLevel(levelId);
    if (levelId === this.currentLevelId) {
      this.packagedBalanceConfig = mergeBalanceConfig(packaged);
      const resolved = await resolveBalanceConfig(packaged, levelId);
      this.balanceConfig = resolved.balanceConfig;
      this.localDebugConfigActive = resolved.localDebugConfigActive;
      if (levelId === this.debugEditLevelId) {
        this.pendingBalanceConfig = mergeBalanceConfig(this.balanceConfig);
      }
    }
    if (levelId === this.debugEditLevelId) {
      this.debugPackagedBalanceConfig = mergeBalanceConfig(packaged);
      if (levelId !== this.currentLevelId) {
        const resolved = await resolveBalanceConfig(packaged, levelId);
        this.pendingBalanceConfig = mergeBalanceConfig(resolved.balanceConfig);
      }
    }
  }

  private async loadDebugLevelBalance(levelId: LevelId) {
    this.debugEditLevelId = levelId;
    const packaged = await loadPackagedBalanceConfigForLevel(levelId);
    this.debugPackagedBalanceConfig = mergeBalanceConfig(packaged);
    const resolved = await resolveBalanceConfig(packaged, levelId);
    this.pendingBalanceConfig = mergeBalanceConfig(resolved.balanceConfig);
    if (levelId === this.currentLevelId) {
      this.packagedBalanceConfig = this.debugPackagedBalanceConfig;
      this.balanceConfig = mergeBalanceConfig(resolved.balanceConfig);
      this.localDebugConfigActive = resolved.localDebugConfigActive;
    }
  }

  private loadStoredHandPreference() {
    const stored = readStoredHandPreference();
    this.handPreference = stored.preference;
    this.handPreferenceSaved = stored.saved;
  }

  private loadStoredPlayerProfile() {
    const stored = readStoredPlayerProfile();
    this.playerId = stored.playerId;
    this.playerName = stored.playerName;
  }

  private clearPlayerNameForTest() {
    clearStoredPlayerName();
    this.playerName = '';
    this.syncProfileNameInputDisplay('');
    if (this.profileNameEditBox) {
      this.profileNameEditBox.string = '';
    }
    this.showPlayerProfilePrompt();
  }

  private loadStoredAvatarState() {
    this.avatarUi.loadStoredState();
  }

  private enterAvatarFlow() {
    if (this.ensurePlayerProfileReady('avatarselect')) {
      return;
    }
    if (!this.handPreferenceSaved) {
      this.showHandChoice('avatarselect');
      return;
    }
    if (!this.avatarUi.avatarSelectionSaved) {
      this.showAvatarSelection();
      return;
    }
    this.showAvatarHome();
  }

  private ensurePlayerProfileReady(returnState: HandChoiceReturnState, options?: { openRankingAfter?: boolean }): boolean {
    if (this.playerName.trim().length > 0) {
      return false;
    }
    this.pendingProfileReturnState = returnState;
    this.pendingOpenRankingPanel = !!options?.openRankingAfter;
    this.showPlayerProfilePrompt();
    return true;
  }

  private showPlayerProfilePrompt() {
    if (!this.profilePromptLayer || !this.profilePromptErrorLabel || !this.profileNameEditBox) {
      return;
    }
    this.state = 'paused';
    this.titleLayer.active = false;
    this.avatarSelectLayer.active = false;
    this.avatarHomeLayer.active = false;
    this.avatarUi.closePanel();
    this.pauseLayer.active = false;
    this.handChoiceLayer.active = false;
    this.debugLayer.active = false;
    this.spritePreviewLayer.active = false;
    this.gameOverLayer.active = false;
    this.profilePromptLayer.active = true;
    this.profilePromptErrorLabel.string = '';
    this.profileNameEditBox.string = this.playerName;
    this.setProfileMobileInputMode(true);
    this.syncProfileNameInputDisplay(this.playerName);
  }

  private setProfileMobileInputMode(active: boolean) {
    this.profileMobileInputActive = active && isMobileWebBrowser();
    if (this.profileNameEditBox) {
      this.profileNameEditBox.enabled = !this.profileMobileInputActive;
    }
    const textLabel = this.profileNameEditBox?.textLabel;
    const placeholderLabel = this.profileNameEditBox?.placeholderLabel;
    if (textLabel) {
      textLabel.node.active = !this.profileMobileInputActive;
    }
    if (placeholderLabel) {
      const name = this.getProfileInputName().trim();
      placeholderLabel.string = this.profileMobileInputActive && name.length === 0 ? '点击输入昵称' : '你的昵称';
      placeholderLabel.node.active = !this.profileMobileInputActive || name.length === 0;
    }
    if (this.profileNameInputBack) {
      this.profileNameInputBack.active = true;
    }
    if (!this.profileMobileInputActive) {
      this.hideMobileNameInput();
    } else {
      this.mobileNameInput.hide();
    }
  }

  private getProfileCamera(): Camera | null {
    return this.cameraNode?.getComponent(Camera) ?? null;
  }

  private showMobileNameInputOverlay() {
    const camera = this.getProfileCamera();
    if (!camera || !this.profileNameEditBox || !this.profileMobileInputActive) {
      return;
    }
    if (this.profileNameInputBack) {
      this.profileNameInputBack.active = false;
    }
    const placeholderLabel = this.profileNameEditBox.placeholderLabel;
    const textLabel = this.profileNameEditBox.textLabel;
    if (placeholderLabel) {
      placeholderLabel.node.active = false;
    }
    if (textLabel) {
      textLabel.node.active = false;
    }
    this.mobileNameInput.show({
      anchorNode: this.profileNameEditBox.node,
      camera,
      value: this.getProfileInputName(),
      placeholder: '你的昵称',
      layout: 'anchor',
      autoFocus: true,
      onChange: (value) => {
        this.profileNameEditBox.string = value;
      },
    });
  }

  private getProfileInputName(): string {
    if (isMobileWebBrowser()) {
      return this.mobileNameInput.getValue() || this.profileNameEditBox?.string || '';
    }
    return this.profileNameEditBox?.string ?? '';
  }

  private hideMobileNameInput() {
    this.mobileNameInput.hide();
    if (this.profileNameInputBack) {
      this.profileNameInputBack.active = true;
    }
    if (!this.profileNameEditBox) {
      return;
    }
    const name = this.getProfileInputName().trim();
    const textLabel = this.profileNameEditBox.textLabel;
    const placeholderLabel = this.profileNameEditBox.placeholderLabel;
    if (this.profileMobileInputActive) {
      if (textLabel) {
        textLabel.string = name;
        textLabel.node.active = name.length > 0;
      }
      if (placeholderLabel) {
        placeholderLabel.string = name.length === 0 ? '点击输入昵称' : '你的昵称';
        placeholderLabel.node.active = name.length === 0;
      }
      return;
    }
    if (textLabel) {
      textLabel.node.active = true;
    }
    if (placeholderLabel) {
      placeholderLabel.node.active = true;
    }
  }

  private focusProfileNameInput() {
    if (isMobileWebBrowser()) {
      if (!this.profileMobileInputActive) {
        this.setProfileMobileInputMode(true);
      }
      this.showMobileNameInputOverlay();
      return;
    }
    this.profileNameEditBox?.focus();
  }

  private syncProfileNameInputDisplay(value = this.profileNameEditBox?.string ?? '') {
    if (this.profileMobileInputActive) {
      const name = value.trim();
      const placeholderLabel = this.profileNameEditBox?.placeholderLabel;
      const textLabel = this.profileNameEditBox?.textLabel;
      if (textLabel) {
        textLabel.string = name;
        textLabel.node.active = name.length > 0 && !this.mobileNameInput.isVisible();
      }
      if (placeholderLabel) {
        placeholderLabel.string = name.length === 0 ? '点击输入昵称' : '你的昵称';
        placeholderLabel.node.active = name.length === 0 && !this.mobileNameInput.isVisible();
      }
      return;
    }
    const editBox = this.profileNameEditBox;
    const textLabel = editBox?.textLabel;
    const placeholderLabel = editBox?.placeholderLabel;
    if (!textLabel || !placeholderLabel) {
      return;
    }
    this.layoutProfileNameLabels();
    const safeValue = value.trim();
    textLabel.string = safeValue;
    textLabel.node.active = true;
    placeholderLabel.node.active = safeValue.length === 0;
    textLabel.node.setSiblingIndex(2);
    placeholderLabel.node.setSiblingIndex(1);
  }

  private layoutProfileNameLabels() {
    const editBox = this.profileNameEditBox;
    if (!editBox?.textLabel || !editBox.placeholderLabel) {
      return;
    }
    const inputTransform = editBox.node.getComponent(UITransform);
    const labelWidth = Math.max(120, (inputTransform?.width ?? 520) - 32);
    const labelHeight = inputTransform?.height ?? 78;
    for (const label of [editBox.textLabel, editBox.placeholderLabel]) {
      label.node.setPosition(0, 0, 0);
      label.horizontalAlign = Label.HorizontalAlign.CENTER;
      label.verticalAlign = Label.VerticalAlign.CENTER;
      label.node.getComponent(UITransform)?.setContentSize(labelWidth, labelHeight);
    }
  }

  private onProfileNameTextChanged() {
    this.syncProfileNameInputDisplay(this.profileNameEditBox.string);
  }

  private onProfileNameEditingBegan() {
    const editBox = this.profileNameEditBox;
    if (!editBox?.placeholderLabel || !editBox.textLabel) {
      return;
    }
    this.layoutProfileNameLabels();
    editBox.placeholderLabel.node.active = editBox.string.trim().length === 0;
    editBox.textLabel.node.active = true;
    editBox.textLabel.string = editBox.string;
  }

  private closePlayerProfilePrompt(confirm: boolean) {
    this.hideMobileNameInput();
    this.profileMobileInputActive = false;
    if (this.profileNameEditBox) {
      this.profileNameEditBox.enabled = true;
    }
    if (this.profilePromptLayer) {
      this.profilePromptLayer.active = false;
    }
    const openRanking = this.pendingOpenRankingPanel;
    this.pendingOpenRankingPanel = false;
    if (!confirm) {
      this.showTitle();
      return;
    }
    if (this.pendingProfileReturnState === 'paused') {
      this.state = 'paused';
      this.pauseLayer.active = true;
      return;
    }
    this.enterAvatarFlow();
    if (openRanking) {
      this.pendingOpenRankingPanel = true;
    }
  }

  private confirmPlayerNameFromPrompt() {
    if (!this.profileNameEditBox || !this.profilePromptErrorLabel) {
      return;
    }
    const name = this.getProfileInputName().trim();
    if (!isValidPlayerName(name)) {
      this.profilePromptErrorLabel.string = '昵称需 2-16 个字符';
      return;
    }
    this.playerName = name;
    writeStoredPlayerName(name);
    void this.submitLeaderboardIfReady();
    this.closePlayerProfilePrompt(true);
  }

  private submitLeaderboardIfReady(): void {
    if (!isValidPlayerName(this.playerName)) {
      return;
    }
    void submitLeaderboardScores({
      playerId: this.playerId,
      displayName: this.playerName,
      avatarId: this.avatarUi.selectedAvatarId,
    });
  }

  private openHandChoiceFromPause() {
    if (this.state !== 'paused') {
      return;
    }
    this.showHandChoice('paused');
  }

  private showHandChoice(returnState: HandChoiceReturnState) {
    this.handChoiceReturnState = returnState;
    this.state = 'handselect';
    this.timingController.endChargeVisuals(false);
    this.titleLayer.active = false;
    this.avatarSelectLayer.active = false;
    this.avatarHomeLayer.active = false;
    this.avatarUi.closePanel();
    this.pauseLayer.active = false;
    this.debugLayer.active = false;
    this.spritePreviewLayer.active = false;
    this.handChoiceLayer.active = true;
  }

  private selectHandPreference(preference: HandPreference) {
    this.handPreference = preference;
    this.handPreferenceSaved = true;
    writeStoredHandPreference(preference);
    this.applyHandLayout();
    this.handChoiceLayer.active = false;
    if (this.handChoiceReturnState === 'paused') {
      this.state = 'paused';
      this.pauseLayer.active = true;
      return;
    }
    if (this.handChoiceReturnState === 'avatarselect') {
      this.showAvatarSelection();
      return;
    }
    this.state = 'playing';
    this.pauseLayer.active = false;
  }

  private showAvatarSelection() {
    this.state = 'avatarselect';
    this.titleLayer.active = false;
    this.hudLayer.active = false;
    this.pauseLayer.active = false;
    this.handChoiceLayer.active = false;
    this.debugLayer.active = false;
    this.spritePreviewLayer.active = false;
    if (this.profilePromptLayer) this.profilePromptLayer.active = false;
    this.gameOverLayer.active = false;
    this.avatarUi.closePanel();
    this.avatarSelectLayer.active = true;
    this.avatarHomeLayer.active = false;
    this.bossLayer.active = false;
    this.bossVictoryLayer.active = false;
    this.avatarUi.syncSelectionPreviewFromSelected();
    this.avatarUi.updateSelectionVisuals();
    this.ambientController.clear();
    this.stopBgm();
    this.playAvatarBgm();
  }

  private showAvatarHome() {
    this.debugBossTestRun = false;
    const bestScoreOverride = applyBestScoreUrlOverride();
    if (bestScoreOverride !== null) {
      this.bestScore = readStoredLevelBestScore(this.currentLevelId);
    } else {
      this.bestScore = readStoredLevelBestScore(this.currentLevelId);
    }
    this.state = 'avatarhome';
    this.avatarUi.closePanel();
    this.titleLayer.active = false;
    this.hudLayer.active = false;
    this.pauseLayer.active = false;
    this.handChoiceLayer.active = false;
    this.debugLayer.active = false;
    this.spritePreviewLayer.active = false;
    if (this.profilePromptLayer) this.profilePromptLayer.active = false;
    this.gameOverLayer.active = false;
    this.avatarSelectLayer.active = false;
    this.avatarHomeLayer.active = true;
    this.bossLayer.active = false;
    this.bossVictoryLayer.active = false;
    this.waitingForFirstAction = false;
    this.avatarUi.updateHomeVisuals();
    this.ambientController.clear();
    this.stopBgm();
    this.playAvatarBgm();
    if (this.pendingOpenRankingPanel) {
      this.pendingOpenRankingPanel = false;
      this.avatarUi.openPanel('ranking');
    }
  }

  private toggleTimingBarAnchorMode() {
    const nextMode: TimingBarAnchorMode = this.balanceConfig.timingBarAnchorMode === 'followTower' ? 'sceneCenter' : 'followTower';
    this.balanceConfig = mergeBalanceConfig({ ...this.balanceConfig, timingBarAnchorMode: nextMode });
    this.pendingBalanceConfig = mergeBalanceConfig({ ...this.pendingBalanceConfig, timingBarAnchorMode: nextMode });
    writeStoredString(getDebugBalanceStorageKey(this.currentLevelId), serializeBalanceConfig(this.balanceConfig));
    this.localDebugConfigActive = true;
    this.updatePauseAnchorButton();
    this.timingController.updatePanelPosition();
  }

  private updatePauseAnchorButton() {
    if (!this.pauseAnchorButton) {
      return;
    }
    const label = this.pauseAnchorButton.getChildByName('PauseAnchorButtonText')?.getComponent(Label);
    if (label) {
      label.string = this.balanceConfig.timingBarAnchorMode === 'followTower' ? 'BAR FOLLOW' : 'BAR CENTER';
    }
    styleDebugButton(this.pauseAnchorButton, this.balanceConfig.timingBarAnchorMode === 'sceneCenter');
  }

  private createDebugPanelHost(): DebugPanelHost {
    return {
      getDesignWidth: () => this.designWidth,
      getDesignHeight: () => this.designHeight,
      getBalanceConfig: () => this.balanceConfig,
      setBalanceConfig: (config) => { this.balanceConfig = config; },
      getPendingBalanceConfig: () => this.pendingBalanceConfig,
      setPendingBalanceConfig: (config) => { this.pendingBalanceConfig = config; },
      getPackagedBalanceConfig: () => this.debugPackagedBalanceConfig,
      isLocalDebugConfigActive: () => this.localDebugConfigActive,
      setLocalDebugConfigActive: (active) => { this.localDebugConfigActive = active; },
      getGameState: () => this.state,
      setGameState: (state) => { this.state = state; },
      setPauseLayerActive: (active) => { this.pauseLayer.active = active; },
      getActiveStageState: () => this.getActiveStageState(),
      getCurrentTargetPlan: () => this.timingController.getCurrentTargetPlan(),
      getRunElapsedSeconds: () => this.runElapsedSeconds,
      getRoundCount: () => this.roundCount,
      getBottleCount: () => this.bottleCount,
      getScore: () => this.score,
      getBestScore: () => readStoredLevelBestScore(this.debugEditLevelId),
      getStability: () => this.stability,
      getTimingTrackShape: () => this.timingController.getTrackShape(),
      getCombo: () => this.combo,
      hasActiveThrows: () => this.activeThrowBottles.some((throwState) => throwState.node.isValid && !throwState.intercepted),
      hasStartedTower: () => this.bottleCount > 0,
      createRectNode: (name, parent, x, y, width, height, color) => createRectNode(name, parent, x, y, width, height, color),
      createLabel: (name, parent, text, x, y, fontSize, color, outlineWidth, width, align) =>
        createLabel(name, parent, text, x, y, fontSize, color, outlineWidth, width, align),
      createTextButton: (name, parent, text, x, y, width, height, fontSize) =>
        createTextButton(name, parent, text, x, y, width, height, fontSize, this.bindUiButtonSound(), this),
      createNode: (name, parent, x, y, width, height) => createNode(name, parent, x, y, width, height),
      scheduleRefresh: (callback, interval) => this.schedule(callback, interval),
      unscheduleRefresh: (callback) => this.unschedule(callback),
      onConfigApplied: () => {
        this.updateHud();
        this.updatePauseAnchorButton();
      },
      saveBalanceConfigToStorage: (config) =>
        writeStoredString(getDebugBalanceStorageKey(this.debugEditLevelId), serializeBalanceConfig(config)),
      clearLocalDebugConfigStorage: () => {
        clearDebugBalanceOverride(this.debugEditLevelId);
      },
      resetBestScore: () => {
        clearStoredLevelBestScores();
        removeStored(bottleHeroStorageKeys.bestTitleIndex);
        this.bestScore = 0;
        this.bestTitleIndex = 0;
        this.updateHud();
        this.avatarUi.updateHomeVisuals();
      },
      clearPlayerNameForTest: () => this.clearPlayerNameForTest(),
      setBestScore: (score) => {
        setStoredLevelBestScore(this.debugEditLevelId, score);
        if (this.debugEditLevelId === this.currentLevelId) {
          this.bestScore = Math.max(this.bestScore, Math.round(score));
        }
        this.updateHud();
        this.avatarUi.updateHomeVisuals();
      },
      triggerDebugGameOver: () => this.triggerDebugGameOver(),
      startDebugBossTest: () => this.startDebugBossTest(),
      exportDebugConfigToConsole: () => {
        console.log('BottleHero debug balance config:', {
          levelId: this.debugEditLevelId,
          balancePath: getLevelConfig(this.debugEditLevelId).balanceConfig,
          config: serializeBalanceConfig(this.balanceConfig),
        });
        console.log('BottleHero debug stage:', {
          levelId: this.currentLevelId,
          round: this.roundCount,
          stage: this.getActiveStageState(),
          plan: this.timingController.getCurrentTargetPlan(),
        });
      },
      getDebugLevelId: () => this.debugEditLevelId,
      getCurrentRunLevelId: () => this.currentLevelId,
      getPlayableLevelIds: () => playableLevelIds.slice(),
      getLevelLabel: (levelId) => {
        const level = getLevelConfig(levelId);
        return level.labelZh || level.labelEn || levelId;
      },
      switchDebugLevel: async (levelId) => {
        await this.loadDebugLevelBalance(levelId);
      },
      getActiveBossId: () => this.getActiveBossId(),
      getPlayableBossIds: () => playableBossIds.slice(),
      getBossLabel: (bossId) => getBossConfigById(bossId).labelZh || bossId,
      switchDebugBoss: async (bossId) => {
        await this.switchDebugBoss(bossId);
      },
    };
  }

  private triggerDebugGameOver() {
    if (this.state !== 'paused' && this.state !== 'playing') {
      return;
    }
    this.debugPanel?.unscheduleRefresh();
    this.debugLayer.active = false;
    this.pauseLayer.active = false;
    this.state = 'playing';
    this.finishRun('DEBUG GAME OVER');
  }

  private startDebugBossTest() {
    void this.enterDebugBossTest();
  }

  private async enterDebugBossTest() {
    if (!isInternalToolsEnabled()) {
      return;
    }
    this.primeMobileAudio(true);
    this.debugPanel?.unscheduleRefresh();
    this.debugLayer.active = false;
    this.pauseLayer.active = false;
    this.handChoiceLayer.active = false;
    this.spritePreviewLayer.active = false;

    this.currentLevelId = this.debugEditLevelId;
    setActiveLevelId(this.debugEditLevelId);
    await this.loadBalanceConfig(this.debugEditLevelId);
    await ensureBossConfigLoaded(this.getActiveBossId());
    this.rebindBossAnimations();

    this.debugBossTestRun = true;
    this.hudLayer.active = true;
    this.state = 'playing';
    this.clearTower();
    this.ambientController.clear();
    this.bossBattle.reset();
    this.bossBattle.applyAnimationBindings();
    this.score = Math.max(0, Math.round(this.balanceConfig.boss.triggerScore));
    this.lastScore = this.score;
    this.bestScore = readStoredLevelBestScore(this.currentLevelId);
    this.stability = Math.max(80, this.balanceConfig.stability.initialStability);
    this.combo = 0;
    this.recentThrowHistory = [];
    this.roundCount = 20;
    this.runElapsedSeconds = 260;
    this.bottleCount = 0;
    this.towerDrift = 0;
    this.currentWorldY = 0;
    this.targetWorldY = 0;
    for (let i = 0; i < 48; i++) {
      this.addDebugTowerBottle(i);
    }
    this.targetWorldY = this.getTowerCameraTargetWorldY();
    this.currentWorldY = this.targetWorldY;
    this.backgroundController.resetSequence();
    this.worldLayer.setPosition(0, -this.currentWorldY, 0);
    this.backgroundController.updateLoop();
    this.updateHud();
    this.playBgm();
    this.bossBattle.triggerWarning();
  }

  private addDebugTowerBottle(index: number) {
    const frame = this.pickThrowBottleFrame();
    const bottleStepY = this.getBottleStepY();
    const y = -500 + index * bottleStepY;
    const drift = Math.sin(index * 0.85) * 24;
    const size = getBottleSize(index);
    const bottle = createSpriteNode(`Bottle${index}`, this.towerLayer, frame, drift, y, size, size);
    bottle.setRotationFromEuler(0, 0, Math.sin(index * 1.3) * 3.5);
    this.towerItemHp[index] = this.getTowerItemMaxHp(index) + 4;
    this.bottleCount = index + 1;
    this.towerDrift = drift;
  }

  private createGameOver() {
    this.gameOverLayer.active = false;
    this.gameOverDimmer = createRectNode('GameOverDimmer', this.gameOverLayer, 0, 0, this.designWidth, this.designHeight, new Color(0, 0, 0, 155));
    const panel = createSpriteNode('GameOverPanel', this.gameOverLayer, this.assets.getSprite('gameOverPanel'), 0, 0, 720, 526);
    createLabel('GameOverTitle', panel, 'GAME OVER', 0, 142, 54, new Color(255, 255, 255, 255), 4);
    this.gameOverScoreLabel = createLabel('GameOverScore', panel, 'SCORE 0', 0, 24, 28, new Color(255, 255, 255, 255), 3, 600, Label.HorizontalAlign.CENTER);
    this.gameOverScoreLabel.lineHeight = 36;
    this.gameOverScoreLabel.node.getComponent(UITransform)?.setContentSize(600, 210);
    const restartButton = createSpriteNode('RestartButton', panel, this.assets.getSprite('buttonNormal'), 0, -156, 320, 101);
    restartButton.addComponent(Button);
    createLabel('RestartText', restartButton, 'RESTART', 0, 0, 38, new Color(255, 255, 255, 255), 2);
    restartButton.on(Node.EventType.TOUCH_START, () => {
      this.primeMobileAudio();
      this.setButtonFrame(restartButton, true);
    }, this);
    restartButton.on(Node.EventType.TOUCH_END, () => {
      this.primeMobileAudio();
      this.playButtonSound();
      this.setButtonFrame(restartButton, false);
      this.startRun();
    }, this);
    restartButton.on(Node.EventType.TOUCH_CANCEL, () => this.setButtonFrame(restartButton, false), this);
  }

  private createPlayerProfilePromptLayer() {
    if (this.profilePromptLayer) {
      return;
    }
    this.profilePromptLayer = createNode('PlayerProfilePromptLayer', this.rootCanvas, 0, 0, this.designWidth, this.designHeight);
    this.profilePromptLayer.active = false;
    createRectNode('PlayerProfilePromptDimmer', this.profilePromptLayer, 0, 0, this.designWidth, this.designHeight, new Color(0, 0, 0, 165));
    const panel = createRectNode('PlayerProfilePromptPanel', this.profilePromptLayer, 0, 40, 690, 420, new Color(255, 247, 226, 250));
    const panelGraphics = panel.getComponent(Graphics);
    if (panelGraphics) {
      panelGraphics.strokeColor = new Color(0, 132, 79, 255);
      panelGraphics.lineWidth = 10;
      panelGraphics.stroke();
    }
    createLabel('PlayerProfilePromptTitle', panel, '输入昵称', 0, 134, 40, new Color(0, 132, 79, 255), 2, 620, Label.HorizontalAlign.CENTER);
    createLabel('PlayerProfilePromptHint', panel, '2-16 个字符，用于排行榜展示', 0, 86, 24, new Color(70, 70, 70, 255), 1, 520, Label.HorizontalAlign.CENTER);
    const inputWidth = 520;
    const inputHeight = 78;
    const editBoxNode = createNode('PlayerProfileNameInput', panel, 0, 20, inputWidth, inputHeight);
    const editBack = createRectNode('PlayerProfileNameInputBack', editBoxNode, 0, 0, inputWidth, inputHeight, new Color(255, 255, 255, 255));
    const editBackGraphics = editBack.getComponent(Graphics);
    if (editBackGraphics) {
      editBackGraphics.strokeColor = new Color(0, 132, 79, 255);
      editBackGraphics.lineWidth = 4;
      editBackGraphics.stroke();
    }
    editBack.setSiblingIndex(0);
    this.profileNameInputBack = editBack;
    const labelWidth = inputWidth - 32;
    const inputText = createLabel(
      'PlayerProfileInputText',
      editBoxNode,
      '',
      0,
      0,
      30,
      new Color(30, 24, 18, 255),
      0,
      labelWidth,
      Label.HorizontalAlign.CENTER,
    );
    inputText.verticalAlign = Label.VerticalAlign.CENTER;
    inputText.enableWrapText = false;
    inputText.overflow = Label.Overflow.CLAMP;
    inputText.node.getComponent(UITransform)?.setContentSize(labelWidth, inputHeight);
    const placeholderText = createLabel(
      'PlayerProfileInputPlaceholder',
      editBoxNode,
      '你的昵称',
      0,
      0,
      28,
      new Color(140, 140, 140, 255),
      0,
      labelWidth,
      Label.HorizontalAlign.CENTER,
    );
    placeholderText.verticalAlign = Label.VerticalAlign.CENTER;
    placeholderText.enableWrapText = false;
    placeholderText.overflow = Label.Overflow.CLAMP;
    placeholderText.node.getComponent(UITransform)?.setContentSize(labelWidth, inputHeight);
    this.profileNameEditBox = editBoxNode.addComponent(EditBox);
    this.profileNameEditBox.textLabel = inputText;
    this.profileNameEditBox.placeholderLabel = placeholderText;
    this.profileNameEditBox.maxLength = 16;
    this.profileNameEditBox.inputMode = EditBox.InputMode.SINGLE_LINE;
    this.profileNameEditBox.returnType = EditBox.KeyboardReturnType.DONE;
    editBoxNode.on(EditBox.EventType.EDITING_DID_BEGAN, this.onProfileNameEditingBegan, this);
    editBoxNode.on(EditBox.EventType.TEXT_CHANGED, this.onProfileNameTextChanged, this);
    editBoxNode.on(EditBox.EventType.EDITING_DID_ENDED, this.confirmPlayerNameFromPrompt, this);
    editBoxNode.on(Node.EventType.TOUCH_END, this.focusProfileNameInput, this);
    for (const child of editBoxNode.children) {
      child.on(Node.EventType.TOUCH_END, this.focusProfileNameInput, this);
    }
    this.layoutProfileNameLabels();
    this.syncProfileNameInputDisplay('');
    this.profilePromptErrorLabel = createLabel('PlayerProfilePromptError', panel, '', 0, -42, 24, new Color(214, 64, 64, 255), 0, 560, Label.HorizontalAlign.CENTER);
    const confirmButton = createTextButton('PlayerProfileConfirmButton', panel, '确定', -98, -126, 220, 72, 28);
    confirmButton.on(Node.EventType.TOUCH_END, this.confirmPlayerNameFromPrompt, this);
    const cancelButton = createTextButton('PlayerProfileCancelButton', panel, '返回', 146, -126, 190, 72, 26);
    cancelButton.on(Node.EventType.TOUCH_END, () => this.closePlayerProfilePrompt(false), this);
  }

  private showTitle() {
    this.state = 'title';
    this.titleLayer.active = true;
    this.hudLayer.active = false;
    this.avatarSelectLayer.active = false;
    this.avatarHomeLayer.active = false;
    this.avatarUi.closePanel();
    this.pauseLayer.active = false;
    this.handChoiceLayer.active = false;
    this.debugLayer.active = false;
    this.spritePreviewLayer.active = false;
    this.gameOverLayer.active = false;
    this.bossLayer.active = false;
    this.bossVictoryLayer.active = false;
    this.debugPanel?.unscheduleRefresh();
    this.ambientController.clear();
    this.waitingForFirstAction = false;
    if (this.idleCountdownLabel) {
      this.idleCountdownLabel.node.active = false;
    }
    this.stopBgm();
    this.playAvatarBgm();
  }

  private startRun(levelId: LevelId = this.currentLevelId) {
    this.primeMobileAudio(true);
    void this.beginRun(levelId);
  }

  private async beginRun(levelId: LevelId) {
    if (this.beginRunInProgress) {
      return;
    }
    this.beginRunInProgress = true;
    this.hideMobileNameInput();
    if (this.profilePromptLayer?.active) {
      this.profilePromptLayer.active = false;
    }
    try {
      await this.beginRunInternal(levelId);
    } catch (error) {
      console.error('BottleHero beginRun failed', error);
    } finally {
      this.beginRunInProgress = false;
    }
  }

  private async beginRunInternal(levelId: LevelId) {
    this.currentLevelId = levelId;
    this.debugEditLevelId = levelId;
    this.debugBossIdOverride = null;
    setActiveLevelId(levelId);
    await this.loadBalanceConfig(levelId);
    await this.assets.ensureLevelVisualAssets(levelId, {
      bossId: this.getActiveBossId(),
      bossSheetSink: this.bossBattle,
    });
    this.rebindBossAnimations();
    this.backgroundController.createLoopBackground();
    this.state = 'playing';
    this.stopAvatarBgm();
    this.titleLayer.active = false;
    this.hudLayer.active = true;
    this.avatarSelectLayer.active = false;
    this.avatarHomeLayer.active = false;
    this.avatarUi.closePanel();
    this.pauseLayer.active = false;
    this.handChoiceLayer.active = false;
    this.debugLayer.active = false;
    this.spritePreviewLayer.active = false;
    this.gameOverLayer.active = false;
    this.bossLayer.active = false;
    this.bossVictoryLayer.active = false;
    this.refreshPlayerArmSprite();
    this.debugPanel?.unscheduleRefresh();
    this.clearTower();
    this.ambientController.clear();
    this.score = 0;
    this.lastScore = 0;
    this.bestScore = readStoredLevelBestScore(levelId);
    this.runElapsedSeconds = 0;
    this.roundCount = 0;
    this.bestTitleIndex = readStoredIntInRange(bottleHeroStorageKeys.bestTitleIndex, 0, SCORE_TITLE_BANDS.length - 1, 0);
    this.stability = this.balanceConfig.stability.initialStability;
    this.recentThrowHistory = [];
    this.currentStageState = this.getActiveStageState();
    this.combo = 0;
    this.comboShieldSeconds = 0;
    this.comboAuraSeconds = 0;
    this.foodBoostSeconds = 0;
    this.collectedRewardTimingItems.clear();
    this.activeThrowBottles = [];
    this.bossBattle.reset();
    this.hideComboFx();
    this.timingController.clearTargets();
    this.bottleCount = 0;
    this.towerDrift = 0;
    this.towerLean = 0;
    this.towerLeanVelocity = 0;
    this.towerVisualX = 0;
    this.currentWorldY = 0;
    this.targetWorldY = 0;
    this.backgroundController.resetSequence();
    this.waitingForFirstAction = true;
    this.idleCountdownSeconds = 10;
    this.idleWarningVisible = false;
    this.worldLayer.setPosition(0, 0, 0);
    this.backgroundController.updateLoop();
    this.updateHud();
    this.updateIdleCountdownLabel();
    this.primeMobileAudio();
    this.playBgm();
    this.applyHandLayout();
    if (!this.handPreferenceSaved) {
      this.showHandChoice('playing');
    }
  }

  private createAvatarUiHost(): AvatarUiHost {
    return {
      getSpriteProvider: () => this.assets,
      getDesignWidth: () => this.designWidth,
      getDesignHeight: () => this.designHeight,
      getTotalBestScore: () => readStoredTotalBestScore(),
      getRankingPlayerScore: (boardId) => readRankingPlayerScore(boardId),
      getPlayerId: () => this.playerId,
      getPlayerName: () => this.playerName,
      requestOpenRankingPanel: () => {
        if (this.ensurePlayerProfileReady('avatarselect', { openRankingAfter: true })) {
          return false;
        }
        return true;
      },
      createSpriteNode: (name, parent, frame, x, y, width, height) =>
        createSpriteNode(name, parent, frame, x, y, width, height),
      createLabel: (name, parent, text, x, y, fontSize, color, outlineWidth, width, align) =>
        createLabel(name, parent, text, x, y, fontSize, color, outlineWidth, width, align),
      createRectNode: (name, parent, x, y, width, height, color) =>
        createRectNode(name, parent, x, y, width, height, color),
      clearNodeChildren: (node) => clearNodeChildren(node),
      addPressScale: (node) => addPressScale(node, 1, this.bindUiButtonSound(), this),
      isLevelUnlocked: (id) => isLevelUnlocked(id),
      startRun: (id) => {
        this.primeMobileAudio(true);
        this.startRun(id ?? 'level_01');
      },
      openFeedbackSurvey: () => this.openFeedbackSurvey(),
      showAvatarHome: () => this.showAvatarHome(),
    };
  }

  private getActiveBossConfig() {
    return getBossConfigById(this.getActiveBossId());
  }

  private createBossBattleHost(): BossBattleHost {
    return {
      getLevelId: () => this.currentLevelId,
      getBossId: () => this.getActiveBossId(),
      getBalanceConfig: () => this.balanceConfig,
      getGameState: () => this.state,
      setGameState: (state) => { this.state = state; },
      getScore: () => this.score,
      addScore: (amount) => {
        this.score += amount;
        // Boss 战实时刷新 BEST，避免 Debug 直打 Boss 在胜利链路切换时漏写榜单。
        this.bestScore = Math.max(this.bestScore, persistLevelBestScore(this.currentLevelId, this.score));
        if (this.state === 'playing') {
          this.updateHud();
        }
      },
      getStability: () => this.stability,
      getBottleCount: () => this.bottleCount,
      getRunElapsedSeconds: () => this.runElapsedSeconds,
      getCurrentWorldY: () => this.currentWorldY,
      getTowerDrift: () => this.towerDrift,
      getTowerVisualX: () => this.towerVisualX,
      getTowerLean: () => this.towerLean,
      getTowerLeanVelocity: () => this.towerLeanVelocity,
      setTowerLeanVelocity: (value) => { this.towerLeanVelocity = value; },
      isChargeActive: () => this.timingController.isChargeActive(),
      hasActiveThrowBottles: () => this.activeThrowBottles.length > 0,
      getAssets: () => this.presentation,
      getBossLabel: () => this.getActiveBossConfig().labelZh,
      getBossMinionSpriteKeys: () => this.getActiveBossConfig().minionSpriteKeys ?? ['ambientAlien01', 'ambientAlien02'],
      getBossDisplayTint: () => {
        const tint = this.getActiveBossConfig().displayTint;
        return tint ? new Color(tint.r, tint.g, tint.b, 255) : null;
      },
      getActiveStageState: () => this.getActiveStageState(),
      getBottleStepY: () => this.getBottleStepY(),
      getTowerCameraTargetWorldY: (bossPhaseActive) => getTowerCameraTargetWorldY(
        this.bottleCount,
        this.getBottleStepY(),
        bossPhaseActive,
      ),
      getThrowAreaBaseX: () => this.getThrowAreaBaseX(),
      getHandSide: () => this.getHandSide(),
      getCombo: () => this.combo,
      setCombo: (value) => { this.combo = value; },
      incrementCombo: () => {
        this.combo += 1;
        return this.combo;
      },
      getSelectedAvatarGoodsId: () => this.avatarUi.selectedAvatarGoodsId,
      setSelectedAvatarGoodsId: (id) => { this.avatarUi.selectedAvatarGoodsId = id; },
      getTowerLayer: () => this.towerLayer,
      getTowerItemHp: (index) => this.towerItemHp[index],
      setTowerItemHp: (index, hp) => { this.towerItemHp[index] = hp; },
      clearTowerItemHp: () => { this.towerItemHp = {}; },
      scheduleOnce: (callback, delay) => this.scheduleOnce(callback, delay),
      endChargeVisuals: () => this.timingController.endChargeVisuals(),
      clearTimingTargets: () => this.timingController.clearTargets(),
      clearAmbientActors: () => this.ambientController.clear(),
      setTimingPanelActive: (active) => { this.timingPanel.active = active; },
      setHudLayerActive: (active) => { this.hudLayer.active = active; },
      setTargetWorldY: (y) => { this.targetWorldY = y; },
      applyStabilityPenalty: (amount) => this.applyStabilityPenalty(amount),
      pulseStabilityHud: (color, intensity) => this.pulseStabilityHud(color, intensity),
      finishRun: (reason) => this.finishRun(reason),
      updateHud: () => this.updateHud(),
      playScreenShake: () => this.playScreenShake(),
      playBossBgm: () => this.playBossBgm(),
      stopBossBgm: () => this.stopBossBgm(),
      stopBgm: () => this.stopBgm(),
      stopAvatarBgm: () => this.stopAvatarBgm(),
      playAvatarBgm: () => this.playAvatarBgm(),
      playFeedback: (kind) => this.playFeedback(kind),
      recordThrowResult: (kind) => this.recordThrowResult(kind),
      playTimingPerfectFx: () => this.playTimingPerfectFx(),
      playComboFx: (combo, scoreGain) => this.playComboFx(combo, scoreGain),
      hideComboFx: () => this.hideComboFx(),
      recoverStability: (amount, label) => this.recoverStability(amount, label),
      setFoodBoostSeconds: (seconds) => { this.foodBoostSeconds = seconds; },
      getFoodBoostSeconds: () => this.foodBoostSeconds,
      setThrowButtonPressed: (pressed) => this.setThrowButtonPressed(pressed),
      tweenArmTap: () => {
        tween(this.armNode).stop();
        tween(this.armNode)
          .to(0.05, { scale: new Vec3(this.getHandSide() * 0.78, 0.78, 1) })
          .to(0.09, { scale: new Vec3(this.getHandSide(), 1, 1) })
          .start();
      },
      notePlayerAction: () => this.notePlayerAction(),
      persistFeedbackRunStats: (bossWin) => this.persistFeedbackRunStats(bossWin),
      persistRunBestScore: () => this.persistCurrentLevelBestScore(),
      onBossVictory: () => {
        grantRandomBossRewardGoods(getActiveLevelRewards().goods);
        const nextLevel = getLevelUnlockedAfterBossWin(this.currentLevelId);
        if (nextLevel) {
          unlockLevel(nextLevel);
        }
      },
      getNextLevelAfterBossVictory: () => getLevelUnlockedAfterBossWin(this.currentLevelId),
      showAvatarHome: () => this.showAvatarHome(),
      startRun: (levelId) => this.startRun(levelId),
      isRewardTimingItem: (kind) => this.isRewardTimingItem(kind),
      markCollectedRewardTimingItem: (kind) => { this.collectedRewardTimingItems.add(kind); },
      dropTopBottles: (count) => this.dropTopBottles(count),
      getBossVictoryScoreBonus: () => getActiveLevelRewards().victoryScoreBonus,
      getBossVictoryRewardGoods: () => [...getLastGrantedBossRewardGoods()],
      applyGrantedAvatarGoods: (goodsId) => {
        this.avatarUi.applyEquippedGoods(goodsId);
      },
      createSpriteNode: (name, parent, frame, x, y, w, h) => createSpriteNode(name, parent, frame, x, y, w, h),
      createRectNode: (name, parent, x, y, w, h, color) => createRectNode(name, parent, x, y, w, h, color),
      clearNodeChildren: (node) => clearNodeChildren(node),
      flashTowerBottle: (bottle) => this.flashTowerBottle(bottle),
    };
  }

  private resetBossState() {
    this.bossBattle.reset();
  }

  private triggerBossWarning() {
    this.bossBattle.triggerWarning();
  }

  private getTowerItemMaxHp(index: number) {
    return getTowerItemMaxHp(index);
  }

  private flashTowerBottle(bottle: Node) {
    const sprite = bottle.getComponent(Sprite);
    if (!sprite) {
      return;
    }
    tween(sprite).stop();
    sprite.color = new Color(255, 120, 120, 255);
    tween(sprite)
      .to(0.08, { color: new Color(255, 255, 255, 255) })
      .to(0.08, { color: new Color(255, 140, 110, 255) })
      .to(0.12, { color: new Color(255, 255, 255, 255) })
      .start();
  }


  private pauseRun() {
    if (this.state !== 'playing') {
      return;
    }
    this.notePlayerAction();
    this.state = 'paused';
    this.timingController.endChargeVisuals(false);
    this.handChoiceLayer.active = false;
    this.updatePauseAnchorButton();
    this.pauseLayer.active = true;
  }

  private resumeRun() {
    if (this.state !== 'paused') {
      return;
    }
    this.state = 'playing';
    this.pauseLayer.active = false;
    this.handChoiceLayer.active = false;
    this.debugLayer.active = false;
    this.spritePreviewLayer.active = false;
    this.debugPanel?.unscheduleRefresh();
  }

  private exitToTitle() {
    this.waitingForFirstAction = false;
    this.timingController.endChargeVisuals();
    this.clearTower();
    this.showTitle();
  }

  private isRewardTimingItem(kind: TimingTargetKind) {
    return getTimingItemDefinition(this.balanceConfig, kind)?.category === 'reward';
  }

  private applyTimingItem(target: TimingTargetState) {
    const definition = getTimingItemDefinition(this.balanceConfig, target.kind);
    if (this.isRewardTimingItem(target.kind) && definition?.oneTimePerRun) {
      this.collectedRewardTimingItems.add(target.kind);
    }
    if (definition?.effect === 'recoverStability') {
      this.recordThrowResult('good');
      this.playClip('throw');
      this.playClip('good');
      this.playDomSound(BottleHeroSfxPaths.recoverStability, 0.9);
      this.playFeedback('good');
      this.recoverStability(this.balanceConfig.stability.stabilityRecoverAmount);
      this.score += 60;
      this.addBottle(randomRange(-10, 10), randomRange(-1.8, 1.8));
      this.playTimingPerfectFx();
      this.updateHud();
      return;
    }

    if (definition?.effect === 'multiplyThrow') {
      this.recordThrowResult('perfect');
      const count = Math.floor(randomRange(this.balanceConfig.stability.multiplyThrowMin, this.balanceConfig.stability.multiplyThrowMax + 1));
      this.playClip('throw');
      this.playClip('perfect');
      this.playFeedback('perfect');
      this.combo += 1;
      const scoreGain = Math.round(40 * count * Math.min(this.combo, this.balanceConfig.combo.perfectMultiplierCap));
      this.score += scoreGain;
      this.playComboFx(this.combo, scoreGain);
      this.playTimingPerfectFx();
      this.addBottleBurst(count);
      this.updateHud();
      return;
    }

    if (definition?.effect === 'foodBoost') {
      this.recordThrowResult('perfect');
      const duration = randomRange(this.balanceConfig.stability.foodDurationMin, this.balanceConfig.stability.foodDurationMax);
      this.foodBoostSeconds = Math.max(this.foodBoostSeconds, duration);
      this.playClip('throw');
      this.playClip('perfect');
      this.playFeedback('perfect');
      this.score += 80;
      this.addBottle(randomRange(-8, 8), randomRange(-1.4, 1.4));
      this.playTimingPerfectFx();
      this.updateHud();
      return;
    }

    this.playClip('miss');
    this.playDomSound(BottleHeroSfxPaths.timingItemBomb, 0.94);
    this.playFeedback('miss');
    this.recordThrowResult('bomb');
    this.combo = 0;
    this.hideComboFx();
    const stageState = this.getActiveStageState();
    this.applyStabilityPenalty(stageState.stage.bombStabilityPenalty);
    const dropCount = Math.floor(randomRange(this.balanceConfig.stability.bombDropMin, this.balanceConfig.stability.bombDropMax + 1));
    this.dropTopBottles(dropCount);
    if (this.stability <= 0) {
      this.finishRun('BOMB HIT');
    }
    this.updateHud();
  }

  private updateIdleCountdown(deltaTime: number) {
    if (!this.waitingForFirstAction) {
      return;
    }
    this.idleCountdownSeconds -= deltaTime;
    if (!this.idleWarningVisible && this.idleCountdownSeconds <= 0) {
      this.idleWarningVisible = true;
      this.idleCountdownSeconds = 10;
      this.updateIdleCountdownLabel();
      return;
    }
    if (this.idleCountdownSeconds <= 0) {
      this.waitingForFirstAction = false;
      if (this.idleCountdownLabel) {
        this.idleCountdownLabel.node.active = false;
      }
      this.exitToTitle();
      return;
    }
    this.updateIdleCountdownLabel();
  }

  private updateIdleCountdownLabel() {
    if (!this.idleCountdownLabel) {
      return;
    }
    const seconds = Math.max(0, Math.ceil(this.idleCountdownSeconds));
    this.idleCountdownLabel.string = `AUTO EXIT ${seconds}`;
    this.idleCountdownLabel.node.active = this.waitingForFirstAction && this.idleWarningVisible && this.state === 'playing';
  }

  private updateFoodBoost(deltaTime: number) {
    if (this.foodBoostSeconds <= 0) {
      return;
    }
    this.foodBoostSeconds = Math.max(0, this.foodBoostSeconds - deltaTime);
    if (this.foodBoostSeconds <= 0 && this.timingHandle) {
      this.timingHandle.setScale(1, 1, 1);
    }
  }

  private updateComboRewardVisuals(_deltaTime: number) {
    this.comboShieldSeconds = 0;
    this.comboAuraSeconds = 0;
    if (this.stabilityShieldGlowNode?.active) {
      this.stabilityShieldGlowNode.active = false;
      this.stabilityShieldGlowNode.setScale(1, 1, 1);
    }
    this.setComboAuraActive(false);
  }

  private isFoodBoostActive() {
    return this.foodBoostSeconds > 0;
  }

  private isComboShieldActive() {
    return false;
  }

  private applyStabilityPenalty(amount: number) {
    if (amount <= 0) {
      return;
    }
    if (this.isComboShieldActive()) {
      this.showStabilityRewardFx(0, 'SHIELD');
      return;
    }
    this.stability = Math.max(0, this.stability - amount);
  }

  private recoverStability(amount: number, label?: string) {
    if (amount <= 0) {
      return;
    }
    const before = this.stability;
    this.stability = Math.min(this.balanceConfig.stability.initialStability, this.stability + amount);
    const recovered = Math.max(0, this.stability - before);
    if (recovered > 0) {
      this.showStabilityRewardFx(recovered, label);
    }
  }

  private getPerfectComboScore(baseScore = this.balanceConfig.combo.perfectBaseScore) {
    return getPerfectComboScore(this.balanceConfig, this.combo, baseScore);
  }

  private getGoodTimingPointScore(baseScore = this.balanceConfig.combo.perfectBaseScore) {
    return getGoodTimingPointScore(this.balanceConfig, baseScore);
  }

  private getDifficultyState() {
    const state = this.getActiveStageState();
    const difficulty = computeDifficulty(
      state.stageIndex,
      state.dynamic.pressure,
      state.dynamic.assist,
      this.bottleCount,
    );
    return {
      elapsedSeconds: this.runElapsedSeconds,
      height: this.bottleCount,
      timeDifficulty: state.stageIndex * 20,
      heightBonus: Math.min(14, this.bottleCount * 0.35),
      difficulty,
      phaseKey: state.stage.id,
      phaseLabel: state.stage.labelZh,
    };
  }

  private getDifficultyRatio() {
    return getDifficultyRatio(this.getDifficultyState().difficulty);
  }

  private getTimingHandleScale() {
    return this.isFoodBoostActive() ? this.balanceConfig.stability.foodHandleScale : 1;
  }

  private getActiveStageState(): ActiveStageState {
    return getCurrentStageState(this.balanceConfig, this.runElapsedSeconds, this.stability, this.recentThrowHistory);
  }

  private recordThrowResult(kind: BalanceHitKind) {
    this.recentThrowHistory.push(kind);
    const maxHistory = Math.max(10, this.balanceConfig.dynamic.windowSize * 2);
    if (this.recentThrowHistory.length > maxHistory) {
      this.recentThrowHistory = this.recentThrowHistory.slice(-maxHistory);
    }
  }

  private notePlayerAction() {
    if (!this.waitingForFirstAction) {
      return;
    }
    this.waitingForFirstAction = false;
    if (this.idleCountdownLabel) {
      this.idleCountdownLabel.node.active = false;
    }
  }

  private applyHit(kind: HitKind, normalizedError: number, pointScore?: number) {
    this.playClip('throw');
    this.playClip(kind);
    this.playFeedback(kind);
    this.recordThrowResult(kind);

    if (kind === 'miss') {
      this.combo = 0;
      this.hideComboFx();
      const stageState = this.getActiveStageState();
      this.applyStabilityPenalty(stageState.stage.missStabilityPenalty);
      this.spawnMissBottle(normalizedError);
      if (this.stability <= 0) {
        this.finishRun('STABILITY LOST');
      }
      this.updateHud();
      return;
    }

    const sign = this.resolvedHandleX >= this.pointX ? 1 : -1;
    if (kind === 'perfect') {
      this.combo += 1;
      const scoreGain = getPerfectComboScore(this.balanceConfig, this.combo, pointScore);
      this.score += scoreGain;
      this.playTimingPerfectFx();
      this.playScreenShake();
      this.playComboFx(this.combo, scoreGain);
      this.addBottle(0, randomRange(-1.2, 1.2));
    } else {
      this.combo = 0;
      this.hideComboFx();
      this.score += getGoodTimingPointScore(this.balanceConfig, pointScore);
      this.applyStabilityPenalty(this.balanceConfig.combo.goodStabilityPenalty);
      const offset = sign * randomRange(18, 54);
      const angle = sign * randomRange(2, 5.5);
      this.addBottle(offset, angle);
    }

    if (this.stability <= 0) {
      this.finishRun('STABILITY LOST');
    }

    this.updateHud();
  }

  private penalizeChargeFailure(reason: string) {
    this.combo = 0;
    this.hideComboFx();
    this.recordThrowResult('miss');
    if (this.bossBattle.battleActive) {
      this.playFeedback('miss');
      this.playClip('miss');
      this.updateHud();
      return;
    }
    const stageState = this.getActiveStageState();
    this.applyStabilityPenalty(stageState.stage.missStabilityPenalty);
    this.playFeedback('miss');
    this.playClip('miss');
    if (this.stability <= 0) {
      this.finishRun(reason);
    }
    this.updateHud();
  }

  private addBottle(offset: number, angle: number) {
    const frame = this.pickThrowBottleFrame();
    this.towerDrift = clampTowerDrift(this.towerDrift + offset);
    const bottleStepY = this.getBottleStepY();
    const y = getBottleLandingLocalY(this.bottleCount, bottleStepY);
    const bottleSize = getBottleSize(this.bottleCount);
    const targetWorldPosition = getBottleWorldPosition(this.towerDrift, y, this.towerVisualX, this.towerLean);
    const landingX = this.towerDrift;
    this.spawnThrowBottle(frame, targetWorldPosition.x, targetWorldPosition.y, bottleSize, angle, () => {
      const landingY = getBottleLandingLocalY(this.bottleCount, bottleStepY);
      const bottle = createSpriteNode(`Bottle${this.bottleCount}`, this.towerLayer, frame, landingX, landingY, bottleSize, bottleSize);
      bottle.setRotationFromEuler(0, 0, angle);
      bottle.setScale(0.24, 0.24, 1);
      tween(bottle).to(0.12, { scale: new Vec3(1.08, 1.08, 1) }).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
      this.towerItemHp[this.bottleCount] = this.getTowerItemMaxHp(this.bottleCount);
      this.bottleCount += 1;
      this.targetWorldY = this.getTowerCameraTargetWorldY();
      this.updateHud();
    }, () => {
      this.combo = 0;
      this.hideComboFx();
      this.applyStabilityPenalty(8);
      this.playFeedback('miss');
      this.playClip('miss');
      if (this.stability <= 0) {
        this.finishRun('STABILITY LOST');
      }
      this.updateHud();
    });
    this.towerLeanVelocity += angle * 0.1 + offset * 0.008;
  }

  private addBottleBurst(count: number) {
    for (let i = 0; i < count; i++) {
      this.scheduleOnce(() => {
        if (this.state !== 'playing') {
          return;
        }
        const offset = randomRange(-16, 16);
        const angle = randomRange(-2.4, 2.4);
        this.addBottle(offset, angle);
      }, i * 0.38);
    }
  }

  private dropTopBottles(count: number) {
    const actualCount = Math.min(count, this.bottleCount);
    if (actualCount <= 0) {
      this.spawnMissBottle(1);
      return;
    }

    for (let i = 0; i < actualCount; i++) {
      const index = this.bottleCount - 1 - i;
      const bottle = this.towerLayer.getChildByName(`Bottle${index}`);
      if (!bottle) {
        continue;
      }
      Tween.stopAllByTarget(bottle);
      const direction = Math.random() > 0.5 ? 1 : -1;
      const startRotation = bottle.eulerAngles.z;
      tween(bottle)
        .to(0.28, {
          position: new Vec3(bottle.position.x + direction * randomRange(130, 250), bottle.position.y - randomRange(210, 330), 0),
          scale: new Vec3(0.52, 0.52, 1),
        }, {
          onUpdate: (_target, ratio) => {
            if (bottle.isValid) {
              bottle.setRotationFromEuler(0, 0, startRotation + direction * ratio * 420);
            }
          },
        })
        .call(() => {
          if (bottle.isValid) {
            bottle.destroy();
          }
        })
        .start();
    }

    this.bottleCount = Math.max(0, this.bottleCount - actualCount);
    for (let i = this.bottleCount; i < this.bottleCount + actualCount + 4; i++) {
      delete this.towerItemHp[i];
    }
    this.targetWorldY = this.getTowerCameraTargetWorldY();
    this.towerLeanVelocity += randomRange(-3.6, 3.6);
  }

  private spawnMissBottle(normalizedError: number) {
    const frame = this.pickThrowBottleFrame();
    const sign = this.resolvedHandleX >= this.pointX ? 1 : -1;
    const y = -500 + this.bottleCount * this.getBottleStepY();
    const bottle = createSpriteNode('MissBottle', this.missLayer, frame, 310 * this.getHandSide(), -620 + this.currentWorldY, 190, 190);
    bottle.setScale(0.72, 0.72, 1);
    bottle.setRotationFromEuler(0, 0, -28);
    tween(bottle)
      .to(0.18, {
        position: new Vec3(this.towerDrift + sign * 150, y + 120, 0),
        scale: new Vec3(1.05, 1.05, 1),
      })
      .to(0.34, {
        position: new Vec3(this.towerDrift + sign * 350, y - 190, 0),
        scale: new Vec3(0.6, 0.6, 1),
      })
      .call(() => bottle.destroy())
      .start();
    tween(bottle)
      .to(0.52, {}, {
        onUpdate: (_target, ratio) => {
          bottle.setRotationFromEuler(0, 0, -28 + sign * ratio * (185 + normalizedError * 70));
        },
      })
      .start();
  }

  private persistCurrentLevelBestScore(): number {
    this.bestScore = persistLevelBestScore(this.currentLevelId, Math.max(this.bestScore, this.score));
    this.submitLeaderboardIfReady();
    return this.bestScore;
  }

  private finishRun(reason: string) {
    if (this.state !== 'playing') {
      return;
    }
    this.state = 'gameover';
    this.bossBattle.abortForGameOver();
    this.timingController.endChargeVisuals();
    this.waitingForFirstAction = false;
    if (this.idleCountdownLabel) {
      this.idleCountdownLabel.node.active = false;
    }
    this.hudLayer.active = false;
    const currentTitle = getScoreTitle(this.score);
    this.bestTitleIndex = Math.max(this.bestTitleIndex, currentTitle.index);
    const bestTitleBand = SCORE_TITLE_BANDS[this.bestTitleIndex] || SCORE_TITLE_BANDS[0];
    this.bestScore = this.persistCurrentLevelBestScore();
    writeStoredString(bottleHeroStorageKeys.bestTitleIndex, String(this.bestTitleIndex));
    this.persistFeedbackRunStats(false);
    this.gameOverScoreLabel.string = `SCORE ${this.score}\nTITLE ${currentTitle.band.zhLabel}\nBEST ${this.bestScore}\nBEST TITLE ${bestTitleBand.zhLabel}\n${reason}`;
    this.gameOverLayer.active = true;
    this.ambientController.clear();
    this.stopBgm();
    this.stopBossBgm();
  }

  private updateWorldScroll(deltaTime: number) {
    this.worldTowerController.updateWorldScroll(deltaTime);
  }

  private updateTowerShake(deltaTime: number) {
    this.worldTowerController.updateTowerShake(deltaTime);
  }

  private getTowerTopLocalY() {
    return getTowerTopLocalY(this.bottleCount, this.getBottleStepY());
  }

  private getBottleStepY() {
    return this.balanceConfig.stability.bottleStepY;
  }

  private getTowerCameraTargetWorldY() {
    return getTowerCameraTargetWorldY(
      this.bottleCount,
      this.getBottleStepY(),
      this.bossBattle.isBossPhaseActive(),
    );
  }

  private pickThrowBottleFrame() {
    return pickThrowBottleFrame(
      this.bottleCount,
      this.assets.getBottleFrames(),
      this.assets.getStagedThrowFrames(),
      this.assets.getSprite('playerArm'),
    );
  }

  private keepTowerTopInView(visualX: number, topLocalY: number) {
    return keepTowerTopInView(visualX, topLocalY, this.towerDrift, this.towerLean, this.designWidth);
  }

  private updateHud() {
    this.bestScore = Math.max(this.bestScore, readStoredLevelBestScore(this.currentLevelId));
    const scoreIncreased = this.score > this.lastScore;
    this.scoreLabel.string = `${this.score}`;
    if (scoreIncreased) {
      this.playScoreFx();
    }
    this.lastScore = this.score;
    this.bestLabel.string = `BEST ${this.bestScore}`;
    this.bottleCountLabel.string = `叠瓶 ${this.bottleCount}`;
    this.bottleCountLabel.node.active = this.currentLevelId !== 'level_01';
    this.stabilityLabel.string = `STABILITY ${this.stability}`;
    this.stabilityLabel.color = this.stability <= 30 ? new Color(255, 91, 91, 255) : new Color(255, 255, 255, 255);
    this.updateStabilityHud();
  }

  private updateStabilityHud() {
    if (!this.stabilityStateNode) {
      return;
    }
    const ratio = Math.max(0.04, Math.min(1, this.stability / 100));
    this.stabilityStateNode.setScale(1, ratio, 1);
    this.stabilityStateNode.setPosition(-392, 74 - (493 * (1 - ratio)) * 0.5, 0);
  }

  private showStabilityRewardFx(amount: number, labelText?: string) {
    const text = labelText || `+${Math.round(amount)}`;
    const label = createLabel('StabilityRewardFx', this.hudLayer, text, -318, 128, 34, new Color(100, 255, 156, 255), 4, 180, Label.HorizontalAlign.CENTER);
    label.node.setScale(0.75, 0.75, 1);
    tween(label.node)
      .to(0.1, { scale: new Vec3(1.15, 1.15, 1), position: new Vec3(-318, 168, 0) })
      .to(0.42, { scale: new Vec3(0.95, 0.95, 1), position: new Vec3(-318, 232, 0) })
      .call(() => {
        if (label.node.isValid) {
          label.node.destroy();
        }
      })
      .start();
  }

  private pulseStabilityHud(color: Color, scale: number) {
    if (!this.stabilityShieldGlowNode) {
      return;
    }
    const sprite = this.stabilityShieldGlowNode.getComponent(Sprite);
    if (sprite) {
      sprite.color = color;
    }
    this.stabilityShieldGlowNode.active = true;
    tween(this.stabilityShieldGlowNode).stop();
    this.stabilityShieldGlowNode.setScale(1, 1, 1);
    tween(this.stabilityShieldGlowNode)
      .to(0.12, { scale: new Vec3(scale, scale, 1) })
      .to(0.16, { scale: new Vec3(1, 1, 1) })
      .start();
  }

  private setComboAuraActive(active: boolean) {
    for (const node of this.comboAuraNodes) {
      node.active = active;
    }
    if (active) {
      this.paintComboAura();
    }
  }

  private paintComboAura() {
    const palette = [
      new Color(255, 82, 132, 96),
      new Color(255, 212, 78, 96),
      new Color(86, 255, 154, 96),
      new Color(72, 206, 255, 96),
      new Color(180, 102, 255, 96),
    ];
    for (let i = 0; i < this.comboAuraGraphics.length; i++) {
      const graphics = this.comboAuraGraphics[i];
      const node = this.comboAuraNodes[i];
      const transform = node?.getComponent(UITransform);
      if (!graphics || !transform) {
        continue;
      }
      const color = palette[(Math.floor(this.runElapsedSeconds * 8) + i) % palette.length];
      graphics.clear();
      graphics.fillColor = color;
      graphics.rect(-transform.width * 0.5, -transform.height * 0.5, transform.width, transform.height);
      graphics.fill();
    }
  }

  private playScoreFx() {
    if (!this.scoreLabel) {
      return;
    }
    tween(this.scoreLabel.node).stop();
    this.scoreLabel.node.setScale(1, 1, 1);
    tween(this.scoreLabel.node)
      .to(0.08, { scale: new Vec3(1.22, 1.22, 1) })
      .to(0.12, { scale: new Vec3(1, 1, 1) })
      .start();
  }

  private playFeedback(kind: HitKind | 'miss') {
    this.presentation.play(kind);
  }

  private playBgm() {
    this.presentation.playMainBgm();
  }

  private playAvatarBgm() {
    this.presentation.playAvatarHomeBgm();
  }

  private stopAvatarBgm() {
    this.presentation.stopAvatarHomeBgm();
  }

  private playBossBgm() {
    this.presentation.playBossBgm();
  }

  private stopBossBgm() {
    this.presentation.stopBossBgm();
  }

  private stopBgm() {
    this.presentation.stopMainBgm();
  }

  private playClip(name: 'throw' | HitKind) {
    this.presentation.playCoreClip(name);
  }

  private playDomSound(path: string, volume: number) {
    this.presentation.playSfx(path, volume);
  }

  private bindUiButtonSound(): () => void {
    return () => this.playButtonSound();
  }

  private playButtonSound() {
    this.presentation.playSfx(BottleHeroSfxPaths.button, 0.72);
  }

  private primeMobileAudio(force = false) {
    if (this.mobileAudioPrimed && !force) {
      return;
    }
    void unlockBottleHeroAudio();
    this.mobileAudioPrimed = true;
    if (this.state === 'title' || this.state === 'avatarselect' || this.state === 'avatarhome') {
      this.playAvatarBgm();
    }
  }

  private clearTower() {
    this.worldTowerController.clearTower();
  }

  private setButtonFrame(buttonNode: Node, pressed: boolean) {
    const sprite = buttonNode.getComponent(Sprite);
    if (sprite) {
      sprite.spriteFrame = pressed ? this.assets.getSprite('buttonPressed') : this.assets.getSprite('buttonNormal');
    }
  }

  private setThrowButtonPressed(pressed: boolean) {
    tween(this.throwArea).stop();
    if (pressed) {
      tween(this.throwArea).to(this.maxChargeSeconds, { scale: new Vec3(0.92, 0.92, 1) }).start();
      return;
    }
    tween(this.throwArea).to(0.14, { scale: new Vec3(1, 1, 1) }).start();
  }

  private spawnThrowBottle(frame: SpriteFrame, targetX: number, targetY: number, size: number, finalAngle: number, onArrive: () => void, onIntercept: () => void) {
    this.throwFxController.spawnThrowBottle(frame, targetX, targetY, size, finalAngle, onArrive, onIntercept);
  }

  private getBottleWorldPosition(localX: number, localY: number): Vec3 {
    return getBottleWorldPosition(localX, localY, this.towerVisualX, this.towerLean);
  }

  private playTimingPerfectFx() {
    this.timingPerfectFx.active = true;
    this.timingPerfectFx.setPosition(this.pointX, this.pointY, 0);
    this.timingPerfectFx.setScale(1.35, 1.35, 1);
    const sprite = this.timingPerfectFx.getComponent(Sprite);
    if (sprite) {
      sprite.color = new Color(255, 246, 120, 255);
    }
    tween(this.timingPerfectFx)
      .to(0.08, { scale: new Vec3(2.6, 2.6, 1) })
      .to(0.2, { scale: new Vec3(4.4, 4.4, 1) })
      .call(() => {
        this.timingPerfectFx.active = false;
        if (sprite) {
          sprite.color = new Color(255, 255, 255, 255);
        }
      })
      .start();
    if (sprite) {
      tween(sprite).to(0.28, { color: new Color(255, 246, 120, 0) }).start();
    }
    tween(this.timingPanel)
      .to(0.06, { scale: new Vec3(1.06, 1.06, 1) })
      .to(0.12, { scale: new Vec3(1, 1, 1) })
      .start();
  }

  private playComboFx(comboCount: number, scoreGain = 0) {
    if (!this.comboNode || !this.comboMultiplierLabel) {
      return;
    }
    const targetX = -238;
    this.comboNode.active = true;
    this.renderComboDigits(comboCount);
    if (!this.comboNode) {
      return;
    }
    tween(this.comboNode).stop();
    tween(this.comboMultiplierLabel.node).stop();
    tween(this.comboDigitsLayer).stop();
    if (this.comboScoreFxNode) {
      tween(this.comboScoreFxNode).stop();
      this.comboScoreFxNode.active = scoreGain > 0;
      this.comboScoreFxNode.setPosition(26, 96, 0);
      this.comboScoreFxNode.setScale(0.76, 0.76, 1);
      if (this.comboScoreFxLabel) {
        this.comboScoreFxLabel.string = `+${Math.round(scoreGain)}`;
      }
    }
    this.comboNode.setPosition(-600, 340, 0);
    this.comboNode.setScale(0.88, 0.88, 1);
    this.comboMultiplierLabel.node.setScale(0.8, 0.8, 1);
    this.comboMultiplierLabel.node.setRotationFromEuler(0, 0, randomRange(-9, 9));
    this.comboDigitsLayer.setScale(0.8, 0.8, 1);
    this.comboDigitsLayer.setRotationFromEuler(0, 0, randomRange(-9, 9));

    tween(this.comboNode)
      .to(0.12, { position: new Vec3(targetX + 20, 340, 0), scale: new Vec3(1.08, 1.08, 1) })
      .to(0.06, { position: new Vec3(targetX, 340, 0), scale: new Vec3(1, 1, 1) })
      .delay(0.52)
      .to(0.14, { position: new Vec3(-600, 340, 0), scale: new Vec3(0.95, 0.95, 1) })
      .call(() => {
        if (this.combo === comboCount) {
          this.comboNode.active = false;
        }
      })
      .start();

    tween(this.comboMultiplierLabel.node)
      .to(0.08, { scale: new Vec3(1.55, 1.55, 1) })
      .to(0.1, { scale: new Vec3(0.95, 0.95, 1) })
      .to(0.08, { scale: new Vec3(1.12, 1.12, 1) })
      .start();
    tween(this.comboDigitsLayer)
      .to(0.08, { scale: new Vec3(1.55, 1.55, 1) })
      .to(0.1, { scale: new Vec3(0.95, 0.95, 1) })
      .to(0.08, { scale: new Vec3(1.12, 1.12, 1) })
      .start();
    if (this.comboScoreFxNode && scoreGain > 0) {
      tween(this.comboScoreFxNode)
        .to(0.1, { scale: new Vec3(1.18, 1.18, 1), position: new Vec3(26, 124, 0) })
        .to(0.34, { scale: new Vec3(1, 1, 1), position: new Vec3(26, 164, 0) })
        .delay(0.12)
        .call(() => {
          if (this.comboScoreFxNode?.isValid) {
            this.comboScoreFxNode.active = false;
          }
        })
        .start();
    }
  }

  private renderComboDigits(comboCount: number) {
    const text = String(comboCount);
    this.comboMultiplierLabel.string = text;
    const canUseDigits = this.assets.getComboDigitFrames().length === 10 && this.comboDigitsLayer;
    this.comboMultiplierLabel.node.active = !canUseDigits;
    if (!canUseDigits) {
      return;
    }
    for (const node of this.comboDigitNodes) {
      if (node.isValid) {
        node.destroy();
      }
    }
    this.comboDigitNodes = [];
    const digitWidth = 42;
    const startX = -((text.length - 1) * digitWidth) * 0.5;
    for (let i = 0; i < text.length; i++) {
      const digit = Number(text[i]);
      const frame = this.assets.getComboDigitFrames()[digit];
      if (!frame) {
        continue;
      }
      const digitNode = createSpriteNode(`ComboDigit_${i}`, this.comboDigitsLayer, frame, startX + i * digitWidth, 0, 48, 68);
      this.comboDigitNodes.push(digitNode);
    }
  }

  private hideComboFx() {
    if (!this.comboNode) {
      return;
    }
    tween(this.comboNode).stop();
    if (this.comboDigitsLayer) {
      tween(this.comboDigitsLayer).stop();
    }
    if (this.comboScoreFxNode) {
      tween(this.comboScoreFxNode).stop();
      this.comboScoreFxNode.active = false;
    }
    this.comboNode.active = false;
  }

  private playScreenShake() {
    if (!this.cameraNode) {
      return;
    }
    tween(this.cameraNode).stop();
    this.cameraNode.setPosition(0, 0, 1000);
    tween(this.cameraNode)
      .to(0.035, { position: new Vec3(10, -8, 1000) })
      .to(0.045, { position: new Vec3(-8, 7, 1000) })
      .to(0.04, { position: new Vec3(5, -4, 1000) })
      .to(0.05, { position: new Vec3(0, 0, 1000) })
      .start();
  }

  onDestroy() {
    this.mobileNameInput.destroy();
  }
}
