/**
 * AgentOS - Motor de Simulación y Sandbox de Escenarios
 * Permite configurar condiciones ambientales adversas (latencia, fallos 429, inyecciones, glitches visuales)
 * y evaluar la resiliencia y robustez de los agentes en un entorno seguro y aislado.
 * Incluye 'Agent Chaos Mode' y 'Batch Execution Mode' para stress-testing a escala.
 */

import React, { useState } from 'react';
import {
  SimulationScenario,
  SimulationConditions,
  SimulationResult,
  PipelineNode,
  AgentChaosConfig,
  ChaosFailurePattern,
  BatchScenarioQueueItem,
  BatchSimulationRunSummary,
} from '../types/pipeline';
import {
  PRESET_SIMULATION_SCENARIOS,
  DEFAULT_AGENT_CHAOS_CONFIG,
  CHAOS_PATTERN_METADATA,
  DEFAULT_BATCH_QUEUE_PRESETS,
  runSandboxSimulation,
  runBatchScenarioSimulation,
} from '../pipeline/simulation';
import {
  X,
  Play,
  RotateCcw,
  Sliders,
  ShieldAlert,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Bug,
  Sparkles,
  Server,
  Layers,
  Gauge,
  Shuffle,
  Layers2,
  Plus,
  Trash2,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

interface SimulationEngineModalProps {
  nodes: PipelineNode[];
  isOpen: boolean;
  onClose: () => void;
  onSimulationComplete?: (result: SimulationResult) => void;
}

const CHAOS_TARGET_CANDIDATES = [
  { id: 'builder', label: 'Builder (C3)' },
  { id: 'spec_writer', label: 'Spec Writer (C3)' },
  { id: 'analyze', label: 'Analyze (C3)' },
  { id: 'verificador', label: 'Verificador (C4)' },
  { id: 'seguridad', label: 'Seguridad (C1)' },
  { id: 'ui', label: 'UI (C3)' },
];

export const SimulationEngineModal: React.FC<SimulationEngineModalProps> = ({
  nodes,
  isOpen,
  onClose,
  onSimulationComplete,
}) => {
  if (!isOpen) return null;

  // Modo de ejecución: 'single' (Escenario único) o 'batch' (Lote a escala)
  const [executionMode, setExecutionMode] = useState<'single' | 'batch'>('single');

  // Estado del Escenario Único
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario>(
    PRESET_SIMULATION_SCENARIOS[0]
  );
  const [conditions, setConditions] = useState<SimulationConditions>(
    selectedScenario.conditions
  );
  const [chaosConfig, setChaosConfig] = useState<AgentChaosConfig>(
    DEFAULT_AGENT_CHAOS_CONFIG
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  // Estado del Modo por Lotes (Batch Mode)
  const [batchQueue, setBatchQueue] = useState<BatchScenarioQueueItem[]>(DEFAULT_BATCH_QUEUE_PRESETS);
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);
  const [batchSummary, setBatchSummary] = useState<BatchSimulationRunSummary | null>(null);

  const handleSelectPreset = (scenario: SimulationScenario) => {
    setSelectedScenario(scenario);
    setConditions(scenario.conditions);
    setSimulationResult(null);
  };

  const handleToggleTargetNode = (nodeId: string) => {
    setChaosConfig((prev) => {
      const exists = prev.targetNodeIds.includes(nodeId);
      return {
        ...prev,
        targetNodeIds: exists
          ? prev.targetNodeIds.filter((id) => id !== nodeId)
          : [...prev.targetNodeIds, nodeId],
      };
    });
  };

  const handleRunSimulation = () => {
    setIsRunning(true);
    setSimulationResult(null);

    setTimeout(() => {
      const result = runSandboxSimulation(
        {
          ...selectedScenario,
          conditions,
        },
        nodes,
        chaosConfig
      );
      setSimulationResult(result);
      setIsRunning(false);
      if (onSimulationComplete) {
        onSimulationComplete(result);
      }
    }, 650);
  };

  // Manejadores del Modo por Lotes (Batch Execution)
  const handleUpdateBatchItemConcurrency = (itemId: string, delta: number) => {
    setBatchQueue((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newLevel = Math.max(1, Math.min(20, item.concurrencyLevel + delta));
          return { ...item, concurrencyLevel: newLevel };
        }
        return item;
      })
    );
  };

  const handleUpdateBatchItemLatency = (itemId: string, newLatency: number) => {
    setBatchQueue((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            customOverrides: {
              ...(item.customOverrides || {}),
              networkLatencyMs: newLatency,
            },
          };
        }
        return item;
      })
    );
  };

  const handleRemoveBatchItem = (itemId: string) => {
    setBatchQueue((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleAddBatchPreset = (scenario: SimulationScenario) => {
    const newItem: BatchScenarioQueueItem = {
      id: `batch-${Date.now().toString(36)}`,
      scenarioId: scenario.id,
      scenarioName: `${scenario.name} (Custom)`,
      lane: scenario.lane,
      priority: scenario.priority,
      weight: 1.0,
      concurrencyLevel: 4,
      status: 'queued',
      customOverrides: { ...scenario.conditions },
    };
    setBatchQueue((prev) => [...prev, newItem]);
  };

  const handleRunBatchSimulation = () => {
    setIsBatchRunning(true);
    setBatchSummary(null);

    setTimeout(() => {
      const summary = runBatchScenarioSimulation(batchQueue, nodes, chaosConfig);
      setBatchSummary(summary);
      setIsBatchRunning(false);
    }, 850);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150 text-xs font-mono">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header con Interruptor de Modo Único / Modo en Lote (Batch) */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-950/80 border border-amber-700 text-amber-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white">
                  Motor de Simulación y Sandbox de Escenarios
                </h3>
                <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-300 font-bold text-[10px]">
                  SANDBOX SEGURO
                </span>
                {chaosConfig.enabled && (
                  <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-500 text-rose-300 font-bold text-[10px] animate-pulse flex items-center gap-1">
                    <Flame className="w-3 h-3" /> AGENT CHAOS MODE: ACTIVO
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Evalúa la robustez, mitigaciones automáticas, estrés en lote y throughput a escala.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Selector de Modo: Individual vs Batch Execution */}
            <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                data-testid="mode-single-btn"
                onClick={() => setExecutionMode('single')}
                className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  executionMode === 'single'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>Escenario Individual</span>
              </button>
              <button
                type="button"
                data-testid="mode-batch-btn"
                onClick={() => setExecutionMode('batch')}
                className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  executionMode === 'batch'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Ejecución en Lote (Batch)</span>
                <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 text-[9.5px]">
                  {batchQueue.length}
                </span>
              </button>
            </div>

            {/* Toggle Rápido de Agent Chaos Mode en Header */}
            <button
              type="button"
              data-testid="agent-chaos-mode-toggle"
              onClick={() =>
                setChaosConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs border transition cursor-pointer ${
                chaosConfig.enabled
                  ? 'bg-rose-600/25 border-rose-500 text-rose-200 shadow-lg shadow-rose-500/20'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-rose-500/50 hover:text-rose-200'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5 text-rose-400" />
              <span>Agent Chaos: {chaosConfig.enabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =============================================================== */}
        {/* PANEL A: MODO ESCENARIO INDIVIDUAL (SINGLE SCENARIO MODE) */}
        {/* =============================================================== */}
        {executionMode === 'single' && (
          <div className="p-6 overflow-y-auto space-y-6 bg-slate-950 flex-1">
            {/* Selector de Escenarios Predeterminados */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Seleccionar Escenario de Prueba:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {PRESET_SIMULATION_SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => handleSelectPreset(sc)}
                    className={`p-2.5 rounded-lg border text-left space-y-1.5 transition cursor-pointer ${
                      selectedScenario.id === sc.id
                        ? 'bg-amber-950/40 border-amber-500/80 text-amber-300 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold text-[11px] block truncate">{sc.name}</span>
                    <p className="text-[9.5px] text-slate-500 line-clamp-2 font-sans">{sc.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Panel de Configuración de Agent Chaos Mode si está habilitado */}
            {chaosConfig.enabled && (
              <div
                data-testid="agent-chaos-panel"
                className="p-4 rounded-xl bg-gradient-to-r from-rose-950/40 to-slate-900 border border-rose-500/60 space-y-3.5 animate-in fade-in duration-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-500/30 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-400" />
                    <span className="font-bold text-rose-200 text-xs">
                      Configuración de Inyección Estocástica (Agent Chaos Mode)
                    </span>
                  </div>
                  <span className="text-[10.5px] text-rose-300/80">
                    Comportamiento probabilístico no-determinista
                  </span>
                </div>

                {/* Selección del Patrón de Fallo */}
                <div>
                  <span className="text-[11px] font-bold text-slate-300 block mb-1.5">
                    Patrón de Comportamiento No-Determinista:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {(Object.keys(CHAOS_PATTERN_METADATA) as ChaosFailurePattern[]).map((patternKey) => {
                      const meta = CHAOS_PATTERN_METADATA[patternKey];
                      const active = chaosConfig.pattern === patternKey;
                      return (
                        <button
                          key={patternKey}
                          type="button"
                          onClick={() =>
                            setChaosConfig((prev) => ({ ...prev, pattern: patternKey }))
                          }
                          className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                            active
                              ? 'bg-rose-950/70 border-rose-400 text-rose-100 shadow-md shadow-rose-950/50'
                              : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className="font-bold text-[11px] text-white block mb-1">
                            {meta.label}
                          </span>
                          <p className="text-[9.5px] text-slate-400 font-sans leading-tight">
                            {meta.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Deslizadores de Probabilidad y Latencia */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-300">
                        Probabilidad de Fallo Intermitente por Nodo:
                      </span>
                      <span className="text-rose-400 font-bold">
                        {chaosConfig.failureProbabilityPercent}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="80"
                      step="5"
                      value={chaosConfig.failureProbabilityPercent}
                      onChange={(e) =>
                        setChaosConfig((prev) => ({
                          ...prev,
                          failureProbabilityPercent: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-300">
                        Latencia Artificial / Jitter Estocástico:
                      </span>
                      <span className="text-amber-300 font-bold">
                        ±{chaosConfig.artificialLatencyJitterMs} ms
                      </span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="2500"
                      step="50"
                      value={chaosConfig.artificialLatencyJitterMs}
                      onChange={(e) =>
                        setChaosConfig((prev) => ({
                          ...prev,
                          artificialLatencyJitterMs: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Selección de Agentes Objetivo */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10.5px] text-slate-400 mr-1">
                      Nodos Objetivo ({chaosConfig.targetNodeIds.length === 0 ? 'Muestreo Global' : `${chaosConfig.targetNodeIds.length} seleccionados`}):
                    </span>
                    {CHAOS_TARGET_CANDIDATES.map((cand) => {
                      const active = chaosConfig.targetNodeIds.includes(cand.id);
                      return (
                        <button
                          key={cand.id}
                          type="button"
                          onClick={() => handleToggleTargetNode(cand.id)}
                          className={`px-2 py-0.5 rounded text-[10px] border transition cursor-pointer ${
                            active
                              ? 'bg-rose-500/30 border-rose-400 text-rose-200 font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {cand.label}
                        </button>
                      );
                    })}
                  </div>

                  {chaosConfig.targetNodeIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setChaosConfig((p) => ({ ...p, targetNodeIds: [] }))}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                    >
                      Restablecer a Muestreo Global
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Configuración de Parámetros Ambientales */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" /> Parámetros Ambientales de la Factoría
                </span>
                <span className="text-[11px] text-slate-400">
                  Carril: <strong className="text-white uppercase">{selectedScenario.lane}</strong> • Prioridad: <strong className="text-white">{selectedScenario.priority}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Latencia de Red */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Latencia de Red / Inferencia:</span>
                    <span className="text-white font-bold">{conditions.networkLatencyMs} ms</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1200"
                    step="20"
                    value={conditions.networkLatencyMs}
                    onChange={(e) =>
                      setConditions({ ...conditions, networkLatencyMs: Number(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Pérdida de Paquetes */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Pérdida de Paquetes (RPC/Drop):</span>
                    <span className="text-white font-bold">{conditions.packetLossPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    step="1"
                    value={conditions.packetLossPercent}
                    onChange={(e) =>
                      setConditions({ ...conditions, packetLossPercent: Number(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Tasa de Error 429 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Tasa de Throttling (HTTP 429):</span>
                    <span className="text-white font-bold">{conditions.rateLimitFailureRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={conditions.rateLimitFailureRate}
                    onChange={(e) =>
                      setConditions({ ...conditions, rateLimitFailureRate: Number(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Toggles de Caos Específicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={conditions.promptInjectionAttack}
                    onChange={(e) =>
                      setConditions({ ...conditions, promptInjectionAttack: e.target.checked })
                    }
                    className="mt-0.5 accent-rose-500 rounded cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="text-slate-200 font-bold block">Inyectar Prompt Adversarial</span>
                    <span className="text-slate-500 text-[10px] font-sans">
                      Simula intento de bypass de políticas para evaluar los guardrails en Capa 01.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={conditions.uiVisualGlitch}
                    onChange={(e) =>
                      setConditions({ ...conditions, uiVisualGlitch: e.target.checked })
                    }
                    className="mt-0.5 accent-amber-500 rounded cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="text-slate-200 font-bold block">Inyectar Regresión Visual / Contraste DOM</span>
                    <span className="text-slate-500 text-[10px] font-sans">
                      Fuerza violación de accesibilidad WCAG para activar el módulo Self-Healing.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Botón de Ejecutar Simulación Individual */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400 text-[11px]">
                Objetivo: <strong className="text-white">{selectedScenario.targetTaskTitle}</strong>
              </span>

              <button
                data-testid="run-single-simulation-btn"
                onClick={handleRunSimulation}
                disabled={isRunning}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition shadow-lg cursor-pointer ${
                  isRunning
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : chaosConfig.enabled
                    ? 'bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 shadow-rose-500/20 active:scale-95'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 active:scale-95'
                }`}
              >
                {isRunning ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Simulando Caos en Sandbox...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>
                      {chaosConfig.enabled
                        ? 'Lanzar Simulación con Agent Chaos Mode'
                        : 'Lanzar Simulación en Sandbox'}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Resultados de la Simulación Individual */}
            {simulationResult && (
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-700 space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div
                      className={`p-2 rounded-lg font-bold uppercase text-xs ${
                        simulationResult.status === 'passed'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : simulationResult.status === 'healed'
                          ? 'bg-purple-950 text-purple-300 border border-purple-700'
                          : 'bg-amber-950 text-amber-300 border border-amber-700'
                      }`}
                    >
                      ESTADO: {simulationResult.status.toUpperCase()}
                    </div>
                    {simulationResult.chaosModeActive && (
                      <span className="px-2.5 py-1 rounded-lg bg-rose-950/90 border border-rose-500/60 text-rose-300 font-bold text-[10.5px]">
                        🔥 CHAOS MODE PROBADO ({simulationResult.chaosPerturbations?.length || 0} nodos perturbados)
                      </span>
                    )}
                    <span className="text-slate-300 text-xs">
                      Duración: <strong>{(simulationResult.durationMs / 1000).toFixed(2)}s</strong> • Tokens: <strong>{simulationResult.tokensConsumed.toLocaleString()}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-[11px]">Robustez del Sistema:</span>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-700">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-base font-extrabold text-amber-300">
                        {simulationResult.robustnessScore}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Matriz de Perturbaciones de Caos por Agente */}
                {simulationResult.chaosModeActive &&
                  simulationResult.chaosPerturbations &&
                  simulationResult.chaosPerturbations.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider block mb-2">
                        🎲 Matriz de Perturbaciones No-Deterministas por Agente (Agent Chaos Mode):
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {simulationResult.chaosPerturbations.map((pert) => (
                          <div
                            key={pert.nodeId}
                            className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1.5 ${
                              pert.intermittentFailureTriggered
                                ? 'bg-rose-950/30 border-rose-500/50'
                                : 'bg-slate-950 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-[11px]">
                                {pert.nodeName} (Capa {pert.layer})
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-700/60 text-amber-300 text-[9.5px] font-bold">
                                  +{pert.injectedLatencyMs}ms jitter
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase ${
                                    pert.intermittentFailureTriggered
                                      ? 'bg-rose-900 text-rose-200'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {pert.intermittentFailureTriggered ? 'Fallo Intermitente' : 'Tolerado'}
                                </span>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-sans italic">
                              {pert.recoveryAction}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Mitigaciones y Eventos */}
                {simulationResult.mitigationsTriggered.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                      🛡️ Mitigaciones Autónomas Disparadas:
                    </span>
                    <div className="space-y-1">
                      {simulationResult.mitigationsTriggered.map((m, idx) => (
                        <div key={idx} className="p-2 rounded bg-slate-950 border border-emerald-900/60 text-emerald-300 text-[11px] flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                          <span>{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =============================================================== */}
        {/* PANEL B: MODO EJECUCIÓN EN LOTE (BATCH EXECUTION MODE) */}
        {/* =============================================================== */}
        {executionMode === 'batch' && (
          <div className="p-6 overflow-y-auto space-y-6 bg-slate-950 flex-1">
            {/* Cabecera del Gestor de Lotes */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-purple-950/20 border border-purple-500/30 p-4 rounded-xl">
              <div>
                <h4 className="text-sm font-bold text-purple-200 flex items-center gap-2">
                  <Layers2 className="w-4 h-4 text-purple-400" />
                  Cola de Escenarios por Lote para Stress-Testing de Throughput
                </h4>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Encola múltiples escenarios con variaciones de latencia, concurrencia y sobrecargas concurrentes.
                </p>
              </div>

              {/* Botones de añadir escenario rápido a la cola */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10.5px] text-slate-400 mr-1">Añadir Preset:</span>
                {PRESET_SIMULATION_SCENARIOS.slice(0, 3).map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => handleAddBatchPreset(sc)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-purple-500/40 text-purple-300 hover:bg-purple-900/40 text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{sc.lane}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tabla / Lista de Escenarios en Cola de Batch */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Cola Activa ({batchQueue.length} escenarios encolados):
              </span>

              <div className="space-y-2">
                {batchQueue.map((item, index) => {
                  const currentLatency =
                    item.customOverrides?.networkLatencyMs !== undefined
                      ? item.customOverrides.networkLatencyMs
                      : 80;

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-[240px]">
                        <span className="w-6 h-6 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                          {index + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{item.scenarioName}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase bg-slate-950 border border-slate-700 text-slate-300">
                              {item.lane}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            ID: {item.scenarioId} • Prioridad: {item.priority}
                          </span>
                        </div>
                      </div>

                      {/* Control de Nivel de Concurrencia */}
                      <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                        <span className="text-[10.5px] text-slate-400">Concurrencia:</span>
                        <button
                          onClick={() => handleUpdateBatchItemConcurrency(item.id, -1)}
                          className="px-1.5 py-0.2 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-bold text-purple-300 text-xs w-6 text-center">
                          {item.concurrencyLevel}x
                        </span>
                        <button
                          onClick={() => handleUpdateBatchItemConcurrency(item.id, 1)}
                          className="px-1.5 py-0.2 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Control de Latencia Individual en el Lote */}
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <span className="text-[10.5px] text-slate-400">Latencia:</span>
                        <input
                          type="range"
                          min="20"
                          max="1000"
                          step="20"
                          value={currentLatency}
                          onChange={(e) =>
                            handleUpdateBatchItemLatency(item.id, Number(e.target.value))
                          }
                          className="w-24 accent-purple-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-white w-14 text-right">
                          {currentLatency}ms
                        </span>
                      </div>

                      {/* Botón Eliminar de la Cola */}
                      <button
                        onClick={() => handleRemoveBatchItem(item.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                        title="Eliminar escenario del lote"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Botón de Lanzamiento de la Ejecución en Lote */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-400">
                Carga Total Encolada:{' '}
                <strong className="text-purple-300">
                  {batchQueue.reduce((acc, it) => acc + it.concurrencyLevel, 0)} tareas paralelas
                </strong>{' '}
                distribuidas en {batchQueue.length} escenarios.
              </div>

              <button
                data-testid="run-batch-simulation-btn"
                onClick={handleRunBatchSimulation}
                disabled={isBatchRunning || batchQueue.length === 0}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition shadow-lg cursor-pointer ${
                  isBatchRunning || batchQueue.length === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white shadow-purple-500/25 active:scale-95'
                }`}
              >
                {isBatchRunning ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Ejecutando Lote Masivo...</span>
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4" />
                    <span>Lanzar Ejecución en Lote ({batchQueue.length} Escenarios)</span>
                  </>
                )}
              </button>
            </div>

            {/* Resultados y Scorecard del Batch Simulation */}
            {batchSummary && (
              <div className="p-5 rounded-xl bg-slate-900 border border-purple-500/40 space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-purple-950 border border-purple-700 text-purple-300">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          Reporte de Throughput a Escala ({batchSummary.batchId})
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {batchSummary.completedCount}/{batchSummary.totalScenarios} COMPLETADOS
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Duración agregada: <strong>{batchSummary.totalSimulatedDurationSec}s</strong> • Tokens totales: <strong>{batchSummary.aggregateTokensConsumed.toLocaleString()}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Throughput Peak y Robustez Media */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Throughput Máximo:</span>
                      <strong className="text-cyan-300 text-sm font-bold">
                        {batchSummary.peakThroughputTasksPerMin} tareas/min
                      </strong>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
                      <span className="text-[10px] text-slate-500 block">Robustez Media:</span>
                      <strong className="text-amber-300 text-sm font-bold">
                        {batchSummary.averageRobustnessScore}%
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Desglose de Resultados por Escenario del Lote */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Desglose de Rendimiento por Escenario del Lote:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {batchSummary.results.map((r) => (
                      <div
                        key={r.itemId}
                        className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="truncate pr-2">
                          <span className="font-bold text-white truncate block">{r.scenarioName}</span>
                          <span className="text-[10.5px] text-slate-400">
                            Latencia: <strong>{(r.durationMs / 1000).toFixed(2)}s</strong> • Tokens: <strong>{r.tokensConsumed.toLocaleString()}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-900 border border-slate-700 text-amber-300">
                            {r.robustnessScore}%
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              r.status === 'passed'
                                ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800'
                                : r.status === 'healed'
                                ? 'text-purple-400 bg-purple-950/60 border border-purple-800'
                                : 'text-amber-400 bg-amber-950/60 border border-amber-800'
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer del Sandbox */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-slate-400">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Sandbox aislado • Cero impacto sobre el entorno de producción</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
          >
            Cerrar Sandbox
          </button>
        </div>
      </div>
    </div>
  );
};
