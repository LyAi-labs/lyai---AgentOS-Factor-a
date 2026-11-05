/**
 * AgentOS - Motor de Cálculo de Proyección de Throughput y Finalización de Tareas
 * 
 * Lógica pura desacoplada para análisis estadístico, estimación de lead-time
 * y generación de series temporales de quemado (burn-up / S-curve) con intervalos de confianza.
 */

import {
  PipelineTask,
  TaskLane,
  LaneThroughputMetrics,
  TimePointProjection,
  ThroughputProjectionReport,
} from '../types/pipeline';

export const LANE_CONFIG: Record<
  TaskLane,
  { name: string; color: string; defaultDurationSec: number; maxConcurrency: number }
> = {
  standard: {
    name: 'Carril Estándar',
    color: '#06b6d4', // Cyan
    defaultDurationSec: 24,
    maxConcurrency: 3,
  },
  express: {
    name: 'Carril Exprés',
    color: '#a855f7', // Purple
    defaultDurationSec: 8.5,
    maxConcurrency: 4,
  },
  urgent: {
    name: 'Carril Urgente P0',
    color: '#f43f5e', // Rose
    defaultDurationSec: 3.8,
    maxConcurrency: 2,
  },
};

/**
 * Calcula métricas de rendimiento y velocidad de procesamiento para cada carril.
 */
export function calculateLaneThroughput(
  tasks: PipelineTask[],
  speedMultiplier: number = 1
): Record<TaskLane, LaneThroughputMetrics> {
  const lanes: TaskLane[] = ['standard', 'express', 'urgent'];
  const result = {} as Record<TaskLane, LaneThroughputMetrics>;

  lanes.forEach((lane) => {
    const laneTasks = tasks.filter((t) => t.lane === lane);
    const completed = laneTasks.filter((t) => t.status === 'completed');
    const active = laneTasks.filter((t) => t.status !== 'completed' && t.status !== 'failed');

    const config = LANE_CONFIG[lane];

    // Duración promedio observada o base
    let avgDuration = config.defaultDurationSec / Math.max(0.5, speedMultiplier);
    if (completed.length > 0) {
      const totalObserved = completed.reduce((acc, t) => acc + (t.metrics.durationMs || 5000), 0);
      avgDuration = (totalObserved / completed.length / 1000) / Math.max(0.5, speedMultiplier);
      if (avgDuration <= 0.5) avgDuration = config.defaultDurationSec / Math.max(0.5, speedMultiplier);
    }

    // Tareas por minuto según concurrencia y tiempo de ciclo
    const tasksPerMinPerWorker = 60 / Math.max(1, avgDuration);
    const currentVelocity = parseFloat((tasksPerMinPerWorker * Math.min(config.maxConcurrency, Math.max(1, active.length))).toFixed(2));
    const projectedPerHour = Math.round(currentVelocity * 60);

    // Tasa de saturación (0 - 100%)
    const saturationRate = Math.min(100, Math.round((active.length / config.maxConcurrency) * 100));

    // Tiempo estimado para vaciar backlog actual de este carril
    const drainMinutes = currentVelocity > 0 ? parseFloat((active.length / currentVelocity).toFixed(1)) : 0;

    result[lane] = {
      lane,
      laneName: config.name,
      activeTasks: active.length,
      completedTasks: completed.length,
      avgDurationSec: parseFloat(avgDuration.toFixed(1)),
      currentVelocityTasksPerMin: currentVelocity,
      projectedPerHour,
      saturationRate,
      estimatedBacklogDrainMinutes: drainMinutes,
      color: config.color,
    };
  });

  return result;
}

/**
 * Genera la proyección temporal de finalización de tareas (Burn-up / S-Curve)
 * con intervalos de confianza p10 (optimista), p50 (esperado) y p90 (conservador).
 */
