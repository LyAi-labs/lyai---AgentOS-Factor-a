import { reachableFrom } from '@factory-os/shared';
import type {
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

  async persistBatch(tasks: readonly TaskView[], runs: readonly StageRunRecord[]): Promise<void> {
    for (const task of tasks) this.tasks.set(task.id, clone(task));
    this.runs.push(...runs.map(clone));
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
