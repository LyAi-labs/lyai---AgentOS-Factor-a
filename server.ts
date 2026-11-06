/**
 * Servidor Backend Real de la Factoría Agéntica (Node 20+ sobre Linux)
 * - Ejecuta los 11 puntos del encargo con operaciones reales de Git, archivos, subprocesos Node y criptografía Ed25519.
 * - Sincroniza el grafo de 25 nodos y 5 capas con el estado real del repositorio Git en Linux.
 */

import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  GitFactoryBackend,
  ELEVEN_POINTS_AUDIT,
} from './src/backend/gitFactory';
import { INITIAL_NODES, INITIAL_EDGES } from './src/pipeline/graphData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = 3000;

const gitFactory = new GitFactoryBackend();

// Si no hay tareas previas, creamos y cerramos la primera tarea real para que el repositorio arranque con todo verificado
if (gitFactory.getTasks().length === 0) {
  gitFactory.createTask({
    id: 'ENCARGO-001',
    title: 'Implementar validador de cierre limpio Git',
    description:
      'Ejecución real de los 11 puntos: Ingesta/Analyze (P1), Spec coherente (P2), Rama aislada Git (P3), Evidencia SHA-256 (P4), Verificador en subproceso + BD aislada (P5), Firma Ed25519 + Approver 4/4 (P6), Fusión protegida en main (P7), Router + Tu OK Ignacio (P8), Checkpoint Tag (P9), Brain/Seguridad (P10) y Push a origin (P11).',
    targetFile: 'src/validadorCierreGit.ts',
  });
  gitFactory.closeAndPushFullPipeline('ENCARGO-001');
}

const app = express();
app.use(express.json());

const httpServer = createServer(app);

app.get('/api/health', (_req, res) => {
  const repoStatus = gitFactory.getRepoStatus();
  res.json({
    status: 'ok',
    backend: 'node-linux-real-git-11-points',
    gitBranch: repoStatus.currentBranch,
    gitHead: repoStatus.headCommitHash,
    worktreeClean: repoStatus.isClean,
  });
});

app.get('/api/factory/state', (_req, res) => {
  try {
    const repo = gitFactory.getRepoStatus();
    const tasks = gitFactory.getTasks();
    const latestTask = tasks[0] || null;
    const activeSet = new Set(latestTask?.activeGraphNodes || []);

    // Sincronizar el estado de los nodos del grafo con los nodos realmente ejecutados por la tarea activa
    const syncedNodes = INITIAL_NODES.map((n) => ({
      ...n,
      status: activeSet.has(n.id) ? ('success' as const) : ('idle' as const),
      currentTaskId: activeSet.has(n.id) ? latestTask?.id : undefined,
    }));

    const syncedEdges = INITIAL_EDGES.map((e) => ({
      ...e,
      active: activeSet.has(e.source) && activeSet.has(e.target),
    }));

    res.json({
      repo,
      tasks,
      elevenPointsAudit: ELEVEN_POINTS_AUDIT,
      graph: {
        nodes: syncedNodes,
        edges: syncedEdges,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al leer el estado de Git',
    });
  }
});

app.post('/api/factory/tasks', (req, res) => {
  try {
    const { id, title, description, targetFile, lane, acceptanceCriteria } = req.body || {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'El título del encargo es obligatorio.' });
    }
    const task = gitFactory.createTask({
      id,
      title,
      description: description || '',
      targetFile,
      lane,
      acceptanceCriteria,
    });
    res.status(201).json({
      task,
      repo: gitFactory.getRepoStatus(),
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Error al crear el encargo',
    });
  }
});

app.post('/api/factory/tasks/:id/spec', (req, res) => {
  try {
    const task = gitFactory.generateSpecForTask(req.params.id);
    res.json({
      task,
      repo: gitFactory.getRepoStatus(),
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Error al generar la especificación (Punto 2)',
    });
  }
});

