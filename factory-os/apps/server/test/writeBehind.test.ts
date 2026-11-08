import { describe, expect, it } from 'vitest';
import type { StageRunRecord, TaskView } from '@factory-os/shared';
import { MemoryRepository } from '../src/persistence/memoryRepository.js';
import { WriteBehind } from '../src/persistence/writeBehind.js';

class FlakyRepository extends MemoryRepository {
  failuresLeft = 1;
  batches = 0;
  override async persistBatch(tasks: readonly TaskView[], runs: readonly StageRunRecord[]): Promise<void> {
    if (this.failuresLeft > 0) {
      this.failuresLeft -= 1;
      throw new Error('conexión perdida');
    }
    this.batches += 1;
    await super.persistBatch(tasks, runs);
  }
}

const task = (id: string, updatedAt: number, status: TaskView['status'] = 'running'): TaskView => ({
  id,
  title: `Tarea ${id}`,
  lane: 'standard',
  kind: 'no_visual',
  priority: 'P2',
  status,
  reworkCount: 0,
  createdAt: 0,
  updatedAt,
  startedAt: 0,
  completedAt: null,
  lastError: null,
  steps: [],
});

const run = (id: string, taskId: string): StageRunRecord => ({
  id,
  taskId,
  nodeId: 'builder',
  attempt: 1,
  queuedAt: 0,
  startedAt: 0,
  finishedAt: 1,
  outcome: 'success',
  error: null,
});

describe('write-behind', () => {
  it('[API-005] coalesce por tarea, reencola un lote fallido y conserva el estado más reciente', async () => {
    const repo = new FlakyRepository();
    const errors: unknown[] = [];
    const writer = new WriteBehind(repo, 10_000, (e) => errors.push(e));

    writer.enqueueTask(task('a', 1));
    writer.enqueueTask(task('a', 2)); // coalescido
    writer.enqueueRun(run('r1', 'a'));
    await writer.flush();
    expect(errors).toHaveLength(1);
    expect(writer.getStatus()).toMatchObject({ pendingTasks: 1, pendingRuns: 1, failedFlushes: 1, lastError: 'conexión perdida' });

    // Llega un estado más nuevo de 'a' antes del reintento: no debe ser pisado por el reencolado.
    writer.enqueueTask(task('a', 3, 'completed'));
    writer.enqueueTask(task('b', 1));
    await writer.flush();
    expect(repo.batches).toBe(1);
    expect(await repo.getTask('a')).toMatchObject({ updatedAt: 3, status: 'completed' });
    expect(await repo.getTask('b')).not.toBeNull();
    expect(await repo.listStageRuns('a')).toHaveLength(1);
    expect(writer.getStatus()).toMatchObject({ pendingTasks: 0, pendingRuns: 0, lastError: null, flushes: 1 });

    await writer.stop();
  });

  it('[API-005] un registro que viola integridad se aísla y descarta sin bloquear el lote', async () => {
    class PoisonRepository extends MemoryRepository {
      override async persistBatch(tasks: readonly TaskView[], runs: readonly StageRunRecord[]): Promise<void> {
        if (runs.some((r) => r.id === 'poison')) {
          throw Object.assign(new Error('violates check constraint "stage_runs_check"'), { code: '23514' });
        }
        await super.persistBatch(tasks, runs);
      }
    }
    const repo = new PoisonRepository();
    const errors: unknown[] = [];
    const writer = new WriteBehind(repo, 10_000, (e) => errors.push(e));
    writer.enqueueTask(task('a', 1));
    writer.enqueueRun(run('ok-1', 'a'));
    writer.enqueueRun(run('poison', 'a'));
    writer.enqueueRun(run('ok-2', 'a'));
    await writer.flush();
    expect(await repo.getTask('a')).not.toBeNull();
    expect((await repo.listStageRuns('a')).map((r) => r.id).sort()).toEqual(['ok-1', 'ok-2']);
    expect(writer.getStatus()).toMatchObject({ dropped: 1, pendingRuns: 0, pendingTasks: 0, lastError: null });
    expect(errors).toHaveLength(1);

    writer.enqueueRun(run('ok-3', 'a'));
    await writer.flush();
    expect(await repo.listStageRuns('a')).toHaveLength(3);
    await writer.stop();
  });
});
