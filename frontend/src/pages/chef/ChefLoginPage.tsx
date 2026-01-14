import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/authStore';
import { ChefHat } from 'lucide-react';

interface LoginForm {
  email: string;
  password: string;
}

export default function ChefLoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuthStore();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>();

  // Redirect if already logged in as chef
  useEffect(() => {
    if (user && (user.role === 'CHEF' || user.role === 'ADMIN')) {
      navigate('/chef');
    }
  }, [user, navigate]);

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      
      // Check if user is actually a chef/admin
      const currentUser = useAuthStore.getState().user;
      if (currentUser && (currentUser.role === 'CHEF' || currentUser.role === 'ADMIN')) {
        toast.success('Welcome back, Chef!');
        navigate('/chef');
      } else {
        // Log them out if they're not a chef
        useAuthStore.getState().logout();
        toast.error('Access denied. Chef credentials required.');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-orange-600 rounded-full flex items-center justify-center">
              <ChefHat className="h-10 w-10 text-white" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Chef Portal
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to manage your kitchen
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email', { required: 'Email is required' })}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="chef@traphouse.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password', { required: 'Password is required' })}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter your password"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in to Dashboard'}
              </button>
            </div>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm font-medium text-orange-600 hover:text-orange-500"
              >
                ← Back to customer login
              </Link>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center space-y-1">
              <p><strong>Default Chef Account:</strong></p>
              <p>Email: chef@traphouse.com</p>
              <p>Password: chef123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
