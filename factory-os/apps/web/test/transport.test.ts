import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, setRequestTransport, resetRequestTransport, type RequestTransport } from '../src/lib/api';
import { socketUrl } from '../src/lib/socket';
import { setVsCodeApi } from '../src/lib/transport';

describe('transport & bridge integration in web', () => {
  beforeEach(() => {
    resetRequestTransport();
    setVsCodeApi(undefined);
  });

  afterEach(() => {
    resetRequestTransport();
    setVsCodeApi(undefined);
    vi.restoreAllMocks();
  });

  it('usa fetch por defecto en entorno de navegador sin acquireVsCodeApi', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ nodes: [], edges: [], categories: [] }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await api.graph();
    expect(res).toEqual({ nodes: [], edges: [], categories: [] });
    expect(fetchMock).toHaveBeenCalledWith('/api/graph', expect.objectContaining({ method: 'GET' }));
  });

  it('lanza ApiError con código y estado cuando fetch devuelve error', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ error: { code: 'NOT_FOUND', message: 'No existe' } }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.task('t-999')).rejects.toThrow(ApiError);
    await expect(api.task('t-999')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('permite inyectar un transporte personalizado en api', async () => {
    const customTransport = vi.fn(
      async <T>(_method: string, _path: string): Promise<T> => {
        return { custom: true } as unknown as T;
      },
    ) as RequestTransport;
    setRequestTransport(customTransport);

    const res = await api.graph();
    expect(res).toEqual({ custom: true });
  });

  it('encamina peticiones API por postMessage si existe acquireVsCodeApi', async () => {
    const postMessageMock = vi.fn((msg: { type: string; id: string; method: string; path: string; body?: unknown }) => {
      // Simular respuesta del host
      if (msg.path === '/api/graph') {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: {
              type: 'api:result',
              id: msg.id,
              status: 200,
              body: { nodes: ['n1'], edges: [], categories: [] },
            },
          }),
        );
      } else if (msg.path === '/api/tasks/bad') {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: {
              type: 'api:error',
              id: msg.id,
              message: 'Fallo de red',
            },
          }),
        );
      }
    });

    setVsCodeApi({
      postMessage: postMessageMock,
      getState: () => undefined,
      setState: () => undefined,
    });

    const graphRes = await api.graph();
    expect(graphRes).toEqual({ nodes: ['n1'], edges: [], categories: [] });
    expect(postMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'api', method: 'GET', path: '/api/graph' }),
    );

    await expect(api.task('bad')).rejects.toThrow(ApiError);
  });

  it('construye la URL de WebSocket para el navegador', () => {
    expect(socketUrl({ protocol: 'http:', host: '127.0.0.1:8094' })).toBe('ws://127.0.0.1:8094/ws');
  });
});
