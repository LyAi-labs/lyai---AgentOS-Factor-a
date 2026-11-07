import { describe, expect, it } from 'vitest';
import { initialState, MAX_HISTORY, MAX_TASKS, reducer } from '../src/state/store';
import type { FactoryState } from '../src/state/store';
import { metrics, task } from './fixtures';

const engine = { running: true, speed: 10, arrivalRatePerMin: 4, autoApprove: false, simTime: 1000, lineStopped: false, lineStopReason: null, lineStoppedAt: null };

function withSnapshot(): FactoryState {
  return reducer(initialState, {
    type: 'server',
    message: {
      type: 'snapshot',
      engine,
      tasks: [task('a', 1), task('b', 2)],
      metrics: metrics(1000),
      activity: [],
      configs: [{ nodeId: 'builder', capacity: 3, baseDurationMs: 1, failureRate: 0 }],
    },
  });
}

describe('dashboard store', () => {
  it('[UI-001] snapshot reemplaza, tasks hace upsert acotado, métricas e historial acotados', () => {
    const s1 = withSnapshot();
    expect(s1.tasks.map((t) => t.id)).toEqual(['b', 'a']);
    expect(s1.configs.builder?.capacity).toBe(3);

    const s2 = reducer(s1, { type: 'server', message: { type: 'tasks', tasks: [task('a', 5, { status: 'completed' }), task('c', 3)] } });
    expect(s2.tasks.map((t) => t.id)).toEqual(['a', 'c', 'b']);
    expect(s2.tasks[0]?.status).toBe('completed');
    expect(s1.tasks.map((t) => t.id)).toEqual(['b', 'a']); // sin mutación

    const many = Array.from({ length: MAX_TASKS + 50 }, (_, i) => task(`t${i}`, i + 10));
    const s3 = reducer(s2, { type: 'server', message: { type: 'tasks', tasks: many } });
    expect(s3.tasks).toHaveLength(MAX_TASKS);

    let s4 = s3;
    for (let i = 1; i <= MAX_HISTORY + 20; i++) {
      s4 = reducer(s4, { type: 'server', message: { type: 'metrics', metrics: metrics(1000 + i * 1000) } });
    }
    expect(s4.history).toHaveLength(MAX_HISTORY);

    // un reinicio del servidor (tiempo simulado que retrocede) reinicia el historial
    const s5 = reducer(s4, { type: 'server', message: { type: 'metrics', metrics: metrics(5) } });
    expect(s5.history).toHaveLength(1);

    const s6 = reducer(s5, { type: 'server', message: { type: 'node_config', config: { nodeId: 'builder', capacity: 9, baseDurationMs: 1, failureRate: 0 } } });
    expect(s6.configs.builder?.capacity).toBe(9);
    expect(reducer(s6, { type: 'server', message: { type: 'pong', at: 1 } })).toBe(s6);
  });
});
