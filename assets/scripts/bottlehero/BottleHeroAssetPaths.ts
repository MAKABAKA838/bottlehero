export const BOTTLEHERO_RESOURCES_PREFIX = 'bottlehero';

/** Web 运行时相对路径 -> Cocos resources 路径（无扩展名） */
export function toResourcesPath(relativeWebPath: string): string {
  const normalized = relativeWebPath.replace(/^\//, '').replace(/\.[^/.]+$/, '');
  return `${BOTTLEHERO_RESOURCES_PREFIX}/${normalized}`;
}
