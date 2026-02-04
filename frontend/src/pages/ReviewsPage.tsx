import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Star, Plus, MessageSquare } from 'lucide-react';
import api from '../lib/api';
import { Review } from '../types';
import { useAuthStore } from '../stores/authStore';

export default function ReviewsPage() {
  const { user } = useAuthStore();
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');

  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['reviews', sortBy],
    queryFn: async () => {
      const res = await api.get<{ data: { reviews: Review[] } }>(`/reviews?sortBy=${sortBy}`);
      return res.data.data.reviews;
    },
  });

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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:ml-64 mb-20 md:mb-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Reviews</h1>
          <p className="text-gray-600 mt-1">
            See what others are saying about our food
          </p>
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

      {/* Sort Options */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setSortBy('newest')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            sortBy === 'newest'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Newest
        </button>
        <button
          onClick={() => setSortBy('highest')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            sortBy === 'highest'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Highest Rated
        </button>
        <button
          onClick={() => setSortBy('lowest')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            sortBy === 'lowest'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Lowest Rated
        </button>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : reviewsData && reviewsData.length > 0 ? (
        <div className="space-y-6">
          {reviewsData.map((review) => (
            <div key={review.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {renderStars(review.rating)}
                    <span className="text-sm text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    by {review.user?.name.split(' ')[0] || 'Customer'}
                  </p>
                </div>
                {review.order && (
                  <span className="text-xs text-gray-500">
                    Order #{review.order.orderNumber}
                  </span>
                )}
              </div>

              <p className="text-gray-800 mb-3">{review.comment}</p>

              {/* Show dish name (single dish per review) */}
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
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-600 mb-2">No reviews yet</p>
          <p className="text-gray-500 mb-6">
            Be the first to share your experience!
          </p>
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

      {user && (
        <div className="mt-8 text-center">
          <Link
            to="/reviews/my"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            View My Reviews →
          </Link>
        </div>
      )}
    </div>
  );
}
