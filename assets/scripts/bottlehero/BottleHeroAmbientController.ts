import { Color, Node, Sprite, SpriteFrame } from 'cc';
import { isLevel03AmbientVariantActive, LEVEL_03_AMBIENT_VARIANTS } from './BottleHeroGameConfig';
import type { LevelId } from './BottleHeroGameConfig';
import { randomRange } from './BottleHeroMathUtil';
import { createSpriteNode, getSpriteSizeForWidth } from './BottleHeroUiFactory';
import { AmbientActorDepth, AmbientActorKind, AmbientActorState, AmbientCandyFlightBand } from './BottleHeroTypes';

export interface AmbientHost {
  getLevelId(): LevelId;
  getDesignWidth(): number;
  getDesignHeight(): number;
  getBottleCount(): number;
  isScene03BridgeAdded(): boolean;
  isScene04BridgeAdded(): boolean;
  getScene04HeightThreshold(): number;
  getAmbientBackLayer(): Node;
  getAmbientFrontLayer(): Node;
  getSprite(spriteKey: string): SpriteFrame | null | undefined;
}

type FishDepthBand = 'deep' | 'mid' | 'surface';

interface FishVariantDefinition {
  key: string;
  depthBand: FishDepthBand;
  minBottleCount?: number;
  maxBottleCount?: number;
}

export class BottleHeroAmbientController {
  private ambientActors: AmbientActorState[] = [];
  private beeAmbientCooldown = 2.4;
  private fishAmbientCooldown = 3.2;
  private candyAmbientCooldown = 3.2;
  private birdAmbientCooldown = 6.8;
  private alienAmbientCooldown = 10.5;
  private readonly fishVariants: FishVariantDefinition[] = [
    { key: 'ambientFishAngler', depthBand: 'deep', minBottleCount: 0, maxBottleCount: 10 },
    { key: 'ambientFishViper', depthBand: 'deep', minBottleCount: 0, maxBottleCount: 14 },
    { key: 'ambientFishSquid', depthBand: 'mid', minBottleCount: 8, maxBottleCount: 24 },
    { key: 'ambientFish', depthBand: 'mid', minBottleCount: 10, maxBottleCount: 30 },
    { key: 'ambientFishSunfish', depthBand: 'surface', minBottleCount: 20 },
    { key: 'ambientFishArowana', depthBand: 'surface', minBottleCount: 24 },
  ];

  constructor(private readonly host: AmbientHost) {}

  private isLevel03Ambient(): boolean {
    return this.host.getLevelId() === 'level_03';
  }

  private getFishDepthBand(variantKey?: string): FishDepthBand | undefined {
    if (!variantKey) {
      return undefined;
    }
    return this.fishVariants.find((variant) => variant.key === variantKey)?.depthBand;
  }

  private getCandyFlightBand(variantKey?: string): AmbientCandyFlightBand | undefined {
    if (!variantKey) {
      return undefined;
    }
    return LEVEL_03_AMBIENT_VARIANTS.find((variant) => variant.key === variantKey)?.flightBand;
  }

  private getMovementBand(actor: AmbientActorState): FishDepthBand | undefined {
    if (actor.kind === 'fish') {
      return this.getFishDepthBand(actor.variant);
    }
    if (actor.kind === 'candy') {
      const flightBand = this.getCandyFlightBand(actor.variant);
      if (flightBand === 'low') {
        return 'deep';
      }
      if (flightBand === 'high') {
        return 'surface';
      }
      return 'mid';
    }
    return undefined;
  }

  clear(): void {
    for (const actor of this.ambientActors) {
      if (actor.node.isValid) {
        actor.node.destroy();
      }
    }
    this.ambientActors = [];
    this.beeAmbientCooldown = randomRange(2.2, 4.6);
    this.fishAmbientCooldown = randomRange(2.2, 4.6);
    this.candyAmbientCooldown = randomRange(2.2, 4.6);
    this.birdAmbientCooldown = randomRange(5.4, 8.2);
    this.alienAmbientCooldown = randomRange(8.5, 12.5);
  }

