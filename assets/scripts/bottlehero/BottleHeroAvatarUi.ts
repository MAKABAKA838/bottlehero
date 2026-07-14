import { BlockInputEvents, Button, Color, Graphics, Label, Node, Sprite, SpriteFrame, UITransform } from 'cc';
import { getAvatarConfig } from './BottleHeroConfigLoader';
import {
  getAvatarDefinition,
  getAvatarGoodsDefinition,
  getAvatarHomeFocusScale,
  getAvatarHomeFocusY,
  getAvatarHomeNormalY,
} from './BottleHeroAvatarRuntime';
import { isPlayerAvatarGoodsUnlocked } from './BottleHeroAvatarGoodsUnlock';
import { BottleHeroSpriteProvider } from './BottleHeroAssetProvider';
import { AvatarGoodsAttachSocket, AvatarGoodsDefinitionConfig, AvatarGoodsId, AvatarId, LevelId } from './BottleHeroGameConfig';
import { getRankingBoardLabel, RANKING_BOARD_IDS, type LocalRankingRow } from './BottleHeroLocalRanking';
import type { RankingBoardId } from './BottleHeroLevelBestScores';
import { fetchLeaderboardBoard } from './BottleHeroLeaderboardClient';
import { bottleHeroStorageKeys, readStoredAvatarState, writeStoredString } from './BottleHeroStorage';

export interface AvatarUiRefs {
  avatarSelectLayer: Node;
  avatarHomeLayer: Node;
  avatarPanelLayer: Node;
}

export interface AvatarUiHost {
  getSpriteProvider(): BottleHeroSpriteProvider;
  getDesignWidth(): number;
  getDesignHeight(): number;
  getTotalBestScore(): number;
  getRankingPlayerScore(boardId: RankingBoardId): number;
  getPlayerId(): string;
  getPlayerName(): string;
  requestOpenRankingPanel(): boolean;
  createSpriteNode(
    name: string,
    parent: Node,
    frame: SpriteFrame,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Node;
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
  createRectNode(name: string, parent: Node, x: number, y: number, width: number, height: number, color: Color): Node;
  clearNodeChildren(node: Node): void;
  addPressScale(node: Node): void;
  isLevelUnlocked(levelId: LevelId): boolean;
  startRun(levelId?: LevelId): void;
  openFeedbackSurvey(): void;
  showAvatarHome(): void;
}

export type AvatarPanelKind = 'goods' | 'level' | 'ranking' | 'feedback';

/** 排行 Tab 与列表整体下移 100（Cocos Y 轴减小）。 */
const RANKING_PANEL_CONTENT_SHIFT_Y = -100;

export class BottleHeroAvatarUiController {
  selectedAvatarId: AvatarId = 'cat02';
  avatarSelectionPreviewId: AvatarId = 'cat02';
  selectedAvatarGoodsId: AvatarGoodsId = 'none';
  equippedAvatarGoodsBySocket: Partial<Record<AvatarGoodsAttachSocket, AvatarGoodsId>> = {};
  avatarSelectionSaved = false;
  avatarGoodsFocusActive = false;

  private host!: AvatarUiHost;
  private refs!: AvatarUiRefs;
  private avatarSelectPreviewNode!: Node;
  private avatarHomePreviewNode!: Node;
  private avatarHomeGoodsNodes: Partial<Record<AvatarGoodsAttachSocket, Node>> = {};
  private avatarHomeScoreLabel!: Label;
  private rankingBoardId: RankingBoardId = 'total';

  init(host: AvatarUiHost) {
    this.host = host;
  }

  attachUi(refs: AvatarUiRefs) {
    this.refs = refs;
  }

  private sp(key: string): SpriteFrame {
    return this.host.getSpriteProvider().getSprite(key);
  }

  loadStoredState() {
    const stored = readStoredAvatarState(this.selectedAvatarId);
    this.selectedAvatarId = stored.selectedAvatarId;
    this.avatarSelectionPreviewId = stored.avatarSelectionPreviewId;
    this.avatarSelectionSaved = stored.avatarSelectionSaved;
    this.selectedAvatarGoodsId = isPlayerAvatarGoodsUnlocked(stored.selectedAvatarGoodsId)
      ? stored.selectedAvatarGoodsId
      : 'none';
    this.equippedAvatarGoodsBySocket = {};
    for (const [socket, goodsId] of Object.entries(stored.equippedAvatarGoodsBySocket)) {
      if (goodsId && isPlayerAvatarGoodsUnlocked(goodsId)) {
        this.equippedAvatarGoodsBySocket[socket as AvatarGoodsAttachSocket] = goodsId;
      }
    }
  }

