import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { triggerCatParty } from './cat-party';
import { printConsoleArt } from './console-art';
import { NyanMode } from './nyan-mode';
import { StudyBuddy } from './study-buddy';
import { useKeyboardSequence } from './use-keyboard-sequence';
import { useKonamiCode } from './use-konami-code';
import { unlockNyanThemes } from './use-nyan-unlock';

/**
 * Top-level easter-egg orchestrator. Mounted once inside AuthenticatedApp
 * so all eggs share a single listener lifecycle and have Convex/Clerk context.
 */
export function EasterEggs() {
  const [nyanActive, setNyanActive] = useState(false);

  // Print ASCII cat + welcome to the dev tools console on mount.
  useEffect(() => {
    printConsoleArt();
  }, []);

  // Nyan detector: typing n-y-a-n outside an input/textarea.
  useKeyboardSequence('nyan', () => {
    if (nyanActive) return;
    setNyanActive(true);
    const firstUnlock = unlockNyanThemes();
    toast(
      firstUnlock
        ? '✨ NYAN! SUPER RAINBOW MODE! ✨ New themes unlocked in Settings →'
        : '✨ NYAN! SUPER RAINBOW MODE! ✨',
    );
  });

  // Konami detector: ↑↑↓↓←→←→BA.
  useKonamiCode(() => {
    triggerCatParty();
    toast('🐈 CAT PARTY! 🎉');
  });

  return (
    <>
      {nyanActive && <NyanMode onComplete={() => setNyanActive(false)} />}
      <StudyBuddy />
    </>
  );
}
