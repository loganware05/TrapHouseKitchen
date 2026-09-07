import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchPushSubscriptionStatus,
  getNotificationPermission,
  isWebPushSupported,
  subscribeToWebPush,
  unsubscribeFromWebPush,
} from '../lib/webPush';

/**
 * Profile-only Web Push opt-in. Never mounts a permission prompt on first load —
 * permission is requested only when the customer turns the toggle on.
 */
export default function PushNotificationToggle() {
  const supported = isWebPushSupported();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState(getNotificationPermission());

  const refresh = useCallback(async () => {
    if (!supported) {
      setLoading(false);
      return;
    }
    try {
      const status = await fetchPushSubscriptionStatus();
      setEnabled(status.enabled && Notification.permission === 'granted');
      setPermission(getNotificationPermission());
    } catch {
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, [supported]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onToggle = async () => {
    if (busy || loading) return;
    setBusy(true);
    try {
      if (enabled) {
        await unsubscribeFromWebPush();
        setEnabled(false);
        toast.success('Order push notifications turned off');
      } else {
        await subscribeToWebPush();
        setEnabled(true);
        setPermission('granted');
        toast.success('You will get a push when your order is preparing, ready, or out for delivery');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update push notifications';
      if (/permission/i.test(message)) {
        setPermission(getNotificationPermission());
        toast.error('Notification permission is required. Enable it in browser settings, then try again.');
      } else if (/not configured/i.test(message)) {
        toast.error('Push notifications are not available on this server yet.');
      } else {
        toast.error(message);
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const permissionBlocked = permission === 'denied';
  const description = !supported
    ? 'Web Push is not supported in this browser.'
    : permissionBlocked
      ? 'Notifications are blocked for this site. Allow them in browser settings to enable.'
      : 'Get a browser notification when your order is preparing, ready, or out for delivery.';

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            {enabled ? (
              <Bell className="h-5 w-5 text-primary-600 shrink-0" aria-hidden />
            ) : (
              <BellOff className="h-5 w-5 text-gray-400 shrink-0" aria-hidden />
            )}
            Order notifications
          </h2>
          <p id="push-toggle-description" className="text-sm text-gray-600 mt-1">
            {description}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-describedby="push-toggle-description"
          aria-label="Order push notifications"
          disabled={!supported || permissionBlocked || loading || busy}
          onClick={() => void onToggle()}
          className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            enabled ? 'bg-primary-600' : 'bg-gray-200'
          }`}
        >
          <span className="sr-only">{enabled ? 'On' : 'Off'}</span>
          {busy || loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-500 absolute left-1/2 -translate-x-1/2" aria-hidden />
          ) : (
            <span
              aria-hidden
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          )}
        </button>
      </div>
    </div>
  );
}
