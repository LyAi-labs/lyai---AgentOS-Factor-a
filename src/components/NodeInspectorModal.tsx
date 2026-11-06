/**
 * AgentOS - Inspector de Telemetría de Nodo
 * Muestra métricas detalladas, configuración del modelo, carga de trabajo y registro de eventos.
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  PipelineNode,
  ActivityLogEntry,
  PipelineTask,
} from '../types/pipeline';
import { LAYER_INFO } from '../pipeline/graphData';
import { BookOpen } from 'lucide-react';
import { AgentKnowledgeBaseModal } from './AgentKnowledgeBaseModal';
import { getAgentKnowledgeDoc } from '../pipeline/agentKnowledgeBase';
import {
  calculateNodeAutonomyIndex,
  calculateNodeLatencyTracker,
} from '../pipeline/resourceManager';
import { NodePerformanceSummaryPanel } from './NodePerformanceSummaryPanel';
import {
  X,
  Cpu,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Database,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Terminal,
  Activity,
  Gauge,
  Zap,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface NodeInspectorModalProps {
  node: PipelineNode | null;
  tasks: PipelineTask[];
  logs: ActivityLogEntry[];
  onClose: () => void;
  onInjectFault: (nodeId: string) => void;
}

export const NodeInspectorModal: React.FC<NodeInspectorModalProps> = ({
  node,
  tasks,
  logs,
  onClose,
  onInjectFault,
}) => {
  const [liveTick, setLiveTick] = useState(0);
  const [manualSpikeBoostMs, setManualSpikeBoostMs] = useState(0);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);

  // Actualizar muestreo en tiempo real cada 1.5s mientras el inspector está abierto
  useEffect(() => {
    if (!node) return;
    const timer = setInterval(() => {
      setLiveTick((t) => t + 1);
    }, 1500);
    return () => clearInterval(timer);
  }, [node]);

  // Reiniciar boost manual al cambiar de nodo
  useEffect(() => {
    setManualSpikeBoostMs(0);
  }, [node?.id]);

  const autonomy = useMemo(() => (node ? calculateNodeAutonomyIndex(node) : null), [node]);
  const latencyTracker = useMemo(
    () => (node ? calculateNodeLatencyTracker(node, liveTick, manualSpikeBoostMs) : null),
    [node, liveTick, manualSpikeBoostMs]
  );

  if (!node || !autonomy || !latencyTracker) return null;

  const layerInfo = LAYER_INFO[node.layer];
  const nodeLogs = logs.filter(
    (l) => l.source === node.name || l.source === node.label || l.source === node.id
  );
  const currentTask = tasks.find((t) => t.id === node.currentTaskId);

  // Parámetros del medidor circular SVG para el Confidence Score
  const gaugeRadius = 32;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeStrokeDashoffset =
    gaugeCircumference - (autonomy.confidenceScore / 100) * gaugeCircumference;

  // Construcción geométrica del Sparkline SVG (460 x 92)
  const sparkWidth = 460;
  const sparkHeight = 92;
  const padX = 14;
  const padY = 14;
  const usableW = sparkWidth - padX * 2;
  const usableH = sparkHeight - padY * 2;

  const yMin = Math.max(0, Math.floor(latencyTracker.minLatencyMs * 0.75));
  const yMax = Math.max(
    latencyTracker.spikeThresholdMs + 40,
    Math.ceil(latencyTracker.peakLatencyMs * 1.15)
  );
  const yRange = Math.max(20, yMax - yMin);

  const getSparkX = (idx: number) =>
    padX + (idx / Math.max(1, latencyTracker.samples.length - 1)) * usableW;
  const getSparkY = (valMs: number) =>
    padY + usableH - ((valMs - yMin) / yRange) * usableH;

  const sparkPoints = latencyTracker.samples.map((s, idx) => ({
    ...s,
    x: Number(getSparkX(idx).toFixed(1)),
    y: Number(getSparkY(s.latencyMs).toFixed(1)),
  }));

  const polylinePoints = sparkPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath =
    sparkPoints.length > 0
      ? `M ${sparkPoints[0].x} ${sparkHeight - padY} L ${sparkPoints
          .map((p) => `${p.x} ${p.y}`)
          .join(' L ')} L ${sparkPoints[sparkPoints.length - 1].x} ${sparkHeight - padY} Z`
      : '';

  const avgLineY = Number(getSparkY(latencyTracker.historicalAvgMs).toFixed(1));
  const spikeLineY = Number(getSparkY(latencyTracker.spikeThresholdMs).toFixed(1));

  const trackerColor =
    latencyTracker.status === 'spike_detected'
      ? '#f43f5e'
      : latencyTracker.status === 'elevated'
      ? '#f59e0b'
      : '#22d3ee';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Encabezado */}
        <div
          className="p-4 border-b border-slate-800 flex items-center justify-between"
          style={{ backgroundColor: layerInfo.bg }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg border"
              style={{ borderColor: layerInfo.border, color: layerInfo.color }}
            >
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-mono text-white">{node.name}</h3>
                <span
                  className="text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold"
                  style={{
                    backgroundColor: layerInfo.bg,
                    color: layerInfo.color,
                    border: `1px solid ${layerInfo.border}`,
                  }}
                >
                  Capa {node.layer}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">{node.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              data-testid="open-knowledge-base-btn"
              onClick={() => setIsKnowledgeBaseOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-200 font-mono text-xs font-bold transition shadow-md shadow-cyan-950/50 cursor-pointer active:scale-95"
              title="Abrir Base de Conocimiento de este Agente (Documentación Markdown, Lógica y Contratos)"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Base de Conocimiento</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo con Scroll */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs font-mono">
          {/* WIDGET 1: NODE AUTONOMY INDEX (ÍNDICE DE AUTONOMÍA DEL NODO) */}
          <div
            data-testid="node-autonomy-widget"
            className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 shadow-inner space-y-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                  Node Autonomy Index • Nivel de Confianza Agéntica
                </span>
              </div>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                style={{
                  color: autonomy.badgeColor,
                  borderColor: `${autonomy.badgeColor}66`,
                  backgroundColor: `${autonomy.badgeColor}18`,
                }}
              >
                {autonomy.levelLabel}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Medidor Radial SVG de Confidence Score */}
              <div className="relative flex items-center justify-center shrink-0">
                <svg className="w-24 h-24 -rotate-90 transform" viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r={gaugeRadius}
                    fill="transparent"
                    stroke="#1e293b"
                    strokeWidth="7"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r={gaugeRadius}
                    fill="transparent"
                    stroke={autonomy.badgeColor}
                    strokeWidth="7"
                    strokeDasharray={gaugeCircumference}
                    strokeDashoffset={gaugeStrokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span
                    className="text-xl font-extrabold leading-none"
                    style={{ color: autonomy.badgeColor }}
                  >
                    {autonomy.confidenceScore}%
                  </span>
                  <span className="text-[8.5px] uppercase tracking-wider text-slate-400 mt-0.5">
                    Confianza
                  </span>
                </div>
              </div>

              {/* Desglose de los 3 Pilares del Índice */}
              <div className="flex-1 w-full space-y-2.5">
                {/* Pilar 1: Fiabilidad Histórica */}
                <div>
                  <div className="flex items-center justify-between text-[10.5px] mb-1">
                    <span className="text-slate-400">
                      Fiabilidad Histórica ({autonomy.successRatePercent}% éxito)
                    </span>
                    <span className="font-bold text-emerald-300">
                      {autonomy.reliabilityScore}/100
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-300"
                      style={{ width: `${autonomy.reliabilityScore}%` }}
                    />
                  </div>
                </div>

                {/* Pilar 2: Eficiencia de Latencia p95 */}
                <div>
                  <div className="flex items-center justify-between text-[10.5px] mb-1">
                    <span className="text-slate-400">
                      Eficiencia Latencia p95 (SLA {autonomy.slaCompliancePercent}%)
                    </span>
                    <span className="font-bold text-cyan-300">
                      {autonomy.latencyEfficiencyScore}/100
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-300"
                      style={{ width: `${autonomy.latencyEfficiencyScore}%` }}
                    />
                  </div>
                </div>

                {/* Pilar 3: Estabilidad & Gobernanza */}
                <div>
                  <div className="flex items-center justify-between text-[10.5px] mb-1">
                    <span className="text-slate-400">
                      Estabilidad Operativa & Gobernanza
                    </span>
                    <span className="font-bold text-indigo-300">
                      {autonomy.stabilityScore}/100
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-indigo-400 transition-all duration-300"
                      style={{ width: `${autonomy.stabilityScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dictamen / Recomendación de Autonomía */}
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/90 flex items-start gap-2 text-[10.5px] text-slate-300 font-sans">
              <ShieldCheck
                className="w-4 h-4 shrink-0 mt-0.5"
                style={{ color: autonomy.badgeColor }}
              />
              <span>{autonomy.recommendation}</span>
            </div>
          </div>

          {/* WIDGET 2: LIVE LATENCY TRACKER (RASTREADOR DE LATENCIA EN VIVO CON SPARKLINES) */}
          <div
            data-testid="live-latency-tracker-widget"
            className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 shadow-inner space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                  Live Latency Tracker • Sparkline & Picos en Tiempo Real
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setManualSpikeBoostMs((prev) =>
                      prev > 0 ? 0 : Math.round(latencyTracker.historicalAvgMs * 0.65)
                    )
                  }
                  className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase border transition cursor-pointer ${
                    manualSpikeBoostMs > 0
                      ? 'bg-rose-950 border-rose-500 text-rose-300'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-amber-500/60 hover:text-amber-300'
                  }`}
                  title="Simular o limpiar un pico de latencia en vivo para verificar la detección en el Sparkline"
                >
                  {manualSpikeBoostMs > 0 ? 'Limpiar Pico' : '⚡ Simular Pico'}
                </button>

                <span
                  className="px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider border"
                  style={{
                    color: trackerColor,
                    borderColor: `${trackerColor}66`,
                    backgroundColor: `${trackerColor}18`,
                  }}
                >
                  {latencyTracker.statusLabel}
                </span>
              </div>
            </div>

            {/* Tarjetas Comparativas: Ejecución Actual vs Promedio Histórico */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[9.5px] text-slate-400 block">Ejecución Actual</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span
                    className="text-base font-extrabold"
                    style={{ color: trackerColor }}
                  >
                    {latencyTracker.currentExecutionMs}
                  </span>
                  <span className="text-[10px] text-slate-400">ms</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[9.5px] text-slate-400 block">Promedio Histórico</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-bold text-slate-200">
                    {latencyTracker.historicalAvgMs}
                  </span>
                  <span className="text-[10px] text-slate-400">ms</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[9.5px] text-slate-400 block">Delta vs Promedio</span>
                <div className="flex items-center gap-1 mt-0.5">
                  {latencyTracker.deltaMs > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                  <span
                    className={`text-sm font-bold ${
                      latencyTracker.deltaMs > 0 ? 'text-rose-300' : 'text-emerald-300'
                    }`}
                  >
                    {latencyTracker.deltaMs >= 0 ? '+' : ''}
                    {latencyTracker.deltaMs}ms ({latencyTracker.deltaPercent >= 0 ? '+' : ''}
                    {latencyTracker.deltaPercent}%)
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <span className="text-[9.5px] text-slate-400 block">Picos / Jitter</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span
                    className={`text-sm font-bold ${
                      latencyTracker.spikeCount > 0 ? 'text-amber-300' : 'text-emerald-300'
                    }`}
                  >
                    {latencyTracker.spikeCount} picos
                  </span>
                  <span className="text-[10px] text-slate-400">
                    (±{latencyTracker.jitterMs}ms)
                  </span>
                </div>
              </div>
            </div>

            {/* Gráfico SVG Sparkline de Alta Densidad */}
            <div className="p-2.5 rounded-lg bg-[#060a12] border border-slate-800/90">
              <div className="flex items-center justify-between text-[9.5px] text-slate-400 mb-1.5 px-1">
                <span>Ventana Temporal En Vivo (-45s → Ahora)</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-0.5 bg-slate-400 inline-block" /> Promedio ({latencyTracker.historicalAvgMs}ms)
                  </span>
                  <span className="flex items-center gap-1 text-rose-300">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Pico (&ge;{latencyTracker.spikeThresholdMs}ms)
                  </span>
                </div>
              </div>

              <svg
                viewBox={`0 0 ${sparkWidth} ${sparkHeight}`}
                className="w-full h-24 overflow-visible"
              >
                <defs>
                  <linearGradient id={`spark-grad-${node.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={trackerColor} stopOpacity="0.36" />
                    <stop offset="100%" stopColor={trackerColor} stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Línea de Umbral de Pico (1.32x) */}
                <line
                  x1={padX}
                  y1={spikeLineY}
                  x2={sparkWidth - padX}
                  y2={spikeLineY}
                  stroke="#f43f5e"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.55"
                />

                {/* Línea de Promedio Histórico */}
                <line
                  x1={padX}
                  y1={avgLineY}
                  x2={sparkWidth - padX}
                  y2={avgLineY}
                  stroke="#94a3b8"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                  opacity="0.7"
                />

                {/* Área bajo la curva Sparkline */}
                {areaPath && (
                  <path d={areaPath} fill={`url(#spark-grad-${node.id})`} />
                )}

                {/* Línea principal Sparkline */}
                <polyline
                  fill="none"
                  stroke={trackerColor}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polylinePoints}
                />

                {/* Puntos de muestreo y marcadores de picos */}
                {sparkPoints.map((pt, idx) => {
                  const isLast = idx === sparkPoints.length - 1;
                  if (!pt.isSpike && !isLast) {
                    return (
                      <circle
                        key={pt.sampleIndex}
                        cx={pt.x}
                        cy={pt.y}
                        r="2"
                        fill="#0f172a"
                        stroke={trackerColor}
                        strokeWidth="1.5"
                      />
                    );
                  }
                  return (
                    <g key={pt.sampleIndex}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isLast ? 4.2 : 3.6}
                        fill={pt.isSpike ? '#f43f5e' : trackerColor}
                        stroke="#050811"
                        strokeWidth="1.5"
                      />
                      {pt.isSpike && (
                        <text
                          x={pt.x}
                          y={Math.max(10, pt.y - 6)}
                          fill="#fda4af"
                          fontSize="8.5"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {pt.latencyMs}ms
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* WIDGET 3: NODE PERFORMANCE SUMMARY PANEL (RECHARTS 24-HOUR SUCCESS/ERROR TREND) */}
          <NodePerformanceSummaryPanel node={node} />

          {/* Métricas de Rendimiento */}
          <div>
            <h4 className="text-[11px] uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" /> Métricas Operativas en Tiempo Real
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Latencia p95</span>
                <span className="text-base font-bold text-cyan-300">
                  {node.metrics.p95LatencyMs} ms
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Tokens Procesados</span>
                <span className="text-base font-bold text-indigo-300">
                  {(node.metrics.tokensProcessed / 1000).toFixed(1)}k
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Tasa de Éxito</span>
                <span className="text-base font-bold text-emerald-300">
                  {node.metrics.successCount} ok ({autonomy.successRatePercent}%)
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Fallas / Reintentos</span>
                <span
                  className={`text-base font-bold ${
                    node.metrics.errorCount > 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}
                >
                  {node.metrics.errorCount} err
                </span>
              </div>
            </div>
          </div>

          {/* WIDGET: AGENT KNOWLEDGE BASE (FUENTE DE VERDAD DEL AGENTE) */}
          <div
            data-testid="node-knowledge-base-card"
            className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/30 to-slate-950 border border-cyan-500/40 shadow-inner space-y-2.5"
          >
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-200">
                  Agent Knowledge Base • Fuente de Verdad
                </span>
              </div>
              <button
                data-testid="open-kb-editor-btn"
                onClick={() => setIsKnowledgeBaseOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/30 font-mono text-[10.5px] font-bold transition cursor-pointer"
              >
                <span>Editar Documentación</span>
                <span className="text-cyan-400">→</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-300 space-y-1.5 font-sans leading-relaxed">
              <p className="line-clamp-2 text-slate-300">
                {getAgentKnowledgeDoc(node.id, node.name, node.role, node.description).markdownContent
                  .replace(/#+s/g, "")
                  .slice(0, 190)}...
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                <span>Versión: <strong className="text-cyan-300">v{getAgentKnowledgeDoc(node.id, node.name, node.role, node.description).version}</strong></span>
                <span>Autor: <strong className="text-slate-400">{getAgentKnowledgeDoc(node.id, node.name, node.role, node.description).author}</strong></span>
                <span className="text-emerald-400 font-bold">✓ Especificación Sincronizada</span>
              </div>
            </div>
          </div>

          {/* Configuración del Modelo y Parámetros */}
          <div>
            <h4 className="text-[11px] uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Configuración de Inferencia
            </h4>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500">Modelo IA: </span>
                <span className="text-cyan-300 font-bold">{node.config.model || 'Motor Heurístico'}</span>
              </div>
              <div>
                <span className="text-slate-500">Timeout: </span>
                <span>{node.config.timeoutMs ? `${node.config.timeoutMs}ms` : 'Automático'}</span>
              </div>
              <div>
                <span className="text-slate-500">Modo Estricto: </span>
                <span className={node.config.strictMode ? 'text-emerald-400' : 'text-slate-400'}>
                  {node.config.strictMode ? 'Activado (AST SAST)' : 'Estándar'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Reintentos Máximos: </span>
                <span>{node.config.maxRetries || 3}</span>
              </div>
            </div>
          </div>

          {/* Tarea en Ejecución Actualmente */}
          {currentTask && (
            <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/70">
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block mb-1">
                ⚡ Tarea Activa Asignada
              </span>
              <div className="text-xs text-white font-bold">{currentTask.title}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                ID: {currentTask.id} • Carril: {currentTask.lane.toUpperCase()} • Progreso: {currentTask.progress}%
              </div>
            </div>
          )}

          {/* Registro de Eventos del Nodo */}
          <div>
            <h4 className="text-[11px] uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" /> Registro de Actividad Específico
            </h4>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 max-h-36 overflow-y-auto space-y-1.5">
              {nodeLogs.length === 0 ? (
                <span className="text-slate-600 italic">No hay logs recientes para este nodo.</span>
              ) : (
                nodeLogs.map((log) => (
                  <div key={log.id} className="text-[10px] text-slate-400 flex items-start gap-2">
                    <span className="text-slate-600 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`font-semibold shrink-0 ${
                        log.level === 'error'
                          ? 'text-rose-400'
                          : log.level === 'warn'
                          ? 'text-amber-400'
                          : log.level === 'success'
                          ? 'text-emerald-400'
                          : 'text-cyan-400'
                      }`}
                    >
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="text-slate-300 break-words">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer con Acciones de Diagnóstico */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsKnowledgeBaseOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-700/80 hover:bg-cyan-900 font-mono text-xs font-bold transition cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" /> Base Conocimiento
            </button>
            <button
              onClick={() => onInjectFault(node.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-950/70 text-rose-300 border border-rose-800/80 hover:bg-rose-900 font-mono text-xs transition cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Inyectar Falla
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 font-mono text-xs transition"
          >
            Cerrar Inspector
          </button>
        </div>
      </div>

      <AgentKnowledgeBaseModal
        node={node}
        isOpen={isKnowledgeBaseOpen}
        onClose={() => setIsKnowledgeBaseOpen(false)}
      />
    </div>
  );
};
