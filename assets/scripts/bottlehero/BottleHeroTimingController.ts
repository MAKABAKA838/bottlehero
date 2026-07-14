import { Color, Node, Sprite, SpriteFrame, tween, Vec3 } from 'cc';
import { createBossTimingTargetPlan } from './BottleHeroBossTimingPlan';
import {
  ActiveStageState,
  BottleHeroBalanceConfig,
  createTimingTargetPlan,
  TimingPointTierConfig,
  TimingPointTierId,
  TimingTargetKind,
  TimingTargetPlan,
} from './BottleHeroBalance';
import { randomRange } from './BottleHeroMathUtil';
import {
  getCirclePoint,
  getCircleTimingTargetConfig,
  getCircleTrackRadius,
  getPathPointAtProgress,
  getTimingPointTierScore,
  getTimingTargetConfig,
  getTimingTargetDistance,
  isPathTimingTrack,
  normalizeAngleDegrees,
  normalizeTrackProgress,
  pickTimingPointTier,
  pickTimingTargetAngle,
  pickTimingTargetProgress,
  pickTimingTargetSize,
  pickTimingTargetX,
  pickTimingTrackShape,
  resolveTimingThrow,
  shuffleTimingTargetKinds,
} from './BottleHeroTimingMath';
import { createSpriteNode } from './BottleHeroUiFactory';
import { HitKind, TimingPointSize, TimingTargetState, TimingTrackShape } from './BottleHeroTypes';

export interface TimingUiRefs {
  timingPanel: Node;
  timingHandle: Node;
  timingPoint: Node;
  timingPerfectFx: Node;
  timingBarNode: Node;
  timingCircleNode: Node;
  timingTriangleNode: Node;
  timingPathNode: Node;
  timingStarNode: Node;
  timingInfinityNode: Node;
  throwArea: Node;
  armNode: Node;
}

export interface TimingHost {
  getBalanceConfig(): BottleHeroBalanceConfig;
  isPlaying(): boolean;
  getMinChargeSeconds(): number;
  getMaxChargeSeconds(): number;
  getTimeoutSeconds(): number;
  getTimingHandleRange(): number;
  getTimingPointRange(): number;
  getArmBaseAngle(): number;
  getArmChargeAngle(): number;
  getActiveStageState(): ActiveStageState;
  getDifficultyRatio(): number;
  getCollectedRewardTimingItems(): Set<TimingTargetKind>;
  isRewardTimingItem(kind: TimingTargetKind): boolean;
  markCollectedRewardTimingItem(kind: TimingTargetKind): void;
  isBossBattleActive(): boolean;
  isBossDeathSequenceActive(): boolean;
  getBossComboAttackTaps(): number;
  fireBossComboTap(): void;
  bossApplyMiss(): void;
  bossApplyTimingItem(target: TimingTargetState): void;
  bossApplyPointHit(kind: 'perfect' | 'good', target: TimingTargetState): void;
  getTimingUi(): TimingUiRefs;
  getSprite(spriteKey: string): SpriteFrame | null | undefined;
  getTowerDrift(): number;
  getTowerTopLocalY(): number;
  getBottleWorldPosition(localX: number, localY: number): Vec3;
  getCurrentWorldY(): number;
  isFoodBoostActive(): boolean;
  getHandSide(): number;
  getArmBaseX(): number;
  getHandedAngle(angle: number): number;
  setArmScale(scale: number): void;
  setThrowButtonPressed(pressed: boolean): void;
  incrementRoundCount(): void;
  notePlayerAction(): void;
  applyGameplayHit(kind: HitKind, normalizedError: number, pointScore?: number): void;
  applyGameplayTimingItem(target: TimingTargetState): void;
  penalizeChargeFailure(reason: string): void;
  setResolvedTimingSnapshot(handleX: number, handleY: number, pointX: number, pointY: number): void;
  playTimingPerfectFx(): void;
}

export class BottleHeroTimingController {
  private ui: TimingUiRefs | null = null;
  private chargeActive = false;
  private chargeSeconds = 0;
  private currentStageState: ActiveStageState | null = null;
  private currentTargetPlan: TimingTargetPlan | null = null;
  private timingTargets: TimingTargetState[] = [];
  private timingTrackShape: TimingTrackShape = 'line';
  private readonly timingHandleHitPadding = 18;
  private handlePhase = 0;
  private handleDirection = 1;
  private handleBaseSpeed = 3.1;
  private handlePulseSpeed = 1;
  private handlePulseRate = 7.2;
  private handleX = 0;
  private handleY = 0;
  private handleAngle = 0;

