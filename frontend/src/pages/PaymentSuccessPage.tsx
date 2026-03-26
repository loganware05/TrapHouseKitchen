import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { trackOrderPlacedOnce, flushAnalytics } from '../stores/analyticsStore';

/**
 * Return URL for Stripe Payment Element redirects (e.g. 3DS).
 * Stripe appends payment_intent and redirect_status; optional order_id helps deep-link.
 */
export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const orderId = searchParams.get('order_id');
    const redirectStatus = searchParams.get('redirect_status');
    if (orderId) {
      if (redirectStatus === 'succeeded') {
        trackOrderPlacedOnce(orderId, { source: 'stripe_redirect' });
        void flushAnalytics();
      }
      navigate(`/orders/${orderId}`, {
        replace: true,
        state: {
          paymentSuccess: redirectStatus === 'succeeded',
        },
      });
      return;
    }
    navigate('/orders', { replace: true });
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <p className="text-gray-600">Completing your payment…</p>
    </div>
  );
}
