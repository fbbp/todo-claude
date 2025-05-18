/// <reference lib="webworker" />

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface ExtendedNotificationOptions extends NotificationOptions {
  actions?: NotificationAction[];
  badge?: string;
  data?: any;
  dir?: NotificationDirection;
  icon?: string;
  image?: string;
  lang?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  timestamp?: number;
  vibrate?: VibratePattern;
}

interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
  showNotification(title: string, options?: ExtendedNotificationOptions): Promise<void>;
}

interface NotificationEvent extends ExtendedEvent {
  notification: Notification;
  action: string;
}