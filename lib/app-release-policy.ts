export interface StoreRelease {
  id: string; platform: 'android' | 'ios'; version: string; build: string;
  minimumVersion: string; minimumBuild: string; releaseNotes: string; storeUrl: string;
}
const numeric = /^\d{1,9}(?:\.\d{1,9}){0,2}$/;
function compare(a: string, b: string) {
  const left = a.split('.').map(Number), right = b.split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const difference = (left[i] || 0) - (right[i] || 0);
    if (difference) return Math.sign(difference);
  }
  return 0;
}
export function compareInstalledBuild(a: { version: string; build: string }, b: { version: string; build: string }) {
  return compare(a.version, b.version) || compare(a.build, b.build);
}
export function storeUpdateDecision(release: StoreRelease | null, installed: { version: string; build: string }) {
  return { available: Boolean(release && compareInstalledBuild(installed, release) < 0), required: Boolean(release && compareInstalledBuild(installed, { version: release.minimumVersion, build: release.minimumBuild }) < 0) };
}
export function parseStoreRelease(value: unknown): StoreRelease | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<StoreRelease>;
  if (!item.id || !['android', 'ios'].includes(item.platform || '') ||
    ![item.version, item.build, item.minimumVersion, item.minimumBuild].every((part) => typeof part === 'string' && numeric.test(part)) ||
    typeof item.releaseNotes !== 'string' || typeof item.storeUrl !== 'string') return null;
  try {
    const url = new URL(item.storeUrl || (item.platform === 'ios' ? 'https://apps.apple.com/' : ''));
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return null;
    if (item.platform === 'android' && (url.hostname !== 'play.google.com' || url.pathname !== '/store/apps/details' || url.searchParams.get('id') !== 'com.biodun42.hook')) return null;
    if (item.platform === 'ios' && item.storeUrl && (url.hostname !== 'apps.apple.com' || !/\/id\d+$/.test(url.pathname))) return null;
  } catch { return null; }
  const release = item as StoreRelease;
  return compareInstalledBuild({ version: release.minimumVersion, build: release.minimumBuild }, release) > 0 ? null : release;
}
