import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, CheckCircle, XCircle, Star } from 'lucide-react';
import api from '../lib/api';
import { Order } from '../types';

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PREPARING: 'bg-blue-100 text-blue-800',
  READY: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusIcons = {
  PENDING: Clock,
  PREPARING: Package,
  READY: CheckCircle,
  COMPLETED: CheckCircle,
  CANCELLED: XCircle,
};

export default function OrdersPage() {
  const navigate = useNavigate();
  
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await api.get<{ data: { orders: Order[] } }>('/orders');
      return res.data.data.orders;
    },
  });

  // Get eligible orders for review to check which orders can be reviewed
  const { data: eligibleOrdersData } = useQuery({
    queryKey: ['eligibleOrders'],
    queryFn: async () => {
      const res = await api.get<{ data: { orders: Order[] } }>('/reviews/eligible-orders');
      return res.data.data.orders;
    },
  });

  const canReviewOrder = (orderId: string) => {
    return eligibleOrdersData?.some(order => order.id === orderId) || false;
  };

  const handleWriteReview = (orderId: string) => {
    navigate(`/reviews/new?orderId=${orderId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:ml-64 mb-20 md:mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>

      {ordersData && ordersData.length > 0 ? (
        <div className="space-y-6">
          {ordersData.map((order) => {
            const StatusIcon = statusIcons[order.status];
            return (
              <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      Order #{order.orderNumber}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()} at{' '}
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
                      statusColors[order.status]
                    }`}
                  >
                    <StatusIcon className="h-4 w-4" />
                    {order.status}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.dish.name}</p>
                        <p className="text-sm text-gray-500">
                          Quantity: {item.quantity} × ${item.priceAtOrder.toFixed(2)}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">
                        ${(item.priceAtOrder * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                {order.specialInstructions && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Special Instructions:</strong> {order.specialInstructions}
                    </p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold text-gray-900">Total:</span>
                    <span className="text-2xl font-bold text-primary-600">
                      ${order.totalPrice.toFixed(2)}
                    </span>
                  </div>
                  
                  {/* Write Review Button for Completed/Paid Orders */}
                  {order.status === 'COMPLETED' && order.paymentStatus === 'PAID' && canReviewOrder(order.id) && (
                    <button
                      onClick={() => handleWriteReview(order.id)}
                      className="w-full mt-4 py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Star className="h-5 w-5" />
                      Write Review
                    </button>
                  )}
                  
                  {/* Show message if order is completed but all dishes reviewed */}
                  {order.status === 'COMPLETED' && order.paymentStatus === 'PAID' && !canReviewOrder(order.id) && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        All dishes from this order have been reviewed
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-600 mb-2">No orders yet</p>
          <p className="text-gray-500 mb-6">
            Start ordering delicious food from our menu!
          </p>
          <a
            href="/menu"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Browse Menu
          </a>
        </div>
      )}
    </div>
  );
}

