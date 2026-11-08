#!/usr/bin/env node
/**
 * Empaqueta la extensión VS Code copiando apps/web/dist a media/ y ejecutando vsce package.
 */
import { cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, '..');
const webDist = join(pkgRoot, '../web/dist');
const mediaDir = join(pkgRoot, 'media');

if (!existsSync(webDist)) {
  console.log('Construyendo apps/web/dist...');
  execFileSync('npm', ['run', 'build', '-w', '@factory-os/web'], {
    cwd: join(pkgRoot, '../..'),
    stdio: 'inherit',
  });
}

cpSync(webDist, mediaDir, { recursive: true });
console.log('Copiado apps/web/dist a media/');

// Asegurar compilación de la extensión
execFileSync('npm', ['run', 'build'], {
  cwd: pkgRoot,
  stdio: 'inherit',
});

// Encontrar binario de vsce
let vsceBin = 'vsce';
const candidateBins = [
  join(pkgRoot, '../../node_modules/.bin/vsce'),
  join(process.env.HOME ?? '/home/lyai', '.npm/_npx/c7fe25c035f34f39/node_modules/.bin/vsce'),
];
for (const b of candidateBins) {
  if (existsSync(b)) {
    vsceBin = b;
    break;
  }
}

execFileSync(vsceBin, ['package', '--no-dependencies', '--allow-missing-repository', '--skip-license'], {
  cwd: pkgRoot,
  stdio: 'inherit',
});

console.log('Empaquetado VSIX completado con éxito.');
