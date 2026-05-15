import webpush from 'web-push';

// keyed by endpoint so duplicates are overwritten
const subscriptions = new Map();

export function initVapid() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[notifier] VAPID keys missing — push notifications disabled. Run: npm run gen-vapid');
    return false;
  }
  webpush.setVapidDetails(VAPID_EMAIL || 'mailto:admin@localhost', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return true;
}

export function addSubscription(sub) {
  subscriptions.set(sub.endpoint, sub);
  console.log(`[notifier] subscription added (total: ${subscriptions.size})`);
}

export function removeSubscription(endpoint) {
  subscriptions.delete(endpoint);
}

export async function sendNotification(payload) {
  if (subscriptions.size === 0) return;
  const body = JSON.stringify(payload);
  const sends = [...subscriptions.values()].map(async (sub) => {
    try {
      await webpush.sendNotification(sub, body);
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        // subscription expired or unregistered
        subscriptions.delete(sub.endpoint);
      }
    }
  });
  await Promise.allSettled(sends);
}
