import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFriends } from '@/hooks/use-friends';
import { useUserProfile } from '@/hooks/use-user-profile';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { FriendRequests } from './friend-requests';
import { FriendsList } from './friends-list';
import { UserSearch } from './user-search';
import { UsernameSetupModal } from './username-setup-modal';

export function FriendsView() {
  const { hasProfile, isLoading } = useUserProfile();
  const { pendingCount } = useFriends();
  const [setupOpen, setSetupOpen] = useState(false);

  // Auto-open username setup if no profile
  useEffect(() => {
    if (!isLoading && !hasProfile) {
      setSetupOpen(true);
    }
  }, [isLoading, hasProfile]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full p-3">
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl glass">
          <Tabs defaultValue="friends" className="flex flex-1 flex-col">
            <div className="border-b border-[var(--glass-border)] px-4 pt-3">
              <TabsList className="glass-light">
                <TabsTrigger value="friends">Friends</TabsTrigger>
                <TabsTrigger value="requests" className="relative">
                  Requests
                  {pendingCount > 0 && (
                    <span
                      className={cn(
                        'ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white',
                      )}
                    >
                      {pendingCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="search">Search</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="friends" className="flex-1 overflow-y-auto mt-0">
              <FriendsList />
            </TabsContent>

            <TabsContent value="requests" className="flex-1 overflow-y-auto mt-0">
              <FriendRequests />
            </TabsContent>

            <TabsContent value="search" className="flex-1 overflow-y-auto mt-0">
              <UserSearch />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <UsernameSetupModal open={setupOpen} onOpenChange={setSetupOpen} dismissible={hasProfile} />
    </>
  );
}
