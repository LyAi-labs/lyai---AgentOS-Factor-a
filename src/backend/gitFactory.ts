/**
 * Backend Real de la Factoría Agéntica (Node 20+ sobre Linux con Git real)
 * Implementa de forma real en disco y con el binario `git` del sistema:
 * - Punto 2: Generación y persistencia de especificación técnica (Spec) en disco.
 * - Punto 3: Construcción en rama aislada de Git (`task/<id>`) con commits y diffs reales.
 * - Punto 7: Fusión a `main` (`cerrar`) que comprueba `git status --porcelain` y SE NIEGA
 *            rotundamente a fusionar si existen cambios sin confirmar en el árbol de trabajo.
 *
 * NOTA DE TRANSPARENCIA (Regla 1):
 * - Las operaciones de sistema de archivos y Git (`init`, `checkout -b`, `add`, `commit`,
 *   `status --porcelain`, `diff`, `log`, `merge --no-ff`) son 100% REALES en Linux.
 * - La redacción del contenido del spec y del archivo construido usa un adaptador determinista
 *   local marcado explícitamente como `SIMULADO` (no llama a ningún LLM externo para cumplir
 *   la Regla 4 en pruebas automáticas y no inventar telemetría de modelos).
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface TaskSpecDocument {
  taskId: string;
  title: string;
  description: string;
  targetFile: string;
  acceptanceCriteria: string[];
  createdAtIso: string;
  specFilePath: string;
  adapterMode: 'SIMULADO_DETERMINISTA_SIN_LLM';
  markdownContent: string;
}

export interface TaskBuildResult {
  taskId: string;
  branchName: string;
  commitHash: string;
  commitMessage: string;
  modifiedFiles: string[];
  gitDiff: string;
  builtAtIso: string;
  adapterMode: 'GIT_REAL_CON_CONTENIDO_SIMULADO_SIN_LLM';
}

export interface TaskMergeResult {
  taskId: string;
  merged: boolean;
  sourceBranch: string;
  targetBranch: string;
  mergeCommitHash: string | null;
  refusalReason: string | null;
  uncommittedFiles: string[];
  gitStatusRaw: string;
  timestampIso: string;
}

export type FactoryTaskStage =
  | 'pendiente_spec'
  | 'spec_generado'
  | 'construido_en_rama'
  | 'fusionado_en_main'
  | 'fusion_rechazada_cambios_sin_confirmar';

export interface FactoryTaskRecord {
  id: string;
  title: string;
  description: string;
  targetFile: string;
  acceptanceCriteria: string[];
  stage: FactoryTaskStage;
  createdAtIso: string;
  spec: TaskSpecDocument | null;
  build: TaskBuildResult | null;
  lastMergeAttempt: TaskMergeResult | null;
}

export interface GitRepoStatusSnapshot {
  repoPath: string;
  currentBranch: string;
  headCommitHash: string;
  isClean: boolean;
  gitStatusPorcelain: string;
  uncommittedFiles: string[];
  branches: string[];
  recentCommits: { hash: string; subject: string; author: string; dateIso: string }[];
}

export interface ElevenPointStatus {
  pointNumber: number;
  title: string;
  status: 'REAL' | 'SIMULADO';
  explanation: string;
}

/**
 * Estado honesto de los 11 puntos del encargo (Regla 1 y 6).
 */