  buildSelectionLayer() {
    const { avatarSelectLayer } = this.refs;
    const host = this.host;

    avatarSelectLayer.active = false;
    host.createSpriteNode(
      'AvatarSelectBackground',
      avatarSelectLayer,
      this.sp('avatarRoomBackground'),
      0,
      0,
      host.getDesignWidth(),
      host.getDesignHeight(),
    );
    host.createRectNode(
      'AvatarSelectWash',
      avatarSelectLayer,
      0,
      0,
      host.getDesignWidth(),
      host.getDesignHeight(),
      new Color(255, 255, 255, 40),
    );
    host.createLabel(
      'AvatarSelectTitle',
      avatarSelectLayer,
      'CHOOSE AVATAR',
      0,
      560,
      46,
      new Color(255, 246, 156, 255),
      5,
      720,
      Label.HorizontalAlign.CENTER,
    );
    this.avatarSelectPreviewNode = host.createSpriteNode(
      'AvatarSelectPreview',
      avatarSelectLayer,
      this.sp('avatarCat02'),
      0,
      118,
      670,
      670,
    );

    const iconStartX = -300;
    const avatars = getAvatarConfig().avatars;
    for (let i = 0; i < avatars.length; i++) {
      const avatar = avatars[i];
      const iconButton = host.createSpriteNode(
        `AvatarSelectIcon_${avatar.id}`,
        avatarSelectLayer,
        this.sp(avatar.iconKey),
        iconStartX + i * 200,
        -404,
        132,
        132,
      );
      iconButton.addComponent(Button);
      host.addPressScale(iconButton);
      iconButton.on(Node.EventType.TOUCH_END, () => this.previewSelection(avatar.id), this);
    }

    const continueButton = host.createSpriteNode(
      'AvatarSelectContinue',
      avatarSelectLayer,
      this.sp('continueButton'),
      0,
      -626,
      390,
      170,
    );
    continueButton.addComponent(Button);
    host.addPressScale(continueButton);
    continueButton.on(Node.EventType.TOUCH_END, this.confirmSelection, this);
    this.updateSelectionVisuals();
  }

