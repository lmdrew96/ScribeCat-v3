import { HomeView } from '@/components/home-view';
import { StudyView } from '@/components/study-view';
import { TopBar } from '@/components/top-bar';
import { SignIn } from '@clerk/clerk-react';
import { AuthLoading, Authenticated, Unauthenticated } from 'convex/react';
import { useState } from 'react';
import { Toaster } from 'sonner';

function AuthenticatedApp() {
  const [currentView, setCurrentView] = useState<'home' | 'study'>('home');

  return (
    <div className="app-bg-orbs flex h-screen flex-col">
      <TopBar currentView={currentView} onViewChange={setCurrentView} />
      <main className="relative z-10 flex-1 overflow-hidden">
        {currentView === 'home' ? <HomeView /> : <StudyView />}
      </main>
    </div>
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
        <div className="app-bg-orbs flex h-screen items-center justify-center">
          <SignIn />
        </div>
      </Unauthenticated>

      <Authenticated>
        <AuthenticatedApp />
        <Toaster position="top-right" richColors closeButton />
      </Authenticated>
    </>
  );
}
