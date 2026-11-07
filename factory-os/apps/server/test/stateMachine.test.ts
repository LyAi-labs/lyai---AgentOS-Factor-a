import { describe, expect, it } from 'vitest';
import { STEP_STATUSES, TASK_STATUSES } from '@factory-os/shared';
import type { StepStatus, TaskStatus } from '@factory-os/shared';
import {
  STEP_TRANSITIONS,
  TASK_TRANSITIONS,
  transitionStep,
  transitionTask,
} from '../src/domain/stateMachine.js';
import type { StepEvent, TaskEvent } from '../src/domain/stateMachine.js';

const TASK_EVENTS: TaskEvent[] = [
  { type: 'START' },
  { type: 'COMPLETE' },
  { type: 'FAIL', error: 'x' },
  { type: 'RETRY' },
];

const STEP_EVENTS: StepEvent[] = [
  { type: 'UNBLOCK', human: false },
  { type: 'START' },
  { type: 'SUCCEED' },
  { type: 'FAIL', error: 'x', maxAttempts: 3 },
  { type: 'APPROVE' },
  { type: 'REJECT', error: 'x' },
  { type: 'RESET' },
  { type: 'RETRY' },
];

const task = (status: TaskStatus) => ({ status, lastError: null as string | null });
const step = (status: StepStatus, attempts = 0) => ({ status, attempts, error: null as string | null });

describe('state-machine', () => {
  it('[SM-001] la tarea solo admite las transiciones declaradas', () => {
    const expected: Record<TaskStatus, Record<string, TaskStatus | null>> = {
      pending: { START: 'running', COMPLETE: null, FAIL: 'error', RETRY: null },
      running: { START: null, COMPLETE: 'completed', FAIL: 'error', RETRY: null },
      completed: { START: null, COMPLETE: null, FAIL: null, RETRY: null },
      error: { START: null, COMPLETE: null, FAIL: null, RETRY: 'pending' },
    };
    for (const status of TASK_STATUSES) {
      for (const event of TASK_EVENTS) {
        const result = transitionTask(task(status), event);
        const target = expected[status][event.type];
        if (target === null || target === undefined) {
          expect(result.ok, `${status} + ${event.type}`).toBe(false);
        } else {
          expect(result.ok, `${status} + ${event.type}`).toBe(true);
          if (result.ok) expect(result.value.status).toBe(target);
        }
      }
    }
    const failed = transitionTask(task('running'), { type: 'FAIL', error: 'boom' });
    expect(failed.ok && failed.value.lastError).toBe('boom');
  });

  it('[SM-002] completed es terminal', () => {
    expect(TASK_TRANSITIONS.completed).toHaveLength(0);
    for (const event of TASK_EVENTS) expect(transitionTask(task('completed'), event).ok).toBe(false);
  });

  it('[SM-003] un paso reintenta hasta maxAttempts y después falla', () => {
    let s = step('queued');
    const outcomes: StepStatus[] = [];
    for (let i = 0; i < 3; i++) {
      const started = transitionStep(s, { type: 'START' });
      if (!started.ok) throw new Error(started.error);
      expect(started.value.attempts).toBe(i + 1);
      const failed = transitionStep(started.value, { type: 'FAIL', error: 'e', maxAttempts: 3 });
      if (!failed.ok) throw new Error(failed.error);
      outcomes.push(failed.value.status);
      s = failed.value;
    }
    expect(outcomes).toEqual(['queued', 'queued', 'failed']);
    const retried = transitionStep(s, { type: 'RETRY' });
    expect(retried.ok && retried.value).toMatchObject({ status: 'queued', attempts: 0, error: null });
    const human = transitionStep(step('blocked'), { type: 'UNBLOCK', human: true });
    expect(human.ok && human.value.status).toBe('awaiting_approval');
  });

  it('[SM-004] una transición inválida devuelve error y no muta la entrada', () => {
    for (const status of STEP_STATUSES) {
      for (const event of STEP_EVENTS) {
        const input = step(status, 1);
        const before = structuredClone(input);
        const result = transitionStep(input, event);
        expect(input).toEqual(before);
        expect(result.ok).toBe(STEP_TRANSITIONS[status].includes(event.type));
        if (!result.ok) expect(result.error).toMatch(/Transición inválida/);
      }
    }
  });
});
