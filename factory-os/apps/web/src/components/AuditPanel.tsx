import { useState } from 'react';
import type { AuditEntry } from '@factory-os/shared';
import { api } from '../lib/api';
import { formatClock } from '../lib/format';
import { useAction } from './useAction';

const ACTION_LABEL: Record<AuditEntry['action'], string> = {
  approve: 'aprueba',
  reject: 'rechaza',
  retry: 'reintenta',
  line_stop: 'para la línea',
  line_resume: 'reanuda la línea',
  node_config: 'cambia config.',
  engine_settings: 'cambia gobierno',
};

/** Registro de auditoría encadenado por hash, con verificación de integridad bajo demanda. */
export function AuditPanel() {
  const action = useAction();
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [verification, setVerification] = useState<Awaited<ReturnType<typeof api.verifyAudit>> | null>(null);

  const load = () =>
    void action.run(async () => {
      const [list, check] = await Promise.all([api.audit(50), api.verifyAudit()]);
      setEntries([...list].reverse());
      setVerification(check);
    });

  return (
    <section className="audit" aria-label="Auditoría">
      <div className="audit__head">
        <h3>Auditoría encadenada</h3>
        <button type="button" className="btn" disabled={action.busy} onClick={load}>
          {entries ? 'Actualizar y verificar' : 'Cargar y verificar'}
        </button>
      </div>
      {verification && (
        <p className={verification.ok ? 'audit__ok' : 'error-text'} role="status">
          {verification.ok
            ? `✓ Cadena íntegra · ${String(verification.entries)} entradas`
            : `✕ Cadena rota en #${String(verification.brokenAt)}: ${verification.reason ?? ''}`}
        </p>
      )}
      {action.error && <p className="error-text" role="alert">{action.error}</p>}
      {entries && entries.length === 0 && <p className="muted">Sin decisiones registradas todavía.</p>}
      {entries && entries.length > 0 && (
        <ol className="audit__list">
          {entries.map((e) => (
            <li key={e.seq}>
              <span className="audit__seq">#{e.seq}</span>
              <time>{formatClock(e.at)}</time>
              <strong>{e.actor}</strong> {ACTION_LABEL[e.action]} · {e.detail}
              <code title={`prev ${e.prevHash}`}>{e.hash.slice(0, 10)}…</code>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
