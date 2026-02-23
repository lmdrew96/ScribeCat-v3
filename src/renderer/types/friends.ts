/** TypeScript interfaces for the friends/social system */

export interface UserProfile {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export interface FriendInfo extends UserProfile {
  catVariant: string | null;
  catName: string | null;
  catLevel: number | null;
}

export interface FriendRequest {
  _id: string;
  direction: 'incoming' | 'outgoing';
  otherUserId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: number;
}

export type FriendshipStatus =
  | { status: 'none' }
  | {
      status: 'pending' | 'accepted' | 'declined' | 'cancelled';
      direction: 'incoming' | 'outgoing';
      friendshipId: string;
    };
