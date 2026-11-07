import { useCallback, useState } from 'react';
import { ApiError } from '../lib/api';

/** Ejecuta una acción asíncrona exponiendo `busy` y un mensaje de error legible. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (fn: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? `${e.code}: ${e.message}` : e instanceof Error ? e.message : 'Error desconocido');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, error, run };
}
