/**
 * InventoryPanel — modal showing equipped gear + bag contents.
 *
 * Click an inventory item to equip it (replaces whatever's in that slot).
 * Click an equipped slot to unequip. Consumables show in the bag but
 * have no Use button yet — that hooks into the battle Item action in a
 * later slice.
 */

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMutation, useQuery } from 'convex/react';
import { Backpack, Shield, Sparkles, Sword } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { api } from '../../../../convex/_generated/api';

interface InventoryPanelProps {
  open: boolean;
  onClose: () => void;
}

const SLOT_ICON: Record<string, ReactNode> = {
  weapon: <Sword className="h-4 w-4" />,
  armor: <Shield className="h-4 w-4" />,
  accessory: <Sparkles className="h-4 w-4" />,
  consumable: <Backpack className="h-4 w-4" />,
};

const SLOT_LABEL: Record<string, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  accessory: 'Accessory',
};

export function InventoryPanel({ open, onClose }: InventoryPanelProps) {
  const inventory = useQuery(api.inventory.getInventory);
  const equipment = useQuery(api.inventory.getEquipment);
  const equip = useMutation(api.inventory.equipItem);
  const unequip = useMutation(api.inventory.unequipSlot);

  const handleEquip = async (itemId: string) => {
    try {
      await equip({ itemId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not equip item');
    }
  };

  const handleUnequip = async (slot: 'weapon' | 'armor' | 'accessory') => {
    try {
      await unequip({ slot });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not unequip');
    }
  };

  const isLoading = inventory === undefined || equipment === undefined;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Backpack className="h-5 w-5" />
            Inventory
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-4">
            {/* Equipped */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Equipped
              </h3>
              <div className="grid grid-cols-1 gap-1.5">
                {(['weapon', 'armor', 'accessory'] as const).map((slot) => {
                  const item = equipment[slot];
                  return (
                    <div
                      key={slot}
                      className="flex items-center justify-between rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg-light)] px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{SLOT_ICON[slot]}</span>
                        <div>
                          <div className="text-xs uppercase tracking-wider text-muted-foreground">
                            {SLOT_LABEL[slot]}
                          </div>
                          <div className="text-sm font-medium">
                            {item ? item.name : <span className="text-muted-foreground">Empty</span>}
                          </div>
                          {item && (
                            <div className="text-[11px] text-muted-foreground">
                              {formatBonus(item)}
                            </div>
                          )}
                        </div>
                      </div>
                      {item && (
                        <Button variant="ghost" size="sm" onClick={() => handleUnequip(slot)}>
                          Unequip
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                Total: <span className="font-medium text-foreground">+{equipment.attackBonus} ATK</span>{' '}
                /{' '}
                <span className="font-medium text-foreground">+{equipment.defenseBonus} DEF</span>
              </div>
            </section>

            {/* Bag */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Bag ({inventory.length} {inventory.length === 1 ? 'item' : 'items'})
              </h3>
              {inventory.length === 0 ? (
                <p className="rounded-md border border-dashed border-[var(--glass-border)] py-6 text-center text-sm text-muted-foreground">
                  Bag is empty.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-1.5">
                  {inventory.map((entry) => {
                    const equippable =
                      entry.item.slot === 'weapon' ||
                      entry.item.slot === 'armor' ||
                      entry.item.slot === 'accessory';
                    const equipped =
                      (entry.item.slot === 'weapon' && equipment.weapon?.id === entry.itemId) ||
                      (entry.item.slot === 'armor' && equipment.armor?.id === entry.itemId) ||
                      (entry.item.slot === 'accessory' &&
                        equipment.accessory?.id === entry.itemId);
                    return (
                      <div
                        key={entry.itemId}
                        className="flex items-center justify-between rounded-md border border-[var(--glass-border)] px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {SLOT_ICON[entry.item.slot]}
                          </span>
                          <div>
                            <div className="text-sm font-medium">
                              {entry.item.name}
                              {entry.quantity > 1 && (
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                  ×{entry.quantity}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {entry.item.description}
                            </div>
                          </div>
                        </div>
                        {equippable && (
                          <Button
                            variant={equipped ? 'ghost' : 'secondary'}
                            size="sm"
                            disabled={equipped}
                            onClick={() => handleEquip(entry.itemId)}
                          >
                            {equipped ? 'Equipped' : 'Equip'}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatBonus(item: { attackBonus?: number; defenseBonus?: number }): string {
  const parts: string[] = [];
  if (item.attackBonus) parts.push(`+${item.attackBonus} ATK`);
  if (item.defenseBonus) parts.push(`+${item.defenseBonus} DEF`);
  return parts.join(' • ');
}
