/**
 * AgentOS - Sistema de Control de Versiones para Agentes (Agent VCS)
 * Permite guardar snapshots, ramificar (branching), comparar diffs y revertir a versiones previas.
 */

import React, { useState } from 'react';
import {
  PipelineNode,
  AgentCommit,
  AgentBranch,
} from '../types/pipeline';
import {
  createAgentCommit,
  revertNodesToCommit,
  computeCommitDiff,
} from '../pipeline/vcs';
import {
  GitBranch,
  GitCommit,
  RotateCcw,
  Plus,
  Tag,
  CheckCircle2,
  Clock,
  ArrowRight,
  GitCompare,
  Sliders,
  User,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

interface VersionControlDrawerProps {
  nodes: PipelineNode[];
  branches: AgentBranch[];
  commits: AgentCommit[];
  currentBranch: string;
  onSelectBranch: (branch: string) => void;
  onCreateBranch: (branchName: string) => void;
  onCreateCommit: (commit: AgentCommit) => void;
  onRevertCommit: (commit: AgentCommit) => void;
}

export const VersionControlDrawer: React.FC<VersionControlDrawerProps> = ({
  nodes,
  branches,
  commits,
  currentBranch,
  onSelectBranch,
  onCreateBranch,
  onCreateCommit,
  onRevertCommit,
}) => {
  const [isCreatingCommit, setIsCreatingCommit] = useState(false);
  const [newCommitMessage, setNewCommitMessage] = useState('');
  const [newCommitTag, setNewCommitTag] = useState('');
  const [newBranchInput, setNewBranchInput] = useState('');
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [selectedCommitForDiff, setSelectedCommitForDiff] = useState<AgentCommit | null>(null);

  const handleSaveCommit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommitMessage.trim()) return;

    const commit = createAgentCommit({
      message: newCommitMessage.trim(),
      author: 'Ignacio <ignacio@agentos.internal>',
      branch: currentBranch,
      tag: newCommitTag.trim() || undefined,
      currentNodes: nodes,
      previousCommit: commits[0],
    });

    onCreateCommit(commit);
    setNewCommitMessage('');
    setNewCommitTag('');
    setIsCreatingCommit(false);
  };

  const handleCreateBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchInput.trim()) return;
    onCreateBranch(newBranchInput.trim());
    setNewBranchInput('');
    setIsCreatingBranch(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs font-mono">
      {/* Barra de Encabezado y Selector de Ramas */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-950/80 border border-indigo-700 text-indigo-400">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                Control de Versiones de Agentes (Agent VCS)
              </h2>
              <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 font-bold text-[10px]">
                {commits.length} commits
              </span>
            </div>
            <p className="text-slate-400 font-sans text-xs mt-0.5">
              Guarda snapshots de prompts, modelos y políticas. Revierte con 1-click o crea ramas para experimentos.
            </p>
          </div>
        </div>

        {/* Acciones de Rama y Commit */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Selector de Rama */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-700">
            <GitBranch className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={currentBranch}
              onChange={(e) => onSelectBranch(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.name} value={b.name} className="bg-slate-900 text-white">
                  {b.name} {b.isDefault ? '(default)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsCreatingBranch(!isCreatingBranch)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Nueva Rama
          </button>

          <button
            onClick={() => setIsCreatingCommit(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-lg shadow-indigo-600/20"
          >
            <GitCommit className="w-3.5 h-3.5" /> Guardar Snapshot
          </button>
        </div>
      </div>

      {/* Formulario de Nueva Rama */}
      {isCreatingBranch && (
        <form
          onSubmit={handleCreateBranchSubmit}
          className="p-4 rounded-xl bg-slate-950 border border-slate-700 flex items-center gap-3 animate-in fade-in duration-100"
        >
          <GitBranch className="w-4 h-4 text-indigo-400" />
          <input
            type="text"
            required
            placeholder="Nombre de la nueva rama (ej: experiment/gemini-2.5-pro-spike)..."
            value={newBranchInput}
            onChange={(e) => setNewBranchInput(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition"
          >
            Crear Rama
          </button>
          <button
            type="button"
            onClick={() => setIsCreatingBranch(false)}
            className="px-3 py-1.5 rounded bg-slate-800 text-slate-400 hover:text-white transition"
          >
            Cancelar
          </button>
        </form>
      )}

      {/* Modal/Formulario de Nuevo Commit */}
      {isCreatingCommit && (
        <div className="p-5 rounded-xl bg-slate-900 border border-indigo-500/60 shadow-xl space-y-4 animate-in fade-in duration-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-indigo-400" /> Crear Snapshot de Agentes en [{currentBranch}]
            </span>
            <button
              onClick={() => setIsCreatingCommit(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSaveCommit} className="space-y-3">
            <div>
              <label className="block text-[11px] text-slate-300 font-bold mb-1">
                Mensaje de Commit *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Migración de Builder a Opus / Gemini Pro con timeout de 5000ms"
                value={newCommitMessage}
                onChange={(e) => setNewCommitMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 font-bold mb-1">
                Etiqueta / Tag de Versión (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: v2.1.0-canary"
                value={newCommitTag}
                onChange={(e) => setNewCommitTag(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-[11px]">
              ℹ️ Se guardará el estado y configuración completa de los 25 agentes (modelos, temperaturas, reintentos y políticas).
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingCommit(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                Confirmar y Guardar Commit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Historial de Commits / Snapshots */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="font-bold text-slate-200">
            Historial de Snapshots y Versiones Guardadas
          </span>
          <span className="text-slate-400 text-[11px]">
            Rama activa: <strong className="text-indigo-400">{currentBranch}</strong>
          </span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {commits.map((commit, index) => {
            const isLatest = index === 0;

            return (
              <div
                key={commit.hash}
                className="p-5 hover:bg-slate-800/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-800 px-2 py-0.5 rounded text-[11px]">
                      #{commit.hash}
                    </span>
                    {commit.tag && (
                      <span className="flex items-center gap-1 font-mono font-bold text-purple-300 bg-purple-950/70 border border-purple-800 px-2 py-0.5 rounded text-[10px]">
                        <Tag className="w-3 h-3" /> {commit.tag}
                      </span>
                    )}
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <GitBranch className="w-3 h-3 text-indigo-400" /> {commit.branch}
                    </span>
                    {isLatest && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                        HEAD ACTIVO
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white font-sans">{commit.message}</h4>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {commit.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(commit.timestamp).toLocaleString()}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {commit.changesSummary.description}
                    </span>
                  </div>
                </div>

                {/* Botones de Acción: Revertir y Comparar Diff */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSelectedCommitForDiff(commit)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  >
                    <GitCompare className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Ver Diff</span>
                  </button>

                  <button
                    onClick={() => onRevertCommit(commit)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-300 hover:bg-rose-900 transition font-bold"
                    title="Restaurar toda la configuración de agentes a este commit"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Revertir a esta versión</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Inspección de Diff de Commit */}
      {selectedCommitForDiff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-100">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  Diff del Snapshot #{selectedCommitForDiff.hash} vs Estado Actual
                </h3>
              </div>
              <button
                onClick={() => setSelectedCommitForDiff(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 space-y-1">
                <div className="text-xs font-bold text-white">{selectedCommitForDiff.message}</div>
                <div className="text-[11px] text-slate-400">
                  Rama: {selectedCommitForDiff.branch} • Autor: {selectedCommitForDiff.author}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Configuración de Agentes en este Commit ({selectedCommitForDiff.nodesSnapshot.length}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedCommitForDiff.nodesSnapshot.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-200">
                        <span className="truncate">{snap.name}</span>
                        <span className="text-[10px] text-cyan-400">{snap.model || 'Heurístico'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Modo Estricto: {snap.strictMode ? 'Activado' : 'Estándar'} • Reintentos: {snap.maxRetries || 3}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <button
                onClick={() => {
                  onRevertCommit(selectedCommitForDiff);
                  setSelectedCommitForDiff(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Revertir Grafo a esta Versión
              </button>
              <button
                onClick={() => setSelectedCommitForDiff(null)}
                className="px-4 py-1.5 rounded bg-slate-800 text-slate-300 hover:text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
