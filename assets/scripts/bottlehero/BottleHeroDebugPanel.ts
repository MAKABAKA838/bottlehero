import { Color, Graphics, Label, Node, tween, UITransform, Vec3 } from 'cc';
import {
  ActiveStageState,
  BalanceStageConfig,
  BottleHeroBalanceConfig,
  getStageOrderIndex,
  mergeBalanceConfig,
  serializeBalanceConfig,
  stageOrder,
  TimingBarAnchorMode,
  TimingTargetPlan,
  TimingTrackMode,
} from './BottleHeroBalance';
import {
  DebugBossField,
  DebugComboField,
  DebugDynamicField,
  DebugLanguage,
  DebugPage,
  DebugPointTierField,
  DebugStageField,
  DebugStabilityField,
  debugPages,
  GameState,
  TimingTrackShape,
} from './BottleHeroTypes';
import { isInternalToolsEnabled } from './BottleHeroBuildFlags';
import { playableBossIds, playableLevelIds, type BossId, type LevelId } from './BottleHeroGameConfig';

/** 右侧「编辑关卡」栏；主内容必须全部落在其左侧，避免重叠。 */
const DEBUG_LEVEL_RAIL_X = 378;
const DEBUG_LEVEL_RAIL_W = 110;
const DEBUG_CONTENT_CENTER_X = -36;
const DEBUG_MAIN_BUTTON_W = 520;
const DEBUG_ROW_W = 580;
const DEBUG_ROW_LABEL_X = -220;
const DEBUG_ROW_VALUE_X = 36;
const DEBUG_ROW_MINUS_X = 158;
const DEBUG_ROW_PLUS_X = 248; // + 半宽 35 ≈ 右缘 283，右侧关卡栏左缘 ≈ 323，留缝约 40

export function styleDebugButton(button: Node, selected: boolean, color: 'normal' | 'danger' = 'normal') {
  const transform = button.getComponent(UITransform);
  const width = transform?.width || 120;
  const height = transform?.height || 50;
  const graphics = button.getComponent(Graphics);
  if (graphics) {
    graphics.clear();
    const normalFill = color === 'danger' ? new Color(225, 116, 108, 230) : new Color(114, 228, 178, 230);
    const selectedFill = color === 'danger' ? new Color(255, 116, 102, 250) : new Color(255, 218, 82, 250);
    graphics.fillColor = selected ? selectedFill : normalFill;
    graphics.strokeColor = selected ? new Color(255, 255, 255, 255) : new Color(25, 67, 57, 240);
    graphics.lineWidth = selected ? 8 : 6;
    graphics.rect(-width * 0.5, -height * 0.5, width, height);
    graphics.fill();
    graphics.stroke();
  }

  const label = button.getChildByName(`${button.name}Text`)?.getComponent(Label);
  if (label) {
    label.color = selected ? new Color(28, 42, 52, 255) : new Color(55, 38, 24, 255);
    label.outlineColor = selected ? new Color(255, 255, 255, 210) : new Color(0, 0, 0, 245);
    label.outlineWidth = selected ? 1 : 2;
  }
}

export interface DebugPanelUiRefs {
  debugLayer: Node;
}

export interface DebugPanelHost {
  getDesignWidth(): number;
  getDesignHeight(): number;
  getBalanceConfig(): BottleHeroBalanceConfig;
  setBalanceConfig(config: BottleHeroBalanceConfig): void;
  getPendingBalanceConfig(): BottleHeroBalanceConfig;
  setPendingBalanceConfig(config: BottleHeroBalanceConfig): void;
  getPackagedBalanceConfig(): BottleHeroBalanceConfig;
  isLocalDebugConfigActive(): boolean;
  setLocalDebugConfigActive(active: boolean): void;
  getGameState(): GameState;
  setGameState(state: GameState): void;
  setPauseLayerActive(active: boolean): void;
  getActiveStageState(): ActiveStageState;
  getCurrentTargetPlan(): TimingTargetPlan | null;
  getRunElapsedSeconds(): number;
  getRoundCount(): number;
  getBottleCount(): number;
  getScore(): number;
  getBestScore(): number;
  getStability(): number;
  getTimingTrackShape(): TimingTrackShape;
  getCombo(): number;
  hasActiveThrows(): boolean;
  hasStartedTower(): boolean;
  createRectNode(name: string, parent: Node, x: number, y: number, width: number, height: number, color: Color): Node;
  createLabel(
    name: string,
    parent: Node,
    text: string,
    x: number,
    y: number,
    fontSize: number,
    color: Color,
    outlineWidth: number,
    width: number,
    align: Label.HorizontalAlign,
  ): Label;
  createTextButton(name: string, parent: Node, text: string, x: number, y: number, width: number, height: number, fontSize: number): Node;
  createNode(name: string, parent: Node, x: number, y: number, width: number, height: number): Node;
  scheduleRefresh(callback: () => void, interval: number): void;
  unscheduleRefresh(callback: () => void): void;
  onConfigApplied(): void;
  saveBalanceConfigToStorage(config: BottleHeroBalanceConfig): void;
  clearLocalDebugConfigStorage(): void;
  resetBestScore(): void;
  clearPlayerNameForTest(): void;
  setBestScore(score: number): void;
  triggerDebugGameOver(): void;
  startDebugBossTest(): void;
  exportDebugConfigToConsole(): void;
  getDebugLevelId(): LevelId;
  getCurrentRunLevelId(): LevelId;
  getPlayableLevelIds(): LevelId[];
  getLevelLabel(levelId: LevelId): string;
  switchDebugLevel(levelId: LevelId): Promise<void>;
  getActiveBossId(): BossId;
  getPlayableBossIds(): BossId[];
  getBossLabel(bossId: BossId): string;
  switchDebugBoss(bossId: BossId): Promise<void>;
}

export class BottleHeroDebugPanelController {
  private host!: DebugPanelHost;
  private refs!: DebugPanelUiRefs;
  private debugContentLayer!: Node;
  private debugStatusLabel!: Label;
  private debugPageLabel!: Label;
  private debugToastLabel!: Label;
  private debugValueLabels: Record<string, Label> = {};
  private debugTabButtons: Partial<Record<DebugPage, Node>> = {};
  private debugPage: DebugPage = 'STAGE';
  private debugLanguage: DebugLanguage = 'zh';
  private debugStatusMessage = '';
  private selectedDebugStageIndex = 0;
  private selectedDebugItemIndex = 0;
  private selectedDebugPointTierIndex = 0;
  private debugLevelCaptionLabel!: Label;
  private debugLevelButtons: Partial<Record<LevelId, Node>> = {};
  private debugBossCaptionLabel!: Label;
  private debugBossButtons: Partial<Record<BossId, Node>> = {};
  private debugPendingBestScore = 0;
  private debugBestScoreValueLabel: Label | null = null;
  private readonly refreshDebugStatus = () => this.onRefreshDebugStatus();

  init(host: DebugPanelHost) {
    this.host = host;
  }

  attachUi(refs: DebugPanelUiRefs) {
    this.refs = refs;
  }

