/**
 * AgentOS - Vista de Dependencias de Tareas (Task Dependencies Graph View)
 * Permite visualizar el flujo DAG de tareas secuenciales y paralelas entre agentes,
 * identificar tareas bloqueadas ('blocks'), habilitadas ('enables'), en ejecución paralela
 * y analizar el Camino Crítico (Critical Path) de la factoría.
 */

import React, { useState, useMemo } from 'react';
import {
  GitMerge,
  Lock,
  Unlock,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Zap,
  Layers,
  Cpu,
  Sparkles,
  Info,
  RotateCcw,
} from 'lucide-react';
import { PipelineTask, PipelineNode, WorkflowTaskNode, DependencyType } from '../types/pipeline';
import {
  buildTaskDependencyGraph,
  advanceDependencyTask,
  DEFAULT_WORKFLOW_TASKS,
} from '../pipeline/taskDependencies';

interface TaskDependencyGraphViewProps {
  tasks: PipelineTask[];
  nodes: PipelineNode[];
}

export const TaskDependencyGraphView: React.FC<TaskDependencyGraphViewProps> = ({
  tasks,
  nodes,
}) => {
  const [workflowTasks, setWorkflowTasks] = useState<WorkflowTaskNode[]>(DEFAULT_WORKFLOW_TASKS);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('wf-task-6');
  const [filterLayer, setFilterLayer] = useState<number | 'all'>('all');
  const [onlyCriticalPath, setOnlyCriticalPath] = useState<boolean>(false);

  // Computar el grafo y estadísticas
  const graphData = useMemo(() => {
    return buildTaskDependencyGraph(tasks, nodes, workflowTasks);
  }, [tasks, nodes, workflowTasks]);

  const selectedTask = useMemo(() => {
    return graphData.tasks.find((t) => t.id === selectedTaskId) || graphData.tasks[0];
  }, [graphData.tasks, selectedTaskId]);

  // Tareas filtradas para la visualización del DAG
  const displayedTasks = useMemo(() => {
    return graphData.tasks.filter((t) => {
      if (onlyCriticalPath && !t.criticalPath) return false;
      if (filterLayer !== 'all' && t.layer !== filterLayer) return false;
      return true;
    });
  }, [graphData.tasks, onlyCriticalPath, filterLayer]);

  // Agrupar tareas por Capa (Columna del flujo)
  const layerGroups = useMemo(() => {
    const groups: Record<number, WorkflowTaskNode[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    displayedTasks.forEach((t) => {
      if (groups[t.layer]) groups[t.layer].push(t);
    });
    return groups;
  }, [displayedTasks]);

  // Manejador para avanzar el estado de una tarea interactiva
  const handleAdvanceTask = (taskId: string) => {
    setWorkflowTasks((prev) => advanceDependencyTask(prev, taskId));
  };

  const handleResetWorkflow = () => {
    setWorkflowTasks(DEFAULT_WORKFLOW_TASKS);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950 text-slate-100 overflow-hidden font-mono">
      {/* Top HUD de Resumen de Dependencias y Capacidad de Paralelización */}
      <div className="bg-slate-900 border-b border-slate-800 px-5 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <GitMerge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">
                Grafo de Dependencias de Tareas (DAG Workflow)
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                CAMINO CRÍTICO: {(graphData.criticalPathLengthMs / 1000).toFixed(1)}s
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Visualiza bloqueos entre agentes, tareas habilitadas y ramas de ejecución concurrente.
            </p>
          </div>
        </div>

        {/* Métricas Rápidas de Estados de Dependencia */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
            <span className="text-slate-400 text-[11px]">Bloqueadas:</span>
            <strong className="text-amber-400 font-bold">{graphData.blockedTasksCount}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span className="text-slate-400 text-[11px]">Listas (Ready):</span>
            <strong className="text-cyan-300 font-bold">{graphData.readyTasksCount}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span className="text-slate-400 text-[11px]">En Ejecución:</span>
            <strong className="text-amber-300 font-bold">{graphData.runningTasksCount}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-400 text-[11px]">Completadas:</span>
            <strong className="text-emerald-300 font-bold">{graphData.completedTasksCount}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-purple-950/60 border border-purple-800/60 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-purple-300 text-[11px]">Paralelismo Activo:</span>
            <strong className="text-purple-200 font-bold">{graphData.parallelCapacityUtilization}%</strong>
          </div>
        </div>

        {/* Controles de Filtro & Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnlyCriticalPath(!onlyCriticalPath)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
              onlyCriticalPath
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {onlyCriticalPath ? '★ Solo Camino Crítico' : 'Todas las Tareas'}
          </button>
          <button
            onClick={handleResetWorkflow}
            title="Reinicializar estados del workflow"
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white cursor-pointer transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cuerpo Principal: Matriz DAG de 5 Capas + Inspector de Dependencias */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Panel Izquierdo: Visualizador de Columnas por Capa con Flujo de Dependencias */}
        <div className="flex-1 p-5 overflow-auto flex flex-col space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Flujo de Tareas por Capas de Arquitectura (01 → 05):</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">Filtrar Capa:</span>
              <div className="flex items-center gap-1">
                {(['all', 1, 2, 3, 4, 5] as const).map((l) => (
                  <button
                    key={String(l)}
                    onClick={() => setFilterLayer(l)}
                    className={`px-2 py-0.5 rounded text-[10px] border transition cursor-pointer ${
                      filterLayer === l
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {l === 'all' ? 'Todas' : `C${l}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grid de 5 Columnas (Capa 1 a 5) */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 min-w-[900px] flex-1">
            {[1, 2, 3, 4, 5].map((layerNum) => {
              const layerTasks = layerGroups[layerNum] || [];
              const layerNames: Record<number, string> = {
                1: 'C1 • Memoria / Seg.',
                2: 'C2 • Exploración & UX',
                3: 'C3 • Spec & Builder',
                4: 'C4 • Verif. & Approver',
                5: 'C5 • Labs & Deploy',
              };

              return (
                <div
                  key={layerNum}
                  className="rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col p-3 space-y-2.5 min-h-[480px]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-[11px] font-bold text-slate-300">
                      {layerNames[layerNum]}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 text-[9.5px]">
                      {layerTasks.length}
                    </span>
                  </div>

                  {layerTasks.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-slate-600 text-[11px] italic">
                      Sin tareas activas
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-2.5 flex-1 overflow-y-auto pr-1">
                      {layerTasks.map((task) => {
                        const isSelected = selectedTaskId === task.id;
                        const isBlocked = task.state === 'blocked';
                        const isReady = task.state === 'ready';
                        const isRunning = task.state === 'running';
                        const isCompleted = task.state === 'completed';

                        return (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTaskId(task.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                              isSelected
                                ? 'bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400/50 shadow-md shadow-cyan-950/50'
                                : isBlocked
                                ? 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                                : isRunning
                                ? 'bg-amber-950/20 border-amber-500/60 hover:border-amber-400 shadow-sm'
                                : isReady
                                ? 'bg-cyan-950/20 border-cyan-500/40 hover:border-cyan-400'
                                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            {/* Badges superiores: Estado y Camino Crítico */}
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase flex items-center gap-1 ${
                                    isCompleted
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : isRunning
                                      ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                                      : isReady
                                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                                  }`}
                                >
                                  {isCompleted && <CheckCircle2 className="w-2.5 h-2.5" />}
                                  {isRunning && <Play className="w-2.5 h-2.5 fill-current" />}
                                  {isReady && <Unlock className="w-2.5 h-2.5" />}
                                  {isBlocked && <Lock className="w-2.5 h-2.5" />}
                                  <span>{task.state}</span>
                                </span>

                                {task.criticalPath && (
                                  <span className="px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[8.5px] font-bold">
                                    ★ CRÍTICO
                                  </span>
                                )}
                              </div>

                              <span className="text-[10px] text-slate-400 font-bold">
                                {(task.durationMs / 1000).toFixed(1)}s
                              </span>
                            </div>

                            {/* Título de la tarea */}
                            <h4 className="text-xs font-semibold text-white leading-tight mb-2 line-clamp-2">
                              {task.title}
                            </h4>

                            {/* Agente asignado y grupo paralelo */}
                            <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60 mt-1">
                              <span className="truncate text-cyan-300 font-medium">
                                {task.agentNodeName}
                              </span>
                              {task.parallelGroup && (
                                <span className="text-[8.5px] px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 truncate">
                                  ⚡ Paralelo
                                </span>
                              )}
                            </div>

                            {/* Barra de Progreso */}
                            <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-800">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isCompleted
                                    ? 'bg-emerald-400'
                                    : isRunning
                                    ? 'bg-amber-400'
                                    : 'bg-slate-700'
                                }`}
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>

                            {/* Botón de acción interactiva si está Ready o Running */}
                            {(isReady || isRunning) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAdvanceTask(task.id);
                                }}
                                className={`mt-2 w-full py-1 rounded text-[10px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                  isReady
                                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                                }`}
                              >
                                {isReady ? (
                                  <>
                                    <Play className="w-2.5 h-2.5 fill-current" />
                                    <span>Iniciar Ejecución</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    <span>Completar & Liberar Bloqueos</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Leyenda de Dependencias y Tipos de Enlace */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-white font-bold">Relaciones de Enlace:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-500"></span>
                <span>Bloquea (Blocks): Requiere que la tarea anterior termine al 100%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-cyan-400"></span>
                <span>Habilita (Enables): Pasa contexto o tokens necesarios</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-purple-400"></span>
                <span>Paralelo (Parallel): Mismo grupo sin dependencias mutuas</span>
              </div>
            </div>
            <span className="text-slate-500 text-[10px]">
              Tip: Haz clic en cualquier tarea para inspeccionar sus dependencias directas e indirectas.
            </span>
          </div>
        </div>

        {/* Panel Derecho: Inspector Detallado de Dependencias de la Tarea Seleccionada */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/90 p-5 flex flex-col space-y-4 overflow-y-auto shrink-0">
          <div className="border-b border-slate-800 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">
                Inspector de Tarea
              </span>
              <span className="text-xs text-slate-400">{selectedTask.id}</span>
            </div>
            <h3 className="text-sm font-bold text-white mt-1 leading-snug">
              {selectedTask.title}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Agente Responsable: <strong className="text-cyan-300">{selectedTask.agentNodeName}</strong>
            </p>
          </div>

          {/* Estado de la tarea y Métricas */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Estado Actual:</span>
              <span className="font-bold text-white uppercase text-[11px]">{selectedTask.state}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Camino Crítico:</span>
              <span className={`font-bold text-[11px] ${selectedTask.criticalPath ? 'text-amber-300' : 'text-slate-400'}`}>
                {selectedTask.criticalPath ? '★ Sí (Cuello Potencial)' : 'No (Paralelo)'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Latencia Estimada:</span>
              <span className="font-bold text-slate-200">{(selectedTask.durationMs / 1000).toFixed(2)}s</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Tokens Insumidos:</span>
              <span className="font-bold text-purple-300">{selectedTask.tokens.toLocaleString()}</span>
            </div>
          </div>

          {/* Dependencias Upstream: "Depende de (Requiere para desbloquearse)" */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>Depende de ({selectedTask.dependsOn.length}):</span>
              </span>
              <span className="text-[10px] text-slate-500">Upstream (Precedentes)</span>
            </div>

            {selectedTask.dependsOn.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-500 italic">
                ✓ No tiene dependencias anteriores (Tarea raíz / Disparador del pipeline).
              </div>
            ) : (
              <div className="space-y-1.5">
                {selectedTask.dependsOn.map((depId) => {
                  const parentTask = graphData.tasks.find((t) => t.id === depId);
                  const isDone = parentTask?.state === 'completed';

                  return (
                    <div
                      key={depId}
                      onClick={() => setSelectedTaskId(depId)}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isDone ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span className="text-white truncate font-medium">{parentTask?.title || depId}</span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase shrink-0 ${isDone ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {parentTask?.state}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dependencias Downstream: "Bloquea a (Esperando esta tarea)" */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                <span>Bloquea a ({selectedTask.blocks.length}):</span>
              </span>
              <span className="text-[10px] text-slate-500">Downstream (Sucesores)</span>
            </div>

            {selectedTask.blocks.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-500 italic">
                ✓ Tarea terminal (No bloquea más agentes en el flujo).
              </div>
            ) : (
              <div className="space-y-1.5">
                {selectedTask.blocks.map((blockId) => {
                  const childTask = graphData.tasks.find((t) => t.id === blockId);

                  return (
                    <div
                      key={blockId}
                      onClick={() => setSelectedTaskId(blockId)}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                        <span className="text-white truncate font-medium">{childTask?.title || blockId}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase shrink-0">
                        {childTask?.state}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Botón de Acción Rápida para la Tarea Seleccionada */}
          <div className="pt-2 border-t border-slate-800">
            {selectedTask.state === 'ready' && (
              <button
                onClick={() => handleAdvanceTask(selectedTask.id)}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Lanzar Tarea & Habilitar Paralelismo</span>
              </button>
            )}
            {selectedTask.state === 'running' && (
              <button
                onClick={() => handleAdvanceTask(selectedTask.id)}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Completar Tarea & Desbloquear Sucesores</span>
              </button>
            )}
            {selectedTask.state === 'blocked' && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-[11px] text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  Esta tarea se encuentra bloqueada por dependencias anteriores inconclusas. Completa las tareas upstream para desbloquearla.
                </span>
              </div>
            )}
            {selectedTask.state === 'completed' && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-[11px] text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Tarea completada exitosamente. Todas sus dependencias downstream han sido habilitadas.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
