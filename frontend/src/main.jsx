import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/main.css';
import { ThemeProvider } from './components/theme/theme-provider.jsx';
import { StatusBarProvider } from './contexts/StatusBarContext.jsx';
import { TooltipProvider } from './components/ui/tooltip.jsx';
import { loadSettings } from './lib/settingsStore.js';
import { loadSession } from './lib/sessionStore.js';
import { loadHistory } from './lib/historyStore.js';

globalThis.React = React;

// Load all persisted state in parallel before mounting React so the app renders
// once with the correct initial state. Each loader returns null on any failure —
// App falls back to initialState defaults for that slice.
async function bootstrap() {
  const [initialSettings, initialSession, initialHistory] = await Promise.all([
    loadSettings(),
    loadSession(),
    loadHistory(),
  ]);

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ThemeProvider>
        <StatusBarProvider>
          <TooltipProvider>
            <App
              initialSettings={initialSettings}
              initialSession={initialSession}
              initialHistory={initialHistory}
            />
          </TooltipProvider>
        </StatusBarProvider>
      </ThemeProvider>
    </React.StrictMode>,
  );
}

bootstrap();
