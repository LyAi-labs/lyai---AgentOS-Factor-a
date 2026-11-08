# Change: extension-vscode

## Why
El iframe a factory.lyai.pro dentro de un webview remoto en VS Code no carga (probado 0.7.0–0.7.5 de la extensión Factoría; ninguna petición llega al servidor). Se requiere una extensión nativa que empaquete la interfaz estática en un panel inferior y conecte con el servicio mediante un puente local (postMessage) hacia 127.0.0.1.

## What Changes
- ADDED capacidad `vscode-extension` (VSC-001…004)
- Empaquetado de `apps/web/dist` en `apps/vscode/media/`
- Puente `postMessage` bidireccional (REST + WebSocket) confinado a `127.0.0.1` y prefijo `/api/`
- CSP estricta con nonce, sin `'unsafe-eval'` ni orígenes remotos
- Transporte inyectable en `apps/web` para interoperabilidad navegador / VS Code

## Delta
- ADDED `openspec/specs/vscode-extension/spec.md` (VSC-001, VSC-002, VSC-003, VSC-004)
