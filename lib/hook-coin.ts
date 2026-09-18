export function calculateHookCoinEarnMinor(
  subtotalMinor: number,
  settings?: {
    orderEarnEnabled?: boolean;
    orderEarnPercent?: number;
    orderEarnMaxMinor?: number;
  },
) {
  if (settings?.orderEarnEnabled === false || !Number.isFinite(subtotalMinor) || subtotalMinor <= 0)
    return 0;
  const percent = Math.min(Math.max(Number(settings?.orderEarnPercent ?? 1), 0), 100);
  if (percent <= 0) return 0;
  const earnedMinor = Math.round((subtotalMinor * percent) / 100);
  const maxMinor = Math.max(0, Number(settings?.orderEarnMaxMinor ?? 0));
  return maxMinor > 0 ? Math.min(earnedMinor, maxMinor) : earnedMinor;
}
