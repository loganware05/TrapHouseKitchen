import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { UtensilsCrossed, Package, TrendingUp, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

export default function ChefDashboard() {
  const { data: ordersData } = useQuery({
    queryKey: ['allOrders'],
    queryFn: async () => {
      const res = await api.get('/orders/all');
      return res.data.data.orders;
    },
  });

  const { data: dishesData } = useQuery({
    queryKey: ['dishes'],
    queryFn: async () => {
      const res = await api.get('/dishes');
      return res.data.data.dishes;
    },
  });

  const { data: requestsData } = useQuery({
    queryKey: ['dishRequests'],
    queryFn: async () => {
      const res = await api.get('/dish-requests');
      return res.data.data.dishRequests;
    },
  });

  const pendingOrders = ordersData?.filter((o: any) => o.status === 'PENDING').length || 0;
  const preparingOrders = ordersData?.filter((o: any) => o.status === 'PREPARING').length || 0;
  const totalDishes = dishesData?.length || 0;
  const topRequests = requestsData?.slice(0, 5) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:ml-64 mb-20 md:mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Chef Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending Orders</p>
              <p className="text-3xl font-bold text-gray-900">{pendingOrders}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Preparing</p>
              <p className="text-3xl font-bold text-gray-900">{preparingOrders}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Dishes</p>
              <p className="text-3xl font-bold text-gray-900">{totalDishes}</p>
            </div>
            <div className="bg-primary-100 p-3 rounded-lg">
              <UtensilsCrossed className="h-8 w-8 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{ordersData?.length || 0}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Link
          to="/chef/orders"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Manage Orders</h2>
          <p className="text-gray-600">View and update order statuses</p>
        </Link>

        <Link
          to="/chef/menu"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Manage Menu</h2>
          <p className="text-gray-600">Add, edit, or remove menu items</p>
        </Link>
      </div>

      {/* Top Dish Requests */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Dish Requests</h2>
        {topRequests.length > 0 ? (
          <div className="space-y-3">
            {topRequests.map((request: any) => (
              <div key={request.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{request.title}</p>
                  <p className="text-sm text-gray-600">{request.description.slice(0, 100)}...</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-600">
                    {request.upvotes - request.downvotes}
                  </p>
                  <p className="text-xs text-gray-500">votes</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No dish requests yet</p>
        )}
      </div>
    </div>
  );
}

