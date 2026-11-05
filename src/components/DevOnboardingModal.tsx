/**
 * AgentOS - Modal de Onboarding y Tour Interactivo para Desarrolladores
 * Incluye la guía paso a paso y el patrón reutilizable para redactar futuros tutoriales.
 */

import React, { useState } from 'react';
import {
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lightbulb,
  ExternalLink,
  Code2,
  BookOpen,
  Sparkles,
  ArrowRight,
  Check,
  Copy,
} from 'lucide-react';
import { ActiveTab } from './LayerFilterBar';
import { DEV_ONBOARDING_STEPS, TUTORIAL_PATTERN_GUIDE } from '../tutorial/onboardingData';

interface DevOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
}

export const DevOnboardingModal: React.FC<DevOnboardingModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [activeTabMode, setActiveTabMode] = useState<'tour' | 'pattern'>('tour');
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const currentStep = DEV_ONBOARDING_STEPS[currentStepIndex];
  const progressPercent = Math.round(((currentStepIndex + 1) / DEV_ONBOARDING_STEPS.length) * 100);

  const handleNext = () => {
    if (currentStepIndex < DEV_ONBOARDING_STEPS.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      onNavigateTab(DEV_ONBOARDING_STEPS[nextIndex].targetTab);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      onNavigateTab(DEV_ONBOARDING_STEPS[prevIndex].targetTab);
    }
  };

  const handleJumpToStep = (index: number) => {
    setCurrentStepIndex(index);
    onNavigateTab(DEV_ONBOARDING_STEPS[index].targetTab);
  };

  const handleCopyPatternCode = () => {
    navigator.clipboard.writeText(TUTORIAL_PATTERN_GUIDE.codeExample);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 1. Header con Selector de Modo Tour vs Patrón */}
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-mono text-white">
                  {activeTabMode === 'tour'
                    ? 'Tutorial de Onboarding para Desarrolladores'
                    : 'Patrón para Crear Futuros Tutoriales'}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30">
                  DEV STANDARD
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                {activeTabMode === 'tour'
                  ? 'Guía interactiva paso a paso para familiarizarse con el sistema operativo de agentes'
                  : 'Documentación del esquema modular para extender la base de conocimiento del equipo'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
              <button
                onClick={() => setActiveTabMode('tour')}
                className={`px-3 py-1 rounded transition ${
                  activeTabMode === 'tour'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tour Interactivo
              </button>
              <button
                onClick={() => setActiveTabMode('pattern')}
                className={`flex items-center gap-1 px-3 py-1 rounded transition ${
                  activeTabMode === 'pattern'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code2 className="w-3 h-3" />
                Guía Patrón
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 2. Barra de Progreso */}
        {activeTabMode === 'tour' && (
          <div className="w-full bg-slate-950 px-5 pt-3 pb-2 border-b border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
              <span>
                Paso {currentStepIndex + 1} de {DEV_ONBOARDING_STEPS.length}:{' '}
                <strong className="text-purple-300">{currentStep.title}</strong>
              </span>
              <span className="text-purple-400 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* 3. Contenido Principal */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTabMode === 'tour' ? (
            <div className="space-y-4">
              {/* Badge & Título */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-mono px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                  {currentStep.badge}
                </span>
                <button
                  onClick={() => onNavigateTab(currentStep.targetTab)}
                  className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  <span>Ir a la pestaña [{currentStep.targetTab}]</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Descripción */}
              <p className="text-sm text-slate-200 font-sans leading-relaxed">
                {currentStep.description}
              </p>

              {/* Conceptos Clave */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs font-bold font-mono text-slate-300 block">
                  Conceptos Clave de Arquitectura:
                </span>
                <ul className="space-y-1.5">
                  {currentStep.keyConcepts.map((concept, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-slate-300 flex items-start gap-2 font-sans"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{concept}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tip para Desarrolladores Senior */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-200">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-mono text-amber-300 block mb-0.5">
                    Tip para Desarrolladores Senior:
                  </strong>
                  <span className="font-sans text-slate-300">{currentStep.proDevTip}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Modo Patrón para Desarrolladores */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  {TUTORIAL_PATTERN_GUIDE.title}
                </h4>
                <p className="text-xs text-slate-300 font-sans">
                  {TUTORIAL_PATTERN_GUIDE.purpose}
                </p>
                <div className="space-y-1 pt-2">
                  <span className="text-[11px] font-bold font-mono text-slate-400 uppercase tracking-wider block">
                    Reglas de Diseño:
                  </span>
                  <ul className="space-y-1">
                    {TUTORIAL_PATTERN_GUIDE.rules.map((rule, idx) => (
                      <li key={idx} className="text-xs text-slate-300 font-mono">
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Bloque de Código de Ejemplo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Plantilla TypeScript (TutorialStep Schema):</span>
                  <button
                    onClick={handleCopyPatternCode}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-[11px]"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar Plantilla</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto leading-relaxed select-text">
                  {TUTORIAL_PATTERN_GUIDE.codeExample}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* 4. Footer con Navegación del Tour */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          {activeTabMode === 'tour' ? (
            <>
              <button
                onClick={handlePrev}
                disabled={currentStepIndex === 0}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono transition ${
                  currentStepIndex === 0
                    ? 'text-slate-600 cursor-not-allowed'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>

              {/* Indicadores de Pasos (1 a 8) */}
              <div className="hidden sm:flex items-center gap-1.5">
                {DEV_ONBOARDING_STEPS.map((step, idx) => (
                  <button
                    key={step.id}
                    onClick={() => handleJumpToStep(idx)}
                    className={`w-6 h-6 rounded-md text-[10px] font-mono font-bold transition flex items-center justify-center ${
                      idx === currentStepIndex
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : idx < currentStepIndex
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                    title={step.title}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs font-bold shadow-lg shadow-purple-600/25 transition cursor-pointer"
              >
                <span>
                  {currentStepIndex === DEV_ONBOARDING_STEPS.length - 1
                    ? 'Finalizar Tour'
                    : 'Siguiente'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center justify-end w-full">
              <button
                onClick={() => setActiveTabMode('tour')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition"
              >
                Volver al Tour Interactivo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
