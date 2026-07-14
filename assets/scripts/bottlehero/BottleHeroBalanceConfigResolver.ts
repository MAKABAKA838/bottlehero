import { BottleHeroBalanceConfig, mergeBalanceConfig } from './BottleHeroBalance';
import { isBalanceOverrideEnabled } from './BottleHeroBuildFlags';
import type { LevelId } from './BottleHeroGameConfig';
import { readDebugBalanceOverride } from './BottleHeroStorage';

export interface ResolvedBalanceConfig {
  balanceConfig: BottleHeroBalanceConfig;
  localDebugConfigActive: boolean;
}

export function readUrlBalanceConfig(): string | null {
  if (!isBalanceOverrideEnabled() || typeof window === 'undefined') {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('bhBalance') || params.get('balance');
  if (!encoded) {
    return null;
  }
  try {
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padding = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + (padding === 0 ? '' : padding === 1 ? '=' : padding === 2 ? '==' : '===');
    const binary = window.atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (error) {
    console.warn('BottleHero URL balance config could not be decoded.', error);
    return null;
  }
}

export async function readRemoteBalanceConfig(): Promise<string | null> {
  if (!isBalanceOverrideEnabled() || typeof window === 'undefined' || typeof window.fetch === 'undefined') {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  const configId = params.get('cfg');
  if (!configId) {
    return null;
  }
  const safeConfigId = configId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeConfigId) {
    return null;
  }
  try {
    const cacheTag = params.get('v') || String(Date.now());
    const response = await window.fetch(`balance-configs/${safeConfigId}.json?v=${encodeURIComponent(cacheTag)}`);
    if (!response.ok) {
      console.warn('BottleHero remote balance config not found:', safeConfigId, response.status);
      return null;
    }
    return await response.text();
  } catch (error) {
    console.warn('BottleHero remote balance config failed:', safeConfigId, error);
    return null;
  }
}

export async function resolveBalanceConfig(
  packagedBase: BottleHeroBalanceConfig,
  levelId: LevelId = 'level_01',
): Promise<ResolvedBalanceConfig> {
  if (!isBalanceOverrideEnabled()) {
    return {
      balanceConfig: mergeBalanceConfig(packagedBase),
      localDebugConfigActive: false,
    };
  }
  const remoteConfig = await readRemoteBalanceConfig();
  const urlConfig = readUrlBalanceConfig();
  const rawConfig = urlConfig || remoteConfig || readDebugBalanceOverride(levelId);
  if (!rawConfig) {
    return {
      balanceConfig: mergeBalanceConfig(packagedBase),
      localDebugConfigActive: false,
    };
  }
  try {
    const parsedConfig = JSON.parse(rawConfig) as Partial<BottleHeroBalanceConfig>;
    return {
      balanceConfig: mergeBalanceConfig(parsedConfig, packagedBase),
      localDebugConfigActive: Boolean(urlConfig || remoteConfig || rawConfig),
    };
  } catch (error) {
    console.warn('BottleHero debug local config could not be parsed.', error);
    return {
      balanceConfig: mergeBalanceConfig(packagedBase),
      localDebugConfigActive: false,
    };
  }
}