  buildHomeLayer() {
    const { avatarHomeLayer } = this.refs;
    const host = this.host;

    avatarHomeLayer.active = false;
    host.createSpriteNode(
      'AvatarHomeBackground',
      avatarHomeLayer,
      this.sp('avatarRoomBackground'),
      0,
      0,
      host.getDesignWidth(),
      host.getDesignHeight(),
    );
    const scorePanel = host.createSpriteNode('AvatarHomeScorePanel', avatarHomeLayer, this.sp('scorePanel'), 0, 628, 430, 120);
    this.avatarHomeScoreLabel = host.createLabel(
      'AvatarHomeScoreLabel',
      scorePanel,
      'BEST 0',
      46,
      0,
      30,
      new Color(255, 255, 255, 255),
      4,
      300,
      Label.HorizontalAlign.CENTER,
    );
    this.avatarHomePreviewNode = host.createSpriteNode(
      'AvatarHomePreview',
      avatarHomeLayer,
      this.sp('avatarCat02'),
      0,
      getAvatarHomeNormalY(),
      720,
      720,
    );
    this.avatarHomeGoodsNodes.body = host.createSpriteNode('AvatarHomeGoodsBody', avatarHomeLayer, new SpriteFrame(), 0, 236, 220, 176);
    this.avatarHomeGoodsNodes.feet = host.createSpriteNode('AvatarHomeGoodsFeet', avatarHomeLayer, new SpriteFrame(), 0, 236, 220, 176);
    this.avatarHomeGoodsNodes.head = host.createSpriteNode('AvatarHomeGoodsHead', avatarHomeLayer, new SpriteFrame(), 0, 236, 220, 176);
    this.avatarHomeGoodsNodes.hand = host.createSpriteNode('AvatarHomeGoodsHand', avatarHomeLayer, new SpriteFrame(), 0, 236, 220, 176);
    for (const node of Object.values(this.avatarHomeGoodsNodes)) {
      if (node) node.active = false;
    }
    this.createCycleButton('AvatarPreviousButton', -314, -70, -1);
    this.createCycleButton('AvatarNextButton', 314, -70, 1);

    const rankingButton = host.createSpriteNode(
      'AvatarRankingButton',
      avatarHomeLayer,
      this.sp('rankingButton'),
      336,
      522,
      118,
      118,
    );
    rankingButton.addComponent(Button);
    host.addPressScale(rankingButton);
    rankingButton.on(Node.EventType.TOUCH_END, () => {
      if (!host.requestOpenRankingPanel()) {
        return;
      }
      this.openPanel('ranking');
    }, this);

    const levelButton = host.createSpriteNode('AvatarLevelButton', avatarHomeLayer, this.sp('levelButton'), 336, 354, 118, 118);
    levelButton.addComponent(Button);
    host.addPressScale(levelButton);
    levelButton.on(Node.EventType.TOUCH_END, () => this.openPanel('level'), this);

    const goodsButton = host.createSpriteNode('AvatarGoodsButton', avatarHomeLayer, this.sp('goodsButton'), 336, 186, 118, 118);
    goodsButton.addComponent(Button);
    host.addPressScale(goodsButton);
    goodsButton.on(Node.EventType.TOUCH_END, () => this.openPanel('goods'), this);

    const playButton = host.createSpriteNode('AvatarPlayGameButton', avatarHomeLayer, this.sp('playGameButton'), 0, -480, 390, 170);
    playButton.addComponent(Button);
    host.addPressScale(playButton);
    playButton.on(Node.EventType.TOUCH_END, () => host.startRun('level_01'), this);

    const feedbackButton = host.createSpriteNode(
      'AvatarFeedbackButton',
      avatarHomeLayer,
      this.sp('feedbackButton'),
      0,
      -662,
      272,
      118,
    );
    feedbackButton.addComponent(Button);
    host.addPressScale(feedbackButton);
    feedbackButton.on(Node.EventType.TOUCH_END, () => host.openFeedbackSurvey(), this);
    this.updateHomeVisuals();
  }

  previewSelection(avatarId: AvatarId) {
    this.avatarSelectionPreviewId = avatarId;
    this.updateSelectionVisuals();
  }

  cycleHome(direction: -1 | 1) {
    const avatars = getAvatarConfig().avatars;
    const currentIndex = Math.max(0, avatars.findIndex((avatar) => avatar.id === this.selectedAvatarId));
    const nextIndex = (currentIndex + direction + avatars.length) % avatars.length;
    this.selectedAvatarId = avatars[nextIndex].id;
    this.avatarSelectionPreviewId = this.selectedAvatarId;
    this.avatarSelectionSaved = true;
    writeStoredString(bottleHeroStorageKeys.avatarSelected, '1');
    writeStoredString(bottleHeroStorageKeys.avatarId, this.selectedAvatarId);
    this.updateHomeVisuals();
  }

  confirmSelection() {
    this.selectedAvatarId = this.avatarSelectionPreviewId;
    this.avatarSelectionSaved = true;
    writeStoredString(bottleHeroStorageKeys.avatarSelected, '1');
    writeStoredString(bottleHeroStorageKeys.avatarId, this.selectedAvatarId);
    this.host.showAvatarHome();
  }

  syncSelectionPreviewFromSelected() {
    this.avatarSelectionPreviewId = this.selectedAvatarId;
  }

  resetGoodsFocus() {
    this.avatarGoodsFocusActive = false;
  }

  updateSelectionVisuals() {
    const avatar = getAvatarDefinition(this.avatarSelectionPreviewId);
    const sprite = this.avatarSelectPreviewNode?.getComponent(Sprite);
    if (sprite) {
      sprite.spriteFrame = this.sp(avatar.spriteKey);
    }
    this.avatarSelectPreviewNode?.getComponent(UITransform)?.setContentSize(avatar.homeWidth, avatar.homeHeight);
    for (const item of getAvatarConfig().avatars) {
      const icon = this.refs.avatarSelectLayer.getChildByName(`AvatarSelectIcon_${item.id}`);
      if (!icon) {
        continue;
      }
      const selected = item.id === this.avatarSelectionPreviewId;
      icon.setScale(selected ? 1.22 : 0.92, selected ? 1.22 : 0.92, 1);
    }
  }

