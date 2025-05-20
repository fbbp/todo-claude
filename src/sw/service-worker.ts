/// <reference lib="webworker" />

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface ExtendedNotificationOptions extends NotificationOptions {
  actions?: NotificationAction[];
  badge?: string;
  data?: unknown;
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

export interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
  showNotification(title: string, options?: ExtendedNotificationOptions): Promise<void>;
}

export interface NotificationEvent extends ExtendedEvent {
  notification: Notification;
  action: string;
}