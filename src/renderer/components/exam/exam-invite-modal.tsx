import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useExamRoomActions } from '@/hooks/use-exam-room';
import { useFriends } from '@/hooks/use-friends';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '../../../../convex/_generated/dataModel';

interface ExamInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examRoomId: Id<'examRooms'>;
  existingMemberIds: string[];
}

export function ExamInviteModal({
  open,
  onOpenChange,
  examRoomId,
  existingMemberIds,
}: ExamInviteModalProps) {
  const { friends, isLoading } = useFriends();
  const { inviteToExamRoom } = useExamRoomActions();

  const memberSet = new Set(existingMemberIds);
  const availableFriends = friends.filter(
    (f): f is NonNullable<typeof f> => f !== null && !memberSet.has(f.userId),
  );

  const handleInvite = async (friendId: string) => {
    try {
      await inviteToExamRoom({ examRoomId, friendId });
      toast.success('Friend invited!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to invite');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading friends...</p>
          ) : availableFriends.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm font-medium text-foreground">No friends to invite</p>
              <p className="text-xs text-muted-foreground mt-1">
                All your friends are already in this exam room
              </p>
            </div>
          ) : (
            availableFriends.map((friend) => (
              <div
                key={friend.userId}
                className="flex items-center justify-between rounded-lg p-3 glass-light border border-[var(--glass-border)]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{friend.displayName}</p>
                  <p className="text-xs text-muted-foreground">@{friend.username}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0 gap-1 text-xs"
                  onClick={() => void handleInvite(friend.userId)}
                >
                  <UserPlus className="h-3 w-3" />
                  Invite
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
