import {
  Color,
  Graphics,
  Label,
  Node,
  Sprite,
  SpriteFrame,
  Tween,
  tween,
  UITransform,
  Vec3,
} from 'cc';
import { getAvatarGoodsDefinition } from './BottleHeroAvatarRuntime';
import { isPlayerAvatarGoodsUnlocked } from './BottleHeroAvatarGoodsUnlock';
import { getBossAnimationDisplayConfig, getBossBattleLayoutConfig, getBossBulletSpriteKey, BOSS_MARSHMALLOW_STAGE2_BOMB_FPS, BOSS_OCTOPUS_JELLYFISH_MINION_BULLET_DAMAGE_RATIO, BOSS_OCTOPUS_JELLYFISH_MINION_BULLET_LIFE_MAX, BOSS_OCTOPUS_JELLYFISH_MINION_BULLET_LIFE_MIN, BOSS_OCTOPUS_JELLYFISH_MINION_DISPLAY_WIDTH, BOSS_OCTOPUS_JELLYFISH_MINION_FPS, BOSS_OCTOPUS_JELLYFISH_MINION_SPRITE_KEY, MARSHMALLOW_STAGE_SWITCH_HP_RATIO, resolveBossAnimationAssetId, getSpritePreviewAsset } from './BottleHeroBossAssets';
import {
  ActiveStageState,
  BottleHeroBalanceConfig,
  getTimingItemDefinition,
  TimingItemDefinition,
  TimingPointTierId,
  TimingTargetKind,
} from './BottleHeroBalance';
import { AvatarGoodsId, LevelId } from './BottleHeroGameConfig';
import { BottleHeroGameplayAssetProvider, BottleHeroSfxPaths } from './BottleHeroAssetProvider';
import { randomRange } from './BottleHeroMathUtil';
import { getBottleWorldPosition, getTowerItemMaxHp } from './BottleHeroTowerMath';
import {
  BossAnimationId,
  BossBulletState,
  BossFxId,
  BossFxState,
  BossMinionState,
  GameState,
  HitKind,
  SpriteSheetPreviewAsset,
  TimingTargetState,
} from './BottleHeroTypes';

export interface BossBattleUiRefs {
  bossLayer: Node;
  bossWarningNode: Node;
  bossHudLayer: Node;
  bossNode: Node;
  bossSprite: Sprite;
  bossHpFillNode: Node;
  bossHpLabel: Label;
  bossSkillLabel: Label;
  bossComboTipNode: Node;
  bossComboTipSprite: Sprite;
  bossComboCountdownNode: Node;
  bossVictoryLayer: Node;
  bossRewardDimmerNode: Node;
  bossRewardIconNode: Node;
  bossRewardPanelNode: Node;
  bossRewardGoodsLayer: Node;
  bossRewardNextButton: Node;
  timingPanel: Node;
  hudLayer: Node;
  armNode: Node;
}

export interface BossBattleHost {
  getLevelId(): LevelId;
  getBossId(): string;
  getBalanceConfig(): BottleHeroBalanceConfig;
  getGameState(): GameState;
  setGameState(state: GameState): void;
  getScore(): number;
  addScore(amount: number): void;
  getStability(): number;
  getBottleCount(): number;
  getRunElapsedSeconds(): number;
  getCurrentWorldY(): number;
  getTowerDrift(): number;
  getTowerVisualX(): number;
  getTowerLean(): number;
  getTowerLeanVelocity(): number;
  setTowerLeanVelocity(value: number): void;
  isChargeActive(): boolean;
  hasActiveThrowBottles(): boolean;
  getAssets(): BottleHeroGameplayAssetProvider;
  getBossLabel(): string;
  getBossMinionSpriteKeys(): string[];
  getBossDisplayTint(): Color | null;
  getActiveStageState(): ActiveStageState;
  getBottleStepY(): number;
  getTowerCameraTargetWorldY(bossPhaseActive: boolean): number;
  getThrowAreaBaseX(): number;
  getHandSide(): number;
  getCombo(): number;
  setCombo(value: number): void;
  incrementCombo(): number;
  getSelectedAvatarGoodsId(): AvatarGoodsId;
  setSelectedAvatarGoodsId(id: AvatarGoodsId): void;
  getTowerLayer(): Node;
  getTowerItemHp(index: number): number | undefined;
  setTowerItemHp(index: number, hp: number): void;
  clearTowerItemHp(): void;
  scheduleOnce(callback: () => void, delay: number): void;
  endChargeVisuals(): void;
  clearTimingTargets(): void;
  clearAmbientActors(): void;
  setTimingPanelActive(active: boolean): void;
  setHudLayerActive(active: boolean): void;
  setTargetWorldY(y: number): void;
  applyStabilityPenalty(amount: number): void;
  pulseStabilityHud(color: Color, intensity: number): void;
  finishRun(reason: string): void;
  updateHud(): void;
  playScreenShake(): void;
  playBossBgm(): void;
  stopBossBgm(): void;
  stopBgm(): void;
  stopAvatarBgm(): void;
  playAvatarBgm(): void;
  playFeedback(kind: HitKind | 'miss'): void;
  recordThrowResult(kind: HitKind | 'miss'): void;
  playTimingPerfectFx(): void;
  playComboFx(combo: number, scoreGain: number): void;
  hideComboFx(): void;
  recoverStability(amount: number, label: string): void;
  setFoodBoostSeconds(seconds: number): void;
  getFoodBoostSeconds(): number;
  setThrowButtonPressed(pressed: boolean): void;
  tweenArmTap(): void;
  notePlayerAction(): void;
  persistFeedbackRunStats(bossWin: boolean): void;
  persistRunBestScore(): void;
  onBossVictory(): void;
  getNextLevelAfterBossVictory(): LevelId | null;
  showAvatarHome(): void;
  startRun(levelId: LevelId): void;
  isRewardTimingItem(kind: TimingTargetKind): boolean;
  markCollectedRewardTimingItem(kind: TimingTargetKind): void;
  dropTopBottles(count: number): void;
  getBossVictoryScoreBonus(): number;
  getBossVictoryRewardGoods(): AvatarGoodsId[];
  applyGrantedAvatarGoods(goodsId: AvatarGoodsId): void;
  createSpriteNode(name: string, parent: Node, frame: SpriteFrame, x: number, y: number, w: number, h: number): Node;
  createRectNode(name: string, parent: Node, x: number, y: number, w: number, h: number, color: Color): Node;
  clearNodeChildren(node: Node): void;
  flashTowerBottle(bottle: Node): void;
}

interface BossBattleLayout {
  moveYMin: number;
  moveYMax: number;
  enterStartY: number;
  enterTweenYs: readonly [number, number, number];
  moveTargetDefaultY: number;
}

export class BottleHeroBossBattleController {
  private static readonly BOSS_SPRITE_DISPLAY_WIDTH = 276;
  private static readonly BOSS_SPRITE_DISPLAY_HEIGHT = 270;
  /** Wide-frame bosses (L2 octopus) use correct aspect ratio; scale up from base width. */
  private static readonly BOSS_WIDE_FRAME_DISPLAY_SCALE = 1.3;
  /** Tall-frame bosses preserve portrait aspect from base height. */
  private static readonly BOSS_TALL_FRAME_DISPLAY_SCALE = 1.12;

  private readonly host: BossBattleHost;
  private ui: Partial<BossBattleUiRefs> = {};

  private bullets: BossBulletState[] = [];
  private minions: BossMinionState[] = [];
  private fxStates: BossFxState[] = [];
  private comboCountdownDigits: Node[] = [];

  private animationFrames: Partial<Record<BossAnimationId, SpriteFrame[]>> = {};
  private dualFormIdleFrames: Partial<Record<1 | 2, SpriteFrame[]>> = {};
  private dualFormHittedFrames: Partial<Record<1 | 2, SpriteFrame[]>> = {};
  private dualFormFrozenFrames: Partial<Record<1 | 2, SpriteFrame[]>> = {};
  private fxFrames: Partial<Record<BossFxId, SpriteFrame[]>> = {};