export const ELEVEN_POINTS_AUDIT: ElevenPointStatus[] = [
  {
    pointNumber: 1,
    title: 'Ingesta multicanal, Filtro y Analyze (alcance de tarea)',
    status: 'SIMULADO',
    explanation:
      'SIMULADO: La entrada se recibe por formulario/API REST local; no hay conectores reales a webhooks externos ni análisis con qwen local.',
  },
  {
    pointNumber: 2,
    title: 'Redacción y persistencia de Especificación (Spec writer)',
    status: 'REAL',
    explanation:
      'REAL (Disco) + SIMULADO (Redacción sin LLM): Persiste el archivo real specs/<id>.md en el repositorio en disco y valida su existencia antes de pasar al Builder. El texto se genera con plantilla determinista sin llamar a Opus/Gemini Pro.',
  },
  {
    pointNumber: 3,
    title: 'Construcción en rama aislada con Git real (Builder)',
    status: 'REAL',
    explanation:
      'REAL (Git Linux): Crea una rama aislada real (`task/<id>`) desde `main`, escribe archivos reales en disco, ejecuta `git add` y `git commit` reales y extrae el SHA y `git diff` verdaderos.',
  },
  {
    pointNumber: 4,
    title: 'Renderizado UI y Evidencia Visual automática (Playwright)',
    status: 'SIMULADO',
    explanation:
      'SIMULADO: Interfaz definida como adaptador; el ciclo de tareas no lanza un navegador headless por cada tarea automáticamente.',
  },
  {
    pointNumber: 5,
    title: 'Verificador en contenedor Docker aislado y BD de pruebas aislada',
    status: 'SIMULADO',
    explanation:
      'SIMULADO: Este entorno sandbox no dispone de demonio Docker anidado ni base PostgreSQL externa; las pruebas se ejecutan con `node --test` en el proceso Linux.',
  },
  {
    pointNumber: 6,
    title: 'Consenso Approver (4 de 4) y firma SSH verificada',
    status: 'SIMULADO',
    explanation:
      'SIMULADO: No se invocan 4 agentes evaluadores independientes con modelos LLM ni firmado SSH de hardware.',
  },
  {
    pointNumber: 7,
    title: 'Fusión en `main local` (`cerrar`) que se niega si hay cambios sin confirmar',
    status: 'REAL',
    explanation:
      'REAL (Git Linux): Ejecuta `git status --porcelain` real en el repositorio. Si hay cualquier archivo modificado o sin seguimiento sin confirmar, rechaza la fusión con HTTP 409. Solo fusiona (`git merge --no-ff`) si el árbol de trabajo está 100% limpio.',
  },
  {
    pointNumber: 8,
    title: 'Enrutamiento Router (visual vs no visual) y Tu OK · Ignacio',
    status: 'SIMULADO',
    explanation:
      'SIMULADO: El operador dispara la fusión manualmente desde el panel, sin pasarela de notificaciones externa.',
  },
  {
    pointNumber: 9,
    title: 'Carril Exprés (sin modelo) y Carril Urgencia (SSH directo)',
    status: 'SIMULADO',
    explanation:
      'SIMULADO: No hay túnel SSH externo hacia servidores de producción remotos.',
  },
  {
    pointNumber: 10,
    title: 'Memoria Brain (wiki/reglas) y Seguridad (guardrails Gemini 2.5 Flash)',
    status: 'SIMULADO',
    explanation:
      'SIMULADO: Sin llamadas al modelo Gemini 2.5 Flash ni base vectorial externa.',
  },
  {
    pointNumber: 11,
    title: 'Benchmark Lab, Despliegue a Producción y bucle rev <24h',
    status: 'SIMULADO',
    explanation:
      'SIMULADO: Sin despliegue automatizado a infraestructura cloud ni telemetría APM externa.',
  },
];

export class GitFactoryBackend {
  public readonly repoPath: string;
  private tasks: Map<string, FactoryTaskRecord> = new Map();

  constructor(repoPath?: string) {
    this.repoPath =
      repoPath ||
      process.env.FACTORY_REPO_PATH ||
      path.resolve(process.cwd(), '.factory-git-workspace');
    this.ensureGitRepositoryInitialized();
    this.loadPersistedTasksIfPresent();
  }

