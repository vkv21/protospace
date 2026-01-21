import { useEffect, useRef, useState } from 'react';
import { loadOrInitializeStats, saveStats } from '../utils/statsStorage';

interface UseNotificationsOptions {
  continuousDeskTime: number; // Seconds
  enabled?: boolean;
}

interface UseNotificationsReturn {
  notificationPermission: NotificationPermission;
  requestPermission: () => Promise<void>;
  lastNotificationTime: Date | null;
}

export const useNotifications = ({
  continuousDeskTime,
  enabled = true,
}: UseNotificationsOptions): UseNotificationsReturn => {
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>(() => {
      if (typeof Notification === 'undefined') return 'denied';
      return Notification.permission;
    });

  const [lastNotificationTime, setLastNotificationTime] = useState<Date | null>(
    null
  );

  const lastCheckRef = useRef<number>(0);
  const settingsRef = useRef(() => loadOrInitializeStats().settings);

  // Show break reminder notification
  const showBreakReminder = (deskTime: number) => {
    if (
      typeof Notification === 'undefined' ||
      Notification.permission !== 'granted'
    ) {
      return;
    }

    const hours = Math.floor(deskTime / 3600);
    const minutes = Math.floor((deskTime % 3600) / 60);

    let timeMessage = '';
    if (hours > 0) {
      timeMessage = `${hours}h ${minutes}m`;
    } else {
      timeMessage = `${minutes} minutes`;
    }

    const notification = new Notification('Time for a break! 🧘', {
      body: `You've been at your desk for ${timeMessage}. Take a 5-10 minute break to stretch and rest your eyes.`,
      icon: '/vite.svg', // Use your app icon
      badge: '/vite.svg',
      tag: 'break-reminder',
      requireInteraction: false,
      silent: false,
    });

    // Focus window when notification is clicked
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-close after 10 seconds
    setTimeout(() => {
      notification.close();
    }, 10000);

    console.log('Break reminder notification shown');
  };

  // Request notification permission
  const requestPermission = async () => {
    if (typeof Notification === 'undefined') {
      console.warn('Notifications not supported in this browser');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      // Update settings
      const stats = loadOrInitializeStats();
      stats.notifications.enabled = permission === 'granted';
      saveStats(stats);
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    }
  };

  // Check for break reminder
  useEffect(() => {
    if (!enabled || notificationPermission !== 'granted') return;

    const settings = settingsRef.current();

    if (!settings.breakReminderEnabled) return;

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const minIntervalBetweenNotifications = 5 * 60 * 1000; // 5 minutes

      // Check if we should show notification
      if (
        continuousDeskTime > 0 &&
        continuousDeskTime >= settings.breakReminderInterval * 60
      ) {
        // Check if enough time has passed since last notification
        const timeSinceLastNotification = lastNotificationTime
          ? now - lastNotificationTime.getTime()
          : Infinity;

        if (timeSinceLastNotification >= minIntervalBetweenNotifications) {
          // Check if we haven't already notified for this period
          const currentPeriod = Math.floor(
            continuousDeskTime / (settings.breakReminderInterval * 60)
          );
          const lastCheckPeriod = Math.floor(
            lastCheckRef.current / (settings.breakReminderInterval * 60)
          );

          if (currentPeriod > lastCheckPeriod) {
            showBreakReminder(continuousDeskTime);
            setLastNotificationTime(new Date());
            lastCheckRef.current = continuousDeskTime;
          }
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(checkInterval);
  }, [
    continuousDeskTime,
    enabled,
    notificationPermission,
    lastNotificationTime,
  ]);

  // Auto-request permission on mount if not set
  useEffect(() => {
    if (
      notificationPermission === 'default' &&
      typeof Notification !== 'undefined'
    ) {
      // Don't auto-request, wait for user action
      console.log(
        'Notification permission not set. Call requestPermission() to enable.'
      );
    }
  }, [notificationPermission]);

  return {
    notificationPermission,
    requestPermission,
    lastNotificationTime,
  };
};
