/**
 * Browser / PWA Web Push helpers for Profile opt-in.
 * Never auto-prompt — callers must invoke after an explicit user toggle.
 */

import api from './api';
import { urlBase64ToUint8Array } from './webPushCrypto';

export type PushPermissionState = NotificationPermission | 'unsupported';

export { urlBase64ToUint8Array } from './webPushCrypto';

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermission(): PushPermissionState {
  if (!isWebPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function fetchVapidPublicKey(): Promise<{ publicKey: string | null; configured: boolean }> {
  const res = await api.get<{
    status: string;
    data: { publicKey: string | null; configured: boolean };
  }>('/push/vapid-public-key');
  return res.data.data;
}

export async function fetchPushSubscriptionStatus(): Promise<{
  enabled: boolean;
  subscriptions: Array<{ id: string; endpoint: string }>;
}> {
  const res = await api.get<{
    status: string;
    data: {
      enabled: boolean;
      subscriptions: Array<{ id: string; endpoint: string }>;
    };
  }>('/push/subscriptions');
  return res.data.data;
}

async function waitForServiceWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.ready;
}

export async function subscribeToWebPush(): Promise<PushSubscription> {
  if (!isWebPushSupported()) {
    throw new Error('Web Push is not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted');
  }

  const { publicKey, configured } = await fetchVapidPublicKey();
  if (!configured || !publicKey) {
    throw new Error('Web Push is not configured on the server');
  }

  const registration = await waitForServiceWorker();
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Invalid push subscription from browser');
  }

  await api.post('/push/subscribe', {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    userAgent: navigator.userAgent,
  });

  return subscription;
}

export async function unsubscribeFromWebPush(options?: { all?: boolean }): Promise<void> {
  let endpoint: string | undefined;

  if (isWebPushSupported()) {
    try {
      const registration = await waitForServiceWorker();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        endpoint = subscription.endpoint;
        await subscription.unsubscribe().catch(() => {});
      }
    } catch {
      // Browser unsubscribe is best-effort
    }
  }

  if (options?.all || !endpoint) {
    await api.delete('/push/unsubscribe', { data: { all: true } });
    return;
  }

  await api.delete('/push/unsubscribe', { data: { endpoint } });
}

/** Best-effort cleanup on logout — never throws to callers. */
export async function revokePushOnLogout(): Promise<void> {
  try {
    await unsubscribeFromWebPush({ all: true });
  } catch {
    // Ignore — logout must still clear session
  }
}
