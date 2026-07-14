import {
  ActiveStageState,
  BottleHeroBalanceConfig,
  getStageOrderIndex,
  TimingPointTierId,
  TimingTargetKind,
  TimingTargetPlan,
  TimingTrackMode,
} from './BottleHeroBalance';
import { getActiveLevelId } from './BottleHeroConfigLoader';
import { randomRange } from './BottleHeroMathUtil';
import type { TimingPathPoint, TimingPointSize, TimingTrackShape } from './BottleHeroTypes';

export interface TimingTargetLayoutConfig {
  visualSize: number;
  visualScale: number;
  perfectRadius: number;
  goodRadius: number;
}

export interface TimingHitTargetSnapshot {
  kind: TimingTargetKind;
  x: number;
  y: number;
  angle: number;
  perfectRadius: number;
  goodRadius: number;
  scoreValue: number;
}

export type TimingHitResolutionKind = 'miss' | 'perfect' | 'good' | 'timingItem';

export interface TimingHitResolution {
  kind: TimingHitResolutionKind;
  targetIndex: number;
  pointX: number;
  pointY: number;
  distance: number;
  normalizedError: number;
}

export function normalizeTrackProgress(progress: number): number {
  return ((progress % 1) + 1) % 1;
}

export function normalizeAngleDegrees(angleDegrees: number): number {
  return ((angleDegrees % 360) + 360) % 360;
}

export function getAngleDistance(a: number, b: number): number {
  const delta = Math.abs(normalizeAngleDegrees(a) - normalizeAngleDegrees(b));
  return Math.min(delta, 360 - delta);
}

export function getProgressDistance(a: number, b: number): number {
  const delta = Math.abs(normalizeTrackProgress(a) - normalizeTrackProgress(b));
  return Math.min(delta, 1 - delta);
}

export function isPathTimingTrack(shape: TimingTrackShape): boolean {
  return shape === 'triangle' || shape === 'path' || shape === 'star' || shape === 'infinity';
}

export function getCircleTrackRadius(circleTrackRadius: number): number {
  return Math.max(120, Math.min(260, circleTrackRadius));
}

/** Per-vertex radii from timing_bar_star.png at 490px (image center). Outer = tip extent; inner = stroke midline. */
const STAR_TRACK_OUTER_R_BASE = [218.4, 230.9, 252.2, 251.9, 230.9];
const STAR_TRACK_INNER_R_BASE = [99.5, 114.4, 114.8, 113.9, 98.6];

/** Star track layout tuned to timing_bar_star.png (490 UI size, circleTrackRadius baseline 196). */
export function getTimingStarTrackLayout(circleTrackRadius: number): {
  scale: number;
  offsetX: number;
  offsetY: number;
} {
  const scale = getCircleTrackRadius(circleTrackRadius) / 196;
  return {
    scale,
    offsetX: 0,
    offsetY: 0,
  };
}

function getTimingStarVertexRadius(vertexIndex: number, scale: number): number {
  if (vertexIndex % 2 === 0) {
    return STAR_TRACK_OUTER_R_BASE[vertexIndex / 2] * scale;
  }
  return STAR_TRACK_INNER_R_BASE[(vertexIndex - 1) / 2] * scale;
}

const INFINITY_TRACK_A_BASE = 205;
const INFINITY_TRACK_SEGMENTS = 72;

/** Infinity (∞) track layout tuned to timing_bar_Infinity symbol.png (490 UI size, circleTrackRadius baseline 196). */
export function getTimingInfinityTrackLayout(circleTrackRadius: number): {
  scale: number;
  offsetX: number;
  offsetY: number;
} {
  const scale = getCircleTrackRadius(circleTrackRadius) / 196;
  return {
    scale,
    offsetX: 0,
    offsetY: 0,
  };
}

function buildInfinityTrackPoints(scale: number, offsetX: number, offsetY: number): TimingPathPoint[] {
  const a = INFINITY_TRACK_A_BASE * scale;
  const points: TimingPathPoint[] = [];
  for (let i = 0; i <= INFINITY_TRACK_SEGMENTS; i++) {
    const t = (i / INFINITY_TRACK_SEGMENTS) * Math.PI * 2;
    const sinT = Math.sin(t);
    const cosT = Math.cos(t);
    const denom = 1 + sinT * sinT;
    points.push({
      x: a * cosT / denom + offsetX,
      y: a * sinT * cosT / denom + offsetY,
    });
  }
  return points;
}

