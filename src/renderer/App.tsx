import { SessionProvider } from '@/contexts/session-context';
import { RouterProvider } from '@tanstack/react-router';
import { AuthLoading, Authenticated, Unauthenticated } from 'convex/react';
import { Toaster } from 'sonner';
import { EasterEggs } from './components/easter-eggs/easter-eggs';
import { LandingPage } from './components/landing-page';
import { router } from './router';

export function App() {
  return (
    <>
      <AuthLoading>
        <div className="app-bg-orbs flex h-screen items-center justify-center">
          <div className="text-muted-foreground text-sm">Loading...</div>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <LandingPage />
      </Unauthenticated>

      <Authenticated>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
        <Toaster position="top-right" richColors closeButton />
        <EasterEggs />
      </Authenticated>
    </>
  );
}