  buildLayer() {
    const host = this.host;
    const { debugLayer } = this.refs;
    debugLayer.active = false;
    host.createRectNode('DebugBack', debugLayer, 0, 0, host.getDesignWidth(), host.getDesignHeight(), new Color(21, 30, 38, 238));
    host.createRectNode(
      'DebugHeaderBack',
      debugLayer,
      0,
      646,
      host.getDesignWidth(),
      180,
      new Color(45, 74, 86, 245),
    );
    this.debugStatusLabel = host.createLabel(
      'DebugStatusLabel',
      debugLayer,
      '',
      0,
      680,
      18,
      new Color(229, 248, 255, 255),
      2,
      720,
      Label.HorizontalAlign.LEFT,
    );
    this.debugStatusLabel.lineHeight = 26;
    this.debugPageLabel = host.createLabel(
      'DebugPageLabel',
      debugLayer,
      '策划 BALANCE',
      -72,
      604,
      30,
      new Color(255, 244, 166, 255),
      3,
      360,
      Label.HorizontalAlign.LEFT,
    );
    const langButton = host.createTextButton(
      'DebugLangButton',
      debugLayer,
      '中文/EN',
      250,
      604,
      140,
      54,
      18,
    );
    langButton.on(Node.EventType.TOUCH_END, () => this.toggleDebugLanguage(), this);
    this.debugToastLabel = host.createLabel(
      'DebugToastLabel',
      debugLayer,
      '',
      0,
      388,
      28,
      new Color(255, 255, 255, 255),
      4,
      680,
      Label.HorizontalAlign.CENTER,
    );
    this.debugToastLabel.node.active = false;

    for (let i = 0; i < debugPages.length; i++) {
      const page = debugPages[i];
      const tabY = i < 4 ? 515 : 436;
      const tab = host.createTextButton(
        `DebugTab_${page}`,
        debugLayer,
        this.getDebugPageLabel(page),
        -280 + (i % 4) * 170,
        tabY,
        155,
        50,
        16,
      );
      this.debugTabButtons[page] = tab;
      tab.on(Node.EventType.TOUCH_END, () => this.setDebugPage(page), this);
    }

    this.debugContentLayer = host.createNode('DebugContentLayer', debugLayer, 0, -10, host.getDesignWidth(), host.getDesignHeight());

    // 编辑关卡：右侧竖栏；主内容列宽受 DEBUG_ROW_W / PLUS 右缘约束
    const levelRailCaptionY = 290;
    const levelRailButtonTopY = 238;
    const levelButtonGap = 72;
    host.createRectNode(
      'DebugLevelStripBack',
      debugLayer,
      DEBUG_LEVEL_RAIL_X,
      180,
      DEBUG_LEVEL_RAIL_W,
      280,
      new Color(45, 74, 86, 210),
    );
    this.debugLevelCaptionLabel = host.createLabel(
      'DebugLevelCaption',
      debugLayer,
      this.getDebugLevelCaptionText(),
      DEBUG_LEVEL_RAIL_X,
      levelRailCaptionY,
      16,
      new Color(214, 242, 226, 255),
      1,
      DEBUG_LEVEL_RAIL_W - 8,
      Label.HorizontalAlign.CENTER,
    );
    playableLevelIds.forEach((levelId, index) => {
      const button = host.createTextButton(
        `DebugLevel_${levelId}`,
        debugLayer,
        this.getDebugLevelButtonLabel(levelId),
        DEBUG_LEVEL_RAIL_X,
        levelRailButtonTopY - index * levelButtonGap,
        92,
        52,
        17,
      );
      this.debugLevelButtons[levelId] = button;
      button.on(Node.EventType.TOUCH_END, () => {
        void this.selectDebugLevel(levelId);
      }, this);
    });

    const footerButtons: Array<{ name: string; label: string; x: number; handler: () => void }> = [
      { name: 'DebugFooterReset', label: 'RESET', x: -315, handler: () => this.resetDebugConfig() },
      { name: 'DebugFooterApply', label: 'APPLY', x: -105, handler: () => this.applyDebugConfig() },
      { name: 'DebugFooterSave', label: 'SAVE', x: 105, handler: () => this.saveDebugConfig() },
      { name: 'DebugFooterClose', label: 'CLOSE', x: 315, handler: () => this.closePanel() },
    ];
    for (const buttonConfig of footerButtons) {
      const button = host.createTextButton(
        buttonConfig.name,
        debugLayer,
        buttonConfig.label,
        buttonConfig.x,
        -680,
        190,
        86,
        23,
      );
      button.on(Node.EventType.TOUCH_END, buttonConfig.handler, this);
    }

    this.renderDebugPage();
    this.updateDebugStatus();
  }

  openPanel() {
    if (!isInternalToolsEnabled() || this.host.getGameState() !== 'paused') {
      return;
    }
    void this.host.switchDebugLevel(this.host.getCurrentRunLevelId()).then(() => {
      this.host.setPendingBalanceConfig(mergeBalanceConfig(this.host.getBalanceConfig()));
      this.debugStatusMessage = '';
      this.host.setPauseLayerActive(false);
      this.refs.debugLayer.active = true;
      this.updateDebugLevelHighlights();
      this.renderDebugPage();
      this.updateDebugStatus();
      this.host.scheduleRefresh(this.refreshDebugStatus, 0.5);
    });
  }

  closePanel() {
    this.unscheduleRefresh();
    this.refs.debugLayer.active = false;
    const state = this.host.getGameState();
    if (state !== 'gameover' && state !== 'title') {
      this.host.setGameState('paused');
      this.host.setPauseLayerActive(true);
    }
  }

  unscheduleRefresh() {
    this.host.unscheduleRefresh(this.refreshDebugStatus);
  }

  private onRefreshDebugStatus() {
    if (!this.refs.debugLayer?.active) {
      return;
    }
    this.updateDebugStatus();
  }

