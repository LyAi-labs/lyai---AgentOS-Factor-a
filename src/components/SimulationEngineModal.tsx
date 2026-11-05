/**
 * AgentOS - Motor de Simulación y Sandbox de Escenarios
 * Permite configurar condiciones ambientales adversas (latencia, fallos 429, inyecciones, glitches visuales)
 * y evaluar la resiliencia y robustez de los agentes en un entorno seguro y aislado.
 */

import React, { useState } from 'react';
import {
  SimulationScenario,
  SimulationConditions,
  SimulationResult,
  PipelineNode,
} from '../types/pipeline';
import {
  PRESET_SIMULATION_SCENARIOS,
  runSandboxSimulation,
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
} from 'lucide-react';

interface SimulationEngineModalProps {
  nodes: PipelineNode[];
  isOpen: boolean;
  onClose: () => void;
  onSimulationComplete?: (result: SimulationResult) => void;
}

export const SimulationEngineModal: React.FC<SimulationEngineModalProps> = ({
  nodes,
  isOpen,
  onClose,
  onSimulationComplete,
}) => {
  if (!isOpen) return null;

  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario>(
    PRESET_SIMULATION_SCENARIOS[0]
  );

  // Condiciones ambientales editables
  const [conditions, setConditions] = useState<SimulationConditions>(
    PRESET_SIMULATION_SCENARIOS[0].conditions
  );

  const [isRunning, setIsRunning] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  const handleSelectPreset = (scenario: SimulationScenario) => {
    setSelectedScenario(scenario);
    setConditions(scenario.conditions);
    setSimulationResult(null);
  };

  const handleRunSimulation = () => {
    setIsRunning(true);
    setSimulationResult(null);

    // Simular ejecución gradual
    setTimeout(() => {
      const result = runSandboxSimulation(
        {
          ...selectedScenario,
          conditions,
        },
        nodes
      );
      setSimulationResult(result);
      setIsRunning(false);
      if (onSimulationComplete) {
        onSimulationComplete(result);
      }
    }, 1100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150 text-xs font-mono">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-950/80 border border-amber-700 text-amber-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Motor de Simulación y Sandbox de Escenarios
                </h3>
                <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-300 font-bold text-[10px]">
                  SANDBOX SEGURO
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Evalúa la robustez, mitigaciones automáticas y tiempos de recuperación bajo estrés y caos controlado.
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

        {/* Cuerpo Principal */}
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
                  className={`p-2.5 rounded-lg border text-left space-y-1.5 transition ${
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

          {/* Panel de Condiciones Ambientales Configurables */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                <Sliders className="w-4 h-4 text-cyan-400" /> Parámetros Ambientales del Sandbox
              </span>
              <button
                onClick={() => setConditions(selectedScenario.conditions)}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Restaurar Predeterminados
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Latencia de Red */}
              <div className="space-y-1.5 p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Latencia de Red:</span>
                  <span className="text-cyan-300 font-bold">{conditions.networkLatencyMs} ms</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1200"
                  step="20"
                  value={conditions.networkLatencyMs}
                  onChange={(e) => setConditions({ ...conditions, networkLatencyMs: Number(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Tasa de Throttling 429 */}
              <div className="space-y-1.5 p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Falla de Cuota / Rate-Limit (429):</span>
                  <span className="text-amber-300 font-bold">{conditions.rateLimitFailureRate}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={conditions.rateLimitFailureRate}
                  onChange={(e) => setConditions({ ...conditions, rateLimitFailureRate: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Caída de Contenedor Docker */}
              <div className="space-y-1.5 p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Probabilidad Caída Docker (OOM):</span>
                  <span className="text-rose-400 font-bold">{conditions.backendCrashProbability}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="5"
                  value={conditions.backendCrashProbability}
                  onChange={(e) => setConditions({ ...conditions, backendCrashProbability: Number(e.target.value) })}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Toggles de Inyección de Falla */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={conditions.promptInjectionAttack}
                  onChange={(e) => setConditions({ ...conditions, promptInjectionAttack: e.target.checked })}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="text-slate-200 font-bold block">Inyectar Ataque de Prompt Injection</span>
                  <span className="text-slate-500 text-[10px] font-sans">
                    Intenta sobrepasar guardrails y robar claves API mediante evasión sintáctica.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={conditions.uiVisualGlitch}
                  onChange={(e) => setConditions({ ...conditions, uiVisualGlitch: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="text-slate-200 font-bold block">Inyectar Regresión Visual / Contraste DOM</span>
                  <span className="text-slate-500 text-[10px] font-sans">
                    Fuerza violación de accesibilidad WCAG para activar el módulo Self-Healing.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Botón de Ejecutar Simulación */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-400 text-[11px]">
              Objetivo: <strong className="text-white">{selectedScenario.targetTaskTitle}</strong>
            </span>

            <button
              onClick={handleRunSimulation}
              disabled={isRunning}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition shadow-lg ${
                isRunning
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
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
                  <span>Lanzar Simulación en Sandbox</span>
                </>
              )}
            </button>
          </div>

          {/* Resultados de la Simulación y Scorecard */}
          {simulationResult && (
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-700 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
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
                  <span className="text-slate-300 text-xs">
                    Duración: <strong>{(simulationResult.durationMs / 1000).toFixed(2)}s</strong> • Tokens: <strong>{simulationResult.tokensConsumed.toLocaleString()}</strong>
                  </span>
                </div>

                {/* Scorecard de Robustez */}
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

              {/* Mitigaciones Autónomas Disparadas */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  🛡️ Mitigaciones Autónomas Disparadas:
                </span>
                {simulationResult.mitigationsTriggered.length === 0 ? (
                  <div className="p-3 rounded-lg bg-slate-950 text-slate-500 italic">
                    Sin interferencias anómalas; ejecución nominal exitosa.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {simulationResult.mitigationsTriggered.map((mit, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/60 text-emerald-200 flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{mit}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Registro de Eventos de Caos */}
              {simulationResult.chaosEventsLogged.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    ⚠️ Eventos de Caos Inyectados y Manejados:
                  </span>
                  <div className="space-y-1.5">
                    {simulationResult.chaosEventsLogged.map((evt, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 font-bold text-[9px] uppercase">
                            {evt.severity}
                          </span>
                          <span className="text-slate-300">[{evt.nodeId}]: {evt.event}</span>
                        </div>
                        <span className="text-emerald-400 font-bold shrink-0">✔ Mitigado</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-slate-400 text-[11px]">
            Sandbox aislado • Cero impacto sobre el entorno de producción
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
          >
            Cerrar Sandbox
          </button>
        </div>
      </div>
    </div>
  );
};
