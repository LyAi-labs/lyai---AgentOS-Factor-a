import { useEffect, useRef } from 'react';
import { parseServerMessage } from '@factory-os/shared';
import type { ClientMessage, ServerMessage } from '@factory-os/shared';
import type { ConnectionStatus } from '../state/store';

export const BACKOFF_BASE_MS = 500;
export const BACKOFF_CAP_MS = 15_000;

/** Backoff exponencial con tope y jitter "igual" (mitad fija + mitad aleatoria). */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const exp = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempt));
  return Math.round(exp / 2 + random() * (exp / 2));
}

export function socketUrl(loc: Pick<Location, 'protocol' | 'host'> = window.location): string {
  return `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}/ws`;
}

interface Handlers {
  onMessage: (message: ServerMessage) => void;
  onStatus: (status: ConnectionStatus) => void;
}

/** Conexión WebSocket con reconexión automática. La instantánea al conectar resincroniza el estado. */
export function useFactorySocket({ onMessage, onStatus }: Handlers): void {
  const handlers = useRef({ onMessage, onStatus });
  useEffect(() => {
    handlers.current = { onMessage, onStatus };
  }, [onMessage, onStatus]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let disposed = false;

    const send = (msg: ClientMessage) => {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
    };

    const connect = () => {
      if (disposed) return;
      handlers.current.onStatus('connecting');
      socket = new WebSocket(socketUrl());
      socket.onopen = () => {
        attempt = 0;
        handlers.current.onStatus('open');
        pingTimer = setInterval(() => send({ type: 'ping' }), 20_000);
      };
      socket.onmessage = (event: MessageEvent<string>) => {
        const msg = parseServerMessage(event.data);
        if (msg) handlers.current.onMessage(msg);
      };
      socket.onclose = () => {
        if (pingTimer) clearInterval(pingTimer);
        pingTimer = null;
        if (disposed) return;
        handlers.current.onStatus('closed');
        retryTimer = setTimeout(connect, backoffDelay(attempt++));
      };
      socket.onerror = () => socket?.close();
    };

    connect();
    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (pingTimer) clearInterval(pingTimer);
      socket?.close();
    };
  }, []);
}
