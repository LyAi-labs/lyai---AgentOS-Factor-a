/**
 * AgentOS - Lienzo de Grafos Interactivo de Alta Densidad (Estilo Archifact)
 * Réplica fiel del diagrama de referencia del usuario con soporte para la propuesta optimizada 2.0.
 */

import React, { useState, useRef } from 'react';
import {
  PipelineNode,
  PipelineEdge,
  NodeLayer,
  TaskLane,
  DiagramMode,
  LegendCategory,
  NodeDensityMetrics,
} from '../types/pipeline';
import { LAYER_INFO, LEGEND_CONFIG } from '../pipeline/graphData';
import {
  Brain,
  Shield,
  ShieldCheck,
  Database,
  Sliders,
  Cloud,
  Code2,
  ExternalLink,
  Layers,
  Layout,
  Terminal,
  Zap,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  GitMerge,
  ArrowRight,
  Thermometer,
} from 'lucide-react';

interface NodeGraphCanvasProps {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  selectedLayer: NodeLayer | null;
  selectedLane: TaskLane | 'all';
  diagramMode: DiagramMode;
  onSelectNode: (node: PipelineNode) => void;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  heatmapEnabled?: boolean;
  onToggleHeatmap?: () => void;
  densityMap?: Record<string, NodeDensityMetrics>;
}

