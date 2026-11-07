import { describe, expect, it } from 'vitest';
import { MAX_REWORK, NODES } from '@factory-os/shared';
import type { TaskView } from '@factory-os/shared';
import { FactoryEngine } from '../src/engine/engine.js';
import { SimulatedExecutor } from '../src/engine/executor.js';
import { createRng } from '../src/engine/random.js';
import { makeEngine, runUntil, ScriptedExecutor, stepOf } from './helpers.js';

const express = { title: 'Parche de prueba', lane: 'express', kind: 'no_visual', priority: 'P2' } as const;
const standard = { title: 'Feature estándar', lane: 'standard', kind: 'no_visual', priority: 'P2' } as const;

const isTerminal = (t: TaskView | null) => t?.status === 'completed' || t?.status === 'error';

describe('engine', () => {
  it('[ENG-001] Approver no se encola hasta que llegan los 4 votos', () => {
    const exec = new ScriptedExecutor({ ui: 60_000 }, {}, 1_000);
    const engine = makeEngine(exec);
    const { id } = engine.createTask(standard);
    runUntil(engine, () => {
      const t = engine.getTask(id);
      return ['verificador', 'seguridad', 'codigo'].every((n) => stepOf(t, n).status === 'done');
    });
    const t = engine.getTask(id);
    expect(stepOf(t, 'ui').status).toBe('running');
    expect(stepOf(t, 'approver').status).toBe('blocked');
    runUntil(engine, () => stepOf(engine.getTask(id), 'approver').status !== 'blocked');
    expect(stepOf(engine.getTask(id), 'ui').status).toBe('done');
  });

  it('[ENG-002] la capacidad del nodo limita la concurrencia y subirla despacha la cola', () => {
    const exec = new ScriptedExecutor({ builder: 100_000 }, {}, 10);
    const engine = makeEngine(exec, {
      configs: [{ nodeId: 'builder', capacity: 1, baseDurationMs: 0, failureRate: 0 }],
    });
    for (let i = 0; i < 5; i++) engine.createTask(express);
    engine.tick(1_000);
    const builder = () => engine.getMetrics().nodes.find((n) => n.nodeId === 'builder');
    expect(builder()).toMatchObject({ running: 1, queued: 4, utilization: 1 });
    engine.updateNodeConfig('builder', { capacity: 3 });
    expect(builder()).toMatchObject({ running: 3, queued: 2 });
    // invariante en todo el recorrido
    for (let i = 0; i < 200; i++) {
      engine.tick(5_000);
      for (const m of engine.getMetrics().nodes) expect(m.running).toBeLessThanOrEqual(m.capacity);
    }
  });

  it('[ENG-003] la cola prioriza P0 sobre P3 aunque llegue después', () => {
    const exec = new ScriptedExecutor({ builder: 50_000 }, {}, 10);
    const engine = makeEngine(exec, {
      configs: [{ nodeId: 'builder', capacity: 1, baseDurationMs: 0, failureRate: 0 }],
    });
    engine.createTask(express); // ocupa Builder
    engine.tick(1_000);
    const low = engine.createTask({ ...express, priority: 'P3' });
    engine.tick(1_000);
    const high = engine.createTask({ ...express, priority: 'P0' });
    engine.tick(1_000);
    expect(stepOf(engine.getTask(low.id), 'builder').status).toBe('queued');
    expect(stepOf(engine.getTask(high.id), 'builder').status).toBe('queued');
    runUntil(engine, () => stepOf(engine.getTask(high.id), 'builder').status === 'running');
    expect(stepOf(engine.getTask(low.id), 'builder').status).toBe('queued');
  });

  it('[ENG-004] retrabajo: rechazos de Approver vuelven a Builder, máximo 2', () => {
    const okExec = new ScriptedExecutor({}, { approver: MAX_REWORK });
    const okEngine = makeEngine(okExec);
    const ok = okEngine.createTask(standard);
    runUntil(okEngine, () => isTerminal(okEngine.getTask(ok.id)));
    expect(okEngine.getTask(ok.id)).toMatchObject({ status: 'completed', reworkCount: MAX_REWORK });
    expect(okExec.callsFor(ok.id, 'builder')).toBe(MAX_REWORK + 1);
    expect(okExec.callsFor(ok.id, 'verificador')).toBe(MAX_REWORK + 1);

    const badExec = new ScriptedExecutor({}, { approver: MAX_REWORK + 1 });
    const badEngine = makeEngine(badExec);
    const bad = badEngine.createTask(standard);
    runUntil(badEngine, () => isTerminal(badEngine.getTask(bad.id)));
    const t = badEngine.getTask(bad.id);
    expect(t?.status).toBe('error');
    expect(t?.lastError).toMatch(/retrabajo agotado/);
    expect(badExec.callsFor(bad.id, 'builder')).toBe(MAX_REWORK + 1);
  });

  it('[ENG-005] los pasos humanos esperan aprobación salvo autoApprove', () => {
    const engine = makeEngine(new ScriptedExecutor(), { settings: { autoApprove: false } });
    const { id } = engine.createTask(standard);
    runUntil(engine, () => stepOf(engine.getTask(id), 'tu_ok').status === 'awaiting_approval');
    engine.tick(3_600_000);
    expect(stepOf(engine.getTask(id), 'tu_ok').status).toBe('awaiting_approval');
    expect(stepOf(engine.getTask(id), 'main_local').status).toBe('blocked');

    engine.approve(id, 'tu_ok', 'approve');
    runUntil(engine, () => stepOf(engine.getTask(id), 'produccion').status === 'awaiting_approval');
    expect(() => engine.approve(id, 'tu_ok', 'approve')).toThrow(/no espera aprobación/);

    engine.updateSettings({ autoApprove: true });
    runUntil(engine, () => isTerminal(engine.getTask(id)));
    expect(engine.getTask(id)?.status).toBe('completed');
  });

  it('[ENG-006] rechazo humano y fallo agotado llevan a error; retry reanuda', () => {
    const exec = new ScriptedExecutor({}, { builder: 3 });
    const engine = makeEngine(exec);
    const { id } = engine.createTask(standard);
    runUntil(engine, () => isTerminal(engine.getTask(id)));
    const failed = engine.getTask(id);
    expect(failed?.status).toBe('error');
    expect(failed?.lastError).toMatch(/Builder/);
    expect(stepOf(failed, 'builder').status).toBe('failed');
    expect(exec.callsFor(failed?.id ?? '', 'builder')).toBe(3);
    expect(() => engine.retry(id)).not.toThrow();
    runUntil(engine, () => isTerminal(engine.getTask(id)));
    expect(engine.getTask(id)?.status).toBe('completed');
    expect(() => engine.retry(id)).toThrow(/Solo se reintentan/);

    const human = makeEngine(new ScriptedExecutor(), { settings: { autoApprove: false } });
    const urgent = human.createTask({ ...express, lane: 'urgent' });
    runUntil(human, () => stepOf(human.getTask(urgent.id), 'carril_urgencia').status !== 'blocked');
    expect(stepOf(human.getTask(urgent.id), 'carril_urgencia').status).toBe('awaiting_approval');
    human.approve(urgent.id, 'carril_urgencia', 'reject', 'no es urgente');
    expect(human.getTask(urgent.id)).toMatchObject({ status: 'error', lastError: expect.stringMatching(/Rechazado/) });
    expect(human.getMetrics().totals.awaitingApproval).toBe(0);
  });

  it('[ENG-007] misma semilla ⇒ mismas métricas', () => {
    const run = () => {
      const rng = createRng(42);
      const engine = new FactoryEngine({
        rng,
        executor: new SimulatedExecutor(rng),
        startTime: 0,
        idFactory: (() => {
          let i = 0;
          return () => `id-${++i}`;
        })(),
        settings: { running: true, speed: 1, arrivalRatePerMin: 6, autoApprove: true },
      });
      for (let t = 0; t < 30 * 60; t++) engine.tick(1_000);
      return engine.getMetrics();
    };
    const a = run();
    const b = run();
    expect(a).toEqual(b);
    expect(a.totals.created).toBeGreaterThan(50);
  });

  it('[ENG-008] restaurar re-despacha pasos en curso y la tarea termina', () => {
    const exec = new ScriptedExecutor({ builder: 100_000 });
    const a = makeEngine(exec);
    const { id } = a.createTask(express);
    runUntil(a, () => stepOf(a.getTask(id), 'builder').status === 'running');
    const snapshot = a.getTask(id);
    if (!snapshot) throw new Error('sin snapshot');

    // El nuevo proceso arranca con un reloj ANTERIOR a lo persistido (simulación ×N por delante del de pared).
    const b = makeEngine(exec, { startTime: -1_000_000 });
    expect(b.restore([snapshot])).toBe(1);
    expect(b.getState().simTime).toBeGreaterThanOrEqual(snapshot.updatedAt);
    const runs: { queuedAt: number; startedAt: number; finishedAt: number }[] = [];
    b.subscribe({ onStageRun: (r) => runs.push(r) });
    expect(stepOf(b.getTask(id), 'builder')).toMatchObject({ status: 'running', attempts: 2 });
    runUntil(b, () => isTerminal(b.getTask(id)));
    expect(b.getTask(id)?.status).toBe('completed');
    for (const r of runs) {
      expect(r.startedAt).toBeGreaterThanOrEqual(r.queuedAt);
      expect(r.finishedAt).toBeGreaterThanOrEqual(r.startedAt);
    }

    const c = makeEngine(new ScriptedExecutor(), { settings: { autoApprove: false } });
    const waiting = c.createTask({ ...express, lane: 'urgent' });
    runUntil(c, () => c.getMetrics().totals.awaitingApproval === 1);
    const d = makeEngine(new ScriptedExecutor(), { settings: { autoApprove: false } });
    d.restore([c.getTask(waiting.id) as TaskView]);
    expect(d.getMetrics().totals.awaitingApproval).toBe(1);
  });

  it('[ENG-009] aprobaciones humanas pendientes aparecen como cuello de botella', () => {
    const engine = makeEngine(new ScriptedExecutor(), { settings: { autoApprove: false } });
    const ids = [1, 2, 3].map(() => engine.createTask(express).id);
    runUntil(engine, () => ids.every((id) => stepOf(engine.getTask(id), 'tu_ok').status === 'awaiting_approval'));
    const metrics = engine.getMetrics();
    const top = metrics.bottlenecks[0];
    expect(top?.nodeId).toBe('tu_ok');
    expect(top?.reason).toMatch(/aprobación/);
    expect(metrics.nodes.find((n) => n.nodeId === 'tu_ok')?.health).toBe('blocked');
  });

  it('[ENG-010] memoria acotada: evicción tras emitir el estado final', () => {
    const engine = makeEngine(new ScriptedExecutor(), { retainTerminal: 2 });
    const completed = new Set<string>();
    engine.subscribe({ onTaskChanged: (t) => t.status === 'completed' && completed.add(t.id) });
    for (let i = 0; i < 5; i++) engine.createTask({ ...express, lane: 'urgent' });
    runUntil(engine, () => completed.size === 5);
    expect(engine.listTasks()).toHaveLength(2);
  });

  it('[ENG-011] telemetría: ciclo, throughput, tasas y capas', () => {
    const rng = createRng(7);
    const engine = makeEngine(new SimulatedExecutor(rng), {
      rng,
      settings: { arrivalRatePerMin: 6 },
    });
    for (let t = 0; t < 40 * 60; t++) engine.tick(1_000);
    const m = engine.getMetrics();
    expect(m.totals.completed).toBeGreaterThan(0);
    expect(m.cycleTimeMs.p50).not.toBeNull();
    expect(m.cycleTimeMs.p50 ?? 0).toBeLessThanOrEqual(m.cycleTimeMs.p95 ?? 0);
    expect(m.successRate).toBeGreaterThan(0);
    expect(m.stepSuccessRate).toBeGreaterThan(0);
    expect(m.layers).toHaveLength(5);
    expect(m.nodes).toHaveLength(NODES.length);
    const builder = m.nodes.find((n) => n.nodeId === 'builder');
    expect(builder?.processed).toBeGreaterThan(0);
    expect(builder?.avgDurationMs).toBeGreaterThan(0);
    expect(m.nodes.find((n) => n.nodeId === 'brain')?.accesses).toBeGreaterThan(0);
    expect(m.totals.wip + m.totals.completed + m.totals.errored).toBe(m.totals.created);
  });
});

