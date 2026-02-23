import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFriends, useUserSearch } from '@/hooks/use-friends';
import { useQuery } from 'convex/react';
import { Check, Loader2, Search, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { UserCard } from './user-card';

export function UserSearch() {
  const [query, setQuery] = useState('');
  const results = useUserSearch(query);
  const { sendRequest, acceptRequest } = useFriends();

  return (
    <div className="space-y-4 p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by @username..."
          className="bg-background border-border pl-9"
        />
      </div>

      {query.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 pt-12">
          <Users className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">Type a username to find classmates</p>
        </div>
      )}

      {query.length === 1 && (
        <p className="text-center text-xs text-muted-foreground pt-4">
          Type at least 2 characters to search
        </p>
      )}

      {query.length >= 2 && results.length === 0 && (
        <p className="text-center text-xs text-muted-foreground pt-4">
          No users found matching &ldquo;{query}&rdquo;
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => (
            <SearchResult
              key={user.userId}
              userId={user.userId}
              username={user.username}
              displayName={user.displayName}
              avatarUrl={user.avatarUrl}
              onSendRequest={() => void sendRequest({ receiverId: user.userId })}
              onAcceptRequest={(id) =>
                void acceptRequest({ friendshipId: id as Id<'friendships'> })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SearchResult({
  userId,
  username,
  displayName,
  avatarUrl,
  onSendRequest,
  onAcceptRequest,
}: {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  onSendRequest: () => void;
  onAcceptRequest: (friendshipId: string) => void;
}) {
  const status = useQuery(api.friends.getFriendshipStatus, { otherUserId: userId });
  const [sent, setSent] = useState(false);

  const getAction = () => {
    if (!status) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

    if (status.status === 'accepted') {
      return (
        <span className="flex items-center gap-1 text-xs text-success">
          <Check className="h-3.5 w-3.5" />
          Friends
        </span>
      );
    }

    if (status.status === 'pending' && status.direction === 'outgoing') {
      return <span className="text-xs text-muted-foreground">Request Sent</span>;
    }

    if (status.status === 'pending' && status.direction === 'incoming') {
      return (
        <Button
          variant="secondary"
          size="sm"
          className="text-xs"
          onClick={() => onAcceptRequest(status.friendshipId)}
        >
          <Check className="mr-1 h-3 w-3" />
          Accept
        </Button>
      );
    }

    if (sent) {
      return <span className="text-xs text-muted-foreground">Request Sent</span>;
    }

    return (
      <Button
        variant="secondary"
        size="sm"
        className="text-xs"
        onClick={() => {
          onSendRequest();
          setSent(true);
        }}
      >
        <UserPlus className="mr-1 h-3 w-3" />
        Add Friend
      </Button>
    );
  };

  return (
    <UserCard
      username={username}
      displayName={displayName}
      avatarUrl={avatarUrl}
      action={getAction()}
    />
  );
}
