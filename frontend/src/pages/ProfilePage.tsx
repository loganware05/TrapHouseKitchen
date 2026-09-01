import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, PieChart, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import OrderReceipt from '../components/OrderReceipt';
import { customerOrdersQueryOptions } from '../lib/customerOrders';
import { selectRecentReceipts } from '../lib/orderReceipt';
import { useRegisterPullToRefresh } from '../contexts/PullToRefreshContext';

const PROFILE_RECEIPT_LIMIT = 3;

type UserSpendData = {
  period: string;
  weeklyBudget: number;
  spentInPeriod: number;
  budgetRemaining: number;
  categoryBreakdown: Array<{
    categoryName: string;
    amount: number;
    percentOfSpend: number;
  }>;
  orderCount: number;
};

export default function ProfilePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [spendPeriod, setSpendPeriod] = useState<'7d' | '30d'>('7d');
  const [receiptsOpen, setReceiptsOpen] = useState(false);

  const { data: spendData, isLoading: spendLoading } = useQuery({
    queryKey: ['userSpend', spendPeriod],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: UserSpendData }>(
        '/analytics/user-spend',
        { params: { period: spendPeriod } }
      );
      return res.data.data;
    },
    enabled: !!user && user.role === 'CUSTOMER',
  });

  const { data: ordersData } = useQuery({
    ...customerOrdersQueryOptions(!!user && user.role === 'CUSTOMER'),
  });

  const recentReceipts = selectRecentReceipts(ordersData ?? [], PROFILE_RECEIPT_LIMIT);

  const handlePullRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['userSpend'] }),
      queryClient.invalidateQueries({ queryKey: ['orders'] }),
    ]);
  }, [queryClient]);

  useRegisterPullToRefresh(handlePullRefresh);

  const handleWriteReview = (orderId: string, dishId?: string) => {
    if (dishId) {
      navigate(`/reviews/new?orderId=${orderId}&dishId=${dishId}`);
    } else {
      navigate(`/reviews/new?orderId=${orderId}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:ml-64 mb-20 md:mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="bg-primary-100 p-4 rounded-full">
            <User className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{user?.name}</h2>
            {user?.email && <p className="text-gray-600">{user.email}</p>}
            {user?.isGuest && (
              <span className="inline-block mt-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                Guest Account
              </span>
            )}
          </div>
        </div>
      </div>

      {user?.role === 'CUSTOMER' && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-primary-600" />
                Spending insights
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Paid orders in the selected period vs your weekly budget target.
              </p>
            </div>
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 shrink-0">
              {(['7d', '30d'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSpendPeriod(p)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    spendPeriod === p
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {p === '7d' ? '7 days' : '30 days'}
                </button>
              ))}
            </div>
          </div>

          {spendLoading || !spendData ? (
            <p className="text-gray-500 text-sm py-4">Loading spend summary…</p>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Budget progress</span>
                  <span>
                    ${spendData.spentInPeriod.toFixed(2)} / ${spendData.weeklyBudget.toFixed(2)}
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      spendData.spentInPeriod > spendData.weeklyBudget
                        ? 'bg-amber-500'
                        : 'bg-primary-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        spendData.weeklyBudget > 0
                          ? (spendData.spentInPeriod / spendData.weeklyBudget) * 100
                          : 0
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {spendData.orderCount} paid order{spendData.orderCount === 1 ? '' : 's'} ·{' '}
                  {spendData.budgetRemaining >= 0
                    ? `$${spendData.budgetRemaining.toFixed(2)} left vs budget`
                    : `$${Math.abs(spendData.budgetRemaining).toFixed(2)} over budget`}
                </p>
              </div>

              {spendData.categoryBreakdown.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">By category</h3>
                  <ul className="space-y-2">
                    {spendData.categoryBreakdown.map((row) => (
                      <li key={row.categoryName} className="flex items-center gap-2 text-sm">
                        <span className="w-36 text-gray-600 truncate">{row.categoryName}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-400 rounded-full"
                            style={{ width: `${Math.min(100, row.percentOfSpend)}%` }}
                          />
                        </div>
                        <span className="w-20 text-right text-gray-900 font-medium">
                          ${row.amount.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {user?.role === 'CUSTOMER' && (
        <div className="bg-white rounded-th-xl shadow-th-card p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Legal</h2>
          <nav className="space-y-1" aria-label="Legal links">
            <Link
              to="/privacy"
              className="flex items-center justify-between rounded-th-lg px-3 py-3 text-gray-700 hover:bg-th-surface-muted transition-colors text-sm"
            >
              Privacy policy
              <ChevronRight className="h-4 w-4 text-th-muted-fg" />
            </Link>
            <Link
              to="/terms"
              className="flex items-center justify-between rounded-th-lg px-3 py-3 text-gray-700 hover:bg-th-surface-muted transition-colors text-sm"
            >
              Terms of service
              <ChevronRight className="h-4 w-4 text-th-muted-fg" />
            </Link>
          </nav>
        </div>
      )}

      {user?.role === 'CUSTOMER' && recentReceipts.length > 0 && (
        <section className="mb-6" aria-labelledby="recent-receipts-heading">
          <button
            type="button"
            id="recent-receipts-heading"
            onClick={() => setReceiptsOpen((open) => !open)}
            aria-expanded={receiptsOpen}
            aria-label="Receipts"
            className="w-full flex items-center justify-between gap-3 rounded-th-lg border border-th-border bg-white px-4 py-3 text-left shadow-th-card hover:bg-th-surface-muted transition-colors"
          >
            <span>
              <span className="block text-xl font-semibold text-gray-900">Receipts</span>
              <span className="block text-sm text-gray-600 mt-0.5">
                Up to {PROFILE_RECEIPT_LIMIT} recent completed orders (30-day window)
              </span>
            </span>
            {receiptsOpen ? (
              <ChevronDown className="h-5 w-5 text-th-muted-fg shrink-0" aria-hidden />
            ) : (
              <ChevronRight className="h-5 w-5 text-th-muted-fg shrink-0" aria-hidden />
            )}
          </button>
          {receiptsOpen && (
            <div className="mt-4 space-y-4">
              {recentReceipts.map((order) => (
                <OrderReceipt
                  key={order.id}
                  order={order}
                  onWriteReview={handleWriteReview}
                />
              ))}
              <div className="text-center">
                <Link to="/orders" className="text-sm font-medium text-primary-600 hover:underline">
                  View all orders
                </Link>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
