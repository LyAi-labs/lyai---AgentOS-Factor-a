/**
 * AgentOS - Motor de Análisis de Rendimiento de Nodos (Node Performance Summary)
 * Genera series temporales de 24 horas (éxitos/errores/latencia) y diagnósticos de tendencia.
 */

import { PipelineNode, HourlyPerformancePoint, NodePerformanceSummary } from '../types/pipeline';

/**
 * Función hash pseudo-aleatoria simple y determinista basada en string
 */
function pseudoHash(str: string, seed: number): number {
  let hash = seed;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}

/**
 * Genera el resumen y serie de 24 horas de éxitos y fallas para un nodo específico.
 */
export function calculateNodePerformanceSummary(
  node: PipelineNode,
  referenceTimestamp: number = Date.now()
): NodePerformanceSummary {
  const baseSuccess = Math.max(1, node.metrics.successCount);
  const baseError = Math.max(0, node.metrics.errorCount);
  const baseLatency = Math.max(30, node.metrics.executionTimeMs || node.metrics.p95LatencyMs * 0.7);

  const hourlyPoints: HourlyPerformancePoint[] = [];
  const refDate = new Date(referenceTimestamp);
  const currentHour = refDate.getHours();

  let total24hSuccesses = 0;
  let total24hErrors = 0;
  let peakErrorHour = '';
  let maxErrorInHour = -1;
  let peakVolumeHour = '';
  let maxVolumeInHour = -1;
  let latencySum = 0;

  for (let i = 23; i >= 0; i--) {
    const hourTimestamp = referenceTimestamp - i * 3600 * 1000;
    const hourDate = new Date(hourTimestamp);
    const h = hourDate.getHours();
    const hourStr = `${h.toString().padStart(2, '0')}:00`;

    // Patrón diurno / nocturno (mayor volumen en horas laborales 9h - 18h)
    const isWorkingHours = h >= 8 && h <= 19;
    const diurnalFactor = isWorkingHours ? 1.4 : 0.6;

    // Variación determinista por nodo y por hora
    const seed = pseudoHash(node.id, i * 7919 + h * 31);
    const randNorm = (seed % 100) / 100; // 0.00 a 0.99

    // Volumen base por hora
    const hourlyBaseLoad = Math.max(1, Math.round((baseSuccess / 3.5) * diurnalFactor));
    const variance = 0.7 + randNorm * 0.6; // 0.7x a 1.3x
    const successThisHour = Math.max(1, Math.round(hourlyBaseLoad * variance));

    // Errores en esta hora: distribuidos con probabilidad más alta si el nodo tiene errores registrados
    let errorThisHour = 0;
    if (baseError > 0) {
      // 1 de cada 4 horas puede presentar fallas si el nodo tiene errores
      const errorProb = (pseudoHash(node.id + '-err', i * 401 + h) % 100) / 100;
      if (errorProb > 0.68) {
        errorThisHour = Math.max(1, Math.round((baseError * 0.35 + 1) * randNorm));
      } else if (errorProb > 0.92) {
        // Pico esporádico
        errorThisHour = Math.max(2, Math.round(baseError * 0.7 + 2));
      }
    }

    const totalExec = successThisHour + errorThisHour;
    const rate = totalExec > 0 ? (successThisHour / totalExec) * 100 : 100;

    // Latencia promedio de la hora (afectada si hay errores o picos)
    const latencyFactor = errorThisHour > 0 ? 1.35 : 0.95 + randNorm * 0.2;
    const avgLatency = Math.round(baseLatency * latencyFactor);

    total24hSuccesses += successThisHour;
    total24hErrors += errorThisHour;
    latencySum += avgLatency * totalExec;

    if (errorThisHour > maxErrorInHour) {
      maxErrorInHour = errorThisHour;
      peakErrorHour = hourStr;
    }

    if (totalExec > maxVolumeInHour) {
      maxVolumeInHour = totalExec;
      peakVolumeHour = hourStr;
    }

    hourlyPoints.push({
      hourIndex: 23 - i,
      hour: hourStr,
      timestamp: hourTimestamp,
      successCount: successThisHour,
      errorCount: errorThisHour,
      totalExecutions: totalExec,
      successRate: Math.round(rate * 10) / 10,
      avgLatencyMs: avgLatency,
    });
  }

  const total24hExecutions = total24hSuccesses + total24hErrors;
  const overall24hSuccessRate =
    total24hExecutions > 0
      ? Math.round((total24hSuccesses / total24hExecutions) * 1000) / 10
      : 100;
  const avgLatencyMs =
    total24hExecutions > 0 ? Math.round(latencySum / total24hExecutions) : baseLatency;

  // Diagnóstico de tendencia en base a tasa de éxito y p95
  let trendStatus: 'optimal' | 'stable' | 'degrading' | 'investigate' = 'optimal';
  let trendMessage = 'Rendimiento nominal y alta resiliencia en las últimas 24 horas.';

  if (overall24hSuccessRate < 85 || node.metrics.p95LatencyMs > 900) {
    trendStatus = 'investigate';
    trendMessage = `Atención requerida: tasa de éxito degradada (${overall24hSuccessRate}%) y pico de ${maxErrorInHour} errores a las ${peakErrorHour}.`;
  } else if (overall24hSuccessRate < 94 || total24hErrors > 15) {
    trendStatus = 'degrading';
    trendMessage = `Leve degradación detectada en la ventana de las ${peakErrorHour} con ${total24hErrors} fallas acumuladas.`;
  } else if (overall24hSuccessRate < 98) {
    trendStatus = 'stable';
    trendMessage = `Operación estable (${overall24hSuccessRate}% de éxito) con variaciones controladas de carga.`;
  }

  return {
    nodeId: node.id,
    nodeName: node.name,
    total24hExecutions,
    total24hSuccesses,
    total24hErrors,
    overall24hSuccessRate,
    p95LatencyMs: node.metrics.p95LatencyMs,
    avgLatencyMs,
    peakErrorHour,
    peakVolumeHour,
    trendStatus,
    trendMessage,
    hourlyPoints,
  };
}
