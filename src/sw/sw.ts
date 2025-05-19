/// <reference lib="webworker" />
/// <reference path="./service-worker.d.ts" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

// self.__WB_MANIFEST is default injection point
precacheAndRoute(self.__WB_MANIFEST);

// Clean old assets
cleanupOutdatedCaches();

// Navigation route
const navigationRoute = new NavigationRoute(createHandlerBoundToURL('/todo-claude/index.html'));
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

// 完全オフラインアプリなのでAPIリクエストのキャッシュは不要

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
    const now = new Date();
    const dueTime = new Date(dueAt);
    const diffMinutes = Math.round((dueTime.getTime() - now.getTime()) / (1000 * 60));
    
    let bodyText = '';
    if (diffMinutes > 0) {
      bodyText = `あと${diffMinutes}分で期限です`;
    } else if (diffMinutes === 0) {
      bodyText = '期限です';
    } else {
      bodyText = `${Math.abs(diffMinutes)}分過ぎています`;
    }
    
    (self.registration as ExtendedServiceWorkerRegistration).showNotification(title, {
      body: bodyText,
      icon: '/todo-claude/icon.svg',
      badge: '/todo-claude/icon.svg',
      tag: taskId,
      requireInteraction: true,
      timestamp: dueAt,
      actions: [
        { action: 'complete', title: '完了' },
        { action: 'snooze', title: '5分後に再通知' },
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
      self.clients.matchAll({ type: 'window' }).then(async (clients) => {
        const client = clients[0];
        if (client) {
          client.postMessage({ type: 'COMPLETE_TASK', taskId: tag });
          await client.focus();
        } else {
          const newClient = await self.clients.openWindow('/todo-claude/');
          newClient?.postMessage({ type: 'COMPLETE_TASK', taskId: tag });
        }
      })
    );
  } else if (action === 'snooze') {
    // Reschedule notification
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(async (clients) => {
        const client = clients[0];
        if (client) {
          client.postMessage({ type: 'SNOOZE_TASK', taskId: tag });
          await client.focus();
        } else {
          const newClient = await self.clients.openWindow('/todo-claude/');
          newClient?.postMessage({ type: 'SNOOZE_TASK', taskId: tag });
        }
      })
    );
  } else {
    // Default action - open app and focus on task
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(async (clients) => {
        const client = clients[0];
        if (client) {
          await client.focus();
          client.postMessage({ type: 'FOCUS_TASK', taskId: tag });
        } else {
          const newClient = await self.clients.openWindow('/todo-claude/');
          newClient?.postMessage({ type: 'FOCUS_TASK', taskId: tag });
        }
      })
    );
  }
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== 'static-resources')
          .map((cacheName) => caches.delete(cacheName))
      );
      
      // Take control of all clients immediately
      await self.clients.claim();
    })()
  );
});

// Handle skip waiting
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Handle fetch errors for offline fallback
self.addEventListener('fetch', (event) => {
  // Only handle navigation requests
  if (event.request.mode !== 'navigate') return;
  
  event.respondWith(
    fetch(event.request).catch(async () => {
      // Return cached index.html on navigation failure
      const response = await caches.match('/todo-claude/index.html');
      if (!response) {
        throw new Error('No cached index.html found');
      }
      return response;
    })
  );
});