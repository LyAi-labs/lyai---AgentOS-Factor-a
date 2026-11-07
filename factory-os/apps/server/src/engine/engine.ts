/**
 * Motor de la factoría: simulación por eventos discretos sobre un DAG de pasos por tarea.
 *
 * - Cada tarea instancia su flujo (fork/join) según carril y tipo.
 * - Cada nodo tiene capacidad (huecos) y una cola con prioridad (P0 > P3, urgencia > exprés > estándar, FIFO).
 * - Approver es puerta de quórum con retrabajo hacia Builder (máx. MAX_REWORK).
 * - Los pasos humanos (Tu OK, Carril urgencia, Producción) esperan aprobación explícita salvo autoApprove.
 * - Todo cambio de estado pasa por las máquinas de estados puras (domain/stateMachine.ts).
 * - Revisores emiten veredicto (aprobado/rechazado/blocked); Approver exige 4 de 4 aprobados (constitución O2).
 *   Un revisor nunca se reintenta: si no responde cuenta como `blocked` (O9).
 * - `blocked` o una parada manual paran la línea (O1): no arranca ningún paso hasta que un humano la reanude.
 * - Las decisiones humanas y de gobierno se registran en una cadena de auditoría con hash.
 */
import { randomUUID } from 'node:crypto';
import {
  buildWorkflow,
  descendantsInWorkflow,
  LAYERS,
  MAX_ATTEMPTS,
  MAX_REWORK,
  NODES,
  PRIORITIES,
  REWORK_GATE,
  REWORK_TARGET,
  REVIEWER_NODES,
  requireNode,
  topologicalOrder,
} from '@factory-os/shared';
import type {
  ActivityEvent,
  ActivityLevel,
  AuditAction,
  AuditEntry,
  Bottleneck,
  CreateTaskInput,
  EngineState,
  Lane,
  LayerMetrics,
  MetricsSnapshot,
  NodeConfig,
  NodeConfigUpdate,
  NodeMetrics,
  StageOutcome,
  StageRunRecord,
  StepView,
  TaskKind,
  TaskView,
  WorkflowStepDef,
} from '@factory-os/shared';
import { AuditChain } from '../domain/audit.js';
import { conflict, DomainError, notFound } from '../domain/errors.js';
import { mustTransition, transitionStep, transitionTask } from '../domain/stateMachine.js';
import type { StageExecutor, StagePlan } from './executor.js';
import { exponentialIntervalMs, pick, weighted } from './random.js';
import type { Rng } from './random.js';
import { mean, NodeStats, percentile, Ring } from './stats.js';

interface StepRuntime extends StepView {
  plan: StagePlan | null;
  finishAt: number | null;
}

interface TaskRuntime extends Omit<TaskView, 'steps'> {
  workflow: WorkflowStepDef[];
  order: string[];
  steps: Map<string, StepRuntime>;
}

export interface EngineListener {
  onTaskChanged?(task: TaskView): void;
  onStageRun?(run: StageRunRecord): void;
  onActivity?(event: ActivityEvent): void;
  onEngineChanged?(state: EngineState): void;
  onConfigChanged?(config: NodeConfig): void;
  onAudit?(entry: AuditEntry): void;
}

/** Quién toma una decisión: una persona (por la API) o la automatización. */
export type Actor = string;
export const HUMAN_ACTOR: Actor = 'Ignacio';
export const AUTO_ACTOR: Actor = 'autoApprove';

export interface EngineSettings {
  running: boolean;
  speed: number;
  arrivalRatePerMin: number;
  autoApprove: boolean;
}

export interface EngineOptions {
  rng: Rng;
  executor: StageExecutor;
  startTime: number;
  settings?: Partial<EngineSettings>;
  configs?: readonly NodeConfig[];
  idFactory?: () => string;
  /** Tareas terminadas que se conservan en memoria (el histórico completo vive en la BD). */
  retainTerminal?: number;
  onListenerError?: (error: unknown) => void;
  /** Cabeza de la cadena de auditoría persistida, para continuarla tras un reinicio. */
  auditHead?: { seq: number; hash: string };
}

const LANE_RANK: Readonly<Record<Lane, number>> = { urgent: 0, express: 1, standard: 2 };
const THROUGHPUT_WINDOW_MS = 60_000;
const MAX_EVENTS_PER_TICK = 100_000;

const SAMPLE_TITLES: readonly string[] = [
  'Panel de remontes en tiempo real',
  'Alerta de avalancha nivel 4',
  'Cierre de pista por viento',
  'Horarios de telesillas temporada',
  'Integración meteo MeteoSwiss',
  'Concierge: restaurantes abiertos',
  'Corrección de zona horaria en avisos',
  'Exportar incidentes a la comuna',
  'Mapa de pistas accesible',
  'Optimizar ruta de evacuación',
  'Traducción FR/DE de avisos',
  'Hotfix: caché de estado de remontes',
];

export class FactoryEngine {
  private simTime: number;
  private settings: EngineSettings;
  private nextArrivalAt: number | null = null;