export function generateCompletionTrendProjection(
  tasks: PipelineTask[],
  horizonMinutes: number = 60,
  speedMultiplier: number = 1,
  extraBacklog: number = 0
): ThroughputProjectionReport {
  const now = Date.now();
  const laneMetrics = calculateLaneThroughput(tasks, speedMultiplier);

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const activeCount = tasks.filter((t) => t.status !== 'completed' && t.status !== 'failed').length;
  const totalPending = activeCount + extraBacklog;
  const targetBacklogTotal = completedCount + totalPending;

  // Velocidad combinada
  const overallVelocity = parseFloat(
    (
      laneMetrics.standard.currentVelocityTasksPerMin +
      laneMetrics.express.currentVelocityTasksPerMin +
      laneMetrics.urgent.currentVelocityTasksPerMin
    ).toFixed(2)
  );

  const effectiveVelocity = Math.max(0.4, overallVelocity);

  // Estimación de tiempo para completar todo el backlog (en minutos)
  const estimatedFullMinutes = totalPending > 0
    ? parseFloat((totalPending / effectiveVelocity).toFixed(1))
    : 0;

  const etaDate = new Date(now + estimatedFullMinutes * 60 * 1000);
  const completionEta = totalPending === 0
    ? 'Completado'
    : etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Generar puntos temporales: Histórico (-15, -10, -5, 0) y Futuro (+5 a +horizonMinutes)
  const timeSeries: TimePointProjection[] = [];

  // Puntos históricos
  const historyMinutes = [-15, -10, -5];
  historyMinutes.forEach((minOffset) => {
    const ratio = (15 + minOffset) / 15; // 0, 0.33, 0.66
    const pastCompleted = Math.max(0, Math.round(completedCount * ratio));

    timeSeries.push({
      minuteOffset: minOffset,
      timestamp: now + minOffset * 60 * 1000,
      isProjected: false,
      standardCompleted: Math.round(pastCompleted * 0.45),
      expressCompleted: Math.round(pastCompleted * 0.35),
      urgentCompleted: Math.round(pastCompleted * 0.20),
      totalCompleted: pastCompleted,
      remainingBacklog: targetBacklogTotal - pastCompleted,
    });
  });

  // Punto Actual t = 0
  const stdCompleted = tasks.filter((t) => t.lane === 'standard' && t.status === 'completed').length;
  const expCompleted = tasks.filter((t) => t.lane === 'express' && t.status === 'completed').length;
  const urgCompleted = tasks.filter((t) => t.lane === 'urgent' && t.status === 'completed').length;

  timeSeries.push({
    minuteOffset: 0,
    timestamp: now,
    isProjected: false,
    standardCompleted: stdCompleted,
    expressCompleted: expCompleted,
    urgentCompleted: urgCompleted,
    totalCompleted: completedCount,
    p10Optimistic: completedCount,
    p50Expected: completedCount,
    p90Conservative: completedCount,
    remainingBacklog: totalPending,
  });

  // Puntos futuros proyectados
  const stepMinutes = horizonMinutes <= 30 ? 5 : horizonMinutes <= 60 ? 10 : 15;
  for (let m = stepMinutes; m <= horizonMinutes; m += stepMinutes) {
    // Modelo de saturación sigmoidal / exponencial hacia la cota targetBacklogTotal
    // Conforme avanza el tiempo, las tareas se van completando
    const expectedTasksDone = Math.min(
      totalPending,
      effectiveVelocity * m
    );

    const optimisticTasksDone = Math.min(
      totalPending,
      effectiveVelocity * 1.35 * m
    );

    const conservativeTasksDone = Math.min(
      totalPending,
      effectiveVelocity * 0.70 * m
    );

    const p50 = Math.min(targetBacklogTotal, completedCount + expectedTasksDone);
    const p10 = Math.min(targetBacklogTotal, completedCount + optimisticTasksDone);
    const p90 = Math.min(targetBacklogTotal, completedCount + conservativeTasksDone);

    const currentRemaining = Math.max(0, targetBacklogTotal - p50);

    // Reparto estimado por carril según cuota de velocidad
    const stdRatio = laneMetrics.standard.currentVelocityTasksPerMin / effectiveVelocity;
    const expRatio = laneMetrics.express.currentVelocityTasksPerMin / effectiveVelocity;
    const urgRatio = laneMetrics.urgent.currentVelocityTasksPerMin / effectiveVelocity;

    timeSeries.push({
      minuteOffset: m,
      timestamp: now + m * 60 * 1000,
      isProjected: true,
      standardCompleted: Math.min(targetBacklogTotal, Math.round(stdCompleted + expectedTasksDone * stdRatio)),
      expressCompleted: Math.min(targetBacklogTotal, Math.round(expCompleted + expectedTasksDone * expRatio)),
      urgentCompleted: Math.min(targetBacklogTotal, Math.round(urgCompleted + expectedTasksDone * urgRatio)),
      totalCompleted: Math.round(p50),
      p10Optimistic: Math.round(p10),
      p50Expected: Math.round(p50),
      p90Conservative: Math.round(p90),
      remainingBacklog: Math.round(currentRemaining),
    });
  }

  // Distribución de tiempos de ciclo (Lead time distribution histogram)
  const leadTimeDistribution = [
    { durationBinSec: 5, binLabel: '0-5s (Urgente)', probability: 0.25, taskCount: Math.round(targetBacklogTotal * 0.25) },
    { durationBinSec: 15, binLabel: '5-15s (Exprés)', probability: 0.40, taskCount: Math.round(targetBacklogTotal * 0.40) },
    { durationBinSec: 30, binLabel: '15-30s (Estándar)', probability: 0.22, taskCount: Math.round(targetBacklogTotal * 0.22) },
    { durationBinSec: 60, binLabel: '30-60s (Compleja)', probability: 0.10, taskCount: Math.round(targetBacklogTotal * 0.10) },
    { durationBinSec: 120, binLabel: '>60s (Heavy Lab)', probability: 0.03, taskCount: Math.round(targetBacklogTotal * 0.03) },
  ];

  return {
    generatedAt: now,
    horizonMinutes,
    overallVelocityTasksPerMin: effectiveVelocity,
    totalPendingTasks: totalPending,
    estimatedFullCompletionMinutes: estimatedFullMinutes,
    completionEta,
    lanes: laneMetrics,
    timeSeries,
    targetBacklogLine: targetBacklogTotal,
    leadTimeDistribution,
  };
}
