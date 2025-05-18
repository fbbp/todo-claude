/// <reference lib="webworker" />
/// <reference path="./service-worker.d.ts" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

// self.__WB_MANIFEST is default injection point
precacheAndRoute(self.__WB_MANIFEST);

// Clean old assets
cleanupOutdatedCaches();

// Navigation route
const navigationRoute = new NavigationRoute(createHandlerBoundToURL('./index.html'));
registerRoute(navigationRoute);

// Cache static assets
registerRoute(
  ({ request }) => 
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image',
  new CacheFirst({
    cacheName: 'static-resources',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Handle API-like requests
registerRoute(
  ({ url }) => url.pathname.includes('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// Handle notification scheduling
interface NotificationPayload {
  taskId: string;
  title: string;
  dueAt: number;
}

const scheduledNotifications = new Map<string, NodeJS.Timeout>();

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    const payload = event.data.payload as NotificationPayload;
    scheduleNotification(payload);
  } else if (event.data?.type === 'CANCEL_NOTIFICATION') {
    const { taskId } = event.data;
    cancelNotification(taskId);
  }
});

function scheduleNotification(payload: NotificationPayload) {
  const { taskId, title, dueAt } = payload;
  
  // Cancel existing notification for this task
  cancelNotification(taskId);
  
  const delay = dueAt - Date.now();
  if (delay <= 0) return;
  
  const timeout = setTimeout(() => {
    (self.registration as ExtendedServiceWorkerRegistration).showNotification(title, {
      body: '期限です',
      icon: './icon.svg',
      badge: './icon.svg',
      tag: taskId,
      requireInteraction: true,
      actions: [
        { action: 'complete', title: '完了' },
        { action: 'snooze', title: '5分後に通知' },
      ],
    });
    
    scheduledNotifications.delete(taskId);
  }, delay);
  
  scheduledNotifications.set(taskId, timeout);
}

function cancelNotification(taskId: string) {
  const timeout = scheduledNotifications.get(taskId);
  if (timeout) {
    clearTimeout(timeout);
    scheduledNotifications.delete(taskId);
  }
}

// Handle notification actions
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  const { action } = event;
  const { tag } = event.notification;
  event.notification.close();
  
  if (action === 'complete') {
    // Send message to complete task
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        const client = clients[0];
        if (client) {
          client.postMessage({ type: 'COMPLETE_TASK', taskId: tag });
          client.focus();
        } else {
          self.clients.openWindow('/');
        }
      })
    );
  } else if (action === 'snooze') {
    // Reschedule notification
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        const client = clients[0];
        if (client) {
          client.postMessage({ type: 'SNOOZE_TASK', taskId: tag });
        }
      })
    );
  } else {
    // Default action - open app
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// Handle skip waiting
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});