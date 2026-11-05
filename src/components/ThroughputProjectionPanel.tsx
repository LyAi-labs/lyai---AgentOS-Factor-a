/**
 * AgentOS - Panel de Visualización con Gráficos D3
 * Tendencia proyectada de finalización de tareas y throughput por carril de ejecución
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  TrendingUp,
  Clock,
  Zap,
  Layers,
  Activity,
  Sliders,
  CheckCircle2,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';
import { PipelineTask, TaskLane } from '../types/pipeline';
import {
  generateCompletionTrendProjection,
  LANE_CONFIG,
} from '../pipeline/projections';

interface ThroughputProjectionPanelProps {
  tasks: PipelineTask[];
  speed: number;
  onClose?: () => void;
}

export const ThroughputProjectionPanel: React.FC<ThroughputProjectionPanelProps> = ({
  tasks,
  speed,
}) => {
  // Estados de control interactivo
  const [horizonMinutes, setHorizonMinutes] = useState<number>(60);
  const [selectedLaneFilter, setSelectedLaneFilter] = useState<TaskLane | 'all'>('all');
  const [extraBacklog, setExtraBacklog] = useState<number>(0);

  // Referencias a contenedores SVG para D3
  const burnUpSvgRef = useRef<SVGSVGElement | null>(null);
  const velocitySvgRef = useRef<SVGSVGElement | null>(null);
  const leadTimeSvgRef = useRef<SVGSVGElement | null>(null);

  // Tooltip flotante interactivo
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    data: any;
    visible: boolean;
  }>({ x: 0, y: 0, data: null, visible: false });

  // Cálculo memoizado de proyecciones
  const projection = useMemo(() => {
    return generateCompletionTrendProjection(tasks, horizonMinutes, speed, extraBacklog);
  }, [tasks, horizonMinutes, speed, extraBacklog]);

  // ============================================================
  // GRÁFICO D3 1: CURVA S DE QUEMADO Y PROYECCIÓN DE FINALIZACIÓN
  // ============================================================
  useEffect(() => {
    if (!burnUpSvgRef.current) return;

    const svg = d3.select(burnUpSvgRef.current);
    svg.selectAll('*').remove();

    const width = 820;
    const height = 360;
    const margin = { top: 30, right: 70, bottom: 45, left: 55 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Definición de gradientes y filtros
    const defs = svg.append('defs');

    // Gradiente de banda de confianza (p90 - p10)
    const confidenceGrad = defs
      .append('linearGradient')
      .attr('id', 'confidenceGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    confidenceGrad.append('stop').attr('offset', '0%').attr('stop-color', '#38bdf8').attr('stop-opacity', 0.25);
    confidenceGrad.append('stop').attr('offset', '100%').attr('stop-color', '#818cf8').attr('stop-opacity', 0.05);

    // Gradiente área bajo la curva esperada
    const areaGrad = defs
      .append('linearGradient')
      .attr('id', 'areaGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    areaGrad.append('stop').attr('offset', '0%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.35);
    areaGrad.append('stop').attr('offset', '100%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.02);

    // Escalas X (tiempo en minutos relativos) e Y (número acumulado de tareas)
    const xMin = d3.min(projection.timeSeries, (d) => d.minuteOffset) ?? -15;
    const xMax = d3.max(projection.timeSeries, (d) => d.minuteOffset) ?? horizonMinutes;

    const xScale = d3
      .scaleLinear()
      .domain([xMin, xMax])
      .range([0, innerWidth]);

    const maxTasksValue = Math.max(
      projection.targetBacklogLine + 2,
      d3.max(projection.timeSeries, (d) => d.p10Optimistic ?? d.totalCompleted) ?? 10
    );

    const yScale = d3
      .scaleLinear()
      .domain([0, maxTasksValue])
      .nice()
      .range([innerHeight, 0]);

    // Cuadrícula Horizontal y Vertical (Grid)
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.12)
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-dasharray', '3 3');

    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.12)
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickSize(-innerHeight)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-dasharray', '3 3');

    // Eje X
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(8)
      .tickFormat((d) => (Number(d) === 0 ? 'Ahora (0m)' : `${Number(d) > 0 ? '+' : ''}${d}m`));

    const gx = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    gx.selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px')
      .attr('font-family', 'monospace');
    gx.selectAll('line').attr('stroke', '#334155');
    gx.select('.domain').attr('stroke', '#334155');

    // Eje Y
    const yAxis = d3.axisLeft(yScale).ticks(6);
    const gy = g.append('g').call(yAxis);
    gy.selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px')
      .attr('font-family', 'monospace');
    gy.selectAll('line').attr('stroke', '#334155');
    gy.select('.domain').attr('stroke', '#334155');

    // Etiqueta Eje Y
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -42)
      .attr('x', -innerHeight / 2)
      .attr('fill', '#64748b')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('text-anchor', 'middle')
      .text('Tareas Acumuladas');

    // Línea de Meta / Objetivo de Backlog Total (Target line)
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(projection.targetBacklogLine))
      .attr('y2', yScale(projection.targetBacklogLine))
      .attr('stroke', '#f59e0b')
      .attr('stroke-dasharray', '5 4')
      .attr('stroke-width', 1.8)
      .attr('opacity', 0.85);

    g.append('text')
      .attr('x', innerWidth - 5)
      .attr('y', yScale(projection.targetBacklogLine) - 6)
      .attr('fill', '#f59e0b')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'end')
      .text(`🎯 Meta Backlog: ${projection.targetBacklogLine} tareas`);

    // Línea divisoria Vertical en Ahora (t = 0)
    g.append('line')
      .attr('x1', xScale(0))
      .attr('x2', xScale(0))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#06b6d4')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 4')
      .attr('opacity', 0.7);

    // Sombra/Banda de Intervalo de Confianza (p10 - p90) para el futuro
    const projectedPoints = projection.timeSeries.filter((d) => d.minuteOffset >= 0);
    if (projectedPoints.length > 0 && selectedLaneFilter === 'all') {
      const confidenceArea = d3
        .area<any>()
        .x((d) => xScale(d.minuteOffset))
        .y0((d) => yScale(d.p90Conservative ?? d.totalCompleted))
        .y1((d) => yScale(d.p10Optimistic ?? d.totalCompleted))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(projectedPoints)
        .attr('fill', 'url(#confidenceGrad)')
        .attr('d', confidenceArea);
    }

    // Líneas por carril o curva total
    if (selectedLaneFilter === 'all' || selectedLaneFilter === 'standard') {
      const lineStd = d3
        .line<any>()
        .x((d) => xScale(d.minuteOffset))
        .y((d) => yScale(d.standardCompleted))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(projection.timeSeries)
        .attr('fill', 'none')
        .attr('stroke', LANE_CONFIG.standard.color)
        .attr('stroke-width', 2)
        .attr('stroke-opacity', selectedLaneFilter === 'all' ? 0.6 : 1)
        .attr('stroke-dasharray', (d) => (selectedLaneFilter === 'all' ? '4 2' : 'none'))
        .attr('d', lineStd);
    }

    if (selectedLaneFilter === 'all' || selectedLaneFilter === 'express') {
      const lineExp = d3
        .line<any>()
        .x((d) => xScale(d.minuteOffset))
        .y((d) => yScale(d.expressCompleted))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(projection.timeSeries)
        .attr('fill', 'none')
        .attr('stroke', LANE_CONFIG.express.color)
        .attr('stroke-width', 2)
        .attr('stroke-opacity', selectedLaneFilter === 'all' ? 0.6 : 1)
        .attr('stroke-dasharray', (d) => (selectedLaneFilter === 'all' ? '4 2' : 'none'))
        .attr('d', lineExp);
    }

    if (selectedLaneFilter === 'all' || selectedLaneFilter === 'urgent') {
      const lineUrg = d3
        .line<any>()
        .x((d) => xScale(d.minuteOffset))
        .y((d) => yScale(d.urgentCompleted))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(projection.timeSeries)
        .attr('fill', 'none')
        .attr('stroke', LANE_CONFIG.urgent.color)
        .attr('stroke-width', 2)
        .attr('stroke-opacity', selectedLaneFilter === 'all' ? 0.6 : 1)
        .attr('stroke-dasharray', (d) => (selectedLaneFilter === 'all' ? '4 2' : 'none'))
        .attr('d', lineUrg);
    }

    // Curva Principal Total Acumulada
    if (selectedLaneFilter === 'all') {
      // Tramo histórico (sólido)
      const historicalPoints = projection.timeSeries.filter((d) => d.minuteOffset <= 0);
      const lineHist = d3
        .line<any>()
        .x((d) => xScale(d.minuteOffset))
        .y((d) => yScale(d.totalCompleted))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(historicalPoints)
        .attr('fill', 'none')
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 3)
        .attr('d', lineHist);

      // Tramo proyectado esperado (línea punteada prominente)
      const lineProj = d3
        .line<any>()
        .x((d) => xScale(d.minuteOffset))
        .y((d) => yScale(d.p50Expected ?? d.totalCompleted))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(projectedPoints)
        .attr('fill', 'none')
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '6 4')
        .attr('d', lineProj);
    }

    // Puntos de datos y tracking
    g.selectAll('.dot')
      .data(projection.timeSeries)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.minuteOffset))
      .attr('cy', (d) => yScale(d.totalCompleted))
      .attr('r', (d) => (d.minuteOffset === 0 ? 5.5 : 3.5))
      .attr('fill', (d) => (d.minuteOffset === 0 ? '#06b6d4' : d.isProjected ? '#818cf8' : '#38bdf8'))
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2);

    // Overlay transparente para interacción y tooltip hover
    const bisect = d3.bisector<any, number>((d) => d.minuteOffset).center;

    svg
      .append('rect')
      .attr('transform', `translate(${margin.left},${margin.top})`)
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const xVal = xScale.invert(mx);
        const idx = bisect(projection.timeSeries, xVal);
        const pt = projection.timeSeries[idx];
        if (pt) {
          setHoveredPoint({
            x: xScale(pt.minuteOffset) + margin.left,
            y: yScale(pt.totalCompleted) + margin.top,
            data: pt,
            visible: true,
          });
        }
      })
      .on('mouseleave', () => {
        setHoveredPoint((prev) => ({ ...prev, visible: false }));
      });
  }, [projection, horizonMinutes, selectedLaneFilter]);

  // ============================================================
  // GRÁFICO D3 2: COMPARATIVA DE VELOCIDAD & THROUGHPUT POR CARRIL
  // ============================================================
  useEffect(() => {
    if (!velocitySvgRef.current) return;

    const svg = d3.select(velocitySvgRef.current);
    svg.selectAll('*').remove();

    const width = 380;
    const height = 210;
    const margin = { top: 20, right: 25, bottom: 35, left: 110 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const lanesData = [
      projection.lanes.standard,
      projection.lanes.express,
      projection.lanes.urgent,
    ];

    const yScale = d3
      .scaleBand()
      .domain(lanesData.map((d) => d.laneName))
      .range([0, innerHeight])
      .padding(0.28);

    const maxVel = Math.max(
      3.0,
      d3.max(lanesData, (d) => d.currentVelocityTasksPerMin) ?? 2
    );

    const xScale = d3
      .scaleLinear()
      .domain([0, maxVel])
      .nice()
      .range([0, innerWidth]);

    // Eje X
    const xAxis = d3.axisBottom(xScale).ticks(4).tickFormat((d) => `${d} t/m`);
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    // Eje Y
    const yAxis = d3.axisLeft(yScale);
    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', '#cbd5e1')
      .attr('font-size', '10.5px')
      .attr('font-weight', 'bold');

    // Barras de Velocidad
    g.selectAll('.bar-bg')
      .data(lanesData)
      .enter()
      .append('rect')
      .attr('y', (d) => yScale(d.laneName) ?? 0)
      .attr('height', yScale.bandwidth())
      .attr('x', 0)
      .attr('width', innerWidth)
      .attr('fill', '#1e293b')
      .attr('rx', 4);

    g.selectAll('.bar')
      .data(lanesData)
      .enter()
      .append('rect')
      .attr('y', (d) => yScale(d.laneName) ?? 0)
      .attr('height', yScale.bandwidth())
      .attr('x', 0)
      .attr('width', (d) => xScale(d.currentVelocityTasksPerMin))
      .attr('fill', (d) => d.color)
      .attr('rx', 4);

    // Etiquetas de valor sobre las barras
    g.selectAll('.bar-label')
      .data(lanesData)
      .enter()
      .append('text')
      .attr('x', (d) => xScale(d.currentVelocityTasksPerMin) + 6)
      .attr('y', (d) => (yScale(d.laneName) ?? 0) + yScale.bandwidth() / 2 + 3.5)
      .attr('fill', '#f1f5f9')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text((d) => `${d.currentVelocityTasksPerMin} t/m (${d.projectedPerHour}/h)`);
  }, [projection]);

  // ============================================================
  // GRÁFICO D3 3: HISTOGRAMA DE DISTRIBUCIÓN DE LEAD TIME (DURACIÓN)
  // ============================================================
  useEffect(() => {
    if (!leadTimeSvgRef.current) return;

    const svg = d3.select(leadTimeSvgRef.current);
    svg.selectAll('*').remove();

    const width = 380;
    const height = 210;
    const margin = { top: 20, right: 20, bottom: 35, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const data = projection.leadTimeDistribution;

    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.binLabel))
      .range([0, innerWidth])
      .padding(0.25);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.probability) ?? 0.5])
      .nice()
      .range([innerHeight, 0]);

    // Eje X
    const xAxis = d3.axisBottom(xScale);
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('transform', 'rotate(-15)')
      .attr('text-anchor', 'end');

    // Eje Y
    const yAxis = d3.axisLeft(yScale).ticks(4).tickFormat((d) => `${Math.round(Number(d) * 100)}%`);
    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '9.5px')
      .attr('font-family', 'monospace');

    // Barras de Probabilidad
    g.selectAll('.hist-bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d) => xScale(d.binLabel) ?? 0)
      .attr('width', xScale.bandwidth())
      .attr('y', (d) => yScale(d.probability))
      .attr('height', (d) => innerHeight - yScale(d.probability))
      .attr('fill', '#38bdf8')
      .attr('opacity', 0.85)
      .attr('rx', 3);

    // Texto de porcentaje
    g.selectAll('.hist-text')
      .data(data)
      .enter()
      .append('text')
      .attr('x', (d) => (xScale(d.binLabel) ?? 0) + xScale.bandwidth() / 2)
      .attr('y', (d) => yScale(d.probability) - 4)
      .attr('fill', '#cbd5e1')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('text-anchor', 'middle')
      .text((d) => `${Math.round(d.probability * 100)}%`);
  }, [projection]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header con métricas de Throughput y ETA */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                Tendencia Proyectada de Finalización de Tareas
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                  D3 POWERED ENGINE
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Modelado estocástico de throughput por carril, simulación de vaciado de backlog e intervalos de confianza p10/p50/p90
              </p>
            </div>
          </div>
        </div>

        {/* Resumen KPI Rápido */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full md:w-auto">
          <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 block">Velocidad Global</span>
            <div className="text-sm font-bold font-mono text-cyan-300 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              {projection.overallVelocityTasksPerMin} <span className="text-[10px] text-slate-400">t/m</span>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 block">ETA Estimado</span>
            <div className="text-sm font-bold font-mono text-emerald-300 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              {projection.completionEta}
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 block">Backlog Activo</span>
            <div className="text-sm font-bold font-mono text-amber-300 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              {projection.totalPendingTasks} <span className="text-[10px] text-slate-400">tareas</span>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 block">Tiempo Drenado</span>
            <div className="text-sm font-bold font-mono text-indigo-300 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              ~{projection.estimatedFullCompletionMinutes} <span className="text-[10px] text-slate-400">min</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Barra de Controles Interactivos (Horizonte, Filtro de Carril y Simulador de Carga) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
        {/* Filtro de Carriles */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[11px] font-mono font-bold mr-1">Filtrar Carril:</span>
          <button
            onClick={() => setSelectedLaneFilter('all')}
            className={`px-2.5 py-1 rounded-md font-mono transition ${
              selectedLaneFilter === 'all'
                ? 'bg-slate-700 text-white font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            Todos (Global)
          </button>
          <button
            onClick={() => setSelectedLaneFilter('standard')}
            className={`px-2.5 py-1 rounded-md font-mono transition ${
              selectedLaneFilter === 'standard'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-cyan-300'
            }`}
          >
            Estándar ({projection.lanes.standard.currentVelocityTasksPerMin} t/m)
          </button>
          <button
            onClick={() => setSelectedLaneFilter('express')}
            className={`px-2.5 py-1 rounded-md font-mono transition ${
              selectedLaneFilter === 'express'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-purple-300'
            }`}
          >
            Exprés ({projection.lanes.express.currentVelocityTasksPerMin} t/m)
          </button>
          <button
            onClick={() => setSelectedLaneFilter('urgent')}
            className={`px-2.5 py-1 rounded-md font-mono transition ${
              selectedLaneFilter === 'urgent'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-rose-300'
            }`}
          >
            Urgente P0 ({projection.lanes.urgent.currentVelocityTasksPerMin} t/m)
          </button>
        </div>

        {/* Horizonte Temporal */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[11px] font-mono font-bold mr-1">Horizonte:</span>
          {[15, 30, 60, 120].map((h) => (
            <button
              key={h}
              onClick={() => setHorizonMinutes(h)}
              className={`px-2.5 py-1 rounded-md font-mono transition ${
                horizonMinutes === h
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              +{h} min
            </button>
          ))}
        </div>

        {/* Simulador de Estrés / Carga Backlog Extra */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 text-[11px] font-mono">
            Simular Backlog Extra: <strong className="text-amber-300">+{extraBacklog}</strong>
          </span>
          <input
            type="range"
            min={0}
            max={50}
            step={5}
            value={extraBacklog}
            onChange={(e) => setExtraBacklog(Number(e.target.value))}
            className="w-24 accent-amber-400 cursor-pointer"
          />
          {extraBacklog > 0 && (
            <button
              onClick={() => setExtraBacklog(0)}
              className="text-[10px] text-slate-500 hover:text-slate-300 underline font-mono"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 3. Gráfico D3 Principal: Curva S de Quemado con Banda de Confianza */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold font-mono text-white">
              Gráfico D3: Curva S de Finalización Acumulada & Intervalos de Confianza
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-sky-400 inline-block"></span>
              Histórico Observado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-sky-400 inline-block"></span>
              Proyección Esperada (p50)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-sky-400/20 border border-sky-400/40 rounded inline-block"></span>
              Banda Confianza (p10 - p90)
            </span>
          </div>
        </div>

        {/* Contenedor del SVG Interactivo */}
        <div className="w-full overflow-x-auto relative flex justify-center">
          <svg
            ref={burnUpSvgRef}
            viewBox="0 0 820 360"
            className="w-full max-w-[820px] h-auto select-none"
          />

          {/* Tooltip Dinámico Hover */}
          {hoveredPoint.visible && hoveredPoint.data && (
            <div
              className="absolute pointer-events-none p-3 rounded-lg bg-slate-950/95 border border-cyan-500/50 shadow-2xl text-[11px] font-mono space-y-1 z-30 transform -translate-x-1/2 -translate-y-full"
              style={{
                left: `${hoveredPoint.x}px`,
                top: `${hoveredPoint.y - 12}px`,
              }}
            >
              <div className="font-bold text-cyan-300 border-b border-slate-800 pb-1 flex items-center justify-between gap-4">
                <span>
                  {hoveredPoint.data.minuteOffset === 0
                    ? 'Momento Actual (t = 0)'
                    : `Offset: ${hoveredPoint.data.minuteOffset > 0 ? '+' : ''}${hoveredPoint.data.minuteOffset} min`}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(hoveredPoint.data.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-white">
                Completadas Estimadas: <strong className="text-cyan-400">{hoveredPoint.data.totalCompleted}</strong>
              </div>
              {hoveredPoint.data.p10Optimistic !== undefined && (
                <div className="text-slate-400 text-[10px]">
                  Rango Confianza: [{hoveredPoint.data.p90Conservative} (p90) - {hoveredPoint.data.p10Optimistic} (p10)]
                </div>
              )}
              <div className="text-amber-400 text-[10px]">
                Backlog Restante: {hoveredPoint.data.remainingBacklog} tareas
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Fila Inferior con Gráficos D3 Secundarios: Velocidad por Carril y Distribución Lead Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico D3: Velocidad y Throughput por Carril */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <span className="text-xs font-bold font-mono text-white flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              Throughput de Ejecución por Carril (Tareas / Minuto)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Concurrencia Activa
            </span>
          </div>

          <div className="w-full flex justify-center">
            <svg
              ref={velocitySvgRef}
              viewBox="0 0 380 210"
              className="w-full max-w-[380px] h-auto select-none"
            />
          </div>

          {/* Tarjetas resumen de saturación */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono">
            <div className="p-2 rounded-lg bg-slate-950 border border-cyan-500/20 text-slate-300">
              <div className="text-cyan-400 font-bold">Estándar</div>
              <div className="text-[10px] text-slate-400">Ciclo: {projection.lanes.standard.avgDurationSec}s</div>
              <div className="text-[10px] text-slate-400">Drenado: ~{projection.lanes.standard.estimatedBacklogDrainMinutes}m</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-purple-500/20 text-slate-300">
              <div className="text-purple-400 font-bold">Exprés</div>
              <div className="text-[10px] text-slate-400">Ciclo: {projection.lanes.express.avgDurationSec}s</div>
              <div className="text-[10px] text-slate-400">Drenado: ~{projection.lanes.express.estimatedBacklogDrainMinutes}m</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-rose-500/20 text-slate-300">
              <div className="text-rose-400 font-bold">Urgente P0</div>
              <div className="text-[10px] text-slate-400">Ciclo: {projection.lanes.urgent.avgDurationSec}s</div>
              <div className="text-[10px] text-slate-400">Drenado: ~{projection.lanes.urgent.estimatedBacklogDrainMinutes}m</div>
            </div>
          </div>
        </div>

        {/* Gráfico D3: Distribución Probabilística de Lead Time */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <span className="text-xs font-bold font-mono text-white flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Histograma de Probabilidad de Lead Time (Duración)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Monte Carlo Density
            </span>
          </div>

          <div className="w-full flex justify-center">
            <svg
              ref={leadTimeSvgRef}
              viewBox="0 0 380 210"
              className="w-full max-w-[380px] h-auto select-none"
            />
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[10.5px] font-mono text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              El 65% de las tareas de la factoría finalizan en menos de 15 segundos gracias a la aceleración de los carriles Exprés y Bypass Urgente.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
