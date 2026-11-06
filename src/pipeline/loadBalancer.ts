/**
 * AgentOS - Balanceador Predictivo de Carga (Predictive Load Balancer)
 * Monitorea colas de tareas entrantes y en ejecución por carril, calcula la presión de saturación
 * y genera sugerencias predictivas de redistribución de tareas hacia carriles infrautilizados
 * para maximizar el throughput global antes de que se produzcan cuellos de botella.
 */

import {
  PipelineTask,
  PipelineNode,
  TaskLane,
  LaneQueuePressure,
  PredictiveRedistributionSuggestion,
  PredictiveLoadBalancerReport,
} from '../types/pipeline';
import { calculateLaneResourceConsumption, DEFAULT_LANE_BUDGETS } from './resourceManager';

const LANE_NAMES: Record<TaskLane, string> = {
  standard: 'Estándar',
  express: 'Exprés',
  urgent: 'Urgente P0',
};

/**
 * Calcula la presión de cola de cada carril según tareas encoladas, en ejecución y tiempos estimados
 */
export function calculateLaneQueuePressures(
  tasks: PipelineTask[],
  nodes: PipelineNode[]
): Record<TaskLane, LaneQueuePressure> {
  const lanes: TaskLane[] = ['standard', 'express', 'urgent'];
  const pressures: Partial<Record<TaskLane, LaneQueuePressure>> = {};

  const laneAvgSpeedSec: Record<TaskLane, number> = {
    standard: 4.8,
    express: 2.1,
    urgent: 1.2,
  };

  const laneCapacityThresholds: Record<TaskLane, number> = {
    standard: 8,
    express: 5,
    urgent: 3,
  };

  lanes.forEach((lane) => {
    const laneTasks = tasks.filter((t) => t.lane === lane);
    const queuedTasksCount = laneTasks.filter((t) => t.status === 'queued').length;
    const runningTasksCount = laneTasks.filter((t) => t.status === 'running').length;
    const totalPendingTasks = queuedTasksCount + runningTasksCount;

    const estimatedQueueTimeSec = Number(
      (totalPendingTasks * laneAvgSpeedSec[lane]).toFixed(1)
    );

    const maxCap = laneCapacityThresholds[lane];
    const saturationRatio = Math.min(100, Math.round((totalPendingTasks / maxCap) * 100));

    let status: LaneQueuePressure['status'] = 'balanced';
    let statusColor = '#34d399'; // Emerald

    if (saturationRatio <= 25 && totalPendingTasks <= 1) {
      status = 'underutilized';
      statusColor = '#38bdf8'; // Cyan
    } else if (saturationRatio >= 85) {
      status = 'congested';
      statusColor = '#f43f5e'; // Rose
    } else if (saturationRatio >= 60) {
      status = 'approaching_saturation';
      statusColor = '#f59e0b'; // Amber
    }

    pressures[lane] = {
      lane,
      laneLabel: LANE_NAMES[lane],
      queuedTasksCount,
      runningTasksCount,
      totalPendingTasks,
      estimatedQueueTimeSec,
      saturationRatio,
      status,
      statusColor,
    };
  });

  return pressures as Record<TaskLane, LaneQueuePressure>;
}

/**
 * Analiza asimetrías de carga y genera sugerencias predictivas de redistribución de tareas
 */
