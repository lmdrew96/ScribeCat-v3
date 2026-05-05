/**
 * StudyQuestPage — full-screen route at /study-quest hosting the game canvas.
 *
 * Phase 0: shows the game canvas (or an "adopt your cat first" prompt).
 * Future phases add HUD overlays, inventory, quest log, etc.
 */

import { Button } from '@/components/ui/button';
import { useStudyQuest } from '@/hooks/use-study-quest';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Backpack } from 'lucide-react';
import { useState } from 'react';
import { InventoryPanel } from './inventory-panel';
import { StudyQuestGame } from './study-quest-game';

export function StudyQuestPage() {
  const navigate = useNavigate();
  const { isLoading, isAdopted, variant, mood, name } = useStudyQuest();
  const [inventoryOpen, setInventoryOpen] = useState(false);

  return (
    <div className="flex h-full flex-col p-3">
      <div className="mb-3 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/' })}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-lg font-semibold">StudyQuest</h1>
        {isAdopted && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setInventoryOpen(true)}
          >
            <Backpack className="mr-1 h-4 w-4" />
            Inventory
          </Button>
        )}
      </div>
      <InventoryPanel open={inventoryOpen} onClose={() => setInventoryOpen(false)} />

      <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl glass p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !isAdopted ? (
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              Adopt a cat from the widget in the bottom-left corner before starting your adventure.
            </p>
            <Button onClick={() => navigate({ to: '/' })}>Back home</Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <StudyQuestGame variant={variant} mood={mood} />
            <p className="text-xs text-muted-foreground">
              {name} — WASD/arrows to move, SPACE to talk
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