  triggeredThisRun = false;
  warningActive = false;
  battleActive = false;
  hp = 0;
  maxHp = 1;
  warningSeconds = 0;
  attackCooldown = 0;
  minionCooldown = 0;
  frozenSeconds = 0;
  comboAttackSeconds = 0;
  comboAttackTaps = 0;
  comboTipFrameIndex = 0;
  comboTipFrameTimer = 0;
  comboCountdownValue = -1;
  deathSequenceActive = false;
  baseScale = 2;
  moveTargetX = 0;
  moveTargetY = 330;
  moveSpeed = 1.5;
  moveTimer = 0;
  hitSoundCooldown = 0;
  bossForm: 1 | 2 = 1;
  stageSwitchActive = false;
  stageSwitchTriggered = false;
  anim: BossAnimationId = 'idle';
  animFrameIndex = 0;
  animFrameTimer = 0;
  animLoops = true;
  private frozenThawStarted = false;
  private frozenThawSequenceIndex = 0;

  private getBossBattleLayout(): BossBattleLayout {
    return getBossBattleLayoutConfig(this.host.getBossId());
  }

  private getBossBulletSpawnOffsetY(animationId: BossAnimationId): number {
    return getBossAnimationDisplayConfig(this.host.getBossId(), animationId).bulletSpawnOffsetY;
  }

  constructor(host: BossBattleHost) {
    this.host = host;
  }

  attachUi(ui: BossBattleUiRefs) {
    this.ui = ui;
  }

  setAnimationFrame(animationId: BossAnimationId, frames: SpriteFrame[]) {
    this.animationFrames[animationId] = frames;
  }

  setBossFormIdleFrames(form: 1 | 2, frames: SpriteFrame[]) {
    this.dualFormIdleFrames[form] = frames;
  }

  setBossFormHittedFrames(form: 1 | 2, frames: SpriteFrame[]) {
    this.dualFormHittedFrames[form] = frames;
  }

  setBossFormFrozenFrames(form: 1 | 2, frames: SpriteFrame[]) {
    this.dualFormFrozenFrames[form] = frames;
  }

  private resolveBossAnimationAsset(animationId: BossAnimationId) {
    return getSpritePreviewAsset(resolveBossAnimationAssetId(this.host.getBossId(), animationId, this.bossForm));
  }

  private resolveBossAnimationFrames(animationId: BossAnimationId): SpriteFrame[] | undefined {
    if (this.host.getBossId() === 'boss_alien_03' && this.bossForm === 2) {
      if (animationId === 'attack') {
        return this.animationFrames.idle ?? this.dualFormIdleFrames[2];
      }
      if (animationId === 'hitted') {
        return this.dualFormHittedFrames[2] ?? this.animationFrames.hitted;
      }
      if (animationId === 'frozen') {
        return this.dualFormFrozenFrames[2] ?? this.animationFrames.frozen;
      }
    }
    if (this.host.getBossId() === 'boss_alien_03') {
      if (animationId === 'hitted') {
        return this.dualFormHittedFrames[1] ?? this.animationFrames.hitted;
      }
      if (animationId === 'frozen') {
        return this.dualFormFrozenFrames[1] ?? this.animationFrames.frozen;
      }
    }
    return this.animationFrames[animationId];
  }

  setFxFrame(fxId: BossFxId, frames: SpriteFrame[]) {
    this.fxFrames[fxId] = frames;
  }

  isBossPhaseActive() {
    return this.battleActive || this.warningActive || this.deathSequenceActive;
  }

  applyAnimationBindings() {
    this.bossForm = 1;
    this.stageSwitchActive = false;
    this.stageSwitchTriggered = false;
    this.anim = 'idle';
    this.animFrameIndex = 0;
    this.animFrameTimer = 0;
    this.animLoops = true;
    const frames = this.animationFrames.idle;
    if (frames?.length) {
      this.dualFormIdleFrames[1] = frames;
    }
    if (frames?.[0] && this.ui.bossSprite) {
      this.ui.bossSprite.spriteFrame = frames[0];
    }
    this.applyBossSpriteDisplay('idle');
    const tint = this.host.getBossDisplayTint();
    if (this.ui.bossSprite) {
      this.ui.bossSprite.color = tint ?? new Color(255, 255, 255, 255);
    }
  }

  reset() {
    const balance = this.host.getBalanceConfig();
    this.baseScale = balance.boss.displayScale ?? 2;
    this.triggeredThisRun = false;
    this.warningActive = false;
    this.battleActive = false;
    this.hp = 0;
    this.maxHp = Math.max(1, balance.boss.maxHp);
    this.warningSeconds = 0;
    this.attackCooldown = 0;
    this.minionCooldown = 0;
    this.frozenSeconds = 0;
    this.frozenThawStarted = false;
    this.frozenThawSequenceIndex = 0;
    this.comboAttackSeconds = 0;
    this.comboAttackTaps = 0;
    this.comboTipFrameIndex = 0;
    this.comboTipFrameTimer = 0;
    this.comboCountdownValue = -1;
    this.deathSequenceActive = false;
    this.moveTargetX = 0;
    this.moveTargetY = 330;
    this.moveSpeed = 1.5;
    this.moveTimer = 0;
    this.hitSoundCooldown = 0;
    this.bossForm = 1;
    this.stageSwitchActive = false;
    this.stageSwitchTriggered = false;
    this.anim = 'idle';
    this.animFrameIndex = 0;
    this.animFrameTimer = 0;
    this.animLoops = true;
    this.host.clearTowerItemHp();
    this.clearActors();
    const { bossLayer, bossWarningNode, bossNode, bossHudLayer, bossVictoryLayer, bossRewardIconNode } = this.ui;
    if (bossLayer) bossLayer.active = false;
    if (bossWarningNode) bossWarningNode.active = false;
    if (bossNode) bossNode.active = false;
    if (bossHudLayer) bossHudLayer.active = false;
    this.hideComboTip();
    if (bossVictoryLayer) bossVictoryLayer.active = false;
    if (bossRewardIconNode) Tween.stopAllByTarget(bossRewardIconNode);
  }

  abortForGameOver() {
    this.warningActive = false;
    this.battleActive = false;
    this.frozenSeconds = 0;
    this.frozenThawStarted = false;
    this.frozenThawSequenceIndex = 0;
    this.comboAttackSeconds = 0;
    this.comboAttackTaps = 0;
    this.deathSequenceActive = false;
    this.clearActors();
    if (this.ui.bossLayer) this.ui.bossLayer.active = false;
    if (this.ui.bossVictoryLayer) this.ui.bossVictoryLayer.active = false;
  }

  update(deltaTime: number) {
    this.tryTrigger();
    this.updateFx(deltaTime);
    this.updateBullets(deltaTime);
    this.updateMinions(deltaTime);
    this.hitSoundCooldown = Math.max(0, this.hitSoundCooldown - deltaTime);
    this.updateComboTapTip(deltaTime);

    if (!this.warningActive && !this.battleActive && !this.deathSequenceActive) {
      return;
    }

    this.updateAnimation(deltaTime);
    if (this.deathSequenceActive) return;
    if (this.warningActive) {
      this.tickWarning(deltaTime);
      return;
    }
    if (!this.battleActive) return;
    this.tickBattle(deltaTime);
  }

  triggerWarning() {
    const balance = this.host.getBalanceConfig();
    this.triggeredThisRun = true;
    this.warningActive = true;
    this.battleActive = false;
    this.warningSeconds = balance.boss.warningSeconds;
    this.host.endChargeVisuals();
    this.host.clearTimingTargets();
    this.host.clearAmbientActors();
    this.host.setTimingPanelActive(false);
    const { bossLayer, bossWarningNode, bossHudLayer, bossNode } = this.ui;
    if (bossLayer) bossLayer.active = true;
    if (bossWarningNode) {
      bossWarningNode.active = true;
      bossWarningNode.setScale(0.8, 0.8, 1);
      tween(bossWarningNode).stop();
      tween(bossWarningNode)
        .to(0.16, { scale: new Vec3(1.16, 1.16, 1) })
        .to(0.12, { scale: new Vec3(1, 1, 1) })
        .start();
    }
    if (bossHudLayer) bossHudLayer.active = false;
    if (bossNode) bossNode.active = false;
    this.host.setTargetWorldY(this.host.getTowerCameraTargetWorldY(true));
    this.host.getAssets().playSfx(BottleHeroSfxPaths.bossWarning, 0.9);
    this.host.playScreenShake();
  }