  update(deltaTime: number): void {
    this.updateSpawns(deltaTime);
    const halfWidth = this.host.getDesignWidth() * 0.5;
    this.ambientActors = this.ambientActors.filter((actor) => {
      if (!actor.node.isValid) {
        return false;
      }
      actor.life += deltaTime;
      const movementBand = this.getMovementBand(actor);
      actor.phase += deltaTime * this.getActorPhaseSpeed(actor.kind, movementBand);
      const x = actor.node.position.x + actor.direction * actor.speed * deltaTime;
      const y = actor.baseY + Math.sin(actor.phase) * actor.amplitude + actor.verticalDrift * (actor.life / actor.maxLife);
      const scalePulse = actor.baseScale * (1 + Math.sin(actor.phase * 1.7) * this.getActorScaleWobble(actor.kind, movementBand));
      actor.node.setPosition(x, y, 0);
      const facingScale = this.getActorFacingScale(actor.kind, actor.direction, scalePulse, actor.variant);
      actor.node.setScale(facingScale, scalePulse, 1);
      actor.node.setRotationFromEuler(0, 0, Math.sin(actor.phase * 0.8) * actor.rotationAmplitude);

      const fadeIn = Math.min(1, actor.life / 0.45);
      const fadeOut = Math.min(1, Math.max(0, (actor.maxLife - actor.life) / 0.7));
      const alphaBase = actor.depth === 'front'
        ? 218
        : actor.kind === 'alien'
          ? 192
          : actor.kind === 'fish' || actor.kind === 'candy'
            ? 168
            : 178;
      actor.sprite.color = new Color(255, 255, 255, Math.floor(alphaBase * Math.min(fadeIn, fadeOut)));

      const offscreen = actor.direction > 0 ? x > halfWidth + 240 : x < -halfWidth - 240;
      if (offscreen || actor.life >= actor.maxLife) {
        actor.node.destroy();
        return false;
      }
      return true;
    });
  }

  private updateSpawns(deltaTime: number): void {
    if (this.isLevel03Ambient()) {
      this.updateCandySpawns(deltaTime);
      return;
    }

    const actorCount = this.ambientActors.length;
    const beeCount = this.ambientActors.filter((actor) => actor.kind === 'bee').length;
    const fishCount = this.ambientActors.filter((actor) => actor.kind === 'fish').length;
    const birdCount = this.ambientActors.filter((actor) => actor.kind === 'bird').length;
    const alienCount = this.ambientActors.filter((actor) => actor.kind === 'alien').length;
    const hasFishAmbient = this.getAvailableFishVariants().length > 0;
    const hasBeeAmbient = Boolean(this.host.getSprite('ambientBee'));
    const hasBirdAmbient = Boolean(this.host.getSprite('ambientBird01') || this.host.getSprite('ambientBird02'));
    const hasAlienAmbient = Boolean(
      this.host.getSprite('ambientAlien01') || this.host.getSprite('ambientAlien02') || this.host.getSprite('ambientAlien03'),
    );

    if (hasFishAmbient) {
      this.fishAmbientCooldown -= deltaTime;
      if (this.shouldSpawnFish() && this.fishAmbientCooldown <= 0 && actorCount < 4 && fishCount < 2) {
        this.spawnFish();
        this.fishAmbientCooldown = randomRange(7.2, 12.8);
      }
    } else if (hasBeeAmbient && this.shouldSpawnBee()) {
      this.beeAmbientCooldown -= deltaTime;
      if (this.beeAmbientCooldown <= 0 && actorCount < 4 && beeCount < 2) {
        this.spawn('bee', Math.random() < 0.22 ? 'front' : 'back');
        this.beeAmbientCooldown = randomRange(7.2, 12.8);
      }
    } else if (!hasFishAmbient) {
      this.beeAmbientCooldown = Math.max(this.beeAmbientCooldown, 3.8);
    }

    if (!hasFishAmbient) {
      this.fishAmbientCooldown = Math.max(this.fishAmbientCooldown, 3.8);
    }

    if (hasBirdAmbient && this.shouldSpawnBird()) {
      this.birdAmbientCooldown -= deltaTime;
      if (this.birdAmbientCooldown <= 0 && actorCount < 4 && birdCount < 2) {
        this.spawn('bird', Math.random() < 0.14 ? 'front' : 'back');
        this.birdAmbientCooldown = randomRange(6.2, 10.5);
      }
    } else {
      this.birdAmbientCooldown = Math.max(this.birdAmbientCooldown, 4.6);
    }

    if (hasAlienAmbient && this.shouldSpawnAlien()) {
      this.alienAmbientCooldown -= deltaTime;
      if (this.alienAmbientCooldown <= 0 && actorCount < 4 && alienCount < 2) {
        this.spawn('alien', 'back');
        this.alienAmbientCooldown = randomRange(9.5, 15.5);
      }
    } else {
      this.alienAmbientCooldown = Math.max(this.alienAmbientCooldown, 7.5);
    }
  }

