import { useCallback, useEffect, useReducer, useState } from 'react';
import type { ServerMessage } from '@factory-os/shared';
import { FactoryCanvas } from './components/FactoryCanvas';
import type { Theme } from './components/FactoryCanvas';
import { SidePanel } from './components/SidePanel';
import { TopBar } from './components/TopBar';
import { useFactorySocket } from './lib/socket';
import { initialState, reducer } from './state/store';
import type { ConnectionStatus } from './state/store';

const THEME_KEY = 'factory-os.theme';

function readTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // almacenamiento no disponible: el tema solo dura la sesión
    }
  }, [theme]);

  const onMessage = useCallback((message: ServerMessage) => dispatch({ type: 'server', message }), []);
  const onStatus = useCallback((status: ConnectionStatus) => dispatch({ type: 'connection', status }), []);
  useFactorySocket({ onMessage, onStatus });

  const selectNode = useCallback((nodeId: string | null) => dispatch({ type: 'selectNode', nodeId }), []);
  const selectTask = useCallback((taskId: string | null) => dispatch({ type: 'selectTask', taskId }), []);

  return (
    <div className="app">
      <TopBar
        connection={state.connection}
        engine={state.engine}
        metrics={state.metrics}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />
      <main className="workspace">
        <FactoryCanvas
          metrics={state.metrics?.nodes ?? []}
          configs={state.configs}
          selectedNodeId={state.selectedNodeId}
          theme={theme}
          onSelect={selectNode}
        />
        <SidePanel state={state} onSelectNode={selectNode} onSelectTask={selectTask} />
      </main>
    </div>
  );
}
