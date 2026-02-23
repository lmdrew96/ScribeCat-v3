import { Button } from '@/components/ui/button';
import { useFriends } from '@/hooks/use-friends';
import { Check, Clock, Inbox, Send, X } from 'lucide-react';
import type { Id } from '../../../../convex/_generated/dataModel';
import { UserCard } from './user-card';

export function FriendRequests() {
  const { incomingRequests, outgoingRequests, acceptRequest, declineRequest, cancelRequest } =
    useFriends();

  const hasAny = incomingRequests.length > 0 || outgoingRequests.length > 0;

  if (!hasAny) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <Inbox className="h-12 w-12 text-muted-foreground/30" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">No pending requests</p>
          <p className="text-xs text-muted-foreground">
            Friend requests you send or receive will show up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Incoming */}
      {incomingRequests.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Inbox className="h-3.5 w-3.5" />
            Incoming ({incomingRequests.length})
          </p>
          <div className="space-y-2">
            {incomingRequests.map((req) => (
              <UserCard
                key={req._id}
                username={req.username}
                displayName={req.displayName}
                avatarUrl={req.avatarUrl}
                action={
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                      title="Accept"
                      onClick={() =>
                        void acceptRequest({
                          friendshipId: req._id as Id<'friendships'>,
                        })
                      }
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Decline"
                      onClick={() =>
                        void declineRequest({
                          friendshipId: req._id as Id<'friendships'>,
                        })
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Outgoing */}
      {outgoingRequests.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Sent ({outgoingRequests.length})
          </p>
          <div className="space-y-2">
            {outgoingRequests.map((req) => (
              <UserCard
                key={req._id}
                username={req.username}
                displayName={req.displayName}
                avatarUrl={req.avatarUrl}
                subtitle="Pending..."
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      void cancelRequest({
                        friendshipId: req._id as Id<'friendships'>,
                      })
                    }
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    Cancel
                  </Button>
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
