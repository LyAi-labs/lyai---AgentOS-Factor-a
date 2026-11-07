/**
 * Estado del cliente: reducer puro alimentado por mensajes del servidor.
 * Todo está acotado (tareas, historial, actividad) para que una sesión larga no crezca sin límite.
 */
import type {
  ActivityEvent,
  EngineState,
  MetricsSnapshot,
  NodeConfig,
  ServerMessage,
  TaskView,
} from '@factory-os/shared';

export const MAX_TASKS = 300;
export const MAX_HISTORY = 120;
export const MAX_ACTIVITY = 200;

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

export interface HistoryPoint {
  at: number;
  throughputPerMin: number;
  wip: number;
  cycleP95Ms: number | null;
  awaitingApproval: number;
}

export interface FactoryState {
  connection: ConnectionStatus;
  engine: EngineState | null;
  tasks: TaskView[];
  metrics: MetricsSnapshot | null;
  history: HistoryPoint[];
  activity: ActivityEvent[];
  configs: Record<string, NodeConfig>;
  selectedNodeId: string | null;
  selectedTaskId: string | null;
}

export type Action =
  | { type: 'server'; message: ServerMessage }
  | { type: 'connection'; status: ConnectionStatus }
  | { type: 'selectNode'; nodeId: string | null }
  | { type: 'selectTask'; taskId: string | null };

export const initialState: FactoryState = {
  connection: 'connecting',
  engine: null,
  tasks: [],
  metrics: null,
  history: [],
  activity: [],
  configs: {},
  selectedNodeId: null,
  selectedTaskId: null,
};

const byUpdatedDesc = (a: TaskView, b: TaskView) => b.updatedAt - a.updatedAt;

export function upsertTasks(current: readonly TaskView[], incoming: readonly TaskView[]): TaskView[] {
  const map = new Map(current.map((t) => [t.id, t]));
  for (const task of incoming) map.set(task.id, task);
  return [...map.values()].sort(byUpdatedDesc).slice(0, MAX_TASKS);
}

function toHistoryPoint(m: MetricsSnapshot): HistoryPoint {
  return {
    at: m.at,
    throughputPerMin: m.throughputPerMin,
    wip: m.totals.wip,
    cycleP95Ms: m.cycleTimeMs.p95,
    awaitingApproval: m.totals.awaitingApproval,
  };
}

function appendHistory(history: readonly HistoryPoint[], m: MetricsSnapshot): HistoryPoint[] {
  const last = history[history.length - 1];
  // Tiempo simulado monótono: si retrocede (reinicio del servidor), se descarta el historial previo.
  const base = last && m.at < last.at ? [] : history;
  if (last && m.at === last.at) return [...base.slice(0, -1), toHistoryPoint(m)];
  return [...base, toHistoryPoint(m)].slice(-MAX_HISTORY);
}

function applyServer(state: FactoryState, message: ServerMessage): FactoryState {
  switch (message.type) {
    case 'snapshot':
      return {
        ...state,
        engine: message.engine,
        tasks: [...message.tasks].sort(byUpdatedDesc).slice(0, MAX_TASKS),
        metrics: message.metrics,
        history: appendHistory(state.history, message.metrics),
        activity: message.activity.slice(-MAX_ACTIVITY),
        configs: Object.fromEntries(message.configs.map((c) => [c.nodeId, c])),
      };
    case 'tasks':
      return { ...state, tasks: upsertTasks(state.tasks, message.tasks) };
    case 'metrics':
      return { ...state, metrics: message.metrics, history: appendHistory(state.history, message.metrics) };
    case 'engine':
      return { ...state, engine: message.engine };
    case 'activity':
      return { ...state, activity: [...state.activity, ...message.events].slice(-MAX_ACTIVITY) };
    case 'node_config':
      return { ...state, configs: { ...state.configs, [message.config.nodeId]: message.config } };
    case 'pong':
      return state;
    default: {
      const exhaustive: never = message;
      return exhaustive;
    }
  }
}

export function reducer(state: FactoryState, action: Action): FactoryState {
  switch (action.type) {
    case 'server':
      return applyServer(state, action.message);
    case 'connection':
      return { ...state, connection: action.status };
    case 'selectNode':
      return { ...state, selectedNodeId: action.nodeId };
    case 'selectTask':
      return { ...state, selectedTaskId: action.taskId };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
