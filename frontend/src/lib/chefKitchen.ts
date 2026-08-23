import api from './api';
import { CUSTOMER_ORDER_POLL_MS } from './customerOrders';
import type { Order } from '../types';
import type { PrepIntelligenceData } from '../components/chef/KitchenQueueSummary';

/** Same cadence as customer order status polling (Slice 6 / 9). */
export const CHEF_KITCHEN_POLL_MS = CUSTOMER_ORDER_POLL_MS;

export const chefAllOrdersQueryKey = (includeArchived = false) =>
  ['allOrders', includeArchived] as const;

export const prepIntelligenceQueryKey = ['prepIntelligence'] as const;

export async function fetchChefOrders(includeArchived = false): Promise<Order[]> {
  const params = includeArchived ? '?includeArchived=true' : '';
  const res = await api.get<{ data: { orders: Order[] } }>(`/orders/all${params}`);
  return res.data.data.orders;
}

export async function fetchPrepIntelligence(): Promise<PrepIntelligenceData> {
  const res = await api.get<{ data: PrepIntelligenceData }>('/orders/prep-intelligence');
  return res.data.data;
}

/** Live kitchen board: always poll so new paid orders and status changes appear without reload. */
export function chefAllOrdersQueryOptions(includeArchived = false) {
  return {
    queryKey: chefAllOrdersQueryKey(includeArchived),
    queryFn: () => fetchChefOrders(includeArchived),
    staleTime: 10_000,
    refetchOnMount: 'always' as const,
    refetchInterval: CHEF_KITCHEN_POLL_MS,
    refetchIntervalInBackground: true,
  };
}

export function prepIntelligenceQueryOptions() {
  return {
    queryKey: prepIntelligenceQueryKey,
    queryFn: fetchPrepIntelligence,
    staleTime: 10_000,
    refetchOnMount: 'always' as const,
    refetchInterval: CHEF_KITCHEN_POLL_MS,
    refetchIntervalInBackground: true,
  };
}
