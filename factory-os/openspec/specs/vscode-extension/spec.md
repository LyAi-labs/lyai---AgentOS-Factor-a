# vscode-extension

Extensión de VS Code lyai.factory-os con panel inferior, empaquetado webview y puente local por postMessage.

### Requirement: VSC-001 Panel y empaquetado de la extensión
The VS Code extension SHALL declare publisher `lyai`, name `factory-os`, a webview view in the bottom panel, configuration `factoryOs.port` defaulting to 8094, and package the bundled web client assets into `media/` within a `.vsix` archive.

#### Scenario: declaración y empaquetado
- **WHEN** the extension manifest is inspected
- **THEN** it contributes a panel view and port 8094, and packaging produces a vsix containing media/index.html

### Requirement: VSC-002 Puente de peticiones API y WebSocket con 127.0.0.1
The extension bridge SHALL relay `api` requests from webview `postMessage` to `127.0.0.1`, returning `api:result` with identical id, status and body, returning `api:error` when transport fails, and relaying bidirectional WebSocket frames (`ws:open`, `ws:send`, `ws:close` to socket; `ws:message`, `ws:status` to webview).

#### Scenario: llamada API y WebSocket
- **WHEN** a webview sends an `api` or `ws:send` message
- **THEN** the bridge executes the HTTP request or forwards through WebSocket and replies with corresponding message types

### Requirement: VSC-003 Seguridad del host: rechazo de rutas y orígenes no permitidos
The bridge host SHALL strictly restrict destinations to loopback `127.0.0.1` and paths starting with `/api/` (or `/ws`). Any attempt to access unauthorized paths or non-loopback hosts SHALL be rejected immediately with `api:error` without executing network requests.

#### Scenario: rechazo de ruta fuera de /api/
- **WHEN** an api message requests `/admin` or external hosts
- **THEN** the bridge immediately returns `api:error` without dispatching network calls

### Requirement: VSC-004 Content Security Policy estricta con nonce
The webview HTML generator SHALL produce a Content Security Policy with a unique cryptographic nonce for scripts, allowing resources only from `webview.cspSource` (and `data:` for images), prohibiting `'unsafe-eval'`, remote origins (`https://`), and preventing any `<iframe>` embedding.

#### Scenario: CSP sin orígenes remotos ni unsafe-eval
- **WHEN** the webview HTML is generated
- **THEN** the CSP includes `nonce-`, forbids `unsafe-eval` and remote origins, and renders without iframes