app.post('/api/factory/tasks/:id/build', (req, res) => {
  try {
    const task = gitFactory.buildTaskInIsolatedBranch(req.params.id);
    res.json({
      task,
      repo: gitFactory.getRepoStatus(),
    });
  } catch (error) {
    res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : 'Error al construir en rama aislada con Git (Punto 3)',
    });
  }
});

app.post('/api/factory/tasks/:id/ignacio-ok', (req, res) => {
  try {
    const { approved } = req.body || {};
    const task = gitFactory.setIgnacioApproval(req.params.id, Boolean(approved));
    res.json({
      task,
      repo: gitFactory.getRepoStatus(),
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Error al actualizar Tu OK · Ignacio',
    });
  }
});

app.post('/api/factory/tasks/:id/merge', (req, res) => {
  try {
    const { task, mergeResult } = gitFactory.mergeTaskBranchToMain(req.params.id);
    const repo = gitFactory.getRepoStatus();
    if (!mergeResult.merged) {
      return res.status(409).json({
        error: mergeResult.refusalReason,
        task,
        mergeResult,
        repo,
      });
    }
    res.json({
      task,
      mergeResult,
      repo,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Error al fusionar en main (Punto 7)',
    });
  }
});

app.post('/api/factory/tasks/:id/close-and-push', (req, res) => {
  try {
    const { task, mergeResult, pushResult } = gitFactory.closeAndPushFullPipeline(req.params.id);
    const repo = gitFactory.getRepoStatus();
    if (!mergeResult.merged) {
      return res.status(409).json({
        error: mergeResult.refusalReason,
        task,
        mergeResult,
        pushResult,
        repo,
      });
    }
    res.json({
      task,
      mergeResult,
      pushResult,
      repo,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Error al cerrar y hacer push',
    });
  }
});

app.post('/api/factory/git/push', (req, res) => {
  try {
    const { remote } = req.body || {};
    const pushResult = gitFactory.pushMainToRemote(remote || 'origin');
    const repo = gitFactory.getRepoStatus();
    if (!pushResult.pushed) {
      return res.status(400).json({
        error: pushResult.errorReason,
        pushResult,
        repo,
      });
    }
    res.json({
      pushResult,
      repo,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Error en git push',
    });
  }
});

app.get('/api/factory/git/bundle', (_req, res) => {
  try {
    const bundlePath = gitFactory.createGitBundle();
    res.download(bundlePath, 'lyai-ski.bundle');
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al generar git bundle',
    });
  }
});

app.post('/api/factory/git/dirty', (req, res) => {
  try {
    const { filePath, content } = req.body || {};
    const repo = gitFactory.createUncommittedChange(filePath, content);
    res.json({
      message: 'Archivo sin confirmar escrito en el árbol de trabajo real.',
      repo,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Error al escribir cambio sin confirmar',
    });
  }
});

app.post('/api/factory/git/clean', (_req, res) => {
  try {
    const repo = gitFactory.discardUncommittedChanges();
    res.json({
      message: 'Árbol de trabajo limpiado en Git real.',
      repo,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Error al limpiar el árbol de trabajo',
    });
  }
});

app.get('/api/factory/git/hooks', (_req, res) => {
  try {
    res.json({
      hooks: gitFactory.getServerHooksStatus(),
      repo: gitFactory.getRepoStatus(),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al leer el estado de los server-side hooks',
    });
  }
});

app.post('/api/factory/git/hooks/verify', (req, res) => {
  try {
    const { scenario } = req.body || {};
    const validScenarios = ['missing_task_id', 'unsigned_gpg', 'valid_signed_with_task'] as const;
    const chosenScenario = validScenarios.includes(scenario)
      ? scenario
      : 'missing_task_id';
    const result = gitFactory.verifyServerSideHooksCompliance(chosenScenario);
    const repo = gitFactory.getRepoStatus();
    res.json({
      result,
      repo,
    });
  } catch (error) {
    res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : 'Error al verificar los server-side git hooks (pre-receive, update)',
    });
  }
});


async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Backend GitFactory (11 Puntos REALES) en http://0.0.0.0:${PORT}`);
  });
}

startServer();
