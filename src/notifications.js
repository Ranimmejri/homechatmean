const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    console.log('[sw] registered:', reg.scope);
    return reg;
  } catch (err) {
    console.error('[sw] registration failed:', err);
    return null;
  }
}

export async function subscribeToPush(swRegistration) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/push/vapid-public-key`);
    if (!res.ok) throw new Error('VAPID key not available');
    const { publicKey } = await res.json();

    const sub = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch(`${BACKEND_URL}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    });

    return sub;
  } catch (err) {
    console.error('[push] subscribe failed:', err);
    throw err;
  }
}

export async function unsubscribeFromPush(swRegistration) {
  const sub = await swRegistration.pushManager.getSubscription();
  if (!sub) return;

  await fetch(`${BACKEND_URL}/api/push/subscribe`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });

  await sub.unsubscribe();
}

export async function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}