  constructor(private readonly host: TimingHost) {}

  attachUi(ui: TimingUiRefs): void {
    this.ui = ui;
  }

  bindThrowInput(target: unknown): void {
    const throwArea = this.ui?.throwArea;
    if (!throwArea) {
      return;
    }
    throwArea.on(Node.EventType.TOUCH_START, this.onChargeStart, target);
    throwArea.on(Node.EventType.TOUCH_END, this.onChargeRelease, target);
    throwArea.on(Node.EventType.TOUCH_CANCEL, this.onChargeRelease, target);
  }

  isChargeActive(): boolean {
    return this.chargeActive;
  }

  getTrackShape(): TimingTrackShape {
    return this.timingTrackShape;
  }

  getCurrentTargetPlan(): TimingTargetPlan | null {
    return this.currentTargetPlan;
  }

  clearTargets(): void {
    for (const target of this.timingTargets) {
      if (target.node.isValid) {
        target.node.destroy();
      }
      if (target.highlightNode.isValid) {
        target.highlightNode.destroy();
      }
      if (target.highlightGlowNode.isValid) {
        target.highlightGlowNode.destroy();
      }
    }
    this.timingTargets = [];
  }

  endChargeVisuals(clearTargets = true): void {
    const ui = this.ui;
    if (!ui) {
      return;
    }
    this.chargeActive = false;
    ui.timingPanel.active = false;
    ui.timingPanel.setScale(1, 1, 1);
    ui.timingHandle.setScale(1, 1, 1);
    if (clearTargets) {
      this.clearTargets();
    }
    this.host.setThrowButtonPressed(false);
    tween(ui.armNode).stop();
    tween(ui.armNode).to(0.14, { scale: new Vec3(this.host.getHandSide(), 1, 1) }).start();
    ui.armNode.setPosition(this.host.getArmBaseX(), -566, 0);
    ui.armNode.setRotationFromEuler(0, 0, this.host.getHandedAngle(this.host.getArmBaseAngle()));
  }

  update(deltaTime: number): void {
    if (!this.chargeActive || !this.ui) {
      return;
    }

    this.chargeSeconds += deltaTime;
    this.updatePanelPosition();
    const speed = this.handleBaseSpeed
      + Math.sin(this.chargeSeconds * this.handlePulseRate) * this.handlePulseSpeed
      + Math.cos(this.chargeSeconds * 2.2) * 0.55;
    this.handlePhase += deltaTime * speed * this.handleDirection;
    this.updateHandlePositionFromPhase();
    const handleScale = this.getTimingHandleScale();
    this.ui.timingHandle.setScale(handleScale, handleScale, 1);
    this.updateTargetHighlights();
    const pressProgress = Math.min(this.chargeSeconds / this.host.getMaxChargeSeconds(), 1);
    const buttonScale = 1 - pressProgress * 0.08;
    this.ui.throwArea.setScale(buttonScale, buttonScale, 1);
    const armScale = 1 - pressProgress * 0.18;
    this.host.setArmScale(armScale);
    const armAngle = this.host.getArmBaseAngle() + pressProgress * this.host.getArmChargeAngle();
    const warningProgress = Math.max(0, Math.min(1, (this.chargeSeconds - (this.host.getTimeoutSeconds() - 0.75)) / 0.75));
    const warningShake = Math.sin(this.chargeSeconds * 48) * warningProgress * 7;
    const warningX = Math.sin(this.chargeSeconds * 64) * warningProgress * 5;
    const warningY = Math.cos(this.chargeSeconds * 56) * warningProgress * 4;
    this.ui.armNode.setPosition(this.host.getArmBaseX() + warningX * this.host.getHandSide(), -566 + warningY, 0);
    this.ui.armNode.setRotationFromEuler(0, 0, this.host.getHandedAngle(armAngle + warningShake));

    if (this.chargeSeconds >= this.host.getTimeoutSeconds()) {
      this.endChargeVisuals();
      this.host.penalizeChargeFailure('TIMEOUT');
    }
  }

