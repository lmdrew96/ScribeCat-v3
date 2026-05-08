/**
 * ShopPanel — modal for spending coins on gear and consumables.
 *
 * Coin balance comes from catCompanion.coins. Items with a `price` in
 * convex/items.ts are listed here; clicking Buy calls purchaseItem,
 * which deducts coins and grants the item via the same flow as drops.
 */

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMutation, useQuery } from 'convex/react';
import { Backpack, Coins, Shield, ShoppingBag, Sparkles, Sword } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { api } from '../../../../convex/_generated/api';

interface ShopPanelProps {
  open: boolean;
  onClose: () => void;
}

const SLOT_ICON: Record<string, ReactNode> = {
  weapon: <Sword className="h-4 w-4" />,
  armor: <Shield className="h-4 w-4" />,
  accessory: <Sparkles className="h-4 w-4" />,
  consumable: <Backpack className="h-4 w-4" />,
};

export function ShopPanel({ open, onClose }: ShopPanelProps) {
  const items = useQuery(api.shop.getShopItems);
  const cat = useQuery(api.studyQuest.getCatState);
  const purchase = useMutation(api.shop.purchaseItem);

  const coins = cat?.coins ?? 0;
  const isLoading = items === undefined || cat === undefined;

  const handleBuy = async (itemId: string, name: string, price: number) => {
    if (coins < price) {
      toast.error(`Need ${price - coins} more coins`);
      return;
    }
    try {
      await purchase({ itemId });
      toast.success(`Bought ${name}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Purchase failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Shop
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-[var(--glass-bg-light)] px-3 py-1 text-sm font-medium">
              <Coins className="h-4 w-4 text-amber-500" />
              {coins}
            </span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Shop is empty.</p>
        ) : (
          <div className="grid grid-cols-1 gap-1.5">
            {items.map((item) => {
              const price = item.price ?? 0;
              const canAfford = coins >= price;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-[var(--glass-border)] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{SLOT_ICON[item.slot]}</span>
                    <div>
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-[11px] text-muted-foreground">{item.description}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatBonus(item)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant={canAfford ? 'secondary' : 'ghost'}
                    size="sm"
                    disabled={!canAfford}
                    onClick={() => handleBuy(item.id, item.name, price)}
                    className="flex items-center gap-1"
                  >
                    <Coins className="h-3.5 w-3.5 text-amber-500" />
                    {price}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatBonus(item: {
  attackBonus?: number;
  defenseBonus?: number;
  healAmount?: number;
}): string {
  const parts: string[] = [];
  if (item.attackBonus) parts.push(`+${item.attackBonus} ATK`);
  if (item.defenseBonus) parts.push(`+${item.defenseBonus} DEF`);
  if (item.healAmount) parts.push(`Heals ${item.healAmount} HP`);
  return parts.join(' • ');
}