describe('engine · constitución (O1, O2, O9)', () => {
  it('[ENG-012] veredictos: un rechazo provoca retrabajo, un revisor nunca se reintenta y el estilo no bloquea', () => {
    const exec = new ScriptedExecutor({}, {}, 1_000, { seguridad: ['rechazado'] });
    const engine = makeEngine(exec);
    const { id } = engine.createTask(standard);
    runUntil(engine, () => engine.getTask(id)?.reworkCount === 1);
    expect(exec.callsFor(id, 'seguridad')).toBe(1);
    const activity = engine.getActivity().map((e) => e.message).join('\n');
    expect(activity).toMatch(/Quórum no alcanzado: Seguridad rechazado|Approver rechaza/);
    runUntil(engine, () => engine.getTask(id)?.status === 'completed');
    expect(exec.callsFor(id, 'builder')).toBe(2);
    expect(exec.callsFor(id, 'seguridad')).toBe(2);
    expect(stepOf(engine.getTask(id), 'seguridad').verdict).toBe('aprobado');

    // Exprés: quórum 2/2
    const ex = new ScriptedExecutor({}, {}, 1_000, { verificador: ['rechazado', 'rechazado', 'rechazado'] });
    const e2 = makeEngine(ex);
    const t2 = e2.createTask(express);
    runUntil(e2, () => e2.getTask(t2.id)?.status === 'error');
    expect(e2.getTask(t2.id)?.lastError).toMatch(/retrabajo agotado/);
    expect(ex.callsFor(t2.id, 'verificador')).toBe(3);
  });

  it('[ENG-012] un estilo no bloquea: aprobado con hallazgo no bloqueante pasa el quórum', async () => {
    const { SimulatedExecutor: Sim } = await import('../src/engine/executor.js');
    const { createRng: rngOf } = await import('../src/engine/random.js');
    const sim = new Sim(rngOf(3));
    const node = NODES.find((n) => n.id === 'codigo');
    if (!node) throw new Error('falta codigo');
    let styleOnly = 0;
    for (let i = 0; i < 300; i++) {
      const plan = sim.plan(node, { nodeId: 'codigo', capacity: 1, baseDurationMs: 1, failureRate: 0 });
      expect(plan.verdict).toBe('aprobado');
      if (plan.findings?.some((f) => f.categoria === 'estilo' && !f.bloquea)) styleOnly += 1;
    }
    expect(styleOnly).toBeGreaterThan(0);
  });

  it('[ENG-013] blocked para la línea; nada arranca hasta reanudar; reanudar sin parada es conflicto', () => {
    const exec = new ScriptedExecutor({}, {}, 1_000, { codigo: ['blocked'] });
    const engine = makeEngine(exec);
    const { id } = engine.createTask(standard);
    runUntil(engine, () => engine.getState().lineStopped);
    expect(engine.getState().lineStopReason).toMatch(/Código devolvió blocked/);
    const other = engine.createTask(express);
    engine.tick(3_600_000);
    expect(stepOf(engine.getTask(other.id), 'entradas').status).toBe('queued');
    expect(stepOf(engine.getTask(id), 'codigo').verdict).toBe('blocked');

    engine.resumeLine('revisado: el revisor ya responde');
    expect(engine.getState().lineStopped).toBe(false);
    runUntil(engine, () => engine.getTask(other.id)?.status === 'completed');
    runUntil(engine, () => engine.getTask(id)?.status === 'completed');
    expect(engine.getTask(id)?.reworkCount).toBe(1);
    expect(() => engine.resumeLine('otra vez')).toThrow(/no está parada/);

    // Parada manual: las aprobaciones automáticas también esperan
    engine.stopLine('andon manual');
    const third = engine.createTask(express);
    engine.tick(600_000);
    expect(engine.getTask(third.id)?.steps.every((s) => s.status !== 'done')).toBe(true);
  });

  it('[ENG-013] revisión a posteriori negativa en urgencia: tarea en error y línea parada', () => {
    const exec = new ScriptedExecutor({}, {}, 1_000, { seguridad: ['rechazado'] });
    const engine = makeEngine(exec);
    const { id } = engine.createTask({ ...express, lane: 'urgent' });
    runUntil(engine, () => engine.getTask(id)?.status === 'error');
    expect(engine.getState().lineStopped).toBe(true);
    expect(engine.getState().lineStopReason).toMatch(/a posteriori/);
  });
});
