import { SessionProvider } from '@/contexts/session-context';
import { useClerk, useUser } from '@clerk/clerk-react';
import { RouterProvider } from '@tanstack/react-router';
import { AuthLoading, Authenticated, Unauthenticated } from 'convex/react';
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { LandingPage } from './components/landing-page';
import { router } from './router';

function AuthenticatedApp() {
  const { user } = useUser();
  const { signOut } = useClerk();

  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const isUdel = email.endsWith('@udel.edu');

  useEffect(() => {
    if (user && !isUdel) {
      signOut();
    }
  }, [user, isUdel, signOut]);

  if (!isUdel) {
    return (
      <div className="app-bg-orbs flex h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="glass rounded-2xl px-8 py-10 max-w-sm">
          <div className="text-4xl mb-3">🐱</div>
          <h2 className="text-foreground font-semibold mb-2">UD students only</h2>
          <p className="text-muted-foreground text-sm">
            ScribeCat is only available to <span className="text-primary">@udel.edu</span> accounts.
            Signing you out…
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}

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
        <AuthenticatedApp />
      </Authenticated>
    </>
  );
}
