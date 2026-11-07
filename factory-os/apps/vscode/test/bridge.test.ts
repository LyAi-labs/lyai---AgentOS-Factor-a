import { describe, expect, it, vi } from 'vitest';
import { Bridge, type BridgeTransport, type SimulatedSocket } from '../src/bridge.js';
import { getCsp, renderWebviewHtml } from '../src/csp.js';
import packageJson from '../package.json' with { type: 'json' };

describe('vscode-extension', () => {
  it('[VSC-001] declara la extensión en el panel inferior con puerto 8094 y publisher lyai', () => {
    expect(packageJson.publisher).toBe('lyai');
    expect(packageJson.name).toBe('factory-os');
    const contributes = packageJson.contributes;
    expect(contributes.viewsContainers.panel).toBeDefined();
    expect(contributes.configuration.properties['factoryOs.port'].default).toBe(8094);
  });

  it('[VSC-002] responde api:result con id, estado y cuerpo, o api:error si el transporte falla', async () => {
    const sentToWebview: unknown[] = [];
    const mockPostMessage = vi.fn((msg: unknown) => {
      sentToWebview.push(msg);
    });

    const mockTransport: BridgeTransport = {
      fetch: vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === 'GET') {
          return {
            status: 200,
            text: async () => JSON.stringify({ ok: true, data: 'test' }),
          };
        }
        throw new Error('Conexión rehusada');
      }),
      createWebSocket: vi.fn(),
    };

    const bridge = new Bridge({
      postMessage: mockPostMessage,
      port: 8094,
      transport: mockTransport,
    });

    // Petición exitosa
    await bridge.handleWebviewMessage({
      type: 'api',
      id: 'req-1',
      method: 'GET',
      path: '/api/graph',
    });

    expect(sentToWebview).toContainEqual({
      type: 'api:result',
      id: 'req-1',
      status: 200,
      body: { ok: true, data: 'test' },
    });

    // Petición con fallo de transporte
    await bridge.handleWebviewMessage({
      type: 'api',
      id: 'req-2',
      method: 'POST',
      path: '/api/tasks',
      body: { title: 'tarea' },
    });

    expect(sentToWebview).toContainEqual({
      type: 'api:error',
      id: 'req-2',
      message: 'Conexión rehusada',
    });
  });

  it('[VSC-002] reenvía mensajes ws:message recibidos del socket y reenvía ws:send al socket', async () => {
    const sentToWebview: unknown[] = [];
    const mockPostMessage = vi.fn((msg: unknown) => {
      sentToWebview.push(msg);
    });

    const handlers: {
      message?: (data: string) => void;
      open?: () => void;
      close?: () => void;
    } = {};

    const socketSent: string[] = [];
    const socketCloseMock = vi.fn();

    const fakeSocket: SimulatedSocket = {
      send: (data: string) => socketSent.push(data),
      close: socketCloseMock,
      on: (event: string, handler: unknown) => {
        if (event === 'message') handlers.message = handler as (data: string) => void;
        if (event === 'open') handlers.open = handler as () => void;
        if (event === 'close') handlers.close = handler as () => void;
      },
    };

    const mockCreateWebSocket = vi.fn(() => fakeSocket);
    const mockTransport: BridgeTransport = {
      fetch: vi.fn(),
      createWebSocket: mockCreateWebSocket,
    };

    const bridge = new Bridge({
      postMessage: mockPostMessage,
      port: 8094,
      transport: mockTransport,
    });

    // Abrir WebSocket
    await bridge.handleWebviewMessage({ type: 'ws:open' });
    expect(mockCreateWebSocket).toHaveBeenCalledWith('ws://127.0.0.1:8094/ws');

    // Socket emite open
    handlers.open?.();
    expect(sentToWebview).toContainEqual({ type: 'ws:status', status: 'open' });

    // Socket recibe mensaje y lo reenvía al webview como ws:message
    handlers.message?.(JSON.stringify({ type: 'snapshot', tasks: [] }));
    expect(sentToWebview).toContainEqual({
      type: 'ws:message',
      message: { type: 'snapshot', tasks: [] },
    });

    // Webview envía ws:send y se reenvía al socket
    await bridge.handleWebviewMessage({
      type: 'ws:send',
      message: { type: 'ping' },
    });
    expect(socketSent).toContain(JSON.stringify({ type: 'ping' }));

    // Webview cierra ws:close
    await bridge.handleWebviewMessage({ type: 'ws:close' });
    expect(socketCloseMock).toHaveBeenCalled();

    // Socket emite close
    handlers.close?.();
    expect(sentToWebview).toContainEqual({ type: 'ws:status', status: 'closed' });
  });

  it('[VSC-003] rechaza rutas fuera de /api/ y URLs a otros destinos sin realizar red', async () => {
    const sentToWebview: unknown[] = [];
    const mockPostMessage = vi.fn((msg: unknown) => {
      sentToWebview.push(msg);
    });

    const fetchMock = vi.fn();
    const bridge = new Bridge({
      postMessage: mockPostMessage,
      port: 8094,
      transport: { fetch: fetchMock, createWebSocket: vi.fn() },
    });

    // Ruta no permitida
    await bridge.handleWebviewMessage({
      type: 'api',
      id: 'req-bad-1',
      method: 'GET',
      path: '/etc/passwd',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(sentToWebview).toContainEqual({
      type: 'api:error',
      id: 'req-bad-1',
      message: 'Ruta no permitida: debe comenzar por /api/',
    });

    // Intento de saltar con URL externa o diferente host
    await bridge.handleWebviewMessage({
      type: 'api',
      id: 'req-bad-2',
      method: 'GET',
      path: 'http://example.com/api/tasks',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(sentToWebview).toContainEqual({
      type: 'api:error',
      id: 'req-bad-2',
      message: 'Ruta no permitida: debe comenzar por /api/',
    });
  });

  it('[VSC-004] emite CSP estricta con nonce, sin unsafe-eval, sin orígenes remotos y sin iframe', () => {
    const csp = getCsp('vscode-webview:', 'test-nonce-12345');
    expect(csp).toContain('nonce-test-nonce-12345');
    expect(csp).toContain("default-src 'none'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toContain('http://');
    expect(csp).not.toContain('https://');

    const html = renderWebviewHtml({
      cspSource: 'vscode-webview:',
      nonce: 'test-nonce-12345',
      scriptUri: 'vscode-webview:/assets/index.js',
      styleUri: 'vscode-webview:/assets/index.css',
      title: 'Factory OS',
    });

    expect(html).toContain('nonce="test-nonce-12345"');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('https://');
    expect(html).not.toContain('unsafe-eval');
  });
});
