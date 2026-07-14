import { Node, SpriteFrame } from 'cc';
import { createSpriteNode, getFittedSpriteHeight, isBackgroundTileVisible } from './BottleHeroUiFactory';
import { BackgroundSegmentKind, BackgroundSegmentState } from './BottleHeroTypes';

export interface BackgroundHost {
  getDesignWidth(): number;
  getDesignHeight(): number;
  getBottleCount(): number;
  getCurrentWorldY(): number;
  getBgLayer(): Node;
  getSprite(spriteKey: string): SpriteFrame | null | undefined;
  hasLoopOnceSegment(): boolean;
  getScene03HeightThreshold(): number;
  getScene04HeightThreshold(): number;
  getScene03MinLoops(): number;
  /** Level 03: start→loopOnce→scene03Bridge→scene03Loop→scene04Bridge→scene04Loop(仅终局重复)。 */
  usesSingleScene03Loop(): boolean;
}

export class BottleHeroBackgroundController {
  private readonly backgroundParallax = 0.72;

  private levelBackgroundHeight = 0;
  private loopBackgroundHeight = 0;
  private backgroundBaseY = 0;
  private loopBackgroundStartY = 0;
  private backgroundNextStartY = 0;
  private scene03BridgeAdded = false;
  private scene04BridgeAdded = false;
  private loopOnceAdded = false;
  private scene03LoopCount = 0;
  private backgroundSegments: BackgroundSegmentState[] = [];
  private loopBackgroundTiles: Node[] = [];
  private levelBackgroundTile: Node | null = null;

  constructor(private readonly host: BackgroundHost) {}

  isScene03BridgeAdded(): boolean {
    return this.scene03BridgeAdded;
  }

  isScene04BridgeAdded(): boolean {
    return this.scene04BridgeAdded;
  }

  getScene04HeightThreshold(): number {
    return this.host.getScene04HeightThreshold();
  }

  createLoopBackground(): void {
    const designWidth = this.host.getDesignWidth();
    this.levelBackgroundHeight = getFittedSpriteHeight(this.host.getSprite('levelBackground')!, designWidth);
    this.loopBackgroundHeight = getFittedSpriteHeight(this.host.getSprite('loopBackground')!, designWidth);
    this.backgroundBaseY = (this.levelBackgroundHeight - this.host.getDesignHeight()) * 0.5;
    this.loopBackgroundStartY = this.backgroundBaseY + this.levelBackgroundHeight * 0.5 + this.loopBackgroundHeight * 0.5;
    this.resetSequence();
  }

  resetSequence(): void {
    for (const segment of this.backgroundSegments) {
      if (segment.node.isValid) {
        segment.node.destroy();
      }
    }
    this.backgroundSegments = [];
    this.loopBackgroundTiles = [];
    this.levelBackgroundTile = null;
    this.backgroundNextStartY = -this.host.getDesignHeight() * 0.5;
    this.scene03BridgeAdded = false;
    this.scene04BridgeAdded = false;
    this.loopOnceAdded = false;
    this.scene03LoopCount = 0;
    this.appendSegment('levelIntro');
    this.ensureSegments(0);
  }

  updateLoop(): void {
    const viewY = this.host.getCurrentWorldY() * this.backgroundParallax;
    this.ensureSegments(viewY);
    const designHeight = this.host.getDesignHeight();
    for (const segment of this.backgroundSegments) {
      const y = segment.startY + segment.height * 0.5 - viewY;
      segment.node.active = isBackgroundTileVisible(y, segment.height, designHeight);
      segment.node.setPosition(0, y, 0);
    }
  }

  private ensureSegments(viewY: number): void {
    const lookAheadY = viewY + this.host.getDesignHeight() * 2.2;
    let guard = 0;
    while (this.backgroundNextStartY < lookAheadY && guard < 12) {
      const kind = this.pickNextSegmentKind();
      if (!kind) {
        break;
      }
      this.appendSegment(kind);
      guard += 1;
    }
  }

  private pickNextSegmentKind(): BackgroundSegmentKind | null {
    if (!this.scene03BridgeAdded) {
      if (this.host.hasLoopOnceSegment() && !this.loopOnceAdded) {
        return 'loopOnce';
      }
      if (this.host.getBottleCount() >= this.host.getScene03HeightThreshold()) {
        return 'scene03Bridge';
      }
      if (this.host.usesSingleScene03Loop()) {
        return null;
      }
      return 'baseLoop';
    }
    if (!this.scene04BridgeAdded) {
      if (this.host.usesSingleScene03Loop()) {
        if (this.scene03LoopCount < 1) {
          return 'scene03Loop';
        }
        if (this.host.getBottleCount() >= this.host.getScene04HeightThreshold()) {
          return 'scene04Bridge';
        }
        return null;
      }
      const scene04Ready = this.host.getBottleCount() >= this.host.getScene04HeightThreshold()
        && this.scene03LoopCount >= this.host.getScene03MinLoops();
      return scene04Ready ? 'scene04Bridge' : 'scene03Loop';
    }
    return 'scene04Loop';
  }

  private appendSegment(kind: BackgroundSegmentKind): void {
    const frame = this.getSegmentFrame(kind);
    const designWidth = this.host.getDesignWidth();
    const height = getFittedSpriteHeight(frame, designWidth);
    const startY = this.backgroundNextStartY;
    const centerY = startY + height * 0.5;
    const node = createSpriteNode(
      `Background_${kind}_${this.backgroundSegments.length}`,
      this.host.getBgLayer(),
      frame,
      0,
      centerY,
      designWidth,
      height,
    );
    node.active = false;
    const segment: BackgroundSegmentState = {
      node,
      kind,
      startY,
      height,
    };
    this.backgroundSegments.push(segment);
    this.backgroundNextStartY += height;
    if (kind === 'levelIntro') {
      this.levelBackgroundTile = node;
    }
    if (kind === 'baseLoop' || kind === 'scene03Loop' || kind === 'scene04Loop') {
      this.loopBackgroundTiles.push(node);
    }
    if (kind === 'scene03Bridge') {
      this.scene03BridgeAdded = true;
    } else if (kind === 'loopOnce') {
      this.loopOnceAdded = true;
    } else if (kind === 'scene03Loop') {
      this.scene03LoopCount += 1;
    } else if (kind === 'scene04Bridge') {
      this.scene04BridgeAdded = true;
    }
  }

  private getSegmentFrame(kind: BackgroundSegmentKind): SpriteFrame {
    if (kind === 'levelIntro') {
      return this.host.getSprite('levelBackground')!;
    }
    if (kind === 'loopOnce') {
      return this.host.getSprite('loopOnceBackground') || this.host.getSprite('loopBackground')!;
    }
    if (kind === 'scene03Bridge') {
      return this.host.getSprite('scene03BridgeBackground') || this.host.getSprite('loopBackground')!;
    }
    if (kind === 'scene03Loop') {
      return this.host.getSprite('scene03LoopBackground') || this.host.getSprite('loopBackground')!;
    }
    if (kind === 'scene04Bridge') {
      return this.host.getSprite('scene04BridgeBackground') || this.host.getSprite('loopBackground')!;
    }
    if (kind === 'scene04Loop') {
      return this.host.getSprite('scene04LoopBackground') || this.host.getSprite('loopBackground')!;
    }
    return this.host.getSprite('loopBackground')!;
  }
}
