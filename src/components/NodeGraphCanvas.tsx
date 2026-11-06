/**
 * AgentOS - Lienzo de Grafos Interactivo de Alta Densidad (Estilo Archifact)
 * Réplica fiel del diagrama de referencia del usuario con soporte para la propuesta optimizada 2.0.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, useSpring, useMotionTemplate } from 'framer-motion';
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
  Boxes,
  Focus,
  Box,
} from 'lucide-react';
import {
  calculateNode3DElevation,
  Transform3DMode,
} from '../utils/node3dTransform';

interface SpringAnimatedNodeCardProps {
  node: PipelineNode;
  zElevation: number;
  autoCalculatedZ: number;
  isManualOverride: boolean;
  scaleBonus: number;
  zBoxShadow: string;
  isNodeExecuting: boolean;
  borderColor: string;
  bgColor: string;
  nodeOpacity: number;
  nodeFilter: string;
  glowClass: string;
  onSelectNode: (node: PipelineNode) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: React.ReactNode;
}

/**
 * Componente de Nodo Animado con física de resorte (useSpring de framer-motion)
 * para transicionar de forma fluida entre el plano 2D (0px) y las cotas Z (50px - 100px).
 */
const SpringAnimatedNodeCard: React.FC<SpringAnimatedNodeCardProps> = ({
  node,
  zElevation,
  autoCalculatedZ,
  isManualOverride,
  scaleBonus,
  zBoxShadow,
  isNodeExecuting,
  borderColor,
  bgColor,
  nodeOpacity,
  nodeFilter,
  glowClass,
  onSelectNode,
  onMouseEnter,
  onMouseLeave,
  children,
}) => {
  // Resorte fluido para el eje Z (0px <-> 50px <-> 100px)
  const springZ = useSpring(zElevation, {
    stiffness: 185,
    damping: 22,
    mass: 0.85,
  });

  // Resorte fluido para el factor de escala por perspectiva
  const springScale = useSpring(scaleBonus, {
    stiffness: 210,
    damping: 24,
    mass: 0.8,
  });

  useEffect(() => {
    springZ.set(zElevation);
  }, [zElevation, springZ]);

  useEffect(() => {
    springScale.set(scaleBonus);
  }, [scaleBonus, springScale]);

  const motionTransform = useMotionTemplate`translate3d(0px, 0px, ${springZ}px) scale(${springScale})`;

  return (
    <motion.div
      data-interactive="true"
      data-testid={`canvas-node-${node.id}`}
      data-z-elevation={zElevation}
      data-auto-z={autoCalculatedZ}
      data-manual-override={isManualOverride ? 'true' : 'false'}
      onClick={() => onSelectNode(node)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${node.width || 160}px`,
        height: `${node.height || 75}px`,
        borderColor: isNodeExecuting ? '#38bdf8' : borderColor,
        backgroundColor: bgColor,
        transform: motionTransform,
        transformStyle: 'preserve-3d',
        boxShadow: zBoxShadow,
        zIndex: isNodeExecuting ? 70 : zElevation > 0 ? 30 + Math.floor(zElevation) : 10,
        opacity: nodeOpacity,
        filter: nodeFilter,
        transition:
          'box-shadow 0.35s ease, border-color 0.2s ease, opacity 0.3s ease, filter 0.3s ease',
      }}
      className={`absolute rounded-xl border-2 backdrop-blur-md cursor-pointer flex flex-col justify-between p-2 ${glowClass}`}
    >
      {children}
    </motion.div>
  );
};

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
  activeNodeId?: string;
  activeTaskPathNodeIds?: string[];
  inspectedNodeId?: string;
  manualZOverrides?: Record<string, number>;
  isEditMode3DDisabled?: boolean;
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
  activeNodeId,
  activeTaskPathNodeIds = [],
  inspectedNodeId,
  manualZOverrides = {},
  isEditMode3DDisabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Estados de la Capa de Transformación Tridimensional (3D) en el Eje Z y Brillo Focalizado
  const [transform3DMode, setTransform3DMode] = useState<Transform3DMode>('activity');
  const [perspectiveView, setPerspectiveView] = useState<'flat' | 'tilt' | 'isometric'>('flat');
  const [depthMultiplier, setDepthMultiplier] = useState<number>(1.0);
  const [focalGlowEnabled, setFocalGlowEnabled] = useState(true);

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
        perspective: '1400px',
        perspectiveOrigin: '50% 45%',
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(10, 16, 30, 0.9) 0%, rgba(5, 8, 16, 1) 100%),
          linear-gradient(rgba(56, 189, 248, 0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(56, 189, 248, 0.04) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 28px 28px, 28px 28px',
      }}
    >
      {/* Contenedor del Grafo Transformado con Preservación Tridimensional (3D) */}
      <div
        className="absolute transition-transform duration-500 origin-top-left"
        style={{
          transform:
            perspectiveView === 'tilt'
              ? `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel}) rotateX(12deg) rotateY(-6deg)`
              : perspectiveView === 'isometric'
              ? `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel}) rotateX(22deg) rotateY(-15deg) rotateZ(2deg)`
              : `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformStyle: 'preserve-3d',
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

            // Determinar si la arista conecta nodos consecutivos del flujo de ejecución actual
            const isFocalActive = focalGlowEnabled && activeTaskPathNodeIds.length > 0;
            const isEdgeInActivePath =
              edge.active ||
              (activeTaskPathNodeIds.length > 1 &&
                activeTaskPathNodeIds.some(
                  (id, idx) => id === edge.source && activeTaskPathNodeIds[idx + 1] === edge.target
                ));

            let edgeStroke = edge.active ? '#38bdf8' : isHovered ? '#67e8f9' : strokeColor;
            let edgeWidth = edge.active ? 2.4 : isHovered ? 1.8 : 1.2;
            let edgeOpacity = edge.active ? 1 : isHovered ? 0.95 : 0.75;
            let edgeFilter: string | undefined = edge.active ? 'url(#glow-edge-anim)' : undefined;

            if (isFocalActive) {
              if (isEdgeInActivePath) {
                // Brillo focalizado radiante en la arista del camino activo
                edgeStroke = '#38bdf8';
                edgeWidth = 3.2;
                edgeOpacity = 1;
                edgeFilter = 'url(#glow-edge-anim)';
              } else {
                // Atenuación del resto de aristas del grafo
                edgeStroke = isHovered ? '#64748b' : '#1e293b';
                edgeWidth = isHovered ? 1.2 : 0.75;
                edgeOpacity = isHovered ? 0.5 : 0.08;
                edgeFilter = undefined;
              }
            }

            return (
              <g key={edge.id} className="transition-opacity duration-300">
                <path
                  d={pathD}
                  fill="none"
                  stroke={edgeStroke}
                  strokeWidth={edgeWidth}
                  strokeDasharray={edge.lane === 'telemetry' ? '4 3' : undefined}
                  markerEnd={`url(#${isFocalActive && isEdgeInActivePath ? 'arrow-cyan' : markerId})`}
                  opacity={edgeOpacity}
                  filter={edgeFilter}
                />

                {/* Pulso de datos activo y haz focal en el camino */}
                {((isFocalActive && isEdgeInActivePath) || edge.active) && (
                  <circle r="4" fill="#ffffff" filter="url(#glow-edge-anim)">
                    <animateMotion path={pathD} dur="1.1s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Etiqueta descriptiva sobre la arista */}
                {edge.label && (!isFocalActive || isEdgeInActivePath || isHovered) && (
                  <text
                    x={midX}
                    y={edge.source === 'ui' && edge.target === 'builder' ? midY - 18 : midY - 6}
                    fill={isFocalActive && isEdgeInActivePath ? '#38bdf8' : edge.lane === 'urgent' ? '#fb7185' : '#34d399'}
                    fontSize="8.5"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="font-semibold select-none bg-slate-950 px-1"
                    opacity={edgeOpacity}
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

          // Determinar estado de relevancia tridimensional dentro del flujo actual
          const isNodeExecuting = isRunning || (activeNodeId ? node.id === activeNodeId : false);
          const isInspected = inspectedNodeId === node.id;
          const isHovered = hoveredNodeId === node.id;
          const isPathStep = activeTaskPathNodeIds.includes(node.id);
          const pathStepIndex = activeTaskPathNodeIds.indexOf(node.id);
          const isBottleneck = Boolean(density?.isBottleneck);

          const nodeManualOverride =
            manualZOverrides[node.id] !== undefined ? manualZOverrides[node.id] : null;

          // EFECTO DE BRILLO FOCALIZADO (Focal Spotlight):
          // Si está activo, resalta con aura radiante la ruta activa y atenúa el resto del grafo
          const isFocalActive = focalGlowEnabled && activeTaskPathNodeIds.length > 0;
          const isFocalHighlighted = isFocalActive
            ? isPathStep || isNodeExecuting || isInspected || nodeManualOverride !== null
            : true;

          // Cálculo de elevación en el eje Z mediante la Capa de Transformación 3D
          // (Modos: Intensidad de Actividad, Nivel de Clúster Arquitectónico o Híbrido)
          const elevation3D = calculateNode3DElevation({
            nodeId: node.id,
            layer: node.layer,
            isNodeExecuting,
            isPathStep,
            isInspected,
            isHovered,
            isBottleneck,
            heatScore: density?.densityScore || 0,
            totalExecutions: (node.metrics?.successCount || 0) + (node.metrics?.errorCount || 0),
            mode: transform3DMode,
            depthScale: depthMultiplier,
            activeTaskPathNodeIds,
            manualZOverride: nodeManualOverride,
            isEditMode3DDisabled,
          });

          let zElevation = elevation3D.zElevation;
          let scaleBonus = elevation3D.scaleBonus;
          let zBoxShadow = elevation3D.boxShadow;

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
            if (isNodeExecuting) {
              borderColor = '#38bdf8';
              glowClass = 'ring-2 ring-sky-400 animate-pulse';
            } else if (isCompleted) {
              borderColor = '#10b981';
            } else if (isError) {
              borderColor = '#f43f5e';
              glowClass = 'ring-2 ring-rose-500 animate-pulse';
            }
          }

          // APLICACIÓN DEL BRILLO FOCALIZADO Y ATENUACIÓN
          let nodeOpacity = 1;
          let nodeFilter = 'none';

          if (isFocalActive) {
            if (isFocalHighlighted) {
              // Módulo dentro de la ruta activa o con override: Brillo focalizado radiante
              nodeOpacity = 1;
              nodeFilter = 'none';
              borderColor = elevation3D.isManualOverride
                ? '#10b981'
                : isNodeExecuting
                ? '#38bdf8'
                : '#38bdf8';
              bgColor = isNodeExecuting ? '#061d33' : '#081726';
              glowClass = isNodeExecuting
                ? 'ring-2 ring-sky-300 ring-offset-2 ring-offset-slate-950 animate-pulse'
                : 'ring-1 ring-sky-400/90 ring-offset-1 ring-offset-slate-950';
              if (!elevation3D.isManualOverride) {
                zBoxShadow = isNodeExecuting
                  ? '0 0 55px rgba(56, 189, 248, 0.95), 0 0 24px rgba(56, 189, 248, 1), 0 35px 70px rgba(0, 0, 0, 0.95), inset 0 1px 3px rgba(255, 255, 255, 0.8)'
                  : '0 0 34px rgba(56, 189, 248, 0.8), 0 0 16px rgba(52, 211, 153, 0.65), 0 22px 45px rgba(0, 0, 0, 0.85), inset 0 1px 2px rgba(255, 255, 255, 0.5)';
              }
            } else {
              // Módulo fuera del flujo: Atenuado en plano Z=0px para concentrar el foco visual en la ruta activa
              nodeOpacity = isHovered ? 0.75 : 0.16;
              nodeFilter = isHovered ? 'none' : 'grayscale(85%) contrast(80%)';
              zBoxShadow = 'none';
              zElevation = 0;
              scaleBonus = 1;
              borderColor = isHovered ? '#64748b' : 'rgba(51, 65, 85, 0.4)';
              glowClass = '';
              bgColor = '#050811';
            }
          } else if (isDimmed) {
            nodeOpacity = 0.25;
            nodeFilter = 'grayscale(40%)';
          }

          return (
            <React.Fragment key={node.id}>
              {/* Sombra de Proyección Volumétrica en el Plano Z=0 contra el fondo del lienzo */}
              {transform3DMode !== 'off' && !isEditMode3DDisabled && zElevation > 0 && isFocalHighlighted && (
                <div
                  className="absolute pointer-events-none rounded-2xl transition-all duration-300"
                  style={{
                    left: `${node.x + elevation3D.groundShadow.offsetX}px`,
                    top: `${node.y + elevation3D.groundShadow.offsetY}px`,
                    width: `${node.width || 160}px`,
                    height: `${node.height || 75}px`,
                    background: elevation3D.groundShadow.color,
                    filter: `blur(${elevation3D.groundShadow.blur}px)`,
                    transform: 'translateZ(0px)',
                    opacity: elevation3D.groundShadow.opacity,
                  }}
                />
              )}

              {/* Pilar de Anclaje de Profundidad 3D (Depth Stem) que evidencia la separación física del lienzo */}
              {transform3DMode !== 'off' && !isEditMode3DDisabled && zElevation >= 30 && isFocalHighlighted && (
                <div
                  className="absolute pointer-events-none transition-all duration-300"
                  style={{
                    left: `${node.x + (node.width || 160) / 2 - 1}px`,
                    top: `${node.y + (node.height || 75)}px`,
                    width: '2px',
                    height: `${Math.round(zElevation * 0.4)}px`,
                    background: elevation3D.isManualOverride
                      ? 'linear-gradient(to bottom, rgba(16, 185, 129, 0.85), transparent)'
                      : isNodeExecuting
                      ? 'linear-gradient(to bottom, rgba(56, 189, 248, 0.8), transparent)'
                      : 'linear-gradient(to bottom, rgba(148, 163, 184, 0.4), transparent)',
                    transform: 'translateZ(0px)',
                  }}
                />
              )}

              {/* Módulo Agéntico con Animación de Resorte framer-motion (useSpring translateZ) */}
              <SpringAnimatedNodeCard
                node={node}
                zElevation={zElevation}
                autoCalculatedZ={elevation3D.autoCalculatedZ}
                isManualOverride={elevation3D.isManualOverride}
                scaleBonus={scaleBonus}
                zBoxShadow={zBoxShadow}
                isNodeExecuting={isNodeExecuting}
                borderColor={borderColor}
                bgColor={bgColor}
                nodeOpacity={nodeOpacity}
                nodeFilter={nodeFilter}
                glowClass={glowClass}
                onSelectNode={onSelectNode}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                {/* Badge Tridimensional de Elevación Z & Modo */}
                {transform3DMode !== 'off' && !isEditMode3DDisabled && zElevation > 0 && isFocalHighlighted && (
                  <div
                    className={`absolute -top-3.5 left-2 px-1.5 py-0.2 rounded-full text-[8px] font-mono font-bold tracking-tight border shadow-md flex items-center gap-1 ${
                      elevation3D.badgeTone === 'emerald'
                        ? 'bg-emerald-950/95 border-emerald-400 text-emerald-200 shadow-emerald-950/80'
                        : elevation3D.badgeTone === 'cyan'
                        ? 'bg-cyan-950/95 border-cyan-400 text-cyan-200 shadow-cyan-950/80 animate-pulse'
                        : elevation3D.badgeTone === 'rose'
                        ? 'bg-rose-950/95 border-rose-400 text-rose-200 shadow-rose-950/80'
                        : elevation3D.badgeTone === 'indigo'
                        ? 'bg-indigo-950/95 border-indigo-400 text-indigo-200 shadow-indigo-950/80'
                        : elevation3D.badgeTone === 'amber'
                        ? 'bg-amber-950/95 border-amber-400 text-amber-200 shadow-amber-950/80'
                        : 'bg-slate-900/95 border-slate-600 text-slate-300'
                    }`}
                    style={{ transform: 'translateZ(12px)' }}
                  >
                    {isNodeExecuting && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping" />
                    )}
                    <span>{elevation3D.badgeLabel}</span>
                  </div>
                )}

                {/* Badge de Secuencia en la Ruta de Ejecución Focal */}
                {isFocalActive && pathStepIndex >= 0 && (
                  <div
                    className={`absolute -top-3.5 right-2 px-1.5 py-0.2 rounded-full text-[8px] font-mono font-bold tracking-wider border shadow-md flex items-center gap-1 ${
                      isNodeExecuting
                        ? 'bg-sky-400 text-slate-950 border-white shadow-sky-400/60 animate-pulse'
                        : 'bg-cyan-950/95 text-cyan-200 border-cyan-400/80 shadow-cyan-950/80'
                    }`}
                    style={{ transform: 'translateZ(14px)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
                    <span>PASO {pathStepIndex + 1}</span>
                  </div>
                )}

                {/* Badge Superior de Densidad Térmica cuando el Heat-Map está activo */}
                {heatmapEnabled && density && (
                  <div
                    className="absolute -top-2.5 right-1.5 px-1.5 py-0.2 rounded-full text-[8.5px] font-mono font-bold tracking-tight flex items-center gap-1 border shadow-sm"
                    style={{
                      backgroundColor: '#050811',
                      borderColor: density.heatBorderColor,
                      color: density.heatBorderColor,
                      transform: 'translateZ(10px)',
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
                    {isNodeExecuting
                      ? 'EJECUTANDO...'
                      : heatmapEnabled && density?.isBottleneck
                      ? 'CUELLO BOTELLA'
                      : node.operationalState || 'HECHO'}
                  </span>

                  {isNodeExecuting && (
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
              </SpringAnimatedNodeCard>
            </React.Fragment>
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

            {focalGlowEnabled && activeTaskPathNodeIds.length > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>Haz Focal: {activeTaskPathNodeIds.length} nodos en ruta • Fondo atenuado (16%)</span>
              </div>
            )}
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

        {/* Controles de Profundidad 3D (Eje Z), Brillo Focalizado, Heat-Map e Indicador de Modo */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón de Brillo Focalizado */}
          <button
            data-testid="toggle-focal-glow-btn"
            onClick={() => setFocalGlowEnabled((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition cursor-pointer ${
              focalGlowEnabled
                ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-sm shadow-amber-500/30'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Resaltar con brillo focalizado la ruta del flujo de ejecución actual y atenuar el resto del grafo"
          >
            <Focus className="w-3.5 h-3.5 text-amber-400" />
            <span>{focalGlowEnabled ? 'Brillo Focal: ON' : 'Brillo Focal: OFF'}</span>
          </button>

          {/* Botón de Profundidad Z */}
          {/* Botón de Capa de Transformación 3D (Intensidad / Clúster / Híbrido / OFF) */}
          <button
            data-testid="toggle-3d-layer-btn"
            onClick={() => {
              const modes: Transform3DMode[] = ['activity', 'cluster', 'hybrid', 'off'];
              const nextIndex = (modes.indexOf(transform3DMode) + 1) % modes.length;
              setTransform3DMode(modes[nextIndex]);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition cursor-pointer ${
              transform3DMode !== 'off'
                ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-sm shadow-cyan-500/20'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Alternar entre modo Intensidad de Actividad, Nivel de Clúster Arquitectónico, Híbrido o Apagado"
          >
            <Boxes className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {transform3DMode === 'activity'
                ? 'Capa 3D: INTENSIDAD'
                : transform3DMode === 'cluster'
                ? 'Capa 3D: CLÚSTER'
                : transform3DMode === 'hybrid'
                ? 'Capa 3D: HÍBRIDO'
                : 'Capa 3D: OFF'}
            </span>
          </button>

          {/* Botón de Inclinación de Perspectiva 3D */}
          <button
            data-testid="toggle-3d-tilt-btn"
            onClick={() => {
              const views: Array<'flat' | 'tilt' | 'isometric'> = ['flat', 'tilt', 'isometric'];
              const nextView = views[(views.indexOf(perspectiveView) + 1) % views.length];
              setPerspectiveView(nextView);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition cursor-pointer ${
              perspectiveView !== 'flat'
                ? 'bg-indigo-500/20 border-indigo-500/60 text-indigo-300 shadow-sm shadow-indigo-500/20'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Alternar entre vista frontal ortogonal, inclinada 12° o isométrica 22°"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {perspectiveView === 'flat'
                ? 'Perspectiva: FRONTAL'
                : perspectiveView === 'tilt'
                ? 'Perspectiva: INCLINADA 12°'
                : 'Perspectiva: ISOMÉTRICA 22°'}
            </span>
          </button>

          {/* Selector de Escala de Profundidad Z */}
          {transform3DMode !== 'off' && (
            <button
              data-testid="toggle-3d-scale-btn"
              onClick={() => {
                const scales = [1.0, 1.4, 1.8];
                const nextScale = scales[(scales.indexOf(depthMultiplier) + 1) % scales.length];
                setDepthMultiplier(nextScale);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border bg-slate-900 border-slate-700 text-cyan-300 hover:border-cyan-500/50 cursor-pointer"
              title="Aumentar o reducir el factor de escala de elevación en el eje Z"
            >
              <Box className="w-3 h-3 text-cyan-400" />
              <span>Cota Z: {depthMultiplier.toFixed(1)}x</span>
            </button>
          )}

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
