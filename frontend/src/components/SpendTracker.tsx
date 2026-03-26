import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Order } from '../types';
import { useAuthStore } from '../stores/authStore';

const DEFAULT_WEEKLY = 50;

function startOfWeekUtc(d: Date): Date {
  const x = new Date(d);
  const day = x.getUTCDay();
  const diff = (day + 6) % 7;
  x.setUTCDate(x.getUTCDate() - diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function sumWeeklySpend(orders: Order[] | undefined, weekStart: Date): number {
  if (!orders?.length) return 0;
  return orders
    .filter(
      (o) =>
        o.paymentStatus === 'PAID' &&
        !o.isArchived &&
        new Date(o.createdAt) >= weekStart
    )
    .reduce((sum, o) => sum + o.finalAmount, 0);
}

export default function SpendTracker() {
  const { user } = useAuthStore();
  const weekStart = startOfWeekUtc(new Date());

  const { data: orders } = useQuery({
    queryKey: ['orders', 'spend-tracker'],
    queryFn: async () => {
      const res = await api.get<{ data: { orders: Order[] } }>('/orders');
      return res.data.data.orders;
    },
    enabled: !!user && user.role === 'CUSTOMER',
  });

  if (!user || user.role !== 'CUSTOMER') {
    return (
      <Link
        to="/login"
        className="block rounded-th-lg border border-th-border bg-th-surface-elevated px-4 py-3 text-sm text-th-muted-fg hover:border-primary-300 transition-colors"
      >
        Log in to track your weekly food spend
      </Link>
    );
  }

  const spent = sumWeeklySpend(orders, weekStart);
  const budget = DEFAULT_WEEKLY;
  const pct = Math.min(100, (spent / budget) * 100);
  const over = spent > budget;

  return (
    <div className="rounded-th-lg border border-th-border bg-th-surface-elevated px-4 py-3 shadow-th-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-th-muted-fg">This week</p>
          <p className="text-lg font-bold text-gray-900 tabular-nums">
            ${spent.toFixed(0)}
            <span className="text-th-muted-fg font-normal"> / ${budget}</span>
          </p>
        </div>
        {over && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
            Over budget
          </span>
        )}
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-th-muted">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-amber-500' : 'bg-primary-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
