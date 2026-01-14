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
  paymentMethod: 'card' | 'apple_pay' | 'cash_app_pay';
  onSuccess: () => void;
}

export default function PaymentForm({
  orderId,
  totalAmount,
  paymentMethod,
  onSuccess,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
        },
      });

      if (error) {
        // Show error message
        setErrorMessage(error.message || 'Payment failed');
        toast.error(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded!
        toast.success('Payment successful!');
        onSuccess();
      } else if (paymentIntent) {
        // Handle other payment intent statuses
        switch (paymentIntent.status) {
          case 'processing':
            toast.info('Payment is processing...');
            break;
          case 'requires_action':
            // Additional authentication required
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

  const getButtonText = () => {
    if (isProcessing) {
      return 'Processing...';
    }
    if (paymentMethod === 'apple_pay') {
      return `Pay $${totalAmount.toFixed(2)} with Apple Pay`;
    }
    if (paymentMethod === 'cash_app_pay') {
      return `Pay $${totalAmount.toFixed(2)} with Cash App`;
    }
    return `Pay $${totalAmount.toFixed(2)}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Stripe Payment Element */}
      <div>
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {/* Error Message */}
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

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isProcessing || !stripe || !elements}
        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isProcessing && <Loader2 className="animate-spin h-5 w-5 mr-2" />}
        {getButtonText()}
      </button>

      {/* Security Notice */}
      <p className="text-xs text-gray-500 text-center">
        🔒 Secured by Stripe • Your payment information is encrypted
      </p>
    </form>
  );
}
