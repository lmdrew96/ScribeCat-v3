import { SessionProvider } from '@/contexts/session-context';
import { SignIn } from '@clerk/clerk-react';
import { RouterProvider } from '@tanstack/react-router';
import { AuthLoading, Authenticated, Unauthenticated } from 'convex/react';
import { Toaster } from 'sonner';
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
        <div className="app-bg-orbs flex h-screen items-center justify-center">
          <SignIn />
        </div>
      </Unauthenticated>

      <Authenticated>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
        <Toaster position="top-right" richColors closeButton />
      </Authenticated>
    </>
  );
}