  private readonly rng: Rng;
  private readonly executor: StageExecutor;
  private readonly idFactory: () => string;
  private readonly retainTerminal: number;
  private readonly onListenerError: (error: unknown) => void;

  private readonly tasks = new Map<string, TaskRuntime>();
  private readonly terminalOrder: string[] = [];
  private readonly configs = new Map<string, NodeConfig>();
  private readonly queues = new Map<string, Set<string>>();
  private readonly running = new Map<string, Set<string>>();
  private readonly awaiting = new Map<string, Set<string>>();
  private readonly stats = new Map<string, NodeStats>();
  private readonly listeners = new Set<EngineListener>();
  private readonly dirty = new Set<string>();

  private readonly activity = new Ring<ActivityEvent>(200);
  private activitySeq = 0;
  private readonly completions = new Ring<number>(2_000);
  private readonly cycleTimes = new Ring<number>(200);
  private readonly counters = { created: 0, completed: 0, errored: 0 };
  private readonly auditChain: AuditChain;
  private line: { stopped: boolean; reason: string | null; at: number | null } = { stopped: false, reason: null, at: null };

  constructor(options: EngineOptions) {
    this.rng = options.rng;
    this.executor = options.executor;
    this.simTime = options.startTime;
    this.idFactory = options.idFactory ?? randomUUID;
    this.retainTerminal = options.retainTerminal ?? 500;
    this.onListenerError = options.onListenerError ?? (() => undefined);
    this.auditChain = new AuditChain(options.auditHead);
    this.settings = {
      running: true,
      speed: 10,
      arrivalRatePerMin: 4,
      autoApprove: false,
      ...options.settings,
    };
    for (const node of NODES) {
      this.configs.set(node.id, { nodeId: node.id, ...node.profile });
      this.queues.set(node.id, new Set());
      this.running.set(node.id, new Set());
      this.awaiting.set(node.id, new Set());
      this.stats.set(node.id, new NodeStats());
    }
    for (const cfg of options.configs ?? []) {
      if (this.configs.has(cfg.nodeId)) this.configs.set(cfg.nodeId, { ...cfg });
    }
  }

  // ───────────────────────── Suscripción ─────────────────────────

