/**
 * API HTTP (REST) + endpoint WebSocket. Toda entrada se valida con los esquemas zod compartidos;
 * todo error sale con la forma { error: { code, message, details? } }.
 */
import Fastify from 'fastify';
import type { FastifyInstance, FastifyServerOptions } from 'fastify';
import { z, ZodError } from 'zod';
import {
  approvalSchema,
  createTaskSchema,
  EDGES,
  engineUpdateSchema,
  getNode,
  LAYERS,
  listTasksQuerySchema,
  nodeConfigUpdateSchema,
  NODES,
} from '@factory-os/shared';
import type { ApiErrorBody, GraphPayload } from '@factory-os/shared';
import { DomainError, notFound } from './domain/errors.js';
import { WsHub } from './api/wsHub.js';
import type { WsHubOptions } from './api/wsHub.js';
import type { FactoryRuntime } from './runtime.js';

const taskIdParams = z.object({ id: z.uuid() });
const nodeIdParams = z.object({ id: z.string().min(1).max(64) });

export interface BuildAppOptions {
  runtime: FactoryRuntime;
  logger?: FastifyServerOptions['logger'];
  ws?: WsHubOptions;
}

export interface FactoryApp {
  app: FastifyInstance;
  hub: WsHub;
}

export function buildApp({ runtime, logger = false, ws }: BuildAppOptions): FactoryApp {
  const app = Fastify({ logger, bodyLimit: 64 * 1024 });
  const hub = new WsHub(runtime, app.log, ws);
  const engine = runtime.engine;

  app.server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url ?? '/', 'http://localhost');
    if (pathname === '/ws') hub.handleUpgrade(request, socket, head);
    else socket.destroy();
  });

  app.setErrorHandler((error, request, reply) => {
    const send = (status: number, body: ApiErrorBody) => reply.status(status).send(body);
    if (error instanceof ZodError) {
      return send(400, { error: { code: 'VALIDATION', message: 'Entrada inválida', details: error.issues } });
    }
    if (error instanceof DomainError) {
      return send(error.httpStatus, { error: { code: error.code, message: error.message } });
    }
    const status = typeof (error as { statusCode?: unknown }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : 500;
    if (status < 500) {
      return send(status, { error: { code: 'BAD_REQUEST', message: (error as Error).message } });
    }
    request.log.error({ err: error }, 'error no controlado');
    return send(500, { error: { code: 'INTERNAL', message: 'Error interno' } });
  });

  app.setNotFoundHandler((request, reply) => {
    const body: ApiErrorBody = { error: { code: 'NOT_FOUND', message: `Ruta ${request.method} ${request.url} no existe` } };
    void reply.status(404).send(body);
  });

  app.addHook('onClose', async () => {
    await hub.close();
  });

  // ─── Salud ───
  app.get('/api/health', async (_req, reply) => {
    const health = await runtime.health();
    return reply.status(health.status === 'ok' ? 200 : 503).send({ ...health, wsClients: hub.clientCount });
  });

  // ─── Grafo ───
  app.get('/api/graph', async (): Promise<GraphPayload> => ({
    layers: LAYERS,
    nodes: NODES,
    edges: EDGES,
    configs: engine.getConfigs(),
  }));

  app.get('/api/graph/nodes/:id/reachable', async (req) => {
    const { id } = nodeIdParams.parse(req.params);
    if (!getNode(id)) throw notFound(`El nodo ${id}`);
    return { nodeId: id, reachable: await runtime.repo.reachable(id) };
  });

  app.get('/api/nodes/:id', async (req) => {
    const { id } = nodeIdParams.parse(req.params);
    const node = getNode(id);
    if (!node) throw notFound(`El nodo ${id}`);
    const metrics = engine.getMetrics().nodes.find((m) => m.nodeId === id) ?? null;
    const config = engine.getConfigs().find((c) => c.nodeId === id) ?? null;
    return { node, config, metrics };
  });

  app.patch('/api/nodes/:id/config', async (req) => {
    const { id } = nodeIdParams.parse(req.params);
    const patch = nodeConfigUpdateSchema.parse(req.body);
    return runtime.updateNodeConfig(id, patch);
  });

  // ─── Tareas ───
  app.get('/api/tasks', async (req) => {
    const query = listTasksQuerySchema.parse(req.query);
    await runtime.writer.flush(); // lectura consistente con lo que ya emitió el motor
    return runtime.repo.listTasks(query);
  });

  app.post('/api/tasks', async (req, reply) => {
    const input = createTaskSchema.parse(req.body);
    const task = engine.createTask(input);
    return reply.status(201).header('location', `/api/tasks/${task.id}`).send(task);
  });

  app.get('/api/tasks/:id', async (req) => {
    const { id } = taskIdParams.parse(req.params);
    await runtime.writer.flush();
    const task = engine.getTask(id) ?? (await runtime.repo.getTask(id));
    if (!task) throw notFound(`La tarea ${id}`);
    return { ...task, stageRuns: await runtime.repo.listStageRuns(id) };
  });

  app.post('/api/tasks/:id/approval', async (req) => {
    const { id } = taskIdParams.parse(req.params);
    const { nodeId, decision, note } = approvalSchema.parse(req.body);
    return engine.approve(id, nodeId, decision, note);
  });

  app.post('/api/tasks/:id/retry', async (req) => {
    const { id } = taskIdParams.parse(req.params);
    return engine.retry(id);
  });

  // ─── Métricas, motor, actividad ───
  app.get('/api/metrics', async () => engine.getMetrics());
  app.get('/api/engine', async () => engine.getState());
  app.patch('/api/engine', async (req) => engine.updateSettings(engineUpdateSchema.parse(req.body)));
  app.get('/api/activity', async () => engine.getActivity());

  return { app, hub };
}
