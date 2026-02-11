import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ThemeProvider } from './components/theme-provider';
import './styles/globals.css';

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!convexUrl) {
  throw new Error(
    'Missing VITE_CONVEX_URL environment variable.\n\n' +
      'Run `npx convex dev` in a separate terminal to start the Convex backend.\n' +
      'Make sure the .env.local file is created with VITE_CONVEX_URL.',
  );
}

if (!clerkPubKey) {
  throw new Error(
    'Missing VITE_CLERK_PUBLISHABLE_KEY environment variable.\n\n' +
      'Get your publishable key from the Clerk dashboard and add it to .env.local.',
  );
}

const convex = new ConvexReactClient(convexUrl);

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkPubKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </React.StrictMode>,
);