export function getCirclePoint(angleDegrees: number, circleTrackRadius: number): TimingPathPoint {
  const radians = angleDegrees * Math.PI / 180;
  const radius = getCircleTrackRadius(circleTrackRadius);
  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius,
  };
}

export function getTimingPathPoints(shape: TimingTrackShape, timingHandleRange: number, circleTrackRadius: number): TimingPathPoint[] {
  if (shape === 'triangle') {
    const scale = getCircleTrackRadius(circleTrackRadius) / 196;
    return [
      { x: 0, y: 164 * scale },
      { x: 204 * scale, y: -154 * scale },
      { x: -204 * scale, y: -154 * scale },
      { x: 0, y: 164 * scale },
    ];
  }
  if (shape === 'star') {
    const { scale, offsetX, offsetY } = getTimingStarTrackLayout(circleTrackRadius);
    const points: TimingPathPoint[] = [];
    for (let i = 0; i < 10; i++) {
      const angleDeg = 90 - i * 36;
      const angle = angleDeg * Math.PI / 180;
      const r = getTimingStarVertexRadius(i, scale);
      points.push({
        x: Math.cos(angle) * r + offsetX,
        y: Math.sin(angle) * r + offsetY,
      });
    }
    points.push({ ...points[0] });
    return points;
  }
  if (shape === 'infinity') {
    const { scale, offsetX, offsetY } = getTimingInfinityTrackLayout(circleTrackRadius);
    return buildInfinityTrackPoints(scale, offsetX, offsetY);
  }
  if (shape === 'path') {
    return [
      { x: -264, y: -18 },
      { x: -162, y: 80 },
      { x: -78, y: -82 },
      { x: 0, y: 20 },
      { x: 84, y: -54 },
      { x: 174, y: 84 },
      { x: 264, y: -22 },
      { x: 174, y: 84 },
      { x: 84, y: -54 },
      { x: 0, y: 20 },
      { x: -78, y: -82 },
      { x: -162, y: 80 },
      { x: -264, y: -18 },
    ];
  }
  return [
    { x: -timingHandleRange, y: 0 },
    { x: timingHandleRange, y: 0 },
    { x: -timingHandleRange, y: 0 },
  ];
}

export function getPathLength(shape: TimingTrackShape, timingHandleRange: number, circleTrackRadius: number): number {
  const points = getTimingPathPoints(shape, timingHandleRange, circleTrackRadius);
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return Math.max(1, length);
}

export function getPathPointAtProgress(
  shape: TimingTrackShape,
  progress: number,
  timingHandleRange: number,
  circleTrackRadius: number,
): TimingPathPoint {
  const points = getTimingPathPoints(shape, timingHandleRange, circleTrackRadius);
  const length = getPathLength(shape, timingHandleRange, circleTrackRadius);
  let cursor = normalizeTrackProgress(progress) * length;
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const current = points[i];
    const segmentLength = Math.hypot(current.x - previous.x, current.y - previous.y);
    if (cursor <= segmentLength || i === points.length - 1) {
      const ratio = segmentLength <= 0 ? 0 : Math.max(0, Math.min(1, cursor / segmentLength));
      return {
        x: previous.x + (current.x - previous.x) * ratio,
        y: previous.y + (current.y - previous.y) * ratio,
      };
    }
    cursor -= segmentLength;
  }
  return points[0];
}

export function getTimingTargetConfig(
  kind: TimingTargetKind,
  size: TimingPointSize,
  stability: BottleHeroBalanceConfig['stability'],
): TimingTargetLayoutConfig {
  const starConfigs: Record<TimingPointSize, TimingTargetLayoutConfig> = {
    small: { visualSize: 66, visualScale: 0.82, perfectRadius: 22, goodRadius: 52 },
    medium: { visualSize: 66, visualScale: 1.12, perfectRadius: 31, goodRadius: 74 },
    large: { visualSize: 66, visualScale: 1.52, perfectRadius: 42, goodRadius: 102 },
  };
  const itemConfigs: Record<TimingPointSize, TimingTargetLayoutConfig> = {
    small: { visualSize: 54, visualScale: 1, perfectRadius: 0, goodRadius: 36 },
    medium: { visualSize: 68, visualScale: 1, perfectRadius: 0, goodRadius: 46 },
    large: { visualSize: 82, visualScale: 1, perfectRadius: 0, goodRadius: 56 },
  };
  const config = kind === 'star' ? starConfigs[size] : itemConfigs[size];
  if (kind !== 'star') {
    return config;
  }
  return {
    ...config,
    perfectRadius: config.perfectRadius * stability.perfectRadiusScale,
    goodRadius: config.goodRadius * stability.goodRadiusScale,
  };
}

