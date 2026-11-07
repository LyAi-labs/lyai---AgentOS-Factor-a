# Traspaso · factory-os (2026-11-07)

Para la sesión de Claude Code de Ignacio en el servidor (VS Code por SSH). Léelo entero antes de actuar.

## Dónde está
- Repo `LyAi-labs/lyai---AgentOS-Factor-a`, rama `claude/compassionate-wozniak-2h4ztu`, PR #1 (draft).
- Código en `factory-os/` (monorepo npm: `packages/shared`, `apps/server`, `apps/web`). Contexto en `factory-os/README.md`
  y fuente de verdad en `factory-os/openspec/` (44 requisitos, `npm run spec:check`).
- CI verde en `ea4cb39` (factory-os CI: verify + PostgreSQL, smoke E2E, build Docker; y el CI del prototipo de la raíz).

## Verificar al llegar (no fiarse de este documento: live gana)
```bash
git fetch origin claude/compassionate-wozniak-2h4ztu && git checkout claude/compassionate-wozniak-2h4ztu
cd factory-os && npm ci && npm run verify
```
Integración PostgreSQL: `TEST_DATABASE_URL=postgres://… npm test -w @factory-os/server` (sin la variable sale *skipped*).

## Pendiente — decisiones de Ignacio (no ejecutar sin su OK)
1. **Despliegue en el servidor** detrás del Traefik existente, sin publicar puertos: quitar `ports:` de `web`, unirlo a la
   red de Traefik con labels de router, host solo resoluble por Tailscale. Faltan: nombre de la red y entrypoint de Traefik,
   host deseado, y si usar el PostgreSQL del compose o uno existente. Comprobar puertos/servicios en vivo antes
   (`docker ps`, `ss -ltnp`) — el servidor ya tiene muchos ocupados, Traefik y nginx.
2. **Aprobación ligada al diff + firma SSH de Ignacio** en Tu OK / Producción, verificada contra
   `lyai-factory/docs/allowed_signers_ignacio` (`ssh-keygen -Y verify`), con caducidad y anotada en la auditoría.
   Decidir si va primero en `lyai-factory/nucleo` (real) o en `factory-os` (panel).
3. **Calidad del código de la factoría** en `lyai-factory/nucleo`: tests congelados por hash desde la spec aprobada,
   tests ocultos para el Builder, mutation testing como puerta. Falta saber el lenguaje de las apps de LyAi Ski.
4. Propuestas sobre el diagrama: `factory-os/openspec/changes/2026-11-07-mejoras-diagrama/proposal.md`.

## Avisos
- Smoke E2E: en local pasó 6/7 seguidas antes del último arreglo; tras él, verde en CI. Vigilar intermitencias.
- Build Docker tras proxy con inspección TLS: `BUILD_CA_FILE=./docker/local-ca.crt docker compose up -d --build`.
- Ningún nodo llama a modelos: el `StageExecutor` es un simulador. Nada a producción sin OK de Ignacio.
