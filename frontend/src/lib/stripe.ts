import { loadStripe, type Stripe } from '@stripe/stripe-js';
import api from './api';

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Load Stripe.js using the API's publishable key when available so the
 * frontend always matches the account/mode that creates PaymentIntents.
 * Falls back to VITE_STRIPE_PUBLISHABLE_KEY if /payment/config is unreachable.
 */
export function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = (async () => {
      let key = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim();
      try {
        const res = await api.get<{
          status: string;
          data: { publishableKey?: string };
        }>('/payment/config');
        const fromApi = res.data?.data?.publishableKey?.trim();
        if (fromApi) {
          key = fromApi;
        }
      } catch (err) {
        console.warn(
          '[stripe] Could not load publishable key from API; using VITE fallback',
          err
        );
      }

      if (!key) {
        console.error('[stripe] No publishable key configured');
        return null;
      }

      const mode = key.startsWith('pk_live')
        ? 'live'
        : key.startsWith('pk_test')
          ? 'test'
          : 'unknown';
      if (mode === 'unknown') {
        console.warn('[stripe] Publishable key has unexpected prefix');
      }

      return loadStripe(key);
    })();
  }
  return stripePromise;
}

/** Promise suitable for `<Elements stripe={…} />`. */
const stripePromiseForElements = getStripePromise();
export default stripePromiseForElements;
