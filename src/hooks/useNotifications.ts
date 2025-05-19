import { useEffect, useState } from 'react';
import { useServiceWorker } from './useServiceWorker';
import { useSettings } from '../store/useSettings';
import type { Task } from '../db';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { registration } = useServiceWorker();
  const { notifyBeforeMin, snoozeMin } = useSettings();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    }
    return 'denied';
  };

  const scheduleNotification = (task: Task) => {
    if (!registration?.active || permission !== 'granted' || !task.dueAt) {
      return;
    }

    const notificationTime = task.dueAt - (notifyBeforeMin * 60 * 1000);
    
    if (notificationTime > Date.now()) {
      registration.active.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        payload: {
          taskId: task.id,
          title: task.title,
          dueAt: notificationTime,
        },
      });
    }
  };

  const cancelNotification = (taskId: string) => {
    if (!registration?.active) {
      return;
    }

    registration.active.postMessage({
      type: 'CANCEL_NOTIFICATION',
      taskId,
    });
  };

  const snoozeNotification = (task: Task) => {
    if (!registration?.active || !task.dueAt) {
      return;
    }

    // Reschedule notification for snoozeMin minutes from now
    const snoozeTime = Date.now() + (snoozeMin * 60 * 1000);
    
    registration.active.postMessage({
      type: 'SCHEDULE_NOTIFICATION',
      payload: {
        taskId: task.id,
        title: task.title,
        dueAt: snoozeTime,
      },
    });
  };

  // Listen for messages from service worker
  useEffect(() => {
    if (!navigator.serviceWorker) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, taskId } = event.data;
      
      if (type === 'COMPLETE_TASK') {
        // This will be handled by the main app
        window.dispatchEvent(new CustomEvent('completeTask', { detail: { taskId } }));
      } else if (type === 'SNOOZE_TASK') {
        // This will be handled by the main app
        window.dispatchEvent(new CustomEvent('snoozeTask', { detail: { taskId } }));
      } else if (type === 'FOCUS_TASK') {
        // This will be handled by the main app
        window.dispatchEvent(new CustomEvent('focusTask', { detail: { taskId } }));
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  return {
    permission,
    requestPermission,
    scheduleNotification,
    cancelNotification,
    snoozeNotification,
  };
}