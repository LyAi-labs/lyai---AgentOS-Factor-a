/**
 * AgentOS - Exportación de Telemetría y Grafo de Ejecución
 * 
 * Lógica pura desacoplada para generar reportes estructurados de rendimiento,
 * estado del grafo de agentes, carriles y diagnóstico de cuellos de botella.
 */

import {
  PipelineNode,
  PipelineEdge,
  PipelineTask,
  TelemetrySummary,
  ActivityLogEntry,
  DiagramMode,
  TaskLane,
} from '../types/pipeline';
import { calculateLaneThroughput } from './projections';

export interface PipelinePerformanceReport {
  reportMetadata: {
    reportId: string;
    appName: string;
    version: string;
    exportedAt: string;
    timestamp: number;
    diagramMode: DiagramMode;
    speedMultiplier: number;
    engineStatus: 'idle' | 'running' | 'paused';
    environment: string;
  };
  telemetrySummary: TelemetrySummary & {
    p95CycleTimeSeconds: number;
    avgCycleTimeSeconds: number;
  };
  executionGraph: {
    totalNodes: number;
    totalEdges: number;
    layersCount: number;
    nodes: Array<{
      id: string;
      name: string;
      layer: number;
      type: string;
      category: string;
      operationalState: string;
      model: string;
      strictMode: boolean;
      maxRetries: number;
      metrics: {
        executionTimeMs: number;
        tokensProcessed: number;
        errorCount: number;
        memoryMb: number;
      };
      currentProgress?: number;
      currentTaskId?: string;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      lane: string;
      label?: string;
      active?: boolean;
    }>;
  };
  laneBreakdown: ReturnType<typeof calculateLaneThroughput>;
  tasksCatalog: Array<{
    id: string;
    title: string;
    priority: string;
    lane: TaskLane;
    status: string;
    progress: number;
    currentNodeId: string | null;
    durationSeconds: number;
    tokensUsed: number;
    artifactsCount: number;
    visitedNodesCount: number;
    createdAt: string;
    completedAt?: string;
  }>;
  recentActivityLogs: Array<{
    timestamp: string;
    source: string;
    level: string;
    message: string;
  }>;
  systemHealthDiagnostics: {
    overallHealthScore: number; // 0 a 100
    statusLabel: 'EXCELENTE' | 'ESTABLE' | 'DEGRADADO' | 'CRÍTICO';
    keyFindings: string[];
    optimizationRecommendations: string[];
  };
}

export interface GenerateReportParams {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  tasks: PipelineTask[];
  telemetry: TelemetrySummary;
  activityLogs: ActivityLogEntry[];
  diagramMode: DiagramMode;
  speedMultiplier: number;
  engineStatus: 'idle' | 'running' | 'paused';
}

/**
 * Genera el objeto de reporte completo de rendimiento del sistema y grafo.
 */
