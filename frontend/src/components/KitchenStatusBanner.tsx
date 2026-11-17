import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import api from '../lib/api';

export type KitchenStatusPayload = {
  acceptingOrders: boolean;
  scheduleEnabled: boolean;
  openNow: boolean;
  reason: 'paused' | 'outside_hours' | 'at_capacity' | null;
  timezone: string;
  maxConcurrentKitchenOrders: number | null;
  currentKitchenOrders: number;
};

const REASON_COPY: Record<Exclude<KitchenStatusPayload['reason'], null>, string> = {
  paused: 'The kitchen is not accepting orders right now.',
  outside_hours: 'The kitchen is closed outside service hours.',
  at_capacity: 'The kitchen is at capacity. Please try again shortly.',
};

export function useKitchenStatus() {
  return useQuery({
    queryKey: ['kitchenStatus'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: KitchenStatusPayload }>(
        '/kitchen/status'
      );
      return res.data.data;
    },
    refetchInterval: 30_000,
  });
}

export default function KitchenStatusBanner() {
  const { data } = useKitchenStatus();
  if (!data || data.openNow) return null;

  const message =
    (data.reason && REASON_COPY[data.reason]) ||
    'The kitchen is not accepting orders right now.';

  return (
    <div
      role="status"
      className="bg-amber-50 border-b border-amber-200 text-amber-950 px-4 py-3"
    >
      <div className="max-w-7xl mx-auto flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-700" aria-hidden />
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}
