export function nextFireDelayMs(
  lastFiredAt: number | null,
  intervalMin: number,
  now: number = Date.now(),
): number {
  if (intervalMin <= 0) return 0;
  const intervalMs = intervalMin * 60_000;
  if (lastFiredAt === null) return intervalMs;
  const remaining = lastFiredAt + intervalMs - now;
  return remaining > 0 ? remaining : 0;
}
