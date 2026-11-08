/** Cliente HTTP tipado. Los errores de la API se convierten en ApiError con el código del servidor. */
import type {
  ApiErrorBody,
  AuditEntry,
  ApprovalInput,
  CreateTaskInput,
  EngineState,
  EngineUpdate,
  GraphPayload,
  NodeConfig,
  NodeConfigUpdate,
  StageRunRecord,
  TaskView,
} from '@factory-os/shared';
import { getVsCodeApi } from './transport';

export class ApiError extends Error {
  override name = 'ApiError';
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export type RequestTransport = <T>(method: string, url: string, body?: unknown) => Promise<T>;

let customTransport: RequestTransport | null = null;
let requestIdSeq = 0;

export function setRequestTransport(transport: RequestTransport): void {
  customTransport = transport;
}

export function resetRequestTransport(): void {
  customTransport = null;
}

async function vsCodeBridgeRequest<T>(method: string, url: string, body?: unknown): Promise<T> {
  const vscode = getVsCodeApi();
  if (!vscode) {
    throw new ApiError(0, 'NO_VSCODE', 'acquireVsCodeApi no disponible');
  }

  const id = `req-${String(++requestIdSeq)}-${String(Date.now())}`;

  return new Promise<T>((resolve, reject) => {
    const handler = (event: MessageEvent<unknown>) => {
      const data = event.data;
      if (!data || typeof data !== 'object' || !('type' in data) || !('id' in data)) {
        return;
      }
      const response = data as
        | { type: 'api:result'; id: string; status: number; body: unknown }
        | { type: 'api:error'; id: string; message: string };

      if (response.id !== id) {
        return;
      }

      window.removeEventListener('message', handler);

      if (response.type === 'api:result') {
        if (response.status >= 200 && response.status < 300) {
          resolve(response.body as T);
        } else {
          const err = (response.body as ApiErrorBody | null)?.error;
          reject(new ApiError(response.status, err?.code ?? 'HTTP', err?.message ?? `HTTP ${response.status}`));
        }
      } else {
        reject(new ApiError(0, 'NETWORK', response.message));
      }
    };

    window.addEventListener('message', handler);

    vscode.postMessage({
      type: 'api',
      id,
      method,
      path: url,
      body,
    });
  });
}

async function defaultFetchRequest<T>(method: string, url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    headers['content-type'] = 'application/json';
  }
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (error) {
    throw new ApiError(0, 'NETWORK', error instanceof Error ? error.message : 'Error de red');
  }
  const text = await res.text();
  const data: unknown = text ? safeJson(text) : null;
  if (!res.ok) {
    const err = (data as ApiErrorBody | null)?.error;
    throw new ApiError(res.status, err?.code ?? 'HTTP', err?.message ?? `HTTP ${res.status}`);
  }
  return data as T;
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  if (customTransport) {
    return customTransport<T>(method, url, body);
  }
  if (getVsCodeApi()) {
    return vsCodeBridgeRequest<T>(method, url, body);
  }
  return defaultFetchRequest<T>(method, url, body);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const api = {
  graph: () => request<GraphPayload>('GET', '/api/graph'),
  createTask: (input: Partial<CreateTaskInput> & { title: string }) => request<TaskView>('POST', '/api/tasks', input),
  task: (id: string) => request<TaskView & { stageRuns: StageRunRecord[] }>('GET', `/api/tasks/${id}`),
  approve: (id: string, input: ApprovalInput) => request<TaskView>('POST', `/api/tasks/${id}/approval`, input),
  retry: (id: string) => request<TaskView>('POST', `/api/tasks/${id}/retry`),
  updateEngine: (patch: EngineUpdate) => request<EngineState>('PATCH', '/api/engine', patch),
  updateNode: (id: string, patch: NodeConfigUpdate) => request<NodeConfig>('PATCH', `/api/nodes/${id}/config`, patch),
  stopLine: (reason: string) => request<EngineState>('POST', '/api/line/stop', { reason }),
  resumeLine: (note: string) => request<EngineState>('POST', '/api/line/resume', { note }),
  audit: (limit = 50) => request<AuditEntry[]>('GET', `/api/audit?limit=${String(limit)}`),
  verifyAudit: () =>
    request<{ ok: boolean; entries: number; brokenAt: number | null; reason: string | null }>('GET', '/api/audit/verify'),
};
