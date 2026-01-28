import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { CheckCircle, Clock, MapPin, Phone, Mail, Package, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import { Order } from '../types';

export default function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const paymentSuccess = location.state?.paymentSuccess || false;
  const prepTime = location.state?.prepTime || order?.prepTime || 25;

  useEffect(() => {
    if (!orderId) {
      navigate('/orders');
      return;
    }

    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${orderId}`);
      setOrder(response.data.data.order);
    } catch (error: any) {
      console.error('Error fetching order:', error);
      setError('Unable to load order details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-red-600 mb-4">
              <Package className="h-16 w-16 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'Unable to find this order'}</p>
            <button
              onClick={() => navigate('/orders')}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              View All Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  const estimatedPickupTime = new Date(order.createdAt);
  estimatedPickupTime.setMinutes(estimatedPickupTime.getMinutes() + prepTime);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 md:ml-64 mb-20 md:mb-8">
      <div className="max-w-3xl mx-auto">
        {/* Success Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {paymentSuccess ? 'Order Confirmed!' : 'Order Received!'}
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            {paymentSuccess 
              ? 'Your payment was successful and your order is being prepared.'
              : 'Your order has been placed successfully.'}
          </p>
          <div className="inline-flex items-center space-x-2 bg-gray-100 px-6 py-3 rounded-lg">
            <span className="text-sm text-gray-600">Order Number:</span>
            <span className="text-xl font-bold text-primary-600">#{order.orderNumber}</span>
          </div>
        </div>

        {/* Pickup Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Clock className="h-6 w-6 mr-2 text-primary-600" />
            Estimated Pickup Time
          </h2>
          <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-600 mb-2">Your order will be ready around:</p>
            <p className="text-3xl font-bold text-primary-600 mb-2">
              {estimatedPickupTime.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })}
            </p>
            <p className="text-sm text-gray-600">
              Preparation time: approximately {prepTime} minutes
            </p>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Details</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">${order.totalPrice.toFixed(2)}</span>
            </div>
            {order.tipAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tip</span>
                <span className="font-medium">${order.tipAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t pt-3">
              <span className="text-gray-900 font-semibold">Total Paid</span>
              <span className="text-lg font-bold text-primary-600">${order.finalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Payment Status</span>
              <span className={`font-medium ${
                order.paymentStatus === 'PAID' ? 'text-green-600' : 
                order.paymentStatus === 'UNPAID' ? 'text-yellow-600' : 
                'text-gray-600'
              }`}>
                {order.paymentStatus === 'PAID' ? '✓ Paid' : 
                 order.paymentStatus === 'UNPAID' ? 'Pay on Pickup' : 
                 order.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Order Items</h2>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-start pb-4 border-b last:border-b-0">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.dish.name}</h3>
                  <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                  {item.customizations && (
                    <p className="text-sm text-gray-500 mt-1">{item.customizations}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    ${(item.priceAtOrder * item.quantity).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">${item.priceAtOrder.toFixed(2)} each</p>
                </div>
              </div>
            ))}
          </div>
          {order.specialInstructions && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-1">Special Instructions:</p>
              <p className="text-sm text-gray-600">{order.specialInstructions}</p>
            </div>
          )}
        </div>

        {/* Pickup Location */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <MapPin className="h-6 w-6 mr-2 text-primary-600" />
            Pickup Location
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-lg font-semibold text-gray-900">TrapHouse Kitchen</p>
              <p className="text-gray-600">123 Main Street</p>
              <p className="text-gray-600">Birmingham, AL 35203</p>
            </div>
            <div className="flex items-center space-x-4 pt-3 border-t">
              <div className="flex items-center text-gray-600">
                <Phone className="h-5 w-5 mr-2" />
                <a href="tel:+12055551234" className="hover:text-primary-600">(205) 555-1234</a>
              </div>
              <div className="flex items-center text-gray-600">
                <Mail className="h-5 w-5 mr-2" />
                <a href="mailto:info@traphousekitchen.com" className="hover:text-primary-600">
                  info@traphousekitchen.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">What's Next?</h2>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="font-bold text-primary-600 mr-2">1.</span>
              <span>You'll receive a confirmation email with your order details</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-primary-600 mr-2">2.</span>
              <span>We'll notify you when your order is ready for pickup</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-primary-600 mr-2">3.</span>
              <span>Come to our location and show your order number</span>
            </li>
            {order.paymentStatus === 'UNPAID' && (
              <li className="flex items-start">
                <span className="font-bold text-primary-600 mr-2">4.</span>
                <span className="font-medium">Complete payment at pickup: ${order.finalAmount.toFixed(2)}</span>
              </li>
            )}
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center justify-center px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            View All Orders
          </button>
          <button
            onClick={() => navigate('/menu')}
            className="flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Order Again
            <ArrowRight className="ml-2 h-5 w-5" />
          </button>
        </div>

        {/* Email Confirmation Notice */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>A confirmation email has been sent to your email address.</p>
          <p className="mt-1">Save this order number for your records: <span className="font-mono font-bold text-gray-700">#{order.orderNumber}</span></p>
        </div>
      </div>
    </div>
  );
}
