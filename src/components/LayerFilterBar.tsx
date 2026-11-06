/**
 * AgentOS - Barra de Filtros por Capa, Carril y Modos de Vista
 * Diseño sin barras de desplazamiento nativas (Zero Horizontal Scrollbar):
 * Usa navegación adaptable flex-wrap con botones de conmutación rápida (< / >)
 * y control de Zoom Vectorial HD hasta 400%.
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
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  GitBranch,
  TrendingUp,
  Cpu,
  Thermometer,
  GitMerge,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { NodeLayer, TaskLane } from '../types/pipeline';
import { LAYER_INFO } from '../pipeline/graphData';

export type ActiveTab =
  | 'canvas'
  | 'board'
  | 'dependencies'
  | 'artifacts'
  | 'vcs'
  | 'simulation'
  | 'throughput'
  | 'resources'
  | 'architecture';

const TAB_ORDER: ActiveTab[] = [
  'canvas',
  'dependencies',
  'board',
  'artifacts',
  'vcs',
  'simulation',
  'throughput',
  'resources',
  'architecture',
];

interface LayerFilterBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  selectedLayer: NodeLayer | null;
  onSelectLayer: (layer: NodeLayer | null) => void;
  selectedLane: TaskLane | 'all';
  onSelectLane: (lane: TaskLane | 'all') => void;
  zoomLevel?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  onZoomHD?: () => void;
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
  zoomLevel = 0.85,
  onZoomIn,
  onZoomOut,
  onFitView,
  onZoomHD,
  heatmapEnabled = false,
  onToggleHeatmap,
}) => {
  const currentTabIndex = TAB_ORDER.indexOf(activeTab);

  const handlePrevTab = () => {
    const prevIdx = (currentTabIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    onTabChange(TAB_ORDER[prevIdx]);
  };

  const handleNextTab = () => {
    const nextIdx = (currentTabIndex + 1) % TAB_ORDER.length;
    onTabChange(TAB_ORDER[nextIdx]);
  };

  return (
    <div className="bg-slate-900/95 border-b border-slate-800 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
      {/* Navegación Principal de Vistas (Sin barra de desplazamiento horizontal) */}
      <div
        data-testid="primary-navigation-tabs"
        className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 max-w-full"
      >
        {/* Conmutador Rápido Vista Anterior */}
        <button
          onClick={handlePrevTab}
          className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 transition cursor-pointer shrink-0"
          title="Vista anterior"
          aria-label="Vista anterior"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onTabChange('canvas')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition shrink-0 cursor-pointer ${
            activeTab === 'canvas'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Network className="w-3.5 h-3.5 text-cyan-400" />
          <span>Lienzo de Nodos</span>
        </button>

        <button
          onClick={() => onTabChange('dependencies')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition shrink-0 cursor-pointer ${
            activeTab === 'dependencies'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <GitMerge className="w-3.5 h-3.5 text-purple-400" />
          <span>Dependencias (DAG)</span>
        </button>

        <button
          onClick={() => onTabChange('board')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition shrink-0 cursor-pointer ${
            activeTab === 'board'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <ListTree className="w-3.5 h-3.5 text-indigo-400" />
          <span>Tablero Tareas</span>
        </button>

        <button
          onClick={() => onTabChange('artifacts')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition shrink-0 cursor-pointer ${
            activeTab === 'artifacts'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>Evidencias & Diff</span>
        </button>

        <button
          onClick={() => onTabChange('vcs')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition shrink-0 cursor-pointer ${
            activeTab === 'vcs'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5 text-purple-400" />
          <span>Control Versiones (VCS)</span>
        </button>

        <button
          onClick={() => onTabChange('simulation')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition shrink-0 cursor-pointer ${
            activeTab === 'simulation'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Simulador Sandbox</span>
        </button>

        <button
          onClick={() => onTabChange('throughput')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition shrink-0 cursor-pointer ${
            activeTab === 'throughput'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          <span>Tendencia D3</span>
        </button>

        <button
          onClick={() => onTabChange('resources')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition shrink-0 cursor-pointer ${
            activeTab === 'resources'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-rose-400" />
          <span>Recursos (CPU/RAM)</span>
        </button>

        <button
          onClick={() => onTabChange('architecture')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition shrink-0 cursor-pointer ${
            activeTab === 'architecture'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-sky-400" />
          <span>Arquitectura & Docs</span>
        </button>

        {/* Conmutador Rápido Siguiente Vista */}
        <button
          onClick={handleNextTab}
          className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 transition cursor-pointer shrink-0"
          title="Siguiente vista"
          aria-label="Siguiente vista"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Layer Highlighters, Lane Filters & Controles de Zoom Vectorial HD */}
      {activeTab === 'canvas' && (
        <div className="flex flex-wrap items-center gap-2">
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

          {/* Layer Selector */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
            <span className="text-slate-500 flex items-center gap-1">
              <Layers className="w-3 h-3 text-cyan-400" /> Capas:
            </span>
            <button
              onClick={() => onSelectLayer(null)}
              className={`px-1.5 py-0.5 rounded text-[11px] transition cursor-pointer ${
                selectedLayer === null
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas
            </button>
            {([1, 2, 3, 4, 5] as NodeLayer[]).map((layer) => (
              <button
                key={layer}
                onClick={() => onSelectLayer(selectedLayer === layer ? null : layer)}
                className={`px-1.5 py-0.5 rounded text-[11px] transition font-bold cursor-pointer ${
                  selectedLayer === layer
                    ? 'text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                style={{
                  backgroundColor:
                    selectedLayer === layer ? LAYER_INFO[layer].color : 'transparent',
                }}
              >
                C{layer}
              </button>
            ))}
          </div>

          {/* Lane Selector */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
            <span className="text-slate-500 flex items-center gap-1">
              <Filter className="w-3 h-3 text-amber-400" /> Carril:
            </span>
            <button
              onClick={() => onSelectLane('all')}
              className={`px-1.5 py-0.5 rounded text-[11px] transition cursor-pointer ${
                selectedLane === 'all'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => onSelectLane('standard')}
              className={`px-1.5 py-0.5 rounded text-[11px] transition flex items-center gap-1 cursor-pointer ${
                selectedLane === 'standard'
                  ? 'bg-blue-600/30 text-blue-300 font-bold border border-blue-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>Estándar</span>
            </button>
            <button
              onClick={() => onSelectLane('express')}
              className={`px-1.5 py-0.5 rounded text-[11px] transition flex items-center gap-1 cursor-pointer ${
                selectedLane === 'express'
                  ? 'bg-amber-600/30 text-amber-300 font-bold border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Express</span>
            </button>
            <button
              onClick={() => onSelectLane('urgent')}
              className={`px-1.5 py-0.5 rounded text-[11px] transition flex items-center gap-1 cursor-pointer ${
                selectedLane === 'urgent'
                  ? 'bg-rose-600/30 text-rose-300 font-bold border border-rose-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3 h-3 text-rose-400" />
              <span>Urgente P0</span>
            </button>
          </div>

          {/* Zoom Vectorial HD & Fit Controls */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
            <button
              onClick={onZoomOut}
              data-testid="zoom-out-btn"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Alejar (Zoom Out)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span
              data-testid="zoom-percentage-badge"
              className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold min-w-[48px] text-center ${
                zoomLevel >= 1.25
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                  : 'text-slate-300'
              }`}
              title="Nivel de Zoom Vectorial HD activo (soporta hasta 400% sin pérdida de definición)"
            >
              {Math.round(zoomLevel * 100)}%
            </span>

            <button
              onClick={onZoomIn}
              data-testid="zoom-in-btn"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Acercar (Zoom In Vectorial HD)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {onZoomHD && (
              <button
                onClick={onZoomHD}
                data-testid="zoom-hd-200-btn"
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/50 text-[10px] font-bold transition cursor-pointer"
                title="Activar Zoom Macro 180% HD con Micro-Blueprints Vectoriales en vivo"
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Zoom HD</span>
              </button>
            )}

            <button
              onClick={onFitView}
              data-testid="zoom-fit-btn"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Ajustar al Lienzo (85%)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
