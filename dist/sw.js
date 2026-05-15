// Service Worker — handles Web Push notifications from the ESP32 backend

const ICON = '/favicon.ico';

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};

  const options = {
    body:             data.body  || 'Sensor alert from ESP32',
    icon:             ICON,
    badge:            ICON,
    tag:              data.tag   || 'esp32-alert',
    renotify:         true,
    requireInteraction: data.critical ?? false,
    vibrate:          data.critical ? [200, 100, 200, 100, 400] : [200, 100, 200],
    data:             { url: self.location.origin },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'ESP32 Alert', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((wins) => {
        const existing = wins.find((w) => w.url === event.notification.data?.url);
        return existing ? existing.focus() : clients.openWindow('/');
      })
  );
});
