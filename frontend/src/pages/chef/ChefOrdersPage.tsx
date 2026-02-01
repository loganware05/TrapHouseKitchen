import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Package, CheckCircle, Archive, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { Order } from '../../types';

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PREPARING: 'bg-blue-100 text-blue-800',
  READY: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function ChefOrdersPage() {
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);

  const { data: ordersData, isLoading, error } = useQuery<Order[]>({
    queryKey: ['allOrders', showArchived],
    queryFn: async () => {
      const params = showArchived ? '?includeArchived=true' : '';
      const res = await api.get<{ data: { orders: Order[] } }>(`/orders/all${params}`);
      return res.data.data.orders;
    },
  });

  // Handle errors with useEffect
  useEffect(() => {
    if (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders. Please try again.');
    }
  }, [error]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.patch(`/orders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      toast.success('Order status updated!');
    },
    onError: () => {
      toast.error('Failed to update order status');
    },
  });

  const archiveCompletedMutation = useMutation({
    mutationFn: async () => {
      await api.post('/orders/archive-completed');
    },
    onSuccess: (data: any) => {
      // Invalidate all order queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      toast.success(data.data?.message || data.message || 'Order history archived successfully');
    },
    onError: (error: any) => {
      console.error('Archive error:', error);
      toast.error(error.response?.data?.message || 'Failed to archive orders');
    },
  });

  const resetCounterMutation = useMutation({
    mutationFn: async () => {
      await api.post('/orders/reset-counter');
    },
    onSuccess: (data: any) => {
      // Invalidate all order queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      toast.success(data.data?.message || data.message || 'Order counter reset to #1');
    },
    onError: (error: any) => {
      console.error('Reset counter error:', error);
      toast.error(error.response?.data?.message || 'Failed to reset order counter');
    },
  });

  const activeOrders = ordersData?.filter(
    (order) => !['COMPLETED', 'CANCELLED'].includes(order.status)
  ) || [];

  const completedOrders = ordersData?.filter(
    (order) => ['COMPLETED', 'CANCELLED'].includes(order.status)
  ) || [];

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateStatusMutation.mutate({ id: orderId, status: newStatus });
  };

  const handleArchiveCompleted = () => {
    if (confirm('Archive all completed and cancelled orders? This will hide them from the main view.')) {
      archiveCompletedMutation.mutate();
    }
  };

  const handleResetCounter = () => {
    if (confirm('Reset order counter to #1? This will affect all new orders going forward.')) {
      resetCounterMutation.mutate();
    }
  };

  const currentMaxOrderNumber = ordersData && ordersData.length > 0
    ? Math.max(...ordersData.map((o: Order) => o.orderNumber))
    : 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:ml-64 mb-20 md:mb-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-lg text-gray-600">Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:ml-64 mb-20 md:mb-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Orders</h2>
          <p className="text-red-700 mb-4">
            {error instanceof Error ? error.message : 'Failed to load orders. Please try again.'}
          </p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['allOrders'] })}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:ml-64 mb-20 md:mb-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600 mt-1">
            Current order counter: #{currentMaxOrderNumber}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleResetCounter}
            disabled={resetCounterMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Counter
          </button>
        </div>
      </div>

      {/* Active Orders */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Active Orders</h2>
        {activeOrders.length > 0 ? (
          <div className="grid gap-6">
            {activeOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      Order #{order.orderNumber}
                    </p>
                    <p className="text-sm text-gray-600">
                      Customer: {order.user?.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status as keyof typeof statusColors]}`}>
                    {order.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{item.dish.name}</p>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-gray-900">
                        ${(item.priceAtOrder * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                {order.specialInstructions && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-yellow-900">Special Instructions:</p>
                    <p className="text-sm text-yellow-800">{order.specialInstructions}</p>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-xl font-bold text-gray-900">
                    Total: ${order.totalPrice.toFixed(2)}
                  </p>
                  <div className="flex gap-2">
                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'PREPARING')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Package className="h-4 w-4" />
                        Start Preparing
                      </button>
                    )}
                    {order.status === 'PREPARING' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'READY')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Mark Ready
                      </button>
                    )}
                    {order.status === 'READY' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'COMPLETED')}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Complete
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to cancel this order?')) {
                          handleStatusChange(order.id, 'CANCELLED');
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600 mb-2">No active orders</p>
            <p className="text-sm text-gray-500">
              Orders will appear here once customers complete payment.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              (Showing orders with payment status: PAID or PENDING)
            </p>
          </div>
        )}
      </div>

      {/* Completed Orders */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Order History</h2>
          <div className="flex gap-3 items-center">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Show Archived
            </label>
            <button
              onClick={handleArchiveCompleted}
              disabled={archiveCompletedMutation.isPending || completedOrders.length === 0}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Archive className="h-4 w-4" />
              Archive All
            </button>
          </div>
        </div>
        {completedOrders.length > 0 ? (
          <div className="space-y-4">
            {completedOrders.slice(0, 10).map((order: Order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-900">Order #{order.orderNumber}</p>
                    <p className="text-sm text-gray-600">{order.user?.name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status as keyof typeof statusColors]}`}>
                      {order.status}
                    </span>
                    <p className="mt-2 text-lg font-bold text-gray-900">
                      ${order.totalPrice.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-lg shadow-md">
            <p className="text-gray-600">No completed orders yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

