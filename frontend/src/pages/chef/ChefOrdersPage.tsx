import { useState } from 'react';
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

  const { data: ordersData } = useQuery({
    queryKey: ['allOrders', showArchived],
    queryFn: async () => {
      const params = showArchived ? '?includeArchived=true' : '';
      const res = await api.get<{ data: { orders: Order[] } }>(`/orders/all${params}`);
      return res.data.data.orders;
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      toast.success(data.data.message || 'Order history archived successfully');
    },
    onError: () => {
      toast.error('Failed to archive orders');
    },
  });

  const resetCounterMutation = useMutation({
    mutationFn: async () => {
      await api.post('/orders/reset-counter');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      toast.success('Order counter reset to #1');
    },
    onError: () => {
      toast.error('Failed to reset order counter');
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
    ? Math.max(...ordersData.map(o => o.orderNumber))
    : 0;

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
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
                    {order.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {order.items.map((item) => (
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
            <p className="text-xl text-gray-600">No active orders</p>
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
            {completedOrders.slice(0, 10).map((order) => (
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
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
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

