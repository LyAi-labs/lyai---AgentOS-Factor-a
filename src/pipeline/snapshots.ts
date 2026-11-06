/**
 * AgentOS - Servicio de Instantáneas del Grafo y Recuperación ante Desastres (Disaster Recovery)
 * Gestiona la tabla 'SystemSnapshots' con snapshots periódicos del estado global del grafo de agentes,
 * tareas, telemetría y configuración para respaldos automáticos y rollback seguro.
 */

import {
  PipelineNode,
  PipelineEdge,
  PipelineTask,
  TelemetrySummary,
  ActivityLogEntry,
  PipelineState,
} from '../types/pipeline';

export interface SystemSnapshotRecord {
  id: string;                      // Identificador único (ej. SNAP-20261106-...)
  timestamp: number;               // Unix timestamp de la instantánea
  isoDate: string;                 // Fecha ISO 8601 legible
  triggerType: 'cron_10m' | 'manual' | 'pre_disaster' | 'state_rollback';
  triggerReason: string;           // Causa o descripción del snapshot
  graphChecksum: string;           // Hash ligero de integridad del grafo
  totalNodes: number;
  totalEdges: number;
  activeTasksCount: number;
  completedTasksCount: number;
  failedTasksCount: number;
  globalHealthScore: number;       // Score de salud calculado al momento del snapshot
  retentionExpiresAt: number;      // Política de retención (ej. 7 días)
  statePayload: {
    nodes: PipelineNode[];
    edges: PipelineEdge[];
    tasks: PipelineTask[];
    telemetry: TelemetrySummary;
    activityLogsExcerpt: ActivityLogEntry[];
    activeTaskId: string | null;
    engineStatus: 'idle' | 'running' | 'paused';
    engineSpeed: number;
  };
}

export interface SystemSnapshotCatalog {
  totalSnapshots: number;
  lastSnapshotTimestamp: number | null;
  cronIntervalMinutes: number;
  autoCronActive: boolean;
  snapshots: SystemSnapshotRecord[];
}

/**
 * Genera un checksum rápido para validar la integridad del grafo guardado
 */
export function computeGraphChecksum(nodes: PipelineNode[], edges: PipelineEdge[]): string {
  const content = nodes.map(n => `${n.id}:${n.status}:${n.metrics.successCount}`).join('|') +
    '#' + edges.map(e => `${e.source}->${e.target}`).join(',');
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return `CHK-${Math.abs(hash).toString(16).toUpperCase()}`;
}

/**
 * Crea un registro completo para la tabla 'SystemSnapshots'
 */
export function createSystemSnapshot(
  state: {
    nodes: PipelineNode[];
    edges: PipelineEdge[];
    tasks: PipelineTask[];
    telemetry: TelemetrySummary;
    activityLogs: ActivityLogEntry[];
    activeTaskId: string | null;
    engineStatus: 'idle' | 'running' | 'paused';
    engineSpeed: number;
  },
  options: {
    triggerType?: 'cron_10m' | 'manual' | 'pre_disaster' | 'state_rollback';
    triggerReason?: string;
    now?: number;
  } = {}
): SystemSnapshotRecord {
  const now = options.now || Date.now();
  const triggerType = options.triggerType || 'cron_10m';
  const triggerReason =
    options.triggerReason ||
    (triggerType === 'cron_10m'
      ? 'Instantánea periódica programada del cron-job (cada 10 min) para recuperación ante desastres'
      : 'Instantánea de respaldo manual disparada por el operador');

  const checksum = computeGraphChecksum(state.nodes, state.edges);
  const healthScore = Math.round(
    Math.max(
      20,
      Math.min(
        100,
        state.telemetry.globalSuccessRate * 0.7 +
          (state.nodes.filter(n => n.status !== 'error').length / Math.max(1, state.nodes.length)) * 30
      )
    )
  );

  return {
    id: `SNAP-${new Date(now).toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    timestamp: now,
    isoDate: new Date(now).toISOString(),
    triggerType,
    triggerReason,
    graphChecksum: checksum,
    totalNodes: state.nodes.length,
    totalEdges: state.edges.length,
    activeTasksCount: state.telemetry.activeTasksCount,
    completedTasksCount: state.telemetry.completedTasksCount,
    failedTasksCount: state.telemetry.failedTasksCount,
    globalHealthScore: healthScore,
    retentionExpiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 días
    statePayload: {
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      edges: JSON.parse(JSON.stringify(state.edges)),
      tasks: JSON.parse(JSON.stringify(state.tasks)),
      telemetry: JSON.parse(JSON.stringify(state.telemetry)),
      activityLogsExcerpt: JSON.parse(JSON.stringify(state.activityLogs.slice(-25))),
      activeTaskId: state.activeTaskId,
      engineStatus: state.engineStatus,
      engineSpeed: state.engineSpeed,
    },
  };
}

/**
 * Servicio en memoria de la tabla 'SystemSnapshots' para almacenamiento y disaster-recovery
 */
export class SystemSnapshotsStorage {
  private snapshots: SystemSnapshotRecord[] = [];
  private maxCapacity = 50; // Guardar hasta 50 instantáneas (más de 8 horas de historial cada 10 min)

  constructor(initialSnapshots?: SystemSnapshotRecord[]) {
    if (initialSnapshots && initialSnapshots.length > 0) {
      this.snapshots = [...initialSnapshots];
    }
  }

  public saveSnapshot(snapshot: SystemSnapshotRecord): SystemSnapshotRecord {
    this.snapshots.unshift(snapshot);
    if (this.snapshots.length > this.maxCapacity) {
      this.snapshots = this.snapshots.slice(0, this.maxCapacity);
    }
    return snapshot;
  }

  public getAll(): SystemSnapshotRecord[] {
    return [...this.snapshots];
  }

  public getById(id: string): SystemSnapshotRecord | undefined {
    return this.snapshots.find(s => s.id === id);
  }

  public getLatest(): SystemSnapshotRecord | undefined {
    return this.snapshots[0];
  }

  public count(): number {
    return this.snapshots.length;
  }

  public deleteById(id: string): boolean {
    const prevLen = this.snapshots.length;
    this.snapshots = this.snapshots.filter(s => s.id !== id);
    return this.snapshots.length < prevLen;
  }

  public clear(): void {
    this.snapshots = [];
  }
}
