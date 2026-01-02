import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { ConvexReactClient } from 'convex/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ThemeProvider } from './components/theme-provider';
import './styles/globals.css';

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    'Missing VITE_CONVEX_URL environment variable.\n\n' +
      'Run `npx convex dev` in a separate terminal to start the Convex backend.\n' +
      'Make sure the .env.local file is created with VITE_CONVEX_URL.\n' +
      'Then restart the Electron app.',
  );
}

const convex = new ConvexReactClient(convexUrl);

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ConvexAuthProvider client={convex}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ConvexAuthProvider>
  </React.StrictMode>,
);
