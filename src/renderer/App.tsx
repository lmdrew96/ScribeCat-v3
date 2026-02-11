import { HomeView } from '@/components/home-view';
import { StudyView } from '@/components/study-view';
import { TopBar } from '@/components/top-bar';
import { SignIn } from '@clerk/clerk-react';
import { AuthLoading, Authenticated, Unauthenticated } from 'convex/react';
import { useState } from 'react';

function AuthenticatedApp() {
  const [currentView, setCurrentView] = useState<'home' | 'study'>('home');

  return (
    <div className="flex h-screen flex-col bg-background">
      <TopBar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-hidden">
        {currentView === 'home' ? <HomeView /> : <StudyView />}
      </main>
    </div>
  );
}

export function App() {
  return (
    <>
      <AuthLoading>
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="text-muted-foreground text-sm">Loading...</div>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <div className="flex h-screen items-center justify-center bg-background">
          <SignIn />
        </div>
      </Unauthenticated>

      <Authenticated>
        <AuthenticatedApp />
      </Authenticated>
    </>
  );
}