  applyMiss() {
    this.host.setCombo(0);
    this.host.hideComboFx();
    this.host.recordThrowResult('miss');
    this.host.playFeedback('miss');
    this.host.getAssets().playCoreClip('miss');
    this.host.updateHud();
  }

  applyTimingItem(target: TimingTargetState) {
    const balance = this.host.getBalanceConfig();
    const definition = getTimingItemDefinition(balance, target.kind);
    if (this.host.isRewardTimingItem(target.kind) && definition?.oneTimePerRun) {
      this.host.markCollectedRewardTimingItem(target.kind);
    }
    this.host.getAssets().playCoreClip('throw');
    this.host.getAssets().playCoreClip('perfect');
    this.host.playTimingPerfectFx();
    this.host.recordThrowResult('perfect');
    this.applyTimingItemEffect(definition, target);
    this.updateHud();
    this.host.updateHud();
  }

  applyPointHit(kind: HitKind, target: TimingTargetState) {
    const balance = this.host.getBalanceConfig();
    const tier = target.pointTier || 'normal';
    const perfect = kind === 'perfect';
    this.host.getAssets().playCoreClip('throw');
    this.host.getAssets().playCoreClip(kind);
    this.host.playFeedback(kind);
    this.host.recordThrowResult(kind);
    if (perfect) {
      this.host.incrementCombo();
    } else {
      this.host.setCombo(0);
      this.host.hideComboFx();
    }
    const baseDamage = getBossTierDamage(balance, tier) * (perfect ? 1 : 0.62);
    const hitCount = getBossTierHitCount(tier);
    const combo = this.host.getCombo();
    const scoreGain = Math.round((target.scoreValue || 100) * (perfect ? Math.min(combo, balance.combo.perfectMultiplierCap) : 0.7));
    this.host.addScore(scoreGain);
    if (perfect) {
      this.host.playComboFx(combo, scoreGain);
      this.host.playTimingPerfectFx();
    }
    for (let i = 0; i < hitCount; i++) {
      this.host.scheduleOnce(() => this.damageBossOrMinion(baseDamage / hitCount, true), i * 0.09);
    }
    this.host.updateHud();
  }

  fireComboTap() {
    const balance = this.host.getBalanceConfig();
    if (this.comboAttackTaps <= 0) {
      this.hideComboTip();
      return;
    }
    this.host.notePlayerAction();
    this.comboAttackTaps = Math.max(0, this.comboAttackTaps - 1);
    this.host.setThrowButtonPressed(true);
    this.host.tweenArmTap();
    const combo = this.host.incrementCombo();
    this.damageBossOrMinion(balance.boss.normalAttackDamage * 0.72, true);
    const scoreGain = Math.round(65 * Math.min(combo, balance.combo.perfectMultiplierCap));
    this.host.addScore(scoreGain);
    this.host.playComboFx(combo, scoreGain);
    this.host.getAssets().playCoreClip('perfect');
    if (this.comboAttackTaps <= 0) this.hideComboTip();
    this.host.updateHud();
  }

  damageBossOrMinion(damage: number, allowMinionTarget: boolean) {
    if (!this.battleActive || this.hp <= 0) return;
    if (allowMinionTarget && this.areMinionsActive() && this.minions.length > 0 && Math.random() < 0.28) {
      const minion = this.minions[Math.floor(Math.random() * this.minions.length)];
      minion.hp -= damage * 1.35;
      this.spawnImpactFx(minion.node.position.x, minion.node.position.y, this.frozenSeconds > 0 ? 'frozenHit' : 'hit', 0.62);
      this.playHitSound();
      if (minion.hp <= 0) {
        tween(minion.node)
          .to(0.16, { scale: new Vec3(1.25, 1.25, 1) })
          .to(0.18, { scale: new Vec3(0.1, 0.1, 1) })
          .call(() => { if (minion.node.isValid) minion.node.destroy(); })
          .start();
        this.minions = this.minions.filter((candidate) => candidate !== minion);
        this.host.addScore(90);
      }
      return;
    }
    const bossNode = this.ui.bossNode;
    const prevHp = this.hp;
    this.hp = Math.max(0, this.hp - damage);
    this.notifyMinionUnlockIfNeeded(prevHp);
    if (this.shouldTriggerMarshmallowStageSwitch(prevHp)) {
      this.startStageSwitch();
    } else if (!this.stageSwitchActive) {
      this.setAnimation(this.frozenSeconds > 0 ? 'frozen' : 'hitted', this.frozenSeconds > 0 ? undefined : false, { restart: false });
    }
    if (bossNode) {
      this.spawnImpactFx(
        bossNode.position.x + randomRange(-74, 74),
        bossNode.position.y + randomRange(-78, 72),
        this.frozenSeconds > 0 ? 'frozenHit' : 'hit',
        randomRange(0.82, 1.2),
      );
      tween(bossNode).stop();
      tween(bossNode)
        .to(0.05, { scale: new Vec3(this.baseScale * 1.08, this.baseScale * 0.94, 1) })
        .to(0.1, { scale: new Vec3(this.baseScale, this.baseScale, 1) })
        .start();
    }
    this.playHitSound();
    if (this.hp <= 0) this.defeatBoss();
    else this.updateHud();
  }

  openRewardPanel() {
    const { bossRewardIconNode, bossRewardPanelNode, bossRewardNextButton } = this.ui;
    this.host.getAssets().playSfx(BottleHeroSfxPaths.rewardIcon, 0.86);
    if (bossRewardIconNode) {
      Tween.stopAllByTarget(bossRewardIconNode);
      bossRewardIconNode.active = false;
    }
    if (bossRewardPanelNode) {
      bossRewardPanelNode.active = true;
      bossRewardPanelNode.setScale(0.92, 0.92, 1);
      this.renderRewardGoods();
      if (bossRewardNextButton) {
        bossRewardNextButton.active = this.host.getNextLevelAfterBossVictory() !== null;
      }
      tween(bossRewardPanelNode)
        .to(0.12, { scale: new Vec3(1.04, 1.04, 1) })
        .to(0.1, { scale: new Vec3(1, 1, 1) })
        .start();
    }
  }

  closeVictoryToAvatarHome() {
    const granted = this.host.getBossVictoryRewardGoods();
    let goodsId = this.host.getSelectedAvatarGoodsId();
    if (goodsId === 'none' && granted.length > 0) {
      goodsId = granted[0];
    }
    if (goodsId !== 'none' && isPlayerAvatarGoodsUnlocked(goodsId)) {
      this.host.applyGrantedAvatarGoods(goodsId);
    }
    this.host.persistRunBestScore();
    const { bossRewardIconNode, bossVictoryLayer, hudLayer, bossLayer } = this.ui;
    if (bossRewardIconNode) Tween.stopAllByTarget(bossRewardIconNode);
    if (bossVictoryLayer) bossVictoryLayer.active = false;
    if (hudLayer) hudLayer.active = false;
    if (bossLayer) bossLayer.active = false;
    this.deathSequenceActive = false;
    this.host.setGameState('avatarhome');
    this.host.showAvatarHome();
  }

  closeVictoryToNextLevel() {
    const nextLevel = this.host.getNextLevelAfterBossVictory();
    if (!nextLevel) {
      this.closeVictoryToAvatarHome();
      return;
    }
    this.host.persistRunBestScore();
    const { bossRewardIconNode, bossVictoryLayer, hudLayer, bossLayer } = this.ui;
    if (bossRewardIconNode) Tween.stopAllByTarget(bossRewardIconNode);
    if (bossVictoryLayer) bossVictoryLayer.active = false;
    if (hudLayer) hudLayer.active = false;
    if (bossLayer) bossLayer.active = false;
    this.deathSequenceActive = false;
    this.host.startRun(nextLevel);
  }

