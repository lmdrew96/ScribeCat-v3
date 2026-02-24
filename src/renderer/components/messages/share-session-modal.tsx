import { UserCard } from '@/components/friends/user-card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFriends } from '@/hooks/use-friends';
import { useSessionShares, useShareSession } from '@/hooks/use-session-sharing';
import { Check, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '../../../../convex/_generated/dataModel';

interface ShareSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: Id<'sessions'> | null;
}

export function ShareSessionModal({ open, onOpenChange, sessionId }: ShareSessionModalProps) {
  const { friends, isLoading: friendsLoading } = useFriends();
  const shares = useSessionShares(sessionId);
  const { shareSession, unshareSession } = useShareSession();

  const sharedUserIds = new Set(shares.map((s) => s.userId));

  const handleToggleShare = async (friendUserId: string) => {
    if (!sessionId) return;

    try {
      if (sharedUserIds.has(friendUserId)) {
        await unshareSession({ sessionId, friendUserId });
        toast.success('Session unshared');
      } else {
        await shareSession({ sessionId, friendUserId });
        toast.success('Session shared');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update sharing';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Share2 className="h-4 w-4" />
            Share Session
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {friendsLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading friends...</p>
          ) : friends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Add friends to share sessions with them
            </p>
          ) : (
            friends.map((friend) => {
              const isShared = sharedUserIds.has(friend.userId);
              return (
                <UserCard
                  key={friend.userId}
                  username={friend.username}
                  displayName={friend.displayName}
                  avatarUrl={friend.avatarUrl}
                  catVariant={friend.catVariant}
                  catLevel={friend.catLevel}
                  action={
                    <Button
                      variant={isShared ? 'secondary' : 'default'}
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => void handleToggleShare(friend.userId)}
                    >
                      {isShared ? (
                        <>
                          <Check className="h-3 w-3" />
                          Shared
                        </>
                      ) : (
                        'Share'
                      )}
                    </Button>
                  }
                />
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