  private applyDebugConfig() {
    const host = this.host;
    const nextConfig = mergeBalanceConfig(host.getPendingBalanceConfig());
    const balanceConfig = host.getBalanceConfig();
    const editingOtherLevel = host.getDebugLevelId() !== host.getCurrentRunLevelId();
    if (editingOtherLevel) {
      host.saveBalanceConfigToStorage(nextConfig);
      host.setLocalDebugConfigActive(true);
      this.debugStatusMessage = 'SAVED FOR EDIT LEVEL';
      this.showDebugToast(this.debugLanguage === 'zh'
        ? '已保存到所选关卡，本局不变；重开该关卡后生效'
        : 'Saved for selected level; restart that level to play it');
      this.renderDebugPage();
      this.updateDebugStatus();
      return;
    }
    if ((host.hasActiveThrows() || host.hasStartedTower()) && nextConfig.stability.bottleStepY !== balanceConfig.stability.bottleStepY) {
      nextConfig.stability.bottleStepY = balanceConfig.stability.bottleStepY;
      this.debugStatusMessage = 'bottleStepY kept: restart run to apply';
      this.showDebugToast('已应用，堆叠间距需重开局生效');
      console.warn('BottleHero debug APPLY kept previous bottleStepY because the current run already has tower state.');
    } else {
      this.debugStatusMessage = 'APPLIED';
      this.showDebugToast('设置已应用');
    }
    host.setBalanceConfig(mergeBalanceConfig(nextConfig));
    host.setPendingBalanceConfig(mergeBalanceConfig(host.getBalanceConfig()));
    host.onConfigApplied();
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private saveDebugConfig() {
    this.applyDebugConfig();
    this.host.saveBalanceConfigToStorage(this.host.getBalanceConfig());
    this.host.setLocalDebugConfigActive(true);
    this.debugStatusMessage = 'SAVED - LOCAL CONFIG ON';
    this.showDebugToast('保存成功，本机配置已开启');
    this.updateDebugStatus();
  }

  private resetDebugConfig() {
    this.host.setPendingBalanceConfig(mergeBalanceConfig(this.host.getPackagedBalanceConfig()));
    this.debugStatusMessage = 'PENDING RESET TO DEFAULT';
    this.showDebugToast('已恢复默认预设，点击 APPLY 生效');
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private clearLocalDebugConfig() {
    this.host.clearLocalDebugConfigStorage();
    this.host.setLocalDebugConfigActive(false);
    this.host.setPendingBalanceConfig(mergeBalanceConfig(this.host.getPackagedBalanceConfig()));
    this.applyDebugConfig();
    this.debugStatusMessage = this.debugStatusMessage === 'APPLIED' ? 'LOCAL CONFIG CLEARED' : `LOCAL CLEARED | ${this.debugStatusMessage}`;
    this.updateDebugStatus();
  }

  private setDebugPage(page: DebugPage) {
    this.debugPage = page;
    this.debugStatusMessage = '';
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private toggleDebugLanguage() {
    this.debugLanguage = this.debugLanguage === 'zh' ? 'en' : 'zh';
    if (this.debugLevelCaptionLabel) {
      this.debugLevelCaptionLabel.string = this.getDebugLevelCaptionText();
    }
    this.renderDebugPage();
    this.updateDebugStatus();
    this.updateDebugLevelHighlights();
  }

  private getDebugLevelCaptionText() {
    return this.debugLanguage === 'zh' ? '编辑关卡' : 'EDIT LEVEL';
  }

  private getDebugLevelButtonLabel(levelId: LevelId) {
    const shortId = levelId.replace('level_', 'L');
    return levelId === this.host.getDebugLevelId() ? `* ${shortId}` : shortId;
  }

  private async selectDebugLevel(levelId: LevelId) {
    if (levelId === this.host.getDebugLevelId()) {
      return;
    }
    await this.host.switchDebugLevel(levelId);
    this.debugStatusMessage = this.debugLanguage === 'zh'
      ? `已切换编辑关卡 ${this.host.getLevelLabel(levelId)}`
      : `EDITING ${levelId.toUpperCase()}`;
    this.updateDebugLevelHighlights();
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private updateDebugLevelHighlights() {
    for (const levelId of playableLevelIds) {
      const button = this.debugLevelButtons[levelId];
      if (!button) {
        continue;
      }
      const label = button.getChildByName(`${button.name}Text`)?.getComponent(Label);
      if (label) {
        label.string = this.getDebugLevelButtonLabel(levelId);
      }
      styleDebugButton(button, levelId === this.host.getDebugLevelId());
    }
  }

  private getDebugPageLabel(page: DebugPage) {
    if (this.debugLanguage === 'zh') {
      const labels: Record<DebugPage, string> = {
        STAGE: '阶段',
        STABILITY: '稳定',
        ITEMS: '道具',
        POINTS: '判定点',
        COMBO: '连击',
        BOSS: 'Boss',
        MONITOR: '监测',
        PRESETS: '预设',
      };
      return labels[page];
    }
    return page;
  }

  private renderDebugPage() {
    if (!this.debugContentLayer) {
      return;
    }
    this.debugContentLayer.children.slice().forEach((child) => child.destroy());
    this.debugValueLabels = {};
    this.debugPageLabel.string = `${this.getDebugPageLabel(this.debugPage)} BALANCE`;
    this.updateDebugTabHighlights();
    if (this.debugPage === 'STAGE') {
      this.renderDebugStagePage();
    } else if (this.debugPage === 'STABILITY') {
      this.renderDebugStabilityPage();
    } else if (this.debugPage === 'ITEMS') {
      this.renderDebugItemsPage();
    } else if (this.debugPage === 'POINTS') {
      this.renderDebugPointsPage();
    } else if (this.debugPage === 'COMBO') {
      this.renderDebugComboPage();
    } else if (this.debugPage === 'BOSS') {
      this.renderDebugBossPage();
    } else if (this.debugPage === 'MONITOR') {
      this.renderDebugMonitorPage();
    } else {
      this.renderDebugPresetsPage();
    }
  }

  private updateDebugTabHighlights() {
    for (const page of debugPages) {
      const tab = this.debugTabButtons[page];
      if (tab) {
        const label = tab.getChildByName(`${tab.name}Text`)?.getComponent(Label);
        if (label) {
          label.string = this.getDebugPageLabel(page);
        }
        styleDebugButton(tab, page === this.debugPage);
      }
    }
  }

  private renderDebugStagePage() {
    const host = this.host;
    const pendingBalanceConfig = host.getPendingBalanceConfig();
    const stages = pendingBalanceConfig.stages;
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const card = host.createTextButton(`DebugStageCard_${stage.id}`, this.debugContentLayer, this.debugLanguage === 'zh' ? stage.labelZh : stage.labelEn, -250 + i * 115, 350, 108, 54, 16);
      styleDebugButton(card, i === this.selectedDebugStageIndex);
      card.on(Node.EventType.TOUCH_END, () => {
        this.selectedDebugStageIndex = i;
        this.renderDebugPage();
      }, this);
    }
    const stage = stages[this.selectedDebugStageIndex] || stages[0];
    host.createLabel('DebugStageSelected', this.debugContentLayer, this.debugLanguage === 'zh' ? stage.labelZh : stage.labelEn, 0, 284, 30, new Color(255, 244, 166, 255), 3, 520, Label.HorizontalAlign.CENTER);
    this.createDebugHint(
      'DebugStageHint',
      this.debugLanguage === 'zh'
        ? '这一页按阶段调手感：负值偏奖励，0为平衡，正值偏惩罚。改完点 APPLY 才会进游戏。'
        : 'Tune each phase here: negative favors rewards, 0 is balanced, positive favors penalties. Tap APPLY to use it.',
      0,
      244,
    );
    this.createStageNumberRow('durationSeconds', '阶段时长', 'Duration', stage.durationSeconds, 184, 5);
    this.createStageNumberRow('targetCountMin', '最少目标', 'Min Targets', stage.targetCountMin, 126, 1);
    this.createStageNumberRow('targetCountMax', '最多目标', 'Max Targets', stage.targetCountMax, 68, 1);
    this.createStageNumberRow('handleSpeed', 'Handle速度', 'Handle Speed', stage.handleSpeed, 10, 0.1);
    this.createStageNumberRow('handleVariance', '随机变速', 'Variance', stage.handleVariance, -48, 0.05);
    this.createStageNumberRow('rewardPenaltyBias', '奖励 ← 0 → 惩罚', 'Reward <- 0 -> Penalty', stage.rewardPenaltyBias, -106, 5);
    this.createStageNumberRow('missStabilityPenalty', 'Miss扣稳定', 'Miss Penalty', stage.missStabilityPenalty, -164, 1);
    this.createStageNumberRow('bombStabilityPenalty', 'Bomb扣稳定', 'Bomb Penalty', stage.bombStabilityPenalty, -222, 1);
    this.createTrackModeRow(stage, -370);
    this.createAnchorModeRow(-530);
  }

  private createStageNumberRow(field: DebugStageField, zh: string, en: string, value: number, y: number, step: number) {
    const host = this.host;
    host.createRectNode(`DebugStageRow_${field}`, this.debugContentLayer, DEBUG_CONTENT_CENTER_X, y, DEBUG_ROW_W, 52, new Color(255, 255, 255, 24));
    host.createLabel(`DebugStageLabel_${field}`, this.debugContentLayer, this.debugLanguage === 'zh' ? zh : en, DEBUG_ROW_LABEL_X, y, 20, new Color(244, 248, 232, 255), 2, 240, Label.HorizontalAlign.LEFT);
    const valueColor = field === 'rewardPenaltyBias'
      ? (value < 0 ? new Color(114, 255, 177, 255) : value > 0 ? new Color(255, 142, 124, 255) : new Color(255, 244, 166, 255))
      : new Color(255, 244, 166, 255);
    host.createLabel(`DebugStageValue_${field}`, this.debugContentLayer, this.formatDebugNumber(value), DEBUG_ROW_VALUE_X, y, 22, valueColor, 2, 140, Label.HorizontalAlign.CENTER);
    const minus = host.createTextButton(`DebugStageMinus_${field}`, this.debugContentLayer, '-', DEBUG_ROW_MINUS_X, y, 70, 50, 26);
    const plus = host.createTextButton(`DebugStagePlus_${field}`, this.debugContentLayer, '+', DEBUG_ROW_PLUS_X, y, 70, 50, 26);
    minus.on(Node.EventType.TOUCH_END, () => this.adjustPendingStageNumber(field, -step), this);
    plus.on(Node.EventType.TOUCH_END, () => this.adjustPendingStageNumber(field, step), this);
  }

  private adjustPendingStageNumber(field: DebugStageField, delta: number) {
    const host = this.host;
    const stages = host.getPendingBalanceConfig().stages.slice();
    const stage = { ...stages[this.selectedDebugStageIndex] };
    stage[field] = Number((Number(stage[field]) + delta).toFixed(2)) as never;
    stages[this.selectedDebugStageIndex] = stage;
    host.setPendingBalanceConfig(mergeBalanceConfig({ ...host.getPendingBalanceConfig(), stages }));
    this.debugStatusMessage = 'PENDING STAGE CHANGED';
    this.showDebugToast('阶段数值已调整，点击 APPLY 生效');
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private createTrackModeRow(stage: BalanceStageConfig, y: number) {
    const host = this.host;
    const pad = 14;
    const titleGap = 10;
    const titleH = 26;
    const btnW = 112;
    const btnH = 40;
    const gapX = 12;
    const gapY = 10;
    const cols = 3;
    const rows = 3;
    const gridW = cols * btnW + (cols - 1) * gapX;
    const gridH = rows * btnH + (rows - 1) * gapY;
    const cardH = pad + titleH + titleGap + gridH + pad;

    host.createRectNode(
      'DebugTrackRow',
      this.debugContentLayer,
      DEBUG_CONTENT_CENTER_X,
      y,
      DEBUG_ROW_W,
      cardH,
      new Color(255, 255, 255, 24),
    );

    // 标题独占顶行，与下方按键网格分离
    const titleY = y + cardH / 2 - pad - titleH / 2;
    host.createLabel(
      'DebugTrackLabel',
      this.debugContentLayer,
      this.debugLanguage === 'zh' ? '轨道样式' : 'Track',
      DEBUG_CONTENT_CENTER_X,
      titleY,
      20,
      new Color(244, 248, 232, 255),
      2,
      DEBUG_ROW_W - 40,
      Label.HorizontalAlign.CENTER,
    );

    const modes: Array<{ mode: TimingTrackMode; label: string }> = [
      { mode: 'line', label: 'LINE' },
      { mode: 'circle', label: 'CIRCLE' },
      { mode: 'triangle', label: 'TRI' },
      { mode: 'path', label: 'PATH' },
      { mode: 'star', label: 'STAR' },
      { mode: 'infinity', label: 'INF' },
      { mode: 'randomBasic', label: 'RND3' },
      { mode: 'randomCore', label: 'RND4' },
      { mode: 'random', label: 'ALL' },
    ];
    const gridTop = titleY - titleH / 2 - titleGap;
    const gridLeft = DEBUG_CONTENT_CENTER_X - gridW / 2;
    for (let i = 0; i < modes.length; i++) {
      const option = modes[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = gridLeft + btnW / 2 + col * (btnW + gapX);
      const buttonY = gridTop - btnH / 2 - row * (btnH + gapY);
      const button = host.createTextButton(
        `DebugTrack_${option.mode}`,
        this.debugContentLayer,
        option.label,
        x,
        buttonY,
        btnW,
        btnH,
        15,
      );
      styleDebugButton(button, option.mode === stage.trackMode);
      button.on(Node.EventType.TOUCH_END, () => this.setPendingStageTrackMode(option.mode), this);
    }
  }

  private setPendingStageTrackMode(mode: TimingTrackMode) {
    const host = this.host;
    const stages = host.getPendingBalanceConfig().stages.slice();
    stages[this.selectedDebugStageIndex] = { ...stages[this.selectedDebugStageIndex], trackMode: mode };
    host.setPendingBalanceConfig(mergeBalanceConfig({ ...host.getPendingBalanceConfig(), stages }));
    this.debugStatusMessage = 'PENDING TRACK CHANGED';
    this.showDebugToast('轨道样式已调整，点击 APPLY 生效');
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private createAnchorModeRow(y: number) {
    const host = this.host;
    host.createRectNode('DebugAnchorRow', this.debugContentLayer, DEBUG_CONTENT_CENTER_X, y, DEBUG_ROW_W, 54, new Color(255, 255, 255, 24));
    host.createLabel('DebugAnchorLabel', this.debugContentLayer, this.debugLanguage === 'zh' ? 'BAR位置' : 'Bar Anchor', DEBUG_ROW_LABEL_X, y, 18, new Color(244, 248, 232, 255), 2, 200, Label.HorizontalAlign.LEFT);
    const modes: Array<{ mode: TimingBarAnchorMode; zh: string; en: string }> = [
      { mode: 'followTower', zh: '跟随塔尖', en: 'FOLLOW' },
      { mode: 'sceneCenter', zh: '固定中心', en: 'CENTER' },
    ];
    for (let i = 0; i < modes.length; i++) {
      const option = modes[i];
      const button = host.createTextButton(`DebugAnchor_${option.mode}`, this.debugContentLayer, this.debugLanguage === 'zh' ? option.zh : option.en, -40 + i * 180, y, 160, 44, 17);
      styleDebugButton(button, option.mode === host.getPendingBalanceConfig().timingBarAnchorMode);
      button.on(Node.EventType.TOUCH_END, () => this.setPendingAnchorMode(option.mode), this);
    }
  }

  private setPendingAnchorMode(mode: TimingBarAnchorMode) {
    const host = this.host;
    host.setPendingBalanceConfig(mergeBalanceConfig({ ...host.getPendingBalanceConfig(), timingBarAnchorMode: mode }));
    this.debugStatusMessage = 'PENDING BAR ANCHOR CHANGED';
    this.showDebugToast('BAR位置模式已调整，点击 APPLY 生效');
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private renderDebugStabilityPage() {
    const rows: Array<{ field: DebugStabilityField; zh: string; en: string; step: number }> = [
      { field: 'initialStability', zh: '初始稳定', en: 'Initial Stability', step: 5 },
      { field: 'stabilityRecoverAmount', zh: '恢复稳定', en: 'Recover Amount', step: 1 },
      { field: 'bombDropMin', zh: 'Bomb最少掉落', en: 'Bomb Min Drop', step: 1 },
      { field: 'bombDropMax', zh: 'Bomb最多掉落', en: 'Bomb Max Drop', step: 1 },
      { field: 'foodHandleScale', zh: 'Food放大', en: 'Food Scale', step: 0.1 },
      { field: 'foodDurationMin', zh: 'Food最短', en: 'Food Min Time', step: 0.5 },
      { field: 'foodDurationMax', zh: 'Food最长', en: 'Food Max Time', step: 0.5 },
      { field: 'bottleStepY', zh: '塔间距', en: 'Stack Spacing', step: 4 },
      { field: 'towerSwayScale', zh: '塔摆动', en: 'Tower Sway', step: 0.05 },
      { field: 'multiplyThrowMin', zh: '多抛最少', en: 'Multiply Min', step: 1 },
      { field: 'multiplyThrowMax', zh: '多抛最多', en: 'Multiply Max', step: 1 },
      { field: 'perfectRadiusScale', zh: 'Perfect范围', en: 'Perfect Window', step: 0.05 },
      { field: 'goodRadiusScale', zh: 'Good范围', en: 'Good Window', step: 0.05 },
      { field: 'circleTrackRadius', zh: '圆环半径', en: 'Circle Radius', step: 8 },
    ];
    const startY = 345;
    for (let i = 0; i < rows.length; i++) {
      this.createStabilityNumberRow(rows[i], startY - i * 48);
    }
    this.createDebugHint(
      'DebugDynamicHint',
      this.debugLanguage === 'zh'
        ? '动态难度：开启后会监听最近命中、Miss和稳定值。失误多会提高奖励/降低压力，表现好会逐步增加挑战。'
        : 'Dynamic difficulty watches recent hits, misses, and stability. More mistakes add assist; strong play adds pressure.',
      0,
      -335,
    );
    this.renderDynamicToggleRows(-390);
  }

  private createStabilityNumberRow(row: { field: DebugStabilityField; zh: string; en: string; step: number }, y: number) {
    const host = this.host;
    const value = Number(host.getPendingBalanceConfig().stability[row.field]);
    host.createRectNode(`DebugStabilityRow_${row.field}`, this.debugContentLayer, DEBUG_CONTENT_CENTER_X, y, DEBUG_ROW_W, 42, new Color(255, 255, 255, 22));
    host.createLabel(`DebugStabilityLabel_${row.field}`, this.debugContentLayer, this.debugLanguage === 'zh' ? row.zh : row.en, DEBUG_ROW_LABEL_X, y, 17, new Color(244, 248, 232, 255), 2, 240, Label.HorizontalAlign.LEFT);
    host.createLabel(`DebugStabilityValue_${row.field}`, this.debugContentLayer, this.formatDebugNumber(value), DEBUG_ROW_VALUE_X, y, 20, new Color(255, 244, 166, 255), 2, 140, Label.HorizontalAlign.CENTER);
    const minus = host.createTextButton(`DebugStabilityMinus_${row.field}`, this.debugContentLayer, '-', DEBUG_ROW_MINUS_X, y, 66, 40, 22);
    const plus = host.createTextButton(`DebugStabilityPlus_${row.field}`, this.debugContentLayer, '+', DEBUG_ROW_PLUS_X, y, 66, 40, 22);
    minus.on(Node.EventType.TOUCH_END, () => this.adjustPendingStabilityNumber(row.field, -row.step), this);
    plus.on(Node.EventType.TOUCH_END, () => this.adjustPendingStabilityNumber(row.field, row.step), this);
  }

  private renderDynamicToggleRows(y: number) {
    const host = this.host;
    const labels: Array<{ field: DebugDynamicField; zh: string; en: string }> = [
      { field: 'enabled', zh: '动态难度', en: 'Dynamic' },
    ];
    for (let i = 0; i < labels.length; i++) {
      const item = labels[i];
      const button = host.createTextButton(`DebugDynamic_${item.field}`, this.debugContentLayer, `${this.debugLanguage === 'zh' ? item.zh : item.en}: ${host.getPendingBalanceConfig().dynamic[item.field] ? 'ON' : 'OFF'}`, DEBUG_CONTENT_CENTER_X, y, 280, 50, 18);
      styleDebugButton(button, Boolean(host.getPendingBalanceConfig().dynamic[item.field]));
      button.on(Node.EventType.TOUCH_END, () => this.togglePendingDynamicBoolean(item.field), this);
    }
  }

  private adjustPendingStabilityNumber(field: DebugStabilityField, delta: number) {
    const host = this.host;
    const stability = { ...host.getPendingBalanceConfig().stability, [field]: Number((Number(host.getPendingBalanceConfig().stability[field]) + delta).toFixed(2)) };
    host.setPendingBalanceConfig(mergeBalanceConfig({ ...host.getPendingBalanceConfig(), stability }));
    this.debugStatusMessage = 'PENDING STABILITY CHANGED';
    this.showDebugToast('稳定/手感数值已调整，点击 APPLY 生效');
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private togglePendingDynamicBoolean(field: DebugDynamicField) {
    const host = this.host;
    const current = host.getPendingBalanceConfig().dynamic[field];
    if (typeof current !== 'boolean') {
      return;
    }
    host.setPendingBalanceConfig(mergeBalanceConfig({ ...host.getPendingBalanceConfig(), dynamic: { ...host.getPendingBalanceConfig().dynamic, [field]: !current } }));
    this.debugStatusMessage = 'PENDING DYNAMIC CHANGED';
    this.showDebugToast('动态难度开关已调整，点击 APPLY 生效');
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private renderDebugItemsPage() {
    const host = this.host;
    const items = host.getPendingBalanceConfig().items;
    const selected = items[this.selectedDebugItemIndex] || items[0];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const label = this.debugLanguage === 'zh' ? item.debugLabelZh : item.debugLabelEn;
      const cols = 4;
      const cardX = -230 + (i % cols) * 118;
      const cardY = 350 - Math.floor(i / cols) * 60;
      const card = host.createTextButton(`DebugItemCard_${item.id}`, this.debugContentLayer, label, cardX, cardY, 108, 50, 14);
      styleDebugButton(card, i === this.selectedDebugItemIndex, item.category === 'penalty' ? 'danger' : 'normal');
      card.on(Node.EventType.TOUCH_END, () => {
        this.selectedDebugItemIndex = i;
        this.renderDebugPage();
      }, this);
    }
    if (!selected) {
      return;
    }
    const itemLabel = this.debugLanguage === 'zh' ? selected.debugLabelZh : selected.debugLabelEn;
    host.createLabel('DebugItemSelected', this.debugContentLayer, `${itemLabel} | ${selected.category}`, DEBUG_CONTENT_CENTER_X, 200, 24, new Color(255, 244, 166, 255), 3, DEBUG_ROW_W - 20, Label.HorizontalAlign.CENTER);
    host.createLabel('DebugItemInfo', this.debugContentLayer, `effect ${selected.effect} | unlock ${selected.stageUnlock} | sprite ${selected.spriteKey}`, DEBUG_CONTENT_CENTER_X, 160, 16, new Color(184, 214, 210, 255), 1, DEBUG_ROW_W - 20, Label.HorizontalAlign.CENTER);
    host.createLabel('DebugItemWeightLabel', this.debugContentLayer, this.debugLanguage === 'zh' ? '基础权重' : 'Base Weight', DEBUG_ROW_LABEL_X, 100, 18, new Color(244, 248, 232, 255), 2, 220, Label.HorizontalAlign.LEFT);
    host.createLabel('DebugItemWeightValue', this.debugContentLayer, this.formatDebugNumber(selected.baseWeight), DEBUG_ROW_VALUE_X, 100, 22, new Color(255, 244, 166, 255), 2, 140, Label.HorizontalAlign.CENTER);
    const minus = host.createTextButton('DebugItemWeightMinus', this.debugContentLayer, '-', DEBUG_ROW_MINUS_X, 100, 70, 50, 26);
    const plus = host.createTextButton('DebugItemWeightPlus', this.debugContentLayer, '+', DEBUG_ROW_PLUS_X, 100, 70, 50, 26);
    minus.on(Node.EventType.TOUCH_END, () => this.adjustPendingItemWeight(-0.1), this);
    plus.on(Node.EventType.TOUCH_END, () => this.adjustPendingItemWeight(0.1), this);
    const enabled = host.createTextButton('DebugItemEnabled', this.debugContentLayer, selected.enabled ? 'ON' : 'OFF', -170, 30, 150, 54, 20);
    styleDebugButton(enabled, selected.enabled);
    enabled.on(Node.EventType.TOUCH_END, () => this.togglePendingItemBoolean('enabled'), this);
    const oneTime = host.createTextButton('DebugItemOneTime', this.debugContentLayer, selected.oneTimePerRun ? '1X' : 'RPT', -10, 30, 140, 54, 20);
    styleDebugButton(oneTime, selected.oneTimePerRun);
    oneTime.on(Node.EventType.TOUCH_END, () => this.togglePendingItemBoolean('oneTimePerRun'), this);
    const unlock = host.createTextButton('DebugItemUnlock', this.debugContentLayer, `NEXT ${selected.stageUnlock.toUpperCase()}`, 160, 30, 180, 54, 15);
    unlock.on(Node.EventType.TOUCH_END, () => this.cyclePendingItemUnlock(), this);
    this.createDebugHint(
      'DebugItemNote',
      this.debugLanguage === 'zh'
        ? 'ON/OFF 控制是否进入随机池；1X 表示本局命中过一次后不再重复出现；NEXT 切换首次出现阶段。新增注册表道具会自动出现在这里。'
        : 'ON/OFF controls the random pool; 1X removes the item after one hit per run; NEXT changes its unlock phase. Registry items appear here automatically.',
      0,
      -68,
    );
  }

  private adjustPendingItemWeight(delta: number) {
    const host = this.host;
    const items = host.getPendingBalanceConfig().items.slice();
    const item = { ...items[this.selectedDebugItemIndex] };
    item.baseWeight = Number((item.baseWeight + delta).toFixed(2));
    items[this.selectedDebugItemIndex] = item;
    host.setPendingBalanceConfig(mergeBalanceConfig({ ...host.getPendingBalanceConfig(), items }));
    this.debugStatusMessage = 'PENDING ITEM CHANGED';
    this.showDebugToast('道具权重已调整，点击 APPLY 生效');
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private togglePendingItemBoolean(field: 'enabled' | 'oneTimePerRun') {
    const host = this.host;
    const items = host.getPendingBalanceConfig().items.slice();
    const item = { ...items[this.selectedDebugItemIndex] };
    item[field] = !item[field];
    items[this.selectedDebugItemIndex] = item;
    host.setPendingBalanceConfig(mergeBalanceConfig({ ...host.getPendingBalanceConfig(), items }));
    this.showDebugToast('道具开关已调整，点击 APPLY 生效');
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private cyclePendingItemUnlock() {
    const host = this.host;
    const items = host.getPendingBalanceConfig().items.slice();
    const item = { ...items[this.selectedDebugItemIndex] };
    const currentIndex = getStageOrderIndex(item.stageUnlock);
    item.stageUnlock = stageOrder[(currentIndex + 1) % stageOrder.length];
    items[this.selectedDebugItemIndex] = item;
    host.setPendingBalanceConfig(mergeBalanceConfig({ ...host.getPendingBalanceConfig(), items }));
    this.showDebugToast('道具解锁阶段已调整，点击 APPLY 生效');
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private renderDebugPointsPage() {
    const host = this.host;
    const tiers = host.getPendingBalanceConfig().timingPointTiers;
    const selected = tiers[this.selectedDebugPointTierIndex] || tiers[0];
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      const label = this.debugLanguage === 'zh' ? tier.labelZh : tier.labelEn;
      const card = host.createTextButton(`DebugPointCard_${tier.id}`, this.debugContentLayer, label, -220 + i * 140, 350, 128, 52, 16);
      styleDebugButton(card, i === this.selectedDebugPointTierIndex);
      card.on(Node.EventType.TOUCH_END, () => {
        this.selectedDebugPointTierIndex = i;
        this.renderDebugPage();
      }, this);
    }
    if (!selected) {
      return;
    }
    const label = this.debugLanguage === 'zh' ? selected.labelZh : selected.labelEn;
    host.createLabel('DebugPointSelected', this.debugContentLayer, `${label} | ${selected.id}`, DEBUG_CONTENT_CENTER_X, 272, 26, new Color(255, 244, 166, 255), 3, DEBUG_ROW_W - 20, Label.HorizontalAlign.CENTER);
    host.createLabel('DebugPointInfo', this.debugContentLayer, `score ${selected.score} | weight ${this.formatDebugNumber(selected.baseWeight)} | unlock ${selected.stageUnlock} | sprite ${selected.spriteKey}`, DEBUG_CONTENT_CENTER_X, 226, 16, new Color(184, 214, 210, 255), 1, DEBUG_ROW_W - 20, Label.HorizontalAlign.CENTER);
    this.createDebugHint(
      'DebugPointHint',
      this.debugLanguage === 'zh'
        ? '判定点品质：控制普通/好的/稀有/宝贝星星的出现权重和分数。高分星星仍然是 timing point，不会占用奖励道具池。'
        : 'Point tiers control score and weight for normal/good/rare/treasure stars. They remain timing points, not reward items.',
      0,
      170,
    );
    this.createPointTierNumberRow('score', this.debugLanguage === 'zh' ? '命中分数' : 'Hit Score', selected.score, 82, 10);
    this.createPointTierNumberRow('baseWeight', this.debugLanguage === 'zh' ? '出现权重' : 'Weight', selected.baseWeight, 18, 0.05);
    const enabled = host.createTextButton('DebugPointEnabled', this.debugContentLayer, selected.enabled ? 'ON' : 'OFF', -160, -72, 160, 56, 20);
    styleDebugButton(enabled, selected.enabled);
    enabled.on(Node.EventType.TOUCH_END, () => this.togglePendingPointTierEnabled(), this);
    const unlock = host.createTextButton('DebugPointUnlock', this.debugContentLayer, `NEXT ${selected.stageUnlock.toUpperCase()}`, 90, -72, 240, 56, 16);
    unlock.on(Node.EventType.TOUCH_END, () => this.cyclePendingPointTierUnlock(), this);
  }

  private createPointTierNumberRow(field: DebugPointTierField, label: string, value: number, y: number, step: number) {
    const host = this.host;
    host.createRectNode(`DebugPointRow_${field}`, this.debugContentLayer, DEBUG_CONTENT_CENTER_X, y, DEBUG_ROW_W, 52, new Color(255, 255, 255, 22));
    host.createLabel(`DebugPointLabel_${field}`, this.debugContentLayer, label, DEBUG_ROW_LABEL_X, y, 20, new Color(244, 248, 232, 255), 2, 240, Label.HorizontalAlign.LEFT);
    host.createLabel(`DebugPointValue_${field}`, this.debugContentLayer, this.formatDebugNumber(value), DEBUG_ROW_VALUE_X, y, 22, new Color(255, 244, 166, 255), 2, 140, Label.HorizontalAlign.CENTER);
    const minus = host.createTextButton(`DebugPointMinus_${field}`, this.debugContentLayer, '-', DEBUG_ROW_MINUS_X, y, 70, 50, 26);
    const plus = host.createTextButton(`DebugPointPlus_${field}`, this.debugContentLayer, '+', DEBUG_ROW_PLUS_X, y, 70, 50, 26);
    minus.on(Node.EventType.TOUCH_END, () => this.adjustPendingPointTierNumber(field, -step), this);
    plus.on(Node.EventType.TOUCH_END, () => this.adjustPendingPointTierNumber(field, step), this);
  }

  private adjustPendingPointTierNumber(field: DebugPointTierField, delta: number) {
    const host = this.host;
    const timingPointTiers = host.getPendingBalanceConfig().timingPointTiers.slice();
    const tier = { ...timingPointTiers[this.selectedDebugPointTierIndex] };
    tier[field] = Number((Number(tier[field]) + delta).toFixed(2)) as never;
    timingPointTiers[this.selectedDebugPointTierIndex] = tier;
    host.setPendingBalanceConfig(mergeBalanceConfig({ ...host.getPendingBalanceConfig(), timingPointTiers }));
    this.debugStatusMessage = 'PENDING POINT CHANGED';
    this.showDebugToast('判定点数值已调整，点击 APPLY 生效');
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private togglePendingPointTierEnabled() {
    const host = this.host;
    const timingPointTiers = host.getPendingBalanceConfig().timingPointTiers.slice();
    const tier = { ...timingPointTiers[this.selectedDebugPointTierIndex] };
    tier.enabled = !tier.enabled;
    timingPointTiers[this.selectedDebugPointTierIndex] = tier;
    host.setPendingBalanceConfig(mergeBalanceConfig({ ...host.getPendingBalanceConfig(), timingPointTiers }));
    this.showDebugToast('判定点开关已调整，点击 APPLY 生效');
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private cyclePendingPointTierUnlock() {
    const host = this.host;
    const timingPointTiers = host.getPendingBalanceConfig().timingPointTiers.slice();
    const tier = { ...timingPointTiers[this.selectedDebugPointTierIndex] };
    const currentIndex = getStageOrderIndex(tier.stageUnlock);
    tier.stageUnlock = stageOrder[(currentIndex + 1) % stageOrder.length];
    timingPointTiers[this.selectedDebugPointTierIndex] = tier;
    host.setPendingBalanceConfig(mergeBalanceConfig({ ...host.getPendingBalanceConfig(), timingPointTiers }));
    this.showDebugToast('判定点解锁阶段已调整，点击 APPLY 生效');
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private renderDebugComboPage() {
    const rows: Array<{ field: DebugComboField; zh: string; en: string; step: number }> = [
      { field: 'perfectBaseScore', zh: 'Perfect基础分', en: 'Perfect Base', step: 10 },
      { field: 'perfectMultiplierCap', zh: '分数倍数上限', en: 'Score Cap', step: 1 },
      { field: 'goodScore', zh: 'Good分数', en: 'Good Score', step: 10 },
      { field: 'goodStabilityPenalty', zh: 'Good扣稳定', en: 'Good Penalty', step: 1 },
    ];
    this.createDebugHint(
      'DebugComboHint',
      this.debugLanguage === 'zh'
        ? '连击只影响分数：Perfect 连续命中时，获得分数 = 判定点分数 x 当前连击倍数，上限由分数倍数上限控制。'
        : 'Combo only affects score: perfect chains score point value x current combo, capped by Score Cap.',
      0,
      354,
    );
    for (let i = 0; i < rows.length; i++) {
      this.createComboNumberRow(rows[i], 292 - i * 53);
    }
  }

  private createComboNumberRow(row: { field: DebugComboField; zh: string; en: string; step: number }, y: number) {
    const host = this.host;
    const value = Number(host.getPendingBalanceConfig().combo[row.field]);
    host.createRectNode(`DebugComboRow_${row.field}`, this.debugContentLayer, DEBUG_CONTENT_CENTER_X, y, DEBUG_ROW_W, 46, new Color(255, 255, 255, 22));
    host.createLabel(`DebugComboLabel_${row.field}`, this.debugContentLayer, this.debugLanguage === 'zh' ? row.zh : row.en, DEBUG_ROW_LABEL_X, y, 17, new Color(244, 248, 232, 255), 2, 240, Label.HorizontalAlign.LEFT);
    host.createLabel(`DebugComboValue_${row.field}`, this.debugContentLayer, this.formatDebugNumber(value), DEBUG_ROW_VALUE_X, y, 20, new Color(255, 244, 166, 255), 2, 140, Label.HorizontalAlign.CENTER);
    const minus = host.createTextButton(`DebugComboMinus_${row.field}`, this.debugContentLayer, '-', DEBUG_ROW_MINUS_X, y, 66, 42, 22);
    const plus = host.createTextButton(`DebugComboPlus_${row.field}`, this.debugContentLayer, '+', DEBUG_ROW_PLUS_X, y, 66, 42, 22);
    minus.on(Node.EventType.TOUCH_END, () => this.adjustPendingComboNumber(row.field, -row.step), this);
    plus.on(Node.EventType.TOUCH_END, () => this.adjustPendingComboNumber(row.field, row.step), this);
  }

  private adjustPendingComboNumber(field: DebugComboField, delta: number) {
    const host = this.host;
    const combo = { ...host.getPendingBalanceConfig().combo, [field]: Number((Number(host.getPendingBalanceConfig().combo[field]) + delta).toFixed(2)) };
    host.setPendingBalanceConfig(mergeBalanceConfig({ ...host.getPendingBalanceConfig(), combo }));
    this.debugStatusMessage = 'PENDING COMBO CHANGED';
    this.showDebugToast('连击奖励已调整，点击 APPLY 生效');
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private renderDebugBossPage() {
    const host = this.host;
    this.debugBossButtons = {};
    this.createDebugHint(
      'DebugBossHint',
      this.debugLanguage === 'zh'
        ? 'Boss页控制终局战数值与模型。下方选 Boss 可切换图集（内测）。BOSS TEST 直接进 Boss 战。'
        : 'Boss page tunes finale stats and model. Pick a boss below to swap atlases (dev). BOSS TEST enters boss fight.',
      DEBUG_CONTENT_CENTER_X,
      355,
    );

    // Boss 选择区：标题与按钮分层，互不重叠
    const pickerY = 265;
    const pickerH = 100;
    const bossBtnW = 120;
    const bossBtnH = 46;
    const bossGap = 14;
    host.createRectNode(
      'DebugBossPickerBack',
      this.debugContentLayer,
      DEBUG_CONTENT_CENTER_X,
      pickerY,
      DEBUG_ROW_W,
      pickerH,
      new Color(255, 255, 255, 22),
    );
    this.debugBossCaptionLabel = host.createLabel(
      'DebugBossCaption',
      this.debugContentLayer,
      this.getDebugBossCaptionText(),
      DEBUG_CONTENT_CENTER_X,
      pickerY + 28,
      18,
      new Color(214, 242, 226, 255),
      1,
      DEBUG_ROW_W - 40,
      Label.HorizontalAlign.CENTER,
    );
    const bossCount = playableBossIds.length;
    const bossRowW = bossCount * bossBtnW + (bossCount - 1) * bossGap;
    const bossRowLeft = DEBUG_CONTENT_CENTER_X - bossRowW / 2;
    playableBossIds.forEach((bossId, index) => {
      const button = host.createTextButton(
        `DebugBoss_${bossId}`,
        this.debugContentLayer,
        this.getDebugBossButtonLabel(bossId),
        bossRowLeft + bossBtnW / 2 + index * (bossBtnW + bossGap),
        pickerY - 22,
        bossBtnW,
        bossBtnH,
        15,
      );
      this.debugBossButtons[bossId] = button;
      button.on(Node.EventType.TOUCH_END, () => {
        void this.selectDebugBoss(bossId);
      }, this);
    });
    this.updateDebugBossHighlights();

    // 操作行：开关 / 测试，独立于选择区与数值行
    const actionY = 175;
    const enabled = host.createTextButton(
      'DebugBossEnabled',
      this.debugContentLayer,
      `${this.debugLanguage === 'zh' ? 'Boss开关' : 'Boss'}: ${host.getPendingBalanceConfig().boss.enabled ? 'ON' : 'OFF'}`,
      DEBUG_CONTENT_CENTER_X - 130,
      actionY,
      220,
      50,
      17,
    );
    styleDebugButton(enabled, host.getPendingBalanceConfig().boss.enabled);
    enabled.on(Node.EventType.TOUCH_END, () => this.togglePendingBossBoolean('enabled'), this);
    const testButton = host.createTextButton(
      'DebugBossTest',
      this.debugContentLayer,
      'BOSS TEST',
      DEBUG_CONTENT_CENTER_X + 130,
      actionY,
      220,
      50,
      18,
    );
    styleDebugButton(testButton, true);
    testButton.on(Node.EventType.TOUCH_END, () => host.startDebugBossTest(), this);

    const rows: Array<{ field: DebugBossField; zh: string; en: string; step: number }> = [
      { field: 'triggerScore', zh: '触发分数', en: 'Trigger Score', step: 2500 },
      { field: 'maxHp', zh: 'Boss血量', en: 'Boss HP', step: 200 },
      { field: 'normalAttackDamage', zh: '普通点伤害', en: 'Normal Damage', step: 10 },
      { field: 'goodAttackDamage', zh: '好的点伤害', en: 'Good Damage', step: 10 },
      { field: 'rareAttackDamage', zh: '稀有点伤害', en: 'Rare Damage', step: 15 },
      { field: 'treasureAttackDamage', zh: '宝贝点伤害', en: 'Treasure Damage', step: 20 },
      { field: 'bossAttackInterval', zh: 'Boss攻击间隔', en: 'Boss Attack Gap', step: 0.2 },
      { field: 'minionSpawnInterval', zh: '小怪出现间隔', en: 'Minion Gap', step: 0.5 },
      { field: 'bulletStabilityDamage', zh: '子弹扣稳定', en: 'Bullet Stability', step: 1 },
      { field: 'comboSkillDurationMax', zh: '连击点击次数', en: 'Combo Taps', step: 1 },
      { field: 'frozenSkillDurationMax', zh: '冰冻技能最长', en: 'Frozen Skill Max', step: 0.5 },
    ];
    const rowStartY = 110;
    const rowStep = 46;
    for (let i = 0; i < rows.length; i++) {
      this.createBossNumberRow(rows[i], rowStartY - i * rowStep);
    }
  }

  private getDebugBossCaptionText() {
    const bossLabel = this.host.getBossLabel(this.host.getActiveBossId());
    return this.debugLanguage === 'zh' ? `Boss模型 ${bossLabel}` : `BOSS ${bossLabel}`;
  }

  private getDebugBossButtonLabel(bossId: BossId) {
    const shortLabel = this.host.getBossLabel(bossId).replace(/\s+/g, '').slice(0, 4);
    return bossId === this.host.getActiveBossId() ? `* ${shortLabel}` : shortLabel;
  }

  private async selectDebugBoss(bossId: BossId) {
    if (bossId === this.host.getActiveBossId()) {
      return;
    }
    await this.host.switchDebugBoss(bossId);
    this.debugStatusMessage = this.debugLanguage === 'zh'
      ? `已切换 Boss ${this.host.getBossLabel(bossId)}`
      : `BOSS ${bossId.toUpperCase()}`;
    this.updateDebugBossHighlights();
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private updateDebugBossHighlights() {
    if (this.debugBossCaptionLabel) {
      this.debugBossCaptionLabel.string = this.getDebugBossCaptionText();
    }
    for (const bossId of playableBossIds) {
      const button = this.debugBossButtons[bossId];
      if (!button) {
        continue;
      }
      const label = button.getChildByName(`${button.name}Text`)?.getComponent(Label);
      if (label) {
        label.string = this.getDebugBossButtonLabel(bossId);
      }
      styleDebugButton(button, bossId === this.host.getActiveBossId());
    }
  }

  private createBossNumberRow(row: { field: DebugBossField; zh: string; en: string; step: number }, y: number) {
    const host = this.host;
    const value = Number(host.getPendingBalanceConfig().boss[row.field]);
    host.createRectNode(`DebugBossRow_${row.field}`, this.debugContentLayer, DEBUG_CONTENT_CENTER_X, y, DEBUG_ROW_W, 42, new Color(255, 255, 255, 22));
    host.createLabel(`DebugBossLabel_${row.field}`, this.debugContentLayer, this.debugLanguage === 'zh' ? row.zh : row.en, DEBUG_ROW_LABEL_X, y, 17, new Color(244, 248, 232, 255), 2, 240, Label.HorizontalAlign.LEFT);
    host.createLabel(`DebugBossValue_${row.field}`, this.debugContentLayer, this.formatDebugNumber(value), DEBUG_ROW_VALUE_X, y, 20, new Color(255, 244, 166, 255), 2, 140, Label.HorizontalAlign.CENTER);
    const minus = host.createTextButton(`DebugBossMinus_${row.field}`, this.debugContentLayer, '-', DEBUG_ROW_MINUS_X, y, 66, 40, 22);
    const plus = host.createTextButton(`DebugBossPlus_${row.field}`, this.debugContentLayer, '+', DEBUG_ROW_PLUS_X, y, 66, 40, 22);
    minus.on(Node.EventType.TOUCH_END, () => this.adjustPendingBossNumber(row.field, -row.step), this);
    plus.on(Node.EventType.TOUCH_END, () => this.adjustPendingBossNumber(row.field, row.step), this);
  }

  private adjustPendingBossNumber(field: DebugBossField, delta: number) {
    const host = this.host;
    if (typeof host.getPendingBalanceConfig().boss[field] === 'boolean') {
      return;
    }
    const boss = { ...host.getPendingBalanceConfig().boss, [field]: Number((Number(host.getPendingBalanceConfig().boss[field]) + delta).toFixed(2)) };
    host.setPendingBalanceConfig(mergeBalanceConfig({ ...host.getPendingBalanceConfig(), boss }));
    this.debugStatusMessage = 'PENDING BOSS CHANGED';
    this.showDebugToast('Boss数值已调整，点击 APPLY 生效');
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private togglePendingBossBoolean(field: DebugBossField) {
    const host = this.host;
    const current = host.getPendingBalanceConfig().boss[field];
    if (typeof current !== 'boolean') {
      return;
    }
    host.setPendingBalanceConfig(mergeBalanceConfig({ ...host.getPendingBalanceConfig(), boss: { ...host.getPendingBalanceConfig().boss, [field]: !current } }));
    this.debugStatusMessage = 'PENDING BOSS CHANGED';
    this.showDebugToast('Boss开关已调整，点击 APPLY 生效');
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private renderDebugMonitorPage() {
    const host = this.host;
    const state = host.getActiveStageState();
    const plan = host.getCurrentTargetPlan();
    const balanceConfig = host.getBalanceConfig();
    const lines = [
      `${this.debugLanguage === 'zh' ? '动态难度' : 'DYNAMIC'} ${balanceConfig.dynamic.enabled ? 'ON' : 'OFF'} | ${this.debugLanguage === 'zh' ? '失误多会辅助，表现稳定会加压' : 'mistakes add assist; strong play adds pressure'}`,
      `STAGE ${this.debugLanguage === 'zh' ? state.stage.labelZh : state.stage.labelEn}`,
      `TIME ${host.getRunElapsedSeconds().toFixed(1)}s | STAGE TIME ${state.elapsedInStage.toFixed(1)}s`,
      `ROUND ${host.getRoundCount()} | HEIGHT ${host.getBottleCount()} | SCORE ${host.getScore()}`,
      `STABILITY ${host.getStability().toFixed(0)} | TRACK ${host.getTimingTrackShape().toUpperCase()} | BAR ${balanceConfig.timingBarAnchorMode.toUpperCase()}`,
      `COMBO ${host.getCombo()} | COMBO SCORE ONLY`,
      `TARGETS ${plan ? plan.kinds.join(', ') : 'none'}`,
      `BIAS ${state.actualRewardPenaltyBias.toFixed(0)} | HANDLE ${state.actualHandleSpeed.toFixed(2)} | VAR ${state.actualHandleVariance.toFixed(2)}`,
      `RECENT P${state.stats.perfect} G${state.stats.good} M${state.stats.miss} B${state.stats.bomb} | MISS ${(state.stats.missRate * 100).toFixed(0)}%`,
      `DYNAMIC ${this.debugLanguage === 'zh' ? state.dynamic.reasonZh : state.dynamic.reasonEn} | A ${state.dynamic.assist.toFixed(0)} / P ${state.dynamic.pressure.toFixed(0)}`,
    ];
    const label = host.createLabel('DebugMonitorText', this.debugContentLayer, lines.join('\n'), DEBUG_CONTENT_CENTER_X, 96, 22, new Color(229, 248, 255, 255), 2, DEBUG_ROW_W, Label.HorizontalAlign.LEFT);
    label.lineHeight = 38;
  }

  private renderDebugPresetsPage() {
    const host = this.host;
    this.debugPendingBestScore = Math.max(0, Math.round(host.getBestScore()));
    // 主列避开右侧关卡栏；BEST 与下方按钮间距保证 ≥ 按钮半高叠加
    this.createDebugBestScoreRow(20);
    const presets: Array<{ name: string; label: string; y: number; handler: () => void }> = [
      { name: 'Gentle', label: this.debugLanguage === 'zh' ? '温和预设' : 'GENTLE', y: 320, handler: () => this.setDebugPreset('gentle') },
      { name: 'Recommended', label: this.debugLanguage === 'zh' ? '推荐预设' : 'RECOMMENDED', y: 230, handler: () => this.setDebugPreset('recommended') },
      { name: 'Hard', label: this.debugLanguage === 'zh' ? '困难预设' : 'HARD', y: 140, handler: () => this.setDebugPreset('hard') },
      { name: 'ResetBest', label: this.debugLanguage === 'zh' ? '清空最高分/头衔' : 'RESET BEST', y: -100, handler: () => this.onResetBestScore() },
      { name: 'ClearNickname', label: this.debugLanguage === 'zh' ? '清除昵称' : 'CLEAR NICKNAME', y: -190, handler: () => this.onClearPlayerName() },
      { name: 'GameOver', label: this.debugLanguage === 'zh' ? '触发游戏结束' : 'TRIGGER GAME OVER', y: -280, handler: () => this.onTriggerDebugGameOver() },
      { name: 'Export', label: this.debugLanguage === 'zh' ? '导出配置' : 'EXPORT CONFIG', y: -370, handler: () => this.onExportDebugConfig() },
      { name: 'ClearLocal', label: this.debugLanguage === 'zh' ? '清除本机配置' : 'CLEAR LOCAL CONFIG', y: -460, handler: () => this.clearLocalDebugConfig() },
    ];
    for (const preset of presets) {
      const button = host.createTextButton(
        `DebugPreset_${preset.name}`,
        this.debugContentLayer,
        preset.label,
        DEBUG_CONTENT_CENTER_X,
        preset.y,
        DEBUG_MAIN_BUTTON_W,
        76,
        24,
      );
      button.on(Node.EventType.TOUCH_END, preset.handler, this);
    }
  }

  /** BEST 调节：两行，整卡落在主内容右边界内。 */
  private createDebugBestScoreRow(y: number) {
    const host = this.host;
    const step = 10000;
    const titleY = y + 26;
    const controlsY = y - 24;
    host.createRectNode(
      'DebugBestScoreRow',
      this.debugContentLayer,
      DEBUG_CONTENT_CENTER_X,
      y,
      DEBUG_ROW_W,
      100,
      new Color(255, 255, 255, 24),
    );
    host.createLabel(
      'DebugBestScoreLabel',
      this.debugContentLayer,
      this.debugLanguage === 'zh'
        ? `设置 BEST（${this.host.getLevelLabel(this.host.getDebugLevelId())}）`
        : `Set Best (${this.host.getDebugLevelId().toUpperCase()})`,
      DEBUG_CONTENT_CENTER_X,
      titleY,
      20,
      new Color(244, 248, 232, 255),
      2,
      DEBUG_ROW_W - 24,
      Label.HorizontalAlign.CENTER,
    );
    const minus = host.createTextButton(
      'DebugBestScoreMinus',
      this.debugContentLayer,
      '-',
      DEBUG_CONTENT_CENTER_X - 200,
      controlsY,
      80,
      50,
      28,
    );
    this.debugBestScoreValueLabel = host.createLabel(
      'DebugBestScoreValue',
      this.debugContentLayer,
      String(this.debugPendingBestScore),
      DEBUG_CONTENT_CENTER_X - 50,
      controlsY,
      26,
      new Color(255, 244, 166, 255),
      3,
      160,
      Label.HorizontalAlign.CENTER,
    );
    const plus = host.createTextButton(
      'DebugBestScorePlus',
      this.debugContentLayer,
      '+',
      DEBUG_CONTENT_CENTER_X + 100,
      controlsY,
      80,
      50,
      28,
    );
    const apply = host.createTextButton(
      'DebugBestScoreApply',
      this.debugContentLayer,
      this.debugLanguage === 'zh' ? '应用' : 'APPLY',
      DEBUG_CONTENT_CENTER_X + 220,
      controlsY,
      130,
      50,
      22,
    );
    minus.on(Node.EventType.TOUCH_END, () => this.adjustDebugPendingBestScore(-step), this);
    plus.on(Node.EventType.TOUCH_END, () => this.adjustDebugPendingBestScore(step), this);
    apply.on(Node.EventType.TOUCH_END, () => this.onSetBestScore(this.debugPendingBestScore), this);
  }

  private adjustDebugPendingBestScore(delta: number) {
    this.debugPendingBestScore = Math.max(0, Math.round(this.debugPendingBestScore + delta));
    if (this.debugBestScoreValueLabel) {
      this.debugBestScoreValueLabel.string = String(this.debugPendingBestScore);
    }
  }

  private setDebugPreset(kind: 'gentle' | 'recommended' | 'hard') {
    const host = this.host;
    if (kind === 'recommended') {
      host.setPendingBalanceConfig(mergeBalanceConfig(host.getPackagedBalanceConfig()));
    } else {
      const base = mergeBalanceConfig(host.getPackagedBalanceConfig());
      const stages = base.stages.map((stage, index) => {
        const nextStage = { ...stage };
        if (kind === 'gentle') {
          nextStage.handleSpeed = Number(Math.max(1.5, stage.handleSpeed * 0.82).toFixed(2));
          nextStage.handleVariance = Number(Math.max(0, stage.handleVariance * 0.62).toFixed(2));
          nextStage.rewardPenaltyBias = Math.max(-100, stage.rewardPenaltyBias - 28);
          nextStage.missStabilityPenalty = Math.max(4, stage.missStabilityPenalty - 3);
          nextStage.bombStabilityPenalty = Math.max(0, stage.bombStabilityPenalty - 6);
        } else {
          nextStage.handleSpeed = Number(Math.min(12, stage.handleSpeed * 1.14 + index * 0.05).toFixed(2));
          nextStage.handleVariance = Number(Math.min(1, stage.handleVariance * 1.3 + 0.04).toFixed(2));
          nextStage.rewardPenaltyBias = Math.min(100, stage.rewardPenaltyBias + 24);
          nextStage.missStabilityPenalty = Math.min(60, stage.missStabilityPenalty + 3);
          nextStage.bombStabilityPenalty = Math.min(100, stage.bombStabilityPenalty + 6);
        }
        return nextStage;
      });
      host.setPendingBalanceConfig(mergeBalanceConfig({ ...base, stages }));
    }
    this.debugStatusMessage = `PENDING PRESET ${kind.toUpperCase()}`;
    this.showDebugToast('预设已载入，点击 APPLY 生效');
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private onResetBestScore() {
    this.host.resetBestScore();
    this.debugStatusMessage = 'BEST SCORE/TITLE RESET';
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private onClearPlayerName() {
    this.host.clearPlayerNameForTest();
    this.debugStatusMessage = 'PLAYER NAME CLEARED';
    this.showDebugToast(this.debugLanguage === 'zh' ? '昵称已清除，请重新输入' : 'Nickname cleared');
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private onSetBestScore(score: number) {
    this.host.setBestScore(score);
    this.debugPendingBestScore = Math.max(0, Math.round(score));
    const levelLabel = this.host.getLevelLabel(this.host.getDebugLevelId());
    this.debugStatusMessage = `BEST SCORE SET ${Math.round(score)} (${this.host.getDebugLevelId()})`;
    this.showDebugToast(this.debugLanguage === 'zh'
      ? `${levelLabel} 最高分已设为 ${Math.round(score)}`
      : `${levelLabel} BEST set to ${Math.round(score)}`);
    this.renderDebugPage();
    this.updateDebugStatus();
  }

  private onTriggerDebugGameOver() {
    const state = this.host.getGameState();
    if (state !== 'paused' && state !== 'playing') {
      this.debugStatusMessage = 'GAME OVER SKIPPED';
      this.updateDebugStatus();
      return;
    }
    this.host.triggerDebugGameOver();
  }

  private onExportDebugConfig() {
    this.host.exportDebugConfigToConsole();
    this.debugStatusMessage = 'EXPORTED IN CONSOLE';
    this.showDebugToast('已导出到控制台');
    this.updateDebugStatus();
  }

  private showDebugToast(message: string) {
    if (!this.debugToastLabel) {
      return;
    }
    this.debugToastLabel.string = message;
    this.debugToastLabel.node.active = true;
    this.debugToastLabel.node.setScale(0.88, 0.88, 1);
    tween(this.debugToastLabel.node).stop();
    tween(this.debugToastLabel.node)
      .to(0.08, { scale: new Vec3(1.08, 1.08, 1) })
      .to(0.12, { scale: new Vec3(1, 1, 1) })
      .delay(1.05)
      .to(0.18, { scale: new Vec3(0.92, 0.92, 1) })
      .call(() => {
        if (this.debugToastLabel) {
          this.debugToastLabel.node.active = false;
        }
      })
      .start();
  }

  private updateDebugStatus() {
    if (!this.debugStatusLabel) {
      return;
    }
    const host = this.host;
    const state = host.getActiveStageState();
    const localStatus = host.isLocalDebugConfigActive() ? ' | LOCAL CONFIG ON' : '';
    const editLevel = host.getDebugLevelId();
    const runLevel = host.getCurrentRunLevelId();
    const levelStatus = editLevel !== runLevel
      ? ` | ${this.debugLanguage === 'zh' ? '本局' : 'RUN'} ${runLevel.toUpperCase()}`
      : '';
    const metricLine = `ROUND ${host.getRoundCount()} | TRACK ${host.getTimingTrackShape().toUpperCase()} | ${state.stage.labelZh} | TIME ${host.getRunElapsedSeconds().toFixed(1)}s | STAB ${host.getStability().toFixed(0)} | BIAS ${state.actualRewardPenaltyBias.toFixed(0)}${levelStatus}${localStatus}`;
    const levelEditLine = `${this.debugLanguage === 'zh' ? '编辑' : 'EDIT'} ${host.getLevelLabel(editLevel)} (${editLevel})`;
    const baseLine = `${levelEditLine} | ${metricLine}`;
    this.debugStatusLabel.string = this.debugStatusMessage ? `${baseLine}\n${this.debugStatusMessage}` : baseLine;
  }

  private formatDebugNumber(value: number) {
    if (Math.abs(value) < 1 && value !== 0) {
      return value.toFixed(2);
    }
    if (Number.isInteger(value)) {
      return value.toFixed(0);
    }
    return value.toFixed(2);
  }

  private createDebugHint(name: string, text: string, x: number, y: number, width = DEBUG_ROW_W): Label {
    const label = this.host.createLabel(name, this.debugContentLayer, text, x, y, 16, new Color(214, 242, 226, 255), 1, width, Label.HorizontalAlign.CENTER);
    label.lineHeight = 23;
    label.node.getComponent(UITransform)?.setContentSize(width, 48);
    return label;
  }
}