  getAnimationDuration(animationId: BossAnimationId) {
    const frames = this.resolveBossAnimationFrames(animationId);
    const asset = this.resolveBossAnimationAsset(animationId);
    return Math.max(0.5, (frames?.length || asset.frameCount || 1) / Math.max(1, asset.fps));
  }

  private applyTimingItemEffect(definition: TimingItemDefinition | null, _target: TimingTargetState) {
    const balance = this.host.getBalanceConfig();
    const bossNode = this.ui.bossNode;
    if (definition?.effect === 'recoverStability') {
      this.host.getAssets().playSfx(BottleHeroSfxPaths.recoverStability, 0.9);
      this.host.playFeedback('good');
      this.host.recoverStability(balance.stability.stabilityRecoverAmount, '+STABILITY');
      this.host.addScore(90);
    } else if (definition?.effect === 'multiplyThrow') {
      this.host.playFeedback('perfect');
      const hits = Math.floor(randomRange(3, 7));
      for (let i = 0; i < hits; i++) {
        this.host.scheduleOnce(() => this.damageBossOrMinion(balance.boss.goodAttackDamage * 0.65, true), i * 0.08);
      }
      this.host.addScore(120 * hits);
    } else if (definition?.effect === 'foodBoost') {
      const duration = randomRange(balance.stability.foodDurationMin, balance.stability.foodDurationMax);
      this.host.setFoodBoostSeconds(Math.max(this.host.getFoodBoostSeconds(), duration));
      this.host.playFeedback('perfect');
      this.host.addScore(120);
    } else if (definition?.effect === 'comboAttackSkill') {
      const minTaps = Math.max(1, Math.floor(balance.boss.comboSkillDurationMin));
      const maxTaps = Math.max(minTaps, Math.floor(balance.boss.comboSkillDurationMax));
      this.comboAttackTaps = Math.floor(randomRange(minTaps, maxTaps + 1));
      this.comboAttackSeconds = 0;
      this.comboTipFrameTimer = 0.16;
      this.comboCountdownValue = -1;
      this.host.playFeedback('perfect');
      if (this.ui.bossSkillLabel) this.ui.bossSkillLabel.node.active = true;
      this.host.addScore(180);
    } else if (definition?.effect === 'frozenSkill') {
      this.frozenSeconds = randomRange(balance.boss.frozenSkillDurationMin, balance.boss.frozenSkillDurationMax);
      this.setAnimation('frozen');
      if (bossNode) {
        this.spawnImpactFx(
          bossNode.position.x + randomRange(-48, 48),
          bossNode.position.y + randomRange(-42, 42),
          'frozenHit',
          1.25,
        );
      }
      this.host.getAssets().playSfx(BottleHeroSfxPaths.bossFrozened, 0.82);
      this.host.playFeedback('perfect');
      this.host.addScore(180);
    }
  }

  private tryTrigger() {
    const balance = this.host.getBalanceConfig();
    if (!balance.boss.enabled || this.triggeredThisRun || this.battleActive || this.warningActive || this.host.getGameState() !== 'playing') {
      return;
    }
    if (this.host.getScore() < balance.boss.triggerScore || this.host.isChargeActive() || this.host.hasActiveThrowBottles()) {
      return;
    }
    this.triggerWarning();
  }

  private tickWarning(deltaTime: number) {
    const { bossWarningNode } = this.ui;
    this.warningSeconds -= deltaTime;
    if (bossWarningNode) {
      const pulse = 1 + Math.sin(this.host.getRunElapsedSeconds() * 18) * 0.07;
      bossWarningNode.setScale(pulse, pulse, 1);
    }
    if (this.warningSeconds <= 0) this.enterBattle();
  }

  private enterBattle() {
    const balance = this.host.getBalanceConfig();
    this.baseScale = balance.boss.displayScale ?? 2;
    const { bossWarningNode, bossLayer, bossHudLayer, bossNode, bossSprite } = this.ui;
    this.warningActive = false;
    this.battleActive = true;
    if (bossWarningNode) bossWarningNode.active = false;
    this.maxHp = Math.max(1, balance.boss.maxHp);
    this.hp = this.maxHp;
    this.attackCooldown = 1.2;
    this.minionCooldown = 2.4;
    this.frozenSeconds = 0;
    this.frozenThawStarted = false;
    this.frozenThawSequenceIndex = 0;
    this.comboAttackSeconds = 0;
    this.comboAttackTaps = 0;
    this.deathSequenceActive = false;
    this.bossForm = 1;
    this.stageSwitchActive = false;
    this.stageSwitchTriggered = false;
    this.hideComboTip();
    if (bossLayer) bossLayer.active = true;
    if (bossHudLayer) bossHudLayer.active = true;
    if (bossNode) {
      const layout = this.getBossBattleLayout();
      bossNode.active = true;
      const tint = this.host.getBossDisplayTint();
      if (bossSprite) {
        bossSprite.color = tint ?? new Color(255, 255, 255, 255);
      }
      const [enterLandA, enterLandB, enterLandC] = layout.enterTweenYs;
      bossNode.setPosition(0, layout.enterStartY, 0);
      bossNode.setScale(this.baseScale, this.baseScale, 1);
      tween(bossNode)
        .to(0.5, { position: new Vec3(0, enterLandA, 0) })
        .to(0.12, { position: new Vec3(0, enterLandB, 0) })
        .to(0.16, { position: new Vec3(0, enterLandC, 0) })
        .call(() => this.pickNextMoveTarget())
        .start();
    }
    this.bringHudToFront();
    this.host.setTargetWorldY(this.host.getTowerCameraTargetWorldY(true));
    this.moveTargetX = 0;
    this.moveTargetY = this.getBossBattleLayout().moveTargetDefaultY;
    this.moveTimer = 0.7;
    this.setAnimation('idle');
    this.host.stopBgm();
    this.host.stopAvatarBgm();
    this.host.playBossBgm();
    this.updateHud();
  }

  private tickBattle(deltaTime: number) {
    if (this.stageSwitchActive) {
      this.updateHud();
      return;
    }

    this.frozenSeconds = Math.max(0, this.frozenSeconds - deltaTime);
    if (this.frozenSeconds > 0) {
      if (this.anim !== 'frozen' && this.anim !== 'switchStage') {
        this.setAnimation('frozen');
      }
    } else if (this.anim === 'frozen') {
      this.frozenThawStarted = false;
      this.frozenThawSequenceIndex = 0;
      this.setAnimation('idle');
    }

    if (this.frozenSeconds <= 0) {
      this.updateMovement(deltaTime);
      this.attackCooldown -= deltaTime;
      if (this.attackCooldown <= 0) {
        this.spawnAttack();
        this.attackCooldown = this.getNextAttackInterval();
      }
    }

    this.minionCooldown -= deltaTime;
    if (this.areMinionsActive() && this.minionCooldown <= 0) {
      this.spawnMinion();
      this.minionCooldown = this.getNextMinionSpawnInterval();
    }
    this.updateHud();
  }

  private updateAnimation(deltaTime: number) {
    const { bossSprite, bossNode } = this.ui;
    if (!bossSprite || !bossNode?.active) return;
    const frames = this.resolveBossAnimationFrames(this.anim);
    if (!frames || frames.length === 0) return;
    const asset = this.resolveBossAnimationAsset(this.anim);
    if (this.anim === 'frozen' && asset.frozenPlayback && this.frozenSeconds > 0 && !this.stageSwitchActive) {
      this.updateFrozenHoldThawAnimation(deltaTime, frames, asset, bossSprite);
      return;
    }
    this.animFrameTimer += deltaTime;
    const frameDuration = 1 / Math.max(1, asset.fps);
    while (this.animFrameTimer >= frameDuration) {
      this.animFrameTimer -= frameDuration;
      this.animFrameIndex += 1;
      if (this.animFrameIndex >= frames.length) {
        if (this.animLoops) {
          this.animFrameIndex = 0;
        } else {
          this.animFrameIndex = frames.length - 1;
          if (this.anim === 'attack' || this.anim === 'hitted') {
            this.setAnimation(
              this.frozenSeconds > 0 ? 'frozen' : 'idle',
              this.frozenSeconds > 0 ? undefined : undefined,
              { restart: false },
            );
            return;
          }
          if (this.anim === 'switchStage') {
            this.completeStageSwitch();
            return;
          }
        }
      }
      bossSprite.spriteFrame = frames[this.animFrameIndex];
    }
  }

