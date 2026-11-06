/**
 * AgentOS - Motor de Densidad Térmica de Agentes (Heat-Map) y Gestor de Asignación de Recursos
 *
 * Lógica pura desacoplada para:
 * 1. Calcular el mapa de calor ("Agent Density") basado en frecuencia de tareas, intensidad de tokens y latencia.
 * 2. Evaluar el consumo en tiempo real de CPU (mCPU) y Memoria (MB) por carril frente a los límites presupuestarios definidos.
 */

import {
  PipelineNode,
  PipelineTask,
  TaskLane,
  HeatTier,
  NodeDensityMetrics,
  LaneBudgetCap,
  LaneResourceConsumption,
  AutonomyLevel,
  NodeAutonomyIndex,
  LatencySamplePoint,
  NodeLatencyTrackerData,
  ProactiveDriftAlert,
  ProactiveHealthReport,
  ActivityLogEntry,
} from '../types/pipeline';
import { calculateLanePath } from './engine';

export const HEAT_TIER_STYLE: Record<
  HeatTier,
  {
    label: string;
    borderColor: string;
    glowColor: string;
    bgColor: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  cold: {
    label: 'BAJA CARGA',
    borderColor: '#06b6d4', // Cyan-500
    glowColor: 'rgba(6, 182, 212, 0.25)',
    bgColor: 'rgba(8, 51, 68, 0.55)',
    badgeBg: 'bg-cyan-950/90 border-cyan-500/40',
    badgeText: 'text-cyan-300',
  },
  warm: {
    label: 'MODERADO',
    borderColor: '#eab308', // Yellow-500
    glowColor: 'rgba(234, 179, 8, 0.32)',
    bgColor: 'rgba(66, 32, 6, 0.58)',
    badgeBg: 'bg-yellow-950/90 border-yellow-500/40',
    badgeText: 'text-yellow-300',
  },
  hot: {
    label: 'ALTA CARGA',
    borderColor: '#f97316', // Orange-500
    glowColor: 'rgba(249, 115, 22, 0.45)',
    bgColor: 'rgba(67, 20, 7, 0.68)',
    badgeBg: 'bg-orange-950/90 border-orange-500/50',
    badgeText: 'text-orange-300',
  },
  critical: {
    label: 'CUELLO BOTELLA',
    borderColor: '#f43f5e', // Rose-500
    glowColor: 'rgba(244, 63, 94, 0.65)',
    bgColor: 'rgba(76, 5, 25, 0.78)',
    badgeBg: 'bg-rose-950/90 border-rose-500/60',
    badgeText: 'text-rose-300',
  },
};

export const DEFAULT_LANE_BUDGETS: Record<TaskLane, LaneBudgetCap> = {
  standard: {
    lane: 'standard',
    laneLabel: 'Carril Estándar',
    cpuCapUnits: 1600, // 1600 mCPU (1.6 vCPU)
    memoryCapMb: 4096, // 4096 MB (4 GB)
    autoThrottle: true,
    burstAllowed: true,
  },
  express: {
    lane: 'express',
    laneLabel: 'Carril Exprés',
    cpuCapUnits: 800, // 800 mCPU (0.8 vCPU)
    memoryCapMb: 2048, // 2048 MB (2 GB)
    autoThrottle: true,
    burstAllowed: false,
  },
  urgent: {
    lane: 'urgent',
    laneLabel: 'Carril Urgente P0',
    cpuCapUnits: 1200, // 1200 mCPU (1.2 vCPU)
    memoryCapMb: 3072, // 3072 MB (3 GB)
    autoThrottle: false,
    burstAllowed: true,
  },
};

const LANE_COLORS: Record<TaskLane, string> = {
  standard: '#06b6d4', // Cyan
  express: '#a855f7',  // Purple
  urgent: '#f43f5e',   // Rose
};

/**
 * Calcula las métricas de densidad e intensidad térmica ("Agent Density") para cada nodo del grafo.
 */
