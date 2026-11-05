/**
 * AgentOS - Gestor de Asignación de Recursos (Resource Allocation Manager)
 *
 * Permite definir límites presupuestarios (CPU en mCPU y Memoria en MB) por carril de ejecución,
 * configurar políticas de auto-throttling y visualizar el desglose de consumo por nodo en tiempo real.
 */

import React from 'react';
import {
  Cpu,
  HardDrive,
  Sliders,
  Zap,
  Flame,
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  Activity,
  Gauge,
} from 'lucide-react';
import {
  TaskLane,
  LaneBudgetCap,
  LaneResourceConsumption,
  NodeDensityMetrics,
  PipelineNode,
} from '../types/pipeline';
import { DEFAULT_LANE_BUDGETS } from '../pipeline/resourceManager';
import { calculateLanePath } from '../pipeline/engine';

interface ResourceAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgets: Record<TaskLane, LaneBudgetCap>;
  onUpdateBudget: (lane: TaskLane, updated: LaneBudgetCap) => void;
  onResetBudgets: () => void;
  consumption: Record<TaskLane, LaneResourceConsumption>;
  densityMap: Record<string, NodeDensityMetrics>;
  nodes: PipelineNode[];
}

export const ResourceAllocationModal: React.FC<ResourceAllocationModalProps> = ({
  isOpen,
  onClose,
  budgets,
  onUpdateBudget,
  onResetBudgets,
  consumption,
  densityMap,
  nodes,
}) => {
  if (!isOpen) return null;

  const lanes: TaskLane[] = ['standard', 'express', 'urgent'];

  const applyPreset = (preset: 'eco' | 'balanced' | 'hpc') => {
    if (preset === 'eco') {
      onUpdateBudget('standard', {
        ...budgets.standard,
        cpuCapUnits: 900,
        memoryCapMb: 2048,
        autoThrottle: true,
        burstAllowed: false,
      });
      onUpdateBudget('express', {
        ...budgets.express,
        cpuCapUnits: 500,
        memoryCapMb: 1024,
        autoThrottle: true,
        burstAllowed: false,
      });
      onUpdateBudget('urgent', {
        ...budgets.urgent,
        cpuCapUnits: 800,
        memoryCapMb: 1536,
        autoThrottle: true,
        burstAllowed: true,
      });
    } else if (preset === 'balanced') {
      onResetBudgets();
    } else if (preset === 'hpc') {
      onUpdateBudget('standard', {
        ...budgets.standard,
        cpuCapUnits: 2800,
        memoryCapMb: 8192,
        autoThrottle: false,
        burstAllowed: true,
      });
      onUpdateBudget('express', {
        ...budgets.express,
        cpuCapUnits: 1600,
        memoryCapMb: 4096,
        autoThrottle: false,
        burstAllowed: true,
      });
      onUpdateBudget('urgent', {
        ...budgets.urgent,
        cpuCapUnits: 2400,
        memoryCapMb: 6144,
        autoThrottle: false,
        burstAllowed: true,
      });
    }
  };

  const getStatusBadge = (status: LaneResourceConsumption['status']) => {
    switch (status) {
      case 'over_budget':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/50 text-rose-300 text-[10px] font-mono font-bold animate-pulse">
            <ShieldAlert className="w-3 h-3 text-rose-400" /> EXCEDIDO (THROTTLING)
          </span>
        );
      case 'critical':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-orange-500/20 border border-orange-500/50 text-orange-300 text-[10px] font-mono font-bold">
            <Flame className="w-3 h-3 text-orange-400" /> CARGA CRÍTICA (&gt;85%)
          </span>
        );
      case 'elevated':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold">
            <Activity className="w-3 h-3 text-amber-400" /> CARGA ELEVADA
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> ÓPTIMO
          </span>
        );
    }
  };

  const totalCpuCap = lanes.reduce((acc, l) => acc + budgets[l].cpuCapUnits, 0);
  const totalCpuUsed = lanes.reduce((acc, l) => acc + consumption[l].cpuUsedUnits, 0);
  const totalMemCap = lanes.reduce((acc, l) => acc + budgets[l].memoryCapMb, 0);
  const totalMemUsed = lanes.reduce((acc, l) => acc + consumption[l].memoryUsedMb, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-mono text-xs">
      {/* 1. Cabecera del Gestor de Recursos */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-cyan-950/30 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">
                Gestor de Asignación de Recursos (Resource Allocation Manager)
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                LIVE QUOTA CONTROL
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Define límites presupuestarios de CPU (mCPU) y Memoria (MB) para cada carril agéntico y supervisa el consumo en tiempo real.
            </p>
          </div>
        </div>

        {/* Presets Rápidos */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider mr-1">Perfiles:</span>
          <button
            onClick={() => applyPreset('eco')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 transition cursor-pointer"
          >
            Eco / Ahorro
          </button>
          <button
            onClick={() => applyPreset('balanced')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 transition cursor-pointer"
          >
            Balanceado (Default)
          </button>
          <button
            onClick={() => applyPreset('hpc')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-purple-300 border border-purple-500/30 transition cursor-pointer"
          >
            HPC / Sin Freno
          </button>
          <button
            onClick={onResetBudgets}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="Restaurar límites originales"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* 2. Resumen Global de Clúster */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase">Cómputo Total Reservado (CPU)</span>
          <div className="text-base font-bold text-cyan-300 flex items-center justify-between">
            <span>
              {totalCpuUsed} / {totalCpuCap} <span className="text-xs text-slate-400">mCPU</span>
            </span>
            <span className="text-xs text-cyan-400">
              {Math.round((totalCpuUsed / Math.max(1, totalCpuCap)) * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.round((totalCpuUsed / Math.max(1, totalCpuCap)) * 100))}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase">Memoria Total Reservada (RAM)</span>
          <div className="text-base font-bold text-indigo-300 flex items-center justify-between">
            <span>
              {totalMemUsed} / {totalMemCap} <span className="text-xs text-slate-400">MB</span>
            </span>
            <span className="text-xs text-indigo-400">
              {Math.round((totalMemUsed / Math.max(1, totalMemCap)) * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-400 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.round((totalMemUsed / Math.max(1, totalMemCap)) * 100))}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase">Nodos en Cuello de Botella</span>
          <div className="text-base font-bold text-rose-400 flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500" />
            <span>
              {Object.values(densityMap).filter((d) => d.isBottleneck).length} Agentes Críticos
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block font-sans">
            Detectados por el motor de densidad térmica
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase">Sincronización con HeaderHUD</span>
          <div className="text-base font-bold text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Barras HUD Activas</span>
          </div>
          <span className="text-[10px] text-slate-500 block font-sans">
            Telemetría en vivo reflejada en la barra superior
          </span>
        </div>
      </div>

      {/* 3. Tarjetas de Configuración de Presupuesto por Carril */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {lanes.map((lane) => {
          const budget = budgets[lane];
          const usage = consumption[lane];
          const laneNodeIds = calculateLanePath(lane);
          const laneNodes = nodes.filter((n) => laneNodeIds.includes(n.id));

          const cpuBarColor =
            usage.cpuUsagePercent > 100
              ? 'bg-rose-500'
              : usage.cpuUsagePercent >= 85
              ? 'bg-orange-500'
              : usage.cpuUsagePercent >= 65
              ? 'bg-amber-400'
              : lane === 'standard'
              ? 'bg-cyan-400'
              : lane === 'express'
              ? 'bg-purple-400'
              : 'bg-rose-400';

          const memBarColor =
            usage.memoryUsagePercent > 100
              ? 'bg-rose-500'
              : usage.memoryUsagePercent >= 85
              ? 'bg-orange-500'
              : usage.memoryUsagePercent >= 65
              ? 'bg-amber-400'
              : 'bg-indigo-400';

          return (
            <div
              key={lane}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between space-y-5"
            >
              {/* Encabezado del Carril */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: usage.color }}
                    />
                    <div>
                      <h3 className="text-sm font-bold text-white">{budget.laneLabel}</h3>
                      <span className="text-[10px] text-slate-400">
                        {usage.assignedNodesCount} agentes en ruta • {usage.activeTasksInLane} tareas activas
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(usage.status)}
                </div>

                {/* Barras de Consumo Actual */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 space-y-3">
                  {/* Barra CPU */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Uso de CPU:
                      </span>
                      <span className="font-bold text-white">
                        {usage.cpuUsedUnits} / {budget.cpuCapUnits} mCPU ({usage.cpuUsagePercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-300 ${cpuBarColor}`}
                        style={{ width: `${Math.min(100, usage.cpuUsagePercent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Barra Memoria */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-indigo-400" /> Uso de Memoria:
                      </span>
                      <span className="font-bold text-white">
                        {usage.memoryUsedMb} / {budget.memoryCapMb} MB ({usage.memoryUsagePercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-300 ${memBarColor}`}
                        style={{ width: `${Math.min(100, usage.memoryUsagePercent)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Sliders de Presupuesto (Budget Caps) */}
                <div className="space-y-3 pt-1">
                  <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Definir Límites de Presupuesto (Budget Caps):</span>
                  </div>

                  {/* Slider Límite CPU */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Límite CPU (mCPU):</span>
                      <span className="text-cyan-300 font-bold">{budget.cpuCapUnits} mCPU</span>
                    </div>
                    <input
                      type="range"
                      min={200}
                      max={3000}
                      step={100}
                      value={budget.cpuCapUnits}
                      onChange={(e) =>
                        onUpdateBudget(lane, {
                          ...budget,
                          cpuCapUnits: Number(e.target.value),
                        })
                      }
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>200 mCPU (Min)</span>
                      <span>1600 mCPU</span>
                      <span>3000 mCPU (Max)</span>
                    </div>
                  </div>

                  {/* Slider Límite Memoria */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Límite RAM (MB):</span>
                      <span className="text-indigo-300 font-bold">{budget.memoryCapMb} MB</span>
                    </div>
                    <input
                      type="range"
                      min={512}
                      max={8192}
                      step={256}
                      value={budget.memoryCapMb}
                      onChange={(e) =>
                        onUpdateBudget(lane, {
                          ...budget,
                          memoryCapMb: Number(e.target.value),
                        })
                      }
                      className="w-full accent-indigo-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>512 MB</span>
                      <span>4096 MB</span>
                      <span>8192 MB</span>
                    </div>
                  </div>
                </div>

                {/* Políticas de Contención */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={budget.autoThrottle}
                      onChange={(e) =>
                        onUpdateBudget(lane, {
                          ...budget,
                          autoThrottle: e.target.checked,
                        })
                      }
                      className="rounded accent-cyan-500"
                    />
                    <span className="text-[10.5px] text-slate-300">Auto-Throttling</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={budget.burstAllowed}
                      onChange={(e) =>
                        onUpdateBudget(lane, {
                          ...budget,
                          burstAllowed: e.target.checked,
                        })
                      }
                      className="rounded accent-purple-500"
                    />
                    <span className="text-[10.5px] text-slate-300">Burst (+20% Ráfaga)</span>
                  </label>
                </div>
              </div>

              {/* Top Nodos de Mayor Densidad en este Carril */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Nodos de Mayor Carga en este Carril:
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {laneNodes
                    .slice()
                    .sort(
                      (a, b) =>
                        (densityMap[b.id]?.densityScore || 0) -
                        (densityMap[a.id]?.densityScore || 0)
                    )
                    .slice(0, 4)
                    .map((n) => {
                      const d = densityMap[n.id];
                      return (
                        <div
                          key={n.id}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[10.5px]"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: d?.heatBorderColor || '#38bdf8' }}
                            />
                            <span className="text-slate-200 font-bold truncate">{n.label}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-slate-400">
                            <span>{n.metrics.memoryMb}MB</span>
                            <span
                              className="font-bold"
                              style={{ color: d?.heatBorderColor || '#38bdf8' }}
                            >
                              {d?.densityScore || 20}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