  private updateFrozenHoldThawAnimation(
    deltaTime: number,
    frames: SpriteFrame[],
    asset: SpriteSheetPreviewAsset,
    bossSprite: Sprite,
  ) {
    const playback = asset.frozenPlayback!;
    const thawIndices = playback.thawFrameIndices;
    const holdIndex = playback.holdFrameIndex ?? 0;
    const fps = Math.max(1, asset.fps);
    const thawDuration = thawIndices.length / fps;

    if (this.frozenSeconds > thawDuration) {
      this.frozenThawStarted = false;
      this.frozenThawSequenceIndex = 0;
      this.animLoops = false;
      this.animFrameIndex = holdIndex;
      this.animFrameTimer = 0;
      bossSprite.spriteFrame = frames[holdIndex];
      return;
    }

    this.animLoops = false;
    if (!this.frozenThawStarted) {
      this.frozenThawStarted = true;
      this.frozenThawSequenceIndex = 0;
      this.animFrameTimer = 0;
      this.animFrameIndex = thawIndices[0];
      bossSprite.spriteFrame = frames[thawIndices[0]];
      return;
    }

    this.animFrameTimer += deltaTime;
    const frameDuration = 1 / fps;
    while (this.animFrameTimer >= frameDuration && this.frozenThawSequenceIndex < thawIndices.length - 1) {
      this.animFrameTimer -= frameDuration;
      this.frozenThawSequenceIndex += 1;
      const frameIndex = thawIndices[this.frozenThawSequenceIndex];
      this.animFrameIndex = frameIndex;
      bossSprite.spriteFrame = frames[frameIndex];
    }
  }

  private setAnimation(
    animationId: BossAnimationId,
    loop?: boolean,
    options?: { restart?: boolean },
  ) {
    const asset = this.resolveBossAnimationAsset(animationId);
    const resolvedLoop = loop ?? (
      animationId === 'idle'
      || animationId === 'dizziness'
      || (animationId === 'frozen' && !asset.frozenPlayback)
    );
    const restart = options?.restart !== false;
    if (this.anim === animationId && this.animLoops === resolvedLoop && !restart) {
      return;
    }
    this.anim = animationId;
    this.animLoops = resolvedLoop;
    if (animationId === 'frozen' && restart) {
      this.frozenThawStarted = false;
      this.frozenThawSequenceIndex = 0;
    }
    this.animFrameIndex = 0;
    this.animFrameTimer = 0;
    const frames = this.resolveBossAnimationFrames(animationId);
    if (frames?.[0] && this.ui.bossSprite) {
      const startIndex = animationId === 'frozen' && asset.frozenPlayback
        ? (asset.frozenPlayback.holdFrameIndex ?? 0)
        : 0;
      this.animFrameIndex = startIndex;
      this.ui.bossSprite.spriteFrame = frames[startIndex];
    }
    this.applyBossSpriteDisplay(animationId);
  }

  private applyBossSpriteDisplay(animationId: BossAnimationId) {
    const { bossSprite } = this.ui;
    if (!bossSprite) {
      return;
    }
    const transform = bossSprite.node.getComponent(UITransform);
    if (!transform) {
      return;
    }
    const bossId = this.host.getBossId();
    const asset = this.resolveBossAnimationAsset(animationId);
    const display = getBossAnimationDisplayConfig(bossId, animationId);
    const frameAspect = asset.frameWidth / Math.max(1, asset.frameHeight);
    const wideScale = display.wideDisplayScale ?? BottleHeroBossBattleController.BOSS_WIDE_FRAME_DISPLAY_SCALE;
    if (frameAspect > 1.35) {
      const width = BottleHeroBossBattleController.BOSS_SPRITE_DISPLAY_WIDTH * wideScale;
      const height = width * (asset.frameHeight / Math.max(1, asset.frameWidth));
      transform.setContentSize(width, height);
    } else if (frameAspect < 0.85) {
      const height = BottleHeroBossBattleController.BOSS_SPRITE_DISPLAY_HEIGHT
        * BottleHeroBossBattleController.BOSS_TALL_FRAME_DISPLAY_SCALE;
      const width = height * frameAspect;
      transform.setContentSize(width, height);
    } else {
      transform.setContentSize(
        BottleHeroBossBattleController.BOSS_SPRITE_DISPLAY_WIDTH,
        BottleHeroBossBattleController.BOSS_SPRITE_DISPLAY_HEIGHT,
      );
    }
    transform.setAnchorPoint(display.anchor.x, display.anchor.y);
    bossSprite.node.setPosition(0, display.spriteLocalOffsetY, 0);
  }

  private updateHud() {
    const { bossHudLayer, bossHpFillNode, bossHpLabel, bossSkillLabel } = this.ui;
    if (!bossHudLayer || !bossHudLayer.active || !bossHpFillNode) return;
    this.bringHudToFront();
    const ratio = Math.max(0, Math.min(1, this.hp / Math.max(1, this.maxHp)));
    bossHpFillNode.setScale(ratio, 1, 1);
    bossHpFillNode.setPosition(-362 * (1 - ratio), 0, 0);
    if (bossHpLabel) bossHpLabel.string = '';
    const skills: string[] = [];
    if (this.frozenSeconds > 0) skills.push(`FROZEN ${this.frozenSeconds.toFixed(1)}s`);
    if (this.comboAttackTaps > 0) skills.push(`COMBO TAP ${this.comboAttackTaps}`);
    if (bossSkillLabel) {
      bossSkillLabel.string = skills.length > 0 ? skills.join('  ') : this.host.getBossLabel();
      bossSkillLabel.node.active = true;
    }
  }

  private bringHudToFront() {
    const { bossHudLayer } = this.ui;
    if (bossHudLayer?.parent) {
      bossHudLayer.setSiblingIndex(bossHudLayer.parent.children.length - 1);
    }
  }

  private pickNextMoveTarget() {
    const layout = this.getBossBattleLayout();
    this.moveTargetX = randomRange(-238, 238);
    this.moveTargetY = randomRange(layout.moveYMin, layout.moveYMax);
    this.moveSpeed = randomRange(1.05, 3.35);
    this.moveTimer = randomRange(0.35, 1.25);
  }

  private updateMovement(deltaTime: number) {
    const { bossNode } = this.ui;
    if (!bossNode?.active) return;
    this.moveTimer -= deltaTime;
    if (this.moveTimer <= 0) this.pickNextMoveTarget();
    const current = bossNode.position;
    const ratio = Math.min(1, deltaTime * this.moveSpeed);
    const targetY = this.moveTargetY + Math.sin(this.host.getRunElapsedSeconds() * 3.4) * 10;
    bossNode.setPosition(
      current.x + (this.moveTargetX - current.x) * ratio,
      current.y + (targetY - current.y) * ratio,
      0,
    );
  }

  private updateComboTipPosition() {
    const { bossComboTipNode, bossComboCountdownNode } = this.ui;
    if (!bossComboTipNode || !bossComboCountdownNode) return;
    const x = this.host.getThrowAreaBaseX();
    bossComboCountdownNode.setPosition(x, -220, 0);
    bossComboTipNode.setPosition(x, -306, 0);
  }

