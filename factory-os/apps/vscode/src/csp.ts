/**
 * Content Security Policy y renderizado de HTML para el webview de Factory OS.
 * Restricciones estrictas: sin eval, sin orígenes remotos y sin iframes.
 */

export interface RenderWebviewOptions {
  cspSource: string;
  nonce: string;
  scriptUri: string;
  styleUri?: string;
  title?: string;
}

export function getCsp(cspSource: string, nonce: string): string {
  return [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    `style-src ${cspSource} 'unsafe-inline'`,
    `img-src ${cspSource} data:`,
    `font-src ${cspSource}`,
    "connect-src 'none'",
  ].join('; ');
}

export function renderWebviewHtml(options: RenderWebviewOptions): string {
  const { cspSource, nonce, scriptUri, styleUri, title = 'Factory OS' } = options;
  const csp = getCsp(cspSource, nonce);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${styleUri ? `<link rel="stylesheet" href="${styleUri}">` : ''}
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
