import { showPushNotification } from '@/lib/push-notifications';
import { useEffect, useRef } from 'react';
import { useFriends } from './use-friends';
import { useUnreadCount } from './use-messaging';
import { useNotificationSounds } from './use-notification-sounds';

/**
 * Watches unread message count and pending friend request count.
 * When either increases, plays the appropriate sound and fires a push notification
 * (push only fires when the tab is hidden).
 *
 * Mount this in AppLayout — no JSX output.
 */
export function useNotificationWatcher(): void {
  const { playSound } = useNotificationSounds();
  const unreadCount = useUnreadCount();
  const { pendingCount } = useFriends();

  const prevUnread = useRef<number | null>(null);
  const prevPending = useRef<number | null>(null);

  // New message notification
  useEffect(() => {
    if (prevUnread.current !== null && unreadCount > prevUnread.current) {
      playSound('message');
      showPushNotification('New Message', 'You have a new message on ScribeCat');
    }
    prevUnread.current = unreadCount;
  }, [unreadCount, playSound]);

  // Friend request notification
  useEffect(() => {
    if (prevPending.current !== null && pendingCount > prevPending.current) {
      playSound('friendRequest');
      showPushNotification('Friend Request', 'Someone sent you a friend request on ScribeCat');
    }
    prevPending.current = pendingCount;
  }, [pendingCount, playSound]);
}
