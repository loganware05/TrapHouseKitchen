import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Star, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { Order } from '../types';

export default function ReviewFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedDishId, setSelectedDishId] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');

  // Pre-select order from URL params
  useEffect(() => {
    const orderIdFromUrl = searchParams.get('orderId');
    if (orderIdFromUrl) {
      setSelectedOrderId(orderIdFromUrl);
    }
  }, [searchParams]);

  const { data: eligibleOrders, isLoading, isError, refetch } = useQuery({
    queryKey: ['eligibleOrders'],
    queryFn: async () => {
      const res = await api.get<{ data: { orders: Order[] } }>('/reviews/eligible-orders');
      return res.data.data.orders;
    },
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createReviewMutation = useMutation({
    mutationFn: async (data: { orderId: string; dishId: string; rating: number; comment: string }) => {
      await api.post('/reviews', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eligibleOrders'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Review submitted! Once approved by our chef, you\'ll receive a $4 discount code.');
      // Reset form but stay on page to review another dish
      setSelectedDishId('');
      setRating(0);
      setComment('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit review');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOrderId) {
      toast.error('Please select an order to review');
      return;
    }

    if (!selectedDishId) {
      toast.error('Please select a dish to review');
      return;
    }

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (comment.trim().length < 10) {
      toast.error('Comment must be at least 10 characters');
      return;
    }

    if (comment.trim().length > 500) {
      toast.error('Comment must be less than 500 characters');
      return;
    }

    createReviewMutation.mutate({
      orderId: selectedOrderId,
      dishId: selectedDishId,
      rating,
      comment: comment.trim(),
    });
  };

  const selectedOrder = eligibleOrders?.find(o => o.id === selectedOrderId);
  const selectedDish = selectedOrder?.items.find(item => item.dishId === selectedDishId);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:ml-64 mb-20 md:mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Write a Review</h1>
      <p className="text-gray-600 mb-8">
        Share your experience and earn a $4 discount on your next order!
      </p>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : isError ? (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 mb-2">
            Unable to load review eligibility. Please try again.
          </p>
          <button
            onClick={() => refetch()}
            className="text-sm text-red-600 hover:underline font-medium"
          >
            Retry
          </button>
        </div>
      ) : eligibleOrders && eligibleOrders.length > 0 ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Select Order */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Order to Review
            </label>
            <div className="space-y-3">
              {eligibleOrders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => {
                    setSelectedOrderId(order.id);
                    setSelectedDishId(''); // Reset dish selection when order changes
                  }}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    selectedOrderId === order.id
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-gray-900">
                      Order #{order.orderNumber}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(order.completedAt || order.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {order.items.length} dish{order.items.length !== 1 ? 'es' : ''} available to review
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Select Dish (shown after order is selected) */}
          {selectedOrder && selectedOrder.items.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Dish to Review <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {selectedOrder.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedDishId(item.dishId)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                      selectedDishId === item.dishId
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{item.dish.name}</p>
                        <p className="text-sm text-gray-500">
                          Quantity: {item.quantity}
                        </p>
                      </div>
                      {selectedDishId === item.dishId && (
                        <CheckCircle className="h-5 w-5 text-primary-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rating */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }, (_, i) => i + 1).map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-10 w-10 ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-gray-600">
                  {rating} {rating === 1 ? 'star' : 'stars'}
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-3">
              Your Review <span className="text-red-500">*</span>
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={6}
              placeholder="Tell us about your experience... (10-500 characters)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <div className="mt-2 flex justify-between text-sm">
              <span className={comment.length < 10 ? 'text-red-500' : 'text-gray-500'}>
                Minimum 10 characters
              </span>
              <span className={comment.length > 500 ? 'text-red-500' : 'text-gray-500'}>
                {comment.length}/500
              </span>
            </div>
          </div>

          {/* Selected Dish Summary */}
          {selectedOrder && selectedDish && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Reviewing:</strong> {selectedDish.dish.name} from Order #{selectedOrder.orderNumber}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={createReviewMutation.isPending || !selectedOrderId || !selectedDishId || rating === 0 || comment.trim().length < 10}
            className="w-full py-4 px-6 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {createReviewMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Submit Review
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-xl text-gray-600 mb-2">No orders available for review</p>
          <p className="text-gray-500 mb-6">
            You can review orders that are completed, paid, and within the last 30 days.
            <br />
            <span className="text-sm">Orders older than 30 days are no longer eligible for review.</span>
          </p>
          <button
            onClick={() => navigate('/menu')}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Browse Menu
          </button>
        </div>
      )}
    </div>
  );
}