  updatePanelPosition(): void {
    const ui = this.ui;
    if (!ui) {
      return;
    }
    const localY = this.host.getTowerTopLocalY();
    const top = this.host.getBottleWorldPosition(this.host.getTowerDrift(), localY);
    const isCenteredShape = this.timingTrackShape === 'circle'
      || this.timingTrackShape === 'triangle'
      || this.timingTrackShape === 'star'
      || this.timingTrackShape === 'infinity';
    const followsTower = this.host.getBalanceConfig().timingBarAnchorMode === 'followTower';
    if (!followsTower) {
      ui.timingPanel.setPosition(0, 0, 0);
      return;
    }
    const targetX = followsTower
      ? (isCenteredShape
        ? Math.max(-82, Math.min(82, top.x))
        : Math.max(-118, Math.min(118, top.x)))
      : 0;
    const yOffset = isCenteredShape ? 0 : 178;
    const targetY = Math.max(isCenteredShape ? -230 : -300, Math.min(450, top.y - this.host.getCurrentWorldY() + yOffset));
    ui.timingPanel.setPosition(targetX, targetY, 0);
  }

  private onChargeStart = (): void => {
    if (!this.ui || !this.host.isPlaying()) {
      return;
    }
    this.host.notePlayerAction();
    if (this.host.isBossBattleActive() && this.host.getBossComboAttackTaps() > 0) {
      this.host.fireBossComboTap();
      return;
    }
    if (this.host.isBossDeathSequenceActive()) {
      return;
    }
    if (this.chargeActive) {
      return;
    }
    this.chargeActive = true;
    this.chargeSeconds = 0;
    this.handlePhase = Math.random() * Math.PI * 2;
    this.handleDirection = Math.random() > 0.5 ? 1 : -1;
    this.currentStageState = this.host.getActiveStageState();
    if (this.host.isFoodBoostActive()) {
      this.handleBaseSpeed = Math.max(1, this.currentStageState.actualHandleSpeed * 0.82);
      this.handlePulseSpeed = 0;
      this.handlePulseRate = 0;
    } else {
      this.handleBaseSpeed = this.currentStageState.actualHandleSpeed;
      this.handlePulseSpeed = this.currentStageState.actualHandleSpeed * this.currentStageState.actualHandleVariance;
      this.handlePulseRate = this.currentStageState.actualHandleVariance <= 0 ? 0 : randomRange(4.8, 9.2);
    }
    this.startRound();
    this.updatePanelPosition();
    this.ui.timingPanel.setScale(1, 1, 1);
    const handleScale = this.getTimingHandleScale();
    this.ui.timingHandle.setScale(handleScale, handleScale, 1);
    this.ui.timingPanel.active = true;
    this.host.setThrowButtonPressed(true);
    tween(this.ui.armNode).stop();
  };

  private onChargeRelease = (): void => {
    if (!this.host.isPlaying() || !this.chargeActive) {
      return;
    }

    const charge = this.chargeSeconds;

    if (charge < this.host.getMinChargeSeconds() || charge > this.host.getTimeoutSeconds()) {
      this.endChargeVisuals();
      this.clearTargets();
      this.host.penalizeChargeFailure('CHARGE ERROR');
      return;
    }

    const powerPenalty = charge > this.host.getMaxChargeSeconds() ? 0.06 * this.host.getTimingHandleRange() : 0;
    this.applyResult(powerPenalty);
    this.endChargeVisuals(false);
    this.clearTargets();
  };

  private startRound(): void {
    this.host.incrementRoundCount();
    this.currentStageState = this.host.getActiveStageState();
    this.timingTrackShape = pickTimingTrackShape(this.currentStageState, this.host.getBalanceConfig());
    this.updateTrackVisuals();
    this.updateHandlePositionFromPhase();
    this.generateTargets();
  }

