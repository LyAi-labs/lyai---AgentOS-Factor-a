/**
 * AgentOS - Modal de Exportación de Telemetría y Rendimiento
 * Visualización, copia y descarga del reporte JSON del pipeline agéntico.
 */

import React, { useState, useMemo } from 'react';
import {
  FileJson,
  Download,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import {
  PipelineNode,
  PipelineEdge,
  PipelineTask,
  TelemetrySummary,
  ActivityLogEntry,
  DiagramMode,
} from '../types/pipeline';
import {
  generatePipelinePerformanceReport,
  downloadJsonFile,
  PipelinePerformanceReport,
} from '../pipeline/exportReport';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  tasks: PipelineTask[];
  telemetry: TelemetrySummary;
  activityLogs: ActivityLogEntry[];
  diagramMode: DiagramMode;
  speedMultiplier: number;
  engineStatus: 'idle' | 'running' | 'paused';
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  nodes,
  edges,
  tasks,
  telemetry,
  activityLogs,
  diagramMode,
  speedMultiplier,
  engineStatus,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<'all' | 'telemetry' | 'graph' | 'diagnostics'>('all');

  // Generación memoizada del reporte
  const report: PipelinePerformanceReport = useMemo(() => {
    return generatePipelinePerformanceReport({
      nodes,
      edges,
      tasks,
      telemetry,
      activityLogs,
      diagramMode,
      speedMultiplier,
      engineStatus,
    });
  }, [nodes, edges, tasks, telemetry, activityLogs, diagramMode, speedMultiplier, engineStatus]);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(report, null, 2);
  const sizeKb = (new Blob([jsonString]).size / 1024).toFixed(1);

  const handleDownload = () => {
    const filename = `agentos-report-${new Date().toISOString().slice(0, 10)}-${report.reportMetadata.reportId.toLowerCase()}.json`;
    downloadJsonFile(report, filename);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Contenido filtrado para visualización según pestaña
  const displayContent = () => {
    switch (activeSection) {
      case 'telemetry':
        return JSON.stringify(
          {
            reportMetadata: report.reportMetadata,
            telemetrySummary: report.telemetrySummary,
            laneBreakdown: report.laneBreakdown,
          },
          null,
          2
        );
      case 'graph':
        return JSON.stringify(report.executionGraph, null, 2);
      case 'diagnostics':
        return JSON.stringify(report.systemHealthDiagnostics, null, 2);
      default:
        return jsonString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 1. Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-mono text-white">
                  Reporte Completo de Rendimiento del Pipeline
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                  {report.reportMetadata.reportId}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                Exportación estructurada en formato JSON con métricas de telemetría, estado de los 25 nodos y diagnóstico de carriles
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* 2. Métricas Clave del Reporte */}
        <div className="p-4 bg-slate-950/50 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">Salud del Pipeline</span>
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{report.systemHealthDiagnostics.overallHealthScore}%</span>
              <span className="text-[10px] text-slate-400 font-normal">
                ({report.systemHealthDiagnostics.statusLabel})
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">Grafo de Ejecución</span>
            <div className="flex items-center gap-1.5 font-bold text-cyan-300">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>{report.executionGraph.totalNodes} Nodos</span>
              <span className="text-[10px] text-slate-400 font-normal">({report.executionGraph.totalEdges} aristas)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">Tareas en Reporte</span>
            <div className="flex items-center gap-1.5 font-bold text-indigo-300">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>{report.tasksCatalog.length} Tareas</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">Tamaño del Payload</span>
            <div className="flex items-center gap-1.5 font-bold text-purple-300">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>{sizeKb} KB</span>
            </div>
          </div>
        </div>

        {/* 3. Diagnóstico y Hallazgos Clave */}
        <div className="px-5 py-3 bg-slate-900/80 border-b border-slate-800 text-[11px] font-sans space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 font-mono">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Diagnóstico de Rendimiento & Cuellos de Botella:
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-300">
            {report.systemHealthDiagnostics.keyFindings.map((finding, idx) => (
              <li key={idx}>{finding}</li>
            ))}
          </ul>
        </div>

        {/* 4. Selector de Pestañas de Vista Previa */}
        <div className="px-5 py-2 bg-slate-950 flex items-center justify-between border-b border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-400 font-bold mr-1">Vista Previa:</span>
            <button
              onClick={() => setActiveSection('all')}
              className={`px-2.5 py-1 rounded font-mono transition ${
                activeSection === 'all'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Reporte Completo
            </button>
            <button
              onClick={() => setActiveSection('telemetry')}
              className={`px-2.5 py-1 rounded font-mono transition ${
                activeSection === 'telemetry'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              Telemetría & Carriles
            </button>
            <button
              onClick={() => setActiveSection('graph')}
              className={`px-2.5 py-1 rounded font-mono transition ${
                activeSection === 'graph'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold'
                  : 'text-slate-400 hover:text-indigo-300'
              }`}
            >
              Nodos & Aristas
            </button>
            <button
              onClick={() => setActiveSection('diagnostics')}
              className={`px-2.5 py-1 rounded font-mono transition ${
                activeSection === 'diagnostics'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                  : 'text-slate-400 hover:text-purple-300'
              }`}
            >
              Diagnóstico
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar JSON</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 5. Bloque de Visualización JSON */}
        <div className="p-4 overflow-y-auto flex-1 bg-[#050811]">
          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto leading-relaxed select-text">
            {displayContent()}
          </pre>
        </div>

        {/* 6. Footer con Acciones de Descarga */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <span>Endpoint API:</span>
            <a
              href="/api/pipeline/export?download=true"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              /api/pipeline/export <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cerrar
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold font-mono shadow-lg shadow-cyan-500/25 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Archivo JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
