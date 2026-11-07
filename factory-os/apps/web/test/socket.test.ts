import { describe, expect, it } from 'vitest';
import { backoffDelay, BACKOFF_BASE_MS, BACKOFF_CAP_MS, socketUrl } from '../src/lib/socket';
import { initialState, reducer } from '../src/state/store';
import { metrics, task } from './fixtures';

describe('dashboard connection', () => {
  it('[UI-003] backoff exponencial con tope y la instantánea de reconexión sustituye el estado', () => {
    const max = (n: number) => backoffDelay(n, () => 1);
    const min = (n: number) => backoffDelay(n, () => 0);
    expect(max(0)).toBe(BACKOFF_BASE_MS);
    expect(max(1)).toBe(BACKOFF_BASE_MS * 2);
    expect(max(3)).toBe(BACKOFF_BASE_MS * 8);
    for (let i = 0; i < 40; i++) {
      expect(max(i)).toBeLessThanOrEqual(BACKOFF_CAP_MS);
      expect(min(i)).toBeGreaterThanOrEqual(Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** i) / 2);
    }
    expect(socketUrl({ protocol: 'https:', host: 'lyai.pro' })).toBe('wss://lyai.pro/ws');
    expect(socketUrl({ protocol: 'http:', host: 'localhost:5173' })).toBe('ws://localhost:5173/ws');

    const engine = { running: true, speed: 1, arrivalRatePerMin: 0, autoApprove: false, simTime: 0 };
    const stale = reducer(initialState, { type: 'server', message: { type: 'tasks', tasks: [task('viejo', 1)] } });
    const fresh = reducer(stale, {
      type: 'server',
      message: { type: 'snapshot', engine, tasks: [task('nuevo', 2)], metrics: metrics(2), activity: [], configs: [] },
    });
    expect(fresh.tasks.map((t) => t.id)).toEqual(['nuevo']);
  });
});
