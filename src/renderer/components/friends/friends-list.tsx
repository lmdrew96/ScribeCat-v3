import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFriends } from '@/hooks/use-friends';
import { useStartConversation } from '@/hooks/use-messaging';
import { useNavigate } from '@tanstack/react-router';
import { MessageSquare, MoreHorizontal, ShieldOff, UserMinus, Users } from 'lucide-react';
import { UserCard } from './user-card';

export function FriendsList() {
  const { friends, removeFriend, blockUser, isLoading } = useFriends();
  const startConversation = useStartConversation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading friends...</p>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <Users className="h-12 w-12 text-muted-foreground/30" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">No friends yet</p>
          <p className="text-xs text-muted-foreground">Search for classmates to add!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        {friends.length} friend{friends.length !== 1 ? 's' : ''}
      </p>
      {friends
        .filter((f): f is NonNullable<typeof f> => f != null)
        .map((friend) => (
          <UserCard
            key={friend.userId}
            username={friend.username}
            displayName={friend.displayName}
            avatarUrl={friend.avatarUrl}
            catVariant={friend.catVariant}
            catLevel={friend.catLevel}
            isOnline={friend.isOnline}
            action={
              <FriendActions
                userId={friend.userId}
                displayName={friend.displayName}
                onMessage={async () => {
                  const conversationId = await startConversation({ otherUserId: friend.userId });
                  navigate({ to: '/messages/$conversationId', params: { conversationId } });
                }}
                onRemove={() => void removeFriend({ friendUserId: friend.userId })}
                onBlock={() => void blockUser({ blockedId: friend.userId })}
              />
            }
          />
        ))}
    </div>
  );
}

function FriendActions({
  displayName,
  onMessage,
  onRemove,
  onBlock,
}: {
  userId: string;
  displayName: string;
  onMessage: () => void;
  onRemove: () => void;
  onBlock: () => void;
}) {
  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onMessage}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Message
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <AlertDialogTrigger asChild>
            <DropdownMenuItem className="text-destructive">
              <UserMinus className="mr-2 h-4 w-4" />
              Remove Friend
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={onBlock}>
            <ShieldOff className="mr-2 h-4 w-4" />
            Block User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Friend</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove {displayName} as a friend? They won&apos;t be notified,
            but you&apos;ll need to send a new request to reconnect.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onRemove}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
