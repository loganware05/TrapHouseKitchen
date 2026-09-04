import api from './api';
import type { Order, OrderStatus } from '../types';
import { myCouponsQueryKey } from './authQueryKeys';

export function customerOrdersQueryKey(userId: string) {
  return ['orders', userId] as const;
}

export const CUSTOMER_ORDER_POLL_MS = 15_000;

export function customerOrderQueryKey(userId: string, orderId: string) {
  return ['orders', userId, orderId] as const;
}

export async function fetchCustomerOrders(): Promise<Order[]> {
  const res = await api.get<{ data: { orders: Order[] } }>('/orders');
  return res.data.data.orders;
}

export async function fetchCustomerOrder(orderId: string): Promise<Order> {
  const res = await api.get<{ data: { order: Order } }>(`/orders/${orderId}`);
  return res.data.data.order;
}

/**
 * Load a single order; optionally sync payment if still unpaid (checkout settle).
 */
export async function fetchCustomerOrderWithPaymentSync(orderId: string): Promise<Order> {
  let order = await fetchCustomerOrder(orderId);
  if (order.paymentStatus !== 'PAID') {
    try {
      await api.post(`/payment/sync-order/${orderId}`);
      order = await fetchCustomerOrder(orderId);
    } catch (syncError) {
      console.warn('Order payment sync failed:', syncError);
    }
  }
  return order;
}

export function isActiveCustomerOrder(order: Order): boolean {
  return (
    order.paymentStatus === 'PAID' &&
    order.status !== 'COMPLETED' &&
    order.status !== 'CANCELLED'
  );
}

/** True while confirmation should keep polling status (includes unpaid settle). */
export function shouldPollCustomerOrder(order: Order | undefined): boolean {
  if (!order) {
    return true;
  }
  return order.status !== 'COMPLETED' && order.status !== 'CANCELLED';
}

export const customerOrderStatusLabel: Record<OrderStatus, string> = {
  PENDING: 'Placed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  OUT_FOR_DELIVERY: 'Out for delivery',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export function customerOrdersQueryOptions(userId: string | undefined, enabled = true) {
  const id = userId ?? '';
  return {
    queryKey: customerOrdersQueryKey(id),
    queryFn: fetchCustomerOrders,
    enabled: enabled && !!userId,
    staleTime: 30_000,
    refetchOnMount: 'always' as const,
    refetchIntervalInBackground: true,
    refetchInterval: (query: { state: { data?: Order[] } }) => {
      const orders = query.state.data;
      if (!orders?.some(isActiveCustomerOrder)) {
        return false;
      }
      return CUSTOMER_ORDER_POLL_MS;
    },
  };
}

export function customerOrderQueryOptions(
  userId: string | undefined,
  orderId: string,
  enabled = true
) {
  const id = userId ?? '';
  return {
    queryKey: customerOrderQueryKey(id, orderId),
    queryFn: () => fetchCustomerOrderWithPaymentSync(orderId),
    enabled: enabled && !!userId && !!orderId,
    staleTime: 10_000,
    refetchOnMount: 'always' as const,
    refetchIntervalInBackground: true,
    refetchInterval: (query: { state: { data?: Order } }) => {
      if (!shouldPollCustomerOrder(query.state.data)) {
        return false;
      }
      return CUSTOMER_ORDER_POLL_MS;
    },
  };
}

export function invalidateCustomerOrders(
  queryClient: { invalidateQueries: (opts: { queryKey: readonly string[] }) => void },
  userId?: string
) {
  if (userId) {
    queryClient.invalidateQueries({ queryKey: customerOrdersQueryKey(userId) });
    queryClient.invalidateQueries({ queryKey: myCouponsQueryKey(userId) });
    return;
  }
  // Prefix match when caller has no user id (still clears all users' order/coupon caches)
  queryClient.invalidateQueries({ queryKey: ['orders'] });
  queryClient.invalidateQueries({ queryKey: ['myCoupons'] });
}

/** Keep My Orders / Home list in sync when confirmation polls a single order. */
export function syncCustomerOrderIntoListCache(
  queryClient: {
    setQueryData: (
      key: readonly string[],
      updater: (old: Order[] | undefined) => Order[] | undefined
    ) => void;
  },
  userId: string,
  order: Order
) {
  queryClient.setQueryData(customerOrdersQueryKey(userId), (old) => {
    if (!old) {
      return old;
    }
    const idx = old.findIndex((o) => o.id === order.id);
    if (idx === -1) {
      return old;
    }
    const next = old.slice();
    next[idx] = { ...old[idx], ...order };
    return next;
  });
}
