/**
 * AgentOS - Tablero de Tareas y Trazabilidad del Pipeline
 */

import React from 'react';
import {
  PipelineTask,
  TaskLane,
  TaskPriority,
} from '../types/pipeline';
import {
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  Flame,
  Shield,
  FileCode2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface TaskQueueDrawerProps {
  tasks: PipelineTask[];
  onSelectTask: (task: PipelineTask) => void;
  onViewArtifacts: (task: PipelineTask) => void;
}

export const TaskQueueDrawer: React.FC<TaskQueueDrawerProps> = ({
  tasks,
  onSelectTask,
  onViewArtifacts,
}) => {
  const runningTasks = tasks.filter((t) => t.status === 'running');
  const queuedTasks = tasks.filter((t) => t.status === 'queued');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const failedTasks = tasks.filter((t) => t.status === 'failed');

  const renderLaneBadge = (lane: TaskLane) => {
    switch (lane) {
      case 'express':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 border border-amber-600 text-amber-300 font-bold">
            <Zap className="w-3 h-3" /> Express
          </span>
        );
      case 'urgent':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 border border-rose-600 text-rose-300 font-bold">
            <Flame className="w-3 h-3" /> Urgente P0
          </span>
        );
      case 'standard':
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 font-semibold">
            <Shield className="w-3 h-3" /> Estándar
          </span>
        );
    }
  };

  const renderPriorityBadge = (priority: TaskPriority) => {
    if (priority === 'P0_URGENT') {
      return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950 text-red-300 font-extrabold border border-red-700">P0</span>;
    }
    if (priority === 'P1_HIGH') {
      return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-950 text-orange-300 font-bold border border-orange-700">P1</span>;
    }
    return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">P2</span>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Resumen Superior */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-500 uppercase text-[10px] block">En Ejecución Activa</span>
            <span className="text-2xl font-bold text-cyan-400">{runningTasks.length}</span>
          </div>
          <Activity className="w-6 h-6 text-cyan-400 animate-pulse" />
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-500 uppercase text-[10px] block">En Cola / Pendientes</span>
            <span className="text-2xl font-bold text-slate-300">{queuedTasks.length}</span>
          </div>
          <Clock className="w-6 h-6 text-slate-400" />
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-500 uppercase text-[10px] block">Completadas con Éxito</span>
            <span className="text-2xl font-bold text-emerald-400">{completedTasks.length}</span>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-500 uppercase text-[10px] block">Fallas / Interrumpidas</span>
            <span className="text-2xl font-bold text-rose-400">{failedTasks.length}</span>
          </div>
          <AlertCircle className="w-6 h-6 text-rose-400" />
        </div>
      </div>

      {/* Lista de Tareas Detallada */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <h3 className="text-sm font-bold font-mono text-slate-200">
            Registro de Tareas en la Factoría ({tasks.length})
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Orquestación en tiempo real
          </span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {tasks.map((task) => {
            const isRunning = task.status === 'running';
            const isCompleted = task.status === 'completed';

            return (
              <div
                key={task.id}
                className="p-5 hover:bg-slate-800/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Columna Izquierda: Información de Tarea */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {renderPriorityBadge(task.priority)}
                    {renderLaneBadge(task.lane)}
                    <span className="text-xs font-mono font-bold text-cyan-300">
                      {task.id}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        isRunning
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-600 animate-pulse'
                          : isCompleted
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white">{task.title}</h4>
                  <p className="text-xs text-slate-400">{task.description}</p>

                  {/* Barra de Progreso y Nodo Actual */}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-48 bg-slate-950 rounded-full h-2 border border-slate-700 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isCompleted ? 'bg-emerald-500' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {task.progress}%
                    </span>
                    {task.currentNodeId && (
                      <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                        📍 {task.currentNodeId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Columna Derecha: Métricas y Acciones */}
                <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                  <div className="text-right space-y-1">
                    <div className="text-slate-400 text-[11px]">
                      Tokens: <span className="text-indigo-300 font-bold">{task.metrics.totalTokens.toLocaleString()}</span>
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Duración: <span className="text-slate-200">{(task.metrics.durationMs / 1000).toFixed(1)}s</span>
                    </div>
                  </div>

                  {task.artifacts.length > 0 && (
                    <button
                      onClick={() => onViewArtifacts(task)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-700/80 text-emerald-300 hover:bg-emerald-900 transition font-bold"
                    >
                      <FileCode2 className="w-3.5 h-3.5" />
                      <span>{task.artifacts.length} Artefactos</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
