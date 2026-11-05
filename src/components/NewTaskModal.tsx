/**
 * AgentOS - Modal de Creación de Nuevas Tareas Agénticas
 */

import React, { useState } from 'react';
import { TaskPriority, TaskLane } from '../types/pipeline';
import {
  X,
  PlusCircle,
  Zap,
  Flame,
  Shield,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (task: {
    title: string;
    description: string;
    priority: TaskPriority;
    lane: TaskLane;
  }) => void;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  onCreateTask,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('P1_HIGH');
  const [lane, setLane] = useState<TaskLane>('standard');

  const templates = [
    {
      title: 'OAuth2 Token Vault & Coherencia AST',
      description: 'Implementar almacenamiento seguro de tokens con rotación atómica y validación estricta.',
      priority: 'P1_HIGH' as TaskPriority,
      lane: 'standard' as TaskLane,
      badge: 'Estándar',
      icon: <Shield className="w-3.5 h-3.5 text-cyan-400" />,
    },
    {
      title: 'P0 Urgent: Buffer Leak en Pool de Conexiones',
      description: 'Parche de emergencia directo vía Ignacio SSH hacia Producción con bypass de pruebas.',
      priority: 'P0_URGENT' as TaskPriority,
      lane: 'urgent' as TaskLane,
      badge: 'Urgente P0',
      icon: <Flame className="w-3.5 h-3.5 text-rose-400" />,
    },
    {
      title: 'Exprés: Actualización de Esquema OpenAPI & Sanitizer',
      description: 'Ajuste rápido en spec y validador de entrada sin overhead de modelos pesados.',
      priority: 'P2_NORMAL' as TaskPriority,
      lane: 'express' as TaskLane,
      badge: 'Carril Exprés',
      icon: <Zap className="w-3.5 h-3.5 text-amber-400" />,
    },
    {
      title: 'Benchmark Lab: Paralelización del Parser Tree-sitter',
      description: 'Optimización algorítmica y evaluación de carga SWE-bench sobre 100k líneas.',
      priority: 'P1_HIGH' as TaskPriority,
      lane: 'standard' as TaskLane,
      badge: 'Benchmark',
      icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
    },
  ];

  const handleSelectTemplate = (t: (typeof templates)[0]) => {
    setTitle(t.title);
    setDescription(t.description);
    setPriority(t.priority);
    setLane(t.lane);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreateTask({
      title: title.trim(),
      description: description.trim() || 'Sin descripción detallada.',
      priority,
      lane,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/70 border border-cyan-700 text-cyan-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-white">
                Inyectar Nueva Tarea en el Pipeline
              </h3>
              <p className="text-xs text-slate-400">
                Selecciona una plantilla o redacta un requerimiento personalizado
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
          {/* Plantillas Rápidas */}
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-2 font-bold">
              Plantillas 1-Click:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {templates.map((tpl) => (
                <button
                  type="button"
                  key={tpl.title}
                  onClick={() => handleSelectTemplate(tpl)}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-800/50 transition text-left space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-slate-200 text-[11px]">
                      {tpl.icon} {tpl.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{tpl.title}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Formulario */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-[11px] text-slate-300 font-bold mb-1">
                Título del Requerimiento *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Implementar caché distribuida Redis en TokenVault"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 font-bold mb-1">
                Descripción / Prompt de Contexto
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Especificaciones, invariantes de seguridad o restricciones técnicas..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-300 font-bold mb-1">
                  Prioridad
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="P0_URGENT">P0 - Emergencia Crítica</option>
                  <option value="P1_HIGH">P1 - Alta Prioridad</option>
                  <option value="P2_NORMAL">P2 - Normal</option>
                  <option value="P3_LOW">P3 - Baja</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-bold mb-1">
                  Carril de Ejecución
                </label>
                <select
                  value={lane}
                  onChange={(e) => setLane(e.target.value as TaskLane)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="standard">Estándar (Todo el Grafo)</option>
                  <option value="express">Carril Exprés (Parche Rápido)</option>
                  <option value="urgent">Carril Urgencia (Ignacio SSH Bypass)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer Botones */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition shadow-lg shadow-cyan-500/20"
            >
              <span>Lanzar Tarea al Grafo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