  updateHomeVisuals() {
    if (!this.avatarHomePreviewNode) {
      return;
    }
    const avatar = getAvatarDefinition(this.selectedAvatarId);
    const sprite = this.avatarHomePreviewNode.getComponent(Sprite);
    if (sprite) {
      sprite.spriteFrame = this.sp(avatar.spriteKey);
    }
    const focusScale = this.avatarGoodsFocusActive ? getAvatarHomeFocusScale() : 1;
    this.avatarHomePreviewNode.setPosition(
      0,
      this.avatarGoodsFocusActive ? getAvatarHomeFocusY() : getAvatarHomeNormalY(),
      0,
    );
    this.avatarHomePreviewNode.getComponent(UITransform)?.setContentSize(avatar.homeWidth * focusScale, avatar.homeHeight * focusScale);
    if (this.avatarHomeScoreLabel) {
      const totalBest = this.host.getTotalBestScore();
      this.avatarHomeScoreLabel.string = `TOTAL ${Math.round(totalBest)}`;
    }
    this.updateGoodsVisual();
  }

  openPanel(kind: AvatarPanelKind, preserveRankingBoard = false) {
    if (!this.refs) {
      return;
    }
    this.setGoodsFocus(kind === 'goods');
    const host = this.host;
    const { avatarPanelLayer } = this.refs;
    host.clearNodeChildren(avatarPanelLayer);
    avatarPanelLayer.active = true;
    avatarPanelLayer.setSiblingIndex(this.refs.avatarHomeLayer.getSiblingIndex() + 1);
    const dimmer = host.createRectNode(
      'AvatarPanelDimmer',
      avatarPanelLayer,
      0,
      0,
      host.getDesignWidth(),
      host.getDesignHeight(),
      new Color(0, 0, 0, 105),
    );
    dimmer.addComponent(BlockInputEvents);
    this.setHomeLayerInputBlocked(true);
    if (kind === 'goods') {
      this.buildGoodsPanel();
    } else if (kind === 'level') {
      this.buildLevelPanel();
    } else if (kind === 'ranking') {
      if (!preserveRankingBoard) {
        this.rankingBoardId = 'total';
      }
      this.buildRankingPanel();
    } else {
      this.buildFeedbackPanel();
    }
  }

  closePanel() {
    if (!this.refs) {
      return;
    }
    this.setHomeLayerInputBlocked(false);
    this.refs.avatarPanelLayer.active = false;
    this.host.clearNodeChildren(this.refs.avatarPanelLayer);
    this.setGoodsFocus(false);
  }

  equipGoods(goodsId: AvatarGoodsId) {
    if (!this.applyEquippedGoods(goodsId)) {
      return;
    }
    this.openPanel('goods');
  }

  applyEquippedGoods(goodsId: AvatarGoodsId): boolean {
    const goods = getAvatarGoodsDefinition(goodsId);
    if (!goods || !isPlayerAvatarGoodsUnlocked(goodsId)) {
      return false;
    }
    const socket = goods.attachSocket ?? 'head';
    const equipped = this.equippedAvatarGoodsBySocket[socket];
    if (equipped === goodsId) {
      delete this.equippedAvatarGoodsBySocket[socket];
      this.selectedAvatarGoodsId = 'none';
    } else {
      this.equippedAvatarGoodsBySocket[socket] = goodsId;
      this.selectedAvatarGoodsId = goodsId;
    }
    this.persistEquippedGoods();
    this.updateHomeVisuals();
    return true;
  }

  private persistEquippedGoods() {
    writeStoredString(bottleHeroStorageKeys.avatarGoods, this.selectedAvatarGoodsId);
    writeStoredString(
      bottleHeroStorageKeys.avatarGoodsLoadout,
      JSON.stringify(this.equippedAvatarGoodsBySocket),
    );
  }

  private createCycleButton(name: string, x: number, y: number, direction: -1 | 1) {
    const host = this.host;
    const frame = direction < 0 ? this.sp('avatarPreviousButton') : this.sp('avatarNextButton');
    const button = host.createSpriteNode(name, this.refs.avatarHomeLayer, frame, x, y, 82, 82);
    button.addComponent(Button);
    host.addPressScale(button);
    button.on(Node.EventType.TOUCH_END, () => this.cycleHome(direction), this);
  }