  private updateCandySpawns(deltaTime: number): void {
    this.purgeUnavailableCandyActors();
    const available = this.getAvailableCandyVariants();
    if (!available.length) {
      return;
    }
    const actorCount = this.ambientActors.length;
    const candyCount = this.ambientActors.filter((actor) => actor.kind === 'candy').length;
    this.candyAmbientCooldown -= deltaTime;
    if (this.candyAmbientCooldown <= 0 && actorCount < 4 && candyCount < 2) {
      this.spawnCandy();
      this.candyAmbientCooldown = randomRange(6.4, 10.8);
    }
  }

  private shouldSpawnFish(): boolean {
    return !this.host.isScene04BridgeAdded();
  }

  private shouldSpawnBee(): boolean {
    return this.host.getBottleCount() < 12 && !this.host.isScene03BridgeAdded();
  }

  private shouldSpawnBird(): boolean {
    return this.host.getBottleCount() >= 8 && !this.host.isScene04BridgeAdded();
  }

  private shouldSpawnAlien(): boolean {
    return this.host.isScene04BridgeAdded() || this.host.getBottleCount() >= this.host.getScene04HeightThreshold();
  }

  private getAvailableFishVariants(): FishVariantDefinition[] {
    const bottleCount = this.host.getBottleCount();
    return this.fishVariants.filter((variant) => {
      if (!this.host.getSprite(variant.key)) {
        return false;
      }
      if (variant.minBottleCount !== undefined && bottleCount < variant.minBottleCount) {
        return false;
      }
      if (variant.maxBottleCount !== undefined && bottleCount > variant.maxBottleCount) {
        return false;
      }
      return true;
    });
  }

  private getAvailableCandyVariants() {
    const bottleCount = this.host.getBottleCount();
    return LEVEL_03_AMBIENT_VARIANTS.filter((variant) => {
      if (!this.host.getSprite(variant.key)) {
        return false;
      }
      return isLevel03AmbientVariantActive(bottleCount, variant);
    });
  }

  private purgeUnavailableCandyActors(): void {
    const availableKeys = new Set(this.getAvailableCandyVariants().map((variant) => variant.key));
    this.ambientActors = this.ambientActors.filter((actor) => {
      if (actor.kind !== 'candy' || !actor.variant || availableKeys.has(actor.variant)) {
        return true;
      }
      if (actor.node.isValid) {
        actor.node.destroy();
      }
      return false;
    });
  }

  private spawnFish(): void {
    const available = this.getAvailableFishVariants();
    if (!available.length) {
      return;
    }
    const variant = available[Math.floor(Math.random() * available.length)];
    const depth: AmbientActorDepth = Math.random() < 0.22 ? 'front' : 'back';
    this.spawn('fish', depth, variant.key, variant.depthBand);
  }

  private spawnCandy(): void {
    const available = this.getAvailableCandyVariants();
    if (!available.length) {
      return;
    }
    const variant = available[Math.floor(Math.random() * available.length)];
    const depth: AmbientActorDepth = Math.random() < 0.24 ? 'front' : 'back';
    this.spawn('candy', depth, variant.key, variant.flightBand);
  }

