import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCheckoutSheetStore } from '../stores/checkoutSheetStore';

/**
 * Legacy route: checkout lives in the slide-up sheet. Open it and return to home.
 */
export default function CheckoutPage() {
  const navigate = useNavigate();
  const open = useCheckoutSheetStore((s) => s.open);

  useEffect(() => {
    open();
    navigate('/', { replace: true });
  }, [open, navigate]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 md:ml-64">
      <p className="text-th-muted-fg text-sm">Opening checkout…</p>
    </div>
  );
}