  private updateComboTapTip(deltaTime: number) {
    const { bossComboTipNode, bossComboCountdownNode, bossComboTipSprite } = this.ui;
    if (!bossComboTipNode || !bossComboCountdownNode) return;
    const active = this.battleActive && this.comboAttackTaps > 0;
    bossComboTipNode.active = active;
    bossComboCountdownNode.active = active;
    if (!active) {
      this.comboCountdownValue = -1;
      return;
    }
    this.updateComboTipPosition();
    this.comboTipFrameTimer += deltaTime;
    if (this.comboTipFrameTimer >= 0.16) {
      this.comboTipFrameTimer = 0;
      this.comboTipFrameIndex = 1 - this.comboTipFrameIndex;
      const assets = this.host.getAssets();
      if (bossComboTipSprite) {
        bossComboTipSprite.spriteFrame = this.comboTipFrameIndex === 0
          ? assets.getSprite('bossComboTip01')
          : assets.getSprite('bossComboTip02');
      }
    }
    const pulse = 1 + Math.sin(this.host.getRunElapsedSeconds() * 16) * 0.08;
    bossComboTipNode.setScale(pulse, pulse, 1);
    this.setComboCountdown(Math.max(0, Math.ceil(this.comboAttackTaps)));
  }

  private setComboCountdown(value: number) {
    const { bossComboCountdownNode } = this.ui;
    const comboDigitFrames = this.host.getAssets().getComboDigitFrames();
    if (this.comboCountdownValue === value || comboDigitFrames.length === 0 || !bossComboCountdownNode) return;
    this.comboCountdownValue = value;
    for (const node of this.comboCountdownDigits) node.destroy();
    this.comboCountdownDigits = [];
    const digits = String(value).split('');
    const width = 46;
    const startX = -(digits.length - 1) * width * 0.5;
    digits.forEach((digit, index) => {
      const frame = comboDigitFrames[Number(digit)];
      if (!frame) return;
      const node = this.host.createSpriteNode(
        `BossComboDigit_${index}`,
        bossComboCountdownNode,
        frame,
        startX + index * width,
        0,
        44,
        58,
      );
      this.comboCountdownDigits.push(node);
    });
    bossComboCountdownNode.setScale(1.12, 1.12, 1);
    tween(bossComboCountdownNode)
      .to(0.08, { scale: new Vec3(1.28, 1.28, 1) })
      .to(0.12, { scale: new Vec3(1.12, 1.12, 1) })
      .start();
  }

  private hideComboTip() {
    const { bossComboTipNode, bossComboCountdownNode } = this.ui;
    if (bossComboTipNode) {
      bossComboTipNode.active = false;
      bossComboTipNode.setScale(1, 1, 1);
    }
    if (bossComboCountdownNode) bossComboCountdownNode.active = false;
    this.comboCountdownValue = -1;
    this.comboAttackTaps = 0;
  }

  private clearActors() {
    for (const bullet of this.bullets) if (bullet.node.isValid) bullet.node.destroy();
    for (const minion of this.minions) if (minion.node.isValid) minion.node.destroy();
    for (const fx of this.fxStates) if (fx.node.isValid) fx.node.destroy();
    this.bullets = [];
    this.minions = [];
    this.fxStates = [];
  }

  private getNextAttackInterval() {
    const balance = this.host.getBalanceConfig();
    const base = Math.max(0.5, balance.boss.bossAttackInterval);
    const state = this.host.getActiveStageState();
    const bossAdvantage = this.hp / Math.max(1, this.maxHp) - this.host.getStability() / Math.max(1, balance.stability.initialStability);
    const pressure = state.dynamic.pressure / Math.max(1, balance.dynamic.maxPressure);
    const assist = state.dynamic.assist / Math.max(1, balance.dynamic.maxAssist);
    return Math.max(0.75, base * (1 - pressure * 0.24 + assist * 0.28 + Math.max(0, bossAdvantage) * 0.28));
  }

  private getNextMinionSpawnInterval() {
    return Math.max(2.5, this.host.getBalanceConfig().boss.minionSpawnInterval * randomRange(0.82, 1.2));
  }

  private getMinionUnlockHpRatio() {
    const configured = this.host.getBalanceConfig().boss.minionUnlockHpRatio;
    return configured === undefined ? 1 : configured;
  }

  private areMinionsActive() {
    const balance = this.host.getBalanceConfig();
    if ((balance.boss.maxMinions ?? 2) <= 0) {
      return false;
    }
    const unlockRatio = this.getMinionUnlockHpRatio();
    if (unlockRatio >= 1) {
      return true;
    }
    return this.hp / Math.max(1, this.maxHp) <= unlockRatio;
  }

  private notifyMinionUnlockIfNeeded(prevHp: number) {
    const unlockRatio = this.getMinionUnlockHpRatio();
    if (unlockRatio >= 1) {
      return;
    }
    const threshold = this.maxHp * unlockRatio;
    if (prevHp > threshold && this.hp <= threshold && this.hp > 0) {
      this.minionCooldown = Math.min(this.minionCooldown, 0.35);
    }
  }

  private spawnAttack() {
    if (!this.battleActive || this.hp <= 0 || this.stageSwitchActive) return;
    this.setAnimation('attack', false);
    this.host.getAssets().playSfx(BottleHeroSfxPaths.bossBulletAttack, 0.62);
    const areaAttack = Math.random() < 0.28;
    const count = areaAttack ? Math.floor(randomRange(5, 8)) : Math.floor(randomRange(1, 4));
    for (let i = 0; i < count; i++) {
      this.host.scheduleOnce(() => this.spawnBullet(areaAttack), i * 0.12);
    }
  }

  private spawnBullet(areaAttack: boolean) {
    const balance = this.host.getBalanceConfig();
    const assets = this.host.getAssets();
    const bossId = this.host.getBossId();
    const bulletSpriteKey = getBossBulletSpriteKey(bossId, this.bossForm);
    const bulletFrames = assets.getBossBulletFrames(bossId, this.bossForm);
    const bossBulletFrame = bulletFrames[0] ?? assets.getSprite(bulletSpriteKey);
    const { bossLayer, bossNode, bossSprite } = this.ui;
    if (!this.battleActive || this.stageSwitchActive || !bossBulletFrame?.texture || !bossLayer || !bossNode) return;
    const spriteOffsetY = bossSprite?.node.position.y ?? 0;
    const startX = bossNode.position.x + randomRange(-86, 86);
    const startY = bossNode.position.y + spriteOffsetY + this.getBossBulletSpawnOffsetY(this.anim) + randomRange(-20, 36);
    const bottleCount = this.host.getBottleCount();
    const targetIndex = Math.max(0, bottleCount - 1 - Math.floor(randomRange(0, areaAttack ? 6 : 3)));
    const target = this.getBottleScreenPosition(targetIndex);
    const targetX = target.x + randomRange(-90, 90);
    const targetY = target.y + randomRange(-35, 40);
    const animatedBomb = bulletFrames.length > 1;
    const bulletSize = animatedBomb
      ? (areaAttack ? 144 : 168)
      : (areaAttack ? 58 : 70);
    const bullet = this.host.createSpriteNode(
      'BossBullet',
      bossLayer,
      bossBulletFrame,
      startX,
      startY,
      bulletSize,
      bulletSize,
    );
    const bulletSprite = bullet.getComponent(Sprite)!;
    bullet.setScale(0.25, 0.25, 1);
    this.bullets.push({
      node: bullet,
      sprite: bulletSprite,
      targetIndex,
      life: 0,
      maxLife: areaAttack ? randomRange(0.72, 0.95) : randomRange(0.6, 0.82),
      startX,
      startY,
      targetX,
      targetY,
      damage: balance.boss.bulletStabilityDamage * (areaAttack ? 0.62 : 0.82),
      frames: bulletFrames,
      frameIndex: 0,
      frameTimer: 0,
      fps: bulletFrames.length > 1 ? BOSS_MARSHMALLOW_STAGE2_BOMB_FPS : 1,
    });
  }

