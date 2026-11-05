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
