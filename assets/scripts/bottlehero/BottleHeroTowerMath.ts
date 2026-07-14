import { Vec3 } from 'cc';
import { SpriteFrame } from 'cc';
import { randomRange } from './BottleHeroMathUtil';

const bottleSizes = [126, 268, 154, 318, 182, 238, 112, 292] as const;

export function getBottleSize(index: number): number {
  return bottleSizes[index % bottleSizes.length];
}

export function getTowerItemMaxHp(index: number): number {
  const size = getBottleSize(index);
  if (size >= 260) {
    return 4;
  }
  if (size >= 180) {
    return 3;
  }
  return 2;
}

export function getTowerTopLocalY(bottleCount: number, bottleStepY: number): number {
  if (bottleCount <= 0) {
    return -500;
  }
  return -500 + (bottleCount - 1) * bottleStepY;
}

export function getTowerCameraTargetWorldY(
  bottleCount: number,
  bottleStepY: number,
  bossViewActive: boolean,
): number {
  const desiredTopScreenY = bossViewActive ? -80 : -36;
  return Math.max(0, getTowerTopLocalY(bottleCount, bottleStepY) - desiredTopScreenY);
}

export function getBottleWorldPosition(
  localX: number,
  localY: number,
  towerVisualX: number,
  towerLeanDegrees: number,
): Vec3 {
  const radians = towerLeanDegrees * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const pivotLocalY = localY + 560;
  return new Vec3(
    towerVisualX + localX * cos - pivotLocalY * sin,
    -560 + localX * sin + pivotLocalY * cos,
    0,
  );
}

export function keepTowerTopInView(
  visualX: number,
  topLocalY: number,
  towerDrift: number,
  towerLeanDegrees: number,
  designWidth: number,
): number {
  const topLocalX = towerDrift;
  const pivotLocalY = topLocalY + 560;
  const radians = towerLeanDegrees * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const topWorldX = visualX + topLocalX * cos - pivotLocalY * sin;
  const visibleLimit = designWidth * 0.5 - 150;
  if (topWorldX > visibleLimit) {
    return visualX - (topWorldX - visibleLimit);
  }
  if (topWorldX < -visibleLimit) {
    return visualX + (-visibleLimit - topWorldX);
  }
  return visualX;
}

export function pickThrowBottleFrame(
  bottleCount: number,
  bottleFrames: SpriteFrame[],
  stagedThrowFrames: SpriteFrame[],
  fallback: SpriteFrame | null | undefined,
): SpriteFrame | null | undefined {
  const baseFrames = stagedThrowFrames.length ? stagedThrowFrames : bottleFrames;
  const unlockCount = Math.min(stagedThrowFrames.length, Math.max(0, Math.floor((bottleCount - 4) / 3)));
  const pool = unlockCount > 0 ? baseFrames.concat(stagedThrowFrames.slice(0, unlockCount)) : baseFrames;
  if (!pool.length) {
    return fallback;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getBottleLandingLocalY(bottleCount: number, bottleStepY: number): number {
  return -500 + bottleCount * bottleStepY;
}

export function clampTowerDrift(drift: number): number {
  return Math.max(-180, Math.min(180, drift));
}

export function getStagedThrowUnlockCount(bottleCount: number, stagedThrowCount: number): number {
  return Math.min(stagedThrowCount, Math.max(0, Math.floor((bottleCount - 4) / 3)));
}
