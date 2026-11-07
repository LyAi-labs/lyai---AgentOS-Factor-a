/**
 * Máquinas de estados puras de tarea y de paso.
 * Sin E/S, sin reloj, sin aleatoriedad: (estado, evento) → nuevo estado | error de transición.
 * El motor solo muta estado a través de estas funciones.
 */
import type { StepStatus, TaskStatus } from '@factory-os/shared';

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const invalid = <T>(from: string, event: string): Result<T> => ({
  ok: false,
  error: `Transición inválida: ${event} desde '${from}'`,
});

// ───────────────────────────── Tarea ─────────────────────────────

export type TaskEvent =
  | { type: 'START' }
  | { type: 'COMPLETE' }
  | { type: 'FAIL'; error: string }
  | { type: 'RETRY' };

export interface TaskStateFields {
  status: TaskStatus;
  lastError: string | null;
}

/** Tabla de transiciones permitidas, también expuesta para tests y documentación. */
export const TASK_TRANSITIONS: Readonly<Record<TaskStatus, readonly TaskEvent['type'][]>> = {
  pending: ['START', 'FAIL'],
  running: ['COMPLETE', 'FAIL'],
  completed: [],
  error: ['RETRY'],
};

export function transitionTask<T extends TaskStateFields>(task: T, event: TaskEvent): Result<T> {
  const allowed = TASK_TRANSITIONS[task.status];
  if (!allowed.includes(event.type)) return invalid(task.status, event.type);
  switch (event.type) {
    case 'START':
      return ok({ ...task, status: 'running' });
    case 'COMPLETE':
      return ok({ ...task, status: 'completed', lastError: null });
    case 'FAIL':
      return ok({ ...task, status: 'error', lastError: event.error });
    case 'RETRY':
      return ok({ ...task, status: 'pending', lastError: null });
    default: {
      const exhaustive: never = event;
      return invalid(task.status, String(exhaustive));
    }
  }
}

// ───────────────────────────── Paso ─────────────────────────────

export type StepEvent =
  | { type: 'UNBLOCK'; human: boolean }
  | { type: 'START' }
  | { type: 'SUCCEED' }
  | { type: 'FAIL'; error: string; maxAttempts: number }
  | { type: 'APPROVE' }
  | { type: 'REJECT'; error: string }
  | { type: 'RESET' }
  | { type: 'RETRY' };

export interface StepStateFields {
  status: StepStatus;
  attempts: number;
  error: string | null;
}

export const STEP_TRANSITIONS: Readonly<Record<StepStatus, readonly StepEvent['type'][]>> = {
  blocked: ['UNBLOCK', 'RESET'],
  queued: ['START', 'RESET'],
  running: ['SUCCEED', 'FAIL'],
  awaiting_approval: ['APPROVE', 'REJECT', 'RESET'],
  done: ['RESET'],
  failed: ['RETRY', 'RESET'],
};

export function transitionStep<S extends StepStateFields>(step: S, event: StepEvent): Result<S> {
  const allowed = STEP_TRANSITIONS[step.status];
  if (!allowed.includes(event.type)) return invalid(step.status, event.type);
  switch (event.type) {
    case 'UNBLOCK':
      return ok({ ...step, status: event.human ? 'awaiting_approval' : 'queued', error: null });
    case 'START':
      return ok({ ...step, status: 'running', attempts: step.attempts + 1 });
    case 'SUCCEED':
      return ok({ ...step, status: 'done', error: null });
    case 'FAIL':
      return ok({
        ...step,
        status: step.attempts >= event.maxAttempts ? 'failed' : 'queued',
        error: event.error,
      });
    case 'APPROVE':
      return ok({ ...step, status: 'done', attempts: step.attempts + 1, error: null });
    case 'REJECT':
      return ok({ ...step, status: 'failed', attempts: step.attempts + 1, error: event.error });
    case 'RESET':
      return ok({ ...step, status: 'blocked', attempts: 0, error: null });
    case 'RETRY':
      return ok({ ...step, status: 'queued', attempts: 0, error: null });
    default: {
      const exhaustive: never = event;
      return invalid(step.status, String(exhaustive));
    }
  }
}

/** Variante que lanza: el motor la usa donde una transición inválida es un bug interno. */
export function mustTransition<T>(result: Result<T>, context: string): T {
  if (!result.ok) throw new InvariantError(`${context}: ${result.error}`);
  return result.value;
}

export class InvariantError extends Error {
  override name = 'InvariantError';
}
