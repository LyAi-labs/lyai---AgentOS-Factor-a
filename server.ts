/**
 * Servidor Backend Real de la Factoría Agéntica (Node 20+ sobre Linux)
 * - Regla 1: Ningún dato inventado presentado como real. Todo lo que no está implementado
 *   en este entorno está explícitamente marcado como SIMULADO en ELEVEN_POINTS_AUDIT.
 * - Regla 2: El núcleo es este backend que corre en Linux y usa `git` real (Puntos 2, 3 y 7).
 *   La web es únicamente el panel que muestra los datos reales que devuelve este servidor.
 */

import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  GitFactoryBackend,
  ELEVEN_POINTS_AUDIT,
} from './src/backend/gitFactory';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

// Instancia única del backend con repositorio Git real en Linux
const gitFactory = new GitFactoryBackend();

// Si no hay tareas previas en el repositorio de trabajo, creamos una tarea inicial real
// en estado `pendiente_spec` para que el operador pueda probar los pasos 2 -> 3 -> 7 directamente.
if (gitFactory.getTasks().length === 0) {
  gitFactory.createTask({
    id: 'ENCARGO-001',
    title: 'Implementar validador de cierre limpio Git',
    description:
      'Verificar que el flujo genera spec en disco (Punto 2), construye en rama aislada Git (Punto 3) y bloquea la fusión en main si hay cambios sin confirmar (Punto 7).',
    targetFile: 'src/validadorCierreGit.ts',
    acceptanceCriteria: [
      'Debe existir specs/ENCARGO-001.md antes de construir.',
      'Debe crearse la rama aislada task/ENCARGO-001 con commit real en Git.',
      'La fusión en main debe rechazarse si git status --porcelain no está vacío.',
    ],
  });
}

const app = express();
app.use(express.json());

const httpServer = createServer(app);

// =========================================================================
// ENDPOINTS REALES DEL BACKEND (Cero métricas falsas: sin p99, CPU, AST ni throughput inventados)
// =========================================================================

app.get('/api/health', (_req, res) => {
  const repoStatus = gitFactory.getRepoStatus();
  res.json({
    status: 'ok',
    backend: 'node-linux-real-git',
    gitBranch: repoStatus.currentBranch,
    gitHead: repoStatus.headCommitHash,
    worktreeClean: repoStatus.isClean,
  });
});

/**
 * Devuelve el estado completo y real del backend:
 * - Estado real de Git (`git status --porcelain`, ramas reales, commits reales de `git log`)
 * - Lista de encargos reales y sus artefactos reales (spec, diff de Git, resultado de fusión)
 * - Auditoría honesta de los 11 puntos del encargo (cuáles son REALES y cuáles SIMULADOS)
 */
app.get('/api/factory/state', (_req, res) => {
  try {
    const repo = gitFactory.getRepoStatus();
    const tasks = gitFactory.getTasks();
    res.json({
      repo,
      tasks,
      elevenPointsAudit: ELEVEN_POINTS_AUDIT,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error al leer el estado de Git',
    });
  }
});

/**
 * Crear un nuevo encargo real (queda en estado `pendiente_spec`).
 */
app.post('/api/factory/tasks', (req, res) => {
  try {
    const { id, title, description, targetFile, acceptanceCriteria } = req.body || {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'El título del encargo es obligatorio.' });
    }
    const task = gitFactory.createTask({
      id,
      title,
      description: description || '',
      targetFile,
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

/**
 * PUNTO 2: Generar y persistir la especificación (`specs/<id>.md`) en disco.
 */
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

/**
 * PUNTO 3: Construir en rama aislada con Git real (`task/<id>`).
 */
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

/**
 * PUNTO 7: Fusionar rama aislada en `main` (`cerrar`).
 * Si `git status --porcelain` detecta cambios sin confirmar, responde HTTP 409 Conflict
 * negándose a fusionar.
 */
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

/**
 * Utilidad real sobre el árbol de trabajo Git para probar el bloqueo del Punto 7:
 * Crea un archivo con cambios sin confirmar en el repositorio real.
 */
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

/**
 * Limpia los cambios sin confirmar en el árbol de trabajo Git real (`git reset --hard` + `git clean -fd`).
 */
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

// Integración con Vite sólo para servir el panel web
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
    console.log(`Servidor Backend GitFactory corriendo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
