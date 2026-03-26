import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  UtensilsCrossed,
  Package,
  TrendingUp,
  AlertCircle,
  BarChart3,
  Users,
  Sparkles,
} from 'lucide-react';
import api from '../../lib/api';

type DashboardData = {
  period: string;
  periodStart: string;
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
  topDishes: Array<{
    dishId: string;
    name: string;
    orderCount: number;
    unitPrice: number;
  }>;
  funnel: {
    viewDish: number;
    addToCart: number;
    removeFromCart: number;
    checkoutStart: number;
    orderPlaced: number;
    aiBuildMeal: number;
    aiComboSelected: number;
    reorderTapped: number;
  };
  conversionRate: number | null;
  weeklyActiveUsers: number;
  aiBuilder: {
    interactions: number;
    convertedToOrder: number;
    conversionPercent: number | null;
  };
};

export default function ChefDashboard() {
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7d' | '30d'>('7d');

  const { data: ordersData } = useQuery({
    queryKey: ['allOrders'],
    queryFn: async () => {
      const res = await api.get('/orders/all');
      return res.data.data.orders;
    },
  });

  const { data: dishesData } = useQuery({
    queryKey: ['dishes'],
    queryFn: async () => {
      const res = await api.get('/dishes');
      return res.data.data.dishes;
    },
  });

  const { data: requestsData } = useQuery({
    queryKey: ['dishRequests'],
    queryFn: async () => {
      const res = await api.get('/dish-requests');
      return res.data.data.dishRequests;
    },
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analyticsDashboard', analyticsPeriod],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: DashboardData }>(
        '/analytics/dashboard',
        { params: { period: analyticsPeriod } }
      );
      return res.data.data;
    },
  });

  const pendingOrders = ordersData?.filter((o: any) => o.status === 'PENDING').length || 0;
  const preparingOrders = ordersData?.filter((o: any) => o.status === 'PREPARING').length || 0;
  const totalDishes = dishesData?.length || 0;
  const topRequests = requestsData?.slice(0, 5) || [];

  const funnel = analyticsData?.funnel;
  const maxFunnel = funnel
    ? Math.max(
        1,
        funnel.viewDish,
        funnel.addToCart,
        funnel.checkoutStart,
        funnel.orderPlaced
      )
    : 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:ml-64 mb-20 md:mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Chef Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending Orders</p>
              <p className="text-3xl font-bold text-gray-900">{pendingOrders}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Preparing</p>
              <p className="text-3xl font-bold text-gray-900">{preparingOrders}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Dishes</p>
              <p className="text-3xl font-bold text-gray-900">{totalDishes}</p>
            </div>
            <div className="bg-primary-100 p-3 rounded-lg">
              <UtensilsCrossed className="h-8 w-8 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{ordersData?.length || 0}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Analytics */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Analytics &amp; conversion</h2>
          </div>
          <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            {(['7d', '30d'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAnalyticsPeriod(p)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  analyticsPeriod === p
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Last {p === '7d' ? '7 days' : '30 days'}
              </button>
            ))}
          </div>
        </div>

        {analyticsLoading || !analyticsData ? (
          <p className="text-gray-500 text-center py-8">Loading analytics…</p>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4">
                <p className="text-sm text-emerald-800 font-medium">Revenue (paid)</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">
                  ${analyticsData.revenue.toFixed(2)}
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  {analyticsData.orderCount} orders · AOV ${analyticsData.averageOrderValue.toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
                <p className="text-sm text-slate-700 font-medium flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Active users (tracked)
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {analyticsData.weeklyActiveUsers}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Unique logged-in users with analytics events in this period
                </p>
              </div>
              <div className="rounded-lg bg-violet-50 border border-violet-100 p-4">
                <p className="text-sm text-violet-800 font-medium flex items-center gap-1">
                  <Sparkles className="h-4 w-4" />
                  AI meal builder
                </p>
                <p className="text-2xl font-bold text-violet-900 mt-1">
                  {analyticsData.aiBuilder.interactions}
                </p>
                <p className="text-xs text-violet-700 mt-1">
                  {analyticsData.aiBuilder.convertedToOrder} converted to orders
                  {analyticsData.aiBuilder.conversionPercent != null &&
                    ` · ${analyticsData.aiBuilder.conversionPercent}% conv.`}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Conversion funnel (events)</h3>
              <p className="text-xs text-gray-500 mb-3">
                Checkout → order rate:{' '}
                {analyticsData.conversionRate != null
                  ? `${analyticsData.conversionRate}%`
                  : '— (need checkout_start events)'}
              </p>
              <ul className="space-y-2">
                {[
                  { label: 'Dish views', value: funnel!.viewDish },
                  { label: 'Add to cart', value: funnel!.addToCart },
                  { label: 'Checkout started', value: funnel!.checkoutStart },
                  { label: 'Orders placed (tracked)', value: funnel!.orderPlaced },
                ].map((row) => (
                  <li key={row.label} className="flex items-center gap-3">
                    <span className="w-40 text-sm text-gray-600 shrink-0">{row.label}</span>
                    <div className="flex-1 h-8 bg-gray-100 rounded-md overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-md transition-all"
                        style={{
                          width: `${Math.min(100, (row.value / maxFunnel) * 100)}%`,
                          minWidth: row.value > 0 ? '4px' : '0',
                        }}
                      />
                    </div>
                    <span className="w-12 text-sm font-medium text-right text-gray-900">{row.value}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-400 mt-2">
                AI: {funnel!.aiBuildMeal} builds · {funnel!.aiComboSelected} combos picked ·{' '}
                {funnel!.reorderTapped} reorder taps
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Top dishes by quantity sold</h3>
              {analyticsData.topDishes.length === 0 ? (
                <p className="text-gray-500 text-sm">No paid orders in this window yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="py-2 pr-4 font-medium">Dish</th>
                        <th className="py-2 pr-4 font-medium">Qty sold</th>
                        <th className="py-2 font-medium">List price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.topDishes.map((d) => (
                        <tr key={d.dishId} className="border-b border-gray-100">
                          <td className="py-2 pr-4 text-gray-900">{d.name}</td>
                          <td className="py-2 pr-4">{d.orderCount}</td>
                          <td className="py-2">${d.unitPrice.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Link
          to="/chef/orders"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Manage Orders</h2>
          <p className="text-gray-600">View and update order statuses</p>
        </Link>

        <Link
          to="/chef/menu"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Manage Menu</h2>
          <p className="text-gray-600">Add, edit, or remove menu items</p>
        </Link>
      </div>

      {/* Top Dish Requests */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Dish Requests</h2>
        {topRequests.length > 0 ? (
          <div className="space-y-3">
            {topRequests.map((request: any) => (
              <div key={request.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{request.title}</p>
                  <p className="text-sm text-gray-600">{request.description.slice(0, 100)}...</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-600">
                    {request.upvotes - request.downvotes}
                  </p>
                  <p className="text-xs text-gray-500">votes</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No dish requests yet</p>
        )}
      </div>
    </div>
  );
}
