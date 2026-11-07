/**
 * Registro de auditoría encadenado por hash (tamper-evident).
 *
 * No firma en nombre de nadie: en lyai-factory la firma es de Ignacio con sus claves SSH externas
 * (docs/allowed_signers_ignacio). Una clave generada por el propio servidor no probaría autoría.
 * Lo que sí garantiza la cadena es que alterar, reordenar o borrar una entrada se detecta.
 */
import { createHash } from 'node:crypto';
import type { AuditEntry } from '@factory-os/shared';

export const GENESIS_HASH = '0'.repeat(64);

export type AuditDraft = Omit<AuditEntry, 'seq' | 'prevHash' | 'hash'>;

/** Contenido canónico: orden de campos fijo, nulls explícitos. */
function canonical(seq: number, draft: AuditDraft): string {
  return JSON.stringify([seq, draft.at, draft.actor, draft.action, draft.taskId, draft.nodeId, draft.detail]);
}

export function computeHash(prevHash: string, seq: number, draft: AuditDraft): string {
  return createHash('sha256').update(prevHash).update('\n').update(canonical(seq, draft)).digest('hex');
}

export class AuditChain {
  private seq: number;
  private head: string;

  constructor(head: { seq: number; hash: string } = { seq: 0, hash: GENESIS_HASH }) {
    this.seq = head.seq;
    this.head = head.hash;
  }

  append(draft: AuditDraft): AuditEntry {
    const seq = this.seq + 1;
    const hash = computeHash(this.head, seq, draft);
    const entry: AuditEntry = { ...draft, seq, prevHash: this.head, hash };
    this.seq = seq;
    this.head = hash;
    return entry;
  }

  getHead(): { seq: number; hash: string } {
    return { seq: this.seq, hash: this.head };
  }
}

export interface ChainVerification {
  ok: boolean;
  entries: number;
  /** Primera secuencia donde la cadena se rompe (null si está íntegra). */
  brokenAt: number | null;
  reason: string | null;
}

/** Recalcula la cadena completa, en orden de secuencia, desde el génesis. */
export function verifyChain(entries: readonly AuditEntry[]): ChainVerification {
  let prev = GENESIS_HASH;
  let expectedSeq = 1;
  for (const e of [...entries].sort((a, b) => a.seq - b.seq)) {
    const fail = (reason: string): ChainVerification => ({ ok: false, entries: entries.length, brokenAt: e.seq, reason });
    if (e.seq !== expectedSeq) return fail(`falta la entrada ${expectedSeq}`);
    if (e.prevHash !== prev) return fail('prevHash no coincide con la entrada anterior');
    const { seq: _s, prevHash: _p, hash: _h, ...draft } = e;
    if (computeHash(prev, e.seq, draft) !== e.hash) return fail('contenido alterado: el hash no coincide');
    prev = e.hash;
    expectedSeq += 1;
  }
  return { ok: true, entries: entries.length, brokenAt: null, reason: null };
}