  subscribe(listener: EngineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit<K extends keyof EngineListener>(
    key: K,
    payload: Parameters<NonNullable<EngineListener[K]>>[0],
  ): void {
    for (const listener of this.listeners) {
      const fn = listener[key] as ((arg: typeof payload) => void) | undefined;
      if (!fn) continue;
      try {
        fn.call(listener, payload);
      } catch (error) {
        this.onListenerError(error);
      }
    }
  }

  private flushDirty(): void {
    for (const id of this.dirty) {
      const task = this.tasks.get(id);
      if (task) this.emit('onTaskChanged', this.toView(task));
    }
    this.dirty.clear();
    this.evictTerminal();
  }

  private audit(actor: Actor, action: AuditAction, taskId: string | null, nodeId: string | null, detail: string): void {
    // `at` en ms enteros: entra en el hash y debe sobrevivir intacto al viaje por timestamptz.
    const at = Math.round(this.simTime);
    this.emit('onAudit', this.auditChain.append({ at, actor, action, taskId, nodeId, detail }));
  }

  private log(level: ActivityLevel, message: string, taskId: string | null, nodeId: string | null): void {
    this.activitySeq += 1;
    const event: ActivityEvent = { id: this.activitySeq, at: this.simTime, level, taskId, nodeId, message };
    this.activity.push(event);
    this.emit('onActivity', event);
  }

  // ───────────────────────── Comandos ─────────────────────────

  createTask(input: CreateTaskInput): TaskView {
    const task = this.instantiate(input);
    this.dispatch();
    this.flushDirty();
    return this.toView(task);
  }

  approve(
    taskId: string,
    nodeId: string,
    decision: 'approve' | 'reject',
    note?: string,
    actor: Actor = HUMAN_ACTOR,
  ): TaskView {
    const task = this.requireTask(taskId);
    const step = task.steps.get(nodeId);
    if (!step) throw notFound(`El paso ${nodeId} en la tarea ${taskId}`);
    if (step.status !== 'awaiting_approval') {
      throw conflict(`El paso ${nodeId} no espera aprobación (estado: ${step.status})`);
    }
    this.resolveApproval(task, step, decision, note ?? null, actor);
    this.dispatch();
    this.flushDirty();
    return this.toView(task);
  }

  /** Para la línea (O1). Idempotente: una segunda parada no cambia el motivo original. */
  stopLine(reason: string, actor: Actor = HUMAN_ACTOR): EngineState {
    if (!this.line.stopped) {
      this.line = { stopped: true, reason, at: this.simTime };
      this.audit(actor, 'line_stop', null, null, reason);
      this.log('error', `LÍNEA PARADA: ${reason}`, null, null);
      this.emit('onEngineChanged', this.getState());
    }
    return this.getState();
  }

  /** Reanuda la línea. Solo una persona puede hacerlo, y queda registrado con su nota. */
  resumeLine(note: string, actor: Actor = HUMAN_ACTOR): EngineState {
    if (!this.line.stopped) throw conflict('La línea no está parada');
    this.audit(actor, 'line_resume', null, null, `${note} (motivo de la parada: ${this.line.reason ?? '—'})`);
    this.line = { stopped: false, reason: null, at: null };
    this.log('info', `Línea reanudada por ${actor}: ${note}`, null, null);
    if (this.settings.autoApprove) this.approveAllPending(AUTO_ACTOR);
    this.dispatch();
    this.flushDirty();
    this.emit('onEngineChanged', this.getState());
    return this.getState();
  }

  retry(taskId: string, actor: Actor = HUMAN_ACTOR): TaskView {
    const task = this.requireTask(taskId);
    if (task.status !== 'error') throw conflict(`Solo se reintentan tareas en error (estado: ${task.status})`);
    Object.assign(task, mustTransition(transitionTask(task, { type: 'RETRY' }), `retry ${taskId}`));
    task.reworkCount = 0;
    for (const step of task.steps.values()) {
      if (step.status !== 'failed') continue;
      this.applyStep(task, step, { type: 'RETRY' });
      this.enqueue(task, step);
    }
    this.unblockReady(task);
    this.touch(task);
    this.log('info', `Reintento manual de «${task.title}»`, task.id, null);
    this.audit(actor, 'retry', task.id, null, `Reintento de «${task.title}»`);
    this.dispatch();
    this.flushDirty();
    return this.toView(task);
  }

  updateNodeConfig(nodeId: string, patch: NodeConfigUpdate, actor: Actor = HUMAN_ACTOR): NodeConfig {
    const current = this.configs.get(nodeId);
    if (!current) throw notFound(`El nodo ${nodeId}`);
    const next: NodeConfig = { ...current, ...patch };
    this.configs.set(nodeId, next);
    this.emit('onConfigChanged', next);
    this.log('info', `Configuración de ${requireNode(nodeId).label} actualizada`, null, nodeId);
    this.audit(actor, 'node_config', null, nodeId, JSON.stringify(patch));
    this.dispatch();
    this.flushDirty();
    return next;
  }

  updateSettings(patch: Partial<EngineSettings>, actor: Actor = HUMAN_ACTOR): EngineState {
    const rateChanged =
      patch.arrivalRatePerMin !== undefined && patch.arrivalRatePerMin !== this.settings.arrivalRatePerMin;
    if (patch.autoApprove !== undefined && patch.autoApprove !== this.settings.autoApprove) {
      // Delegar las aprobaciones humanas en la automatización es una decisión de gobierno: se audita.
      this.audit(actor, 'engine_settings', null, null, `autoApprove=${String(patch.autoApprove)}`);
    }
    this.settings = { ...this.settings, ...patch };
    if (rateChanged) this.nextArrivalAt = null;
    if (patch.autoApprove === true && !this.line.stopped) {
      this.approveAllPending(AUTO_ACTOR);
      this.dispatch();
      this.flushDirty();
    }
    const state = this.getState();
    this.emit('onEngineChanged', state);
    return state;
  }

  /** Avanza el reloj real `realDtMs` (multiplicado por la velocidad). No hace nada en pausa. */
  advance(realDtMs: number): void {
    if (!this.settings.running || realDtMs <= 0) return;
    this.tick(realDtMs * this.settings.speed);
  }

  /** Avanza tiempo simulado de forma exacta, procesando eventos en orden cronológico. */
  tick(simDtMs: number): void {
    const target = this.simTime + simDtMs;
    let guard = 0;
    for (;;) {
      if (++guard > MAX_EVENTS_PER_TICK) {
        throw new DomainError('CONFLICT', 'Bucle de eventos sin progreso: revisar perfiles de nodo');
      }
      if (this.settings.arrivalRatePerMin > 0 && this.nextArrivalAt === null) {
        this.nextArrivalAt = this.simTime + exponentialIntervalMs(this.rng, this.settings.arrivalRatePerMin);
      }
      const nextFinish = this.earliestFinish();
      const nextArrival = this.settings.arrivalRatePerMin > 0 ? this.nextArrivalAt : null;
      const next = Math.min(nextFinish ?? Infinity, nextArrival ?? Infinity);
      if (next > target) break;
      this.simTime = Math.max(this.simTime, next);
      if (nextArrival !== null && nextArrival <= this.simTime) {
        this.instantiate(this.randomTaskInput());
        this.nextArrivalAt = this.simTime + exponentialIntervalMs(this.rng, this.settings.arrivalRatePerMin);
      }
      this.completeDue();
      this.dispatch();
    }
    this.simTime = target;
    this.flushDirty();
  }

  /** Reconstruye tareas abiertas desde la persistencia (recuperación tras caída). */
  restore(views: readonly TaskView[]): number {
    // El reloj simulado corre más rápido que el de pared: continúa desde el instante más tardío persistido
    // para que ningún timestamp nuevo quede antes que uno anterior (monotonía de queued ≤ started ≤ finished).
    const latest = latestTimestamp(views);
    if (latest > this.simTime) this.simTime = latest;
    let restored = 0;
    for (const view of views) {
      if (this.tasks.has(view.id) || view.status === 'completed') continue;
      const workflow = buildWorkflow(view.lane, view.kind);
      const order = topologicalOrder(workflow);
      const steps = new Map<string, StepRuntime>();
      for (const sv of view.steps) {
        // Un paso "running" perdió su ejecución con el proceso: vuelve a cola.
        const status = sv.status === 'running' ? 'queued' : sv.status;
        steps.set(sv.nodeId, {
          ...sv,
          status,
          verdict: sv.verdict ?? null,
          findings: sv.findings,
          plan: null,
          finishAt: null,
        });
      }
      if (order.some((id) => !steps.has(id))) continue; // flujo incompatible: se ignora
      const { steps: _ignored, ...rest } = view;
      const task: TaskRuntime = { ...rest, workflow, order, steps };
      this.tasks.set(task.id, task);
      for (const step of steps.values()) {
        if (task.status === 'error') continue;
        if (step.status === 'queued') this.queueOf(step.nodeId).add(task.id);
        if (step.status === 'awaiting_approval') this.awaitingOf(step.nodeId).add(task.id);
      }
      restored += 1;
    }
    this.dispatch();
    return restored;
  }

  // ───────────────────────── Consultas ─────────────────────────

  getState(): EngineState {
    return {
      ...this.settings,
      simTime: this.simTime,
      lineStopped: this.line.stopped,
      lineStopReason: this.line.reason,
      lineStoppedAt: this.line.at,
    };
  }

  getAuditHead(): { seq: number; hash: string } {
    return this.auditChain.getHead();
  }

  getConfigs(): NodeConfig[] {
    return [...this.configs.values()].map((c) => ({ ...c }));
  }

  getTask(id: string): TaskView | null {
    const task = this.tasks.get(id);
    return task ? this.toView(task) : null;
  }

  listTasks(): TaskView[] {
    return [...this.tasks.values()].sort((a, b) => b.updatedAt - a.updatedAt).map((t) => this.toView(t));
  }

  getActivity(): ActivityEvent[] {
    return [...this.activity.values()];
  }

  getMetrics(): MetricsSnapshot {
    const nodes = NODES.map((node): NodeMetrics => {
      const cfg = this.requireConfig(node.id);
      const st = this.requireStats(node.id);
      const queued = this.queueOf(node.id).size;
      const running = this.runningOf(node.id).size;
      const awaiting = this.awaitingOf(node.id).size;
      const resourceActive = node.role === 'resource' && st.activeUntil > this.simTime;
      const failureRatio = st.recentFailureRatio();
      const health =
        failureRatio !== null && failureRatio >= 0.4
          ? 'error'
          : awaiting > 0 || queued >= cfg.capacity * 3
            ? 'blocked'
            : running > 0 || resourceActive
              ? 'running'
              : 'idle';
      return {
        nodeId: node.id,
        health,
        capacity: cfg.capacity,
        queued,
        running,
        awaiting,
        utilization: node.role === 'human' || node.role === 'resource' ? 0 : running / cfg.capacity,
        processed: st.processed,
        failed: st.failed,
        successRate: st.processed > 0 ? (st.processed - st.failed) / st.processed : null,
        avgDurationMs: mean(st.durations.values()),
        p95DurationMs: percentile(st.durations.values(), 0.95),
        avgWaitMs: mean(st.waits.values()),
        accesses: st.accesses,
      };
    });

    const layers = LAYERS.map((layer): LayerMetrics => {
      const inLayer = nodes.filter((m) => requireNode(m.nodeId).layer === layer.id);
      const workers = inLayer.filter((m) => {
        const role = requireNode(m.nodeId).role;
        return role === 'processor' || role === 'gateway';
      });
      const capacity = workers.reduce((a, m) => a + m.capacity, 0);
      const waits = inLayer.map((m) => m.avgWaitMs).filter((v): v is number => v !== null);
      return {
        layer: layer.id,
        queued: inLayer.reduce((a, m) => a + m.queued, 0),
        running: inLayer.reduce((a, m) => a + m.running, 0),
        awaiting: inLayer.reduce((a, m) => a + m.awaiting, 0),
        utilization: capacity > 0 ? workers.reduce((a, m) => a + m.running, 0) / capacity : 0,
        avgWaitMs: mean(waits),
      };
    });

    let wip = 0;
    let awaitingApproval = 0;
    for (const task of this.tasks.values()) {
      if (task.status === 'pending' || task.status === 'running') wip += 1;
      for (const step of task.steps.values()) if (step.status === 'awaiting_approval') awaitingApproval += 1;
    }
    const windowStart = this.simTime - THROUGHPUT_WINDOW_MS;
    const throughputPerMin = this.completions.values().filter((t) => t > windowStart).length;
    const finished = this.counters.completed + this.counters.errored;
    const processed = nodes.reduce((a, m) => a + m.processed, 0);
    const failed = nodes.reduce((a, m) => a + m.failed, 0);
    const cycles = this.cycleTimes.values();

    return {
      at: this.simTime,
      totals: { ...this.counters, wip, awaitingApproval },
      throughputPerMin,
      successRate: finished > 0 ? this.counters.completed / finished : null,
      stepSuccessRate: processed > 0 ? (processed - failed) / processed : null,
      cycleTimeMs: { avg: mean(cycles), p50: percentile(cycles, 0.5), p95: percentile(cycles, 0.95) },
      nodes,
      layers,
      bottlenecks: detectBottlenecks(nodes),
    };
  }

  // ───────────────────────── Internos ─────────────────────────

  private instantiate(input: CreateTaskInput): TaskRuntime {
    const workflow = buildWorkflow(input.lane, input.kind);
    const order = topologicalOrder(workflow);
    const now = this.simTime;
    const steps = new Map<string, StepRuntime>();
    for (const def of workflow) {
      steps.set(def.nodeId, {
        nodeId: def.nodeId,
        deps: [...def.deps],
        status: 'blocked',
        attempts: 0,
        queuedAt: null,
        startedAt: null,
        finishedAt: null,
        error: null,
        verdict: null,
        findings: [],
        plan: null,
        finishAt: null,
      });
    }
    const task: TaskRuntime = {
      id: this.idFactory(),
      title: input.title,
      lane: input.lane,
      kind: input.kind,
      priority: input.priority,
      status: 'pending',
      reworkCount: 0,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      completedAt: null,
      lastError: null,
      workflow,
      order,
      steps,
    };
    this.tasks.set(task.id, task);
    this.counters.created += 1;
    this.log('info', `Nueva tarea «${task.title}» (${task.lane}/${task.kind}, ${task.priority})`, task.id, 'entradas');
    this.unblockReady(task);
    this.touch(task);
    return task;
  }

  private randomTaskInput(): CreateTaskInput {
    const lane = weighted<Lane>(this.rng, [
      ['standard', 70],
      ['express', 25],
      ['urgent', 5],
    ]);
    const kind = weighted<TaskKind>(this.rng, [
      ['visual', 35],
      ['no_visual', 45],
      ['research', 20],
    ]);
    const priority = lane === 'urgent' ? 'P0' : pick(this.rng, PRIORITIES.slice(1));
    return { title: pick(this.rng, SAMPLE_TITLES), lane, kind, priority };
  }

  private applyStep(task: TaskRuntime, step: StepRuntime, event: Parameters<typeof transitionStep>[1]): void {
    const next = mustTransition(transitionStep(step, event), `paso ${step.nodeId} de ${task.id}`);
    Object.assign(step, next);
  }

  private enqueue(task: TaskRuntime, step: StepRuntime): void {
    step.queuedAt = this.simTime;
    this.queueOf(step.nodeId).add(task.id);
  }

  private unblockReady(task: TaskRuntime): void {
    for (const nodeId of task.order) {
      const step = this.requireStep(task, nodeId);
      if (step.status !== 'blocked') continue;
      const ready = step.deps.every((dep) => this.requireStep(task, dep).status === 'done');
      if (!ready) continue;
      const human = requireNode(nodeId).role === 'human';
      this.applyStep(task, step, { type: 'UNBLOCK', human });
      step.startedAt = null;
      step.finishedAt = null;
      if (human) {
        step.queuedAt = this.simTime;
        this.awaitingOf(nodeId).add(task.id);
        if (this.settings.autoApprove && !this.line.stopped) {
          this.resolveApproval(task, step, 'approve', 'autoApprove', AUTO_ACTOR);
        } else {
          this.log('warn', `«${task.title}» espera aprobación en ${requireNode(nodeId).label}`, task.id, nodeId);
        }
      } else {
        this.enqueue(task, step);
      }
    }
  }

  private approveAllPending(actor: Actor): void {
    for (const task of this.tasks.values()) {
      for (const step of task.steps.values()) {
        if (step.status === 'awaiting_approval') this.resolveApproval(task, step, 'approve', 'autoApprove', actor);
      }
    }
  }

  private resolveApproval(
    task: TaskRuntime,
    step: StepRuntime,
    decision: 'approve' | 'reject',
    note: string | null,
    actor: Actor,
  ): void {
    const node = requireNode(step.nodeId);
    this.audit(actor, decision, task.id, node.id, `${node.label} · «${task.title}»${note ? ` · ${note}` : ''}`);
    const waited = this.simTime - (step.queuedAt ?? this.simTime);
    this.awaitingOf(step.nodeId).delete(task.id);
    step.startedAt = step.queuedAt;
    step.finishedAt = this.simTime;
    if (decision === 'approve') {
      this.applyStep(task, step, { type: 'APPROVE' });
      this.ensureTaskStarted(task);
      this.requireStats(step.nodeId).record(0, waited, true);
      this.recordRun(task, step, 'approved', null);
      this.log('info', `${node.label}: aprobado «${task.title}»${note ? ` (${note})` : ''}`, task.id, node.id);
      this.afterStepDone(task);
    } else {
      const error = `Rechazado en ${node.label}${note ? `: ${note}` : ''}`;
      this.applyStep(task, step, { type: 'REJECT', error });
      this.requireStats(step.nodeId).record(0, waited, false);
      this.recordRun(task, step, 'rejected', error);
      this.failTask(task, error);
    }
    this.touch(task);
  }

  private dispatch(): void {
    if (this.line.stopped) return; // O1: con la línea parada no arranca ningún paso; los que corren terminan.
    for (const node of NODES) {
      if (node.role === 'human' || node.role === 'resource') continue;
      const queue = this.queueOf(node.id);
      const active = this.runningOf(node.id);
      const capacity = this.requireConfig(node.id).capacity;
      while (queue.size > 0 && active.size < capacity) {
        const taskId = this.pickNext(queue, node.id);
        queue.delete(taskId);
        const task = this.tasks.get(taskId);
        if (!task) continue;
        this.start(task, this.requireStep(task, node.id));
      }
    }
  }

  private pickNext(queue: ReadonlySet<string>, nodeId: string): string {
    let best: { id: string; key: [number, number, number] } | null = null;
    for (const id of queue) {
      const task = this.tasks.get(id);
      if (!task) return id; // entrada huérfana: se descarta al extraerla
      const key: [number, number, number] = [
        PRIORITIES.indexOf(task.priority),
        LANE_RANK[task.lane],
        this.requireStep(task, nodeId).queuedAt ?? 0,
      ];
      if (!best || compareKeys(key, best.key) < 0) best = { id, key };
    }
    if (!best) throw new Error('pickNext sobre cola vacía');
    return best.id;
  }

  private start(task: TaskRuntime, step: StepRuntime): void {
    const node = requireNode(step.nodeId);
    this.applyStep(task, step, { type: 'START' });
    this.ensureTaskStarted(task);
    const plan = this.executor.plan(node, this.requireConfig(node.id), task.id, step.attempts);
    step.startedAt = this.simTime;
    step.finishedAt = null;
    step.plan = plan;
    step.finishAt = this.simTime + Math.max(0, plan.durationMs);
    this.runningOf(node.id).add(task.id);
    for (const used of node.uses ?? []) {
      const st = this.requireStats(used);
      st.accesses += 1;
      st.activeUntil = Math.max(st.activeUntil, step.finishAt);
    }
    this.touch(task);
  }

  private ensureTaskStarted(task: TaskRuntime): void {
    if (task.status !== 'pending') return;
    Object.assign(task, mustTransition(transitionTask(task, { type: 'START' }), `start ${task.id}`));
    task.startedAt ??= this.simTime;
  }

  private earliestFinish(): number | null {
    let min: number | null = null;
    for (const [nodeId, ids] of this.running) {
      for (const id of ids) {
        const finishAt = this.tasks.get(id)?.steps.get(nodeId)?.finishAt ?? null;
        if (finishAt !== null && (min === null || finishAt < min)) min = finishAt;
      }
    }
    return min;
  }

  private completeDue(): void {
    const due: { task: TaskRuntime; step: StepRuntime }[] = [];
    for (const [nodeId, ids] of this.running) {
      for (const id of ids) {
        const task = this.tasks.get(id);
        const step = task?.steps.get(nodeId);
        if (task && step && step.finishAt !== null && step.finishAt <= this.simTime) due.push({ task, step });
      }
    }
    due.sort((a, b) => (a.step.finishAt ?? 0) - (b.step.finishAt ?? 0));
    for (const { task, step } of due) this.finish(task, step);
  }

  private finish(task: TaskRuntime, step: StepRuntime): void {
    const plan = step.plan;
    if (!plan) throw new Error(`Paso ${step.nodeId} sin plan de ejecución`);
    const node = requireNode(step.nodeId);
    this.runningOf(node.id).delete(task.id);
    step.finishedAt = step.finishAt;
    step.finishAt = null;
    step.plan = null;
    const duration = (step.finishedAt ?? this.simTime) - (step.startedAt ?? this.simTime);
    const wait = (step.startedAt ?? this.simTime) - (step.queuedAt ?? this.simTime);
    if (REVIEWER_NODES.has(node.id)) {
      this.finishReview(task, step, plan, duration, wait);
      this.touch(task);
      return;
    }
    const negatives = node.id === REWORK_GATE ? this.negativeVerdicts(task) : [];
    const success = plan.outcome === 'success' && negatives.length === 0;
    this.requireStats(node.id).record(duration, wait, success);
    const quorumError = negatives.length > 0 ? `Quórum no alcanzado: ${negatives.join(' · ')}` : null;
    this.recordRun(task, step, success ? 'success' : node.id === REWORK_GATE ? 'rejected' : 'failure', quorumError ?? plan.error);

    if (success) {
      this.applyStep(task, step, { type: 'SUCCEED' });
      if (task.status !== 'error') this.afterStepDone(task);
    } else if (node.id === REWORK_GATE) {
      this.handleRejection(task, step, quorumError ?? plan.error ?? 'Rechazo de Approver');
    } else {
      const error = plan.error ?? `Fallo en ${node.label}`;
      this.applyStep(task, step, { type: 'FAIL', error, maxAttempts: MAX_ATTEMPTS });
      if (step.status === 'failed') {
        this.failTask(task, `${node.label}: ${error} (${MAX_ATTEMPTS} intentos)`);
      } else if (task.status !== 'error') {
        this.enqueue(task, step);
        this.log('warn', `${node.label} reintenta «${task.title}» (${step.attempts}/${MAX_ATTEMPTS})`, task.id, node.id);
      }
    }
    this.touch(task);
  }

  /**
   * Un revisor termina siempre su paso (hizo su trabajo) y deja un veredicto. "No respondió" = blocked (O9).
   * blocked para la línea (O1). Sin Approver en el flujo (urgencia, revisión a posteriori), un veredicto
   * negativo lleva la tarea a error y también para la línea: el cambio ya está en producción.
   */
  private finishReview(task: TaskRuntime, step: StepRuntime, plan: StagePlan, duration: number, wait: number): void {
    const node = requireNode(step.nodeId);
    const verdict = plan.outcome === 'failure' ? 'blocked' : (plan.verdict ?? 'blocked');
    const findings = plan.findings ?? [];
    const error =
      verdict === 'aprobado'
        ? null
        : plan.outcome === 'failure'
          ? `No respondió: ${plan.error ?? 'sin respuesta'} (cuenta como blocked)`
          : (plan.error ?? findings.find((f) => f.bloquea)?.detalle ?? 'Sin evidencia');
    this.requireStats(node.id).record(duration, wait, verdict === 'aprobado');
    this.recordRun(task, step, verdict === 'aprobado' ? 'success' : verdict === 'rechazado' ? 'rejected' : 'blocked', error);
    this.applyStep(task, step, { type: 'SUCCEED' });
    step.verdict = verdict;
    step.findings = findings;
    step.error = error;
    if (verdict !== 'aprobado') {
      this.log('warn', `${node.label}: ${verdict} «${task.title}» — ${error ?? ''}`, task.id, node.id);
    }
    if (verdict === 'blocked') this.stopLine(`${node.label} devolvió blocked en «${task.title}»: ${error ?? ''}`, 'motor');
    if (task.status === 'error') return;
    const hasGate = task.steps.has(REWORK_GATE);
    if (!hasGate && verdict !== 'aprobado') {
      if (verdict === 'rechazado') this.stopLine(`${node.label} rechaza a posteriori «${task.title}»: ${error ?? ''}`, 'motor');
      this.failTask(task, `${node.label}: ${verdict} — ${error ?? ''}`);
      return;
    }
    this.afterStepDone(task);
  }

  /** Revisores ya terminados con veredicto distinto de aprobado (bloquean el quórum). */
  private negativeVerdicts(task: TaskRuntime): string[] {
    const out: string[] = [];
    for (const step of task.steps.values()) {
      if (step.verdict !== null && step.verdict !== 'aprobado') {
        out.push(`${requireNode(step.nodeId).label} ${step.verdict}`);
      }
    }
    return out;
  }

  private handleRejection(task: TaskRuntime, gate: StepRuntime, error: string): void {
    this.applyStep(task, gate, { type: 'FAIL', error, maxAttempts: 1 });
    if (task.status === 'error') return;
    task.reworkCount += 1;
    if (task.reworkCount > MAX_REWORK) {
      this.failTask(task, `Approver: ${error} — retrabajo agotado (máx. ${MAX_REWORK})`);
      return;
    }
    const toReset = descendantsInWorkflow(task.workflow, REWORK_TARGET);
    toReset.add(REWORK_TARGET);
    for (const nodeId of toReset) {
      const step = this.requireStep(task, nodeId);
      if (step.status === 'running') continue; // no ocurre en flujos válidos; defensivo
      this.detach(task.id, nodeId);
      this.applyStep(task, step, { type: 'RESET' });
      step.verdict = null;
      step.findings = [];
    }
    this.log('warn', `Approver rechaza «${task.title}»: retrabajo ${task.reworkCount}/${MAX_REWORK} → Builder`, task.id, REWORK_GATE);
    this.unblockReady(task);
  }

  private afterStepDone(task: TaskRuntime): void {
    this.unblockReady(task);
    // unblockReady puede completar la tarea de forma reentrante (autoApprove de un paso humano final).
    if (task.status !== 'pending' && task.status !== 'running') return;
    const allDone = [...task.steps.values()].every((s) => s.status === 'done');
    if (!allDone) return;
    this.ensureTaskStarted(task);
    Object.assign(task, mustTransition(transitionTask(task, { type: 'COMPLETE' }), `complete ${task.id}`));
    task.completedAt = this.simTime;
    this.counters.completed += 1;
    this.completions.push(this.simTime);
    this.cycleTimes.push(this.simTime - task.createdAt);
    this.log('info', `Completada «${task.title}» en producción`, task.id, 'produccion');
    this.retire(task.id);
  }

  private failTask(task: TaskRuntime, error: string): void {
    if (task.status === 'error' || task.status === 'completed') return;
    Object.assign(task, mustTransition(transitionTask(task, { type: 'FAIL', error }), `fail ${task.id}`));
    // Libera colas y aprobaciones pendientes de ramas paralelas; las ejecuciones en curso terminan solas.
    for (const step of task.steps.values()) {
      if (step.status === 'queued' || step.status === 'awaiting_approval') {
        this.detach(task.id, step.nodeId);
        this.applyStep(task, step, { type: 'RESET' });
      }
    }
    this.counters.errored += 1;
    this.log('error', `Error en «${task.title}»: ${error}`, task.id, null);
    this.touch(task);
  }

  private detach(taskId: string, nodeId: string): void {
    this.queueOf(nodeId).delete(taskId);
    this.awaitingOf(nodeId).delete(taskId);
  }

  private retire(taskId: string): void {
    this.terminalOrder.push(taskId);
  }

  /** Solo tras emitir: el estado final de una tarea siempre llega a los suscriptores antes de olvidarla. */
  private evictTerminal(): void {
    while (this.terminalOrder.length > this.retainTerminal) {
      const old = this.terminalOrder.shift();
      if (old !== undefined) this.tasks.delete(old);
    }
  }

  private recordRun(task: TaskRuntime, step: StepRuntime, outcome: StageOutcome, error: string | null): void {
    this.emit('onStageRun', {
      id: this.idFactory(),
      taskId: task.id,
      nodeId: step.nodeId,
      attempt: Math.max(step.attempts, 1),
      queuedAt: step.queuedAt ?? this.simTime,
      startedAt: step.startedAt ?? this.simTime,
      finishedAt: step.finishedAt ?? this.simTime,
      outcome,
      error,
    });
  }

  private touch(task: TaskRuntime): void {
    task.updatedAt = this.simTime;
    this.dirty.add(task.id);
  }

  private toView(task: TaskRuntime): TaskView {
    const { workflow: _w, order, steps: _s, ...rest } = task;
    return {
      ...rest,
      steps: order.map((id) => {
        const { plan: _p, finishAt: _f, ...view } = this.requireStep(task, id);
        return { ...view, deps: [...view.deps] };
      }),
    };
  }

  private requireTask(id: string): TaskRuntime {
    const task = this.tasks.get(id);
    if (!task) throw notFound(`La tarea ${id}`);
    return task;
  }

  private requireStep(task: TaskRuntime, nodeId: string): StepRuntime {
    const step = task.steps.get(nodeId);
    if (!step) throw new Error(`Paso ${nodeId} ausente en ${task.id}`);
    return step;
  }

  private requireConfig(nodeId: string): NodeConfig {
    const cfg = this.configs.get(nodeId);
    if (!cfg) throw new Error(`Config ausente: ${nodeId}`);
    return cfg;
  }

  private requireStats(nodeId: string): NodeStats {
    const st = this.stats.get(nodeId);
    if (!st) throw new Error(`Stats ausentes: ${nodeId}`);
    return st;
  }

  private queueOf(nodeId: string): Set<string> {
    return getOrThrow(this.queues, nodeId);
  }

  private runningOf(nodeId: string): Set<string> {
    return getOrThrow(this.running, nodeId);
  }

  private awaitingOf(nodeId: string): Set<string> {
    return getOrThrow(this.awaiting, nodeId);
  }
}

function latestTimestamp(views: readonly TaskView[]): number {
  let max = -Infinity;
  for (const v of views) {
    max = Math.max(max, v.updatedAt, v.createdAt, v.startedAt ?? -Infinity, v.completedAt ?? -Infinity);
    for (const s of v.steps) max = Math.max(max, s.queuedAt ?? -Infinity, s.startedAt ?? -Infinity, s.finishedAt ?? -Infinity);
  }
  return max;
}

function getOrThrow<V>(map: ReadonlyMap<string, V>, key: string): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(`Nodo desconocido: ${key}`);
  return value;
}