  private applyResult(extraErrorPixels: number): void {
    const resolution = resolveTimingThrow({
      trackShape: this.timingTrackShape,
      handleX: this.handleX,
      handleY: this.handleY,
      handleAngle: this.handleAngle,
      handleScale: this.getTimingHandleScale(),
      handleHitPadding: this.timingHandleHitPadding,
      timingHandleRange: this.host.getTimingHandleRange(),
      extraErrorPixels,
      targets: this.timingTargets.map((target) => ({
        kind: target.kind,
        x: target.x,
        y: target.y,
        angle: target.angle,
        perfectRadius: target.perfectRadius,
        goodRadius: target.goodRadius,
        scoreValue: target.scoreValue,
      })),
    });
    this.host.setResolvedTimingSnapshot(this.handleX, this.handleY, resolution.pointX, resolution.pointY);
    const bestTarget = resolution.targetIndex >= 0 ? this.timingTargets[resolution.targetIndex] : null;

    if (resolution.kind === 'miss') {
      if (this.host.isBossBattleActive()) {
        this.host.bossApplyMiss();
        return;
      }
      this.host.applyGameplayHit('miss', resolution.normalizedError);
      return;
    }
    if (!bestTarget) {
      return;
    }

    if (resolution.kind === 'timingItem') {
      if (this.host.isBossBattleActive()) {
        this.host.bossApplyTimingItem(bestTarget);
        return;
      }
      this.host.applyGameplayTimingItem(bestTarget);
      return;
    }

    if (resolution.kind === 'perfect') {
      if (this.host.isBossBattleActive()) {
        this.host.bossApplyPointHit('perfect', bestTarget);
        return;
      }
      this.host.applyGameplayHit('perfect', resolution.normalizedError, bestTarget.scoreValue);
      return;
    }

    if (this.host.isBossBattleActive()) {
      this.host.bossApplyPointHit('good', bestTarget);
      return;
    }
    this.host.applyGameplayHit('good', resolution.normalizedError, bestTarget.scoreValue);
  }

  private getTimingHandleScale(): number {
    return this.host.isFoodBoostActive() ? this.host.getBalanceConfig().stability.foodHandleScale : 1;
  }

  private getCircleTrackRadius(): number {
    return getCircleTrackRadius(this.host.getBalanceConfig().stability.circleTrackRadius);
  }

  private updateTrackVisuals(): void {
    const ui = this.ui;
    if (!ui) {
      return;
    }
    const isCircle = this.timingTrackShape === 'circle';
    const isTriangle = this.timingTrackShape === 'triangle';
    const isPath = this.timingTrackShape === 'path';
    const isStar = this.timingTrackShape === 'star';
    const isInfinity = this.timingTrackShape === 'infinity';
    ui.timingBarNode.active = this.timingTrackShape === 'line';
    ui.timingCircleNode.active = isCircle;
    ui.timingTriangleNode.active = isTriangle;
    ui.timingPathNode.active = isPath;
    ui.timingStarNode.active = isStar;
    ui.timingInfinityNode.active = isInfinity;
    if (isCircle) {
      const scale = this.getCircleTrackRadius() / 196;
      ui.timingCircleNode.setScale(scale, scale, 1);
    } else {
      ui.timingCircleNode.setScale(1, 1, 1);
    }
    if (isTriangle) {
      const scale = this.getCircleTrackRadius() / 196;
      ui.timingTriangleNode.setScale(scale, scale, 1);
    } else {
      ui.timingTriangleNode.setScale(1, 1, 1);
    }
    if (isStar) {
      const scale = this.getCircleTrackRadius() / 196;
      ui.timingStarNode.setScale(scale, scale, 1);
      ui.timingStarNode.setSiblingIndex(0);
    } else {
      ui.timingStarNode.setScale(1, 1, 1);
    }
    if (isInfinity) {
      const scale = this.getCircleTrackRadius() / 196;
      ui.timingInfinityNode.setScale(scale, scale, 1);
      ui.timingInfinityNode.setSiblingIndex(0);
    } else {
      ui.timingInfinityNode.setScale(1, 1, 1);
    }
    ui.timingPathNode.setScale(isPath ? 1 : 1, isPath ? 1 : 1, 1);
  }

  private updateHandlePositionFromPhase(): void {
    const ui = this.ui;
    if (!ui) {
      return;
    }
    if (this.timingTrackShape === 'circle') {
      const radius = this.getCircleTrackRadius();
      this.handleAngle = normalizeAngleDegrees(this.handlePhase * 180 / Math.PI);
      this.handleX = Math.cos(this.handlePhase) * radius;
      this.handleY = Math.sin(this.handlePhase) * radius;
    } else if (isPathTimingTrack(this.timingTrackShape)) {
      const progress = normalizeTrackProgress(this.handlePhase / (Math.PI * 2));
      const point = getPathPointAtProgress(
        this.timingTrackShape,
        progress,
        this.host.getTimingHandleRange(),
        this.host.getBalanceConfig().stability.circleTrackRadius,
      );
      this.handleX = point.x;
      this.handleY = point.y;
      this.handleAngle = progress * 360;
    } else {
      this.handleX = Math.sin(this.handlePhase) * this.host.getTimingHandleRange();
      this.handleY = 0;
      this.handleAngle = 0;
    }
    ui.timingHandle.setPosition(this.handleX, this.handleY, 0);
  }