export function getCircleTimingTargetConfig(
  kind: TimingTargetKind,
  size: TimingPointSize,
  stability: BottleHeroBalanceConfig['stability'],
): TimingTargetLayoutConfig {
  const config = getTimingTargetConfig(kind, size, stability);
  const starWindows: Record<TimingPointSize, { perfectRadius: number; goodRadius: number }> = {
    small: { perfectRadius: 7, goodRadius: 18 },
    medium: { perfectRadius: 9, goodRadius: 23 },
    large: { perfectRadius: 11, goodRadius: 27 },
  };
  const itemWindows: Record<TimingPointSize, { perfectRadius: number; goodRadius: number }> = {
    small: { perfectRadius: 0, goodRadius: 18 },
    medium: { perfectRadius: 0, goodRadius: 22 },
    large: { perfectRadius: 0, goodRadius: 26 },
  };
  const window = kind === 'star' ? starWindows[size] : itemWindows[size];
  return {
    ...config,
    perfectRadius: kind === 'star' ? window.perfectRadius * stability.perfectRadiusScale : window.perfectRadius,
    goodRadius: kind === 'star' ? window.goodRadius * stability.goodRadiusScale : window.goodRadius,
  };
}

export function pickTimingTrackShape(stageState: ActiveStageState, balanceConfig: BottleHeroBalanceConfig): TimingTrackShape {
  const trackMode: TimingTrackMode = stageState.stage.trackMode;
  if (trackMode === 'line') {
    return 'line';
  }
  if (trackMode === 'circle') {
    return 'circle';
  }
  if (trackMode === 'triangle') {
    return 'triangle';
  }
  if (trackMode === 'path') {
    return 'path';
  }
  if (trackMode === 'star') {
    return 'star';
  }
  if (trackMode === 'infinity') {
    return 'infinity';
  }
  const activeLevelId = getActiveLevelId();
  const pool: TimingTrackShape[] = trackMode === 'randomBasic'
    ? ['line', 'circle', 'triangle']
    : trackMode === 'randomCore'
      ? ['line', 'circle', 'triangle', 'path']
      : (activeLevelId === 'level_01' || activeLevelId === 'level_03'
          ? ['line', 'circle', 'triangle', 'path']
          : ['line', 'circle', 'triangle', 'path', 'star', 'infinity']);
  const pressure = stageState.dynamic.pressure / Math.max(1, balanceConfig.dynamic.maxPressure);
  const pressureIndex = Math.min(pool.length - 1, Math.floor(pressure * pool.length));
  return pool[Math.floor(Math.random() * pool.length + pressureIndex) % pool.length];
}

export function pickTimingTargetSize(difficultyRatio: number): TimingPointSize {
  const smallChance = 0.18 + difficultyRatio * 0.28;
  const mediumChance = 0.58 - difficultyRatio * 0.08;
  const roll = Math.random();
  if (roll < smallChance) {
    return 'small';
  }
  if (roll < smallChance + mediumChance) {
    return 'medium';
  }
  return 'large';
}

export function pickTimingPointTier(balanceConfig: BottleHeroBalanceConfig, stageState: ActiveStageState): TimingPointTierId {
  const stageIndex = getStageOrderIndex(stageState.stage.id);
  const pool = balanceConfig.timingPointTiers.filter(
    (tier) => tier.enabled && tier.baseWeight > 0 && getStageOrderIndex(tier.stageUnlock) <= stageIndex,
  );
  const fallback = balanceConfig.timingPointTiers.find((tier) => tier.id === 'normal') || balanceConfig.timingPointTiers[0];
  if (!pool.length) {
    return fallback?.id || 'normal';
  }
  const total = pool.reduce((sum, tier) => sum + Math.max(0, tier.baseWeight), 0);
  let roll = Math.random() * Math.max(0.001, total);
  for (const tier of pool) {
    roll -= Math.max(0, tier.baseWeight);
    if (roll <= 0) {
      return tier.id;
    }
  }
  return pool[pool.length - 1].id;
}

