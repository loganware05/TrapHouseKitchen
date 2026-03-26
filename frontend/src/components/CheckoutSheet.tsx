import { useState, useEffect, useRef } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { toast } from 'sonner';
import {
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
} from 'lucide-react';
import stripePromise from '../lib/stripe';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useCheckoutSheetStore } from '../stores/checkoutSheetStore';
import api from '../lib/api';
import PaymentForm from './PaymentForm';
import { useNavigate } from 'react-router-dom';
import { trackEvent, trackOrderPlacedOnce, flushAnalytics } from '../stores/analyticsStore';

const TIP_PRESETS = [0, 1, 2, 3];

export default function CheckoutSheet() {
  const navigate = useNavigate();
  const isOpen = useCheckoutSheetStore((s) => s.isOpen);
  const close = useCheckoutSheetStore((s) => s.close);

  const { items, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const [cartExpanded, setCartExpanded] = useState(true);
  const [couponOpen, setCouponOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [tipAmount, setTipAmount] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [orderId, setOrderId] = useState('');
  const [prepTime, setPrepTime] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const checkoutStartTracked = useRef(false);

  const subtotal = getTotalPrice();
  const total = Math.max(0, subtotal + tipAmount - couponDiscount);

  useEffect(() => {
    if (!isOpen) {
      checkoutStartTracked.current = false;
      setClientSecret('');
      setOrderId('');
      setPrepTime(0);
      setCouponOpen(false);
      setCartExpanded(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (
      !isOpen ||
      !user ||
      user.role !== 'CUSTOMER' ||
      items.length === 0 ||
      checkoutStartTracked.current
    ) {
      return;
    }
    checkoutStartTracked.current = true;
    const sub = useCartStore.getState().getTotalPrice();
    trackEvent('checkout_start', { subtotal: sub, itemCount: items.length });
  }, [isOpen, user?.id, items.length]);

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    try {
      setLoading(true);
      const response = await api.post('/coupons/validate', {
        code: couponCode.toUpperCase(),
      });
      const { discountAmount } = response.data.data;
      setCouponDiscount(discountAmount);
      setCouponApplied(true);
      toast.success(`Coupon applied! You saved $${discountAmount.toFixed(2)}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid coupon code');
      setCouponDiscount(0);
      setCouponApplied(false);
    } finally {
      setLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
    setCouponApplied(false);
    toast.info('Coupon removed');
  };

  const startCheckout = async () => {
    try {
      setLoading(true);
      const response = await api.post('/orders/checkout', {
        items: items.map((item) => ({
          dishId: item.dish.id,
          quantity: item.quantity,
          customizations: item.customizations || null,
        })),
        specialInstructions: '',
        tipAmount,
        ...(couponApplied && { couponCode: couponCode.toUpperCase() }),
      });

      const { order, clientSecret: secret, prepTime: time } = response.data.data;

      if (!order?.id || !secret) {
        throw new Error('Checkout failed — missing order or payment session');
      }

      setOrderId(order.id);
      setClientSecret(secret);
      setPrepTime(time);
    } catch (error: any) {
      console.error('Error starting checkout:', error);
      const errorMessage =
        error.response?.data?.message || error.message || 'Could not start checkout. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createPaymentIntent = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const response = await api.post('/payment/create-payment-intent', {
        orderId,
        tipAmount,
        ...(couponApplied && { couponCode: couponCode.toUpperCase() }),
      });
      const { clientSecret: secret, prepTime: time } = response.data.data;
      setClientSecret(secret);
      setPrepTime(time);
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      toast.error(error.response?.data?.message || 'Failed to update payment');
    } finally {
      setLoading(false);
    }
  };

  const handleTipSelect = (amount: number) => {
    setTipAmount(amount);
    setCustomTip('');
    if (clientSecret) {
      void createPaymentIntent();
    }
  };

  const handleCustomTip = (value: string) => {
    setCustomTip(value);
    const amount = parseFloat(value) || 0;
    if (amount >= 0) {
      setTipAmount(amount);
      if (clientSecret) {
        void createPaymentIntent();
      }
    }
  };

  const handlePayClick = async () => {
    if (!user) {
      toast.error('Please log in to checkout');
      close();
      navigate('/login');
      return;
    }
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    if (!clientSecret) {
      await startCheckout();
    }
  };

  const handlePaymentSuccess = () => {
    trackOrderPlacedOnce(orderId, {
      amount: total,
      subtotal,
      tipAmount,
      source: 'checkout_sheet',
    });
    void flushAnalytics();
    clearCart();
    close();
    toast.success('Payment successful!');
    navigate(`/orders/${orderId}`, {
      state: { paymentSuccess: true, prepTime },
    });
  };

  if (!isOpen) return null;

  const showCustomerCheckout = user?.role === 'CUSTOMER';

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        aria-label="Close checkout"
        onClick={close}
      />
      <div className="relative flex max-h-[min(92dvh,880px)] w-full max-w-lg flex-col rounded-t-th-xl bg-white shadow-2xl safe-bottom motion-safe:transition-transform">
        <div className="flex shrink-0 items-center justify-between border-b border-th-border px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-bold text-gray-900">Your order</h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {!showCustomerCheckout && (
            <p className="text-sm text-th-muted-fg">Sign in as a customer to check out.</p>
          )}

          {items.length === 0 ? (
            <p className="text-center text-th-muted-fg py-8">Your cart is empty.</p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setCartExpanded((e) => !e)}
                className="flex w-full items-center justify-between rounded-th-md bg-th-surface-muted px-3 py-2 text-left text-sm font-semibold text-gray-900"
              >
                <span>
                  {items.reduce((n, i) => n + i.quantity, 0)} items · ${subtotal.toFixed(2)}
                </span>
                {cartExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {cartExpanded && (
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li
                      key={item.dish.id}
                      className="flex gap-3 rounded-th-md border border-th-border p-3"
                    >
                      {item.dish.imageUrl ? (
                        <img
                          src={item.dish.imageUrl}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-th-sm object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-th-sm bg-primary-100 text-primary-700 font-bold">
                          {item.dish.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{item.dish.name}</p>
                        <p className="text-sm text-primary-600 font-semibold">${item.dish.price.toFixed(2)}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex items-center rounded-th-sm border border-th-border">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.dish.id, Math.max(1, item.quantity - 1))}
                              className="p-2 hover:bg-gray-50"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.dish.id, item.quantity + 1)}
                              className="p-2 hover:bg-gray-50"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              trackEvent('remove_from_cart', {
                                dishId: item.dish.id,
                                name: item.dish.name,
                                quantity: item.quantity,
                              });
                              removeItem(item.dish.id);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-th-sm"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">Tip</p>
                <div className="flex flex-wrap gap-2">
                  {TIP_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleTipSelect(amt)}
                      disabled={!!clientSecret && loading}
                      className={`min-w-[3.5rem] rounded-th-md border-2 px-3 py-2 text-sm font-medium transition-colors ${
                        tipAmount === amt && customTip === ''
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-th-border text-gray-700 hover:border-primary-200'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
                <label className="mt-2 block text-xs font-medium text-th-muted-fg">Custom</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-th-muted-fg">$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={customTip}
                    onChange={(e) => handleCustomTip(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-th-md border border-th-border py-2 pl-8 pr-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="rounded-th-md border border-th-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCouponOpen((o) => !o)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-900 bg-th-surface-muted"
                >
                  Coupon code
                  {couponOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {couponOpen && (
                  <div className="p-3 border-t border-th-border space-y-2">
                    {!couponApplied ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="CODE"
                          disabled={!!clientSecret}
                          className="flex-1 rounded-th-md border border-th-border px-3 py-2 text-sm uppercase disabled:bg-gray-100"
                        />
                        <button
                          type="button"
                          onClick={() => void validateCoupon()}
                          disabled={loading || !couponCode.trim() || !!clientSecret}
                          className="rounded-th-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          Apply
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-th-md bg-green-50 px-3 py-2 text-sm">
                        <span className="font-medium text-green-800">−${couponDiscount.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={removeCoupon}
                          disabled={!!clientSecret}
                          className="text-red-600 text-sm font-medium disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1 rounded-th-md bg-th-surface-muted px-3 py-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-th-muted-fg">Subtotal</span>
                  <span className="font-medium tabular-nums">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-th-muted-fg">Tip</span>
                  <span className="font-medium tabular-nums">${tipAmount.toFixed(2)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount</span>
                    <span className="font-medium tabular-nums">−${couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-th-border pt-2 text-base font-bold">
                  <span>Total</span>
                  <span className="text-primary-600 tabular-nums">${total.toFixed(2)}</span>
                </div>
                <p className="text-xs text-th-muted-fg">Tax included in item prices</p>
              </div>

              {clientSecret && showCustomerCheckout && (
                <div className="rounded-th-md border border-th-border p-4">
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: { colorPrimary: '#ea580c', borderRadius: '10px' },
                      },
                    }}
                  >
                    <PaymentForm orderId={orderId} totalAmount={total} onSuccess={handlePaymentSuccess} />
                  </Elements>
                </div>
              )}
            </>
          )}
        </div>

        {items.length > 0 && showCustomerCheckout && (
          <div className="shrink-0 border-t border-th-border bg-white p-4 safe-bottom">
            {!clientSecret ? (
              <button
                type="button"
                onClick={() => void handlePayClick()}
                disabled={loading}
                className="w-full rounded-th-lg bg-gray-900 py-4 text-base font-bold text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Preparing…' : `Pay $${total.toFixed(2)}`}
              </button>
            ) : (
              <p className="text-center text-xs text-th-muted-fg">Complete payment in the form above</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
