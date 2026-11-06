/**
 * AgentOS - Modal del Libro Mayor de Tokens y Créditos (Resource Token Ledger)
 * Permite auditar el gasto de Agent Credits por nodo y configurar políticas estrictas
 * de límites de gasto (Spending Limits) por tarea para evitar costes descontrolados.
 */

import React, { useState, useMemo } from 'react';
import {
  Coins,
  Sparkles,
  ShieldAlert,
  Sliders,
  DollarSign,
  TrendingDown,
  Layers,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  ArrowUpRight,
  Info,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { PipelineNode, PipelineTask, TaskSpendingLimitPolicy } from '../types/pipeline';
import {
  calculateResourceTokenLedger,
  DEFAULT_SPENDING_POLICY,
} from '../pipeline/tokenLedger';

interface ResourceTokenLedgerModalProps {
  nodes: PipelineNode[];
  tasks: PipelineTask[];
  isOpen: boolean;
  onClose: () => void;
  currentPolicy?: TaskSpendingLimitPolicy;
  onUpdatePolicy?: (newPolicy: TaskSpendingLimitPolicy) => void;
}

export const ResourceTokenLedgerModal: React.FC<ResourceTokenLedgerModalProps> = ({
  nodes,
  tasks,
  isOpen,
  onClose,
  currentPolicy,
  onUpdatePolicy,
}) => {
  if (!isOpen) return null;

  const [policy, setPolicy] = useState<TaskSpendingLimitPolicy>(
    currentPolicy || DEFAULT_SPENDING_POLICY
  );
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const ledger = useMemo(() => {
    return calculateResourceTokenLedger(nodes, tasks, policy);
  }, [nodes, tasks, policy]);

  const handleSavePolicy = () => {
    if (onUpdatePolicy) {
      onUpdatePolicy(policy);
    }
    setSavedToast('¡Política de límite de gasto por tarea actualizada y en vigor!');
    setTimeout(() => setSavedToast(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150 text-xs font-mono">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-950/80 border border-purple-700 text-purple-300">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Libro Mayor de Tokens & Créditos (Resource Token Ledger)
                </h3>
                <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-700 text-purple-300 font-bold text-[10px]">
                  AUDITORÍA EN VIVO
                </span>
                {ledger.runawayRiskCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-600 text-rose-300 font-bold text-[10px] animate-pulse flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {ledger.runawayRiskCount} TAREAS EN RIESGO DE LÍMITE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Audita créditos consumidos por nodo y establece techos de gasto por tarea para prevenir runaway costs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSavePolicy}
              className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/20 active:scale-95"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Guardar Política</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast de Guardado */}
        {savedToast && (
          <div className="bg-emerald-950/90 border-b border-emerald-700/60 p-2.5 px-5 text-emerald-300 flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold">{savedToast}</span>
          </div>
        )}

        {/* HUD Estadístico de Créditos y Costos */}
        <div className="bg-slate-950/60 border-b border-slate-800 p-4 px-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10.5px] text-slate-500 block">Agent Credits Consumidos:</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Coins className="w-3.5 h-3.5 text-purple-400" />
              <strong className="text-purple-300 text-sm font-bold">
                {ledger.totalAgentCredits.toLocaleString()} <span className="text-slate-500 text-[10px]">créditos</span>
              </strong>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10.5px] text-slate-500 block">Costo Financiero Estimado:</span>
            <strong className="text-emerald-400 text-sm font-bold block mt-0.5">
              ${ledger.totalCostUsd} USD
            </strong>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10.5px] text-slate-500 block">Límite por Tarea:</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <strong className="text-cyan-300 text-sm font-bold">
                {policy.maxCreditsPerTask} créditos
              </strong>
              <span className="text-[10px] text-slate-500">(${policy.maxCostUsdPerTask})</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10.5px] text-slate-500 block">Mayor Consumidor:</span>
            <strong className="text-amber-300 text-sm font-bold block mt-0.5 capitalize">
              {nodes.find((n) => n.id === ledger.topConsumingNodeId)?.name || 'Builder'}
            </strong>
          </div>
        </div>

        {/* Cuerpo Principal */}
        <div className="p-6 overflow-y-auto space-y-6 bg-slate-950 flex-1">
          {/* Panel de Configuración de Límites de Gasto (Spending Limits) */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" /> Política de Techo Presupuestario por Tarea
              </span>
              <span className="text-[11px] text-slate-400">
                Acción ante exceso: <strong className="text-rose-400 uppercase">{policy.actionOnLimitExceeded}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Deslizador de Créditos Máximos */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Techo de Créditos por Tarea:</span>
                  <span className="text-purple-300 font-bold">{policy.maxCreditsPerTask} créditos ({policy.maxCreditsPerTask}k tokens)</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="5"
                  value={policy.maxCreditsPerTask}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      maxCreditsPerTask: Number(e.target.value),
                      maxCostUsdPerTask: Number((Number(e.target.value) * 0.0018).toFixed(3)),
                    })
                  }
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* Acción al superar el límite */}
              <div className="space-y-1.5">
                <span className="text-slate-400 text-[11px] block">Acción ante Límite Excedido:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['warn', 'throttle', 'quarantine'] as const).map((act) => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => setPolicy({ ...policy, actionOnLimitExceeded: act })}
                      className={`py-1.5 px-2 rounded-lg text-[10.5px] font-bold uppercase transition border cursor-pointer ${
                        policy.actionOnLimitExceeded === act
                          ? 'bg-purple-600/30 text-purple-200 border-purple-500 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {act}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle de Bloqueo Estricto */}
              <div className="flex items-center pt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy.autoEnforceStrictTokenCap}
                    onChange={(e) =>
                      setPolicy({ ...policy, autoEnforceStrictTokenCap: e.target.checked })
                    }
                    className="accent-purple-500 rounded cursor-pointer"
                  />
                  <div>
                    <span className="text-slate-200 font-bold block text-xs">Auto-bloquear Runaway Tasks</span>
                    <span className="text-[10px] text-slate-500">Corta la inferencia si supera el presupuesto</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Tabla Desglose de Consumo por Nodo */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Desglose de Agent Credits por Nodo de Inferencia:
            </span>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 text-[10.5px]">
                    <th className="p-3">Agente / Nodo</th>
                    <th className="p-3">Capa</th>
                    <th className="p-3">Modelo</th>
                    <th className="p-3 text-right">Créditos</th>
                    <th className="p-3 text-right">Tokens</th>
                    <th className="p-3 text-right">Costo Estimado</th>
                    <th className="p-3 text-right">% Cuota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {ledger.nodeConsumptions.map((item) => (
                    <tr key={item.nodeId} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <span>{item.nodeName}</span>
                        {item.nodeId === ledger.topConsumingNodeId && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 text-[8.5px] border border-amber-800 font-bold">
                            TOP
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-400">Capa {item.layer}</td>
                      <td className="p-3 text-cyan-300 truncate max-w-[140px]">{item.model}</td>
                      <td className="p-3 text-right font-bold text-purple-300">
                        {item.creditsConsumed} cr
                      </td>
                      <td className="p-3 text-right text-slate-300">
                        {item.tokensConsumed.toLocaleString()}
                      </td>
                      <td className="p-3 text-right text-emerald-400 font-bold">
                        ${item.costUsd}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-slate-400 text-[10px]">{item.percentageOfTotal}%</span>
                          <div className="w-12 bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                            <div
                              className="bg-purple-500 h-full"
                              style={{ width: `${item.percentageOfTotal}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-slate-400">
          <span className="text-[11px]">
            1 Agent Credit = 1,000 tokens inferidos. Costos calculados según tarifas vigentes de modelos.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