  private setGoodsFocus(active: boolean) {
    if (this.avatarGoodsFocusActive === active && this.avatarHomePreviewNode) {
      return;
    }
    this.avatarGoodsFocusActive = active;
    this.updateHomeVisuals();
  }

  private updateGoodsVisual() {
    if (!this.avatarHomeGoodsNodes.head) {
      return;
    }
    const avatar = getAvatarDefinition(this.selectedAvatarId);
    const provider = this.host.getSpriteProvider();
    const avatarScale = this.avatarGoodsFocusActive ? getAvatarHomeFocusScale() : 1;
    const avatarBaseY = this.avatarHomePreviewNode.position.y || getAvatarHomeNormalY();
    const sockets: AvatarGoodsAttachSocket[] = ['body', 'feet', 'head', 'hand'];
    for (const socket of sockets) {
      const node = this.avatarHomeGoodsNodes[socket];
      if (!node) continue;
      const goodsId = this.equippedAvatarGoodsBySocket[socket] ?? 'none';
      const goods = getAvatarGoodsDefinition(goodsId);
      if (!goods || goodsId === 'none' || !provider.hasSprite(goods.spriteKey)) {
        node.active = false;
        continue;
      }
      const sprite = node.getComponent(Sprite);
      if (sprite) {
        sprite.spriteFrame = this.sp(goods.spriteKey);
      }
      const scale = goods.socketOffset.scale * avatarScale;
      const targetW = goods.width * scale;
      const targetH = goods.height * scale;
      if (goods.keepAspect && sprite?.spriteFrame) {
        const original = sprite.spriteFrame.originalSize;
        const fit = Math.min(
          targetW / Math.max(1, original.width),
          targetH / Math.max(1, original.height),
        );
        node.getComponent(UITransform)?.setContentSize(original.width * fit, original.height * fit);
      } else {
        node.getComponent(UITransform)?.setContentSize(targetW, targetH);
      }
      const attachSocket = socket === 'hand'
        ? (avatar.handSocket ?? avatar.goodsSocket)
        : socket === 'body'
          ? (avatar.bodySocket ?? avatar.goodsSocket)
          : socket === 'feet'
            ? (avatar.feetSocket ?? avatar.goodsSocket)
            : avatar.goodsSocket;
      node.setPosition(
        (attachSocket.x + goods.socketOffset.x) * avatarScale,
        avatarBaseY + (attachSocket.y + goods.socketOffset.y) * avatarScale,
        0,
      );
      node.setRotationFromEuler(0, 0, goods.socketOffset.rotation ?? 0);
      node.active = true;
    }
  }

  private setHomeLayerInputBlocked(blocked: boolean) {
    if (!this.refs?.avatarHomeLayer) {
      return;
    }
    this.walkLayerButtons(this.refs.avatarHomeLayer, (button) => {
      button.interactable = !blocked;
    });
  }

  private walkLayerButtons(root: Node, visit: (button: Button) => void) {
    const button = root.getComponent(Button);
    if (button) {
      visit(button);
    }
    for (const child of root.children) {
      this.walkLayerButtons(child, visit);
    }
  }

  private createCloseButton(parent: Node, x: number, y: number) {
    const host = this.host;
    const closeButton = host.createSpriteNode(
      'AvatarPanelClose',
      parent,
      this.sp('panelCloseButton'),
      x,
      y,
      94,
      94,
    );
    closeButton.addComponent(Button);
    host.addPressScale(closeButton);
    closeButton.on(Node.EventType.TOUCH_END, this.closePanel, this);
    return closeButton;
  }

