import { FormEvent, useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

type Props = {
  onComplete: () => void;
  onCancel?: () => void;
};

/**
 * Must be wrapped in Elements with a SetupIntent clientSecret.
 */
export default function SavePaymentMethodForm({ onComplete, onCancel }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setBusy(true);
    setErrorMessage('');

    try {
      const returnUrl = `${window.location.origin}/profile?setup_return=1`;
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Could not save card');
        toast.error(error.message || 'Could not save card');
        return;
      }

      if (setupIntent?.status === 'succeeded' && setupIntent.id) {
        try {
          await api.post('/payment/methods/sync', { setupIntentId: setupIntent.id });
        } catch (syncErr: unknown) {
          console.error(syncErr);
          toast.info('Card saved — syncing… refresh if it does not appear.');
        }
        toast.success('Card saved for faster checkout');
        onComplete();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
          wallets: { applePay: 'never', googlePay: 'never' },
        }}
      />
      {errorMessage && (
        <p className="text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !stripe || !elements}
          className="flex-1 flex items-center justify-center py-2.5 px-4 rounded-lg text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 font-medium"
        >
          {busy && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
          Save card
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