export function generatePipelinePerformanceReport(
  params: GenerateReportParams
): PipelinePerformanceReport {
  const {
    nodes,
    edges,
    tasks,
    telemetry,
    activityLogs,
    diagramMode,
    speedMultiplier,
    engineStatus,
  } = params;

  const now = Date.now();
  const reportId = `REP-${now}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // Cálculo de rendimiento de carriles
  const laneBreakdown = calculateLaneThroughput(tasks, speedMultiplier);

  // Mapeo detallado de nodos
  const formattedNodes = nodes.map((n) => ({
    id: n.id,
    name: n.name,
    layer: n.layer,
    type: n.type,
    category: n.category || 'agent_logic',
    operationalState: n.operationalState || 'HECHO',
    model: n.config.model || 'Heurístico / Sin modelo',
    strictMode: Boolean(n.config.strictMode),
    maxRetries: n.config.maxRetries || 3,
    metrics: {
      executionTimeMs: n.metrics.executionTimeMs,
      tokensProcessed: n.metrics.tokensProcessed,
      errorCount: n.metrics.errorCount,
      memoryMb: n.metrics.memoryMb,
    },
    currentProgress: n.currentProgress,
    currentTaskId: n.currentTaskId,
  }));

  // Mapeo de aristas
  const formattedEdges = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    lane: e.lane,
    label: e.label,
    active: e.active,
  }));

  // Catálogo de tareas
  const formattedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    lane: t.lane,
    status: t.status,
    progress: t.progress,
    currentNodeId: t.currentNodeId,
    durationSeconds: parseFloat(((t.metrics?.durationMs || 0) / 1000).toFixed(1)),
    tokensUsed: t.metrics?.totalTokens || 0,
    artifactsCount: t.artifacts?.length || 0,
    visitedNodesCount: t.visitedNodes?.length || 0,
    createdAt: new Date(t.createdAt).toISOString(),
    completedAt: t.completedAt ? new Date(t.completedAt).toISOString() : undefined,
  }));

  // Logs recientes (últimos 30)
  const formattedLogs = activityLogs.slice(-30).map((l) => ({
    timestamp: new Date(l.timestamp).toLocaleTimeString(),
    source: l.source,
    level: l.level,
    message: l.message,
  }));

  // Diagnóstico del sistema y recomendaciones
  const keyFindings: string[] = [];
  const recommendations: string[] = [];
  let healthScore = 100;

  if (telemetry.bottlenecks.length > 0) {
    const primaryBottleneck = telemetry.bottlenecks[0];
    keyFindings.push(
      `Cuello de botella detectado en nodo [${primaryBottleneck.nodeName}] con cola acumulada de ${primaryBottleneck.queueDepth} tareas y latencia promedio de ${(primaryBottleneck.avgLatencyMs / 1000).toFixed(1)}s.`
    );
    healthScore -= 10;
  } else {
    keyFindings.push('Distribución uniforme de carga entre los agentes sin cuellos de botella severos.');
  }

  if (telemetry.globalSuccessRate < 95) {
    keyFindings.push(`Tasa de éxito global reducida (${telemetry.globalSuccessRate}%). Errores detectados en verificación.`);
    healthScore -= 15;
  } else {
    keyFindings.push(`Tasa de éxito robusta del ${telemetry.globalSuccessRate}% en el ciclo de vida de los agentes.`);
  }

  if (diagramMode === 'original') {
    recommendations.push(
      'La arquitectura actual ejecuta Mockup y Spec Writer de forma secuencial en Capas 02/03. Migrar a la Propuesta AgentOS 2.0 reduciría el tiempo de ciclo en un 42% mediante paralelización de spikes.'
    );
    recommendations.push(
      'Habilitar el bus continuo de memoria contextual (Active Memory Bus) reduciría el re-procesamiento de tokens de contexto en ~35%.'
    );
  } else {
    recommendations.push(
      'Propuesta AgentOS 2.0 activa: El spike concurrente y el parche directo AST de UI Self-Healing están minimizando la latencia de reintento.'
    );
    recommendations.push(
      'El bypass SSH atómico con checkpoint garantiza reversiones en menos de 200ms ante fallos de despliegue en caliente.'
    );
  }

  const statusLabel: PipelinePerformanceReport['systemHealthDiagnostics']['statusLabel'] =
    healthScore >= 90 ? 'EXCELENTE' : healthScore >= 75 ? 'ESTABLE' : healthScore >= 50 ? 'DEGRADADO' : 'CRÍTICO';

  return {
    reportMetadata: {
      reportId,
      appName: 'AgentOS - Factoría de Desarrollo Agéntico',
      version: '2.4.0',
      exportedAt: new Date(now).toISOString(),
      timestamp: now,
      diagramMode,
      speedMultiplier,
      engineStatus,
      environment: typeof window !== 'undefined' ? 'browser_client' : 'node_server',
    },
    telemetrySummary: {
      ...telemetry,
      p95CycleTimeSeconds: parseFloat((telemetry.p95CycleTimeMs / 1000).toFixed(2)),
      avgCycleTimeSeconds: parseFloat((telemetry.avgCycleTimeMs / 1000).toFixed(2)),
    },
    executionGraph: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      layersCount: 5,
      nodes: formattedNodes,
      edges: formattedEdges,
    },
    laneBreakdown,
    tasksCatalog: formattedTasks,
    recentActivityLogs: formattedLogs,
    systemHealthDiagnostics: {
      overallHealthScore: Math.max(0, healthScore),
      statusLabel,
      keyFindings,
      optimizationRecommendations: recommendations,
    },
  };
}

/**
 * Descarga el archivo JSON en el navegador del usuario de manera segura sin ventanas emergentes.
 */
export function downloadJsonFile(data: unknown, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();

  // Limpieza de memoria
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 150);
}
