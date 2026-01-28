import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { Review } from '../../types';

export default function ChefReviewsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');

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
      const res = await api.get<{ data: { reviews: Review[] } }>('/reviews');
      return res.data.data.reviews;
    },
    enabled: activeTab === 'approved',
  });

  const approveReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/reviews/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingReviews'] });
      queryClient.invalidateQueries({ queryKey: ['approvedReviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('Review approved and discount code created!');
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
    if (confirm('Approve this review? The customer will receive a $4 discount code.')) {
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

      {/* Tabs */}
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

      {/* Reviews List */}
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

              {review.dishNames && review.dishNames.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {review.dishNames.map((dishName, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-primary-50 text-primary-700 text-sm rounded-full"
                    >
                      {dishName}
                    </span>
                  ))}
                </div>
              )}

              {activeTab === 'pending' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Approving this review will create a $4 discount code for {review.user?.name}
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
