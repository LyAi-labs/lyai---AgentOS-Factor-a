/**
 * Difusión en tiempo real por WebSocket.
 * - Al conectar: instantánea completa (estado, tareas, métricas, actividad, configs).
 * - Después: deltas coalescidos (tareas cada 200 ms, métricas cada 1 s, actividad en lotes).
 * - Contrapresión: un cliente lento deja de recibir deltas y se le reenvía una instantánea al drenar.
 * - Latido: ping de protocolo cada 30 s; se cierra la conexión que no responda.
 */
import type { IncomingMessage } from 'node:http';
import type { RawData } from 'ws';
import type { Duplex } from 'node:stream';
import { WebSocket, WebSocketServer } from 'ws';
import { clientMessageSchema } from '@factory-os/shared';
import type { ActivityEvent, ServerMessage, TaskView } from '@factory-os/shared';
import type { FactoryRuntime, Logger } from '../runtime.js';

const MAX_BUFFERED_BYTES = 2 * 1024 * 1024;

/** `ws` entrega Buffer, ArrayBuffer o Buffer[] (fragmentado): se normaliza a UTF-8. */
export function rawDataToString(data: RawData): string {
  if (Buffer.isBuffer(data)) return data.toString('utf8');
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
  return Buffer.from(data).toString('utf8');
}

interface ClientState {
  alive: boolean;
  needsSnapshot: boolean;
}

export interface WsHubOptions {
  tasksIntervalMs?: number;
  metricsIntervalMs?: number;
  heartbeatMs?: number;
}

export class WsHub {
  private readonly wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
  private readonly clients = new Map<WebSocket, ClientState>();
  private pendingTasks = new Map<string, TaskView>();
  private pendingActivity: ActivityEvent[] = [];
  private readonly timers: NodeJS.Timeout[] = [];
  private readonly unsubscribe: () => void;

  constructor(
    private readonly runtime: FactoryRuntime,
    private readonly logger: Logger,
    options: WsHubOptions = {},
  ) {
    const engine = runtime.engine;
    this.unsubscribe = engine.subscribe({
      onTaskChanged: (task) => this.pendingTasks.set(task.id, task),
      onActivity: (event) => this.pendingActivity.push(event),
      onEngineChanged: (state) => this.broadcast({ type: 'engine', engine: state }),
      onConfigChanged: (config) => this.broadcast({ type: 'node_config', config }),
    });
    this.every(options.tasksIntervalMs ?? 200, () => this.flushDeltas());
    this.every(options.metricsIntervalMs ?? 1000, () => {
      if (this.clients.size > 0) {
        this.broadcast({ type: 'metrics', metrics: engine.getMetrics() });
        this.broadcast({ type: 'engine', engine: engine.getState() });
      }
    });
    this.every(options.heartbeatMs ?? 30_000, () => this.heartbeat());

    this.wss.on('connection', (socket) => this.onConnection(socket));
  }

  get clientCount(): number {
    return this.clients.size;
  }

  handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    this.wss.handleUpgrade(request, socket, head, (ws) => this.wss.emit('connection', ws, request));
  }

  private every(ms: number, fn: () => void): void {
    const timer = setInterval(fn, ms);
    timer.unref();
    this.timers.push(timer);
  }

  private onConnection(socket: WebSocket): void {
    const state: ClientState = { alive: true, needsSnapshot: false };
    this.clients.set(socket, state);
    socket.on('pong', () => {
      state.alive = true;
    });
    socket.on('message', (data) => this.onMessage(socket, rawDataToString(data)));
    socket.on('close', () => this.clients.delete(socket));
    socket.on('error', (error) => {
      this.logger.warn({ err: error }, 'error de socket');
      this.clients.delete(socket);
    });
    this.sendSnapshot(socket);
  }

  private onMessage(socket: WebSocket, raw: string): void {
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    const parsed = clientMessageSchema.safeParse(data);
    if (!parsed.success) return;
    switch (parsed.data.type) {
      case 'ping':
        this.send(socket, { type: 'pong', at: Date.now() });
        break;
      case 'resync':
        this.sendSnapshot(socket);
        break;
    }
  }

  private snapshot(): ServerMessage {
    const engine = this.runtime.engine;
    return {
      type: 'snapshot',
      engine: engine.getState(),
      tasks: engine.listTasks().slice(0, 300),
      metrics: engine.getMetrics(),
      activity: engine.getActivity().slice(-100),
      configs: engine.getConfigs(),
    };
  }

  private sendSnapshot(socket: WebSocket): void {
    this.send(socket, this.snapshot());
  }

  private flushDeltas(): void {
    if (this.pendingTasks.size > 0) {
      const tasks = [...this.pendingTasks.values()];
      this.pendingTasks = new Map();
      this.broadcast({ type: 'tasks', tasks });
    }
    if (this.pendingActivity.length > 0) {
      const events = this.pendingActivity;
      this.pendingActivity = [];
      this.broadcast({ type: 'activity', events });
    }
  }

  private broadcast(message: ServerMessage): void {
    if (this.clients.size === 0) return;
    const payload = JSON.stringify(message);
    for (const [socket, state] of this.clients) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      if (socket.bufferedAmount > MAX_BUFFERED_BYTES) {
        state.needsSnapshot = true;
        continue;
      }
      if (state.needsSnapshot) {
        state.needsSnapshot = false;
        this.sendSnapshot(socket);
        continue;
      }
      socket.send(payload);
    }
  }

  private send(socket: WebSocket, message: ServerMessage): void {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }

  private heartbeat(): void {
    for (const [socket, state] of this.clients) {
      if (!state.alive) {
        socket.terminate();
        this.clients.delete(socket);
        continue;
      }
      state.alive = false;
      socket.ping();
    }
  }

  async close(): Promise<void> {
    this.unsubscribe();
    for (const timer of this.timers) clearInterval(timer);
    for (const socket of this.clients.keys()) socket.close(1001, 'server shutdown');
    this.clients.clear();
    await new Promise<void>((resolve) => this.wss.close(() => resolve()));
  }
}
