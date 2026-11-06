/**
 * Pruebas automáticas reales del backend GitFactory (Puntos 2, 3 y 7)
 * Regla 4: Pruebas automáticas que NO llaman a ningún modelo externo.
 * Ejecutan el binario `git` real de Linux sobre repositorios temporales aislados en `/tmp`.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { GitFactoryBackend, ELEVEN_POINTS_AUDIT } from './gitFactory';

describe('Backend Real GitFactory — Puntos 2, 3 y 7 (Sin llamadas a modelos)', () => {
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
  });

  it('Inicializa un repositorio Git real en la rama main con árbol limpio', () => {
    const status = backend.getRepoStatus();
    assert.equal(status.currentBranch, 'main');
    assert.equal(status.isClean, true);
    assert.equal(status.uncommittedFiles.length, 0);
    assert.ok(status.headCommitHash.length >= 7);
    assert.ok(fs.existsSync(path.join(tempRepoDir, '.git')));
  });

  it('Punto 2 (Spec): Genera y persiste la especificación en disco antes de construir', () => {
    const task = backend.createTask({
      id: 'ENCARGO-01',
      title: 'Validar token de sesión',
      description: 'Crear validador determinista de caducidad de sesión',
      targetFile: 'src/sessionValidator.ts',
    });

    assert.equal(task.stage, 'pendiente_spec');
    assert.equal(task.spec, null);

    // Intentar construir sin spec debe fallar
    assert.throws(
      () => backend.buildTaskInIsolatedBranch('ENCARGO-01'),
      /sin haber generado primero su especificación \(Punto 2\)/
    );

    const updated = backend.generateSpecForTask('ENCARGO-01');
    assert.equal(updated.stage, 'spec_generado');
    assert.ok(updated.spec);
    assert.equal(updated.spec.specFilePath, 'specs/ENCARGO-01.md');
    assert.equal(updated.spec.adapterMode, 'SIMULADO_DETERMINISTA_SIN_LLM');
    assert.ok(updated.spec.markdownContent.includes('Validar token de sesión'));
  });

  it('Punto 3 (Builder en rama aislada): Crea rama Git real task/<id>, confirma archivos y obtiene diff real', () => {
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
    assert.ok(builtTask.build.commitHash.length >= 7);
    assert.ok(builtTask.build.modifiedFiles.includes('specs/ENCARGO-02.md'));
    assert.ok(builtTask.build.modifiedFiles.includes('src/gitAudit.ts'));
    assert.ok(builtTask.build.gitDiff.includes('diff --git'));

    // Verificar directamente con git real que la rama existe y contiene los archivos
    const status = backend.getRepoStatus();
    assert.equal(status.currentBranch, 'task/ENCARGO-02');
    assert.ok(status.branches.includes('main'));
    assert.ok(status.branches.includes('task/ENCARGO-02'));
    assert.ok(fs.existsSync(path.join(tempRepoDir, 'src/gitAudit.ts')));
    assert.ok(fs.existsSync(path.join(tempRepoDir, 'specs/ENCARGO-02.md')));
  });

  it('Punto 7 (Fusión protegida): Se NIEGA a fusionar en main si hay cambios sin confirmar y fusiona cuando se limpia', () => {
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

    const dirtyStatus = backend.getRepoStatus();
    assert.equal(dirtyStatus.isClean, false);
    assert.ok(dirtyStatus.uncommittedFiles.some((f) => f.includes('src/archivo_sucio.ts')));

    // 2. Intentar fusionar en `main`: DEBE NEGARSE rotundamente
    const refusedAttempt = backend.mergeTaskBranchToMain('ENCARGO-03');
    assert.equal(refusedAttempt.mergeResult.merged, false);
    assert.equal(refusedAttempt.task.stage, 'fusion_rechazada_cambios_sin_confirmar');
    assert.ok(refusedAttempt.mergeResult.refusalReason?.includes('FUSIÓN RECHAZADA (Punto 7)'));
    assert.ok(
      refusedAttempt.mergeResult.uncommittedFiles.some((f) =>
        f.includes('src/archivo_sucio.ts')
      )
    );

    // 3. Limpiar los cambios sin confirmar y volver a intentar la fusión
    backend.discardUncommittedChanges();
    const cleanStatus = backend.getRepoStatus();
    assert.equal(cleanStatus.isClean, true);

    const acceptedAttempt = backend.mergeTaskBranchToMain('ENCARGO-03');
    assert.equal(acceptedAttempt.mergeResult.merged, true);
    assert.equal(acceptedAttempt.task.stage, 'fusionado_en_main');
    assert.ok(acceptedAttempt.mergeResult.mergeCommitHash);

    // Verificar que ahora estamos en `main` y el archivo construido en la rama aislada ya está fusionado en `main`
    const finalStatus = backend.getRepoStatus();
    assert.equal(finalStatus.currentBranch, 'main');
    assert.equal(finalStatus.isClean, true);
    assert.ok(fs.existsSync(path.join(tempRepoDir, 'src/protectedMerge.ts')));
    assert.ok(fs.existsSync(path.join(tempRepoDir, 'specs/ENCARGO-03.md')));
  });

  it('Declara honestamente cuáles de los 11 puntos son REALES y cuáles SIMULADOS', () => {
    assert.equal(ELEVEN_POINTS_AUDIT.length, 11);
    const realPoints = ELEVEN_POINTS_AUDIT.filter((p) => p.status === 'REAL').map(
      (p) => p.pointNumber
    );
    assert.deepEqual(realPoints, [2, 3, 7]);
  });
});
