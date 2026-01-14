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
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'cash_app_pay' | 'cash'>('card');
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [prepTime, setPrepTime] = useState<number>(0);

  const subtotal = getTotalPrice();
  const total = subtotal + tipAmount;

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
      setOrderId(createdOrder.id);
      
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order');
      navigate('/cart');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentMethodChange = async (method: 'card' | 'apple_pay' | 'cash_app_pay' | 'cash') => {
    setPaymentMethod(method);
    
    // If cash is selected, confirm order immediately
    if (method === 'cash') {
      await handleCashPayment();
    } else if (orderId && !clientSecret) {
      // Create payment intent for online payment methods
      await createPaymentIntent(method);
    }
  };

  const createPaymentIntent = async (method: 'card' | 'apple_pay' | 'cash_app_pay') => {
    try {
      setLoading(true);
      
      const response = await api.post('/payment/create-payment-intent', {
        orderId,
        paymentMethod: method,
        tipAmount,
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

  const handleCashPayment = async () => {
    try {
      setLoading(true);
      
      const response = await api.post('/payment/confirm-cash-payment', {
        orderId,
      });

      const { prepTime: time } = response.data.data;
      setPrepTime(time);
      
      clearCart();
      toast.success('Order confirmed! Pay when you pick up.');
      navigate(`/orders/${orderId}`, {
        state: { paymentSuccess: false, prepTime: time },
      });
      
    } catch (error: any) {
      console.error('Error confirming cash payment:', error);
      toast.error(error.response?.data?.message || 'Failed to confirm order');
    } finally {
      setLoading(false);
    }
  };

  const handleTipSelect = (amount: number) => {
    setTipAmount(amount);
    setCustomTip('');
    
    // If payment intent already created, recreate it with new tip
    if (clientSecret && paymentMethod !== 'cash') {
      createPaymentIntent(paymentMethod as 'card' | 'apple_pay' | 'cash_app_pay');
    }
  };

  const handleCustomTip = (value: string) => {
    setCustomTip(value);
    const amount = parseFloat(value) || 0;
    if (amount >= 0) {
      setTipAmount(amount);
      
      // If payment intent already created, recreate it with new tip
      if (clientSecret && paymentMethod !== 'cash') {
        createPaymentIntent(paymentMethod as 'card' | 'apple_pay' | 'cash_app_pay');
      }
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
        </div>

        {/* Payment Methods */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Method</h2>
            
            <div className="space-y-3 mb-6">
              <button
                onClick={() => handlePaymentMethodChange('card')}
                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                  paymentMethod === 'card'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-300 hover:border-primary-300'
                }`}
              >
                <div className="font-medium">Credit or Debit Card</div>
                <div className="text-sm text-gray-500">Pay with Visa, Mastercard, Amex</div>
              </button>

              <button
                onClick={() => handlePaymentMethodChange('apple_pay')}
                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                  paymentMethod === 'apple_pay'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-300 hover:border-primary-300'
                }`}
              >
                <div className="font-medium">🍎 Apple Pay</div>
                <div className="text-sm text-gray-500">Quick payment with Apple Pay</div>
              </button>

              <button
                onClick={() => handlePaymentMethodChange('cash_app_pay')}
                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                  paymentMethod === 'cash_app_pay'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-300 hover:border-primary-300'
                }`}
              >
                <div className="font-medium">💵 Cash App Pay</div>
                <div className="text-sm text-gray-500">Pay with Cash App</div>
              </button>

              <button
                onClick={() => handlePaymentMethodChange('cash')}
                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                  paymentMethod === 'cash'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-300 hover:border-primary-300'
                }`}
              >
                <div className="font-medium">💵 Cash on Pickup</div>
                <div className="text-sm text-gray-500">Pay when you collect your order</div>
              </button>
            </div>

            {/* Payment Form */}
            {paymentMethod !== 'cash' && clientSecret && (
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
                  paymentMethod={paymentMethod}
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
