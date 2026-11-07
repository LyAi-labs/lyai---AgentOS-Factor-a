import { reachableFrom } from '@factory-os/shared';
import type {
  AuditEntry,
  EdgeDef,
  LayerDef,
  ListTasksQuery,
  NodeConfig,
  NodeDef,
  StageRunRecord,
  TaskView,
} from '@factory-os/shared';
import type { Repository } from './repository.js';

const clone = <T>(value: T): T => structuredClone(value);

export class MemoryRepository implements Repository {
  readonly kind = 'memory' as const;
  private edges: readonly EdgeDef[] = [];
  private readonly configs = new Map<string, NodeConfig>();
  private readonly tasks = new Map<string, TaskView>();
  private readonly runs: StageRunRecord[] = [];
  private readonly audits: AuditEntry[] = [];

  async migrate(): Promise<void> {}

  async seedTopology(_layers: readonly LayerDef[], nodes: readonly NodeDef[], edges: readonly EdgeDef[]): Promise<void> {
    this.edges = edges;
    for (const node of nodes) {
      if (!this.configs.has(node.id)) this.configs.set(node.id, { nodeId: node.id, ...node.profile });
    }
  }

  async loadNodeConfigs(): Promise<NodeConfig[]> {
    return [...this.configs.values()].map(clone);
  }

  async saveNodeConfig(config: NodeConfig): Promise<void> {
    this.configs.set(config.nodeId, clone(config));
  }

  async persistBatch(
    tasks: readonly TaskView[],
    runs: readonly StageRunRecord[],
    audits: readonly AuditEntry[] = [],
  ): Promise<void> {
    for (const task of tasks) this.tasks.set(task.id, clone(task));
    this.runs.push(...runs.map(clone));
    for (const a of audits) if (!this.audits.some((x) => x.seq === a.seq)) this.audits.push(clone(a));
  }

  async loadAuditHead(): Promise<{ seq: number; hash: string } | null> {
    const last = [...this.audits].sort((a, b) => b.seq - a.seq)[0];
    return last ? { seq: last.seq, hash: last.hash } : null;
  }

  async listAudit(limit?: number): Promise<AuditEntry[]> {
    const sorted = [...this.audits].sort((a, b) => a.seq - b.seq);
    return (limit ? sorted.slice(-limit) : sorted).map(clone);
  }

  /** Solo para tests: simula manipulación directa del almacenamiento. */
  tamperAudit(seq: number, detail: string): void {
    const entry = this.audits.find((a) => a.seq === seq);
    if (entry) entry.detail = detail;
  }

  async loadOpenTasks(): Promise<TaskView[]> {
    return [...this.tasks.values()].filter((t) => t.status !== 'completed').map(clone);
  }

  async listTasks(query: ListTasksQuery): Promise<TaskView[]> {
    return [...this.tasks.values()]
      .filter((t) => (query.status ? t.status === query.status : true))
      .filter((t) => (query.lane ? t.lane === query.lane : true))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, query.limit)
      .map(clone);
  }

  async getTask(id: string): Promise<TaskView | null> {
    const task = this.tasks.get(id);
    return task ? clone(task) : null;
  }

  async listStageRuns(taskId: string): Promise<StageRunRecord[]> {
    return this.runs.filter((r) => r.taskId === taskId).sort((a, b) => a.finishedAt - b.finishedAt).map(clone);
  }

  async reachable(nodeId: string): Promise<string[]> {
    return reachableFrom(nodeId, this.edges);
  }

  async ping(): Promise<void> {}

  async close(): Promise<void> {}
}
