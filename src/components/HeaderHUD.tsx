/**
 * AgentOS - Barra de Telemetría Superior (HUD) y Controles Globales
 */

import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  PlusCircle,
  FileCode2,
  Cpu,
  Layers,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  FileJson,
  GraduationCap,
} from 'lucide-react';
import { TelemetrySummary, TaskLane, LaneResourceConsumption } from '../types/pipeline';

interface HeaderHUDProps {
  telemetry: TelemetrySummary;
  engineStatus: 'idle' | 'running' | 'paused';
  speed: number;
  isConnected: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onSetSpeed: (speed: number) => void;
  onOpenNewTask: () => void;
  onOpenArchitecture: () => void;
  onOpenThroughput?: () => void;
  onOpenExport?: () => void;
  onOpenTour?: () => void;
  laneConsumption?: Record<TaskLane, LaneResourceConsumption>;
  onOpenResources?: () => void;
}

const LANE_SHORT_META: Array<{ lane: TaskLane; label: string; dotColor: string }> = [
  { lane: 'standard', label: 'Estándar', dotColor: 'bg-cyan-400' },
  { lane: 'express', label: 'Exprés', dotColor: 'bg-amber-400' },
  { lane: 'urgent', label: 'Urgente P0', dotColor: 'bg-rose-400' },
];

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  telemetry,
  engineStatus,
  speed,
  isConnected,
  onPlay,
  onPause,
  onStep,
  onReset,
  onSetSpeed,
  onOpenNewTask,
  onOpenArchitecture,
  onOpenThroughput,
  onOpenExport,
  onOpenTour,
  laneConsumption,
  onOpenResources,
}) => {
  const getBarColorClass = (status: LaneResourceConsumption['status']) => {
    switch (status) {
      case 'over_budget':
        return 'bg-rose-500';
      case 'critical':
        return 'bg-orange-500';
      case 'elevated':
        return 'bg-amber-400';
      case 'optimal':
      default:
        return 'bg-emerald-400';
    }
  };

  return (
    <header className="border-b border-cyan-950/60 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 text-slate-100 px-4 py-2 shadow-xl shadow-cyan-950/20">
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Brand & Connection State */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 via-indigo-600/30 to-purple-600/30 border border-cyan-500/40 shadow-inner shadow-cyan-500/20">
                <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping opacity-75" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-wider bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                    AgentOS
                  </span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-semibold tracking-wider">
                    v2.4
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Factoría Agéntica • Pipeline de Grafos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                  isConnected
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                }`}
                title={isConnected ? 'Conectado al servidor WebSocket en tiempo real' : 'Motor local activo'}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {isConnected ? 'LIVE WS' : 'LOCAL ENGINE'}
              </span>
            </div>
          </div>

          {/* Telemetry Metrics Badges */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto w-full md:w-auto py-1 px-1 bg-slate-900/60 border border-slate-800 rounded-lg text-xs font-mono">
            {/* Active Tasks */}
            <div className="flex items-center gap-1.5 px-2 py-1">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider">Activas</span>
                <span className="font-bold text-cyan-300">{telemetry.activeTasksCount} tareas</span>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            {/* Success Rate */}
            <div className="flex items-center gap-1.5 px-2 py-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider">Éxito</span>
                <span className="font-bold text-emerald-300">{telemetry.globalSuccessRate}%</span>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            {/* Cycle Time */}
            <div className="flex items-center gap-1.5 px-2 py-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider">Ciclo p95</span>
                <span className="font-bold text-indigo-300">{(telemetry.p95CycleTimeMs / 1000).toFixed(1)}s</span>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            {/* Token Usage & Cost */}
            <div className="flex items-center gap-1.5 px-2 py-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider">Tokens / Costo</span>
                <span className="font-bold text-purple-300">
                  {(telemetry.totalTokensUsed / 1000).toFixed(0)}k <span className="text-slate-400 text-[10px]">(${telemetry.estimatedCostUsd})</span>
                </span>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            {/* D3 Throughput Badge */}
            <button
              onClick={onOpenThroughput}
              className="flex items-center gap-1.5 px-2 py-1 hover:bg-cyan-500/10 rounded transition text-left cursor-pointer"
              title="Ver panel de proyección de finalización con gráficos D3"
            >
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[9px] text-cyan-400 uppercase tracking-wider font-bold">Throughput D3</span>
                <span className="font-bold text-cyan-200">
                  {telemetry.throughputPerHour || 48} <span className="text-slate-400 text-[10px]">/ hora</span>
                </span>
              </div>
            </button>
          </div>

          {/* Global Controls & Actions */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
            {/* Play/Pause */}
            <button
              onClick={engineStatus === 'running' ? onPause : onPlay}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-xs font-semibold transition border ${
                engineStatus === 'running'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
              title={engineStatus === 'running' ? 'Pausar motor agéntico' : 'Reanudar ejecución del pipeline'}
            >
              {engineStatus === 'running' ? (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pausar
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Reanudar
                </>
              )}
            </button>

            {/* Step Button */}
            <button
              onClick={onStep}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800 hover:text-white font-mono text-xs transition"
              title="Avanzar un solo paso del pipeline"
            >
              <FastForward className="w-3.5 h-3.5 text-cyan-400" /> Paso
            </button>

            {/* Speed Selector */}
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-md p-0.5 text-xs font-mono">
              {[1, 2, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => onSetSpeed(s)}
                  className={`px-2 py-1 rounded transition ${
                    speed === s
                      ? 'bg-cyan-500/30 text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Reset */}
            <button
              onClick={onReset}
              className="p-1.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Reinicializar grafo y tareas"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* New Task Button */}
            <button
              onClick={onOpenNewTask}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Nueva Tarea
            </button>

            {/* Architecture / Docs */}
            <button
              onClick={onOpenArchitecture}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-700 hover:bg-indigo-900 font-mono text-xs font-semibold transition"
              title="Ver Arquitectura C.R.A.F.T., Esquema y Docker"
            >
              <FileCode2 className="w-3.5 h-3.5" /> C.R.A.F.T.
            </button>

            {/* Export JSON Report */}
            <button
              onClick={onOpenExport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-700 hover:bg-emerald-900 font-mono text-xs font-semibold transition cursor-pointer"
              title="Exportar telemetría y grafo a JSON"
            >
              <FileJson className="w-3.5 h-3.5 text-emerald-400" /> Exportar JSON
            </button>

            {/* Dev Onboarding & Tutorial Tour */}
            <button
              onClick={onOpenTour}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-700 hover:bg-purple-900 font-mono text-xs font-semibold transition cursor-pointer"
              title="Iniciar tutorial de onboarding para desarrolladores y guía patrón"
            >
              <GraduationCap className="w-3.5 h-3.5 text-purple-400" /> Tutorial Dev
            </button>
          </div>
        </div>

        {/* Real-Time Lane Resource Consumption Progress Bars (CPU / Memory Budgets) */}
        {laneConsumption && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80 text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenResources}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300 hover:text-cyan-200 bg-cyan-950/50 border border-cyan-800/60 px-2 py-0.5 rounded transition cursor-pointer"
                title="Abrir Gestor de Asignación de Recursos (CPU / Memoria por Carril)"
              >
                <Cpu className="w-3 h-3 text-cyan-400" />
                <span>Presupuesto Carriles (CPU/RAM):</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 flex-1 justify-end">
              {LANE_SHORT_META.map(({ lane, label, dotColor }) => {
                const cons = laneConsumption[lane];
                if (!cons) return null;
                const barColor = getBarColorClass(cons.status);
                return (
                  <button
                    key={lane}
                    onClick={onOpenResources}
                    className="flex items-center gap-2.5 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg px-2.5 py-1 transition cursor-pointer min-w-[230px]"
                    title={`Carril ${label} — CPU: ${cons.cpuUsedUnits}/${cons.budget.cpuCapUnits} mCPU (${cons.cpuUsagePercent}%) | RAM: ${cons.memoryUsedMb}/${cons.budget.memoryCapMb} MB (${cons.memoryUsagePercent}%). Clic para ajustar presupuesto.`}
                  >
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                      <span className="font-bold text-slate-200 text-[10.5px]">{label}</span>
                    </div>

                    <div className="flex-1 flex flex-col gap-1 min-w-[110px]">
                      {/* CPU Progress Bar */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-slate-400 w-7 text-left">CPU</span>
                        <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all duration-300 ${barColor}`}
                            style={{ width: `${Math.min(100, cons.cpuUsagePercent)}%` }}
                          />
                        </div>
                        <span
                          className={`text-[9.5px] font-bold w-8 text-right ${
                            cons.cpuUsagePercent >= 90
                              ? 'text-rose-400'
                              : cons.cpuUsagePercent >= 70
                              ? 'text-amber-300'
                              : 'text-emerald-300'
                          }`}
                        >
                          {cons.cpuUsagePercent}%
                        </span>
                      </div>

                      {/* RAM Progress Bar */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-slate-400 w-7 text-left">RAM</span>
                        <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all duration-300 ${barColor}`}
                            style={{ width: `${Math.min(100, cons.memoryUsagePercent)}%` }}
                          />
                        </div>
                        <span
                          className={`text-[9.5px] font-bold w-8 text-right ${
                            cons.memoryUsagePercent >= 90
                              ? 'text-rose-400'
                              : cons.memoryUsagePercent >= 70
                              ? 'text-amber-300'
                              : 'text-emerald-300'
                          }`}
                        >
                          {cons.memoryUsagePercent}%
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
