import { AudioClip, ImageAsset, Rect, resources, SpriteFrame, Texture2D } from 'cc';
import { toResourcesPath } from './BottleHeroAssetPaths';
import type { SpriteSheetPreviewAsset } from './BottleHeroTypes';

export type SpriteSheetFrameCache = Record<string, SpriteFrame[]>;

/** 底层资源 IO：换平台或单测时可替换实现，玩法模块不直接依赖 `resources.load`。 */
export interface BottleHeroResourceLoaderBackend {
  loadSprite(resourcesPath: string): Promise<SpriteFrame>;
  loadRemoteSprite(webPath: string): Promise<SpriteFrame>;
  loadSpriteList(paths: readonly string[]): Promise<SpriteFrame[]>;
  loadAudio(resourcesPath: string): Promise<AudioClip>;
  loadSpriteSheetPreviewFrames(
    asset: SpriteSheetPreviewAsset,
    cache: SpriteSheetFrameCache,
  ): Promise<SpriteFrame[]>;
}

function createSpriteFrameFromImageAsset(imageAsset: ImageAsset): SpriteFrame {
  return SpriteFrame.createWithImage(imageAsset);
}

export function loadSprite(path: string): Promise<SpriteFrame> {
  return new Promise((resolve) => {
    let completed = false;
    const timeoutId = setTimeout(() => {
      if (!completed) {
        completed = true;
        console.warn('BottleHero local texture load timeout, using empty frame:', path);
        resolve(new SpriteFrame());
      }
    }, 2500);
    resources.load(path, ImageAsset, (error, imageAsset) => {
      if (completed) {
        return;
      }
      completed = true;
      clearTimeout(timeoutId);
      if (error || !imageAsset) {
        console.warn('BottleHero local texture not found, using empty frame:', path, error);
        resolve(new SpriteFrame());
        return;
      }
      resolve(createSpriteFrameFromImageAsset(imageAsset));
    });
  });
}

export function loadRemoteSprite(webPath: string): Promise<SpriteFrame> {
  return loadSprite(toResourcesPath(webPath));
}

export async function loadSpriteList(paths: readonly string[]): Promise<SpriteFrame[]> {
  const frames: SpriteFrame[] = [];
  for (const path of paths) {
    frames.push(await loadSprite(path));
  }
  return frames;
}

export function loadAudio(path: string): Promise<AudioClip> {
  return new Promise((resolve, reject) => {
    resources.load(path, AudioClip, (error, clip) => {
      if (error || !clip) {
        reject(error || new Error(`Audio not found: ${path}`));
        return;
      }
      resolve(clip);
    });
  });
}

export function loadImageAssetFromResources(webPath: string): Promise<ImageAsset> {
  return new Promise((resolve, reject) => {
    resources.load(toResourcesPath(webPath), ImageAsset, (error, imageAsset) => {
      if (error || !imageAsset) {
        reject(error || new Error(`Image not found: ${webPath}`));
        return;
      }
      resolve(imageAsset);
    });
  });
}

export async function loadSpriteSheetPreviewFrames(
  asset: SpriteSheetPreviewAsset,
  cache: SpriteSheetFrameCache,
): Promise<SpriteFrame[]> {
  const cachedFrames = cache[asset.id];
  if (cachedFrames) {
    return cachedFrames;
  }
  try {
    if (asset.frameFiles && asset.frameFiles.length > 0) {
      const frames: SpriteFrame[] = [];
      for (const file of asset.frameFiles) {
        const imageAsset = await loadImageAssetFromResources(file);
        frames.push(createSpriteFrameFromImageAsset(imageAsset));
      }
      cache[asset.id] = frames;
      return frames;
    }
    const imageAsset = await loadImageAssetFromResources(asset.file);
    const texture = new Texture2D();
    texture.image = imageAsset;
    const cellIndices = asset.frameCellIndices ?? Array.from({ length: asset.frameCount }, (_, index) => index);
    const gridCellCount = asset.frameCellIndices?.length
      ? Math.max(...cellIndices) + 1
      : asset.frameCount;
    const rowCount = Math.max(1, Math.ceil(gridCellCount / Math.max(1, asset.columns)));
    const imageWidth = Number((imageAsset as unknown as { width?: number }).width ?? 0);
    const imageHeight = Number((imageAsset as unknown as { height?: number }).height ?? 0);
    const configuredSheetWidth = asset.frameWidth * asset.columns;
    const configuredSheetHeight = asset.frameHeight * rowCount;
    const useAutoFrameSize = imageWidth > 0
      && imageHeight > 0
      && (configuredSheetWidth !== imageWidth || configuredSheetHeight !== imageHeight);
    const frameWidth = useAutoFrameSize
      ? Math.floor(imageWidth / Math.max(1, asset.columns))
      : asset.frameWidth;
    const frameHeight = useAutoFrameSize
      ? Math.floor(imageHeight / rowCount)
      : asset.frameHeight;
    if (useAutoFrameSize) {
      console.warn(
        'BottleHero sprite sheet frame size auto-corrected:',
        asset.id,
        `configured=${asset.frameWidth}x${asset.frameHeight}`,
        `actual=${frameWidth}x${frameHeight}`,
        `sheet=${imageWidth}x${imageHeight}`,
      );
    }
    const frames: SpriteFrame[] = [];
    for (const cellIndex of cellIndices) {
      const column = cellIndex % asset.columns;
      const row = Math.floor(cellIndex / asset.columns);
      const frame = new SpriteFrame();
      frame.texture = texture;
      frame.rect = new Rect(column * frameWidth, row * frameHeight, frameWidth, frameHeight);
      frames.push(frame);
    }
    cache[asset.id] = frames;
    return frames;
  } catch (error) {
    console.warn('BottleHero sprite sheet missing, using empty frames:', asset.file, error);
    return [];
  }
}

export const bottleHeroCocosResourceLoader: BottleHeroResourceLoaderBackend = {
  loadSprite,
  loadRemoteSprite,
  loadSpriteList,
  loadAudio,
  loadSpriteSheetPreviewFrames,
};
