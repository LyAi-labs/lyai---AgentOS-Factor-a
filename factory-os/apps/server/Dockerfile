# syntax=docker/dockerfile:1.7
# Contexto de build: raíz del monorepo (factory-os/).
FROM node:22.22-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json .npmrc tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
# CA opcional para redes con inspección TLS (proxy corporativo): `--secret id=ca,src=ruta.crt`.
# Solo vive durante este RUN; no queda en ninguna capa.
RUN --mount=type=secret,id=ca,required=false \
    if [ -s /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi; \
    npm ci --no-audit --no-fund
COPY packages/shared packages/shared
COPY apps/server apps/server
RUN npm run build -w @factory-os/shared && npm run build -w @factory-os/server \
 && npm prune --omit=dev --no-audit --no-fund

FROM node:22.22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build /repo/apps/server/package.json ./apps/server/package.json
COPY --from=build /repo/apps/server/dist ./apps/server/dist
USER node
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/api/health >/dev/null || exit 1
CMD ["node", "apps/server/dist/main.js"]
