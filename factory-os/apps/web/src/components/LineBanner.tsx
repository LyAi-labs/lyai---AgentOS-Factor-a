import { useState } from 'react';
import type { EngineState } from '@factory-os/shared';
import { api } from '../lib/api';
import { formatClock } from '../lib/format';
import { useAction } from './useAction';

/** Constitución O1: con la línea parada no arranca nada; solo una persona la reanuda, con una nota. */
export function LineBanner({ engine }: { engine: EngineState | null }) {
  const action = useAction();
  const [note, setNote] = useState('');
  if (!engine?.lineStopped) return null;
  return (
    <div className="line-banner" role="alert">
      <span className="line-banner__icon" aria-hidden>■</span>
      <div className="line-banner__text">
        <strong>Línea parada</strong> desde {formatClock(engine.lineStoppedAt)}: {engine.lineStopReason}
        <span className="line-banner__hint">No arranca ningún paso ni aprobación automática hasta reanudarla.</span>
      </div>
      <form
        className="line-banner__form"
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            await api.resumeLine(note);
            setNote('');
          });
        }}
      >
        <input
          aria-label="Nota de reanudación"
          required
          minLength={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Qué se ha revisado"
        />
        <button type="submit" className="btn btn--primary" disabled={action.busy}>
          Reanudar línea
        </button>
      </form>
      {action.error && <span className="error-text">{action.error}</span>}
    </div>
  );
}