export function calculateAgentDensityMap(
  nodes: PipelineNode[],
  tasks: PipelineTask[]
): Record<string, NodeDensityMetrics> {
  if (nodes.length === 0) return {};

  // Máximos de referencia para normalización (0 - 100)
  const maxTokens = Math.max(100000, ...nodes.map((n) => n.metrics.tokensProcessed || 0));
  const maxLatency = Math.max(400, ...nodes.map((n) => n.metrics.executionTimeMs || 0));

  // Contar frecuencia de paso de tareas por cada nodo
  const rawFrequencies: Record<string, number> = {};
  nodes.forEach((node) => {
    let freq = 0;
    tasks.forEach((task) => {
      if (task.visitedNodes?.includes(node.id)) freq += 1;
      if (task.currentNodeId === node.id) freq += 2; // Peso doble si está ejecutando ahora mismo
      if (task.path?.includes(node.id) && task.status === 'running') freq += 0.5;
    });
    // Sumar factor histórico derivado de tokens/ejecuciones para que el mapa refleje actividad acumulada real
    const historicalRuns = Math.round((node.metrics.tokensProcessed || 15000) / 35000) +
      Math.round((node.metrics.executionTimeMs || 50) / 140);
    rawFrequencies[node.id] = Math.max(1, Math.round(freq + historicalRuns));
  });

  const maxFrequency = Math.max(5, ...Object.values(rawFrequencies));

  const densityMap: Record<string, NodeDensityMetrics> = {};

  nodes.forEach((node) => {
    const taskFrequency = rawFrequencies[node.id] || 1;
    const freqNorm = Math.min(100, Math.round((taskFrequency / maxFrequency) * 100));
    const tokensIntensity = Math.min(
      100,
      Math.round(((node.metrics.tokensProcessed || 0) / maxTokens) * 100)
    );
    const latencyIntensity = Math.min(
      100,
      Math.round(((node.metrics.executionTimeMs || 0) / maxLatency) * 100)
    );

    // Bonus si el nodo está en ejecución activa o tiene errores
    const activeBonus = node.status === 'running' ? 18 : node.status === 'error' ? 25 : 0;

    // Índice compuesto ponderado (40% frecuencia, 35% latencia, 25% tokens + bonus activo)
    const rawScore =
      freqNorm * 0.4 + latencyIntensity * 0.35 + tokensIntensity * 0.25 + activeBonus;
    const densityScore = Math.min(100, Math.max(8, Math.round(rawScore)));

    let tier: HeatTier = 'cold';
    if (densityScore >= 76) {
      tier = 'critical';
    } else if (densityScore >= 54) {
      tier = 'hot';
    } else if (densityScore >= 32) {
      tier = 'warm';
    }

    const style = HEAT_TIER_STYLE[tier];

    densityMap[node.id] = {
      nodeId: node.id,
      nodeName: node.name,
      layer: node.layer,
      taskFrequency,
      tokensIntensity,
      latencyIntensity,
      densityScore,
      tier,
      tierLabel: style.label,
      heatBorderColor: style.borderColor,
      heatGlowColor: style.glowColor,
      heatBgColor: style.bgColor,
      isBottleneck: tier === 'critical' || (tier === 'hot' && latencyIntensity >= 70),
    };
  });

  return densityMap;
}

/**
 * Calcula el consumo de CPU (mCPU) y Memoria (MB) en tiempo real para cada carril de ejecución
 * comparándolo con los presupuestos asignados por el usuario.
 */