  private updateBullets(deltaTime: number) {
    if (this.stageSwitchActive) {
      return;
    }
    this.bullets = this.bullets.filter((bullet) => {
      if (!bullet.node.isValid) return false;
      bullet.life += deltaTime;
      if (bullet.frames.length > 1) {
        bullet.frameTimer += deltaTime;
        const frameDuration = 1 / Math.max(1, bullet.fps);
        while (bullet.frameTimer >= frameDuration) {
          bullet.frameTimer -= frameDuration;
          bullet.frameIndex = (bullet.frameIndex + 1) % bullet.frames.length;
          bullet.sprite.spriteFrame = bullet.frames[bullet.frameIndex];
        }
      }
      const ratio = Math.max(0, Math.min(1, bullet.life / bullet.maxLife));
      const eased = 1 - Math.pow(1 - ratio, 2);
      const arc = Math.sin(ratio * Math.PI) * 96;
      bullet.node.setPosition(
        bullet.startX + (bullet.targetX - bullet.startX) * eased,
        bullet.startY + (bullet.targetY - bullet.startY) * eased + arc,
        0,
      );
      const scale = 0.55 + ratio * 0.55 + Math.sin(this.host.getRunElapsedSeconds() * 18) * 0.04;
      bullet.node.setScale(scale, scale, 1);
      if (ratio >= 1) {
        this.damageTowerItem(bullet.targetIndex, bullet.damage);
        this.spawnImpactFx(bullet.targetX, bullet.targetY, 'hit', 0.72);
        bullet.node.destroy();
        return false;
      }
      return true;
    });
  }

  private getMinionDisplaySize(frame: SpriteFrame, targetWidth: number) {
    const frameWidth = frame.rect?.width ?? frame.texture?.width ?? targetWidth;
    const frameHeight = frame.rect?.height ?? frame.texture?.height ?? targetWidth;
    return {
      width: targetWidth,
      height: targetWidth * (frameHeight / Math.max(1, frameWidth)),
    };
  }

  private spawnMinion() {
    const assets = this.host.getAssets();
    const balance = this.host.getBalanceConfig();
    const { bossLayer } = this.ui;
    if (!this.battleActive || this.stageSwitchActive || !this.areMinionsActive()
      || this.minions.length >= (balance.boss.maxMinions ?? 2) || !bossLayer) return;
    const spriteKeys = this.host.getBossMinionSpriteKeys();
    const availableKeys = spriteKeys.filter((key) => assets.hasSprite(key as never));
    if (!availableKeys.length) return;
    const spriteKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
    const minionFrames = assets.getBossMinionFrames(spriteKey);
    const frame = minionFrames[0] ?? assets.getSprite(spriteKey as never);
    if (!frame?.texture) return;
    const x = Math.random() < 0.5 ? -300 : 300;
    const y = randomRange(120, 410);
    const isJellyfishMinion = spriteKey === BOSS_OCTOPUS_JELLYFISH_MINION_SPRITE_KEY;
    const minionSize = isJellyfishMinion
      ? this.getMinionDisplaySize(frame, BOSS_OCTOPUS_JELLYFISH_MINION_DISPLAY_WIDTH)
      : { width: 138, height: 138 };
    const node = this.host.createSpriteNode(
      'BossMinion',
      bossLayer,
      frame,
      x,
      y,
      minionSize.width,
      minionSize.height,
    );
    const sprite = node.getComponent(Sprite)!;
    sprite.color = new Color(255, 255, 255, 218);
    if (!isJellyfishMinion) {
      node.setScale(0.72, 0.72, 1);
    }
    const minionHp = balance.boss.minionHp ?? 160;
    const animatedMinion = minionFrames.length > 1;
    this.minions.push({
      node,
      sprite,
      hp: minionHp,
      phase: Math.random() * Math.PI * 2,
      attackCooldown: randomRange(isJellyfishMinion ? 4.2 : 2.2, isJellyfishMinion ? 6.2 : 4.2),
      shootsBullets: isJellyfishMinion,
      frames: animatedMinion ? [...minionFrames] : [],
      frameIndex: 0,
      frameTimer: 0,
      fps: animatedMinion ? BOSS_OCTOPUS_JELLYFISH_MINION_FPS : 1,
    });
  }

  private spawnMinionBullet(minion: BossMinionState) {
    const balance = this.host.getBalanceConfig();
    const assets = this.host.getAssets();
    const bossId = this.host.getBossId();
    const bulletSpriteKey = getBossBulletSpriteKey(bossId, this.bossForm);
    const bulletFrames = assets.getBossBulletFrames(bossId, this.bossForm);
    const bossBulletFrame = bulletFrames[0] ?? assets.getSprite(bulletSpriteKey as never);
    const { bossLayer } = this.ui;
    if (!this.battleActive || this.stageSwitchActive || !bossBulletFrame?.texture || !bossLayer) return;

    const startX = minion.node.position.x + randomRange(-18, 18);
    const startY = minion.node.position.y - 36;
    const bottleCount = this.host.getBottleCount();
    const targetIndex = Math.max(0, bottleCount - 1 - Math.floor(randomRange(0, 4)));
    const target = this.getBottleScreenPosition(targetIndex);
    const targetX = target.x + randomRange(-70, 70);
    const targetY = target.y + randomRange(-28, 32);
    const bulletSize = 52;
    const bullet = this.host.createSpriteNode(
      'BossMinionBullet',
      bossLayer,
      bossBulletFrame,
      startX,
      startY,
      bulletSize,
      bulletSize,
    );
    const bulletSprite = bullet.getComponent(Sprite)!;
    bullet.setScale(0.22, 0.22, 1);
    this.host.getAssets().playSfx(BottleHeroSfxPaths.bossBulletAttack, 0.38);
    this.bullets.push({
      node: bullet,
      sprite: bulletSprite,
      targetIndex,
      life: 0,
      maxLife: randomRange(BOSS_OCTOPUS_JELLYFISH_MINION_BULLET_LIFE_MIN, BOSS_OCTOPUS_JELLYFISH_MINION_BULLET_LIFE_MAX),
      startX,
      startY,
      targetX,
      targetY,
      damage: balance.boss.bulletStabilityDamage * BOSS_OCTOPUS_JELLYFISH_MINION_BULLET_DAMAGE_RATIO,
      frames: bulletFrames,
      frameIndex: 0,
      frameTimer: 0,
      fps: bulletFrames.length > 1 ? BOSS_MARSHMALLOW_STAGE2_BOMB_FPS : 1,
    });
  }

  private updateMinions(deltaTime: number) {
    if (!this.areMinionsActive()) {
      return;
    }
    this.minions = this.minions.filter((minion) => {
      if (!minion.node.isValid) return false;
      if (minion.frames.length > 1) {
        minion.frameTimer += deltaTime;
        const frameDuration = 1 / Math.max(1, minion.fps);
        while (minion.frameTimer >= frameDuration) {
          minion.frameTimer -= frameDuration;
          minion.frameIndex = (minion.frameIndex + 1) % minion.frames.length;
          minion.sprite.spriteFrame = minion.frames[minion.frameIndex];
        }
      }
      minion.phase += deltaTime * 1.7;
      minion.node.setPosition(
        minion.node.position.x + Math.sin(minion.phase * 0.6) * deltaTime * 20,
        minion.node.position.y + Math.sin(minion.phase) * 0.9,
        0,
      );
      minion.node.setRotationFromEuler(0, 0, Math.sin(minion.phase) * 5);
      if (!this.stageSwitchActive && minion.shootsBullets) {
        minion.attackCooldown -= deltaTime;
        if (this.battleActive && minion.attackCooldown <= 0) {
          minion.attackCooldown = randomRange(4.2, 6.5);
          this.spawnMinionBullet(minion);
        }
      }
      return true;
    });
  }

  private shouldTriggerMarshmallowStageSwitch(prevHp: number) {
    if (this.host.getBossId() !== 'boss_alien_03') {
      return false;
    }
    if (this.stageSwitchTriggered || this.bossForm !== 1) {
      return false;
    }
    const threshold = this.maxHp * MARSHMALLOW_STAGE_SWITCH_HP_RATIO;
    return prevHp > threshold && this.hp <= threshold && this.hp > 0;
  }