  private buildGoodsPanel() {
    const host = this.host;
    const panel = host.createSpriteNode('AvatarGoodsPanel', this.refs.avatarPanelLayer, this.sp('avatarGoodsPanel'), 0, -350, 720, 404);
    this.createCloseButton(this.refs.avatarPanelLayer, 348, -162);
    const goodsList = getAvatarConfig().goods.filter(
      (goods) => isPlayerAvatarGoodsUnlocked(goods.id as AvatarGoodsId),
    );
    const columns = 4;
    const rows = 2;
    const totalSlots = columns * rows;
    const slotSpreadX = 160;
    const slotSpreadY = 160;
    const startX = -((columns - 1) * slotSpreadX) / 2;
    const startY = 96;
    const goodsBySlot: Array<AvatarGoodsDefinitionConfig | null> = Array(totalSlots).fill(null);
    const unslotted: AvatarGoodsDefinitionConfig[] = [];

    for (const goods of goodsList) {
      const slotIndex = (goods as AvatarGoodsDefinitionConfig & { panelSlot?: unknown }).panelSlot;
      if (
        typeof slotIndex === 'number'
        && Number.isInteger(slotIndex)
        && slotIndex >= 0
        && slotIndex < totalSlots
        && !goodsBySlot[slotIndex]
      ) {
        goodsBySlot[slotIndex] = goods;
      } else {
        unslotted.push(goods);
      }
    }
    for (let i = 0; i < totalSlots && unslotted.length > 0; i++) {
      if (!goodsBySlot[i]) goodsBySlot[i] = unslotted.shift() || null;
    }

    const provider = host.getSpriteProvider();
    for (let i = 0; i < totalSlots; i++) {
      const goods = goodsBySlot[i];
      const row = Math.floor(i / columns);
      const col = i % columns;
      const x = startX + col * slotSpreadX;
      const y = startY - row * slotSpreadY;
      const slotName = goods ? goods.id : `empty_${i}`;
      const slotBack = host.createRectNode(`AvatarGoodsSlot_${slotName}`, panel, x, y, 134, 134, new Color(255, 255, 255, 230));
      const graphics = slotBack.getComponent(Graphics);
      if (graphics) {
        const isSelected = !!goods && (
          this.selectedAvatarGoodsId === (goods.id as AvatarGoodsId)
          || Object.values(this.equippedAvatarGoodsBySocket).includes(goods.id as AvatarGoodsId)
        );
        graphics.strokeColor =
          isSelected ? new Color(255, 206, 68, 255) : new Color(0, 132, 79, 255);
        graphics.lineWidth = isSelected ? 10 : 6;
        graphics.stroke();
      }
      if (!goods || !provider.hasSprite(goods.spriteKey)) {
        slotBack.opacity = 120;
        continue;
      }
      const item = host.createSpriteNode(`AvatarGoodsIcon_${goods.id}`, slotBack, this.sp(goods.spriteKey), 0, 0, 106, 106);
      item.addComponent(Button);
      host.addPressScale(item);
      item.on(Node.EventType.TOUCH_END, () => this.equipGoods(goods.id as AvatarGoodsId), this);
    }
  }

  private buildLevelPanel() {
    const host = this.host;
    const panel = host.createSpriteNode('AvatarLevelPanel', this.refs.avatarPanelLayer, this.sp('avatarLevelPanel'), 0, 0, 760, 1350);
    this.createCloseButton(this.refs.avatarPanelLayer, 348, 594);
    const levelOne = host.createSpriteNode('AvatarLevelOne', panel, this.sp('level1Button'), 0, 392, 196, 196);
    levelOne.addComponent(Button);
    host.addPressScale(levelOne);
    levelOne.on(Node.EventType.TOUCH_END, () => {
      this.closePanel();
      host.startRun('level_01');
    }, this);

    const levelTwoY = 118;
    if (host.isLevelUnlocked('level_02')) {
      const levelTwo = host.createSpriteNode('AvatarLevelTwo', panel, this.sp('level2Button'), 0, levelTwoY, 196, 196);
      levelTwo.addComponent(Button);
      host.addPressScale(levelTwo);
      levelTwo.on(Node.EventType.TOUCH_END, () => {
        this.closePanel();
        host.startRun('level_02');
      }, this);
    } else {
      host.createSpriteNode('AvatarLevelTwoLocked', panel, this.sp('levelLockedButton'), 0, levelTwoY, 154, 154);
    }

    const levelThreeY = -130;
    if (host.isLevelUnlocked('level_03')) {
      const levelThree = host.createSpriteNode('AvatarLevelThree', panel, this.sp('level3Button'), 0, levelThreeY, 196, 196);
      levelThree.addComponent(Button);
      host.addPressScale(levelThree);
      levelThree.on(Node.EventType.TOUCH_END, () => {
        this.closePanel();
        host.startRun('level_03');
      }, this);
    } else {
      host.createSpriteNode('AvatarLevelThreeLocked', panel, this.sp('levelLockedButton'), 0, levelThreeY, 154, 154);
    }

    host.createSpriteNode('AvatarLevelLocked_0', panel, this.sp('levelLockedButton'), 0, -378, 154, 154);
  }

