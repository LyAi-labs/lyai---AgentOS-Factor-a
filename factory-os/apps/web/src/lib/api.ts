/** Cliente HTTP tipado. Los errores de la API se convierten en ApiError con el código del servidor. */
import type {
  ApiErrorBody,
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

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
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
};
