#!/usr/bin/env node
/**
 * Trazabilidad spec ↔ tests (OpenSpec como fuente de verdad).
 * Falla si un requisito de openspec/specs no tiene test que lo cite, o si un test cita un ID inexistente.
 * Convención: `### Requirement: ENG-004 …` en el spec y `it('[ENG-004] …')` en el test.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const ID = /[A-Z]{2,4}-\d{3}/;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

const requirements = new Map(); // id -> { title, file }
for await (const file of walk(join(ROOT, 'openspec/specs'))) {
  if (!file.endsWith('spec.md')) continue;
  for (const line of (await readFile(file, 'utf8')).split('\n')) {
    const m = line.match(new RegExp(`^### Requirement: (${ID.source})\\s+(.*)$`));
    if (!m) continue;
    if (requirements.has(m[1])) throw new Error(`ID duplicado en specs: ${m[1]}`);
    requirements.set(m[1], { title: m[2], file: relative(ROOT, file) });
  }
}

const citations = new Map(); // id -> Set(files)
for await (const file of walk(ROOT)) {
  if (!/\/test\/.+\.test\.tsx?$/.test(file)) continue;
  const text = await readFile(file, 'utf8');
  for (const m of text.matchAll(new RegExp(`\\[(${ID.source})\\]`, 'g'))) {
    const set = citations.get(m[1]) ?? new Set();
    set.add(relative(ROOT, file));
    citations.set(m[1], set);
  }
}

const uncovered = [...requirements.keys()].filter((id) => !citations.has(id));
const unknown = [...citations.keys()].filter((id) => !requirements.has(id));

console.log(`Requisitos: ${requirements.size} · citados por tests: ${requirements.size - uncovered.length}\n`);
for (const [id, req] of [...requirements].sort(([a], [b]) => a.localeCompare(b))) {
  const files = citations.get(id);
  console.log(`${files ? 'OK  ' : 'FALTA'} ${id.padEnd(8)} ${req.title}${files ? `  ← ${[...files].join(', ')}` : ''}`);
}
if (unknown.length) console.log(`\nIDs citados en tests sin requisito: ${unknown.join(', ')}`);
if (uncovered.length || unknown.length) {
  console.error('\nspec:check FALLA');
  process.exit(1);
}
console.log('\nspec:check OK');
