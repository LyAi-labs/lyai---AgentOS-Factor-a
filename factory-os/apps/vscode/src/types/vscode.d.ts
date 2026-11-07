declare module 'vscode' {
  export interface Uri {
    readonly scheme: string;
    readonly authority: string;
    readonly path: string;
    readonly query: string;
    readonly fragment: string;
    readonly fsPath: string;
    toString(skipEncoding?: boolean): string;
  }

  export namespace Uri {
    export function joinPath(base: Uri, ...pathSegments: string[]): Uri;
    export function file(path: string): Uri;
  }

  export interface WebviewOptions {
    readonly enableScripts?: boolean;
    readonly enableCommandUris?: boolean;
    readonly localResourceRoots?: readonly Uri[];
  }

  export interface Webview {
    options: WebviewOptions;
    html: string;
    readonly cspSource: string;
    asWebviewUri(localResource: Uri): Uri;
    postMessage(message: unknown): PromiseLike<boolean>;
    onDidReceiveMessage: (
      listener: (e: unknown) => unknown,
      thisArgs?: unknown,
      disposables?: Disposable[]
    ) => Disposable;
  }

  export interface WebviewViewResolveContext<T = unknown> {
    readonly state?: T;
  }

  export interface CancellationToken {
    readonly isCancellationRequested: boolean;
    onCancellationRequested: (listener: (e: unknown) => unknown) => Disposable;
  }

  export interface WebviewView {
    readonly viewType: string;
    readonly webview: Webview;
    onDidDispose: (listener: () => unknown) => Disposable;
    visible: boolean;
  }

  export interface WebviewViewProvider {
    resolveWebviewView(
      webviewView: WebviewView,
      context: WebviewViewResolveContext,
      token: CancellationToken,
    ): PromiseLike<void> | void;
  }

  export interface WorkspaceConfiguration {
    get(section: string): unknown;
    get<T>(section: string, defaultValue: T): T;
  }

  export namespace workspace {
    export function getConfiguration(section?: string): WorkspaceConfiguration;
  }

  export interface Disposable {
    dispose(): unknown;
  }

  export namespace window {
    export function registerWebviewViewProvider(
      viewId: string,
      provider: WebviewViewProvider,
      options?: { readonly webviewOptions?: { readonly retainContextWhenHidden?: boolean } },
    ): Disposable;
  }

  export interface ExtensionContext {
    readonly subscriptions: { push(...items: Disposable[]): void } & Disposable[];
    readonly extensionUri: Uri;
  }
}
