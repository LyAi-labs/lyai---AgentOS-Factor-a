import { LAYERS, NODES } from '@factory-os/shared';
import type { MetricsSnapshot, NodeMetrics, TaskView } from '@factory-os/shared';

export function task(id: string, updatedAt: number, overrides: Partial<TaskView> = {}): TaskView {
  return {
    id,
    title: `Tarea ${id}`,
    lane: 'standard',
    kind: 'no_visual',
    priority: 'P2',
    status: 'running',
    reworkCount: 0,
    createdAt: 0,
    updatedAt,
    startedAt: 0,
    completedAt: null,
    lastError: null,
    steps: [],
    ...overrides,
  };
}

export function nodeMetrics(nodeId: string, overrides: Partial<NodeMetrics> = {}): NodeMetrics {
  return {
    nodeId,
    health: 'idle',
    capacity: 1,
    queued: 0,
    running: 0,
    awaiting: 0,
    utilization: 0,
    processed: 0,
    failed: 0,
    successRate: null,
    avgDurationMs: null,
    p95DurationMs: null,
    avgWaitMs: null,
    accesses: 0,
    ...overrides,
  };
}

export function metrics(at: number, overrides: Partial<MetricsSnapshot> = {}): MetricsSnapshot {
  return {
    at,
    totals: { created: 0, wip: 0, completed: 0, errored: 0, awaitingApproval: 0 },
    throughputPerMin: 0,
    successRate: null,
    stepSuccessRate: null,
    cycleTimeMs: { avg: null, p50: null, p95: null },
    nodes: NODES.map((n) => nodeMetrics(n.id)),
    layers: LAYERS.map((l) => ({ layer: l.id, queued: 0, running: 0, awaiting: 0, utilization: 0, avgWaitMs: null })),
    bottlenecks: [],
    ...overrides,
  };
}
