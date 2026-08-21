import { useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Package, Clock, CheckCircle, XCircle, ChevronRight, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Order } from '../types';
import OrderTracker from '../components/OrderTracker';
import OrderReceipt from '../components/OrderReceipt';
import PullToRefresh from '../components/PullToRefresh';
import { useCheckoutSheetStore } from '../stores/checkoutSheetStore';
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
  const checkoutOpen = useCheckoutSheetStore((s) => s.isOpen);
  const highlightOrderId = (location.state as { highlightOrderId?: string } | null)
    ?.highlightOrderId;
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const welcomedRef = useRef(false);

  const { data: ordersData, isLoading, isError, refetch, isFetching } = useQuery(
    customerOrdersQueryOptions(true)
  );

  const handlePullRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

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
    <PullToRefresh onRefresh={handlePullRefresh} enabled={!checkoutOpen}>
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
    </PullToRefresh>
  );
}
