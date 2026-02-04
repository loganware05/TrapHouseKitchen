import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Edit, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { Review, Coupon } from '../types';

export default function MyReviewsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string>('');
  const [editRating, setEditRating] = useState<number>(0);
  const [editComment, setEditComment] = useState<string>('');

  const { data: reviewsData } = useQuery({
    queryKey: ['myReviews'],
    queryFn: async () => {
      const res = await api.get<{ data: { reviews: Review[] } }>('/reviews/my');
      return res.data.data.reviews;
    },
  });

  const { data: couponsData } = useQuery({
    queryKey: ['myCoupons'],
    queryFn: async () => {
      const res = await api.get<{ data: { coupons: Coupon[] } }>('/coupons/my');
      return res.data.data.coupons;
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: async ({ id, rating, comment }: { id: string; rating: number; comment: string }) => {
      await api.patch(`/reviews/${id}`, { rating, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myReviews'] });
      toast.success('Review updated successfully!');
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

  const renderStars = (rating: number, interactive: boolean = false, onRate?: (rating: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => i + 1).map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onRate && onRate(star)}
            disabled={!interactive}
            className={interactive ? 'transition-transform hover:scale-110' : ''}
          >
            <Star
              className={`h-5 w-5 ${
                star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const getStatusBadge = (review: Review) => {
    if (review.approved) {
      return (
        <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
          <CheckCircle className="h-4 w-4" />
          Approved
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
          <Clock className="h-4 w-4" />
          Pending Approval
        </span>
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:ml-64 mb-20 md:mb-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Reviews</h1>
          <p className="text-gray-600 mt-1">
            Manage your reviews and discount codes
          </p>
        </div>
        <Link
          to="/reviews/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Write New Review
        </Link>
      </div>

      {/* Discount Coupons */}
      {couponsData && couponsData.length > 0 && (
        <div className="mb-8 bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Your Discount Codes
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {couponsData.map((coupon) => (
              <div
                key={coupon.id}
                className="bg-white rounded-lg p-4 border-2 border-dashed border-primary-300"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-2xl font-bold text-primary-600 font-mono">
                      {coupon.code}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Save ${coupon.discountAmount.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(coupon.code);
                      toast.success('Code copied to clipboard!');
                    }}
                    className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Use at checkout • No expiration
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviewsData && reviewsData.length > 0 ? (
        <div className="space-y-6">
          {reviewsData.map((review) => (
            <div key={review.id} className="bg-white rounded-lg shadow-md p-6">
              {editingId === review.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rating
                    </label>
                    {renderStars(editRating, true, setEditRating)}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comment
                    </label>
                    <textarea
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {editComment.length}/500 characters
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveEdit}
                      disabled={updateReviewMutation.isPending}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {updateReviewMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => setEditingId('')}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        {renderStars(review.rating)}
                        {getStatusBadge(review)}
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString()} •{' '}
                        Order #{review.order?.orderNumber}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(review)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(review.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-800 mb-3">{review.comment}</p>

                  {/* Show dish name (single dish per review) */}
                  {(review.dishName || (review.dishNames && review.dishNames.length > 0)) && (
                    <div className="flex flex-wrap gap-2">
                      {review.dishName ? (
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                          {review.dishName}
                        </span>
                      ) : (
                        review.dishNames?.map((dishName, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                          >
                            {dishName}
                          </span>
                        ))
                      )}
                    </div>
                  )}

                  {!review.approved && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        Your review is pending approval. You'll receive a $4 discount code once it's approved!
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-xl text-gray-600 mb-2">No reviews yet</p>
          <p className="text-gray-500 mb-6">
            Share your experience and earn discount codes!
          </p>
          <Link
            to="/reviews/new"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Write Your First Review
          </Link>
        </div>
      )}
    </div>
  );
}