  private generateTargets(): void {
    const ui = this.ui;
    if (!ui) {
      return;
    }
    this.clearTargets();
    const reserved: number[] = [];
    this.currentStageState = this.host.getActiveStageState();
    this.currentTargetPlan = this.host.isBossBattleActive()
      ? createBossTimingTargetPlan(
        this.host.getBalanceConfig(),
        this.host.getCollectedRewardTimingItems(),
        this.currentStageState.stage.id,
      )
      : createTimingTargetPlan(
        this.host.getBalanceConfig(),
        this.currentStageState,
        this.host.getCollectedRewardTimingItems(),
      );
    for (const kind of shuffleTimingTargetKinds(this.currentTargetPlan.kinds)) {
      this.createTarget(kind, pickTimingTargetSize(this.host.getDifficultyRatio()), reserved);
    }
    ui.timingHandle.setSiblingIndex(ui.timingPanel.children.length - 1);
  }

  private createTarget(kind: TimingTargetKind, size: TimingPointSize, reserved: number[]): void {
    const ui = this.ui;
    if (!ui) {
      return;
    }
    const balance = this.host.getBalanceConfig();
    const isCircle = this.timingTrackShape === 'circle';
    const isPath = isPathTimingTrack(this.timingTrackShape);
    const pointTier = kind === 'star' ? pickTimingPointTier(balance, this.host.getActiveStageState()) : null;
    const config = isCircle
      ? getCircleTimingTargetConfig(kind, size, balance.stability)
      : getTimingTargetConfig(kind, size, balance.stability);
    const angle = isCircle ? pickTimingTargetAngle(config.goodRadius, reserved) : 0;
    const circlePosition = isCircle ? getCirclePoint(angle, balance.stability.circleTrackRadius) : null;
    const progress = isPath
      ? pickTimingTargetProgress(
        config.goodRadius,
        reserved,
        this.timingTrackShape,
        this.host.getTimingHandleRange(),
        balance.stability.circleTrackRadius,
      )
      : 0;
    const pathPosition = isPath
      ? getPathPointAtProgress(
        this.timingTrackShape,
        progress,
        this.host.getTimingHandleRange(),
        balance.stability.circleTrackRadius,
      )
      : null;
    const x = circlePosition ? circlePosition.x : (pathPosition ? pathPosition.x : pickTimingTargetX(config.goodRadius, reserved, this.host.getTimingPointRange()));
    const y = circlePosition ? circlePosition.y : (pathPosition ? pathPosition.y : 0);
    reserved.push(isCircle ? angle : (pathPosition ? progress : x));
    const spriteFrame = this.getTargetSprite(kind, pointTier);
    const actualVisualSize = config.visualSize * config.visualScale;
    const highlightFrame = this.getHighlightSprite(kind);
    const highlightCoreSize = Math.max(actualVisualSize * 1.72, config.goodRadius * (isCircle || isPath ? 3.6 : 2.75));
    const highlightGlowSize = Math.max(actualVisualSize * 2.35, config.goodRadius * (isCircle || isPath ? 4.55 : 3.55));
    const highlightGlowNode = createSpriteNode(`TimingHighlightGlow_${kind}_${this.timingTargets.length}`, ui.timingPanel, highlightFrame, x, y, highlightGlowSize, highlightGlowSize);
    const highlightGlowSprite = highlightGlowNode.getComponent(Sprite)!;
    highlightGlowSprite.color = new Color(255, 255, 255, 0);
    highlightGlowNode.active = false;
    const highlightNode = createSpriteNode(`TimingHighlight_${kind}_${this.timingTargets.length}`, ui.timingPanel, highlightFrame, x, y, highlightCoreSize, highlightCoreSize);
    const highlightSprite = highlightNode.getComponent(Sprite)!;
    highlightSprite.color = new Color(255, 255, 255, 0);
    highlightNode.active = false;
    const node = createSpriteNode(`TimingTarget_${kind}_${this.timingTargets.length}`, ui.timingPanel, spriteFrame, x, y, config.visualSize, config.visualSize);
    if (kind === 'star') {
      node.setScale(config.visualScale, config.visualScale, 1);
    }
    this.timingTargets.push({
      node,
      highlightGlowNode,
      highlightGlowSprite,
      highlightNode,
      highlightSprite,
      kind,
      pointTier,
      scoreValue: pointTier ? getTimingPointTierScore(balance, pointTier) : 0,
      size,
      x,
      y,
      angle,
      perfectRadius: config.perfectRadius,
      goodRadius: config.goodRadius,
      highlightActive: false,
    });
  }

