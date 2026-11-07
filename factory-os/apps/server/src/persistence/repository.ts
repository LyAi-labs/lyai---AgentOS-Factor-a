import type {
  EdgeDef,
  LayerDef,
  ListTasksQuery,
  NodeConfig,
  NodeDef,
  StageRunRecord,
  TaskView,
} from '@factory-os/shared';

/**
 * Puerto de persistencia. El motor nunca depende de una base de datos concreta:
 * PostgresRepository en producción, MemoryRepository en tests y modo demo.
 */
export interface Repository {
  readonly kind: 'memory' | 'postgres';
  migrate(): Promise<void>;
  seedTopology(layers: readonly LayerDef[], nodes: readonly NodeDef[], edges: readonly EdgeDef[]): Promise<void>;
  loadNodeConfigs(): Promise<NodeConfig[]>;
  saveNodeConfig(config: NodeConfig): Promise<void>;
  /** Upsert atómico de instantáneas (tarea + pasos) y alta de ejecuciones, en una sola transacción. */
  persistBatch(tasks: readonly TaskView[], runs: readonly StageRunRecord[]): Promise<void>;
  loadOpenTasks(): Promise<TaskView[]>;
  listTasks(query: ListTasksQuery): Promise<TaskView[]>;
  getTask(id: string): Promise<TaskView | null>;
  listStageRuns(taskId: string): Promise<StageRunRecord[]>;
  /** Nodos alcanzables siguiendo aristas de flujo (CTE recursivo en SQL). */
  reachable(nodeId: string): Promise<string[]>;
  ping(): Promise<void>;
  close(): Promise<void>;
}
