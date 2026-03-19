/**
 * Browser Notification API wrapper.
 * Push notifications only fire when the tab is not visible.
 */

export function getPermissionStatus(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

/**
 * Show a browser push notification.
 * Only fires when the document is hidden (tab not in focus).
 */
export function showPushNotification(title: string, body: string): void {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (!document.hidden) return;

  new Notification(title, { body, icon: '/nuggy-baby-boy.png' });
}