export function analyzePredictiveLoadBalancing(
  tasks: PipelineTask[],
  nodes: PipelineNode[],
  autoRebalanceActive: boolean = true
): PredictiveLoadBalancerReport {
  const now = Date.now();
  const lanePressures = calculateLaneQueuePressures(tasks, nodes);

  const pendingTasks = tasks.filter((t) => t.status === 'queued' || t.status === 'running');
  const globalQueueDepth = pendingTasks.length;

  // Cálculo de asimetría (desviación entre el carril más saturado y el menos saturado)
  const saturationValues = Object.values(lanePressures).map((p) => p.saturationRatio);
  const maxSat = Math.max(...saturationValues);
  const minSat = Math.min(...saturationValues);
  const imbalanceScore = Math.max(0, Math.min(100, Math.round(maxSat - minSat)));

  let systemStatus: PredictiveLoadBalancerReport['systemStatus'] = 'optimal';
  if (imbalanceScore >= 55 || maxSat >= 85) {
    systemStatus = 'critical_congestion';
  } else if (imbalanceScore >= 30) {
    systemStatus = 'imbalanced';
  }

  // Identificar carril destino óptimo (el de menor saturación que no sea 'urgent' a menos que sea P0)
  const sortedLanesByUnderutilization = (['express', 'standard', 'urgent'] as TaskLane[]).sort(
    (a, b) => lanePressures[a].saturationRatio - lanePressures[b].saturationRatio
  );

  const suggestions: PredictiveRedistributionSuggestion[] = [];

  // Buscar tareas encoladas en carriles sobrecargados o acercándose a la saturación
  const candidateTasks = tasks.filter((t) => t.status === 'queued');

  candidateTasks.forEach((task) => {
    const currentLanePressure = lanePressures[task.lane];
    if (currentLanePressure.status === 'congested' || currentLanePressure.status === 'approaching_saturation') {
      // Buscar el mejor carril destino disponible
      const targetLane = sortedLanesByUnderutilization.find(
        (target) => target !== task.lane && lanePressures[target].status !== 'congested'
      );

      if (targetLane) {
        const timeSavingSec = Math.max(
          0.8,
          Number((currentLanePressure.estimatedQueueTimeSec - lanePressures[targetLane].estimatedQueueTimeSec).toFixed(1))
        );
        const gainPercent = Math.min(
          48,
          Math.max(12, Math.round((timeSavingSec / (currentLanePressure.estimatedQueueTimeSec || 1)) * 100))
        );

        suggestions.push({
          id: `pred-sug-${task.id}-${targetLane}`,
          taskId: task.id,
          taskTitle: task.title,
          sourceLane: task.lane,
          suggestedTargetLane: targetLane,
          priority: task.priority,
          estimatedLatencySavingSec: timeSavingSec,
          throughputGainPercent: gainPercent,
          confidenceScore: Math.min(96, Math.max(72, 85 + (task.priority === 'P1_HIGH' ? 8 : 0))),
          reason: `Carril [${LANE_NAMES[task.lane]}] con saturación al ${currentLanePressure.saturationRatio}%. Desviar a carril infrautilizado [${LANE_NAMES[targetLane]}] evita bloqueo preventivo.`,
        });
      }
    }
  });

  // Si no hay candidatos automáticos por cola pero hay asimetría, proponer optimizaciones preventivas
  if (suggestions.length === 0 && candidateTasks.length > 0 && imbalanceScore >= 35) {
    const task = candidateTasks[0];
    const underutilized = sortedLanesByUnderutilization[0];
    if (task.lane !== underutilized) {
      suggestions.push({
        id: `pred-sug-proactive-${task.id}-${underutilized}`,
        taskId: task.id,
        taskTitle: task.title,
        sourceLane: task.lane,
        suggestedTargetLane: underutilized,
        priority: task.priority,
        estimatedLatencySavingSec: 1.4,
        throughputGainPercent: 22,
        confidenceScore: 84,
        reason: `Divergencia de carga detectada (${imbalanceScore}%). Balanceo predictivo para amortiguar jitter upstream.`,
      });
    }
  }

  const totalGain = Math.min(
    65,
    suggestions.reduce((acc, s) => acc + s.throughputGainPercent, 0)
  );

  return {
    timestamp: now,
    globalQueueDepth,
    imbalanceScore,
    systemStatus,
    lanePressures,
    suggestions,
    totalPotentialThroughputGainPercent: totalGain,
    activeAutoRebalancing: autoRebalanceActive,
  };
}

/**
 * Aplica una sugerencia de redistribución predictiva sobre una tarea específica
 */
export function applyRedistributionSuggestion(
  tasks: PipelineTask[],
  taskId: string,
  targetLane: TaskLane
): PipelineTask[] {
  return tasks.map((t) => {
    if (t.id === taskId) {
      return {
        ...t,
        lane: targetLane,
      };
    }
    return t;
  });
}
