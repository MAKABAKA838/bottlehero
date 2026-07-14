import { Node, SpriteFrame, Vec3, tween } from 'cc';
import { randomRange } from './BottleHeroMathUtil';
import { createSpriteNode } from './BottleHeroUiFactory';
import type { ThrowBottleState } from './BottleHeroTypes';

/**
 * 投掷飞瓶飞行 FX（抛物线 tween + 旋转）。
 * 手感公式与迁出前 Mvp 私有方法一致；状态仍由 Host 持有。
 */
export interface ThrowFxHost {
  getThrowFxLayer(): Node;
  getCurrentWorldY(): number;
  getHandSide(): number;
  getActiveThrowBottles(): ThrowBottleState[];
  setActiveThrowBottles(value: ThrowBottleState[]): void;
}

export class BottleHeroThrowFxController {
  constructor(private readonly host: ThrowFxHost) {}

  spawnThrowBottle(
    frame: SpriteFrame,
    targetX: number,
    targetY: number,
    size: number,
    finalAngle: number,
    onArrive: () => void,
    onIntercept: () => void,
  ) {
    const startX = 310 * this.host.getHandSide();
    const startY = -620 + this.host.getCurrentWorldY();
    const bottle = createSpriteNode('ThrowBottleFx', this.host.getThrowFxLayer(), frame, startX, startY, size, size);
    bottle.setScale(0.7, 0.7, 1);
    bottle.setRotationFromEuler(0, 0, -34 * this.host.getHandSide());
    const throwState: ThrowBottleState = {
      node: bottle,
      onIntercept,
      intercepted: false,
    };
    this.host.setActiveThrowBottles([...this.host.getActiveThrowBottles(), throwState]);
    const midX = (startX + targetX) * 0.5 + randomRange(-70, 70);
    const midY = Math.max(startY, targetY) + 240;

    tween(bottle)
      .to(0.16, { position: new Vec3(midX, midY, 0), scale: new Vec3(1.18, 1.18, 1) })
      .to(0.18, { position: new Vec3(targetX, targetY, 0), scale: new Vec3(1, 1, 1) })
      .call(() => {
        this.host.setActiveThrowBottles(
          this.host.getActiveThrowBottles().filter((candidate) => candidate !== throwState),
        );
        if (throwState.intercepted) {
          if (bottle.isValid) {
            bottle.destroy();
          }
          return;
        }
        onArrive();
        if (bottle.isValid) {
          bottle.destroy();
        }
      })
      .start();
    tween(bottle)
      .to(0.34, {}, {
        onUpdate: (_target, ratio) => {
          bottle.setRotationFromEuler(0, 0, -34 + ratio * (390 + finalAngle));
        },
      })
      .start();
  }
}