  private buildRankingPanel() {
    const host = this.host;
    const provider = host.getSpriteProvider();
    const rankingPanelFrame = provider.hasSprite('rankingPanel')
      ? provider.getSprite('rankingPanel')
      : provider.getSprite('avatarRankingPanel');
    const panel = host.createSpriteNode('AvatarRankingPanel', this.refs.avatarPanelLayer, rankingPanelFrame, 0, 0, 640, 1020);
    this.createCloseButton(this.refs.avatarPanelLayer, 292, 480);
    this.createRankingTabs(panel);
    host.createLabel(
      'RankingBoardTitle',
      panel,
      getRankingBoardLabel(this.rankingBoardId),
      0,
      356 + RANKING_PANEL_CONTENT_SHIFT_Y,
      28,
      new Color(0, 126, 74, 255),
      2,
      520,
      Label.HorizontalAlign.CENTER,
    );
    const rowsRoot = host.createRectNode(
      'RankingRowsRoot',
      panel,
      0,
      0,
      560,
      720,
      new Color(0, 0, 0, 0),
    );
    const loadingLabel = host.createLabel(
      'RankingLoadingLabel',
      panel,
      '加载中...',
      0,
      120 + RANKING_PANEL_CONTENT_SHIFT_Y,
      26,
      new Color(70, 70, 70, 255),
      0,
      520,
      Label.HorizontalAlign.CENTER,
    );
    void this.loadRankingRows(rowsRoot, loadingLabel, provider);
  }

  private async loadRankingRows(rowsRoot: Node, loadingLabel: Label, provider: BottleHeroSpriteProvider) {
    const host = this.host;
    const playerId = host.getPlayerId();
    const playerName = host.getPlayerName();
    const result = await fetchLeaderboardBoard(this.rankingBoardId, playerId, playerName);
    if (!rowsRoot.isValid) {
      return;
    }
    if (loadingLabel?.node?.isValid) {
      loadingLabel.node.destroy();
    }
    host.clearNodeChildren(rowsRoot);
    this.renderRankingRows(rowsRoot, result.rows, provider);
    if (result.source === 'local') {
      host.createLabel(
        'RankingOfflineHint',
        rowsRoot.parent!,
        '离线模式：显示本地榜单',
        0,
        -430 + RANKING_PANEL_CONTENT_SHIFT_Y,
        20,
        new Color(120, 120, 120, 255),
        0,
        520,
        Label.HorizontalAlign.CENTER,
      );
    }
  }

  private selectRankingBoard(boardId: RankingBoardId) {
    if (this.rankingBoardId === boardId) {
      return;
    }
    this.rankingBoardId = boardId;
    this.openPanel('ranking', true);
  }

  private createRankingTabs(panel: Node) {
    const host = this.host;
    const tabWidth = 118;
    const gap = 8;
    const totalWidth = RANKING_BOARD_IDS.length * tabWidth + (RANKING_BOARD_IDS.length - 1) * gap;
    const startX = -totalWidth / 2 + tabWidth / 2;
    for (let i = 0; i < RANKING_BOARD_IDS.length; i++) {
      const boardId = RANKING_BOARD_IDS[i];
      const x = startX + i * (tabWidth + gap);
      const active = boardId === this.rankingBoardId;
      const tab = host.createRectNode(
        `RankingTab_${boardId}`,
        panel,
        x,
        418 + RANKING_PANEL_CONTENT_SHIFT_Y,
        tabWidth,
        44,
        active ? new Color(255, 236, 168, 255) : new Color(255, 255, 255, 215),
      );
      const graphics = tab.getComponent(Graphics);
      if (graphics) {
        graphics.strokeColor = active ? new Color(255, 196, 48, 255) : new Color(0, 132, 79, 255);
        graphics.lineWidth = active ? 4 : 3;
        graphics.stroke();
      }
      tab.addComponent(Button);
      host.addPressScale(tab);
      host.createLabel(
        `RankingTabLabel_${boardId}`,
        tab,
        getRankingBoardLabel(boardId),
        0,
        0,
        20,
        active ? new Color(180, 96, 0, 255) : new Color(0, 126, 74, 255),
        active ? 2 : 0,
        tabWidth - 8,
        Label.HorizontalAlign.CENTER,
      );
      tab.on(Node.EventType.TOUCH_END, () => this.selectRankingBoard(boardId), this);
    }
  }