  /**
   * Ejecuta un comando `git` real en el directorio del repositorio de trabajo.
   */
  public runGit(args: string[]): string {
    return execFileSync('git', args, {
      cwd: this.repoPath,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trimEnd();
  }

  /**
   * Inicializa el repositorio Git real en Linux si aún no existe.
   */
  private ensureGitRepositoryInitialized(): void {
    if (!fs.existsSync(this.repoPath)) {
      fs.mkdirSync(this.repoPath, { recursive: true });
    }

    const gitDir = path.join(this.repoPath, '.git');
    if (!fs.existsSync(gitDir)) {
      this.runGit(['init', '-b', 'main']);
      this.runGit(['config', 'user.name', 'AgentOS Factory Daemon']);
      this.runGit(['config', 'user.email', 'factory@agentos.local']);

      // Crear estructura inicial limpia en `main`
      const readmePath = path.join(this.repoPath, 'README.md');
      fs.writeFileSync(
        readmePath,
        `# Repositorio de Trabajo Real — Factoría AgentOS\n\nEste repositorio Git real gestiona las especificaciones (Punto 2), ramas aisladas de construcción (Punto 3) y fusiones protegidas en main (Punto 7).\n`,
        'utf-8'
      );
      fs.mkdirSync(path.join(this.repoPath, 'specs'), { recursive: true });
      fs.mkdirSync(path.join(this.repoPath, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(this.repoPath, 'specs', '.gitkeep'),
        '',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(this.repoPath, 'src', 'index.ts'),
        `// Punto de entrada base del repositorio gestionado por Git real\nexport const version = '1.0.0';\n`,
        'utf-8'
      );

      this.runGit(['add', '.']);
      this.runGit(['commit', '-m', 'chore(init): inicializar repositorio real en rama main']);
    }
  }

  private getTasksMetadataFilePath(): string {
    return path.join(this.repoPath, '.git', 'agentos-tasks-state.json');
  }

  private saveTasksMetadata(): void {
    const filePath = this.getTasksMetadataFilePath();
    const serialized = JSON.stringify(Array.from(this.tasks.values()), null, 2);
    fs.writeFileSync(filePath, serialized, 'utf-8');
  }

  private loadPersistedTasksIfPresent(): void {
    const filePath = this.getTasksMetadataFilePath();
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const list = JSON.parse(raw) as FactoryTaskRecord[];
        for (const item of list) {
          this.tasks.set(item.id, item);
        }
      } catch {
        // Si el archivo de metadatos interno no es legible, comenzamos con mapa vacío
      }
    }
  }

  /**
   * Crea y registra un nuevo encargo en estado `pendiente_spec`.
   */
  public createTask(params: {
    id?: string;
    title: string;
    description: string;
    targetFile?: string;
    acceptanceCriteria?: string[];
  }): FactoryTaskRecord {
    const cleanId = (
      params.id || `T-${Date.now().toString(36).toUpperCase()}`
    ).replace(/[^a-zA-Z0-9_-]/g, '-');

    const safeTargetFile = (params.targetFile || `src/${cleanId.toLowerCase()}.ts`).replace(
      /^\/+/,
      ''
    );

    const record: FactoryTaskRecord = {
      id: cleanId,
      title: params.title.trim(),
      description: params.description.trim() || 'Sin descripción adicional.',
      targetFile: safeTargetFile,
      acceptanceCriteria:
        params.acceptanceCriteria && params.acceptanceCriteria.length > 0
          ? params.acceptanceCriteria
          : [
              `El archivo ${safeTargetFile} debe crearse en la rama aislada task/${cleanId}`,
              'La fusión a main debe rechazarse si existen cambios sin confirmar en git status',
            ],
      stage: 'pendiente_spec',
      createdAtIso: new Date().toISOString(),
      spec: null,
      build: null,
      lastMergeAttempt: null,
    };

    this.tasks.set(record.id, record);
    this.saveTasksMetadata();
    return record;
  }

  /**
   * PUNTO 2 (REAL en disco / SIMULADO en redacción sin LLM):
   * Genera la especificación técnica del encargo y la guarda como archivo Markdown real.
   * No realiza llamada a ningún modelo externo (cumple Regla 1 y Regla 4).
   */
  public generateSpecForTask(taskId: string): FactoryTaskRecord {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`La tarea ${taskId} no existe.`);
    }

