import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ThumbsUp, ThumbsDown, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import api from '../lib/api';
import { DishRequest } from '../types';
import { useAuthStore } from '../stores/authStore';

interface RequestForm {
  title: string;
  description: string;
}

export default function DishRequestsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RequestForm>();

  const { data: requestsData } = useQuery({
    queryKey: ['dishRequests'],
    queryFn: async () => {
      const res = await api.get<{ data: { dishRequests: DishRequest[] } }>('/dish-requests');
      return res.data.data.dishRequests;
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: RequestForm) => {
      await api.post('/dish-requests', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishRequests'] });
      toast.success('Dish request submitted!');
      reset();
      setShowForm(false);
    },
    onError: () => {
      toast.error('Failed to submit request');
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ id, isUpvote }: { id: string; isUpvote: boolean }) => {
      await api.post(`/dish-requests/${id}/vote`, { isUpvote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishRequests'] });
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/dish-requests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishRequests'] });
      toast.success('Request deleted');
    },
  });

  const onSubmit = (data: RequestForm) => {
    if (!user) {
      toast.error('Please login to submit a request');
      return;
    }
    createRequestMutation.mutate(data);
  };

  const handleVote = (id: string, isUpvote: boolean) => {
    if (!user) {
      toast.error('Please login to vote');
      return;
    }
    voteMutation.mutate({ id, isUpvote });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:ml-64 mb-20 md:mb-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dish Requests</h1>
          <p className="text-gray-600 mt-1">
            Suggest new dishes and vote on community requests
          </p>
        </div>
        {user && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            New Request
          </button>
        )}
      </div>

      {/* Create Request Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Submit Dish Request</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Dish Name
              </label>
              <input
                id="title"
                {...register('title', { required: 'Title is required', maxLength: 200 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Spicy Chicken Sandwich"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                {...register('description', { required: 'Description is required', maxLength: 1000 })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Describe the dish you'd like to see on the menu..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-4">
        {requestsData && requestsData.length > 0 ? (
          requestsData.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex gap-4">
                {/* Vote Section */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => handleVote(request.id, true)}
                    className="p-2 rounded-lg hover:bg-green-100 transition-colors"
                    disabled={!user}
                  >
                    <ThumbsUp className="h-5 w-5 text-green-600" />
                  </button>
                  <span className="font-bold text-lg text-gray-900">
                    {request.upvotes - request.downvotes}
                  </span>
                  <button
                    onClick={() => handleVote(request.id, false)}
                    className="p-2 rounded-lg hover:bg-red-100 transition-colors"
                    disabled={!user}
                  >
                    <ThumbsDown className="h-5 w-5 text-red-600" />
                  </button>
                </div>

                {/* Content Section */}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{request.title}</h3>
                    {user && (user.id === request.userId || ['CHEF', 'ADMIN'].includes(user.role)) && (
                      <button
                        onClick={() => deleteRequestMutation.mutate(request.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <p className="text-gray-700 mb-3">{request.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Requested by {request.user.name}
                    </span>
                    <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600 mb-2">No dish requests yet</p>
            <p className="text-gray-500 mb-6">
              Be the first to suggest a new dish!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

