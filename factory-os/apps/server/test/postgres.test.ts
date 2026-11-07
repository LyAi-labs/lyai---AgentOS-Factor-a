/**
 * Integración contra PostgreSQL real. Requiere TEST_DATABASE_URL (en CI: servicio postgres:16).
 * Sin la variable, la suite se marca como omitida — nunca como superada.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { EDGES, LAYERS, NODES, reachableFrom } from '@factory-os/shared';
import type { StageRunRecord, TaskView } from '@factory-os/shared';
import { PostgresRepository } from '../src/persistence/postgresRepository.js';
import { makeEngine, runUntil, ScriptedExecutor } from './helpers.js';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('persistence (PostgreSQL)', () => {
  let repo: PostgresRepository;

  beforeAll(async () => {
    const admin = new pg.Client({ connectionString: url });
    await admin.connect();
    await admin.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await admin.end();
    repo = new PostgresRepository(url as string);
  });

  afterAll(async () => {
    await repo.close();
  });

  it('[PER-001] migraciones idempotentes y la semilla conserva la config del operador', async () => {
    await repo.migrate();
    await repo.seedTopology(LAYERS, NODES, EDGES);
    await repo.saveNodeConfig({ nodeId: 'builder', capacity: 7, baseDurationMs: 1234, failureRate: 0.25 });
    await repo.migrate();
    await repo.seedTopology(LAYERS, NODES, EDGES);
    const configs = await repo.loadNodeConfigs();
    expect(configs).toHaveLength(NODES.length);
    expect(configs.find((c) => c.nodeId === 'builder')).toEqual({
      nodeId: 'builder',
      capacity: 7,
      baseDurationMs: 1234,
      failureRate: 0.25,
    });
  });

  it('[PER-002] un lote de tareas y ejecuciones se persiste y se lee idéntico', async () => {
    const engine = makeEngine(new ScriptedExecutor(), { startTime: Date.UTC(2026, 10, 7) });
    const tasks = new Map<string, TaskView>();
    const runs: StageRunRecord[] = [];
    engine.subscribe({ onTaskChanged: (t) => tasks.set(t.id, t), onStageRun: (r) => runs.push(r) });
    const done = engine.createTask({ title: 'Completa', lane: 'express', kind: 'visual', priority: 'P1' });
    const open = engine.createTask({ title: 'Abierta', lane: 'standard', kind: 'research', priority: 'P3' });
    runUntil(engine, () => engine.getTask(done.id)?.status === 'completed');

    await repo.persistBatch([...tasks.values()], runs);
    expect(await repo.getTask(done.id)).toEqual(tasks.get(done.id));
    expect(await repo.getTask(open.id)).toEqual(tasks.get(open.id));
    const storedRuns = await repo.listStageRuns(done.id);
    expect(storedRuns).toHaveLength(runs.filter((r) => r.taskId === done.id).length);
    expect((await repo.loadOpenTasks()).map((t) => t.id)).toEqual([open.id]);
    expect((await repo.listTasks({ status: 'completed', limit: 10 })).map((t) => t.id)).toEqual([done.id]);
    // reescritura idempotente
    await repo.persistBatch([...tasks.values()], runs);
    expect(await repo.listStageRuns(done.id)).toHaveLength(storedRuns.length);
  });

  it('[PER-003] el CTE recursivo coincide con el cálculo en memoria para todos los nodos', async () => {
    for (const node of NODES) {
      expect(await repo.reachable(node.id), node.id).toEqual(reachableFrom(node.id));
    }
  });
});