export function calculateLaneResourceConsumption(
  nodes: PipelineNode[],
  tasks: PipelineTask[],
  budgets: Record<TaskLane, LaneBudgetCap> = DEFAULT_LANE_BUDGETS,
  speedMultiplier: number = 1
): Record<TaskLane, LaneResourceConsumption> {
  const lanes: TaskLane[] = ['standard', 'express', 'urgent'];
  const result = {} as Record<TaskLane, LaneResourceConsumption>;

  lanes.forEach((lane) => {
    const budget = budgets[lane] || DEFAULT_LANE_BUDGETS[lane];
    const lanePathIds = calculateLanePath(lane);

    // Nodos que pertenecen a la ruta de este carril
    const laneNodes = nodes.filter((n) => lanePathIds.includes(n.id));
    const activeTasksInLane = tasks.filter(
      (t) => t.lane === lane && t.status === 'running'
    ).length;
    const queuedTasksInLane = tasks.filter(
      (t) => t.lane === lane && t.status === 'queued'
    ).length;

    // Consumo base de memoria de los contenedores/agentes en el carril + overhead por tarea activa
    const baseNodeMemory = laneNodes.reduce(
      (sum, n) => sum + Math.round((n.metrics.memoryMb || 150) * 0.55),
      0
    );
    const activeTaskMemory = activeTasksInLane * 340 + queuedTasksInLane * 90;
    const memoryUsedMb = Math.round(baseNodeMemory + activeTaskMemory);

    // Consumo de CPU en mCPU basado en latencia de cómputo, velocidad del motor y tareas activas
    const baseNodeCpu = laneNodes.reduce((sum, n) => {
      const isNodeRunning = n.status === 'running' ? 1.6 : 0.45;
      const modelFactor = n.config.model ? 1.25 : 0.6;
      return sum + Math.round((n.metrics.executionTimeMs || 80) * 0.28 * isNodeRunning * modelFactor);
    }, 0);

    const speedFactor = 1 + (speedMultiplier - 1) * 0.18;
    const taskCpuLoad = activeTasksInLane * 240 + queuedTasksInLane * 45;
    const cpuUsedUnits = Math.round((baseNodeCpu + taskCpuLoad) * speedFactor);

    const cpuUsagePercent = Math.min(
      150,
      Math.round((cpuUsedUnits / Math.max(100, budget.cpuCapUnits)) * 100)
    );
    const memoryUsagePercent = Math.min(
      150,
      Math.round((memoryUsedMb / Math.max(256, budget.memoryCapMb)) * 100)
    );
    const combinedUsagePercent = Math.round((cpuUsagePercent + memoryUsagePercent) / 2);

    const peakPercent = Math.max(cpuUsagePercent, memoryUsagePercent);
    let status: LaneResourceConsumption['status'] = 'optimal';
    if (peakPercent > 100) {
      status = 'over_budget';
    } else if (peakPercent >= 85) {
      status = 'critical';
    } else if (peakPercent >= 65) {
      status = 'elevated';
    }

    result[lane] = {
      lane,
      laneLabel: budget.laneLabel,
      budget,
      cpuUsedUnits,
      memoryUsedMb,
      cpuUsagePercent,
      memoryUsagePercent,
      combinedUsagePercent,
      activeTasksInLane,
      assignedNodesCount: laneNodes.length,
      status,
      color: LANE_COLORS[lane],
    };
  });

  return result;
}

/**
 * Calcula el Índice de Autonomía del Nodo ("Node Autonomy Index") y su puntuación de confianza (0 - 100%)
 * combinando la tasa histórica de éxito, la eficiencia de latencia p95 y la estabilidad operativa.
 */