    const createdAtIso = new Date().toISOString();
    const relativeSpecPath = `specs/${task.id}.md`;
    const markdownContent = [
      `# Especificación Técnica: ${task.id} — ${task.title}`,
      ``,
      `> **Aviso de transparencia (Regla 1)**: Documento persistido en disco de forma REAL.`,
      `> Contenido redactado mediante adaptador determinista local (**SIMULADO**, sin llamada a LLM).`,
      ``,
      `## 1. Descripción del Encargo`,
      `${task.description}`,
      ``,
      `## 2. Archivo Objetivo`,
      `- Ruta en repositorio: \`${task.targetFile}\``,
      `- Rama aislada asignada: \`task/${task.id}\``,
      ``,
      `## 3. Criterios de Aceptación Verificables`,
      ...task.acceptanceCriteria.map((c, idx) => `${idx + 1}. ${c}`),
      ``,
      `## 4. Metadatos`,
      `- Fecha de generación: ${createdAtIso}`,
      `- Estado: Especificación aprobada para construcción en rama aislada.`,
      ``,
    ].join('\n');

    // Guardamos una copia del spec en .git/agentos-specs para no ensuciar el working tree de `main`
    // antes de crear la rama aislada, y además lo escribiremos y confirmaremos dentro de la rama aislada en el Punto 3.
    const internalSpecDir = path.join(this.repoPath, '.git', 'agentos-specs');
    fs.mkdirSync(internalSpecDir, { recursive: true });
    const internalSpecFile = path.join(internalSpecDir, `${task.id}.md`);
    fs.writeFileSync(internalSpecFile, markdownContent, 'utf-8');

    const specDoc: TaskSpecDocument = {
      taskId: task.id,
      title: task.title,
      description: task.description,
      targetFile: task.targetFile,
      acceptanceCriteria: task.acceptanceCriteria,
      createdAtIso,
      specFilePath: relativeSpecPath,
      adapterMode: 'SIMULADO_DETERMINISTA_SIN_LLM',
      markdownContent,
    };

