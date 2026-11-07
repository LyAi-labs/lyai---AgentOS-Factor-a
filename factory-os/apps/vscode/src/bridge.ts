/**
 * Puente puro entre el webview de VS Code y el servidor local de Factory OS.
 * Restricciones estrictas: destino fijo 127.0.0.1 y rutas bajo /api/ (o /ws).
 */

export interface SimulatedSocket {
  send(data: string): void;
  close(): void;
  on(event: string, handler: (arg?: unknown) => void): void;
}

export interface BridgeTransport {
  fetch(url: string, init?: RequestInit): Promise<{
    status: number;
    text(): Promise<string>;
  }>;
  createWebSocket(url: string): SimulatedSocket;
}

export type WebviewIncomingMessage =
  | { type: 'api'; id: string; method: string; path: string; body?: unknown }
  | { type: 'ws:open' }
  | { type: 'ws:send'; message: unknown }
  | { type: 'ws:close' };

export type WebviewOutgoingMessage =
  | { type: 'api:result'; id: string; status: number; body: unknown }
  | { type: 'api:error'; id: string; message: string }
  | { type: 'ws:message'; message: unknown }
  | { type: 'ws:status'; status: 'connecting' | 'open' | 'closed' };

export interface BridgeOptions {
  postMessage: (msg: WebviewOutgoingMessage) => unknown;
  port?: number;
  transport?: BridgeTransport;
}

const DEFAULT_PORT = 8094;
const LOOPBACK_HOST = '127.0.0.1';

export function createDefaultTransport(): BridgeTransport {
  return {
    fetch: (url, init) => globalThis.fetch(url, init),
    createWebSocket: (url) => {
      const ws = new globalThis.WebSocket(url);
      return {
        send: (data: string) => ws.send(data),
        close: () => ws.close(),
        on: (event: string, handler: (arg?: unknown) => void) => {
          if (event === 'message') {
            ws.onmessage = (e: { data: unknown }) => handler(e.data);
          } else if (event === 'open') {
            ws.onopen = () => handler();
          } else if (event === 'close') {
            ws.onclose = () => handler();
          } else if (event === 'error') {
            ws.onerror = (e: unknown) => handler(e);
          }
        },
      };
    },
  };
}

export class Bridge {
  private readonly postMessage: (msg: WebviewOutgoingMessage) => void;
  private readonly port: number;
  private readonly transport: BridgeTransport;
  private socket: SimulatedSocket | null = null;

  constructor(options: BridgeOptions) {
    this.postMessage = (msg) => void options.postMessage(msg);
    this.port = options.port ?? DEFAULT_PORT;
    this.transport = options.transport ?? createDefaultTransport();
  }

  async handleWebviewMessage(msg: unknown): Promise<void> {
    if (!msg || typeof msg !== 'object' || !('type' in msg)) {
      return;
    }

    const message = msg as WebviewIncomingMessage;

    switch (message.type) {
      case 'api': {
        await this.handleApiRequest(message);
        break;
      }
      case 'ws:open': {
        this.openWebSocket();
        break;
      }
      case 'ws:send': {
        this.sendWebSocket(message.message);
        break;
      }
      case 'ws:close': {
        this.closeWebSocket();
        break;
      }
    }
  }

  private async handleApiRequest(req: { id: string; method: string; path: string; body?: unknown }): Promise<void> {
    const { id, method, path, body } = req;

    // Validación estricta de seguridad: solo rutas relativas que comiencen por /api/
    if (typeof path !== 'string' || !path.startsWith('/api/') || path.includes('://')) {
      this.postMessage({
        type: 'api:error',
        id,
        message: 'Ruta no permitida: debe comenzar por /api/',
      });
      return;
    }

    const targetUrl = `http://${LOOPBACK_HOST}:${this.port}${path}`;

    try {
      const headers: Record<string, string> = {
        accept: 'application/json',
      };

      const init: RequestInit = {
        method,
        headers,
      };

      if (body !== undefined) {
        headers['content-type'] = 'application/json';
        init.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const res = await this.transport.fetch(targetUrl, init);
      const text = await res.text();
      let parsedBody: unknown = null;
      if (text) {
        try {
          parsedBody = JSON.parse(text);
        } catch {
          parsedBody = text;
        }
      }

      this.postMessage({
        type: 'api:result',
        id,
        status: res.status,
        body: parsedBody,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.postMessage({
        type: 'api:error',
        id,
        message,
      });
    }
  }

  private openWebSocket(): void {
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // Ignorar error al cerrar socket previo
      }
      this.socket = null;
    }

    const wsUrl = `ws://${LOOPBACK_HOST}:${this.port}/ws`;
    this.postMessage({ type: 'ws:status', status: 'connecting' });

    try {
      this.socket = this.transport.createWebSocket(wsUrl);

      this.socket.on('open', () => {
        this.postMessage({ type: 'ws:status', status: 'open' });
      });

      this.socket.on('message', (raw: unknown) => {
        let parsed: unknown = raw;
        if (typeof raw === 'string') {
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
        }
        this.postMessage({
          type: 'ws:message',
          message: parsed,
        });
      });

      this.socket.on('close', () => {
        this.postMessage({ type: 'ws:status', status: 'closed' });
      });

      this.socket.on('error', () => {
        this.postMessage({ type: 'ws:status', status: 'closed' });
      });
    } catch {
      this.postMessage({ type: 'ws:status', status: 'closed' });
    }
  }

  private sendWebSocket(payload: unknown): void {
    if (!this.socket) return;
    try {
      const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
      this.socket.send(raw);
    } catch {
      // Ignorar fallo de envío si el socket ya no está disponible
    }
  }

  private closeWebSocket(): void {
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // Ignorar
      }
      this.socket = null;
    }
  }

  dispose(): void {
    this.closeWebSocket();
  }
}
