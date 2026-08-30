import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { Review } from '../../types';
import { useRegisterPullToRefresh } from '../../contexts/PullToRefreshContext';

type CouponGateway = {
  key: string;
  enabled: boolean;
  discountAmount: number;
};

export default function ChefReviewsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [amountDraft, setAmountDraft] = useState('4.00');

  const { data: pendingReviews } = useQuery({
    queryKey: ['pendingReviews'],
    queryFn: async () => {
      const res = await api.get<{ data: { reviews: Review[] } }>('/reviews/pending');
      return res.data.data.reviews;
    },
  });

  const { data: approvedReviews } = useQuery({
    queryKey: ['approvedReviews'],
    queryFn: async () => {
      const res = await api.get<{ data: { reviews: Review[] } }>('/reviews/management');
      return res.data.data.reviews;
    },
    enabled: activeTab === 'approved',
  });

  const { data: gateways } = useQuery({
    queryKey: ['couponGateways'],
    queryFn: async () => {
      const res = await api.get<{ data: { gateways: CouponGateway[] } }>('/coupons/gateways');
      return res.data.data.gateways;
    },
  });

  const reviewGateway = gateways?.find((g) => g.key === 'REVIEW_APPROVE');

  const handlePullRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pendingReviews'] }),
      queryClient.invalidateQueries({ queryKey: ['approvedReviews'] }),
      queryClient.invalidateQueries({ queryKey: ['couponGateways'] }),
    ]);
  }, [queryClient]);

  useRegisterPullToRefresh(handlePullRefresh);

  useEffect(() => {
    if (reviewGateway) {
      setAmountDraft(reviewGateway.discountAmount.toFixed(2));
    }
  }, [reviewGateway?.discountAmount]);

  const gatewayMutation = useMutation({
    mutationFn: async (patch: { enabled?: boolean; discountAmount?: number }) => {
      const res = await api.patch<{ data: { gateway: CouponGateway } }>(
        '/coupons/gateways/REVIEW_APPROVE',
        patch
      );
      return res.data.data.gateway;
    },
    onSuccess: (gateway) => {
      queryClient.invalidateQueries({ queryKey: ['couponGateways'] });
      toast.success(
        gateway.enabled
          ? `Review coupons ON · $${gateway.discountAmount.toFixed(2)}`
          : 'Review coupons OFF'
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update coupon gateway');
    },
  });

  const approveReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<{ message?: string; data?: { coupon?: { code: string } } }>(
        `/reviews/${id}/approve`
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pendingReviews'] });
      queryClient.invalidateQueries({ queryKey: ['approvedReviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success(data.message || 'Review approved');
    },
    onError: () => {
      toast.error('Failed to approve review');
    },
  });

  const rejectReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/reviews/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingReviews'] });
      toast.success('Review rejected');
    },
    onError: () => {
      toast.error('Failed to reject review');
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/reviews/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvedReviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('Review deleted');
    },
    onError: () => {
      toast.error('Failed to delete review');
    },
  });

  const handleApprove = (id: string) => {
    const amount = reviewGateway?.discountAmount ?? 4;
    const msg = reviewGateway?.enabled
      ? `Approve this review and award a $${amount.toFixed(2)} coupon?`
      : 'Approve this review? (Coupon awards are currently off.)';
    if (confirm(msg)) {
      approveReviewMutation.mutate(id);
    }
  };

  const handleReject = (id: string) => {
    if (confirm('Reject and delete this review? This action cannot be undone.')) {
      rejectReviewMutation.mutate(id);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this review? This action cannot be undone.')) {
      deleteReviewMutation.mutate(id);
    }
  };

  const saveAmount = () => {
    const value = parseFloat(amountDraft);
    if (!Number.isFinite(value) || value < 1 || value > 50) {
      toast.error('Amount must be between $1 and $50');
      return;
    }
    gatewayMutation.mutate({ discountAmount: value });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-5 w-5 ${
              i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const reviews = activeTab === 'pending' ? pendingReviews : approvedReviews;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:ml-64 mb-20 md:mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Review Management</h1>

      <div
        className="mb-8 bg-white rounded-lg shadow-md p-6 border border-slate-100"
        data-testid="coupon-award-gateway"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Coupon award gateway</h2>
        <p className="text-sm text-gray-600 mb-4">
          When enabled, approving a review mints a personal discount code for that customer
          (previous distribution method). Messaging delivery of codes is on the waiting list.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={reviewGateway?.enabled ?? true}
              disabled={!reviewGateway || gatewayMutation.isPending}
              onChange={(e) => gatewayMutation.mutate({ enabled: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Award coupon on review approve
          </label>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Coupon amount ($)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={50}
                step={0.5}
                value={amountDraft}
                onChange={(e) => setAmountDraft(e.target.value)}
                className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                aria-label="Coupon discount amount"
              />
              <button
                type="button"
                onClick={saveAmount}
                disabled={gatewayMutation.isPending}
                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                Save amount
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'pending'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending Approval
            {pendingReviews && pendingReviews.length > 0 && (
              <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                {pendingReviews.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'approved'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Approved Reviews
          </button>
        </div>
      </div>

      {reviews && reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {renderStars(review.rating)}
                    <span className="text-sm text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    by {review.user?.name} • Order #{review.order?.orderNumber}
                  </p>
                </div>
                <div className="flex gap-2">
                  {activeTab === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleApprove(review.id)}
                        disabled={approveReviewMutation.isPending}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(review.id)}
                        disabled={rejectReviewMutation.isPending}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleDelete(review.id)}
                      disabled={deleteReviewMutation.isPending}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  )}
                </div>
              </div>

              <p className="text-gray-800 mb-3">{review.comment}</p>

              {(review.dishName || (review.dishNames && review.dishNames.length > 0)) && (
                <div className="flex flex-wrap gap-2">
                  {review.dishName ? (
                    <span className="px-3 py-1 bg-primary-50 text-primary-700 text-sm rounded-full">
                      {review.dishName}
                    </span>
                  ) : (
                    review.dishNames?.map((dishName, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-primary-50 text-primary-700 text-sm rounded-full"
                      >
                        {dishName}
                      </span>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'pending' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    {reviewGateway?.enabled
                      ? `Approving publishes this review and awards a $${(reviewGateway.discountAmount ?? 4).toFixed(2)} coupon to ${review.user?.name}.`
                      : `Approving publishes this review from ${review.user?.name}. Coupon awards are currently off.`}
                  </p>
                </div>
              )}

              {activeTab === 'approved' && review.awardCoupon && (
                <div
                  className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg"
                  data-testid={`review-coupon-award-${review.id}`}
                >
                  <p className="text-sm font-medium text-emerald-900">
                    Coupon awarded
                  </p>
                  <p className="text-sm text-emerald-800 mt-1">
                    <span className="font-mono font-semibold">{review.awardCoupon.code}</span>
                    {' · '}${review.awardCoupon.discountAmount.toFixed(2)} off
                    {' · '}
                    {review.awardCoupon.used ? 'Used' : 'Unused'}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-xl text-gray-600">
            {activeTab === 'pending'
              ? 'No pending reviews'
              : 'No approved reviews yet'}
          </p>
        </div>
      )}
    </div>
  );
}
