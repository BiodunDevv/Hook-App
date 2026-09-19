const bundleId = 'com.biodun42.hook';
export const hookPlayStoreUrl = `https://play.google.com/store/apps/details?id=${bundleId}`;

/** Resolve Apple's numeric listing ID from Hook's bundle ID, never its name. */
export async function resolveHookAppStoreUrl(): Promise<string | null> {
  for (const country of ['ng', 'us']) {
    try {
      const response = await fetch(`https://itunes.apple.com/lookup?bundleId=${bundleId}&country=${country}`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) continue;
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || !('results' in data) || !Array.isArray(data.results)) continue;
      for (const item of data.results as unknown[]) {
        if (!item || typeof item !== 'object' || !('bundleId' in item) || item.bundleId !== bundleId || !('trackViewUrl' in item) || typeof item.trackViewUrl !== 'string') continue;
        const url = new URL(item.trackViewUrl);
        if (url.protocol !== 'https:' || url.hostname !== 'apps.apple.com' || url.username || url.password || url.port || !/\/id\d+$/.test(url.pathname)) continue;
        url.search = ''; url.hash = '';
        return url.href;
      }
    } catch { /* Try the other storefront; do not open an unrelated listing. */ }
  }
  return null;
}
