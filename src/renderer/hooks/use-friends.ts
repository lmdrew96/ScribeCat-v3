import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export function useFriends() {
  const friends = useQuery(api.friends.listFriends);
  const requests = useQuery(api.friends.listPendingRequests);
  const pendingCount = useQuery(api.friends.pendingRequestCount);

  const sendRequest = useMutation(api.friends.sendRequest);
  const acceptRequest = useMutation(api.friends.acceptRequest);
  const declineRequest = useMutation(api.friends.declineRequest);
  const cancelRequest = useMutation(api.friends.cancelRequest);
  const removeFriend = useMutation(api.friends.removeFriend);
  const blockUser = useMutation(api.blocks.blockUser);

  return {
    friends: friends ?? [],
    incomingRequests: requests?.incoming ?? [],
    outgoingRequests: requests?.outgoing ?? [],
    pendingCount: pendingCount ?? 0,
    isLoading: friends === undefined,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
    blockUser,
  };
}

export function useUserSearch(searchQuery: string) {
  const results = useQuery(
    api.userProfiles.searchUsers,
    searchQuery.length >= 2 ? { query: searchQuery } : 'skip',
  );
  return results ?? [];
}
