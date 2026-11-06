/**
 * AgentOS - Modal de Balanceador Predictivo de Carga (Predictive Load Balancer)
 * Visualiza la presión de colas por carril, calcula el índice de asimetría y
 * permite aplicar sugerencias de redistribución automática para optimizar throughput.
 */

import React, { useState, useMemo } from 'react';
import {
  Scale,
  Zap,
  ArrowRight,
  TrendingUp,
  Sliders,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  X,
  Gauge,
  Flame,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { PipelineTask, PipelineNode, TaskLane, PredictiveRedistributionSuggestion } from '../types/pipeline';
import {
  analyzePredictiveLoadBalancing,
  applyRedistributionSuggestion,
} from '../pipeline/loadBalancer';

interface PredictiveLoadBalancerModalProps {
  tasks: PipelineTask[];
  nodes: PipelineNode[];
  isOpen: boolean;
  onClose: () => void;
  onApplyRedistribution?: (taskId: string, targetLane: TaskLane) => void;
}

export const PredictiveLoadBalancerModal: React.FC<PredictiveLoadBalancerModalProps> = ({
  tasks,
  nodes,
  isOpen,
  onClose,
  onApplyRedistribution,
}) => {
  if (!isOpen) return null;

  const [autoRebalance, setAutoRebalance] = useState<boolean>(true);
  const [appliedToast, setAppliedToast] = useState<string | null>(null);

  const report = useMemo(() => {
    return analyzePredictiveLoadBalancing(tasks, nodes, autoRebalance);
  }, [tasks, nodes, autoRebalance]);

  const handleApply = (suggestion: PredictiveRedistributionSuggestion) => {
    if (onApplyRedistribution) {
      onApplyRedistribution(suggestion.taskId, suggestion.suggestedTargetLane);
    }
    setAppliedToast(
      `Tarea [${suggestion.taskTitle}] redistribuida exitosamente al carril ${suggestion.suggestedTargetLane.toUpperCase()}`
    );
    setTimeout(() => setAppliedToast(null), 3500);
  };

  const getStatusBadge = (status: 'optimal' | 'imbalanced' | 'critical_congestion') => {
    switch (status) {
      case 'critical_congestion':
        return {
          label: 'CONGESTIÓN CRÍTICA PREDICTIVA',
          bg: 'bg-rose-950/80 border-rose-500 text-rose-300',
        };
      case 'imbalanced':
        return {
          label: 'ASIMETRÍA DE COLAS DETECTADA',
          bg: 'bg-amber-950/80 border-amber-500 text-amber-300',
        };
      case 'optimal':
      default:
        return {
          label: 'COLAS EQUILIBRADAS (OPTIMAL)',
          bg: 'bg-emerald-950/80 border-emerald-500 text-emerald-300',
        };
    }
  };

  const statusBadge = getStatusBadge(report.systemStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150 text-xs font-mono">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-950/80 border border-cyan-700 text-cyan-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Balanceador Predictivo de Carga (Predictive Load Balancer)
                </h3>
                <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${statusBadge.bg}`}>
                  {statusBadge.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Monitorea presión de colas y redistribuye dinámicamente tareas hacia carriles infrautilizados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRebalance(!autoRebalance)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs border transition cursor-pointer ${
                autoRebalance
                  ? 'bg-cyan-600/25 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Auto-Balanceo: {autoRebalance ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast de Redistribución */}
        {appliedToast && (
          <div className="bg-cyan-950/90 border-b border-cyan-700/60 p-2.5 px-5 text-cyan-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs font-bold">{appliedToast}</span>
          </div>
        )}

        {/* Métricas HUD del Balanceador */}
        <div className="bg-slate-950/60 border-b border-slate-800 p-4 px-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10.5px] text-slate-500 block">Índice de Asimetría:</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <strong className={`text-sm font-bold ${report.imbalanceScore >= 45 ? 'text-amber-400' : 'text-cyan-300'}`}>
                {report.imbalanceScore}%
              </strong>
              <span className="text-[10px] text-slate-500">desviación</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10.5px] text-slate-500 block">Profundidad Total Cola:</span>
            <strong className="text-white text-sm font-bold block mt-0.5">
              {report.globalQueueDepth} tareas pendientes
            </strong>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10.5px] text-slate-500 block">Ganancia Potencial Throughput:</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <strong className="text-emerald-300 text-sm font-bold">
                +{report.totalPotentialThroughputGainPercent}%
              </strong>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10.5px] text-slate-500 block">Sugerencias Activas:</span>
            <strong className="text-purple-300 text-sm font-bold block mt-0.5">
              {report.suggestions.length} recomendaciones
            </strong>
          </div>
        </div>

        {/* Cuerpo: Columnas de Presión por Carril + Sugerencias */}
        <div className="p-6 overflow-y-auto space-y-6 bg-slate-950 flex-1">
          {/* 1. Presión de Colas en Tiempo Real por Carril */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
              Presión de Colas por Carril de Ejecución:
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['standard', 'express', 'urgent'] as TaskLane[]).map((lane) => {
                const press = report.lanePressures[lane];
                if (!press) return null;

                const isUnder = press.status === 'underutilized';
                const isCongested = press.status === 'congested';

                return (
                  <div
                    key={lane}
                    className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                      isCongested
                        ? 'bg-rose-950/25 border-rose-500/50'
                        : isUnder
                        ? 'bg-cyan-950/20 border-cyan-500/40'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{press.laneLabel}</span>
                        <span
                          className="px-2 py-0.5 rounded text-[9.5px] font-bold uppercase"
                          style={{
                            color: press.statusColor,
                            backgroundColor: `${press.statusColor}18`,
                            border: `1px solid ${press.statusColor}40`,
                          }}
                        >
                          {press.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Medidor de Saturación */}
                      <div className="space-y-1 mt-2.5">
                        <div className="flex justify-between text-[10.5px]">
                          <span className="text-slate-400">Saturación de Cola:</span>
                          <span className="font-bold" style={{ color: press.statusColor }}>
                            {press.saturationRatio}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${press.saturationRatio}%`,
                              backgroundColor: press.statusColor,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Desglose de tareas */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Encoladas:</span>
                        <strong className="text-white">{press.queuedTasksCount}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">En Ejecución:</span>
                        <strong className="text-amber-300">{press.runningTasksCount}</strong>
                      </div>
                      <div className="col-span-2 pt-1 text-[10px] text-slate-400">
                        Tiempo estimado vaciado:{' '}
                        <strong className="text-cyan-300">{press.estimatedQueueTimeSec}s</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Sugerencias de Redistribución Automática */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Sugerencias de Redistribución Predictiva ({report.suggestions.length}):
              </span>
              <span className="text-slate-500 text-[10px]">
                Previene contención en nodos críticos (Builder & Approver)
              </span>
            </div>

            {report.suggestions.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 space-y-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                <p className="font-bold text-xs text-white">Todas las colas operan en equilibrio óptimo.</p>
                <p className="text-[11px] text-slate-500">
                  No hay cuellos de botella predictivos inminentes en ninguno de los 3 carriles.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {report.suggestions.map((sug) => (
                  <div
                    key={sug.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-xs">{sug.taskTitle}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-slate-400 text-[9.5px]">
                          {sug.taskId}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-950 border border-amber-800 text-amber-300 text-[9.5px] font-bold">
                          {sug.priority}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-300 pt-0.5">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 uppercase text-[10px]">
                          {sug.sourceLane}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 font-bold uppercase text-[10px]">
                          {sug.suggestedTargetLane}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold ml-2">
                          +{sug.throughputGainPercent}% Throughput (Ahorro ~{sug.estimatedLatencySavingSec}s)
                        </span>
                      </div>

                      <p className="text-[10.5px] text-slate-400 font-sans mt-1">
                        {sug.reason}
                      </p>
                    </div>

                    <button
                      onClick={() => handleApply(sug)}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20 active:scale-95 shrink-0"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Redistribuir Ahora</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-slate-400">
          <span className="text-[11px]">
            Algoritmo heurístico basado en latencias p95 y cuotas de throughput por carril.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