  private startStageSwitch() {
    this.stageSwitchTriggered = true;
    this.stageSwitchActive = true;
    this.frozenSeconds = 0;
    this.frozenThawStarted = false;
    this.frozenThawSequenceIndex = 0;
    this.clearBossBullets();
    this.setAnimation('switchStage', false);
  }

  private completeStageSwitch() {
    this.bossForm = 2;
    this.stageSwitchActive = false;
    const form2IdleFrames = this.dualFormIdleFrames[2];
    if (form2IdleFrames?.length) {
      this.animationFrames.idle = form2IdleFrames;
    }
    this.attackCooldown = Math.max(this.attackCooldown, 1.0);
    this.minionCooldown = Math.max(this.minionCooldown, 1.2);
    this.setAnimation('idle');
  }

  private clearBossBullets() {
    for (const bullet of this.bullets) {
      if (bullet.node.isValid) {
        bullet.node.destroy();
      }
    }
    this.bullets = [];
  }

  private damageTowerItem(index: number, stabilityDamage: number) {
    const bottleCount = this.host.getBottleCount();
    if (bottleCount <= 0) {
      this.host.applyStabilityPenalty(stabilityDamage + 2);
      this.host.pulseStabilityHud(new Color(255, 92, 92, 165), 1.2);
      this.host.updateHud();
      return;
    }
    const targetIndex = Math.max(0, Math.min(index, bottleCount - 1));
    const towerLayer = this.host.getTowerLayer();
    const bottle = towerLayer.getChildByName(`Bottle${targetIndex}`);
    if (bottle) {
      this.host.flashTowerBottle(bottle);
      const currentHp = this.host.getTowerItemHp(targetIndex) ?? getTowerItemMaxHp(targetIndex);
      const nextHp = currentHp - 1;
      this.host.setTowerItemHp(targetIndex, nextHp);
      if (nextHp <= 0 && targetIndex >= bottleCount - 3) this.host.dropTopBottles(1);
    }
    this.host.applyStabilityPenalty(stabilityDamage);
    this.host.setTowerLeanVelocity(this.host.getTowerLeanVelocity() + randomRange(-2.8, 2.8));
    if (this.host.getStability() <= 0) this.host.finishRun('BOSS ATTACK');
    else this.host.updateHud();
  }

  private getBottleScreenPosition(index: number) {
    const bottleCount = this.host.getBottleCount();
    const safeIndex = Math.max(0, Math.min(index, Math.max(0, bottleCount - 1)));
    const localY = -500 + safeIndex * this.host.getBottleStepY();
    const position = getBottleWorldPosition(
      this.host.getTowerDrift(),
      localY,
      this.host.getTowerVisualX(),
      this.host.getTowerLean(),
    );
    return new Vec3(position.x, position.y - this.host.getCurrentWorldY(), 0);
  }

  private spawnImpactFx(x: number, y: number, fxId: BossFxId, scale = 1) {
    const frames = this.fxFrames[fxId];
    const { bossLayer } = this.ui;
    if (!frames || frames.length === 0 || !bossLayer) return;
    const node = this.host.createSpriteNode(`BossFx_${fxId}`, bossLayer, frames[0], x, y, 118 * scale, 118 * scale);
    const sprite = node.getComponent(Sprite)!;
    this.fxStates.push({ node, sprite, frames, frameIndex: 0, frameTimer: 0, fps: 22 });
  }

  private updateFx(deltaTime: number) {
    this.fxStates = this.fxStates.filter((fx) => {
      if (!fx.node.isValid) return false;
      fx.frameTimer += deltaTime;
      const frameDuration = 1 / fx.fps;
      while (fx.frameTimer >= frameDuration) {
        fx.frameTimer -= frameDuration;
        fx.frameIndex += 1;
        if (fx.frameIndex >= fx.frames.length) {
          fx.node.destroy();
          return false;
        }
        fx.sprite.spriteFrame = fx.frames[fx.frameIndex];
      }
      return true;
    });
  }

  private playHitSound() {
    if (this.hitSoundCooldown > 0) return;
    this.hitSoundCooldown = 0.09;
    this.host.getAssets().playSfx(BottleHeroSfxPaths.bossHitted, 0.68);
  }

  private defeatBoss() {
    if (!this.battleActive) return;
    this.battleActive = false;
    this.deathSequenceActive = true;
    this.host.endChargeVisuals();
    this.host.clearTimingTargets();
    this.hideComboTip();
    this.host.setTimingPanelActive(false);
    this.host.setHudLayerActive(false);
    if (this.ui.bossHudLayer) this.ui.bossHudLayer.active = false;
    this.setAnimation('dead', false);
    this.clearActors();
    this.host.addScore(this.host.getBossVictoryScoreBonus());
    this.host.updateHud();
    this.host.persistRunBestScore();
    this.host.getAssets().playSfx(BottleHeroSfxPaths.bossDead, 0.92);
    this.host.playScreenShake();
    const rewardDelay = this.getAnimationDuration('dead') + 2;
    this.host.scheduleOnce(() => {
      this.deathSequenceActive = false;
      this.showRewardChest();
    }, rewardDelay);
  }

  private showRewardChest() {
    const { bossVictoryLayer, bossRewardDimmerNode, bossRewardIconNode, bossRewardPanelNode } = this.ui;
    this.host.setGameState('bossvictory');
    this.host.onBossVictory();
    this.host.persistFeedbackRunStats(true);
    this.host.stopBossBgm();
    this.host.playAvatarBgm();
    if (bossVictoryLayer) bossVictoryLayer.active = true;
    if (bossRewardDimmerNode) bossRewardDimmerNode.active = true;
    if (bossRewardIconNode) {
      bossRewardIconNode.active = true;
      bossRewardIconNode.setScale(1, 1, 1);
      Tween.stopAllByTarget(bossRewardIconNode);
      tween(bossRewardIconNode)
        .repeatForever(
          tween()
            .to(0.62, { scale: new Vec3(1.08, 1.08, 1) })
            .to(0.62, { scale: new Vec3(0.96, 0.96, 1) }),
        )
        .start();
    }
    if (bossRewardPanelNode) bossRewardPanelNode.active = false;
  }

  private renderRewardGoods() {
    const { bossRewardGoodsLayer } = this.ui;
    if (!bossRewardGoodsLayer) return;
    this.host.clearNodeChildren(bossRewardGoodsLayer);
    const rewardGoods = this.host.getBossVictoryRewardGoods();
    const spacing = 158;
    const startX = -(rewardGoods.length - 1) * spacing * 0.5;
    const assets = this.host.getAssets();
    rewardGoods.forEach((goodsId, index) => {
      const goods = getAvatarGoodsDefinition(goodsId);
      if (!goods) return;
      const slot = this.host.createRectNode(
        `BossRewardGoodsSlot_${goods.id}`,
        bossRewardGoodsLayer,
        startX + index * spacing,
        0,
        112,
        112,
        new Color(255, 255, 255, 255),
      );
      const graphics = slot.getComponent(Graphics);
      if (graphics) {
        graphics.strokeColor = new Color(0, 132, 79, 255);
        graphics.lineWidth = 5;
        graphics.stroke();
      }
      this.host.createSpriteNode(`BossRewardGoodsIcon_${goods.id}`, slot, assets.getSprite(goods.spriteKey), 0, 0, 88, 88);
    });
  }
}

export function getBossTierDamage(balance: BottleHeroBalanceConfig, tier: TimingPointTierId) {
  if (tier === 'treasure') return balance.boss.treasureAttackDamage;
  if (tier === 'rare') return balance.boss.rareAttackDamage;
  if (tier === 'good') return balance.boss.goodAttackDamage;
  return balance.boss.normalAttackDamage;
}

export function getBossTierHitCount(tier: TimingPointTierId) {
  if (tier === 'treasure') return Math.floor(randomRange(3, 7));
  if (tier === 'rare') return Math.floor(randomRange(2, 4));
  if (tier === 'good') return Math.floor(randomRange(1, 3));
  return 1;
}