export function calculateNodeAutonomyIndex(node: PipelineNode): NodeAutonomyIndex {
  const successCount = Math.max(0, node.metrics.successCount || 0);
  const errorCount = Math.max(0, node.metrics.errorCount || 0);
  const totalRuns = Math.max(1, successCount + errorCount);

  const rawSuccessRate = (successCount / totalRuns) * 100;
  const successRatePercent = Number(rawSuccessRate.toFixed(1));

  // 1. Puntuación de Fiabilidad Histórica (0 - 100)
  // Penaliza errores recurrentes y estado de error activo; premia volumen probado de ejecuciones exitosas
  const volumeMaturityBonus = Math.min(6, Math.round(Math.log10(totalRuns + 1) * 3));
  const errorPenalty = errorCount * 6.5 + (node.status === 'error' ? 18 : 0);
  const reliabilityScore = Math.max(
    12,
    Math.min(100, Math.round(rawSuccessRate + volumeMaturityBonus - errorPenalty))
  );

  // 2. Puntuación de Eficiencia de Latencia (0 - 100)
  // Evalúa la latencia p95 frente al umbral de SLA/timeout del nodo
  const p95Latency = Math.max(10, node.metrics.p95LatencyMs || node.metrics.executionTimeMs || 150);
  const slaCeilingMs = Math.max(800, node.config.timeoutMs ? node.config.timeoutMs * 0.45 : 2200);
  const latencyRatio = Math.min(1.25, p95Latency / slaCeilingMs);
  const latencyEfficiencyScore = Math.max(
    15,
    Math.min(100, Math.round((1 - latencyRatio * 0.72) * 100))
  );
  const slaCompliancePercent = Math.max(
    0,
    Math.min(100, Math.round((1 - Math.min(1, p95Latency / slaCeilingMs)) * 100))
  );

  // 3. Puntuación de Estabilidad y Gobernanza (0 - 100)
  let stabilityBase = node.operationalState === 'HECHO' ? 86 : 70;
  if (node.config.strictMode) stabilityBase += 8;
  if ((node.config.maxRetries || 0) >= 2) stabilityBase += 4;
  if (node.status === 'error') stabilityBase -= 25;
  const stabilityScore = Math.max(20, Math.min(100, stabilityBase));

  // Índice Compuesto Ponderado: 55% Fiabilidad, 30% Latencia, 15% Estabilidad
  const confidenceScore = Math.max(
    10,
    Math.min(
      100,
      Math.round(
        reliabilityScore * 0.55 + latencyEfficiencyScore * 0.3 + stabilityScore * 0.15
      )
    )
  );

  let autonomyLevel: AutonomyLevel = 'autonomous_l5';
  let levelLabel = 'L5 • Autonomía Plena Zero-Touch';
  let badgeColor = '#10b981'; // Emerald
  let recommendation =
    'Agente de alta fiabilidad y baja latencia p95. Apto para ejecución desatendida y auto-merge directo.';

  if (confidenceScore < 60) {
    autonomyLevel = 'human_in_loop_l2';
    levelLabel = 'L2 • Intervención Humana Requerida';
    badgeColor = '#f43f5e'; // Rose
    recommendation =
      'Confianza degradada por fallas recientes o latencia elevada. Se recomienda activar cuarentena o aprobación manual.';
  } else if (confidenceScore < 75) {
    autonomyLevel = 'supervised_l3';
    levelLabel = 'L3 • Supervisión Activa';
    badgeColor = '#f59e0b'; // Amber
    recommendation =
      'Desempeño moderado. Mantener validación cruzada por nodo verificador y monitoreo de timeout.';
  } else if (confidenceScore < 88) {
    autonomyLevel = 'high_confidence_l4';
    levelLabel = 'L4 • Alta Confianza Supervisada';
    badgeColor = '#06b6d4'; // Cyan
    recommendation =
      'Operación sólida dentro de los márgenes de SLA. Solo requiere auditoría por excepción en tareas P0.';
  }

  return {
    nodeId: node.id,
    nodeName: node.name,
    confidenceScore,
    reliabilityScore,
    latencyEfficiencyScore,
    stabilityScore,
    successRatePercent,
    slaCompliancePercent,
    autonomyLevel,
    levelLabel,
    badgeColor,
    recommendation,
  };
}

/**
 * Calcula las métricas y la serie temporal Sparkline para el widget 'Live Latency Tracker',
 * comparando el tiempo de ejecución actual frente al promedio histórico e identificando picos de latencia.
 */
