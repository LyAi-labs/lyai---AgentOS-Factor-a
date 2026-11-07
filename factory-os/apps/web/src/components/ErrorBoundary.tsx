import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Último recurso: un fallo de render no deja la pantalla en blanco. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error de render', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fatal" role="alert">
        <h1>Algo ha fallado en el panel</h1>
        <pre>{this.state.error.message}</pre>
        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
          Recargar
        </button>
      </div>
    );
  }
}
