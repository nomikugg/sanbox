import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/main.css';
import { ThemeProvider } from './components/theme/theme-provider.jsx';
import { StatusBarProvider } from './contexts/StatusBarContext.jsx';
import { TooltipProvider } from './components/ui/tooltip.jsx';

globalThis.React = React;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <StatusBarProvider>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </StatusBarProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
