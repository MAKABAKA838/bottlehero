import { sys } from 'cc';
import type { LevelId } from './BottleHeroGameConfig';

/**
 * 平台适配层骨架（阶段 6）。
 * Web 桌面/浏览器当前为完整实现路径；微信 / 抖音仅检测与占位，不改变玩法手感。
 */

export type BottleHeroPlatformId = 'web' | 'wechat_minigame' | 'douyin_minigame' | 'unknown';

export type BottleHeroSubpackageId = 'core' | LevelId | 'boss_shared';

export type BottleHeroSubpackageResult = 'ready' | 'noop' | 'unsupported' | 'error';

export interface BottleHeroSubpackageSpec {
  id: BottleHeroSubpackageId;
  /** 逻辑分包标签；真机小游戏再映射到 wx/tt loadSubpackage。 */
  labels: string[];
}

declare const wx: { loadSubpackage?: (opts: { name: string; success?: () => void; fail?: (err: unknown) => void }) => void } | undefined;
declare const tt: { loadSubpackage?: (opts: { name: string; success?: () => void; fail?: (err: unknown) => void }) => void } | undefined;

let audioUnlocked = false;

export function detectBottleHeroPlatform(): BottleHeroPlatformId {
  const globalScope = globalThis as Record<string, unknown>;
  if (typeof globalScope.wx === 'object' && globalScope.wx !== null) {
    return 'wechat_minigame';
  }
  if (typeof globalScope.tt === 'object' && globalScope.tt !== null) {
    return 'douyin_minigame';
  }
  if (sys.isBrowser || sys.platform === sys.Platform.DESKTOP_BROWSER || sys.platform === sys.Platform.MOBILE_BROWSER) {
    return 'web';
  }
  return 'unknown';
}

/**
 * 在首次用户手势中解锁音频（移动浏览器 AudioContext / 小游戏策略占位）。
 * 幂等；失败时返回 false，调用方仍可继续播已有 AudioSource。
 */
export async function unlockBottleHeroAudio(): Promise<boolean> {
  if (audioUnlocked) {
    return true;
  }
  const platform = detectBottleHeroPlatform();
  try {
    if (platform === 'web' || platform === 'unknown') {
      const AudioCtx = (globalThis as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      }).AudioContext
        || (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        // 立即关闭探测用 context，真实播放仍走 Cocos AudioSource。
        await ctx.close?.();
      }
    }
    // 微信 / 抖音：留空，待接 InnerAudioContext 静音播放解锁。
    audioUnlocked = true;
    return true;
  } catch (error) {
    console.warn('BottleHero audio unlock failed', error);
    return false;
  }
}

export function isBottleHeroAudioUnlocked(): boolean {
  return audioUnlocked;
}

/** 逻辑分包规划：与按关预加载对齐，真机再拆物理包。 */
export function getBottleHeroSubpackagePlan(): BottleHeroSubpackageSpec[] {
  return [
    { id: 'core', labels: ['ui', 'timing', 'avatar', 'audio-core'] },
    { id: 'level_01', labels: ['backgrounds/level_01', 'ambient/level_01', 'throw/level_01'] },
    { id: 'level_02', labels: ['backgrounds/level_02', 'ambient/level_02', 'throw/level_02'] },
    { id: 'level_03', labels: ['backgrounds/level_03', 'ambient/level_03', 'throw/level_03'] },
    { id: 'boss_shared', labels: ['boss/ui', 'boss/sheets'] },
  ];
}

/**
 * 确保逻辑分包可用。Web / 当前打包：资源已在 resources，直接 ready。
 * 小游戏：占位调用 loadSubpackage（若宿主未提供则 unsupported）。
 */
export async function ensureBottleHeroSubpackage(id: BottleHeroSubpackageId): Promise<BottleHeroSubpackageResult> {
  const platform = detectBottleHeroPlatform();
  if (platform === 'web' || platform === 'unknown') {
    return 'ready';
  }

  const loader = platform === 'wechat_minigame'
    ? (typeof wx !== 'undefined' ? wx?.loadSubpackage : undefined)
    : (typeof tt !== 'undefined' ? tt?.loadSubpackage : undefined);

  if (!loader) {
    return 'unsupported';
  }

  return new Promise((resolve) => {
    try {
      loader({
        name: id,
        success: () => resolve('ready'),
        fail: (err) => {
          console.warn('BottleHero subpackage load failed', id, err);
          resolve('error');
        },
      });
    } catch (error) {
      console.warn('BottleHero subpackage load threw', id, error);
      resolve('error');
    }
  });
}

/** 开局前确保核心 + 关卡 + Boss 共用分包（Web 为 noop/ready）。 */
export async function ensureBottleHeroLevelPackages(levelId: LevelId): Promise<void> {
  await ensureBottleHeroSubpackage('core');
  await ensureBottleHeroSubpackage(levelId);
  await ensureBottleHeroSubpackage('boss_shared');
}
