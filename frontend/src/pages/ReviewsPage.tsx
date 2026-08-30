import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Star, Plus, MessageSquare, Edit, Trash2, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { Review, Coupon } from '../types';
import { useAuthStore } from '../stores/authStore';
import { useRegisterPullToRefresh } from '../contexts/PullToRefreshContext';

function renderStars(
  rating: number,
  interactive = false,
  onRate?: (rating: number) => void
) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => {
        const star = i + 1;
        if (interactive) {
          return (
            <button
              key={star}
              type="button"
              onClick={() => onRate?.(star)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`h-5 w-5 ${
                  star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                }`}
              />
            </button>
          );
        }
        return (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
            aria-hidden
          />
        );
      })}
    </div>
  );
}

function StatusBadge({ review }: { review: Review }) {
  if (review.approved) {
    return (
      <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
        <CheckCircle className="h-4 w-4" />
        Approved
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
      <Clock className="h-4 w-4" />
      Pending Approval
    </span>
  );
}

export default function ReviewsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isCustomer = user?.role === 'CUSTOMER';
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [editingId, setEditingId] = useState('');
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');

  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['reviews', sortBy],
    queryFn: async () => {
      const res = await api.get<{ data: { reviews: Review[] } }>(`/reviews?sortBy=${sortBy}`);
      return res.data.data.reviews;
    },
  });

  const { data: myReviewsData } = useQuery({
    queryKey: ['myReviews'],
    queryFn: async () => {
      const res = await api.get<{ data: { reviews: Review[] } }>('/reviews/my');
      return res.data.data.reviews;
    },
    enabled: isCustomer,
  });

  const { data: couponsBundle } = useQuery({
    queryKey: ['myCoupons'],
    queryFn: async () => {
      const res = await api.get<{ data: { coupons: Coupon[]; usedCoupons: Coupon[] } }>(
        '/coupons/my'
      );
      return res.data.data;
    },
    enabled: isCustomer,
  });

  const handlePullRefresh = useCallback(async () => {
    const tasks = [queryClient.invalidateQueries({ queryKey: ['reviews'] })];
    if (isCustomer) {
      tasks.push(queryClient.invalidateQueries({ queryKey: ['myReviews'] }));
      tasks.push(queryClient.invalidateQueries({ queryKey: ['myCoupons'] }));
    }
    await Promise.all(tasks);
  }, [queryClient, isCustomer]);

  useRegisterPullToRefresh(handlePullRefresh);

  const updateReviewMutation = useMutation({
    mutationFn: async ({ id, rating, comment }: { id: string; rating: number; comment: string }) => {
      const res = await api.patch<{ message?: string }>(`/reviews/${id}`, { rating, comment });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['myReviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success(data.message ?? 'Review updated and sent back for chef approval.');
      setEditingId('');
    },
    onError: () => {
      toast.error('Failed to update review');
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/reviews/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myReviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('Review deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete review');
    },
  });

  const handleEdit = (review: Review) => {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment);
  };

  const handleSaveEdit = () => {
    if (editRating === 0 || editComment.trim().length < 10) {
      toast.error('Please provide a valid rating and comment (min 10 characters)');
      return;
    }
    updateReviewMutation.mutate({
      id: editingId,
      rating: editRating,
      comment: editComment.trim(),
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this review?')) {
      deleteReviewMutation.mutate(id);
    }
  };

  const couponsData = couponsBundle?.coupons;
  const usedCouponsData = couponsBundle?.usedCoupons;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:ml-64 mb-20 md:mb-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reviews</h1>
          <p className="text-gray-600 mt-1">Community feedback and your submitted reviews</p>
        </div>
        {user && (
          <Link
            to="/reviews/new"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Write Review
          </Link>
        )}
      </div>

      {/* Community reviews */}
      <section className="mb-10" aria-labelledby="community-reviews-heading">
        <h2 id="community-reviews-heading" className="text-xl font-semibold text-gray-900 mb-4">
          Community reviews
        </h2>

        <div className="mb-6 flex flex-wrap gap-2">
          {(['newest', 'highest', 'lowest'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortBy(key)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                sortBy === key
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {key === 'newest' ? 'Newest' : key === 'highest' ? 'Highest Rated' : 'Lowest Rated'}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          </div>
        ) : reviewsData && reviewsData.length > 0 ? (
          <div className="space-y-6">
            {reviewsData.map((review) => (
              <article key={review.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {renderStars(review.rating)}
                      <span className="text-sm text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      by {review.user?.name?.split(' ')[0] || 'Customer'}
                    </p>
                  </div>
                  {review.order && (
                    <span className="text-xs text-gray-500">Order #{review.order.orderNumber}</span>
                  )}
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
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600 mb-2">No public reviews yet</p>
            <p className="text-gray-500 mb-6">Be the first to share your experience!</p>
            {user && (
              <Link
                to="/reviews/new"
                className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Write the First Review
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Your reviews (logged-in customers) */}
      {isCustomer && (
        <section aria-labelledby="your-reviews-heading">
          <h2 id="your-reviews-heading" className="text-xl font-semibold text-gray-900 mb-4">
            Your reviews
          </h2>

          {couponsData && couponsData.length > 0 && (
            <div className="mb-8 bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Saved discount codes</h3>
              <p className="text-sm text-gray-600 mb-4">
                Each code works once. Enter it at checkout — after payment it cannot be reused.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {couponsData.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="bg-white rounded-lg p-4 border-2 border-dashed border-primary-300"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-2xl font-bold text-primary-600 font-mono">{coupon.code}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Save ${coupon.discountAmount.toFixed(2)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(coupon.code);
                          toast.success('Code copied to clipboard!');
                        }}
                        className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {usedCouponsData && usedCouponsData.length > 0 && (
            <div className="mb-8 bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Used codes</h3>
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
            </div>
          )}

          {myReviewsData && myReviewsData.length > 0 ? (
            <div className="space-y-6">
              {myReviewsData.map((review) => (
                <article key={review.id} className="bg-white rounded-lg shadow-md p-6">
                  {editingId === review.id ? (
                    <div className="space-y-4">
                      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        Editing will remove this review from the public feed until the chef approves
                        it again.
                      </p>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                        {renderStars(editRating, true, setEditRating)}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
                        <textarea
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <p className="text-sm text-gray-500 mt-1">{editComment.length}/500 characters</p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={updateReviewMutation.isPending}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                        >
                          {updateReviewMutation.isPending ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId('')}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            {renderStars(review.rating)}
                            <StatusBadge review={review} />
                          </div>
                          <p className="text-sm text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()} · Order #
                            {review.order?.orderNumber}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(review)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit review"
                            aria-label="Edit review"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(review.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete review"
                            aria-label="Delete review"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-800 mb-3">{review.comment}</p>
                      {review.dishName && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                          {review.dishName}
                        </span>
                      )}
                      {!review.approved && (
                        <p className="mt-4 text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          Pending chef approval before it appears in community reviews.
                        </p>
                      )}
                      {review.awardCoupon && (
                        <p className="mt-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                          Coupon earned:{' '}
                          <span className="font-mono font-semibold">{review.awardCoupon.code}</span> ·
                          ${review.awardCoupon.discountAmount.toFixed(2)} off
                          {review.awardCoupon.used ? ' · redeemed' : ' · ready at checkout'}
                        </p>
                      )}
                    </>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white rounded-lg shadow-md border border-dashed border-gray-200">
              <p className="text-gray-600 mb-4">You haven&apos;t submitted any reviews yet.</p>
              <Link
                to="/reviews/new"
                className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Write Your First Review
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
