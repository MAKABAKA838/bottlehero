/**
 * Wire BottleHeroMvp to BottleHeroBossBattleController.
 * Run from cocos/: node tools/apply-boss-extraction.js
 */
const fs = require('fs');
const path = require('path');

const mvpPath = path.join(__dirname, '../assets/scripts/bottlehero/BottleHeroMvp.ts');
let src = fs.readFileSync(mvpPath, 'utf8');

if (src.includes('BottleHeroBossBattleController')) {
  console.log('Already extracted, skipping.');
  process.exit(0);
}

const hostSnippet = `  private createBossBattleHost(): BossBattleHost {
    return {
      getBalanceConfig: () => this.balanceConfig,
      getGameState: () => this.state,
      setGameState: (state) => { this.state = state; },
      getScore: () => this.score,
      addScore: (amount) => { this.score += amount; },
      getStability: () => this.stability,
      getBottleCount: () => this.bottleCount,
      getRunElapsedSeconds: () => this.runElapsedSeconds,
      getCurrentWorldY: () => this.currentWorldY,
      getTowerDrift: () => this.towerDrift,
      getTowerVisualX: () => this.towerVisualX,
      getTowerLean: () => this.towerLean,
      getTowerLeanVelocity: () => this.towerLeanVelocity,
      setTowerLeanVelocity: (value) => { this.towerLeanVelocity = value; },
      isChargeActive: () => this.chargeActive,
      hasActiveThrowBottles: () => this.activeThrowBottles.length > 0,
      getSprites: () => this.sprites,
      getComboDigitFrames: () => this.comboDigitFrames,
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
      getSelectedAvatarGoodsId: () => this.selectedAvatarGoodsId,
      setSelectedAvatarGoodsId: (id) => { this.selectedAvatarGoodsId = id; },
      getTowerLayer: () => this.towerLayer,
      getTowerItemHp: (index) => this.towerItemHp[index],
      setTowerItemHp: (index, hp) => { this.towerItemHp[index] = hp; },
      clearTowerItemHp: () => { this.towerItemHp = {}; },
      scheduleOnce: (callback, delay) => this.scheduleOnce(callback, delay),
      endChargeVisuals: () => this.endChargeVisuals(),
      clearTimingTargets: () => this.clearTimingTargets(),
      clearAmbientActors: () => this.clearAmbientActors(),
      setTimingPanelActive: (active) => { this.timingPanel.active = active; },
      setHudLayerActive: (active) => { this.hudLayer.active = active; },
      setTargetWorldY: (y) => { this.targetWorldY = y; },
      applyStabilityPenalty: (amount) => this.applyStabilityPenalty(amount),
      pulseStabilityHud: (color, intensity) => this.pulseStabilityHud(color, intensity),
      finishRun: (reason) => this.finishRun(reason),
      updateHud: () => this.updateHud(),
      playDomSound: (path, volume) => this.playDomSound(path, volume),
      playScreenShake: () => this.playScreenShake(),
      playBossBgm: () => this.playBossBgm(),
      stopBossBgm: () => this.stopBossBgm(),
      stopBgm: () => this.stopBgm(),
      stopAvatarBgm: () => this.stopAvatarBgm(),
      playAvatarBgm: () => this.playAvatarBgm(),
      playClip: (name) => this.playClip(name),
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
      showAvatarHome: () => this.showAvatarHome(),
      isRewardTimingItem: (kind) => this.isRewardTimingItem(kind),
      markCollectedRewardTimingItem: (kind) => { this.collectedRewardTimingItems.add(kind); },
      dropTopBottles: (count) => this.dropTopBottles(count),
      createSpriteNode: (name, parent, frame, x, y, w, h) => this.createSpriteNode(name, parent, frame, x, y, w, h),
      createRectNode: (name, parent, x, y, w, h, color) => this.createRectNode(name, parent, x, y, w, h, color),
      clearNodeChildren: (node) => this.clearNodeChildren(node),
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
`;

src = src.replace(
  "import { createBossTimingTargetPlan } from './BottleHeroBossTimingPlan';\n",
  "import { createBossTimingTargetPlan } from './BottleHeroBossTimingPlan';\nimport { BottleHeroBossBattleController, type BossBattleHost } from './BottleHeroBossBattle';\n",
);

src = src.replace(
  /  private bossComboCountdownDigits: Node\[\] = \[\];\n/,
  '',
);

src = src.replace(
  /  private bossAnimationFrames: Partial<Record<BossAnimationId, SpriteFrame\[\]>> = \{\};\n  private bossFxFrames: Partial<Record<BossFxId, SpriteFrame\[\]>> = \{\};\n/,
  '',
);

src = src.replace(
  /  private bossBullets: BossBulletState\[\] = \[\];\n  private bossMinions: BossMinionState\[\] = \[\];\n  private bossFxStates: BossFxState\[\] = \[\];\n  private towerItemHp: Record<number, number> = \{\};\n  private bossTriggeredThisRun[\s\S]*?  private bossAnimLoops = true;\n/,
  '  private towerItemHp: Record<number, number> = {};\n  private bossBattle!: BottleHeroBossBattleController;\n',
);

