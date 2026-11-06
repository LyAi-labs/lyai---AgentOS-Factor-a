/**
 * AgentOS - Efecto de Celebración Seguro (Confetti Helper)
 * Configurado con `useWorker: false` para evitar el error 'canvas.getBoundingClientRect is not a function'
 * provocado por OffscreenCanvas dentro del Web Worker blob de canvas-confetti.
 */

import confetti from 'canvas-confetti';

let safeConfettiInstance: ((options?: confetti.Options) => Promise<null> | null) | null = null;

export function triggerCompletionConfetti(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  try {
    if (!safeConfettiInstance) {
      // Instancia con useWorker: false para ejecutar sobre el DOM principal
      safeConfettiInstance = confetti.create(undefined, {
        resize: true,
        useWorker: false,
      });
    }

    const firePromise = safeConfettiInstance({
      particleCount: 55,
      spread: 65,
      origin: { y: 0.8 },
      colors: ['#38bdf8', '#34d399', '#facc15', '#a855f7'],
      disableForReducedMotion: true,
    });

    if (firePromise && typeof firePromise.catch === 'function') {
      firePromise.catch(() => {
        // Ignorar de forma segura si el canvas es removido antes de finalizar
      });
    }
  } catch (err) {
    // Fallback silencioso en entornos donde Canvas o RAF no estén disponibles
    console.warn('Efecto confetti no disponible en este entorno:', err);
  }
}
