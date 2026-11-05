/**
 * AgentOS - Barra de Filtros por Capa, Carril y Modos de Vista
 */

import React from 'react';
import {
  Network,
  ListTree,
  FileSpreadsheet,
  BookOpen,
  Filter,
  Zap,
  Flame,
  Shield,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  GitBranch,
  TrendingUp,
  Cpu,
  Thermometer,
} from 'lucide-react';
import { NodeLayer, TaskLane } from '../types/pipeline';
import { LAYER_INFO } from '../pipeline/graphData';

export type ActiveTab =
  | 'canvas'
  | 'board'
  | 'artifacts'
  | 'vcs'
  | 'simulation'
  | 'throughput'
  | 'resources'
  | 'architecture';

interface LayerFilterBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  selectedLayer: NodeLayer | null;
  onSelectLayer: (layer: NodeLayer | null) => void;
  selectedLane: TaskLane | 'all';
  onSelectLane: (lane: TaskLane | 'all') => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  heatmapEnabled?: boolean;
  onToggleHeatmap?: () => void;
}

export const LayerFilterBar: React.FC<LayerFilterBarProps> = ({
  activeTab,
  onTabChange,
  selectedLayer,
  onSelectLayer,
  selectedLane,
  onSelectLane,
  onZoomIn,
  onZoomOut,
  onFitView,
  heatmapEnabled = false,
  onToggleHeatmap,
}) => {
  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
      {/* Primary Tabs */}
      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto">
        <button
          onClick={() => onTabChange('canvas')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition shrink-0 ${
            activeTab === 'canvas'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Network className="w-3.5 h-3.5 text-cyan-400" />
          <span>Lienzo de Nodos</span>
        </button>

        <button
          onClick={() => onTabChange('board')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition shrink-0 ${
            activeTab === 'board'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListTree className="w-3.5 h-3.5 text-indigo-400" />
          <span>Tablero Tareas</span>
        </button>

        <button
          onClick={() => onTabChange('artifacts')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition shrink-0 ${
            activeTab === 'artifacts'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>Evidencias & Diff</span>
        </button>

        <button
          onClick={() => onTabChange('vcs')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition shrink-0 ${
            activeTab === 'vcs'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5 text-purple-400" />
          <span>Control Versiones (VCS)</span>
        </button>

        <button
          onClick={() => onTabChange('simulation')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition shrink-0 ${
            activeTab === 'simulation'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Simulador Sandbox</span>
        </button>

        <button
          onClick={() => onTabChange('throughput')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition shrink-0 ${
            activeTab === 'throughput'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          <span>Tendencia D3 (Throughput)</span>
        </button>

        <button
          onClick={() => onTabChange('resources')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition shrink-0 ${
            activeTab === 'resources'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-rose-400" />
          <span>Gestor Recursos (CPU/RAM)</span>
        </button>

        <button
          onClick={() => onTabChange('architecture')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition shrink-0 ${
            activeTab === 'architecture'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-sky-400" />
          <span>Arquitectura & Docs</span>
        </button>
      </div>

      {/* Layer Highlighters & Lane Filters (Solo activos en tab canvas) */}
      {activeTab === 'canvas' && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Heat-Map Overlay Toggle Button */}
          {onToggleHeatmap && (
            <button
              onClick={onToggleHeatmap}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition border cursor-pointer ${
                heatmapEnabled
                  ? 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-sm shadow-rose-500/20'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Activar/Desactivar Mapa de Calor de Densidad de Agentes (Agent Density Heat-Map)"
            >
              <Thermometer className="w-3.5 h-3.5 text-rose-400" />
              <span>Mapa Calor: {heatmapEnabled ? 'ON' : 'OFF'}</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-800" />

          {/* Layer Filter */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-500 flex items-center gap-1 mr-1">
              <Layers className="w-3 h-3" /> Capas:
            </span>
            <button
              onClick={() => onSelectLayer(null)}
              className={`px-2 py-1 rounded transition border ${
                selectedLayer === null
                  ? 'bg-slate-700 text-white border-slate-500 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              Todas
            </button>
            {([1, 2, 3, 4, 5] as NodeLayer[]).map((layer) => {
              const info = LAYER_INFO[layer];
              const isSelected = selectedLayer === layer;
              return (
                <button
                  key={layer}
                  onClick={() => onSelectLayer(isSelected ? null : layer)}
                  style={{
                    borderColor: isSelected ? info.color : 'rgba(51, 65, 85, 0.4)',
                    color: isSelected ? info.color : '#94a3b8',
                    backgroundColor: isSelected ? info.bg : 'rgba(2, 6, 23, 0.7)',
                  }}
                  className="px-2 py-1 rounded transition border font-semibold"
                  title={info.subtitle}
                >
                  C{layer}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Lane Filter */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" /> Carril:
            </span>
            <button
              onClick={() => onSelectLane('all')}
              className={`px-2 py-1 rounded transition border ${
                selectedLane === 'all'
                  ? 'bg-slate-700 text-white border-slate-500 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => onSelectLane('standard')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition border ${
                selectedLane === 'standard'
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3 h-3 text-cyan-400" /> Estándar
            </button>
            <button
              onClick={() => onSelectLane('express')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition border ${
                selectedLane === 'express'
                  ? 'bg-amber-950 border-amber-500 text-amber-300 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-400" /> Express
            </button>
            <button
              onClick={() => onSelectLane('urgent')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition border ${
                selectedLane === 'urgent'
                  ? 'bg-rose-950 border-rose-500 text-rose-300 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3 h-3 text-rose-400" /> Urgente P0
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Canvas Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800">
            {onZoomIn && (
              <button
                onClick={onZoomIn}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition"
                title="Acercar (Zoom In)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            )}
            {onZoomOut && (
              <button
                onClick={onZoomOut}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition"
                title="Alejar (Zoom Out)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
            )}
            {onFitView && (
              <button
                onClick={onFitView}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition"
                title="Ajustar al Lienzo"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
