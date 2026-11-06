/**
 * AgentOS - Panel de Resumen de Rendimiento de Nodo (Node Performance Summary)
 * Muestra el gráfico de tendencia de 24 horas de éxitos y errores del nodo seleccionado mediante Recharts.
 */

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { PipelineNode } from '../types/pipeline';
import { calculateNodePerformanceSummary } from '../pipeline/nodePerformanceSummary';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Zap,
  Info,
} from 'lucide-react';

interface NodePerformanceSummaryPanelProps {
  node: PipelineNode;
}

export const NodePerformanceSummaryPanel: React.FC<NodePerformanceSummaryPanelProps> = ({
  node,
}) => {
  const [chartType, setChartType] = useState<'area' | 'line'>('area');
  const [timeFilter, setTimeFilter] = useState<'24h' | '12h' | '6h'>('24h');

  const summary = useMemo(() => calculateNodePerformanceSummary(node), [node]);

  const filteredPoints = useMemo(() => {
    if (timeFilter === '6h') {
      return summary.hourlyPoints.slice(-6);
    }
    if (timeFilter === '12h') {
      return summary.hourlyPoints.slice(-12);
    }
    return summary.hourlyPoints;
  }, [summary, timeFilter]);

  const statusBadge = useMemo(() => {
    switch (summary.trendStatus) {
      case 'optimal':
        return {
          label: 'Óptimo 24h',
          color: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40',
        };
      case 'stable':
        return {
          label: 'Estable 24h',
          color: 'text-cyan-300 border-cyan-500/40 bg-cyan-950/40',
        };
      case 'degrading':
        return {
          label: 'Degradado',
          color: 'text-amber-300 border-amber-500/40 bg-amber-950/40',
        };
      case 'investigate':
        return {
          label: 'Investigar',
          color: 'text-rose-300 border-rose-500/40 bg-rose-950/40',
        };
    }
  }, [summary.trendStatus]);

  // Formateador personalizado para el Tooltip oscuro de Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700/80 p-2.5 rounded-lg shadow-xl text-[11px] font-mono text-slate-200 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5 mb-1.5 font-bold text-slate-100">
            <span>Hora: {data.hour}</span>
            <span className="text-cyan-400 text-[10px]">
              {new Date(data.timestamp).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Éxitos:
              </span>
              <strong className="text-emerald-300 font-bold">{data.successCount}</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                Errores:
              </span>
              <strong className="text-rose-300 font-bold">{data.errorCount}</strong>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800/80 text-[10px]">
              <span className="text-slate-400">Tasa de Éxito:</span>
              <span
                className={`font-bold ${
                  data.successRate >= 95
                    ? 'text-emerald-300'
                    : data.successRate >= 80
                    ? 'text-amber-300'
                    : 'text-rose-400'
                }`}
              >
                {data.successRate}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-[10px]">
              <span className="text-slate-400">Latencia Media:</span>
              <span className="text-cyan-300 font-bold">{data.avgLatencyMs} ms</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      data-testid="node-performance-summary-panel"
      className="p-4 rounded-xl bg-slate-950/95 border border-slate-800 shadow-xl space-y-3.5 font-mono"
    >
      {/* Encabezado del Panel */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/90 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-100">
                Node Performance Summary • Tendencia 24 Horas
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${statusBadge.color}`}
              >
                {statusBadge.label}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-sans">
              Histórico consolidado de ejecuciones, fallas operativas y tasa de éxito para{' '}
              <strong className="text-cyan-300 font-mono">{node.name}</strong>
            </span>
          </div>
        </div>

        {/* Controles de Vista & Rango Temporal */}
        <div className="flex items-center gap-2">
          {/* Selector de Rango */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[9.5px]">
            <button
              onClick={() => setTimeFilter('6h')}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                timeFilter === '6h'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              6h
            </button>
            <button
              onClick={() => setTimeFilter('12h')}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                timeFilter === '12h'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              12h
            </button>
            <button
              onClick={() => setTimeFilter('24h')}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                timeFilter === '24h'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              24h
            </button>
          </div>

          {/* Selector de Tipo de Gráfico */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[9.5px]">
            <button
              onClick={() => setChartType('area')}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                chartType === 'area'
                  ? 'bg-indigo-500/20 text-indigo-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vista de Áreas Apiladas (Recharts AreaChart)"
            >
              Áreas
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                chartType === 'line'
                  ? 'bg-indigo-500/20 text-indigo-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vista de Líneas de Tendencia (Recharts LineChart)"
            >
              Líneas
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Métricas Clave de 24h */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {/* Card 1: Éxitos 24h */}
        <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/90">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> Éxitos 24h
            </span>
            <span className="text-emerald-300 font-bold">{summary.overall24hSuccessRate}%</span>
          </div>
          <div className="text-base font-extrabold text-emerald-300">
            {summary.total24hSuccesses}{' '}
            <span className="text-[10px] text-slate-400 font-normal">ok</span>
          </div>
        </div>

        {/* Card 2: Errores 24h */}
        <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/90">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
            <span className="flex items-center gap-1 text-rose-400">
              <AlertTriangle className="w-3 h-3" /> Errores 24h
            </span>
            <span className="text-rose-300 font-bold">Pico {summary.peakErrorHour}</span>
          </div>
          <div
            className={`text-base font-extrabold ${
              summary.total24hErrors > 0 ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {summary.total24hErrors}{' '}
            <span className="text-[10px] text-slate-400 font-normal">fallas</span>
          </div>
        </div>

        {/* Card 3: Volumen Total */}
        <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/90">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
            <span className="flex items-center gap-1 text-cyan-400">
              <Activity className="w-3 h-3" /> Total Ejecuciones
            </span>
            <span className="text-cyan-300 font-bold">Pico {summary.peakVolumeHour}</span>
          </div>
          <div className="text-base font-extrabold text-white">
            {summary.total24hExecutions}{' '}
            <span className="text-[10px] text-slate-400 font-normal">tareas</span>
          </div>
        </div>

        {/* Card 4: Latencia Media / p95 */}
        <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/90">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
            <span className="flex items-center gap-1 text-indigo-400">
              <Clock className="w-3 h-3" /> Latencia 24h
            </span>
            <span className="text-indigo-300 font-bold">p95 {summary.p95LatencyMs}ms</span>
          </div>
          <div className="text-base font-extrabold text-cyan-300">
            {summary.avgLatencyMs}{' '}
            <span className="text-[10px] text-slate-400 font-normal">ms media</span>
          </div>
        </div>
      </div>

      {/* Gráfico Recharts de Tendencia de 24 Horas */}
      <div className="p-3 rounded-lg bg-[#050811] border border-slate-800/90">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 px-1">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-cyan-400" /> Curva de Éxitos vs Errores por Hora (Recharts)
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2 rounded-sm bg-emerald-500 inline-block" />
              Éxitos
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2 rounded-sm bg-rose-500 inline-block" />
              Errores
            </span>
          </div>
        </div>

        <div className="w-full h-44 sm:h-48 text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart
                data={filteredPoints}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={`gradSuccess-${node.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id={`gradError-${node.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.65} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis
                  dataKey="hour"
                  stroke="#64748b"
                  fontSize={9}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="successCount"
                  name="Éxitos"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#gradSuccess-${node.id})`}
                />
                <Area
                  type="monotone"
                  dataKey="errorCount"
                  name="Errores"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#gradError-${node.id})`}
                />
              </AreaChart>
            ) : (
              <LineChart
                data={filteredPoints}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis
                  dataKey="hour"
                  stroke="#64748b"
                  fontSize={9}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="successCount"
                  name="Éxitos"
                  stroke="#10b981"
                  strokeWidth={2.2}
                  dot={{ r: 2.5, fill: '#10b981' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="errorCount"
                  name="Errores"
                  stroke="#f43f5e"
                  strokeWidth={2.2}
                  dot={{ r: 2.5, fill: '#f43f5e' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dictamen de Rendimiento de 24h */}
      <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/90 flex items-start gap-2 text-[10.5px] text-slate-300 font-sans">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-semibold text-slate-200">Diagnóstico 24h: </span>
          <span>{summary.trendMessage}</span>
        </div>
      </div>
    </div>
  );
};
