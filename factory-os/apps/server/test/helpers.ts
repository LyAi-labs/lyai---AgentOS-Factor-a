import type { NodeConfig, NodeDef, TaskView } from '@factory-os/shared';
import { FactoryEngine } from '../src/engine/engine.js';
import type { EngineOptions } from '../src/engine/engine.js';
import type { StageExecutor, StagePlan } from '../src/engine/executor.js';
import { createRng } from '../src/engine/random.js';

/**
 * Ejecutor guionizado: duraciones fijas por nodo y "falla las N primeras veces" por (tarea, nodo).
 * Permite tests deterministas sin depender de probabilidades.
 */
export class ScriptedExecutor implements StageExecutor {
  readonly calls = new Map<string, number>();

  constructor(
    private readonly durations: Record<string, number> = {},
    private readonly failures: Record<string, number> = {},
    private readonly defaultDuration = 1_000,
  ) {}

  plan(node: NodeDef, _config: NodeConfig, taskId: string): StagePlan {
    const key = `${taskId}:${node.id}`;
    const n = (this.calls.get(key) ?? 0) + 1;
    this.calls.set(key, n);
    const durationMs = this.durations[node.id] ?? this.defaultDuration;
    return n <= (this.failures[node.id] ?? 0)
      ? { durationMs, outcome: 'failure', error: `fallo guionizado ${node.id}#${n}` }
      : { durationMs, outcome: 'success', error: null };
  }

  callsFor(taskId: string, nodeId: string): number {
    return this.calls.get(`${taskId}:${nodeId}`) ?? 0;
  }
}

export function makeEngine(
  executor: StageExecutor = new ScriptedExecutor(),
  overrides: Partial<EngineOptions> = {},
): FactoryEngine {
  let seq = 0;
  return new FactoryEngine({
    rng: createRng(1),
    executor,
    startTime: 0,
    idFactory: () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`,
    ...overrides,
    settings: { running: true, speed: 1, arrivalRatePerMin: 0, autoApprove: true, ...overrides.settings },
  });
}

/** Avanza en pasos de `step` ms hasta que `done()` sea cierto o se agote `maxMs`. */
export function runUntil(engine: FactoryEngine, done: () => boolean, maxMs = 3_600_000, step = 500): void {
  for (let elapsed = 0; elapsed < maxMs; elapsed += step) {
    if (done()) return;
    engine.tick(step);
  }
  if (!done()) throw new Error('runUntil: condición no alcanzada');
}

export function stepOf(task: TaskView | null, nodeId: string) {
  const step = task?.steps.find((s) => s.nodeId === nodeId);
  if (!step) throw new Error(`paso ${nodeId} no encontrado`);
  return step;
}