export const NodeGraphCanvas: React.FC<NodeGraphCanvasProps> = ({
  nodes,
  edges,
  selectedLayer,
  selectedLane,
  diagramMode,
  onSelectNode,
  zoomLevel,
  panOffset,
  onPanChange,
  onZoomChange,
  heatmapEnabled = false,
  onToggleHeatmap,
  densityMap = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const bottleneckNodesCount = Object.values(densityMap).filter((d) => d.isBottleneck).length;

  // Manejo de drag & pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-interactive="true"]')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    onPanChange({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(Math.max(zoomLevel * zoomFactor, 0.45), 2.0);
    onZoomChange(newZoom);
  };

  // Helper de icono según categoría de la leyenda
  const getNodeCategoryIcon = (category?: LegendCategory) => {
    switch (category) {
      case 'user_ui':
        return <Layout className="w-3.5 h-3.5 text-sky-400" />;
      case 'agent_logic':
        return <Code2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'policy':
        return <Shield className="w-3.5 h-3.5 text-rose-400" />;
      case 'tool_action':
        return <Sliders className="w-3.5 h-3.5 text-amber-400" />;
      case 'context_trace':
        return <Database className="w-3.5 h-3.5 text-purple-400" />;
      case 'cloud_service':
        return <Cloud className="w-3.5 h-3.5 text-yellow-400" />;
      case 'external_system':
      default:
        return <ExternalLink className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getNodeCenter = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0, width: 160, height: 75 };
    return {
      x: node.x,
      y: node.y,
      width: node.width || 160,
      height: node.height || 75,
    };
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="relative w-full h-full min-h-[660px] bg-[#070b14] overflow-hidden cursor-grab active:cursor-grabbing select-none"
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(10, 16, 30, 0.9) 0%, rgba(5, 8, 16, 1) 100%),
          linear-gradient(rgba(56, 189, 248, 0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(56, 189, 248, 0.04) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 28px 28px, 28px 28px',
      }}
    >
      {/* Contenedor del Grafo Transformado */}
      <div
        className="absolute transition-transform duration-75 origin-top-left"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          width: '1740px',
          height: '780px',
        }}
      >
        {/* ========================================================= */}
        {/* BANDAS HORIZONTALES DE LAS 5 CAPAS (01 A 05)              */}
        {/* ========================================================= */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Capa 01 / Memoria · Seguridad */}
          <div
            className="absolute left-6 right-6 rounded-xl border border-dashed border-slate-800/80 bg-slate-900/15"
            style={{ top: '60px', height: '115px' }}
          >
            <span className="absolute top-2 left-4 text-[11px] font-mono font-bold tracking-wider text-slate-400">
              01 / Memoria · Seguridad
            </span>
          </div>

          {/* Capa 02 / Exploración · Mockup · UX · Telemetría */}
          <div
            className="absolute left-6 right-6 rounded-xl border border-dashed border-slate-800/80 bg-slate-900/15"
            style={{ top: '185px', height: '115px' }}
          >
            <span className="absolute top-2 left-4 text-[11px] font-mono font-bold tracking-wider text-slate-400">
              02 / Exploración · Mockup · UX · Telemetría
            </span>
          </div>

          {/* Capa 03 / Flujo principal · UI · Evidencia */}
          <div
            className="absolute left-6 right-6 rounded-xl border border-dashed border-slate-800/80 bg-slate-900/15"
            style={{ top: '310px', height: '135px' }}
          >
            <span className="absolute top-2 left-4 text-[11px] font-mono font-bold tracking-wider text-slate-400">
              03 / Flujo principal · UI · Evidencia
            </span>
          </div>

          {/* Capa 04 / Carriles · Código · Approver · Tu OK */}
          <div
            className="absolute left-6 right-6 rounded-xl border border-dashed border-slate-800/80 bg-slate-900/15"
            style={{ top: '460px', height: '125px' }}
          >
            <span className="absolute top-2 left-4 text-[11px] font-mono font-bold tracking-wider text-slate-400">
              04 / Carriles · Código · Approver · Tu OK
            </span>
          </div>

          {/* Capa 05 / Entornos · Benchmark Lab · Producción */}
          <div
            className="absolute left-6 right-6 rounded-xl border border-dashed border-slate-800/80 bg-slate-900/15"
            style={{ top: '600px', height: '135px' }}
          >
            <span className="absolute top-2 left-4 text-[11px] font-mono font-bold tracking-wider text-slate-400">
              05 / Entornos · Benchmark Lab · Producción
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* OVERLAY TÉRMICO (AGENT DENSITY HEAT-MAP HALOS)            */}
        {/* ========================================================= */}
        {heatmapEnabled && (
          <div className="absolute inset-0 pointer-events-none">
            {nodes.map((node) => {
              const density = densityMap[node.id];
              if (!density || (density.tier !== 'hot' && density.tier !== 'critical')) {
                return null;
              }
              const w = node.width || 160;
              const h = node.height || 75;
              const isCrit = density.tier === 'critical';
              return (
                <div
                  key={`halo-${node.id}`}
                  style={{
                    left: `${node.x - 28}px`,
                    top: `${node.y - 24}px`,
                    width: `${w + 56}px`,
                    height: `${h + 48}px`,
                    background: isCrit
                      ? 'radial-gradient(circle, rgba(244,63,94,0.34) 0%, rgba(249,115,22,0.12) 55%, transparent 75%)'
                      : 'radial-gradient(circle, rgba(249,115,22,0.26) 0%, rgba(245,158,11,0.08) 55%, transparent 75%)',
                  }}
                  className={`absolute rounded-full blur-md transition-opacity duration-300 ${
                    isCrit ? 'animate-pulse' : ''
                  }`}
                />
              );
            })}
          </div>
        )}

        {/* ========================================================= */}
        {/* ARISTAS SVG CONECTORAS Y PARTICULAS DE FLUJO              */}
        {/* ========================================================= */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ width: '1740px', height: '780px' }}
        >
          <defs>
            <marker id="arrow-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="#34d399" />
            </marker>
            <marker id="arrow-cyan" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="#38bdf8" />
            </marker>
            <marker id="arrow-purple" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="#c084fc" />
            </marker>
            <marker id="arrow-rose" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="#fb7185" />
            </marker>

            <filter id="glow-edge-anim" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Línea de bypass de emergencia (Carril urgencia a Producción) */}
          <path
            d="M 120 565 L 120 585 L 1650 585 L 1650 677 L 1610 677"
            fill="none"
            stroke="#e11d48"
            strokeWidth="1.5"
            strokeDasharray="5 4"
            opacity="0.75"
          />

          {/* Línea de retroalimentación rev <24h desde Producción hasta Brain & Seguridad */}
          <path
            d="M 1530 640 C 1530 30, 400 30, 400 85"
            fill="none"
            stroke="#a855f7"
            strokeWidth="1.3"
            strokeDasharray="4 4"
            opacity="0.8"
          />
          <text x="390" y="24" fill="#c084fc" fontSize="9" fontFamily="monospace" textAnchor="middle">
            rev &lt;24h
          </text>

          {edges.map((edge) => {
            const src = getNodeCenter(edge.source);
            const tgt = getNodeCenter(edge.target);

            // Coordenadas
            let sx = src.x + src.width;
            let sy = src.y + src.height / 2;
            let tx = tgt.x;
            let ty = tgt.y + tgt.height / 2;

            // Conexiones verticales especiales (ej. hacia capas superiores o inferiores)
            if (edge.source === 'analyze' && (edge.target === 'explorador' || edge.target === 'mockup' || edge.target === 'coherencia')) {
              sx = src.x + src.width / 2;
              sy = src.y;
              tx = tgt.x + tgt.width / 2;
              ty = tgt.y + tgt.height;
            } else if (edge.source === 'analyze' && edge.target === 'carril_expres') {
              sx = src.x + src.width / 2;
              sy = src.y + src.height;
              tx = tgt.x + tgt.width / 2;
              ty = tgt.y;
            } else if (edge.source === 'ui' && edge.target === 'builder') {
              // Bucle de reintento: falla máx 2
              sx = src.x + src.width / 2;
              sy = src.y;
              tx = tgt.x + tgt.width / 2;
              ty = tgt.y;
            } else if (edge.source === 'builder' && edge.target === 'verificador') {
              sx = src.x + src.width / 2;
              sy = src.y + src.height;
              tx = tgt.x + tgt.width / 2;
              ty = tgt.y;
            } else if (edge.source === 'verificador' && edge.target === 'bd_pruebas') {
              sx = src.x + src.width / 2;
              sy = src.y + src.height;
              tx = tgt.x + tgt.width / 2;
              ty = tgt.y;
            }

            // Cálculo de curvatura Bézier
            const dx = (tx - sx) * 0.45;
            const dy = (ty - sy) * 0.45;
            let pathD = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;

            if (edge.source === 'ui' && edge.target === 'builder') {
              // Arco superior para el loop de falla
              pathD = `M ${sx} ${sy} C ${sx} ${sy - 30}, ${tx} ${ty - 30}, ${tx} ${ty}`;
            }

            let strokeColor = '#34d399'; // Verde por defecto como en la imagen
            let markerId = 'arrow-green';

            if (edge.lane === 'urgent') {
              strokeColor = '#fb7185';
              markerId = 'arrow-rose';
            } else if (edge.lane === 'security' || edge.lane === 'telemetry') {
              strokeColor = '#c084fc';
              markerId = 'arrow-purple';
            }

            const isHovered = hoveredNodeId === edge.source || hoveredNodeId === edge.target;
            const midX = (sx + tx) / 2;
            const midY = (sy + ty) / 2;

            return (
              <g key={edge.id} className="transition-opacity duration-300">
                <path
                  d={pathD}
                  fill="none"
                  stroke={edge.active ? '#38bdf8' : isHovered ? '#67e8f9' : strokeColor}
                  strokeWidth={edge.active ? 2.2 : isHovered ? 1.8 : 1.2}
                  strokeDasharray={edge.lane === 'telemetry' ? '4 3' : undefined}
                  markerEnd={`url(#${markerId})`}
                  opacity={edge.active ? 1 : isHovered ? 0.95 : 0.75}
                  filter={edge.active ? 'url(#glow-edge-anim)' : undefined}
                />

                {/* Pulso de datos activo */}
                {edge.active && (
                  <circle r="3.5" fill="#ffffff" filter="url(#glow-edge-anim)">
                    <animateMotion path={pathD} dur="1.1s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Etiqueta descriptiva sobre la arista */}
                {edge.label && (
                  <text
                    x={midX}
                    y={edge.source === 'ui' && edge.target === 'builder' ? midY - 18 : midY - 6}
                    fill={edge.lane === 'urgent' ? '#fb7185' : '#34d399'}
                    fontSize="8.5"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="font-semibold select-none bg-slate-950 px-1"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* ========================================================= */}
        {/* NODOS CON EL ESTILO EXACTO DEL DIAGRAMA + HEAT-MAP        */}
        {/* ========================================================= */}
        {nodes.map((node) => {
          const isDimmed = selectedLayer !== null && selectedLayer !== node.layer;
          const isRunning = node.status === 'running';
          const isCompleted = node.status === 'completed';
          const isError = node.status === 'error';
          const categoryCfg = LEGEND_CONFIG[node.category || 'agent_logic'];
          const density = densityMap[node.id];

          // Estilo de borde y color basado en la leyenda o en el Heat-Map de Densidad
          let borderColor = categoryCfg.border;
          let bgColor = '#090d18';
          let glowClass = '';

          if (heatmapEnabled && density) {
            borderColor = density.heatBorderColor;
            bgColor = density.heatBgColor;
            if (density.tier === 'critical') {
              glowClass = 'ring-2 ring-rose-500/80 shadow-lg shadow-rose-500/30';
            } else if (density.tier === 'hot') {
              glowClass = 'ring-1 ring-orange-500/70 shadow-md shadow-orange-500/20';
            }
          } else {
            if (isRunning) {
              borderColor = '#38bdf8';
              glowClass = 'ring-2 ring-sky-400 shadow-lg shadow-sky-500/40 animate-pulse';
            } else if (isCompleted) {
              borderColor = '#10b981';
            } else if (isError) {
              borderColor = '#f43f5e';
              glowClass = 'ring-2 ring-rose-500 animate-pulse';
            }
          }

          return (
            <div
              key={node.id}
              data-interactive="true"
              onClick={() => onSelectNode(node)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${node.width || 160}px`,
                height: `${node.height || 75}px`,
                borderColor: borderColor,
                backgroundColor: bgColor,
              }}
              className={`absolute rounded-xl border-2 backdrop-blur-md cursor-pointer transition-all duration-200 hover:scale-[1.04] hover:z-30 hover:border-sky-300 flex flex-col justify-between p-2 shadow-md ${glowClass} ${
                isDimmed ? 'opacity-20 grayscale-[40%]' : 'opacity-100'
              }`}
            >
              {/* Badge Superior de Densidad Térmica cuando el Heat-Map está activo */}
              {heatmapEnabled && density && (
                <div
                  className="absolute -top-2.5 right-1.5 px-1.5 py-0.2 rounded-full text-[8.5px] font-mono font-bold tracking-tight flex items-center gap-1 border shadow-sm"
                  style={{
                    backgroundColor: '#050811',
                    borderColor: density.heatBorderColor,
                    color: density.heatBorderColor,
                  }}
                  title={`Densidad Agéntica: ${density.densityScore}% | Frecuencia: ${density.taskFrequency} tareas | Tokens: ${density.tokensIntensity}%`}
                >
                  <span>{density.isBottleneck ? '🔥' : '🌡️'}</span>
                  <span>{density.densityScore}%</span>
                  <span className="text-slate-400">({density.taskFrequency}t)</span>
                </div>
              )}

              {/* Header: Icono + Título del Nodo */}
              <div className="flex items-center gap-1.5 overflow-hidden">
                <div className="shrink-0">{getNodeCategoryIcon(node.category)}</div>
                <span className="text-[11.5px] font-bold font-mono text-slate-100 truncate block">
                  {node.label}
                </span>
              </div>

              {/* Subtítulo / Tag de Modelo */}
              <div className="text-[9.5px] text-slate-300/90 font-mono truncate pl-5">
                {node.subtitle || node.engineTag || node.name}
              </div>

              {/* Footer con Estado Operativo o Barra Térmica */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 pl-5 pr-1">
                <span
                  className={`text-[8.5px] font-mono font-bold tracking-wider uppercase ${
                    heatmapEnabled && density?.isBottleneck
                      ? 'text-rose-300'
                      : node.operationalState === 'HECHO'
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {isRunning
                    ? 'EJECUTANDO...'
                    : heatmapEnabled && density?.isBottleneck
                    ? 'CUELLO BOTELLA'
                    : node.operationalState || 'HECHO'}
                </span>

                {isRunning && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                )}
                {isCompleted && !heatmapEnabled && (
                  <span className="text-[8px] font-mono text-emerald-400">✔ ok</span>
                )}
                {heatmapEnabled && density && (
                  <div className="w-10 h-1.5 bg-slate-950/90 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${density.densityScore}%`,
                        backgroundColor: density.heatBorderColor,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* LEYENDA INFERIOR + ESCALA TÉRMICA AGENT DENSITY           */}
      {/* ========================================================= */}
      <div className="absolute bottom-3 left-4 right-4 bg-[#0a0f1d]/95 border border-slate-800/80 px-4 py-2 rounded-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-xl">
        {!heatmapEnabled ? (
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              Legend:
            </span>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm border-2 border-sky-400 bg-sky-950/40" />
              <span className="text-slate-300 text-[11px]">User UI</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm border-2 border-emerald-400 bg-emerald-950/40" />
              <span className="text-slate-300 text-[11px]">Agent logic</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm border-2 border-rose-400 bg-rose-950/40" />
              <span className="text-slate-300 text-[11px]">Policy</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm border-2 border-amber-400 bg-amber-950/40" />
              <span className="text-slate-300 text-[11px]">Tool action</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm border-2 border-purple-400 bg-purple-950/40" />
              <span className="text-slate-300 text-[11px]">Context / trace</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm border-2 border-yellow-400 bg-yellow-950/40" />
              <span className="text-slate-300 text-[11px]">Cloud service</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-rose-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-400" /> Agent Density Heat-Map:
            </span>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm border-2 border-sky-400 bg-sky-950/60" />
              <span className="text-slate-300 text-[11px]">Baja (&lt;32%)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm border-2 border-amber-400 bg-amber-950/60" />
              <span className="text-slate-300 text-[11px]">Moderada (32-54%)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm border-2 border-orange-500 bg-orange-950/70" />
              <span className="text-slate-300 text-[11px]">Alta Carga (54-75%)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm border-2 border-rose-500 bg-rose-950/80 animate-pulse" />
              <span className="text-rose-300 font-bold text-[11px]">
                Cuello de Botella (&ge;76%) [{bottleneckNodesCount} nodos]
              </span>
            </div>
          </div>
        )}

        {/* Controles de Heat-Map e Indicador de Modo */}
        <div className="flex items-center gap-3">
          {onToggleHeatmap && (
            <button
              onClick={onToggleHeatmap}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition cursor-pointer ${
                heatmapEnabled
                  ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 shadow-sm shadow-rose-500/20'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Thermometer className="w-3.5 h-3.5 text-rose-400" />
              <span>{heatmapEnabled ? 'Heat-Map: ACTIVO' : 'Activar Heat-Map'}</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Modo Activo:</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                diagramMode === 'original'
                  ? 'bg-sky-950 border border-sky-700 text-sky-300'
                  : 'bg-purple-950 border border-purple-700 text-purple-300'
              }`}
            >
              {diagramMode === 'original' ? 'Tu Diagrama Actual' : 'Propuesta AgentOS 2.0'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
