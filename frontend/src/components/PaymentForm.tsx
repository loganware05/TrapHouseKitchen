import { useRef, useState } from 'react';
import {
  ExpressCheckoutElement,
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
  const [expressAvailability, setExpressAvailability] = useState<
    'loading' | 'available' | 'unavailable'
  >('loading');
  const processingRef = useRef(false);

  const confirmPayment = async (source: 'express' | 'fallback') => {
    if (!stripe || !elements || processingRef.current) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    setErrorMessage('');

    try {
      if (source === 'fallback') {
        if (!elementReady) {
          return;
        }
        const { error: submitError } = await elements.submit();
        if (submitError) {
          const message = submitError.message || 'Payment form incomplete';
          setErrorMessage(message);
          toast.error(message);
          return;
        }
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/payment/success?order_id=${encodeURIComponent(orderId)}`,
        },
      });

      if (error) {
        const message = error.message || 'Payment failed';
        setErrorMessage(message);
        toast.error(message);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast.success('Payment successful!');
        onSuccess();
      } else if (paymentIntent) {
        switch (paymentIntent.status) {
          case 'processing':
            setErrorMessage('Payment is still processing. Please wait before trying again.');
            toast.info('Payment is still processing.');
            break;
          case 'requires_action':
            setErrorMessage('Please complete the required payment authentication.');
            toast.info('Please complete the payment authentication.');
            break;
          default:
            setErrorMessage(
              `Payment was not completed (${String(paymentIntent.status).replace(/_/g, ' ')}).`
            );
        }
      } else {
        setErrorMessage('Stripe did not return a completed payment. Please try again.');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred');
      toast.error(err.message || 'An unexpected error occurred');
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  const canPay = !!stripe && !!elements && elementReady && !isProcessing;
  const expressAvailable = expressAvailability === 'available';

  return (
    <form className="space-y-6">
      {expressAvailability === 'loading' && (
        <p className="sr-only" role="status" aria-live="polite">
          Checking wallet availability…
        </p>
      )}

      <section
        aria-labelledby="express-checkout-heading"
        className={expressAvailable ? 'space-y-3' : 'h-0 overflow-hidden opacity-0'}
        aria-hidden={!expressAvailable}
      >
        <div>
          <h3 id="express-checkout-heading" className="text-sm font-semibold text-gray-900">
            Fast checkout
          </h3>
          <p className="mt-1 text-xs text-th-muted-fg">
            Apple Pay appears first when it is available on this device.
          </p>
        </div>
        <ExpressCheckoutElement
          options={{
            paymentMethods: {
              applePay: 'always',
              googlePay: 'auto',
              link: 'auto',
              amazonPay: 'never',
              paypal: 'never',
              klarna: 'never',
            },
            paymentMethodOrder: ['apple_pay', 'google_pay', 'link'],
            buttonTheme: {
              applePay: 'black',
            },
            buttonType: {
              applePay: 'plain',
            },
            buttonHeight: 52,
            layout: {
              maxColumns: 1,
              maxRows: 3,
              overflow: 'auto',
            },
          }}
          onReady={(event) => {
            setExpressAvailability(
              event.availablePaymentMethods ? 'available' : 'unavailable'
            );
          }}
          onConfirm={() => {
            void confirmPayment('express');
          }}
          onCancel={() => {
            setIsProcessing(false);
            processingRef.current = false;
            toast.info('Express checkout canceled. You can try again or pay another way.');
          }}
          onLoadError={(event) => {
            setExpressAvailability('unavailable');
            console.warn('[stripe] Express checkout unavailable', event.error);
          }}
        />
      </section>

      {expressAvailable && (
        <div className="flex items-center gap-3" aria-hidden="true">
          <div className="h-px flex-1 bg-th-border" />
          <span className="text-xs font-medium uppercase tracking-wide text-th-muted-fg">
            or pay another way
          </span>
          <div className="h-px flex-1 bg-th-border" />
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          {expressAvailable ? 'Card and other methods' : 'Payment details'}
        </h3>
        <PaymentElement
          options={{
            layout: 'tabs',
            wallets: {
              applePay: 'never',
              googlePay: 'never',
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
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg">
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
        type="button"
        data-testid="fallback-payment-submit"
        onClick={() => {
          void confirmPayment('fallback');
        }}
        disabled={!canPay}
        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isProcessing && <Loader2 className="animate-spin h-5 w-5 mr-2" />}
        {!elementReady && !isProcessing
          ? 'Loading payment details…'
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
