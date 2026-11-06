/**
 * AgentOS - Componente de Búsqueda Global (Global Search Modal)
 * Permite a los desarrolladores buscar instantáneamente nodos del grafo, tareas activas
 * o registros recientes de auditoría y actividad por palabra clave con navegación directa.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Cpu,
  ListTree,
  Terminal,
  ArrowRight,
  Sparkles,
  Layers,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import {
  PipelineNode,
  PipelineTask,
  ActivityLogEntry,
  NodeLayer,
} from '../types/pipeline';

interface GlobalSearchModalProps {
  nodes: PipelineNode[];
  tasks: PipelineTask[];
  logs: ActivityLogEntry[];
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (node: PipelineNode) => void;
  onSelectTask: (task: PipelineTask) => void;
}

export type SearchCategoryFilter = 'all' | 'nodes' | 'tasks' | 'logs';

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  nodes,
  tasks,
  logs,
  isOpen,
  onClose,
  onSelectNode,
  onSelectTask,
}) => {
  if (!isOpen) return null;

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategoryFilter>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Manejo de atajo ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Resultados de búsqueda ponderados y filtrados
  const searchResults = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    // 1. Nodos
    const matchedNodes = nodes.filter((n) => {
      if (category !== 'all' && category !== 'nodes') return false;
      if (!cleanQuery) return true;
      return (
        n.name.toLowerCase().includes(cleanQuery) ||
        n.id.toLowerCase().includes(cleanQuery) ||
        (n.subtitle && n.subtitle.toLowerCase().includes(cleanQuery)) ||
        (n.description && n.description.toLowerCase().includes(cleanQuery)) ||
        (n.role && n.role.toLowerCase().includes(cleanQuery)) ||
        (n.config.model && n.config.model.toLowerCase().includes(cleanQuery))
      );
    });

    // 2. Tareas
    const matchedTasks = tasks.filter((t) => {
      if (category !== 'all' && category !== 'tasks') return false;
      if (!cleanQuery) return true;
      return (
        t.title.toLowerCase().includes(cleanQuery) ||
        t.id.toLowerCase().includes(cleanQuery) ||
        t.lane.toLowerCase().includes(cleanQuery) ||
        t.priority.toLowerCase().includes(cleanQuery) ||
        (t.description && t.description.toLowerCase().includes(cleanQuery))
      );
    });

    // 3. Logs de actividad recientes
    const matchedLogs = logs.filter((l) => {
      if (category !== 'all' && category !== 'logs') return false;
      if (!cleanQuery) return true;
      return (
        l.message.toLowerCase().includes(cleanQuery) ||
        l.source.toLowerCase().includes(cleanQuery) ||
        l.level.toLowerCase().includes(cleanQuery) ||
        (l.taskId && l.taskId.toLowerCase().includes(cleanQuery))
      );
    });

    return {
      nodes: matchedNodes,
      tasks: matchedTasks,
      logs: matchedLogs.slice(0, 15), // Máximo 15 logs para rendimiento
      totalCount: matchedNodes.length + matchedTasks.length + matchedLogs.length,
    };
  }, [query, category, nodes, tasks, logs]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150 font-mono text-xs">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Barra de Entrada de Búsqueda */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center gap-3">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            data-testid="global-search-input"
            type="text"
            placeholder="Buscar nodos, tareas o logs... (ej: 'Brain', 'Builder', 'P0', 'RFC', 'Docker')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-slate-500 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-400 font-mono">
            ESC
          </kbd>
        </div>

        {/* Filtros de Categoría */}
        <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between text-[11px] gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-cyan-400" /> Filtrar:
            </span>
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'nodes', label: `Nodos (${searchResults.nodes.length})` },
                { id: 'tasks', label: `Tareas (${searchResults.tasks.length})` },
                { id: 'logs', label: `Logs (${searchResults.logs.length})` },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                  category === cat.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-950/60 border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <span className="text-[10px] text-slate-500 whitespace-nowrap">
            {searchResults.totalCount} resultados encontrados
          </span>
        </div>

        {/* Lista de Resultados con Scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950">
          {searchResults.totalCount === 0 ? (
            <div className="p-8 text-center text-slate-500 italic space-y-1">
              <Search className="w-8 h-8 mx-auto text-slate-700" />
              <p className="font-bold text-xs text-slate-400">Sin coincidencias para "{query}"</p>
              <p className="text-[11px]">Intenta buscar por nombre de agente, capa, ID de tarea o evento.</p>
            </div>
          ) : (
            <>
              {/* Sección 1: Nodos del Grafo */}
              {searchResults.nodes.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10.5px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Nodos de Agentes ({searchResults.nodes.length}):</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {searchResults.nodes.map((node) => (
                      <div
                        key={node.id}
                        data-testid={`search-result-node-${node.id}`}
                        onClick={() => {
                          onSelectNode(node);
                          onClose();
                        }}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-900/90 transition cursor-pointer flex flex-col justify-between gap-1 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs group-hover:text-cyan-300 transition">
                            {node.name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 text-[9.5px]">
                            Capa {node.layer}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1 font-sans">
                          {node.subtitle || node.description}
                        </p>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[9.5px] text-slate-500">
                          <span className="truncate text-cyan-400">{node.config.model || 'Heurístico'}</span>
                          <span className="uppercase font-bold text-emerald-400">{node.operationalState}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sección 2: Tareas del Pipeline */}
              {searchResults.tasks.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[10.5px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ListTree className="w-3.5 h-3.5" />
                    <span>Tareas del Pipeline ({searchResults.tasks.length}):</span>
                  </span>
                  <div className="space-y-1.5">
                    {searchResults.tasks.map((task) => (
                      <div
                        key={task.id}
                        data-testid={`search-result-task-${task.id}`}
                        onClick={() => {
                          onSelectTask(task);
                          onClose();
                        }}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/60 transition cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="truncate space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs group-hover:text-indigo-300 transition truncate">
                              {task.title}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-950 text-slate-400 border border-slate-800">
                              {task.id}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate font-sans">
                            {task.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-950 border border-slate-800 text-slate-300">
                            {task.lane}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              task.status === 'completed'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : task.status === 'running'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {task.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sección 3: Logs Recientes */}
              {searchResults.logs.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[10.5px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Registro de Actividad & Auditoría ({searchResults.logs.length}):</span>
                  </span>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 max-h-48 overflow-y-auto">
                    {searchResults.logs.map((log) => (
                      <div
                        key={log.id}
                        className="text-[10.5px] text-slate-300 flex items-start gap-2 py-1 border-b border-slate-800/40 last:border-none"
                      >
                        <span className="text-slate-500 shrink-0 text-[10px]">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span
                          className={`font-bold shrink-0 text-[10px] uppercase ${
                            log.level === 'error'
                              ? 'text-rose-400'
                              : log.level === 'warn'
                              ? 'text-amber-400'
                              : log.level === 'success'
                              ? 'text-emerald-400'
                              : 'text-cyan-400'
                          }`}
                        >
                          [{log.source}]
                        </span>
                        <span className="text-slate-300 break-words">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-slate-500 text-[11px]">
          <span>Tip: Presiona Enter o haz clic en cualquier resultado para saltar directamente a él.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
