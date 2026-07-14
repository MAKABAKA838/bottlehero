import { Node, Tween } from 'cc';
import type { BottleHeroBalanceConfig } from './BottleHeroBalance';
import { keepTowerTopInView } from './BottleHeroTowerMath';
import type { ThrowBottleState } from './BottleHeroTypes';

/**
 * 世界滚动 + 投掷塔摆动 / 清空会话。
 * 手感公式与迁出前 Mvp 私有方法一致；状态仍由 Host 持有。
 */
export interface WorldTowerHost {
  getWorldLayer(): Node;
  getTowerPivotLayer(): Node;
  getTowerLayer(): Node;
  getMissLayer(): Node;
  getThrowFxLayer(): Node;
  getCurrentWorldY(): number;
  setCurrentWorldY(value: number): void;
  getTargetWorldY(): number;
  isTimingPanelActive(): boolean;
  updateTimingPanelPosition(): void;
  getBalanceConfig(): BottleHeroBalanceConfig;
  getStability(): number;
  getBottleCount(): number;
  getTowerDrift(): number;
  getTowerLean(): number;
  setTowerLean(value: number): void;
  getTowerLeanVelocity(): number;
  setTowerLeanVelocity(value: number): void;
  getTowerShakeTime(): number;
  setTowerShakeTime(value: number): void;
  getTowerVisualX(): number;
  setTowerVisualX(value: number): void;
  getTowerTopLocalY(): number;
  isChargeActive(): boolean;
  getDesignWidth(): number;
  getActiveThrowBottles(): ThrowBottleState[];
  setActiveThrowBottles(value: ThrowBottleState[]): void;
  clearTowerItemHp(): void;
}

export class BottleHeroWorldTowerController {
  constructor(private readonly host: WorldTowerHost) {}

  updateWorldScroll(deltaTime: number): void {
    const current = this.host.getCurrentWorldY();
    const next = current + (this.host.getTargetWorldY() - current) * Math.min(1, deltaTime * 3.4);
    this.host.setCurrentWorldY(next);
    this.host.getWorldLayer().setPosition(0, -next, 0);
    if (this.host.isTimingPanelActive()) {
      this.host.updateTimingPanelPosition();
    }
  }

  updateTowerShake(deltaTime: number): void {
    const balance = this.host.getBalanceConfig();
    const maxStability = Math.max(1, balance.stability.initialStability);
    const danger = 1 - Math.max(0, Math.min(1, this.host.getStability() / maxStability));
    const heightFactor = Math.min(1, Math.max(0, (this.host.getBottleCount() - 5) / 18));
    const swayScale = balance.stability.towerSwayScale;
    const shakeTime = this.host.getTowerShakeTime() + deltaTime;
    this.host.setTowerShakeTime(shakeTime);
    const topLocalY = this.host.getTowerTopLocalY();
    const topPivotY = Math.max(620, topLocalY + 560);
    const maxVisibleLean = Math.max(2.2, Math.min(8.5, (320 / topPivotY) * 180 / Math.PI));
    const towerDrift = this.host.getTowerDrift();

    const driftLean = (towerDrift / 180) * (1.2 + danger * 2.1 + heightFactor * 1.35);
    const idleLean = Math.sin(shakeTime * (0.9 + heightFactor * 0.18)) * (0.3 + heightFactor * 1.15 + danger * 0.65) * swayScale;
    let leanVelocity = this.host.getTowerLeanVelocity() * Math.max(0, 1 - deltaTime * 5.2);
    this.host.setTowerLeanVelocity(leanVelocity);
    const impactLean = Math.max(-2.8, Math.min(2.8, leanVelocity));
    const desiredLean = Math.max(-maxVisibleLean, Math.min(maxVisibleLean, driftLean + idleLean + impactLean));
    const towerLean = this.host.getTowerLean() + (desiredLean - this.host.getTowerLean()) * Math.min(1, deltaTime * (5.2 - danger * 1.2));
    this.host.setTowerLean(towerLean);

    const baseSway = Math.sin(shakeTime * (1.02 + heightFactor * 0.18)) * (1.2 + heightFactor * 4.4 + danger * 2.4) * swayScale;
    const secondarySway = Math.sin(shakeTime * (1.86 + danger * 0.35)) * (0.45 + heightFactor * 1.15) * swayScale;
    const chargeSway = this.host.isChargeActive() ? Math.sin(shakeTime * 1.42) * (0.85 + heightFactor * 1.45) * swayScale : 0;
    const centerCorrection = Math.max(-130, Math.min(130, -towerDrift * 0.72));
    let desiredVisualX = centerCorrection + baseSway + secondarySway + chargeSway;
    desiredVisualX = keepTowerTopInView(desiredVisualX, topLocalY, towerDrift, towerLean, this.host.getDesignWidth());
    const towerVisualX = this.host.getTowerVisualX() + (desiredVisualX - this.host.getTowerVisualX()) * Math.min(1, deltaTime * 4.2);
    this.host.setTowerVisualX(towerVisualX);
    this.host.getTowerPivotLayer().setPosition(towerVisualX, -560, 0);
    this.host.getTowerPivotLayer().setRotationFromEuler(0, 0, towerLean);
  }

  clearTower(): void {
    for (const throwState of this.host.getActiveThrowBottles()) {
      if (throwState.node.isValid) {
        Tween.stopAllByTarget(throwState.node);
        throwState.node.destroy();
      }
    }
    this.host.setActiveThrowBottles([]);
    this.host.getTowerLayer().children.slice().forEach((child) => child.destroy());
    this.host.getMissLayer().children.slice().forEach((child) => child.destroy());
    this.host.getThrowFxLayer().children.slice().forEach((child) => child.destroy());
    this.host.clearTowerItemHp();
    this.host.getTowerPivotLayer().setPosition(0, -560, 0);
    this.host.getTowerPivotLayer().setRotationFromEuler(0, 0, 0);
    this.host.getTowerLayer().setPosition(0, 560, 0);
    this.host.getTowerLayer().setRotationFromEuler(0, 0, 0);
  }
}
