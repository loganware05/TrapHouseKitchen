import { useState, FormEvent } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface PaymentFormProps {
  orderId: string;
  totalAmount: number;
  onSuccess: () => void;
}

export default function PaymentForm({
  orderId,
  totalAmount,
  onSuccess,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [elementReady, setElementReady] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !elementReady) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      // Required for Payment Element: validate/mount before confirmPayment
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErrorMessage(submitError.message || 'Payment form incomplete');
        toast.error(submitError.message || 'Payment form incomplete');
        return;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/payment/success?order_id=${encodeURIComponent(orderId)}`,
        },
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed');
        toast.error(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast.success('Payment successful!');
        onSuccess();
      } else if (paymentIntent) {
        switch (paymentIntent.status) {
          case 'processing':
            toast.info('Payment is processing...');
            break;
          case 'requires_action':
            toast.info('Please complete the authentication');
            break;
          default:
            setErrorMessage('Payment status: ' + paymentIntent.status);
        }
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred');
      toast.error(err.message || 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const canPay = !!stripe && !!elements && elementReady && !isProcessing;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <PaymentElement
          options={{
            layout: 'tabs',
            wallets: {
              applePay: 'auto',
              googlePay: 'auto',
            },
          }}
          onReady={() => setElementReady(true)}
          onLoadError={(event) => {
            setElementReady(false);
            const msg =
              event.error?.message ||
              'Could not load payment form. Check that the publishable key matches the payment mode (test vs live).';
            setErrorMessage(msg);
            toast.error(msg);
          }}
        />
        {!elementReady && !errorMessage && (
          <p className="mt-3 text-sm text-th-muted-fg" aria-live="polite">
            Loading secure payment form…
          </p>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-sm text-red-600 hover:text-red-700 mt-2 underline"
          >
            Try again
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={!canPay}
        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isProcessing && <Loader2 className="animate-spin h-5 w-5 mr-2" />}
        {!elementReady && !isProcessing
          ? 'Waiting for payment form…'
          : isProcessing
            ? 'Processing...'
            : `Pay $${totalAmount.toFixed(2)}`}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Secured by Stripe · Your payment information is encrypted
      </p>
    </form>
  );
}
