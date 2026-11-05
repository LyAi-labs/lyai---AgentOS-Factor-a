/**
 * AgentOS - Inspector de Telemetría de Nodo
 * Muestra métricas detalladas, configuración del modelo, carga de trabajo y registro de eventos.
 */

import React from 'react';
import {
  PipelineNode,
  ActivityLogEntry,
  PipelineTask,
} from '../types/pipeline';
import { LAYER_INFO } from '../pipeline/graphData';
import {
  X,
  Cpu,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Database,
  ShieldAlert,
  Sliders,
  Terminal,
  Activity,
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
  if (!node) return null;

  const layerInfo = LAYER_INFO[node.layer];
  const nodeLogs = logs.filter(
    (l) => l.source === node.name || l.source === node.label || l.source === node.id
  );
  const currentTask = tasks.find((t) => t.id === node.currentTaskId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
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

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo con Scroll */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs font-mono">
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
                  {node.metrics.successCount} ok
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
          <button
            onClick={() => onInjectFault(node.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-950/70 text-rose-300 border border-rose-800/80 hover:bg-rose-900 font-mono text-xs transition"
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Inyectar Falla de Prueba
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 font-mono text-xs transition"
          >
            Cerrar Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