function compareKeys(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < a.length; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Cuellos de botella: puntuación = presión de cola relativa a capacidad + saturación
 * + aprobaciones humanas pendientes + inestabilidad reciente. Devuelve los 5 peores con motivo legible.
 */
export function detectBottlenecks(nodes: readonly NodeMetrics[]): Bottleneck[] {
  const out: Bottleneck[] = [];
  for (const m of nodes) {
    const reasons: string[] = [];
    let score = 0;
    if (m.queued > 0) {
      score += m.queued / Math.max(1, m.capacity);
      if (m.queued >= m.capacity) reasons.push(`cola ${m.queued} ≥ capacidad ${m.capacity}`);
    }
    if (m.utilization >= 1 && m.queued > 0) {
      score += 1;
      reasons.push('saturado al 100 %');
    }
    if (m.awaiting > 0) {
      score += m.awaiting;
      reasons.push(`${m.awaiting} esperando aprobación humana`);
    }
    if (m.health === 'error' && m.successRate !== null) {
      score += 2;
      reasons.push(`fallos recientes (éxito ${(m.successRate * 100).toFixed(0)} %)`);
    }
    if (reasons.length > 0) out.push({ nodeId: m.nodeId, score: Number(score.toFixed(2)), reason: reasons.join(' · ') });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 5);
}

