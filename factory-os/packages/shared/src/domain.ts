/**
 * Tipos de dominio compartidos por backend y frontend.
 * Fuente única de verdad: si un literal cambia aquí, el compilador marca todos los usos.
 */

export const LAYER_IDS = [1, 2, 3, 4, 5] as const;
export type LayerId = (typeof LAYER_IDS)[number];

/** Categorías de la leyenda del diagrama de referencia (código de color normalizado). */
export const NODE_CATEGORIES = [
  'user_ui',
  'agent_logic',
  'policy',
  'tool_action',
  'context_trace',
  'cloud_service',
  'external_system',
] as const;
export type NodeCategory = (typeof NODE_CATEGORIES)[number];

/** Rol del nodo dentro del motor (independiente del color). */
export const NODE_ROLES = ['processor', 'gateway', 'human', 'resource'] as const;
export type NodeRole = (typeof NODE_ROLES)[number];

export const MATURITIES = ['HECHO', 'EN PRUEBA'] as const;
export type Maturity = (typeof MATURITIES)[number];

export const EDGE_KINDS = ['flow', 'context', 'rework', 'review'] as const;
export type EdgeKind = (typeof EDGE_KINDS)[number];

export const LANES = ['standard', 'express', 'urgent'] as const;
export type Lane = (typeof LANES)[number];

export const TASK_KINDS = ['visual', 'no_visual', 'research'] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export const PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const;
export type Priority = (typeof PRIORITIES)[number];

/** Estados de tarea exigidos: pendiente, en ejecución, completado, error. */
export const TASK_STATUSES = ['pending', 'running', 'completed', 'error'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/**
 * Estados de un paso (una visita de la tarea a un nodo).
 * blocked → dependencias sin cumplir; queued → esperando hueco; awaiting_approval → paso humano.
 */
export const STEP_STATUSES = [
  'blocked',
  'queued',
  'running',
  'awaiting_approval',
  'done',
  'failed',
] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

/** Estado operativo derivado de un nodo, usado para colorear el lienzo. */
export const NODE_HEALTH = ['idle', 'running', 'blocked', 'error'] as const;
export type NodeHealth = (typeof NODE_HEALTH)[number];

export interface LayerDef {
  id: LayerId;
  code: string;
  name: string;
}

export interface NodeProfile {
  /** Concurrencia máxima del nodo (huecos de ejecución). */
  capacity: number;
  /** Duración media de un paso, en ms de tiempo simulado. */
  baseDurationMs: number;
  /** Probabilidad [0,1] de que un intento falle (o, en un gateway, de rechazo). */
  failureRate: number;
}

export interface NodeDef {
  id: string;
  label: string;
  /** Línea secundaria del diagrama: motor/modelo o herramienta. */
  engine: string;
  layer: LayerId;
  category: NodeCategory;
  role: NodeRole;
  maturity: Maturity;
  description: string;
  /** Posición en rejilla: columna y fila dentro de la capa. */
  col: number;
  profile: NodeProfile;
  /** Nodos de contexto consultados durante la ejecución (Brain, BD de pruebas). */
  uses?: readonly string[];
}

export interface EdgeDef {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  label?: string;
}

export interface WorkflowStepDef {
  nodeId: string;
  deps: readonly string[];
}

export interface StepView {
  nodeId: string;
  deps: string[];
  status: StepStatus;
  attempts: number;
  queuedAt: number | null;
  startedAt: number | null;
  finishedAt: number | null;
  error: string | null;
}

export interface TaskView {
  id: string;
  title: string;
  lane: Lane;
  kind: TaskKind;
  priority: Priority;
  status: TaskStatus;
  reworkCount: number;
  createdAt: number;
  updatedAt: number;
  startedAt: number | null;
  completedAt: number | null;
  lastError: string | null;
  steps: StepView[];
}

export interface NodeConfig {
  nodeId: string;
  capacity: number;
  baseDurationMs: number;
  failureRate: number;
}

export interface NodeMetrics {
  nodeId: string;
  health: NodeHealth;
  capacity: number;
  queued: number;
  running: number;
  awaiting: number;
  utilization: number;
  processed: number;
  failed: number;
  successRate: number | null;
  avgDurationMs: number | null;
  p95DurationMs: number | null;
  avgWaitMs: number | null;
  /** Consultas recibidas (solo nodos de contexto). */
  accesses: number;
}

export interface LayerMetrics {
  layer: LayerId;
  queued: number;
  running: number;
  awaiting: number;
  utilization: number;
  avgWaitMs: number | null;
}

export interface Bottleneck {
  nodeId: string;
  score: number;
  reason: string;
}

export interface Percentiles {
  avg: number | null;
  p50: number | null;
  p95: number | null;
}

export interface MetricsSnapshot {
  at: number;
  totals: {
    created: number;
    wip: number;
    completed: number;
    errored: number;
    awaitingApproval: number;
  };
  throughputPerMin: number;
  successRate: number | null;
  stepSuccessRate: number | null;
  cycleTimeMs: Percentiles;
  nodes: NodeMetrics[];
  layers: LayerMetrics[];
  bottlenecks: Bottleneck[];
}

export interface EngineState {
  running: boolean;
  speed: number;
  /** Llegadas automáticas por minuto simulado (0 = desactivado). */
  arrivalRatePerMin: number;
  autoApprove: boolean;
  simTime: number;
}

export type ActivityLevel = 'info' | 'warn' | 'error';

export interface ActivityEvent {
  id: number;
  at: number;
  level: ActivityLevel;
  taskId: string | null;
  nodeId: string | null;
  message: string;
}

export const STAGE_OUTCOMES = ['success', 'failure', 'approved', 'rejected'] as const;
export type StageOutcome = (typeof STAGE_OUTCOMES)[number];

/** Registro inmutable de un intento de paso: base de la telemetría histórica. */
export interface StageRunRecord {
  id: string;
  taskId: string;
  nodeId: string;
  attempt: number;
  queuedAt: number;
  startedAt: number;
  finishedAt: number;
  outcome: StageOutcome;
  error: string | null;
}
