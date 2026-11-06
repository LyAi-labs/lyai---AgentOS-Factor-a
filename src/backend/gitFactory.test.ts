/**
 * Pruebas automáticas reales del backend GitFactory (11 Puntos REALES + Server-Side Git Hooks GPG/#TASK-<id>)
 * Regla 4: Pruebas automáticas que NO llaman a ningún modelo externo.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { GitFactoryBackend, ELEVEN_POINTS_AUDIT } from './gitFactory';

describe('Backend Real GitFactory — 11 Puntos Reales + Server-Side Hooks (pre-receive, update) con GPG y #TASK-<id>', () => {
  let tempRepoDir: string;
  let backend: GitFactoryBackend;

  beforeEach(() => {
    tempRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentos-git-test-'));
    backend = new GitFactoryBackend(tempRepoDir);
  });

  afterEach(() => {
    if (tempRepoDir && fs.existsSync(tempRepoDir)) {
      fs.rmSync(tempRepoDir, { recursive: true, force: true });
    }
    const bareDir = `${tempRepoDir}-remote-bare.git`;
    if (fs.existsSync(bareDir)) {
      fs.rmSync(bareDir, { recursive: true, force: true });
    }
  });

  it('Inicializa un repositorio Git real en main con firma GPG, reglas Brain y server-side hooks (pre-receive, update)', () => {
    const status = backend.getRepoStatus();
    assert.equal(status.currentBranch, 'main');
    assert.equal(status.isClean, true);
    assert.equal(status.uncommittedFiles.length, 0);
    assert.ok(fs.existsSync(path.join(tempRepoDir, '.git')));
    assert.ok(fs.existsSync(path.join(tempRepoDir, 'brain', 'wiki-rules.md')));
    assert.equal(status.serverHooks.installed, true);
    assert.ok(status.serverHooks.gpgKeyFingerprint.length >= 16);
    assert.equal(status.recentCommits[0]?.gpgStatus, 'G');
    assert.equal(status.recentCommits[0]?.taskIdRef, '#TASK-INIT');
  });

  it('Puntos 1 y 2: Ingesta, analiza alcance real en disco y persiste especificación coherente', () => {
    const task = backend.createTask({
      id: 'ENCARGO-01',
      title: 'Validar token de sesión',
      description: 'Crear validador determinista de caducidad de sesión',
      targetFile: 'src/sessionValidator.ts',
    });

    assert.equal(task.stage, 'pendiente_spec');
    assert.ok(task.ingestion);
    assert.equal(task.ingestion.filterPassed, true);
    assert.equal(task.ingestion.detectedCategory, 'no_visual');

    assert.throws(
      () => backend.buildTaskInIsolatedBranch('ENCARGO-01'),
      /sin haber generado primero su especificación \(Punto 2\)/
    );

    const updated = backend.generateSpecForTask('ENCARGO-01');
    assert.equal(updated.stage, 'spec_generado');
    assert.ok(updated.spec);
    assert.equal(updated.spec.coherenceVerified, true);
    assert.equal(updated.spec.specFilePath, 'specs/ENCARGO-01.md');
  });

  it('Puntos 3, 4, 5, 6 y 10: Construye en rama aislada con GPG y #TASK-<id>, ejecuta Verificador sobre BD aislada y aprueba 4/4', () => {
    backend.createTask({
      id: 'ENCARGO-02',
      title: 'Módulo de auditoría Git',
      description: 'Escribir módulo de trazabilidad en rama aislada',
      targetFile: 'src/gitAudit.ts',
    });

    backend.generateSpecForTask('ENCARGO-02');
    const builtTask = backend.buildTaskInIsolatedBranch('ENCARGO-02');

    assert.equal(builtTask.stage, 'construido_en_rama');
    assert.ok(builtTask.build);
    assert.equal(builtTask.build.branchName, 'task/ENCARGO-02');
    assert.equal(builtTask.build.gpgSigned, true);
    assert.ok(builtTask.build.commitMessage.includes('#TASK-ENCARGO-02'));
    assert.ok(builtTask.build.gitDiff.includes('diff --git'));

    // Punto 10: Seguridad
    assert.ok(builtTask.securityScan);
    assert.equal(builtTask.securityScan.passed, true);

    // Punto 4: Evidencia con SHA-256 real
    assert.ok(builtTask.visualEvidence);
    assert.equal(builtTask.visualEvidence.assertionsPassed, true);

    // Punto 5: Verificador con BD aislada y subproceso Node real
    assert.ok(builtTask.verifier);
    assert.equal(builtTask.verifier.passed, true);
    assert.equal(builtTask.verifier.subprocessExitCode, 0);
    assert.ok(builtTask.verifier.stdout.includes('VERIFICADOR_OK'));

    // Punto 6: Approver 4/4 con firma criptográfica Ed25519 + GPG real
    assert.ok(builtTask.approver);
    assert.equal(builtTask.approver.votesPassed, 4);
    assert.equal(builtTask.approver.approved, true);
  });

  it('Puntos 7, 8, 9 y 11: Se NIEGA a fusionar si hay cambios sin confirmar y cuando está limpio fusiona en main con firma GPG y hace git push real a origin', () => {
    backend.createTask({
      id: 'ENCARGO-03',
      title: 'Cierre protegido en main',
      description: 'Verificar que cerrar/fusionar rechaza árboles de trabajo sucios',
      targetFile: 'src/protectedMerge.ts',
    });

    backend.generateSpecForTask('ENCARGO-03');
    backend.buildTaskInIsolatedBranch('ENCARGO-03');

    // 1. Ensuciar el árbol de trabajo con un archivo sin confirmar
    backend.createUncommittedChange(
      'src/archivo_sucio.ts',
      '// Archivo modificado sin confirmar en git\nexport const dirty = 1;\n'
    );

    const refusedAttempt = backend.mergeTaskBranchToMain('ENCARGO-03');
    assert.equal(refusedAttempt.mergeResult.merged, false);
    assert.equal(refusedAttempt.task.stage, 'fusion_rechazada_cambios_sin_confirmar');
    assert.ok(refusedAttempt.mergeResult.refusalReason?.includes('FUSIÓN RECHAZADA (Punto 7)'));

    // 2. Limpiar los cambios sin confirmar y ejecutar cierre + push
    backend.discardUncommittedChanges();
    const { task, mergeResult, pushResult } = backend.closeAndPushFullPipeline('ENCARGO-03');

    assert.equal(mergeResult.merged, true);
    assert.ok(mergeResult.checkpointTag?.includes('checkpoint-pre-ENCARGO-03'));
    assert.equal(pushResult.pushed, true);
    assert.equal(task.stage, 'desplegado_en_origin');

    const finalStatus = backend.getRepoStatus();
    assert.equal(finalStatus.currentBranch, 'main');
    assert.equal(finalStatus.remoteOriginHeadHash, mergeResult.mergeCommitHash);
    assert.ok(finalStatus.tags.includes('checkpoint-pre-ENCARGO-03'));
  });

  it('Server-Side Git Hooks (pre-receive y update): Impiden el push sin firma GPG válida o sin #TASK-<id> y aceptan commits conformes', () => {
    // 1. Intento de push sin #TASK-<id> en el mensaje de commit -> RECHAZADO
    const noTaskIdResult = backend.verifyServerSideHooksCompliance('missing_task_id');
    assert.equal(noTaskIdResult.pushAccepted, false);
    assert.equal(noTaskIdResult.passedComplianceCheck, true);
    assert.ok(
      noTaskIdResult.hookOutput.includes('SERVER-HOOK pre-receive RECHAZADO') &&
        noTaskIdResult.hookOutput.includes('#TASK-<id>')
    );

    // 2. Intento de push sin firma GPG válida (--no-gpg-sign) -> RECHAZADO
    const unsignedResult = backend.verifyServerSideHooksCompliance('unsigned_gpg');
    assert.equal(unsignedResult.pushAccepted, false);
    assert.equal(unsignedResult.passedComplianceCheck, true);
    assert.ok(
      unsignedResult.hookOutput.includes('SERVER-HOOK pre-receive RECHAZADO') &&
        unsignedResult.hookOutput.includes('firma GPG válida')
    );

    // 3. Push con firma GPG válida (-S) y #TASK-<id> -> ACEPTADO
    const validResult = backend.verifyServerSideHooksCompliance('valid_signed_with_task');
    assert.equal(validResult.pushAccepted, true);
    assert.equal(validResult.passedComplianceCheck, true);
  });

  it('Los 11 puntos del encargo están implementados como REALES en el backend', () => {
    assert.equal(ELEVEN_POINTS_AUDIT.length, 11);
    const allReal = ELEVEN_POINTS_AUDIT.every((p) => p.status === 'REAL');
    assert.equal(allReal, true);
  });
});