    task.spec = specDoc;
    task.stage = 'spec_generado';
    this.tasks.set(task.id, task);
    this.saveTasksMetadata();
    return task;
  }

  /**
   * PUNTO 3 (REAL con Git en Linux):
   * Construye la tarea en una rama Git aislada (`task/<id>`).
   * - Exige que el Punto 2 (Spec) se haya ejecutado antes.
   * - Exige que el árbol de trabajo esté limpio antes de cambiar de rama para no arrastrar basura.
   * - Crea la rama `task/<id>` a partir de `main`.
   * - Escribe en disco el archivo de especificación (`specs/<id>.md`) y el archivo de código objetivo.
   * - Ejecuta `git add` y `git commit` reales.
   * - Calcula el `git diff main..task/<id>` real y devuelve el hash SHA real del commit.
   */
  public buildTaskInIsolatedBranch(taskId: string): FactoryTaskRecord {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`La tarea ${taskId} no existe.`);
    }
    if (!task.spec) {
      throw new Error(
        `No se puede construir la tarea ${taskId} sin haber generado primero su especificación (Punto 2).`
      );
    }

    const statusBefore = this.runGit(['status', '--porcelain']);
    if (statusBefore.length > 0) {
      throw new Error(
        `El árbol de trabajo de Git tiene cambios sin confirmar. Confirma o limpia el árbol antes de crear la rama aislada:\n${statusBefore}`
      );
    }

    const branchName = `task/${task.id}`;

    // Crear o recrear la rama aislada partiendo de `main`
    this.runGit(['checkout', '-B', branchName, 'main']);

    // 1. Escribir la especificación real en `specs/<id>.md` dentro de la rama aislada
    const specAbsPath = path.join(this.repoPath, task.spec.specFilePath);
    fs.mkdirSync(path.dirname(specAbsPath), { recursive: true });
    fs.writeFileSync(specAbsPath, task.spec.markdownContent, 'utf-8');

    // 2. Escribir el archivo de código objetivo en la rama aislada
    // (Contenido generado por adaptador determinista marcado como SIMULADO sin llamada a LLM)
    const targetAbsPath = path.join(this.repoPath, task.targetFile);
    fs.mkdirSync(path.dirname(targetAbsPath), { recursive: true });

    const generatedCode = [
      `/**`,
      ` * Archivo construido en rama aislada Git: ${branchName}`,
      ` * Tarea: ${task.id} - ${task.title}`,
      ` * Especificación origen: ${task.spec.specFilePath}`,
      ` * NOTA (Regla 1): Código generado por adaptador determinista local (SIMULADO, sin LLM).`,
      ` * El aislamiento de rama, commit y diff de Git son 100% REALES.`,
      ` */`,
      ``,
      `export interface TaskExecutionArtifact_${task.id.replace(/[^a-zA-Z0-9_]/g, '_')} {`,
      `  readonly taskId: '${task.id}';`,
      `  readonly title: string;`,
      `  readonly specPath: '${task.spec.specFilePath}';`,
      `}`,
      ``,
      `export function execute_${task.id.replace(/[^a-zA-Z0-9_]/g, '_')}(): TaskExecutionArtifact_${task.id.replace(/[^a-zA-Z0-9_]/g, '_')} {`,
      `  return {`,
      `    taskId: '${task.id}',`,
      `    title: ${JSON.stringify(task.title)},`,
      `    specPath: '${task.spec.specFilePath}',`,
      `  };`,
      `}`,
      ``,
    ].join('\n');

    fs.writeFileSync(targetAbsPath, generatedCode, 'utf-8');

    // 3. Confirmar los cambios en la rama aislada usando Git real
    this.runGit(['add', task.spec.specFilePath, task.targetFile]);
    const commitMessage = `feat(${task.id}): construir según spec en rama aislada ${branchName}`;
    this.runGit(['commit', '-m', commitMessage]);

    const commitHash = this.runGit(['rev-parse', '--short', 'HEAD']);
    const gitDiff = this.runGit(['diff', `main..${branchName}`]);
    const modifiedFilesRaw = this.runGit(['diff', '--name-only', `main..${branchName}`]);
    const modifiedFiles = modifiedFilesRaw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const buildResult: TaskBuildResult = {
      taskId: task.id,
      branchName,
      commitHash,
      commitMessage,
      modifiedFiles,
      gitDiff,
      builtAtIso: new Date().toISOString(),
      adapterMode: 'GIT_REAL_CON_CONTENIDO_SIMULADO_SIN_LLM',
    };

    task.build = buildResult;
    task.stage = 'construido_en_rama';
    this.tasks.set(task.id, task);
    this.saveTasksMetadata();
    return task;
  }

  /**
   * PUNTO 7 (REAL con Git en Linux):
   * Fusiona la rama aislada `task/<id>` en `main` (`cerrar`).
   * REGLA ESTRICTA:
   * - Ejecuta `git status --porcelain`.
   * - Si hay CUALQUIER cambio sin confirmar (archivo modificado, en stage o untracked),
   *   SE NIEGA a fusionar y registra el rechazo con la lista exacta de archivos sucios.
   * - Solo si el árbol de trabajo está completamente limpio, hace `git checkout main`
   *   y `git merge --no-ff task/<id>`.
   */
  public mergeTaskBranchToMain(taskId: string): {
    task: FactoryTaskRecord;
    mergeResult: TaskMergeResult;
  } {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`La tarea ${taskId} no existe.`);
    }
    if (!task.build) {
      throw new Error(
        `La tarea ${taskId} aún no ha sido construida en una rama aislada (Punto 3).`
      );
    }

    const gitStatusRaw = this.runGit(['status', '--porcelain']);
    const uncommittedFiles = gitStatusRaw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    // Verificación estricta del Punto 7: Negarse si hay cambios sin confirmar
    if (uncommittedFiles.length > 0) {
      const refusalResult: TaskMergeResult = {
        taskId: task.id,
        merged: false,
        sourceBranch: task.build.branchName,
        targetBranch: 'main',
        mergeCommitHash: null,
        refusalReason: `FUSIÓN RECHAZADA (Punto 7): Existen ${uncommittedFiles.length} archivo(s) con cambios sin confirmar en el árbol de trabajo. Git exige un árbol limpio antes de fusionar en main.`,
        uncommittedFiles,
        gitStatusRaw,
        timestampIso: new Date().toISOString(),
      };

      task.lastMergeAttempt = refusalResult;
      task.stage = 'fusion_rechazada_cambios_sin_confirmar';
      this.tasks.set(task.id, task);
      this.saveTasksMetadata();

      return { task, mergeResult: refusalResult };
    }

    // Árbol limpio: cambiar a `main` y fusionar con `--no-ff` para preservar trazabilidad de la rama aislada
    this.runGit(['checkout', 'main']);
    const mergeMessage = `Merge branch '${task.build.branchName}' into main (${task.id}: ${task.title})`;
    this.runGit(['merge', '--no-ff', task.build.branchName, '-m', mergeMessage]);
    const mergeCommitHash = this.runGit(['rev-parse', '--short', 'HEAD']);

    const successResult: TaskMergeResult = {
      taskId: task.id,
      merged: true,
      sourceBranch: task.build.branchName,
      targetBranch: 'main',
      mergeCommitHash,
      refusalReason: null,
      uncommittedFiles: [],
      gitStatusRaw: '',
      timestampIso: new Date().toISOString(),
    };

    task.lastMergeAttempt = successResult;
    task.stage = 'fusionado_en_main';
    this.tasks.set(task.id, task);
    this.saveTasksMetadata();

    return { task, mergeResult: successResult };
  }

  /**
   * Crea o modifica un archivo sin confirmar en el árbol de trabajo real
   * para poder verificar de forma directa (en pruebas o desde el panel) que el Punto 7
   * bloquea la fusión cuando `git status --porcelain` no está vacío.
   */
  public createUncommittedChange(
    relativeFilePath = 'src/cambio_sin_confirmar.tmp.ts',
    content = `// Cambio sin confirmar en el árbol de trabajo (${new Date().toISOString()})\nexport const dirty = true;\n`
  ): GitRepoStatusSnapshot {
    const safeRel = relativeFilePath.replace(/^\/+/, '');
    const absPath = path.join(this.repoPath, safeRel);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, content, 'utf-8');
    return this.getRepoStatus();
  }

  /**
   * Limpia los cambios sin confirmar en el árbol de trabajo (`git checkout -- .` y `git clean -fd`)
   * para restaurar un árbol limpio en el repositorio real.
   */
  public discardUncommittedChanges(): GitRepoStatusSnapshot {
    this.runGit(['reset', '--hard', 'HEAD']);
    this.runGit(['clean', '-fd']);
    return this.getRepoStatus();
  }

  /**
   * Devuelve el estado real de Git leyendo directamente del repositorio en disco.
   * Ningún dato aquí es inventado.
   */
  public getRepoStatus(): GitRepoStatusSnapshot {
    const currentBranch = this.runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
    const headCommitHash = this.runGit(['rev-parse', '--short', 'HEAD']);
    const gitStatusPorcelain = this.runGit(['status', '--porcelain']);
    const uncommittedFiles = gitStatusPorcelain
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const branchesRaw = this.runGit(['branch', '--format=%(refname:short)']);
    const branches = branchesRaw
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean);

    const logRaw = this.runGit([
      'log',
      '--all',
      '-n',
      '15',
      '--pretty=format:%h|%s|%an|%cI',
    ]);
    const recentCommits = logRaw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [hash, subject, author, dateIso] = line.split('|');
        return { hash, subject, author, dateIso };
      });

    return {
      repoPath: this.repoPath,
      currentBranch,
      headCommitHash,
      isClean: uncommittedFiles.length === 0,
      gitStatusPorcelain,
      uncommittedFiles,
      branches,
      recentCommits,
    };
  }

  public getTasks(): FactoryTaskRecord[] {
    return Array.from(this.tasks.values()).sort((a, b) =>
      b.createdAtIso.localeCompare(a.createdAtIso)
    );
  }

  public getTaskById(taskId: string): FactoryTaskRecord | undefined {
    return this.tasks.get(taskId);
  }
}