  private getHighlightSprite(kind: TimingTargetKind): SpriteFrame | null | undefined {
    return kind === 'bomb' ? this.host.getSprite('timingHighlightDanger') : this.host.getSprite('timingHighlightNormal');
  }

  private getTargetSprite(kind: TimingTargetKind, pointTier?: TimingPointTierId | null): SpriteFrame | null | undefined {
    if (kind === 'stability') {
      return this.host.getSprite('timingItemStability');
    }
    if (kind === 'multiply') {
      return this.host.getSprite('timingItemMultiply');
    }
    if (kind === 'bomb') {
      return this.host.getSprite('timingItemBomb');
    }
    if (kind === 'food') {
      return this.host.getSprite('timingItemFood');
    }
    if (kind === 'comboAttack') {
      return this.host.getSprite('timingItemComboAttack');
    }
    if (kind === 'frozenSkill') {
      return this.host.getSprite('timingItemFrozenSkill');
    }
    if (kind === 'star' && pointTier) {
      const tier = this.getPointTierConfig(pointTier);
      if (tier?.spriteKey) {
        return this.host.getSprite(tier.spriteKey);
      }
    }
    return this.host.getSprite('timingPoint');
  }

  private getPointTierConfig(tierId: TimingPointTierId): TimingPointTierConfig | null {
    return this.host.getBalanceConfig().timingPointTiers.find((tier) => tier.id === tierId) || null;
  }

  private updateTargetHighlights(): void {
    const handleScale = this.getTimingHandleScale();
    for (const target of this.timingTargets) {
      const distance = getTimingTargetDistance(
        this.timingTrackShape,
        this.handleX,
        this.handleY,
        this.handleAngle,
        handleScale,
        this.timingHandleHitPadding,
        target,
      );
      const highlightRange = this.timingTrackShape === 'circle'
        ? target.goodRadius + 18
        : target.goodRadius + 54;
      const proximity = 1 - Math.max(0, Math.min(1, distance / Math.max(1, highlightRange)));
      if (proximity <= 0.02) {
        if (target.highlightActive) {
          target.highlightActive = false;
          target.highlightGlowSprite.color = new Color(255, 255, 255, 0);
          target.highlightGlowNode.active = false;
          target.highlightGlowNode.setScale(1, 1, 1);
          target.highlightSprite.color = new Color(255, 255, 255, 0);
          target.highlightNode.active = false;
          target.highlightNode.setScale(1, 1, 1);
        }
        continue;
      }

      target.highlightActive = true;
      target.highlightGlowNode.active = true;
      target.highlightNode.active = true;
      const pulse = 0.5 + Math.sin(this.chargeSeconds * 18) * 0.5;
      const glowPulse = 0.5 + Math.cos(this.chargeSeconds * 12) * 0.5;
      const coreAlpha = Math.floor((105 + pulse * 150) * proximity);
      const glowAlpha = Math.floor((58 + glowPulse * 96) * proximity);
      const coreScale = 0.94 + proximity * 0.22 + pulse * 0.13;
      const glowScale = 0.98 + proximity * 0.28 + glowPulse * 0.16;
      target.highlightGlowSprite.color = new Color(255, 255, 255, Math.max(0, Math.min(170, glowAlpha)));
      target.highlightSprite.color = new Color(255, 255, 255, Math.max(0, Math.min(255, coreAlpha)));
      target.highlightGlowNode.setScale(glowScale, glowScale, 1);
      target.highlightNode.setScale(coreScale, coreScale, 1);
    }
  }
}