  private spawn(
    kind: AmbientActorKind,
    depth: AmbientActorDepth,
    variantKey?: string,
    movementBand?: FishDepthBand | AmbientCandyFlightBand,
  ): void {
    const frame = this.pickFrame(kind, variantKey);
    if (!frame) {
      return;
    }
    const direction = Math.random() > 0.5 ? 1 : -1;
    const halfWidth = this.host.getDesignWidth() * 0.5;
    const resolvedBand = kind === 'candy'
      ? this.mapCandyFlightBand(movementBand as AmbientCandyFlightBand | undefined)
      : (movementBand as FishDepthBand | undefined);
    const targetWidth = this.getActorWidth(kind, depth, resolvedBand, variantKey);
    const size = getSpriteSizeForWidth(frame, targetWidth);
    const startX = direction > 0 ? -halfWidth - size.width * 0.6 : halfWidth + size.width * 0.6;
    const baseY = this.getActorY(kind, depth, resolvedBand);
    const parent = depth === 'front' ? this.host.getAmbientFrontLayer() : this.host.getAmbientBackLayer();
    const node = createSpriteNode(`Ambient_${kind}`, parent, frame, startX, baseY, size.width, size.height);
    const sprite = node.getComponent(Sprite);
    if (!sprite) {
      node.destroy();
      return;
    }
    sprite.color = new Color(255, 255, 255, 0);
    const speed = this.getActorSpeed(kind, depth, resolvedBand);
    const maxLife = (this.host.getDesignWidth() + size.width * 2) / speed + randomRange(0.8, 2.2);
    const actor: AmbientActorState = {
      node,
      sprite,
      kind,
      depth,
      variant: variantKey,
      direction,
      speed,
      baseY,
      amplitude: this.getActorAmplitude(kind, resolvedBand),
      phase: Math.random() * Math.PI * 2,
      life: 0,
      maxLife,
      baseScale: 1,
      rotationAmplitude: this.getActorRotationAmplitude(kind, resolvedBand),
      verticalDrift: this.getActorVerticalDrift(kind, resolvedBand),
    };
    this.ambientActors.push(actor);
  }

  private mapCandyFlightBand(flightBand?: AmbientCandyFlightBand): FishDepthBand | undefined {
    if (flightBand === 'low') {
      return 'deep';
    }
    if (flightBand === 'high') {
      return 'surface';
    }
    if (flightBand === 'mid') {
      return 'mid';
    }
    return undefined;
  }

  private pickFrame(kind: AmbientActorKind, variantKey?: string): SpriteFrame | null | undefined {
    if (kind === 'candy') {
      return variantKey ? this.host.getSprite(variantKey) : null;
    }
    if (kind === 'fish') {
      if (variantKey) {
        return this.host.getSprite(variantKey);
      }
      return this.host.getSprite('ambientFish');
    }
    if (kind === 'bee') {
      return this.host.getSprite('ambientBee');
    }
    if (kind === 'bird') {
      return Math.random() > 0.5 ? this.host.getSprite('ambientBird01') : this.host.getSprite('ambientBird02');
    }
    const alienFrames = [
      this.host.getSprite('ambientAlien01'),
      this.host.getSprite('ambientAlien02'),
      this.host.getSprite('ambientAlien03'),
    ];
    return alienFrames[Math.floor(Math.random() * alienFrames.length)];
  }

  private getActorFacingScale(kind: AmbientActorKind, direction: number, scale: number, variantKey?: string): number {
    const facesRightWhenPositive = kind === 'fish'
      ? variantKey === 'ambientFishSunfish'
      : kind === 'candy'
        ? variantKey !== 'ambientL03CookieUfo'
        : true;
    if (direction > 0) {
      return facesRightWhenPositive ? scale : -scale;
    }
    return facesRightWhenPositive ? -scale : scale;
  }

  private getActorPhaseSpeed(kind: AmbientActorKind, movementBand?: FishDepthBand): number {
    if (kind === 'bee' || kind === 'candy') {
      return kind === 'candy' ? 5.8 : 7.2;
    }
    if (kind === 'fish') {
      if (movementBand === 'deep') {
        return 1.6;
      }
      if (movementBand === 'surface') {
        return 3.2;
      }
      return 2.4;
    }
    if (kind === 'bird') {
      return 3.4;
    }
    return 1.4;
  }

  private getActorScaleWobble(kind: AmbientActorKind, movementBand?: FishDepthBand): number {
    if (kind === 'alien') {
      return 0.025;
    }
    if (kind === 'fish' || kind === 'candy') {
      if (movementBand === 'deep') {
        return 0.015;
      }
      if (movementBand === 'surface') {
        return 0.038;
      }
      return 0.03;
    }
    return 0.055;
  }

  private getActorSpeed(kind: AmbientActorKind, depth: AmbientActorDepth, movementBand?: FishDepthBand): number {
    if (kind === 'fish') {
      if (movementBand === 'deep') {
        return randomRange(34, 60);
      }
      if (movementBand === 'surface') {
        return randomRange(72, 122);
      }
      return randomRange(52, 88);
    }
    if (kind === 'candy') {
      if (movementBand === 'deep') {
        return randomRange(58, 96);
      }
      if (movementBand === 'surface') {
        return randomRange(96, 148);
      }
      return randomRange(74, 118);
    }
    if (kind === 'bee') {
      return randomRange(depth === 'front' ? 165 : 92, depth === 'front' ? 235 : 142);
    }
    if (kind === 'bird') {
      return randomRange(depth === 'front' ? 145 : 86, depth === 'front' ? 210 : 136);
    }
    return randomRange(30, 58);
  }

