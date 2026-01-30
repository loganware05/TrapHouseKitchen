import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ThumbsUp, ThumbsDown, MessageSquare, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { DishRequest } from '../../types';
import { useAuthStore } from '../../stores/authStore';

export default function ChefRequestsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: requestsData } = useQuery({
    queryKey: ['dishRequests'],
    queryFn: async () => {
      const res = await api.get<{ data: { dishRequests: DishRequest[] } }>('/dish-requests');
      return res.data.data.dishRequests;
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ id, isUpvote }: { id: string; isUpvote: boolean }) => {
      await api.post(`/dish-requests/${id}/vote`, { isUpvote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishRequests'] });
    },
    onError: () => {
      toast.error('Failed to vote on request');
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/dish-requests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishRequests'] });
      toast.success('Request deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete request');
    },
  });

  const handleVote = (id: string, isUpvote: boolean) => {
    if (!user) {
      toast.error('Please login to vote');
      return;
    }
    voteMutation.mutate({ id, isUpvote });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this request?')) {
      deleteRequestMutation.mutate(id);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:ml-64 mb-20 md:mb-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dish Requests</h1>
        <p className="text-gray-600 mt-1">
          View and manage customer dish requests
        </p>
      </div>

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
                    <button
                      onClick={() => handleDelete(request.id)}
                      disabled={deleteRequestMutation.isPending}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete request"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-gray-700 mb-3">{request.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Requested by {request.user.name}
                    </span>
                    <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {request.upvotes} upvotes, {request.downvotes} downvotes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600 mb-2">No dish requests yet</p>
            <p className="text-gray-500">
              Customers can submit requests for new dishes they'd like to see on the menu.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