export function pickTimingTargetX(radius: number, reserved: number[], timingPointRange: number): number {
  const minX = -timingPointRange;
  const maxX = timingPointRange;
  let fallback = randomRange(minX, maxX);
  let fallbackDistance = -1;
  for (let attempt = 0; attempt < 48; attempt++) {
    const candidate = randomRange(minX, maxX);
    const nearestDistance = reserved.length
      ? Math.min(...reserved.map((x) => Math.abs(candidate - x)))
      : Number.POSITIVE_INFINITY;
    if (nearestDistance > fallbackDistance) {
      fallback = candidate;
      fallbackDistance = nearestDistance;
    }
    const overlaps = reserved.some((x) => Math.abs(candidate - x) < Math.max(126, radius + 76));
    if (!overlaps) {
      return candidate;
    }
  }
  return fallback;
}

export function pickTimingTargetAngle(radius: number, reserved: number[]): number {
  let fallback = randomRange(0, 360);
  let fallbackDistance = -1;
  const minGap = Math.max(34, radius + 18);
  for (let attempt = 0; attempt < 64; attempt++) {
    const candidate = randomRange(0, 360);
    const nearestDistance = reserved.length
      ? Math.min(...reserved.map((angle) => getAngleDistance(candidate, angle)))
      : Number.POSITIVE_INFINITY;
    if (nearestDistance > fallbackDistance) {
      fallback = candidate;
      fallbackDistance = nearestDistance;
    }
    const overlaps = reserved.some((angle) => getAngleDistance(candidate, angle) < minGap);
    if (!overlaps) {
      return candidate;
    }
  }
  return fallback;
}

export function pickTimingTargetProgress(
  radius: number,
  reserved: number[],
  trackShape: TimingTrackShape,
  timingHandleRange: number,
  circleTrackRadius: number,
): number {
  let fallback = Math.random();
  let fallbackDistance = -1;
  const pathLength = getPathLength(trackShape, timingHandleRange, circleTrackRadius);
  const minGap = Math.max(0.16, (radius + 92) / Math.max(1, pathLength));
  for (let attempt = 0; attempt < 72; attempt++) {
    const candidate = Math.random();
    const nearestDistance = reserved.length
      ? Math.min(...reserved.map((progress) => getProgressDistance(candidate, progress)))
      : Number.POSITIVE_INFINITY;
    if (nearestDistance > fallbackDistance) {
      fallback = candidate;
      fallbackDistance = nearestDistance;
    }
    const overlaps = reserved.some((progress) => getProgressDistance(candidate, progress) < minGap);
    if (!overlaps) {
      return candidate;
    }
  }
  return fallback;
}

