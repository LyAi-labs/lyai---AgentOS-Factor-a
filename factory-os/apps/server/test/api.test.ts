import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import type { AddressInfo } from 'node:net';
import { parseServerMessage } from '@factory-os/shared';
import type { ServerMessage, TaskView } from '@factory-os/shared';
import { buildApp } from '../src/app.js';
import { rawDataToString } from '../src/api/wsHub.js';
import type { FactoryApp } from '../src/app.js';
import { MemoryRepository } from '../src/persistence/memoryRepository.js';
import { FactoryRuntime } from '../src/runtime.js';
import { runUntil, ScriptedExecutor, stepOf } from './helpers.js';

const silent = { info: () => undefined, warn: () => undefined, error: () => undefined };

let runtime: FactoryRuntime;
let factory: FactoryApp;

async function setup(autoApprove = false) {
  runtime = await FactoryRuntime.create({
    repo: new MemoryRepository(),
    logger: silent,
    executor: new ScriptedExecutor(),
    seed: 1,
    startClock: false,
    settings: { running: true, speed: 1, arrivalRatePerMin: 0, autoApprove },
  });
  factory = buildApp({ runtime, ws: { tasksIntervalMs: 20, metricsIntervalMs: 50 } });
  await factory.app.ready();
}

beforeEach(async () => setup());
afterEach(async () => {
  await factory.app.close();
  await runtime.close();
});

const createTask = async (body: object) => factory.app.inject({ method: 'POST', url: '/api/tasks', payload: body });

