/**
 * Detección e integración con el API de VS Code (acquireVsCodeApi).
 */

export interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi;
  }
}

let cachedVsCodeApi: VsCodeApi | undefined | null = null;

export function getVsCodeApi(): VsCodeApi | undefined {
  if (cachedVsCodeApi !== null) {
    return cachedVsCodeApi;
  }
  if (typeof window !== 'undefined' && typeof window.acquireVsCodeApi === 'function') {
    try {
      cachedVsCodeApi = window.acquireVsCodeApi();
    } catch {
      cachedVsCodeApi = undefined;
    }
  } else {
    cachedVsCodeApi = undefined;
  }
  return cachedVsCodeApi;
}

export function setVsCodeApi(api: VsCodeApi | undefined): void {
  cachedVsCodeApi = api;
}

export function isVsCodeEnvironment(): boolean {
  return getVsCodeApi() !== undefined;
}
