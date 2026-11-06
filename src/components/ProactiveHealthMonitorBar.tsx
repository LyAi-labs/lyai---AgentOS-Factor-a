/**
 * AgentOS - Monitor Proactivo de Salud en Segundo Plano (Proactive Health Monitor)
 * Tarea en segundo plano que analiza tendencias de telemetría (latencia p95, frecuencia de errores,
 * saturación térmica) para registrar alertas automáticas en consola y sugerir nodos para investigación.
 */

import React, { useState } from 'react';
import { ProactiveHealthReport, ProactiveDriftAlert } from '../types/pipeline';
import {
  ShieldAlert,
  Activity,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Flame,
  Clock,
  Terminal,
} from 'lucide-react';

interface ProactiveHealthMonitorBarProps {
  report: ProactiveHealthReport;
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  onForceScanAndLog: () => void;
  onInvestigateNode: (nodeId: string) => void;
}

export const ProactiveHealthMonitorBar: React.FC<ProactiveHealthMonitorBarProps> = ({
  report,
  isMonitoring,
  onToggleMonitoring,
  onForceScanAndLog,
  onInvestigateNode,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const criticalCount = report.activeAlerts.filter((a) => a.severity === 'critical').length;
  const warningCount = report.activeAlerts.filter((a) => a.severity === 'warning').length;

  const getDriftIcon = (type: ProactiveDriftAlert['driftType']) => {
    switch (type) {
      case 'error_frequency_drift':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      case 'latency_spike_drift':
        return <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'thermal_bottleneck_drift':
      default:
        return <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
    }
  };

  return (
    <div
      data-testid="proactive-health-monitor"
      className="border-t border-slate-800/90 bg-[#080d1a]/95 text-xs font-mono z-30"
    >
      {/* Barra Principal Compacta del Monitor en Segundo Plano */}
      <div className="px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Indicador de Tarea en Segundo Plano */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                !isMonitoring
                  ? 'bg-slate-500'
                  : report.status === 'critical_alert'
                  ? 'bg-rose-500 animate-ping'
                  : report.status === 'drift_detected'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[10.5px] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Proactive Health Monitor:
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                report.status === 'critical_alert'
                  ? 'bg-rose-950/90 border-rose-500/60 text-rose-300'
                  : report.status === 'drift_detected'
                  ? 'bg-amber-950/90 border-amber-500/60 text-amber-300'
                  : 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300'
              }`}
            >
              {report.status === 'critical_alert'
                ? `DERIVA CRÍTICA (${criticalCount} C / ${warningCount} W)`
                : report.status === 'drift_detected'
                ? `DERIVA DETECTADA (${report.activeAlerts.length} alertas)`
                : 'SALUD NOMINAL'}
            </span>
            <span className="text-[10.5px] text-slate-400">
              Salud Global:{' '}
              <strong
                className={
                  report.overallHealthScore >= 80
                    ? 'text-emerald-300'
                    : report.overallHealthScore >= 60
                    ? 'text-amber-300'
                    : 'text-rose-300'
                }
              >
                {report.overallHealthScore}%
              </strong>
            </span>
          </div>

          {/* Sugerencia Directa de Nodo para Investigación */}
          {report.topSuggestedNodeId && report.topSuggestedNodeName && (
            <div className="flex items-center gap-2 bg-rose-950/50 border border-rose-500/40 px-2.5 py-0.5 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="text-[10.5px] text-slate-200">
                Nodo sugerido para investigación:{' '}
                <strong className="text-rose-300">{report.topSuggestedNodeName}</strong>
              </span>
              <button
                onClick={() => onInvestigateNode(report.topSuggestedNodeId!)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/50 text-rose-200 font-bold text-[10px] transition cursor-pointer"
                title={`Abrir Node Inspector en ${report.topSuggestedNodeName} para analizar causa raíz`}
              >
                <Search className="w-3 h-3" />
                <span>Investigar Nodo</span>
              </button>
            </div>
          )}
        </div>

        {/* Controles del Monitor en Segundo Plano */}
        <div className="flex items-center gap-2">
          <button
            onClick={onForceScanAndLog}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/70 text-cyan-300 text-[10px] font-bold transition cursor-pointer"
            title="Ejecutar barrido inmediato de deriva de telemetría y emitir entradas a la Consola de Eventos"
          >
            <Terminal className="w-3 h-3" />
            <span>Auditar & Registrar en Log</span>
          </button>

          <button
            onClick={onToggleMonitoring}
            className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold transition cursor-pointer ${
              isMonitoring
                ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
            title="Activar o pausar el demonio de monitoreo proactivo en segundo plano"
          >
            <RefreshCw className={`w-3 h-3 ${isMonitoring ? 'animate-spin' : ''}`} />
            <span>{isMonitoring ? 'Daemon: ON' : 'Daemon: PAUSADO'}</span>
          </button>

          <button
            onClick={() => setIsExpanded((v) => !v)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-[10px] transition cursor-pointer"
          >
            <span>Diagnósticos ({report.activeAlerts.length})</span>
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Panel Desplegable de Alertas de Deriva y Sugerencias de Investigación */}
      {isExpanded && (
        <div className="px-4 py-3 bg-[#050811] border-t border-slate-800/80 space-y-2 max-h-52 overflow-y-auto">
          <div className="flex items-center justify-between text-[10.5px] text-slate-400 pb-1 border-b border-slate-900">
            <span>
              Detección proactiva de anomalías en {report.nodesScanned} agentes (Umbrales: Error &ge; 1, Latencia p95 &ge; 520ms, Densidad &ge; 76%)
            </span>
            <span>Último escaneo: {new Date(report.scannedAt).toLocaleTimeString()}</span>
          </div>

          {report.activeAlerts.length === 0 ? (
            <div className="py-3 flex items-center justify-center gap-2 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>No se detecta deriva de rendimiento en ningún agente del pipeline.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {report.activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-2.5 rounded-lg border flex items-start justify-between gap-3 ${
                    alert.severity === 'critical'
                      ? 'bg-rose-950/25 border-rose-500/40'
                      : 'bg-amber-950/20 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="mt-0.5">{getDriftIcon(alert.driftType)}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-[11px]">
                          {alert.nodeName} (Capa {alert.layer})
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-bold ${
                            alert.severity === 'critical'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {alert.metricLabel}: {alert.currentValue}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 mt-1 font-sans">
                        {alert.message}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onInvestigateNode(alert.nodeId)}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500/60 text-cyan-300 font-bold text-[10px] transition cursor-pointer"
                  >
                    <Search className="w-3 h-3" />
                    <span>Investigar</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
