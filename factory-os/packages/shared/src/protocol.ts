/**
 * Contrato de la API: esquemas zod de entrada (validación en el servidor)
 * y unión discriminada de mensajes WebSocket (validación en el cliente).
 */
import { z } from 'zod';
import { LANES, PRIORITIES, TASK_KINDS, TASK_STATUSES } from './domain.js';
import type {
  ActivityEvent,
  EdgeDef,
  EngineState,
  LayerDef,
  MetricsSnapshot,
  NodeConfig,
  NodeDef,
  TaskView,
} from './domain.js';

export const createTaskSchema = z.object({
  title: z.string().trim().min(3).max(140),
  lane: z.enum(LANES).default('standard'),
  kind: z.enum(TASK_KINDS).default('no_visual'),
  priority: z.enum(PRIORITIES).default('P2'),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const listTasksQuerySchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  lane: z.enum(LANES).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

export const engineUpdateSchema = z
  .object({
    running: z.boolean(),
    speed: z.number().min(0.1).max(100),
    arrivalRatePerMin: z.number().min(0).max(120),
    autoApprove: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Se requiere al menos un campo' });
export type EngineUpdate = z.infer<typeof engineUpdateSchema>;

export const nodeConfigUpdateSchema = z
  .object({
    capacity: z.number().int().min(1).max(64),
    baseDurationMs: z.number().int().min(0).max(3_600_000),
    failureRate: z.number().min(0).max(1),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Se requiere al menos un campo' });
export type NodeConfigUpdate = z.infer<typeof nodeConfigUpdateSchema>;

export const approvalSchema = z.object({
  nodeId: z.string().min(1),
  decision: z.enum(['approve', 'reject']),
  note: z.string().max(500).optional(),
});
export type ApprovalInput = z.infer<typeof approvalSchema>;

export interface GraphPayload {
  layers: readonly LayerDef[];
  nodes: readonly NodeDef[];
  edges: readonly EdgeDef[];
  configs: NodeConfig[];
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export type ServerMessage =
  | {
      type: 'snapshot';
      engine: EngineState;
      tasks: TaskView[];
      metrics: MetricsSnapshot;
      activity: ActivityEvent[];
      configs: NodeConfig[];
    }
  | { type: 'tasks'; tasks: TaskView[] }
  | { type: 'metrics'; metrics: MetricsSnapshot }
  | { type: 'engine'; engine: EngineState }
  | { type: 'activity'; events: ActivityEvent[] }
  | { type: 'node_config'; config: NodeConfig }
  | { type: 'pong'; at: number };

export type ClientMessage = { type: 'ping' } | { type: 'resync' };

export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ping') }),
  z.object({ type: z.literal('resync') }),
]);

/** Validación ligera en el cliente: tipo conocido y forma de objeto. */
const SERVER_TYPES = new Set<ServerMessage['type']>([
  'snapshot',
  'tasks',
  'metrics',
  'engine',
  'activity',
  'node_config',
  'pong',
]);

export function parseServerMessage(raw: string): ServerMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null || !('type' in data)) return null;
  const type: unknown = data.type;
  if (typeof type !== 'string' || !SERVER_TYPES.has(type as ServerMessage['type'])) return null;
  return data as ServerMessage;
}
