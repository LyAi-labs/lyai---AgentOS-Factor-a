#!/usr/bin/env node
/**
 * Smoke test end-to-end contra un despliegue en marcha (dev, preview o docker compose).
 * Verifica: API sana, lienzo con 25 nodos, conexión WS "En vivo", alta de tarea desde la UI,
 * aprobación humana desde la UI y ausencia de errores de consola. Guarda capturas en artifacts/.
 *
 *   BASE_URL=http://localhost:8088 npm run smoke
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = new URL('../artifacts/', import.meta.url).pathname;
const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

await mkdir(OUT, { recursive: true });

/** La simulación puede parar la línea (O1) por un `blocked` aleatorio; el smoke la reanuda y lo deja auditado. */
async function ensureLineRunning() {
  const engine = await fetch(`${BASE_URL}/api/engine`).then((r) => r.json());
  if (!engine.lineStopped) return false;
  await fetch(`${BASE_URL}/api/line/resume`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ note: 'smoke: reanudación automática de prueba' }),
  });
  return true;
}

const health = await fetch(`${BASE_URL}/api/health`).then((r) => r.json()).catch(/** @param {unknown} e */ (e) => ({ error: String(e) }));
check('GET /api/health', health.status === 'ok', JSON.stringify({ status: health.status, storage: health.storage, database: health.database }));

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1680, height: 960 }, deviceScaleFactor: 2 });
const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
page.on('pageerror', (e) => consoleErrors.push(e.message));

try {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByText('En vivo').waitFor({ timeout: 10_000 });
  check('WebSocket conectado', true);

  const nodes = await page.locator('[data-testid^="node-"]').count();
  check('Lienzo renderiza 25 nodos', nodes === 25, `${nodes} nodos`);

  await page.waitForFunction(() => (document.querySelector('.kpi__value')?.textContent ?? '—') !== '—', null, { timeout: 10_000 });
  check('KPIs con telemetría', true);

  await page.getByRole('tab', { name: /Tareas/ }).click();
  const title = `Smoke ${Date.now()}`;
  await page.getByPlaceholder(/Aviso de cierre/).fill(title);
  await page.locator('.form--grid').getByLabel('Carril').selectOption('express');
  await page.locator('.form--grid').getByLabel('Prioridad').selectOption('P0');
  await page.getByRole('button', { name: 'Encolar' }).click();
  await page.getByText(title).waitFor({ timeout: 5_000 });
  check('Alta de tarea desde la UI', true, title);

  await page.getByText(title).click();
  for (let i = 0; i < 120; i++) {
    if (await page.getByRole('button', { name: 'Aprobar' }).first().isVisible()) break;
    await ensureLineRunning();
    await page.waitForTimeout(500);
  }
  await page.getByRole('button', { name: 'Aprobar' }).first().waitFor({ timeout: 5_000 });
  await page.screenshot({ path: `${OUT}task-awaiting-approval.png` });
  await page.getByRole('button', { name: 'Aprobar' }).first().click();
  await page.locator('.step--done', { hasText: 'Tu OK · Ignacio' }).waitFor({ timeout: 5_000 });
  check('Aprobación humana desde la UI (Tu OK)', true);

  await page.getByRole('button', { name: /Volver/ }).click();
  await page.getByRole('tab', { name: 'Resumen' }).click();
  await page.waitForTimeout(2_500);
  await page.screenshot({ path: `${OUT}dashboard.png` });

  const expressBtn = page.getByRole('button', { name: /Carril exprés/ });
  const inRoute = Number(await expressBtn.locator('.guided__count').textContent());
  await expressBtn.click();
  const dimmed = await page.locator('[data-testid^="node-"][data-dimmed]').count();
  check('Vista guiada (exprés) atenúa nodos fuera del recorrido', inRoute > 0 && dimmed === 25 - inRoute, `${inRoute} en recorrido, ${dimmed} atenuados`);
  await page.screenshot({ path: `${OUT}guided-express.png` });
  await page.getByRole('button', { name: 'Todo el sistema' }).click();
  await page.waitForTimeout(1_500); // varias actualizaciones de telemetría tras cambiar de vista
  const visibleAfterViews = await page.locator('[data-testid^="node-"]:visible').count();
  check('Nodos visibles tras alternar vistas', visibleAfterViews === 25, `${visibleAfterViews}/25`);

  await page.locator('[data-testid="node-builder"]').click();
  await page.getByText('Configuración operativa').waitFor();
  await page.screenshot({ path: `${OUT}node-inspector.png` });
  check('Inspector de nodo', true);

  // Gobierno: andon (O1) → banner → reanudar con nota → auditoría íntegra
  await ensureLineRunning();
  await page.waitForTimeout(500);
  page.once('dialog', (d) => void d.accept('Smoke: parada de prueba'));
  await page.getByRole('button', { name: /Parar línea/ }).click();
  await page.locator('.line-banner').waitFor({ timeout: 5_000 });
  check('Andon para la línea y muestra el banner', (await page.locator('.line-banner').textContent())?.includes('Smoke: parada de prueba') === true);
  await page.screenshot({ path: `${OUT}line-stopped.png` });
  await page.getByLabel('Nota de reanudación').fill('Smoke: revisado');
  await page.getByRole('button', { name: 'Reanudar línea' }).click();
  await page.locator('.line-banner').waitFor({ state: 'detached', timeout: 5_000 });
  check('Reanudar línea con nota', true);
  await page.getByRole('tab', { name: 'Actividad' }).click();
  await page.getByRole('button', { name: /verificar/i }).click();
  await page.locator('.audit__ok, .audit .error-text').first().waitFor({ timeout: 5_000 });
  const auditText = (await page.locator('.audit').textContent()) ?? '';
  check('Auditoría encadenada íntegra', auditText.includes('Cadena íntegra') && auditText.includes('para la línea') && auditText.includes('reanuda la línea'), auditText.match(/Cadena[^·]*· \d+ entradas/)?.[0] ?? auditText.slice(0, 80));
  await page.screenshot({ path: `${OUT}audit.png` });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await mobile.goto(BASE_URL, { waitUntil: 'networkidle' });
  await mobile.getByText('En vivo').waitFor({ timeout: 10_000 });
  await mobile.waitForTimeout(500);
  const visibleNodes = await mobile.evaluate(() => {
    const canvas = document.querySelector('.canvas')?.getBoundingClientRect();
    if (!canvas) return 0;
    return [...document.querySelectorAll('[data-testid^="node-"]')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.right > canvas.left && r.left < canvas.right && r.bottom > canvas.top && r.top < canvas.bottom;
    }).length;
  });
  check('Lienzo visible en móvil', visibleNodes === 25, `${visibleNodes}/25 nodos dentro del lienzo`);
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('Sin scroll horizontal en móvil', overflow <= 0, `overflow ${overflow}px`);
  await mobile.screenshot({ path: `${OUT}mobile.png`, fullPage: true });
} catch (error) {
  check('Recorrido E2E', false, error instanceof Error ? error.message : String(error));
  await page.screenshot({ path: `${OUT}failure.png` }).catch(() => undefined);
} finally {
  check('Sin errores de consola', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  await browser.close();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} comprobaciones superadas · capturas en ${OUT}`);
process.exit(failed.length > 0 ? 1 : 0);
