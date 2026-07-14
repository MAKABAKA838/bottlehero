import { Node, Sprite, SpriteFrame } from 'cc';
import { BottleHeroFeedbackFxProvider, BottleHeroSpriteProvider } from './BottleHeroAssetProvider';
import { HitKind } from './BottleHeroTypes';

export interface BottleHeroFeedbackFxHost {
  getFeedbackNode(): Node;
  getFeedbackSprite(): Sprite;
  schedule(callback: () => void, interval: number): void;
  unschedule(callback: () => void): void;
  setFeedbackTick(tick: (() => void) | null): void;
  getFeedbackTick(): (() => void) | null;
}

export class BottleHeroFeedbackFxPlayer implements BottleHeroFeedbackFxProvider {
  constructor(
    private readonly sprites: BottleHeroSpriteProvider,
    private readonly host: BottleHeroFeedbackFxHost,
  ) {}

  play(kind: HitKind | 'miss') {
    const frames = this.sprites.getFeedbackFrames(kind);
    if (!frames.length) {
      return;
    }
    const feedbackNode = this.host.getFeedbackNode();
    const feedbackSprite = this.host.getFeedbackSprite();
    feedbackNode.active = true;
    feedbackNode.setScale(1, 1, 1);
    const previousTick = this.host.getFeedbackTick();
    if (previousTick) {
      this.host.unschedule(previousTick);
      this.host.setFeedbackTick(null);
    }
    let index = 0;
    const tick = () => {
      if (index >= frames.length) {
        feedbackNode.active = false;
        if (this.host.getFeedbackTick() === tick) {
          this.host.unschedule(tick);
          this.host.setFeedbackTick(null);
        }
        return;
      }
      feedbackSprite.spriteFrame = frames[index] as SpriteFrame;
      index += 1;
    };
    this.host.setFeedbackTick(tick);
    this.host.schedule(tick, 0.035);
    tick();
  }
}
