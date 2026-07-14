import { EDITOR, PREVIEW } from 'cc/env';

/**
 * 构建期与运行时开关：区分内部测试包与外部玩家包。
 *
 * - 发布玩家包前保持 `BOTTLEHERO_INTERNAL_TOOLS_BUILD = false`
 * - Cocos 编辑器 / 预览自动启用内测工具
 * - 已发布 Web 包可加 `?bhDev=1` 临时解锁
 */
export const BOTTLEHERO_INTERNAL_TOOLS_BUILD = false;

export const INTERNAL_TOOLS_URL_PARAM = 'bhDev';

export function isInternalToolsEnabled(): boolean {
  if (BOTTLEHERO_INTERNAL_TOOLS_BUILD || EDITOR || PREVIEW) {
    return true;
  }
  if (typeof window === 'undefined') {
    return false;
  }
  return new URLSearchParams(window.location.search).get(INTERNAL_TOOLS_URL_PARAM) === '1';
}

/** URL / 远程 / localStorage 数值覆盖仅在内测工具可用时生效。 */
export function isBalanceOverrideEnabled(): boolean {
  return isInternalToolsEnabled();
}