src = src.replace(
  /      await this\.loadBalanceConfig\(\);\n      await this\.loadAssets\(\);/,
  `      await this.loadBalanceConfig();
      this.bossBattle = new BottleHeroBossBattleController(this.createBossBattleHost());
      await this.loadAssets();`,
);

src = src.replace(
  /if \(!this\.bossWarningActive\) \{\n      this\.updateTiming\(deltaTime\);\n    \}\n    this\.updateBossBattle\(deltaTime\);/,
  `if (!this.bossBattle.warningActive) {
      this.updateTiming(deltaTime);
    }
    this.bossBattle.update(deltaTime);`,
);

src = src.replace(
  /this\.bossAnimationFrames\[animationId\] = frames;/g,
  'this.bossBattle.setAnimationFrame(animationId, frames);',
);
src = src.replace(/this\.bossFxFrames\.hit = frames;/g, "this.bossBattle.setFxFrame('hit', frames);");
src = src.replace(/this\.bossFxFrames\.frozenHit = frames;/g, "this.bossBattle.setFxFrame('frozenHit', frames);");

src = src.replace(
  /this\.bossRewardIconNode\.on\(Node\.EventType\.TOUCH_END, this\.openBossRewardPanel, this\);/,
  'this.bossRewardIconNode.on(Node.EventType.TOUCH_END, () => this.bossBattle.openRewardPanel(), this);',
);
src = src.replace(
  /this\.bossRewardGetButton\.on\(Node\.EventType\.TOUCH_END, \(\) => this\.closeBossVictoryToAvatarHome\(\), this\);\n    this\.bossRewardPanelNode\.active = false;\n  \}/,
  `this.bossRewardGetButton.on(Node.EventType.TOUCH_END, () => this.bossBattle.closeVictoryToAvatarHome(), this);
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
      timingPanel: this.timingPanel,
      hudLayer: this.hudLayer,
      armNode: this.armNode,
    });
  }`,
);

src = src.replace(
  /bossTriggeredThisRun: this\.bossTriggeredThisRun,\n      bossBattleActive: this\.bossBattleActive,/,
  'bossTriggeredThisRun: this.bossBattle.triggeredThisRun,\n      bossBattleActive: this.bossBattle.battleActive,',
);

src = src.replace(/this\.resetBossState\(\);/g, 'this.bossBattle.reset();');

const resetIdx = src.indexOf('  private resetBossState() {');
const timingIdx = src.indexOf('  private startTimingRound() {');
if (resetIdx < 0 || timingIdx < 0) {
  throw new Error('Could not find resetBossState or startTimingRound');
}
src = src.slice(0, resetIdx) + hostSnippet + '\n\n' + src.slice(timingIdx);

const applyIdx = src.indexOf('  private applyBossMiss() {');
const idleIdx = src.indexOf('  private updateIdleCountdown(deltaTime: number) {');
if (applyIdx >= 0 && idleIdx > applyIdx) {
  src = src.slice(0, applyIdx) + src.slice(idleIdx);
}

const reps = [
  [/this\.bossBattleActive/g, 'this.bossBattle.battleActive'],
  [/this\.bossWarningActive/g, 'this.bossBattle.warningActive'],
  [/this\.bossDeathSequenceActive/g, 'this.bossBattle.deathSequenceActive'],
  [/this\.bossComboAttackTaps/g, 'this.bossBattle.comboAttackTaps'],
  [/this\.applyBossMiss\(\)/g, 'this.bossBattle.applyMiss()'],
  [/this\.applyBossTimingItem\(([^)]+)\)/g, 'this.bossBattle.applyTimingItem($1)'],
  [/this\.applyBossPointHit\(([^)]+)\)/g, 'this.bossBattle.applyPointHit($1)'],
  [/this\.fireBossComboTap\(\)/g, 'this.bossBattle.fireComboTap()'],
  [/this\.triggerBossWarning\(\)/g, 'this.bossBattle.triggerWarning()'],
  [
    /this\.bossBattle\.battleActive \|\| this\.bossBattle\.warningActive \|\| this\.bossBattle\.deathSequenceActive/g,
    'this.bossBattle.isBossPhaseActive()',
  ],
];
for (const [pat, rep] of reps) {
  src = src.replace(pat, rep);
}

src = src.replace(
  /    this\.bossBattle\.warningActive = false;\n    this\.bossBattle\.battleActive = false;\n    this\.bossFrozenSeconds = 0;\n    this\.bossComboAttackSeconds = 0;\n    this\.bossBattle\.comboAttackTaps = 0;\n    this\.bossBattle\.deathSequenceActive = false;\n    this\.clearBossBattleActors\(\);[\s\S]*?    if \(this\.bossVictoryLayer\) \{\n      this\.bossVictoryLayer\.active = false;\n    \}\n/,
  '    this.bossBattle.abortForGameOver();\n',
);

src = src.replace(
  /  BossAnimationId,\n  BossBulletState,\n  BossFxId,\n  BossFxState,\n  BossMinionState,\n  DebugBossField,/,
  '  BossAnimationId,\n  DebugBossField,',
);

fs.writeFileSync(mvpPath, src);
console.log('Mvp wired, lines:', src.split(/\r?\n/).length);
