/**
 * Panel Web Operativo — Factoría Agéntica
 * Regla 1 y 2: La web es únicamente el panel del backend real en Linux (`server.ts` + `src/backend/gitFactory.ts`).
 * Se ha eliminado todo dato que no provenga del backend real (sin p95/p99, sin CPU/RAM, sin AST, sin throughput inventado).
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  GitBranch,
  GitCommit,
  GitMerge,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Plus,
  RefreshCw,
  Trash2,
  FileWarning,
  ShieldAlert,
} from 'lucide-react';
import type {
  FactoryTaskRecord,
  GitRepoStatusSnapshot,
  ElevenPointStatus,
} from './backend/gitFactory';

interface FactoryBackendState {
  repo: GitRepoStatusSnapshot;
  tasks: FactoryTaskRecord[];
  elevenPointsAudit: ElevenPointStatus[];
}

export function App() {
  const [state, setState] = useState<FactoryBackendState | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<{
    type: 'ok' | 'error';
    text: string;
  } | null>(null);

  // Formulario para nuevo encargo
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTargetFile, setNewTargetFile] = useState('');

  const fetchBackendState = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/factory/state');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al consultar /api/factory/state');
      }
      setState(data);
      setSelectedTaskId((prev) => prev || data.tasks[0]?.id || null);
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error de conexión con el backend',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackendState();
  }, [fetchBackendState]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setActionMessage(null);
    try {
      const res = await fetch('/api/factory/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          targetFile: newTargetFile.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo crear el encargo');
      }
      setNewTitle('');
      setNewDescription('');
      setNewTargetFile('');
      await fetchBackendState();
      setSelectedTaskId(data.task.id);
      setActionMessage({
        type: 'ok',
        text: `Encargo ${data.task.id} registrado en el backend.`,
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al crear encargo',
      });
    }
  };

  // Punto 2: Generar Spec en disco
  const handleGenerateSpec = async (taskId: string) => {
    setActionMessage(null);
    try {
      const res = await fetch(`/api/factory/tasks/${encodeURIComponent(taskId)}/spec`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error en Punto 2 (Spec)');
      }
      await fetchBackendState();
      setActionMessage({
        type: 'ok',
        text: `Punto 2 ejecutado: Especificación guardada en disco (${data.task.spec?.specFilePath}).`,
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al generar spec',
      });
    }
  };

  // Punto 3: Construir en rama aislada con Git real
  const handleBuildInBranch = async (taskId: string) => {
    setActionMessage(null);
    try {
      const res = await fetch(`/api/factory/tasks/${encodeURIComponent(taskId)}/build`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error en Punto 3 (Construcción en rama aislada)');
      }
      await fetchBackendState();
      setActionMessage({
        type: 'ok',
        text: `Punto 3 ejecutado: Rama Git real '${data.task.build?.branchName}' creada con commit ${data.task.build?.commitHash}.`,
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al construir en rama aislada',
      });
    }
  };

  // Punto 7: Fusionar en main (se niega si hay cambios sin confirmar)
  const handleMergeToMain = async (taskId: string) => {
    setActionMessage(null);
    try {
      const res = await fetch(`/api/factory/tasks/${encodeURIComponent(taskId)}/merge`, {
        method: 'POST',
      });
      const data = await res.json();
      await fetchBackendState();
      if (!res.ok) {
        setActionMessage({
          type: 'error',
          text: data.error || 'Fusión rechazada por el backend (Punto 7).',
        });
        return;
      }
      setActionMessage({
        type: 'ok',
        text: `Punto 7 ejecutado: Rama '${data.mergeResult.sourceBranch}' fusionada en 'main' (commit ${data.mergeResult.mergeCommitHash}).`,
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al intentar fusionar en main',
      });
    }
  };

  // Crear cambio sin confirmar en el repositorio real para verificar bloqueo del Punto 7
  const handleDirtyWorktree = async () => {
    setActionMessage(null);
    try {
      const res = await fetch('/api/factory/git/dirty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: 'src/cambio_sin_confirmar.ts',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchBackendState();
      setActionMessage({
        type: 'error',
        text: 'Se ha escrito "src/cambio_sin_confirmar.ts" sin confirmar en el repositorio Git real. Si intentas fusionar ahora (Punto 7), el backend se negará.',
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al ensuciar el árbol Git',
      });
    }
  };

  // Limpiar árbol de trabajo Git real
  const handleCleanWorktree = async () => {
    setActionMessage(null);
    try {
      const res = await fetch('/api/factory/git/clean', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchBackendState();
      setActionMessage({
        type: 'ok',
        text: 'Árbol de trabajo Git limpiado (git reset --hard HEAD && git clean -fd).',
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al limpiar el árbol Git',
      });
    }
  };

  const selectedTask =
    state?.tasks.find((t) => t.id === selectedTaskId) || state?.tasks[0] || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono p-4 md:p-6 space-y-6">
      {/* Cabecera Sobria: Solo datos reales del Backend Git en Linux */}
      <header className="border border-slate-800 bg-slate-900/80 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-cyan-400" />
            <span>Panel de Control — Backend Real Git (Puntos 2, 3 y 7)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sin datos inventados: este panel muestra exclusivamente el estado devuelto por{' '}
            <code className="text-cyan-300">/api/factory/state</code> ejecutando{' '}
            <code className="text-cyan-300">git</code> real en Linux.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {state && (
            <>
              <div
                data-testid="real-git-branch-badge"
                className="px-3 py-1.5 rounded bg-slate-950 border border-slate-800"
              >
                <span className="text-slate-400">Rama actual: </span>
                <span className="font-bold text-cyan-300">{state.repo.currentBranch}</span>
                <span className="text-slate-500 ml-2">({state.repo.headCommitHash})</span>
              </div>

              <div
                data-testid="real-git-worktree-badge"
                className={`px-3 py-1.5 rounded border font-bold flex items-center gap-1.5 ${
                  state.repo.isClean
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                    : 'bg-rose-950/80 border-rose-600 text-rose-300'
                }`}
              >
                {state.repo.isClean ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ÁRBOL GIT LIMPIO</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>
                      CAMBIOS SIN CONFIRMAR ({state.repo.uncommittedFiles.length})
                    </span>
                  </>
                )}
              </div>
            </>
          )}

          <button
            onClick={fetchBackendState}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refrescar Git</span>
          </button>
        </div>
      </header>

      {/* Banner de respuesta de la última operación del backend */}
      {actionMessage && (
        <div
          data-testid="backend-action-feedback"
          className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
            actionMessage.type === 'ok'
              ? 'bg-emerald-950/50 border-emerald-700 text-emerald-200'
              : 'bg-rose-950/70 border-rose-600 text-rose-200'
          }`}
        >
          {actionMessage.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="whitespace-pre-wrap">{actionMessage.text}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda (5 cols): Crear Encargo + Lista de Encargos + Estado Real del Repo Git */}
        <div className="lg:col-span-5 space-y-6">
          {/* Crear Nuevo Encargo */}
          <section className="border border-slate-800 bg-slate-900/60 rounded-lg p-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Nuevo Encargo para el Backend</span>
            </h2>
            <form onSubmit={handleCreateTask} className="space-y-2.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Título del encargo *</label>
                <input
                  data-testid="new-task-title-input"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Validar cabecera de autenticación"
                  className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  Archivo objetivo en el repositorio Git
                </label>
                <input
                  data-testid="new-task-file-input"
                  type="text"
                  value={newTargetFile}
                  onChange={(e) => setNewTargetFile(e.target.value)}
                  placeholder="Ej: src/authHeader.ts"
                  className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Descripción</label>
                <textarea
                  data-testid="new-task-desc-input"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="Requisitos verificables que deben quedar en la especificación..."
                  className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                />
              </div>
              <button
                data-testid="create-task-submit-btn"
                type="submit"
                className="w-full py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition cursor-pointer"
              >
                Registrar Encargo
              </button>
            </form>
          </section>

          {/* Lista de Encargos Reales */}
          <section className="border border-slate-800 bg-slate-900/60 rounded-lg p-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Encargos en el Repositorio ({state?.tasks.length || 0})
            </h2>
            <div className="space-y-2">
              {state?.tasks.map((t) => (
                <button
                  key={t.id}
                  data-testid={`task-item-${t.id}`}
                  onClick={() => setSelectedTaskId(t.id)}
                  className={`w-full text-left p-3 rounded border text-xs transition cursor-pointer ${
                    selectedTask?.id === t.id
                      ? 'bg-slate-800/90 border-cyan-500'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-cyan-300">{t.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        t.stage === 'fusionado_en_main'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : t.stage === 'fusion_rechazada_cambios_sin_confirmar'
                          ? 'bg-rose-950 text-rose-300 border border-rose-700'
                          : t.stage === 'construido_en_rama'
                          ? 'bg-sky-950 text-sky-300 border border-sky-700'
                          : t.stage === 'spec_generado'
                          ? 'bg-amber-950 text-amber-300 border border-amber-700'
                          : 'bg-slate-900 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {t.stage}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-100 mt-1">{t.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Archivo: <code>{t.targetFile}</code>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Inspección Directa del Repositorio Git Real */}
          {state && (
            <section className="border border-slate-800 bg-slate-900/60 rounded-lg p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h2 className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <GitCommit className="w-4 h-4 text-emerald-400" />
                  <span>Estado Git Real en Servidor Linux</span>
                </h2>
              </div>

              <div className="text-[11px] text-slate-400 break-all">
                Ruta disco: <code className="text-slate-200">{state.repo.repoPath}</code>
              </div>

              {/* Controles para probar Punto 7 (ensuciar / limpiar árbol de trabajo) */}
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-300">
                  Prueba del Punto 7 (Bloqueo por cambios sin confirmar):
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    data-testid="btn-dirty-worktree"
                    onClick={handleDirtyWorktree}
                    className="px-2.5 py-1.5 rounded bg-amber-950/80 hover:bg-amber-900 border border-amber-700 text-amber-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileWarning className="w-3.5 h-3.5" />
                    <span>Crear cambio sin confirmar</span>
                  </button>
                  <button
                    data-testid="btn-clean-worktree"
                    onClick={handleCleanWorktree}
                    className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpiar árbol Git</span>
                  </button>
                </div>

                {state.repo.uncommittedFiles.length > 0 && (
                  <div
                    data-testid="git-porcelain-output"
                    className="p-2 rounded bg-rose-950/50 border border-rose-800 text-rose-200 text-[11px]"
                  >
                    <div className="font-bold mb-1">Salida real de git status --porcelain:</div>
                    <pre className="whitespace-pre-wrap">{state.repo.gitStatusPorcelain}</pre>
                  </div>
                )}
              </div>

              {/* Ramas reales */}
              <div>
                <div className="text-slate-400 mb-1">Ramas en Git (`git branch`):</div>
                <div className="flex flex-wrap gap-1.5">
                  {state.repo.branches.map((b) => (
                    <span
                      key={b}
                      className={`px-2 py-0.5 rounded text-[11px] border ${
                        b === state.repo.currentBranch
                          ? 'bg-cyan-950 border-cyan-600 text-cyan-200 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              {/* Historial real de commits (`git log`) */}
              <div>
                <div className="text-slate-400 mb-1">Últimos commits reales (`git log`):</div>
                <div className="space-y-1 max-h-48 overflow-y-auto bg-slate-950 p-2 rounded border border-slate-800">
                  {state.repo.recentCommits.map((c) => (
                    <div key={c.hash} className="text-[11px] flex items-start gap-2">
                      <span className="text-amber-400 font-bold shrink-0">{c.hash}</span>
                      <span className="text-slate-200 flex-1">{c.subject}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Columna Derecha (7 cols): Ejecución de Puntos 2, 3 y 7 sobre el encargo + Auditoría de los 11 Puntos */}
        <div className="lg:col-span-7 space-y-6">
          {selectedTask ? (
            <section className="border border-slate-800 bg-slate-900/60 rounded-lg p-4 space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-cyan-400 font-bold">{selectedTask.id}</span>
                  <h2 className="text-base font-bold text-white">{selectedTask.title}</h2>
                  <p className="text-slate-400 mt-0.5">{selectedTask.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Archivo objetivo:</span>
                  <code className="text-emerald-300 font-bold">{selectedTask.targetFile}</code>
                </div>
              </div>

              {/* Botonera de los 3 pasos reales del backend: Punto 2 -> Punto 3 -> Punto 7 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  data-testid="btn-step-2-spec"
                  onClick={() => handleGenerateSpec(selectedTask.id)}
                  className="p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-amber-600/60 text-left transition cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300">1. Punto 2: Spec</span>
                    <FileText className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Genera y escribe <code>specs/{selectedTask.id}.md</code> en disco.
                  </p>
                </button>

                <button
                  data-testid="btn-step-3-build"
                  onClick={() => handleBuildInBranch(selectedTask.id)}
                  className="p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-sky-600/60 text-left transition cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-300">2. Punto 3: Rama Git</span>
                    <GitBranch className="w-4 h-4 text-sky-400" />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Crea rama aislada <code>task/{selectedTask.id}</code> y hace{' '}
                    <code>git commit</code> real.
                  </p>
                </button>

                <button
                  data-testid="btn-step-7-merge"
                  onClick={() => handleMergeToMain(selectedTask.id)}
                  className="p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-emerald-600/60 text-left transition cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300">3. Punto 7: Fusionar</span>
                    <GitMerge className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Fusiona en <code>main</code>. Se niega si hay cambios sin confirmar.
                  </p>
                </button>
              </div>

              {/* Evidencia Real del Punto 2: Especificación en disco */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-amber-300">
                  Artefacto Punto 2 — Especificación ({selectedTask.spec ? selectedTask.spec.specFilePath : 'Aún no generada'})
                </h3>
                {selectedTask.spec ? (
                  <pre
                    data-testid="spec-markdown-viewer"
                    className="p-3 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto"
                  >
                    {selectedTask.spec.markdownContent}
                  </pre>
                ) : (
                  <div className="p-3 rounded bg-slate-950 border border-slate-800 text-slate-500">
                    Pulsa &ldquo;1. Punto 2: Spec&rdquo; para escribir la especificación en disco.
                  </div>
                )}
              </div>

              {/* Evidencia Real del Punto 3: Rama aislada y git diff real */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-sky-300">
                  Artefacto Punto 3 — Construcción en Rama Aislada Git (
                  {selectedTask.build
                    ? `${selectedTask.build.branchName} @ ${selectedTask.build.commitHash}`
                    : 'Aún no construida'}
                  )
                </h3>
                {selectedTask.build ? (
                  <div className="space-y-2">
                    <div className="text-[11px] text-slate-300">
                      Archivos confirmados en rama:{' '}
                      <code>{selectedTask.build.modifiedFiles.join(', ')}</code>
                    </div>
                    <pre
                      data-testid="real-git-diff-viewer"
                      className="p-3 rounded bg-slate-950 border border-slate-800 text-[11px] text-emerald-300 whitespace-pre-wrap max-h-56 overflow-y-auto"
                    >
                      {selectedTask.build.gitDiff}
                    </pre>
                  </div>
                ) : (
                  <div className="p-3 rounded bg-slate-950 border border-slate-800 text-slate-500">
                    Pulsa &ldquo;2. Punto 3: Rama Git&rdquo; tras generar el spec para crear la rama
                    aislada y el commit real.
                  </div>
                )}
              </div>

              {/* Evidencia Real del Punto 7: Resultado del intento de fusión en main */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-emerald-300">
                  Artefacto Punto 7 — Fusión en main local (`cerrar`)
                </h3>
                {selectedTask.lastMergeAttempt ? (
                  <div
                    data-testid="merge-attempt-result"
                    className={`p-3 rounded border text-[11px] space-y-1 ${
                      selectedTask.lastMergeAttempt.merged
                        ? 'bg-emerald-950/40 border-emerald-700 text-emerald-200'
                        : 'bg-rose-950/60 border-rose-600 text-rose-200'
                    }`}
                  >
                    {selectedTask.lastMergeAttempt.merged ? (
                      <>
                        <div className="font-bold">
                          FUSIÓN COMPLETADA EN MAIN (Commit:{' '}
                          {selectedTask.lastMergeAttempt.mergeCommitHash})
                        </div>
                        <div>
                          Rama origen: <code>{selectedTask.lastMergeAttempt.sourceBranch}</code> →{' '}
                          <code>{selectedTask.lastMergeAttempt.targetBranch}</code>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-bold">
                          {selectedTask.lastMergeAttempt.refusalReason}
                        </div>
                        <div>
                          Archivos sin confirmar detectados por{' '}
                          <code>git status --porcelain</code>:{' '}
                          <code>{selectedTask.lastMergeAttempt.uncommittedFiles.join(', ')}</code>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded bg-slate-950 border border-slate-800 text-slate-500">
                    Pulsa &ldquo;3. Punto 7: Fusionar&rdquo; para probar la fusión en{' '}
                    <code>main</code>.
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {/* Tabla de Auditoría Honesta de los 11 Puntos del Encargo (Regla 1 y 6) */}
          {state && (
            <section className="border border-slate-800 bg-slate-900/60 rounded-lg p-4 space-y-3 text-xs">
              <h2 className="font-bold uppercase tracking-wider text-slate-300">
                Estado Real vs Simulado de los 11 Puntos del Encargo (Regla 1)
              </h2>
              <div className="space-y-2">
                {state.elevenPointsAudit.map((item) => (
                  <div
                    key={item.pointNumber}
                    className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-200">
                        Punto {item.pointNumber}: {item.title}
                      </div>
                      <div className="text-[11px] text-slate-400">{item.explanation}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 border ${
                        item.status === 'REAL'
                          ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                          : 'bg-amber-950 border-amber-600 text-amber-300'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