export function calculateNodeLatencyTracker(
  node: PipelineNode,
  liveTickOffset: number = 0,
  manualSpikeBoostMs: number = 0
): NodeLatencyTrackerData {
  const baseExecMs = Math.max(35, node.metrics.executionTimeMs || 180);
  const p95Ms = Math.max(baseExecMs + 25, node.metrics.p95LatencyMs || Math.round(baseExecMs * 1.35));

  // Promedio histórico estable del agente
  const historicalAvgMs = Math.max(30, Math.round(baseExecMs * 0.88 + p95Ms * 0.12));
  const spikeThresholdMs = Math.round(historicalAvgMs * 1.32);

  // Semilla determinista basada en el ID del nodo para forma de onda consistente
  const idHash = node.id.split('').reduce((acc, ch, idx) => acc + ch.charCodeAt(0) * (idx + 1), 0);

  const sampleCount = 16;
  const samples: LatencySamplePoint[] = [];

  for (let i = 0; i < sampleCount; i++) {
    const stepPhase = idHash + i * 1.7 + liveTickOffset * 0.85;
    const wave = Math.sin(stepPhase) * 0.18 + Math.cos(stepPhase * 0.65) * 0.11;

    // Picos históricos ocasionales cuando la fase coincide o si el nodo acumula errores
    const errorInducedSurge =
      (node.metrics.errorCount || 0) > 0 && (i === 5 || i === 11 || i === sampleCount - 1)
        ? historicalAvgMs * 0.48
        : 0;
    const periodicBurst =
      (i + liveTickOffset) % 7 === 0 && i !== sampleCount - 1
        ? historicalAvgMs * 0.38
        : 0;

    let sampleLatency = Math.round(historicalAvgMs * (1 + wave) + errorInducedSurge + periodicBurst);

    // Último punto = Tiempo de ejecución actual en vivo
    if (i === sampleCount - 1) {
      const statusMultiplier =
        node.status === 'error'
          ? 1.62
          : node.status === 'running'
          ? 1.24
          : 1.02;
      const liveOscillation = Math.round(Math.sin(liveTickOffset * 1.3 + idHash) * (historicalAvgMs * 0.14));
      sampleLatency = Math.max(
        25,
        Math.round(baseExecMs * statusMultiplier + liveOscillation + manualSpikeBoostMs)
      );
    }

    const clampedLatency = Math.max(20, sampleLatency);
    samples.push({
      sampleIndex: i,
      timestampOffsetSec: -((sampleCount - 1 - i) * 3), // -45s a 0s
      latencyMs: clampedLatency,
      isSpike: clampedLatency >= spikeThresholdMs,
    });
  }

  const currentExecutionMs = samples[samples.length - 1].latencyMs;
  const deltaMs = currentExecutionMs - historicalAvgMs;
  const deltaPercent = Number(((deltaMs / Math.max(1, historicalAvgMs)) * 100).toFixed(1));

  const latencies = samples.map((s) => s.latencyMs);
  const peakLatencyMs = Math.max(...latencies);
  const minLatencyMs = Math.min(...latencies);

  // Jitter medio entre muestras consecutivas
  let diffSum = 0;
  for (let i = 1; i < samples.length; i++) {
    diffSum += Math.abs(samples[i].latencyMs - samples[i - 1].latencyMs);
  }
  const jitterMs = Math.round(diffSum / (samples.length - 1));
  const spikeCount = samples.filter((s) => s.isSpike).length;

  let status: NodeLatencyTrackerData['status'] = 'nominal';
  let statusLabel = 'NOMINAL • BAJO SLA';

  if (currentExecutionMs >= spikeThresholdMs || node.status === 'error') {
    status = 'spike_detected';
    statusLabel = 'PICO DE LATENCIA DETECTADO';
  } else if (deltaPercent >= 15 || spikeCount >= 3) {
    status = 'elevated';
    statusLabel = 'LATENCIA ELEVADA';
  }

  return {
    nodeId: node.id,
    nodeName: node.name,
    currentExecutionMs,
    historicalAvgMs,
    p95LatencyMs: Math.max(p95Ms, currentExecutionMs),
    spikeThresholdMs,
    deltaMs,
    deltaPercent,
    peakLatencyMs,
    minLatencyMs,
    jitterMs,
    spikeCount,
    status,
    statusLabel,
    samples,
  };
}

/**
 * Monitor Proactivo de Salud en Segundo Plano ("Proactive Health Monitor"):
 * Analiza tendencias de telemetría en todos los nodos del grafo para detectar deriva de rendimiento
 * (picos de latencia, frecuencia de errores superior al umbral o cuellos de botella térmicos),
 * generando automáticamente entradas de log y sugiriendo nodos específicos para investigación.
 */