describe('api', () => {
  it('[API-001] valida la entrada con zod y responde 400 VALIDATION', async () => {
    const res = await createTask({ title: 'x' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: { code: 'VALIDATION' } });

    const lane = await createTask({ title: 'Título válido', lane: 'teleport' });
    expect(lane.statusCode).toBe(400);

    const badEngine = await factory.app.inject({ method: 'PATCH', url: '/api/engine', payload: { speed: 9999 } });
    expect(badEngine.statusCode).toBe(400);

    const emptyPatch = await factory.app.inject({ method: 'PATCH', url: '/api/engine', payload: {} });
    expect(emptyPatch.statusCode).toBe(400);

    const badId = await factory.app.inject({ method: 'GET', url: '/api/tasks/no-es-uuid' });
    expect(badId.statusCode).toBe(400);

    const badJson = await factory.app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: { 'content-type': 'application/json' },
      payload: '{roto',
    });
    expect(badJson.statusCode).toBe(400);
    expect(badJson.json()).toHaveProperty('error.code');
  });

  it('[API-002] 404 para recursos inexistentes y 409 para operaciones no permitidas', async () => {
    const missing = await factory.app.inject({ method: 'GET', url: '/api/tasks/00000000-0000-4000-8000-000000000999' });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });

    expect((await factory.app.inject({ method: 'GET', url: '/api/nodes/nope' })).statusCode).toBe(404);
    expect((await factory.app.inject({ method: 'GET', url: '/api/nada' })).statusCode).toBe(404);

    const task = (await createTask({ title: 'Tarea en curso' })).json<TaskView>();
    const retry = await factory.app.inject({ method: 'POST', url: `/api/tasks/${task.id}/retry` });
    expect(retry.statusCode).toBe(409);
    expect(retry.json()).toMatchObject({ error: { code: 'CONFLICT' } });

    const approve = await factory.app.inject({
      method: 'POST',
      url: `/api/tasks/${task.id}/approval`,
      payload: { nodeId: 'tu_ok', decision: 'approve' },
    });
    expect(approve.statusCode).toBe(409);
  });

  it('[API-003] ciclo de vida completo por REST: crear, leer, listar, aprobar', async () => {
    const res = await createTask({ title: 'Panel de remontes', lane: 'express', kind: 'no_visual', priority: 'P1' });
    expect(res.statusCode).toBe(201);
    const task = res.json<TaskView>();
    expect(res.headers.location).toBe(`/api/tasks/${task.id}`);
    expect(task.status).toBe('running');

    runUntil(runtime.engine, () => stepOf(runtime.engine.getTask(task.id), 'tu_ok').status === 'awaiting_approval');
    const approve = await factory.app.inject({
      method: 'POST',
      url: `/api/tasks/${task.id}/approval`,
      payload: { nodeId: 'tu_ok', decision: 'approve', note: 'revisado' },
    });
    expect(approve.statusCode).toBe(200);
    expect(stepOf(approve.json<TaskView>(), 'tu_ok').status).toBe('done');

    const detail = await factory.app.inject({ method: 'GET', url: `/api/tasks/${task.id}` });
    const body = detail.json<TaskView & { stageRuns: { nodeId: string; outcome: string }[] }>();
    expect(body.stageRuns.some((r) => r.nodeId === 'tu_ok' && r.outcome === 'approved')).toBe(true);
    expect(body.stageRuns.some((r) => r.nodeId === 'builder' && r.outcome === 'success')).toBe(true);

    const list = await factory.app.inject({ method: 'GET', url: '/api/tasks?lane=express&limit=10' });
    expect(list.json<TaskView[]>().map((t) => t.id)).toContain(task.id);
    const none = await factory.app.inject({ method: 'GET', url: '/api/tasks?status=completed' });
    expect(none.json<TaskView[]>()).toHaveLength(0);

    const graph = await factory.app.inject({ method: 'GET', url: '/api/graph' });
    expect(graph.json()).toMatchObject({ layers: expect.any(Array), nodes: expect.any(Array), edges: expect.any(Array) });
    const reach = await factory.app.inject({ method: 'GET', url: '/api/graph/nodes/builder/reachable' });
    expect(reach.json<{ reachable: string[] }>().reachable).toContain('approver');
  });

  it('[API-004] WebSocket: snapshot al conectar, deltas, pong y resync', async () => {
    await factory.app.listen({ port: 0, host: '127.0.0.1' });
    const { port } = factory.app.server.address() as AddressInfo;
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const received: ServerMessage[] = [];
    const waitFor = (pred: (m: ServerMessage) => boolean) =>
      new Promise<ServerMessage>((resolve, reject) => {
        const found = received.find(pred);
        if (found) return resolve(found);
        const timer = setTimeout(() => reject(new Error('timeout esperando mensaje WS')), 3_000);
        ws.on('message', (data) => {
          const msg = parseServerMessage(rawDataToString(data));
          if (msg && pred(msg)) {
            clearTimeout(timer);
            resolve(msg);
          }
        });
      });
    ws.on('message', (data) => {
      const msg = parseServerMessage(rawDataToString(data));
      if (msg) received.push(msg);
    });

    const snapshot = await waitFor((m) => m.type === 'snapshot');
    expect(snapshot.type === 'snapshot' && snapshot.configs).toHaveLength(25);

    await createTask({ title: 'Tarea vía WebSocket' });
    const delta = await waitFor((m) => m.type === 'tasks' && m.tasks.some((t) => t.title === 'Tarea vía WebSocket'));
    expect(delta.type).toBe('tasks');
    await waitFor((m) => m.type === 'metrics');

    ws.send('esto no es json');
    ws.send(JSON.stringify({ type: 'desconocido' }));
    ws.send(JSON.stringify({ type: 'ping' }));
    await waitFor((m) => m.type === 'pong');

    const before = received.filter((m) => m.type === 'snapshot').length;
    ws.send(JSON.stringify({ type: 'resync' }));
    await waitFor(() => received.filter((m) => m.type === 'snapshot').length > before);

    await factory.app.inject({ method: 'PATCH', url: '/api/nodes/builder/config', payload: { capacity: 5 } });
    const cfg = await waitFor((m) => m.type === 'node_config');
    expect(cfg.type === 'node_config' && cfg.config).toMatchObject({ nodeId: 'builder', capacity: 5 });

    ws.close();
  });

  it('[API-005] health informa almacenamiento, BD y estado de persistencia', async () => {
    const res = await factory.app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      status: 'ok',
      storage: 'memory',
      database: 'ok',
      persistence: { failedFlushes: 0, lastError: null },
    });
  });

  it('[API-006] configuración de nodos y control del motor', async () => {
    const patch = await factory.app.inject({
      method: 'PATCH',
      url: '/api/nodes/verificador/config',
      payload: { capacity: 4, failureRate: 0.5 },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json()).toMatchObject({ nodeId: 'verificador', capacity: 4, failureRate: 0.5 });
    const stored = await runtime.repo.loadNodeConfigs();
    expect(stored.find((c) => c.nodeId === 'verificador')).toMatchObject({ capacity: 4, failureRate: 0.5 });

    const paused = await factory.app.inject({ method: 'PATCH', url: '/api/engine', payload: { running: false } });
    expect(paused.json()).toMatchObject({ running: false });
    const t0 = runtime.engine.getState().simTime;
    runtime.engine.advance(10_000);
    expect(runtime.engine.getState().simTime).toBe(t0);

    await factory.app.inject({ method: 'PATCH', url: '/api/engine', payload: { running: true, speed: 4 } });
    runtime.engine.advance(1_000);
    expect(runtime.engine.getState().simTime).toBe(t0 + 4_000);
  });
});
