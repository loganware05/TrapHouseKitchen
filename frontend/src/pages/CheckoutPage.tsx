import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { toast } from 'sonner';
import stripePromise from '../lib/stripe';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import PaymentForm from '../components/PaymentForm';
import { DollarSign, ShoppingCart, Clock } from 'lucide-react';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [prepTime, setPrepTime] = useState<number>(0);
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponApplied, setCouponApplied] = useState(false);

  const subtotal = getTotalPrice();
  const total = Math.max(0, subtotal + tipAmount - couponDiscount);

  useEffect(() => {
    // Redirect if cart is empty or user not logged in
    if (items.length === 0) {
      toast.error('Your cart is empty');
      navigate('/menu');
      return;
    }

    if (!user) {
      toast.error('Please log in to checkout');
      navigate('/login');
      return;
    }

    // Create order when component mounts
    createOrder();
  }, []);

  const createOrder = async () => {
    try {
      setLoading(true);
      
      // Create the order
      const response = await api.post('/orders', {
        items: items.map(item => ({
          dishId: item.dish.id,
          quantity: item.quantity,
          customizations: item.customizations,
        })),
        specialInstructions: '',
      });

      const createdOrder = response.data.data.order;
      if (!createdOrder || !createdOrder.id) {
        throw new Error('Order creation failed - no order ID returned');
      }
      setOrderId(createdOrder.id);
      toast.success('Order created successfully');
      
    } catch (error: any) {
      console.error('Error creating order:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create order. Please try again.';
      toast.error(errorMessage);
      setTimeout(() => {
        navigate('/cart');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

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

  const createPaymentIntent = async () => {
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
      toast.error(error.response?.data?.message || 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const handleTipSelect = (amount: number) => {
    setTipAmount(amount);
    setCustomTip('');
    
    // If payment intent already created, recreate it with new tip
    if (clientSecret) {
      createPaymentIntent();
    }
  };

  const handleCustomTip = (value: string) => {
    setCustomTip(value);
    const amount = parseFloat(value) || 0;
    if (amount >= 0) {
      setTipAmount(amount);
      
      // If payment intent already created, recreate it with new tip
      if (clientSecret) {
        createPaymentIntent();
      }
    }
  };

  const handlePayNowClick = async () => {
    if (!orderId) {
      toast.error('Please wait for order to be created');
      return;
    }
    if (!clientSecret) {
      await createPaymentIntent();
    }
  };

  const handlePaymentSuccess = () => {
    clearCart();
    toast.success('Payment successful!');
    navigate(`/orders/${orderId}`, {
      state: { paymentSuccess: true, prepTime },
    });
  };

  if (loading && !orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Preparing your order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:ml-64 mb-20 md:mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Order Summary
            </h2>
            
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.dish.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.quantity}x {item.dish.name}
                  </span>
                  <span className="font-medium">${(item.dish.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tip</span>
                <span className="font-medium">${tipAmount.toFixed(2)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span className="font-medium">-${couponDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total</span>
                <span className="text-primary-600">${total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Tax included in price</p>
            </div>

            {prepTime > 0 && (
              <div className="mt-4 p-3 bg-primary-50 rounded-lg flex items-center">
                <Clock className="h-5 w-5 text-primary-600 mr-2" />
                <span className="text-sm text-primary-900">
                  Estimated prep time: <strong>{prepTime} minutes</strong>
                </span>
              </div>
            )}
          </div>

          {/* Tip Selection */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Add a Tip (Optional)
            </h3>
            
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[2, 5, 10].map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleTipSelect(amount)}
                  className={`py-2 px-4 rounded-lg border-2 transition-colors ${
                    tipAmount === amount && !customTip
                      ? 'border-primary-600 bg-primary-50 text-primary-600'
                      : 'border-gray-300 hover:border-primary-300'
                  }`}
                >
                  ${amount}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customTip}
                  onChange={(e) => handleCustomTip(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Coupon Code */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Have a Discount Code?
            </h3>
            {!couponApplied ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 uppercase"
                />
                <button
                  onClick={validateCoupon}
                  disabled={loading || !couponCode.trim()}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold text-green-800">{couponCode}</p>
                  <p className="text-sm text-green-600">
                    Saving ${couponDiscount.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={removeCoupon}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment</h2>
            
            {/* Payment Button */}
            {!clientSecret && (
              <button
                onClick={handlePayNowClick}
                disabled={loading || !orderId}
                className="w-full py-4 px-6 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : orderId ? 'Continue to Payment' : 'Creating Order...'}
              </button>
            )}

            {/* Stripe Payment Element */}
            {clientSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#ea580c',
                    },
                  },
                }}
              >
                <PaymentForm
                  orderId={orderId}
                  totalAmount={total}
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
