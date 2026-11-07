import { describe, expect, it } from 'vitest';
import { EMPTY, formatAgo, formatDuration, formatNumber, formatPercent } from '../src/lib/format';

describe('dashboard format', () => {
  it('[UI-004] formato consistente y — para valores ausentes', () => {
    expect(formatDuration(null)).toBe(EMPTY);
    expect(formatDuration(Number.NaN)).toBe(EMPTY);
    expect(formatDuration(450)).toBe('450 ms');
    expect(formatDuration(4_500)).toBe('4.5 s');
    expect(formatDuration(90_000)).toBe('1.5 min');
    expect(formatDuration(2 * 3_600_000)).toBe('2.0 h');
    expect(formatPercent(null)).toBe(EMPTY);
    expect(formatPercent(0.873)).toBe('87 %');
    expect(formatPercent(0.873, 1)).toBe('87.3 %');
    expect(formatNumber(undefined)).toBe(EMPTY);
    expect(formatAgo(1_000, 1_200)).toBe('ahora');
    expect(formatAgo(0, 30_000)).toBe('hace 30 s');
    expect(formatAgo(null, 1)).toBe(EMPTY);
  });
});
