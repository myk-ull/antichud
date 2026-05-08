import { nextFireDelayMs } from '@/lib/notifications/scheduler';

describe('nextFireDelayMs', () => {
  const NOW = 1_700_000_000_000;

  it('returns full interval in ms when lastFiredAt is null', () => {
    expect(nextFireDelayMs(null, 5, NOW)).toBe(5 * 60_000);
    expect(nextFireDelayMs(null, 240, NOW)).toBe(240 * 60_000);
  });

  it('returns positive remaining ms when last fire + interval is still in the future', () => {
    const intervalMin = 10;
    const lastFiredAt = NOW - 3 * 60_000;
    expect(nextFireDelayMs(lastFiredAt, intervalMin, NOW)).toBe(7 * 60_000);
  });

  it('returns 0 (never negative) when last fire + interval is already past', () => {
    const lastFiredAt = NOW - 30 * 60_000;
    expect(nextFireDelayMs(lastFiredAt, 5, NOW)).toBe(0);
  });

  it('returns 0 when intervalMin is 0', () => {
    expect(nextFireDelayMs(null, 0, NOW)).toBe(0);
    expect(nextFireDelayMs(NOW - 1000, 0, NOW)).toBe(0);
  });

  it('returns 0 at the exact boundary (lastFiredAt + interval === now)', () => {
    const intervalMin = 4;
    const lastFiredAt = NOW - intervalMin * 60_000;
    expect(nextFireDelayMs(lastFiredAt, intervalMin, NOW)).toBe(0);
  });

  it('uses Date.now() when `now` is omitted', () => {
    const spy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
    try {
      expect(nextFireDelayMs(null, 1)).toBe(60_000);
      expect(nextFireDelayMs(NOW - 30_000, 1)).toBe(30_000);
    } finally {
      spy.mockRestore();
    }
  });

  it('treats negative intervalMin as 0 (never negative output)', () => {
    expect(nextFireDelayMs(null, -5, NOW)).toBe(0);
    expect(nextFireDelayMs(NOW, -5, NOW)).toBe(0);
  });
});
