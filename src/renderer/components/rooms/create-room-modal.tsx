import { UserCard } from '@/components/friends/user-card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useFriends } from '@/hooks/use-friends';
import { useRoomActions } from '@/hooks/use-study-rooms';
import { cn } from '@/lib/utils';
import { useNavigate } from '@tanstack/react-router';
import { Check, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface CreateRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRoomModal({ open, onOpenChange }: CreateRoomModalProps) {
  const navigate = useNavigate();
  const { friends, isLoading: friendsLoading } = useFriends();
  const { createRoom } = useRoomActions();
  const [name, setName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const toggleFriend = (userId: string) => {
    setSelectedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim() || selectedFriends.size === 0 || creating) return;

    setCreating(true);
    try {
      const roomId = await createRoom({
        name: name.trim(),
        friendIds: Array.from(selectedFriends),
      });
      toast.success('Room created!');
      onOpenChange(false);
      setName('');
      setSelectedFriends(new Set());
      navigate({ to: '/rooms/$roomId', params: { roomId } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create room';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Create Study Room
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Room name */}
          <div>
            <label htmlFor="room-name" className="text-xs font-medium text-muted-foreground">
              Room Name
            </label>
            <Input
              id="room-name"
              placeholder="e.g. Chem 101 Study Sesh"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Friend selector */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Invite Friends ({selectedFriends.size} selected)
            </p>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {friendsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading friends...</p>
              ) : friends.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Add friends first to create a room
                </p>
              ) : (
                friends.map((friend) => {
                  const isSelected = selectedFriends.has(friend.userId);
                  return (
                    <UserCard
                      key={friend.userId}
                      username={friend.username}
                      displayName={friend.displayName}
                      avatarUrl={friend.avatarUrl}
                      catVariant={friend.catVariant}
                      catLevel={friend.catLevel}
                      className={cn('cursor-pointer', isSelected && 'border-accent bg-accent/10')}
                      action={
                        <button
                          type="button"
                          onClick={() => toggleFriend(friend.userId)}
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-md border transition-colors',
                            isSelected
                              ? 'bg-accent border-accent text-accent-foreground'
                              : 'border-[var(--glass-border)] hover:border-accent',
                          )}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </button>
                      }
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Create button */}
          <Button
            className="w-full"
            disabled={!name.trim() || selectedFriends.size === 0 || creating}
            onClick={() => void handleCreate()}
          >
            {creating ? 'Creating...' : 'Create Room'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
