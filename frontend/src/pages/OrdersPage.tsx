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
  
  const { data: ordersData, isLoading, isError, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await api.get<{ data: { orders: Order[] } }>('/orders');
      return res.data.data.orders;
    },
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleWriteReview = (orderId: string, dishId?: string) => {
    if (dishId) {
      navigate(`/reviews/new?orderId=${orderId}&dishId=${dishId}`);
    } else {
      navigate(`/reviews/new?orderId=${orderId}`);
    }
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

      {isError ? (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 mb-2">
            Unable to load orders. Please try again.
          </p>
          <button
            onClick={() => refetch()}
            className="text-sm text-red-600 hover:underline font-medium"
          >
            Retry
          </button>
        </div>
      ) : null}

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
                  {order.items.map((item) => {
                    const review = item.reviews?.[0];
                    
                    return (
                      <div key={item.id} className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.dish.name}</p>
                          <p className="text-sm text-gray-500">
                            Quantity: {item.quantity} × ${item.priceAtOrder.toFixed(2)}
                          </p>
                          
                          {/* Per-dish review status badges */}
                          {order.status === 'COMPLETED' && order.paymentStatus === 'PAID' && (
                            <div className="mt-1">
                              {review ? (
                                review.approved ? (
                                  <span className="text-xs text-green-600 flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" /> Reviewed • Coupon Earned
                                  </span>
                                ) : (
                                  <span className="text-xs text-yellow-600 flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Pending Approval
                                  </span>
                                )
                              ) : (
                                <button
                                  onClick={() => handleWriteReview(order.id, item.dishId)}
                                  className="text-xs text-primary-600 hover:underline flex items-center gap-1"
                                >
                                  <Star className="h-3 w-3" /> Write Review
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="font-semibold text-gray-900">
                          ${(item.priceAtOrder * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {order.specialInstructions && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Special Instructions:</strong> {order.specialInstructions}
                    </p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total:</span>
                    <span className="text-2xl font-bold text-primary-600">
                      ${order.totalPrice.toFixed(2)}
                    </span>
                  </div>

                  {order.status === 'COMPLETED' && order.paymentStatus === 'PAID' &&
                   order.items.some(item => !item.reviews?.length) && (
                    <button
                      onClick={() => handleWriteReview(order.id)}
                      className="w-full mt-4 py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Star className="h-5 w-5" />
                      Write Review
                    </button>
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