export function shuffleTimingTargetKinds(kinds: TimingTargetKind[]): TimingTargetKind[] {
  const result = kinds.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getCircleHandleHitPadding(handleScale: number): number {
  return Math.max(2, 4.5 * handleScale);
}

export function getTimingTargetDistance(
  trackShape: TimingTrackShape,
  handleX: number,
  handleY: number,
  handleAngle: number,
  handleScale: number,
  handleHitPadding: number,
  target: Pick<TimingHitTargetSnapshot, 'x' | 'y' | 'angle'>,
): number {
  if (trackShape === 'circle') {
    return Math.max(0, getAngleDistance(handleAngle, target.angle) - getCircleHandleHitPadding(handleScale));
  }
  if (isPathTimingTrack(trackShape)) {
    return Math.max(0, Math.hypot(handleX - target.x, handleY - target.y) - handleHitPadding * handleScale);
  }
  return Math.max(0, Math.abs(handleX - target.x) - handleHitPadding * handleScale);
}

export function normalizeTimingError(
  distance: number,
  trackShape: TimingTrackShape,
  timingHandleRange: number,
): number {
  if (trackShape === 'circle') {
    return distance / 90;
  }
  if (isPathTimingTrack(trackShape)) {
    return distance / 180;
  }
  return distance / timingHandleRange;
}

export function resolveTimingThrow(input: {
  trackShape: TimingTrackShape;
  handleX: number;
  handleY: number;
  handleAngle: number;
  handleScale: number;
  handleHitPadding: number;
  timingHandleRange: number;
  extraErrorPixels: number;
  targets: TimingHitTargetSnapshot[];
}): TimingHitResolution {
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  const activeHitPadding = input.handleHitPadding * input.handleScale;
  const extraErrorDegrees = input.extraErrorPixels / Math.max(1, input.timingHandleRange) * 28;
  for (let i = 0; i < input.targets.length; i++) {
    const target = input.targets[i];
    const distance = input.trackShape === 'circle'
      ? Math.max(0, getAngleDistance(input.handleAngle, target.angle) - getCircleHandleHitPadding(input.handleScale)) + extraErrorDegrees
      : (isPathTimingTrack(input.trackShape)
        ? Math.max(0, Math.hypot(input.handleX - target.x, input.handleY - target.y) - activeHitPadding) + input.extraErrorPixels
        : Math.max(0, Math.abs(input.handleX - target.x) - activeHitPadding) + input.extraErrorPixels);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  if (bestIndex < 0) {
    return {
      kind: 'miss',
      targetIndex: -1,
      pointX: input.handleX,
      pointY: input.handleY,
      distance: bestDistance,
      normalizedError: 1,
    };
  }

  const bestTarget = input.targets[bestIndex];
  if (bestDistance > bestTarget.goodRadius) {
    return {
      kind: 'miss',
      targetIndex: bestIndex,
      pointX: input.handleX,
      pointY: input.handleY,
      distance: bestDistance,
      normalizedError: 1,
    };
  }

  if (bestTarget.kind !== 'star') {
    return {
      kind: 'timingItem',
      targetIndex: bestIndex,
      pointX: bestTarget.x,
      pointY: bestTarget.y,
      distance: bestDistance,
      normalizedError: normalizeTimingError(bestDistance, input.trackShape, input.timingHandleRange),
    };
  }

  if (bestDistance <= bestTarget.perfectRadius) {
    return {
      kind: 'perfect',
      targetIndex: bestIndex,
      pointX: bestTarget.x,
      pointY: bestTarget.y,
      distance: bestDistance,
      normalizedError: normalizeTimingError(bestDistance, input.trackShape, input.timingHandleRange),
    };
  }

  return {
    kind: 'good',
    targetIndex: bestIndex,
    pointX: bestTarget.x,
    pointY: bestTarget.y,
    distance: bestDistance,
    normalizedError: normalizeTimingError(bestDistance, input.trackShape, input.timingHandleRange),
  };
}

export function getTimingPointTierScore(
  balanceConfig: BottleHeroBalanceConfig,
  tierId: TimingPointTierId | null,
): number {
  if (!tierId) {
    return balanceConfig.combo.perfectBaseScore;
  }
  const tier = balanceConfig.timingPointTiers.find((entry) => entry.id === tierId);
  return tier ? tier.score : balanceConfig.combo.perfectBaseScore;
}

export function getPerfectComboScore(balanceConfig: BottleHeroBalanceConfig, combo: number, baseScore?: number): number {
  const comboConfig = balanceConfig.combo;
  const scoreBase = baseScore ?? comboConfig.perfectBaseScore;
  return Math.round(scoreBase * Math.min(combo, comboConfig.perfectMultiplierCap));
}

export function getGoodTimingPointScore(balanceConfig: BottleHeroBalanceConfig, baseScore?: number): number {
  const comboConfig = balanceConfig.combo;
  const scoreBase = baseScore ?? comboConfig.perfectBaseScore;
  const ratio = comboConfig.perfectBaseScore <= 0 ? 0 : comboConfig.goodScore / comboConfig.perfectBaseScore;
  return Math.round(scoreBase * Math.max(0, ratio));
}

export function getDifficultyRatio(difficulty: number): number {
  return Math.max(0, Math.min(1, difficulty / 100));
}

export function computeDifficulty(
  stageIndex: number,
  dynamicPressure: number,
  dynamicAssist: number,
  bottleCount: number,
): number {
  return Math.min(100, stageIndex * 22 + dynamicPressure - dynamicAssist * 0.5 + Math.min(14, bottleCount * 0.35));
}
