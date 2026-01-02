import { HomeView } from '@/components/home-view';
import { StudyView } from '@/components/study-view';
import { TopBar } from '@/components/top-bar';
import { useAuth } from '@/hooks/use-sessions';
import { useState } from 'react';

export function App() {
  const [currentView, setCurrentView] = useState<'home' | 'study'>('home');

  // Automatically sign in anonymously
  useAuth();

  return (
    <div className="flex h-screen flex-col bg-background">
      <TopBar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-hidden">
        {currentView === 'home' ? <HomeView /> : <StudyView />}
      </main>
    </div>
  );
}