  private renderRankingRows(
    panel: Node,
    rows: LocalRankingRow[],
    provider: BottleHeroSpriteProvider,
  ) {
    const host = this.host;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const y = 268 - i * 102 + RANKING_PANEL_CONTENT_SHIFT_Y;
      const isPlayer = !!row.isPlayer;
      const nameColor = isPlayer ? new Color(0, 146, 86, 255) : new Color(30, 24, 18, 255);
      const scoreColor = isPlayer ? new Color(255, 168, 36, 255) : new Color(30, 24, 18, 255);
      if (isPlayer) {
        const highlight = host.createRectNode(
          `RankingHighlight_${i}`,
          panel,
          0,
          y,
          560,
          108,
          new Color(255, 236, 168, 95),
        );
        const highlightGraphics = highlight.getComponent(Graphics);
        if (highlightGraphics) {
          highlightGraphics.strokeColor = new Color(255, 196, 48, 220);
          highlightGraphics.lineWidth = 4;
          highlightGraphics.stroke();
        }
      }
      const medal = this.getRankingMedalFrame(row.rank);
      if (medal) {
        host.createSpriteNode(
          `RankingMedal_${i}`,
          panel,
          medal,
          -230,
          y,
          row.rank === 1 ? 72 : 54,
          row.rank === 1 ? 72 : 54,
        );
      } else {
        host.createLabel(
          `RankingNo_${i}`,
          panel,
          `${row.rank}`,
          -230,
          y,
          30,
          isPlayer ? new Color(255, 146, 28, 255) : new Color(0, 126, 74, 255),
          2,
          70,
          Label.HorizontalAlign.CENTER,
        );
      }
      host.createSpriteNode(
        `RankingUser_${i}`,
        panel,
        this.getRankingAvatarFrame(row, provider),
        -122,
        y,
        76,
        76,
      );
      host.createLabel(
        `RankingName_${i}`,
        panel,
        row.name,
        92,
        y + 24,
        24,
        nameColor,
        isPlayer ? 3 : 0,
        330,
        Label.HorizontalAlign.LEFT,
      );
      host.createLabel(
        `RankingScore_${i}`,
        panel,
        String(Math.round(row.score)),
        92,
        y - 20,
        42,
        scoreColor,
        isPlayer ? 2 : 0,
        330,
        Label.HorizontalAlign.LEFT,
      );
    }
  }

  private getRankingMedalFrame(rank: number): SpriteFrame | null {
    if (rank === 1) return this.sp('rankingNo1Icon');
    if (rank === 2) return this.sp('rankingNo2Icon');
    if (rank === 3) return this.sp('rankingNo3Icon');
    return null;
  }

  private getRankingAvatarFrame(row: { isPlayer?: boolean }, provider: BottleHeroSpriteProvider): SpriteFrame {
    if (row.isPlayer) {
      const iconKey = getAvatarDefinition(this.selectedAvatarId).iconKey;
      if (provider.hasSprite(iconKey as never)) {
        return this.sp(iconKey);
      }
    }
    return this.sp('rankingUserIcon');
  }

  private buildFeedbackPanel() {
    const host = this.host;
    const panel = host.createRectNode('AvatarFeedbackPanel', this.refs.avatarPanelLayer, 0, 0, 650, 360, new Color(255, 250, 222, 250));
    const graphics = panel.getComponent(Graphics);
    if (graphics) {
      graphics.strokeColor = new Color(0, 132, 79, 255);
      graphics.lineWidth = 12;
      graphics.stroke();
    }
    this.createCloseButton(this.refs.avatarPanelLayer, 324, 164);
    const surveyButton = host.createSpriteNode('AvatarFeedbackOpenSurvey', panel, this.sp('feedbackButton'), 0, 70, 340, 148);
    surveyButton.addComponent(Button);
    host.addPressScale(surveyButton);
    surveyButton.on(Node.EventType.TOUCH_END, () => host.openFeedbackSurvey(), this);
    host.createLabel(
      'AvatarFeedbackText',
      panel,
      'OPEN SURVEY',
      0,
      -78,
      30,
      new Color(0, 128, 76, 255),
      2,
      560,
      Label.HorizontalAlign.CENTER,
    );
  }
}
