import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../lib/api';

type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
type DayHours = { open: string; close: string };
type WeeklyHours = Partial<Record<DayKey, DayHours | null>>;

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

type OpsPayload = {
  ops: {
    acceptingOrders: boolean;
    scheduleEnabled: boolean;
    weeklyHours: WeeklyHours | null;
    maxConcurrentKitchenOrders: number | null;
  };
  status: {
    openNow: boolean;
    reason: string | null;
    currentKitchenOrders: number;
    timezone: string;
  };
};

export default function ServiceNightPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['kitchenOps'],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: OpsPayload }>('/kitchen/ops');
      return res.data.data;
    },
  });

  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>({});
  const [cap, setCap] = useState('');

  useEffect(() => {
    if (!data) return;
    setAcceptingOrders(data.ops.acceptingOrders);
    setScheduleEnabled(data.ops.scheduleEnabled);
    setWeeklyHours(data.ops.weeklyHours ?? {});
    setCap(
      data.ops.maxConcurrentKitchenOrders == null
        ? ''
        : String(data.ops.maxConcurrentKitchenOrders)
    );
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const maxConcurrentKitchenOrders = cap.trim() === '' ? null : Number(cap);
      await api.patch('/kitchen/ops', {
        acceptingOrders,
        scheduleEnabled,
        weeklyHours,
        maxConcurrentKitchenOrders,
      });
    },
    onSuccess: async () => {
      toast.success('Service night settings saved');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['kitchenOps'] }),
        queryClient.invalidateQueries({ queryKey: ['kitchenStatus'] }),
      ]);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    },
  });

  const setDayEnabled = (key: DayKey, enabled: boolean) => {
    setWeeklyHours((prev) => {
      const next = { ...prev };
      if (enabled) {
        next[key] = prev[key] ?? { open: '17:00', close: '23:00' };
      } else {
        next[key] = null;
      }
      return next;
    });
  };

  const setDayTime = (key: DayKey, field: 'open' | 'close', value: string) => {
    setWeeklyHours((prev) => ({
      ...prev,
      [key]: {
        open: prev[key]?.open ?? '17:00',
        close: prev[key]?.close ?? '23:00',
        [field]: value,
      },
    }));
  };

  if (isLoading || !data) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <p className="text-gray-500">Loading service night settings…</p>
      </div>
    );
  }

  return (
    <section className="bg-white rounded-lg shadow-md p-6 mb-8" aria-labelledby="service-night-heading">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 id="service-night-heading" className="text-xl font-semibold text-gray-900">
            Service night
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Kitchen is{' '}
            <span className={data.status.openNow ? 'text-green-700 font-medium' : 'text-amber-800 font-medium'}>
              {data.status.openNow ? 'open' : 'closed'}
            </span>
            {' '}· {data.status.currentKitchenOrders} in kitchen · {data.status.timezone}
          </p>
        </div>
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>

      <label className="flex items-center gap-3 mb-4 cursor-pointer">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={acceptingOrders}
          onChange={(e) => setAcceptingOrders(e.target.checked)}
        />
        <span className="text-sm font-medium text-gray-900">Accepting orders</span>
      </label>

      <label className="flex items-center gap-3 mb-4 cursor-pointer">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={scheduleEnabled}
          onChange={(e) => setScheduleEnabled(e.target.checked)}
        />
        <span className="text-sm font-medium text-gray-900">Enforce weekly hours</span>
      </label>

      <div className="mb-4">
        <label htmlFor="kitchen-cap" className="block text-sm font-medium text-gray-700 mb-1">
          Max concurrent kitchen orders (blank = unlimited)
        </label>
        <input
          id="kitchen-cap"
          type="number"
          min={1}
          className="border border-gray-300 rounded-lg px-3 py-2 w-40"
          value={cap}
          onChange={(e) => setCap(e.target.value)}
          placeholder="Unlimited"
        />
      </div>

      {scheduleEnabled && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-sm text-gray-600">Hours use 24h HH:mm in America/Chicago.</p>
          {DAYS.map(({ key, label }) => {
            const enabled = Boolean(weeklyHours[key]);
            const hours = weeklyHours[key];
            return (
              <div key={key} className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 w-16">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setDayEnabled(key, e.target.checked)}
                  />
                  <span className="text-sm font-medium">{label}</span>
                </label>
                <input
                  type="time"
                  disabled={!enabled}
                  value={hours?.open ?? '17:00'}
                  onChange={(e) => setDayTime(key, 'open', e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm disabled:opacity-40"
                  aria-label={`${label} open`}
                />
                <span className="text-gray-400 text-sm">to</span>
                <input
                  type="time"
                  disabled={!enabled}
                  value={hours?.close ?? '23:00'}
                  onChange={(e) => setDayTime(key, 'close', e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm disabled:opacity-40"
                  aria-label={`${label} close`}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
