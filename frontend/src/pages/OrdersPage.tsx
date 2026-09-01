import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Package, Clock, CheckCircle, XCircle, ChevronRight, MapPin, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { Coupon, Dish, Order } from '../types';
import OrderTracker from '../components/OrderTracker';
import OrderReceipt from '../components/OrderReceipt';
import OrderCouponBanner from '../components/OrderCouponBanner';
import { useRegisterPullToRefresh } from '../contexts/PullToRefreshContext';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { useCheckoutSheetStore } from '../stores/checkoutSheetStore';
import { trackEvent } from '../stores/analyticsStore';
import {
  customerOrderStatusLabel,
  customerOrdersQueryOptions,
  isActiveCustomerOrder,
} from '../lib/customerOrders';
import { isCompletedPaidReceipt } from '../lib/orderReceipt';

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PREPARING: 'bg-blue-100 text-blue-800',
  READY: 'bg-green-100 text-green-800',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusIcons = {
  PENDING: Clock,
  PREPARING: Package,
  READY: CheckCircle,
  OUT_FOR_DELIVERY: MapPin,
  COMPLETED: CheckCircle,
  CANCELLED: XCircle,
};

function ActiveOrderCard({
  order,
  emphasizeTracking = false,
}: {
  order: Order;
  emphasizeTracking?: boolean;
}) {
  const navigate = useNavigate();
  const StatusIcon = statusIcons[order.status];
  const isActive = isActiveCustomerOrder(order);
  const prepTime = order.prepTime ?? 25;
  const estimatedReady = new Date(order.createdAt);
  estimatedReady.setMinutes(estimatedReady.getMinutes() + prepTime);

  return (
    <article className="bg-white rounded-lg shadow-md overflow-hidden">
      <button
        type="button"
        onClick={() => navigate(`/orders/${order.id}`)}
        className="w-full text-left p-6 hover:bg-gray-50/80 transition-colors"
      >
        <div className="flex justify-between items-start gap-3 mb-4">
          <div>
            <p className="text-sm text-gray-500">Order #{order.orderNumber}</p>
            <p className="text-sm text-gray-500">
              {new Date(order.createdAt).toLocaleDateString()} at{' '}
              {new Date(order.createdAt).toLocaleTimeString()}
            </p>
            {order.deliveryLocation ? (
              <p className="mt-1 text-sm text-primary-700 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {order.deliveryLocation}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
                statusColors[order.status]
              }`}
            >
              <StatusIcon className="h-4 w-4" />
              {customerOrderStatusLabel[order.status]}
            </span>
            <ChevronRight className="h-5 w-5 text-gray-400" aria-hidden />
          </div>
        </div>

        {(emphasizeTracking || isActive) && order.status !== 'CANCELLED' && (
          <div className="mb-4 rounded-lg border border-th-border bg-th-surface p-4">
            <OrderTracker status={order.status} />
            {isActive && (
              <p className="mt-3 text-center text-sm text-gray-600">
                Est. ready around{' '}
                <span className="font-semibold text-primary-600">
                  {estimatedReady.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          {order.items.slice(0, emphasizeTracking ? undefined : 3).map((item) => (
            <div key={item.id} className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{item.dish.name}</p>
                <p className="text-sm text-gray-500">
                  {item.quantity} × ${item.priceAtOrder.toFixed(2)}
                </p>
              </div>
              <p className="font-semibold text-gray-900 tabular-nums">
                ${(item.priceAtOrder * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
          {!emphasizeTracking && order.items.length > 3 && (
            <p className="text-sm text-gray-500">+ {order.items.length - 3} more items</p>
          )}
        </div>

        <div className="mt-4">
          <OrderCouponBanner order={order} />
        </div>

        <div className="border-t mt-4 pt-4 flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Total</span>
          <span className="text-xl font-bold text-primary-600 tabular-nums">
            ${(order.finalAmount ?? order.totalPrice).toFixed(2)}
          </span>
        </div>
      </button>
    </article>
  );
}

function HistoryOrderCard({
  order,
  onWriteReview,
}: {
  order: Order;
  onWriteReview: (orderId: string, dishId?: string) => void;
}) {
  if (isCompletedPaidReceipt(order)) {
    return <OrderReceipt order={order} onWriteReview={onWriteReview} />;
  }
  return <ActiveOrderCard order={order} />;
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const openCheckout = useCheckoutSheetStore((s) => s.open);
  const [userAllergens, setUserAllergens] = useState<string[]>([]);
  const highlightOrderId = (location.state as { highlightOrderId?: string } | null)
    ?.highlightOrderId;
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const welcomedRef = useRef(false);

  const { data: ordersData, isLoading, isError, refetch, isFetching } = useQuery(
    customerOrdersQueryOptions(true)
  );

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await api.get<{ data: { user: any } }>('/users/profile');
      return res.data.data.user;
    },
    enabled: !!user,
  });

  const { data: usedCouponsData } = useQuery({
    queryKey: ['myCoupons', 'used'],
    queryFn: async () => {
      const res = await api.get<{ data: { coupons: Coupon[]; usedCoupons: Coupon[] } }>(
        '/coupons/my'
      );
      return res.data.data.usedCoupons;
    },
    enabled: !!user && user.role === 'CUSTOMER',
  });

  useEffect(() => {
    if (userProfile?.allergenProfile) {
      setUserAllergens(userProfile.allergenProfile.map((ua: any) => ua.allergenId));
    }
  }, [userProfile]);

  const lastOrder = useMemo(() => {
    if (!ordersData?.length) return null;
    const sorted = [...ordersData].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sorted.find((o) => o.paymentStatus === 'PAID' && o.items?.length) ?? sorted[0];
  }, [ordersData]);

  const reorderSummary =
    lastOrder?.items.map((i) => `${i.quantity}× ${i.dish.name}`).join(', ') ?? '';

  const checkDishAllergens = (dish: Dish): boolean => {
    if (!user || userAllergens.length === 0 || !dish.allergens) {
      return true;
    }
    return !dish.allergens.some((da) => userAllergens.includes(da.allergenId));
  };

  const handleQuickReorder = () => {
    if (!user || user.role !== 'CUSTOMER') {
      toast.error('Log in to reorder');
      return;
    }
    if (!lastOrder?.items.length) return;
    trackEvent('reorder_tapped', { orderId: lastOrder.id, orderNumber: lastOrder.orderNumber });
    for (const line of lastOrder.items) {
      const d = line.dish;
      if (!d?.id || !d.price) continue;
      const dishForCart: Dish = {
        ...d,
        description: d.description ?? '',
        status: d.status ?? 'AVAILABLE',
        categoryId: d.categoryId ?? '',
        isVegan: !!d.isVegan,
        isVegetarian: !!d.isVegetarian,
        isGlutenFree: !!d.isGlutenFree,
        createdAt: d.createdAt ?? new Date().toISOString(),
        updatedAt: d.updatedAt ?? new Date().toISOString(),
        category: d.category ?? { id: '', name: '', displayOrder: 0, createdAt: '', updatedAt: '' },
      };
      if (!checkDishAllergens(dishForCart)) {
        toast.error('A dish in that order conflicts with your allergen profile.');
        return;
      }
      addItem(dishForCart, line.quantity);
    }
    toast.success('Added your last order to the cart');
    openCheckout();
  };

  const handlePullRefresh = useCallback(async () => {
    await refetch();
    if (user?.role === 'CUSTOMER') {
      await queryClient.invalidateQueries({ queryKey: ['myCoupons', 'used'] });
    }
  }, [refetch, queryClient, user?.role]);

  useRegisterPullToRefresh(handlePullRefresh);

  useEffect(() => {
    if ((location.state as { paymentSuccess?: boolean } | null)?.paymentSuccess && !welcomedRef.current) {
      welcomedRef.current = true;
      toast.success('Order placed! Track it below.');
    }
  }, [location.state]);

  useEffect(() => {
    if (!highlightOrderId || !ordersData?.length) {
      return;
    }
    highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [highlightOrderId, ordersData]);

  const handleWriteReview = (orderId: string, dishId?: string) => {
    if (dishId) {
      navigate(`/reviews/new?orderId=${orderId}&dishId=${dishId}`);
    } else {
      navigate(`/reviews/new?orderId=${orderId}`);
    }
  };

  const activeOrders = ordersData?.filter(isActiveCustomerOrder) ?? [];
  const historyOrders =
    ordersData?.filter((order) => !isActiveCustomerOrder(order)) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:ml-64 mb-20 md:mb-8">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track active orders and review past receipts.
          </p>
        </div>
        {isFetching && !isLoading ? (
          <span className="text-xs text-gray-500" aria-live="polite">
            Updating…
          </span>
        ) : null}
      </div>

      {isError ? (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 mb-2">
            Unable to load orders. Please try again.
          </p>
          <button
            onClick={() => refetch()}
            className="text-sm text-red-600 hover:underline font-medium"
          >
            Retry
          </button>
        </div>
      ) : null}

      {user?.role === 'CUSTOMER' && lastOrder && (
        <section className="mb-10" aria-labelledby="quick-reorder-heading">
          <h2 id="quick-reorder-heading" className="text-lg font-semibold text-gray-900 mb-4">
            Quick reorder
          </h2>
          <div className="rounded-th-xl border border-th-border bg-white p-4 shadow-th-card">
            <p className="text-sm text-gray-600 line-clamp-2 mb-1">#{lastOrder.orderNumber}</p>
            <p className="font-medium text-gray-900 line-clamp-2 mb-4">{reorderSummary}</p>
            <button
              type="button"
              onClick={handleQuickReorder}
              className="flex w-full items-center justify-center gap-2 rounded-th-lg bg-gray-900 py-3 text-sm font-bold text-white hover:bg-gray-800"
            >
              <RotateCcw className="h-4 w-4" />
              Order again
            </button>
          </div>
        </section>
      )}

      {usedCouponsData && usedCouponsData.length > 0 && (
        <section className="mb-10" aria-labelledby="used-codes-heading">
          <h2 id="used-codes-heading" className="text-lg font-semibold text-gray-900 mb-4">
            Used codes
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            These discount codes were redeemed and cannot be applied again.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {usedCouponsData.map((coupon) => (
              <div
                key={coupon.id}
                className="rounded-lg p-4 border border-gray-200 bg-gray-50 opacity-90"
              >
                <p className="text-lg font-mono font-semibold text-gray-500 line-through">
                  {coupon.code}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  ${coupon.discountAmount.toFixed(2)} off · Redeemed
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {ordersData && ordersData.length > 0 ? (
        <div className="space-y-10">
          {activeOrders.length > 0 && (
            <section aria-labelledby="active-orders-heading">
              <h2 id="active-orders-heading" className="text-lg font-semibold text-gray-900 mb-4">
                Active orders
              </h2>
              <div className="space-y-6">
                {activeOrders.map((order) => (
                  <div
                    key={order.id}
                    ref={order.id === highlightOrderId ? highlightRef : undefined}
                    className={
                      order.id === highlightOrderId
                        ? 'ring-2 ring-primary-500 ring-offset-2 rounded-lg'
                        : undefined
                    }
                  >
                    <ActiveOrderCard order={order} emphasizeTracking />
                  </div>
                ))}
              </div>
            </section>
          )}

          {historyOrders.length > 0 && (
            <section aria-labelledby="order-history-heading">
              <h2 id="order-history-heading" className="text-lg font-semibold text-gray-900 mb-4">
                {activeOrders.length > 0 ? 'Receipts & history' : 'Past receipts'}
              </h2>
              <div className="space-y-6">
                {historyOrders.map((order) => (
                  <HistoryOrderCard
                    key={order.id}
                    order={order}
                    onWriteReview={handleWriteReview}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-600 mb-2">No orders yet</p>
          <p className="text-gray-500 mb-6">
            After you pay, your order will show up here for live tracking.
          </p>
          <Link
            to="/menu"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Browse Menu
          </Link>
        </div>
      )}
    </div>
  );
}
