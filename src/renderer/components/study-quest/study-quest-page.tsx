/**
 * StudyQuestPage — full-screen route at /study-quest hosting the game canvas.
 *
 * Phase 0: shows the game canvas (or an "adopt your cat first" prompt).
 * Future phases add HUD overlays, inventory, quest log, etc.
 */

import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useStudyQuest } from '@/hooks/use-study-quest';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Backpack, Monitor, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { InventoryPanel } from './inventory-panel';
import { ShopPanel } from './shop-panel';
import { StudyQuestGame } from './study-quest-game';

export function StudyQuestPage() {
  const navigate = useNavigate();
  const { isLoading, isAdopted, variant, mood, name } = useStudyQuest();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="flex h-full flex-col p-3">
      <div className="mb-3 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/' })}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-lg font-semibold">StudyQuest</h1>
        {isAdopted && (
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setShopOpen(true)}>
              <ShoppingBag className="mr-1 h-4 w-4" />
              Shop
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setInventoryOpen(true)}>
              <Backpack className="mr-1 h-4 w-4" />
              Inventory
            </Button>
          </div>
        )}
      </div>
      <InventoryPanel open={inventoryOpen} onClose={() => setInventoryOpen(false)} />
      <ShopPanel open={shopOpen} onClose={() => setShopOpen(false)} />

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
        ) : isMobile ? (
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <Monitor className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              StudyQuest needs a keyboard to play right now — touch controls are coming soon. Hop on
              a desktop or laptop to explore the dungeon with {name}.
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
