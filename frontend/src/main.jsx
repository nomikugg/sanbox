import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/main.css';
import { ThemeProvider } from './components/theme/theme-provider.jsx';
import { StatusBarProvider } from './contexts/StatusBarContext.jsx';

globalThis.React = React;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <StatusBarProvider>
        <App /> 
      </StatusBarProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