export function analyzeTelemetryDrift(
  nodes: PipelineNode[],
  tasks: PipelineTask[],
  scanTick: number = 0,
  options?: {
    errorThreshold?: number;
    latencyThresholdMs?: number;
    densityThreshold?: number;
  }
): ProactiveHealthReport {
  const now = Date.now();
  const errorThreshold = options?.errorThreshold ?? 1;
  const latencyThresholdMs = options?.latencyThresholdMs ?? 520;
  const densityThreshold = options?.densityThreshold ?? 76;

  const densityMap = calculateAgentDensityMap(nodes, tasks);
  const alerts: ProactiveDriftAlert[] = [];

  nodes.forEach((node) => {
    const errorCount = node.metrics.errorCount || 0;
    const p95Ms = node.metrics.p95LatencyMs || 0;
    const tracker = calculateNodeLatencyTracker(node, scanTick, 0);
    const autonomy = calculateNodeAutonomyIndex(node);
    const density = densityMap[node.id];

    // 1. Detección de Frecuencia de Errores sobre el umbral
    if (errorCount >= errorThreshold || node.status === 'error') {
      const isCrit = errorCount >= 2 || node.status === 'error';
      alerts.push({
        id: `drift-err-${node.id}-${errorCount}`,
        timestamp: now,
        nodeId: node.id,
        nodeName: node.name,
        layer: node.layer,
        driftType: 'error_frequency_drift',
        severity: isCrit ? 'critical' : 'warning',
        metricLabel: 'Frecuencia de Errores',
        currentValue: `${errorCount} fallas (${autonomy.successRatePercent}% éxito)`,
        thresholdValue: `< ${errorThreshold} fallas`,
        message: `Deriva de fiabilidad detectada en [${node.name}]: ${errorCount} fallas registradas. Se sugiere investigar trazas y activar rollback preventivo.`,
        suggestedAction: `Inspeccionar nodo ${node.name} (Capa ${node.layer}) y auditar logs de error`,
      });
    }

    // 2. Detección de Picos de Latencia / Deriva de Tiempo de Ejecución
    if (p95Ms >= latencyThresholdMs || tracker.status === 'spike_detected') {
      const isCrit = p95Ms >= 720 || tracker.deltaPercent >= 35;
      alerts.push({
        id: `drift-lat-${node.id}-${tracker.currentExecutionMs}`,
        timestamp: now,
        nodeId: node.id,
        nodeName: node.name,
        layer: node.layer,
        driftType: 'latency_spike_drift',
        severity: isCrit ? 'critical' : 'warning',
        metricLabel: 'Deriva de Latencia p95',
        currentValue: `${tracker.currentExecutionMs}ms (p95: ${p95Ms}ms, ${tracker.deltaPercent >= 0 ? '+' : ''}${tracker.deltaPercent}%)`,
        thresholdValue: `≤ ${latencyThresholdMs}ms`,
        message: `Pico de latencia en [${node.name}]: ejecución actual en ${tracker.currentExecutionMs}ms vs promedio histórico de ${tracker.historicalAvgMs}ms.`,
        suggestedAction: `Abrir Live Latency Tracker en ${node.name} para evaluar picos y SLA`,
      });
    }

    // 3. Detección de Saturación Térmica / Cuello de Botella
    if (density && density.densityScore >= densityThreshold) {
      alerts.push({
        id: `drift-therm-${node.id}-${density.densityScore}`,
        timestamp: now,
        nodeId: node.id,
        nodeName: node.name,
        layer: node.layer,
        driftType: 'thermal_bottleneck_drift',
        severity: density.densityScore >= 90 ? 'critical' : 'warning',
        metricLabel: 'Densidad Térmica',
        currentValue: `${density.densityScore}% (${density.taskFrequency} tareas)`,
        thresholdValue: `< ${densityThreshold}%`,
        message: `Saturación de carga en [${node.name}]: índice térmico al ${density.densityScore}% con ${density.taskFrequency} tareas procesadas.`,
        suggestedAction: `Inspeccionar ${node.name} o ampliar presupuesto de CPU/RAM del carril`,
      });
    }
  });

  // Ordenar alertas: críticas primero, luego por capa y severidad
  alerts.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'critical' ? -1 : 1;
    }
    return a.driftType.localeCompare(b.driftType);
  });

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  const overallHealthScore = Math.max(
    18,
    Math.min(100, Math.round(100 - criticalCount * 14 - warningCount * 6))
  );

  let status: ProactiveHealthReport['status'] = 'healthy';
  if (criticalCount > 0) {
    status = 'critical_alert';
  } else if (warningCount > 0) {
    status = 'drift_detected';
  }

  const topAlert = alerts[0] || null;

  // Generar entradas de log automáticas para las principales derivas detectadas
  const generatedLogs: ActivityLogEntry[] = alerts.slice(0, 3).map((alert, idx) => ({
    id: `proactive-log-${now}-${idx}-${alert.nodeId}`,
    timestamp: now,
    level: alert.severity === 'critical' ? 'error' : 'warn',
    source: 'Proactive Health Monitor',
    layer: alert.layer,
    message: `[AUTO-DRIFT] ${alert.message} → Sugerencia: ${alert.suggestedAction}.`,
  }));

  return {
    scannedAt: now,
    nodesScanned: nodes.length,
    overallHealthScore,
    status,
    activeAlerts: alerts,
    topSuggestedNodeId: topAlert ? topAlert.nodeId : null,
    topSuggestedNodeName: topAlert ? topAlert.nodeName : null,
    generatedLogs,
  };
}



