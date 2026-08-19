import api from './api';
import type { Order, OrderStatus } from '../types';

export const customerOrdersQueryKey = ['orders'] as const;

export async function fetchCustomerOrders(): Promise<Order[]> {
  const res = await api.get<{ data: { orders: Order[] } }>('/orders');
  return res.data.data.orders;
}

export function isActiveCustomerOrder(order: Order): boolean {
  return (
    order.paymentStatus === 'PAID' &&
    order.status !== 'COMPLETED' &&
    order.status !== 'CANCELLED'
  );
}

export const customerOrderStatusLabel: Record<OrderStatus, string> = {
  PENDING: 'Placed',
  PREPARING: 'Preparing',
  READY: 'Ready for pickup',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export function customerOrdersQueryOptions(enabled = true) {
  return {
    queryKey: customerOrdersQueryKey,
    queryFn: fetchCustomerOrders,
    enabled,
    staleTime: 30_000,
    refetchOnMount: 'always' as const,
    refetchInterval: (query: { state: { data?: Order[] } }) => {
      const orders = query.state.data;
      if (!orders?.some(isActiveCustomerOrder)) {
        return false;
      }
      return 15_000;
    },
  };
}

export function invalidateCustomerOrders(
  queryClient: { invalidateQueries: (opts: { queryKey: readonly string[] }) => void }
) {
  queryClient.invalidateQueries({ queryKey: customerOrdersQueryKey });
}
