/**
 * Activación de la extensión VS Code de Factory OS.
 * Registra el proveedor de webview para el panel inferior y canaliza la E/S al puente local.
 */
import * as vscode from 'vscode';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Bridge } from './bridge.js';
import { renderWebviewHtml } from './csp.js';

export class FactoryOsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'factory-os.panel';

  constructor(private readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    const webview = webviewView.webview;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    const config = vscode.workspace.getConfiguration('factoryOs');
    const port = config.get<number>('port', 8094);

    const bridge = new Bridge({
      postMessage: (msg) => {
        void webview.postMessage(msg);
      },
      port,
    });

    const listener = webview.onDidReceiveMessage((message: unknown) => {
      void bridge.handleWebviewMessage(message);
    });

    webviewView.onDidDispose(() => {
      listener.dispose();
      bridge.dispose();
    });

    webview.html = this.getHtmlForWebview(webview);
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    const mediaPath = path.join(this.extensionUri.fsPath, 'media');
    const assetsPath = path.join(mediaPath, 'assets');

    let scriptUri = '';
    let styleUri = '';

    if (fs.existsSync(assetsPath)) {
      try {
        const files = fs.readdirSync(assetsPath);
        const jsFile = files.find((f) => f.endsWith('.js'));
        const cssFile = files.find((f) => f.endsWith('.css'));

        if (jsFile) {
          scriptUri = webview
            .asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'assets', jsFile))
            .toString();
        }
        if (cssFile) {
          styleUri = webview
            .asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'assets', cssFile))
            .toString();
        }
      } catch {
        // Fallback a rutas directas si readdir falla
      }
    }

    if (!scriptUri) {
      scriptUri = webview
        .asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'index.js'))
        .toString();
    }

    return renderWebviewHtml({
      cspSource: webview.cspSource,
      nonce,
      scriptUri,
      styleUri: styleUri || undefined,
      title: 'Factory OS',
    });
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const provider = new FactoryOsViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(FactoryOsViewProvider.viewType, provider, {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    }),
  );
}

export function deactivate(): void {
  // Limpieza al desactivar
}