  private getActorAmplitude(kind: AmbientActorKind, movementBand?: FishDepthBand): number {
    if (kind === 'fish' || kind === 'candy') {
      if (movementBand === 'deep') {
        return randomRange(5, 14);
      }
      if (movementBand === 'surface') {
        return randomRange(16, 34);
      }
      return randomRange(10, 28);
    }
    if (kind === 'bee') {
      return randomRange(22, 72);
    }
    if (kind === 'bird') {
      return randomRange(18, 52);
    }
    return randomRange(28, 68);
  }

  private getActorRotationAmplitude(kind: AmbientActorKind, movementBand?: FishDepthBand): number {
    if (kind === 'fish' || kind === 'candy') {
      if (movementBand === 'deep') {
        return 1.5;
      }
      if (movementBand === 'surface') {
        return 4.5;
      }
      return 3;
    }
    if (kind === 'bee') {
      return 10;
    }
    if (kind === 'bird') {
      return 7;
    }
    return 4;
  }

  private getActorVerticalDrift(kind: AmbientActorKind, movementBand?: FishDepthBand): number {
    if (kind === 'fish' || kind === 'candy') {
      if (movementBand === 'deep') {
        return randomRange(-8, 8);
      }
      if (movementBand === 'surface') {
        return randomRange(-30, 30);
      }
      return randomRange(-18, 18);
    }
    if (kind === 'alien') {
      return randomRange(-80, 80);
    }
    return randomRange(-34, 34);
  }

  private getCandyVariantWidth(variantKey: string | undefined, depth: AmbientActorDepth): number | undefined {
    if (!variantKey) {
      return undefined;
    }
    const variant = LEVEL_03_AMBIENT_VARIANTS.find((entry) => entry.key === variantKey);
    if (!variant) {
      return undefined;
    }
    const [min, max] = depth === 'front' ? variant.displayWidth.front : variant.displayWidth.back;
    return randomRange(min, max);
  }

  private getActorWidth(
    kind: AmbientActorKind,
    depth: AmbientActorDepth,
    movementBand?: FishDepthBand,
    variantKey?: string,
  ): number {
    if (kind === 'fish') {
      if (movementBand === 'deep') {
        return depth === 'front' ? randomRange(196, 264) : randomRange(156, 228);
      }
      if (movementBand === 'surface') {
        return depth === 'front' ? randomRange(256, 372) : randomRange(192, 296);
      }
      return randomRange(192, 296);
    }
    if (kind === 'candy') {
      const variantWidth = this.getCandyVariantWidth(variantKey, depth);
      if (variantWidth !== undefined) {
        return variantWidth;
      }
      if (movementBand === 'deep') {
        return depth === 'front' ? randomRange(108, 148) : randomRange(88, 128);
      }
      if (movementBand === 'surface') {
        return depth === 'front' ? randomRange(168, 248) : randomRange(132, 204);
      }
      return depth === 'front' ? randomRange(132, 196) : randomRange(108, 168);
    }
    if (kind === 'bee') {
      return depth === 'front' ? randomRange(116, 152) : randomRange(72, 104);
    }
    if (kind === 'bird') {
      return depth === 'front' ? randomRange(120, 158) : randomRange(118, 185);
    }
    return randomRange(138, 230);
  }

  private getActorY(kind: AmbientActorKind, depth: AmbientActorDepth, movementBand?: FishDepthBand): number {
    if (kind === 'fish' || kind === 'candy') {
      if (kind === 'candy' && movementBand === 'surface') {
        return depth === 'front' ? randomRange(-120, 280) : randomRange(40, 420);
      }
      return depth === 'front' ? randomRange(-280, 300) : randomRange(-30, 470);
    }
    if (kind === 'bee') {
      return depth === 'front' ? randomRange(-280, 300) : randomRange(-30, 470);
    }
    if (kind === 'bird') {
      return depth === 'front' ? randomRange(-80, 350) : randomRange(70, 560);
    }
    return randomRange(120, 540);
  }
}
