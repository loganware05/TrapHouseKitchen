import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCheckoutSheetStore } from '../stores/checkoutSheetStore';

/**
 * Legacy route: cart is shown in the checkout sheet. Open the sheet and send users home.
 */
export default function CartPage() {
  const navigate = useNavigate();
  const open = useCheckoutSheetStore((s) => s.open);

  useEffect(() => {
    open();
    navigate('/', { replace: true });
  }, [open, navigate]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 md:ml-64">
      <p className="text-th-muted-fg text-sm">Opening your cart…</p>
    </div>
  );
}
