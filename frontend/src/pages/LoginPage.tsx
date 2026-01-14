import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';
import { ChefHat } from 'lucide-react';

interface LoginForm {
  email: string;
  password: string;
}

interface GuestForm {
  name: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, guestLogin } = useAuthStore();
  const [isGuest, setIsGuest] = useState(false);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>();
  const { register: registerGuest, handleSubmit: handleSubmitGuest, formState: { errors: guestErrors, isSubmitting: isSubmittingGuest } } = useForm<GuestForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      
      // Check user role and redirect accordingly
      const currentUser = useAuthStore.getState().user;
      if (currentUser && (currentUser.role === 'CHEF' || currentUser.role === 'ADMIN')) {
        toast.success('Welcome back, Chef!');
        navigate('/chef');
      } else {
        toast.success('Welcome back!');
        navigate('/menu');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    }
  };

  const onGuestSubmit = async (data: GuestForm) => {
    try {
      await guestLogin(data.name);
      toast.success('Welcome!');
      navigate('/menu');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <ChefHat className="mx-auto h-12 w-12 text-primary-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {isGuest ? 'Continue as Guest' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isGuest ? (
              <>
                Have an account?{' '}
                <button
                  onClick={() => setIsGuest(false)}
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Or{' '}
                <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                  create a new account
                </Link>
              </>
            )}
          </p>
        </div>

        {!isGuest ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  {...register('email', { required: 'Email is required' })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
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
                  {...register('password', { required: 'Password is required' })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
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
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsGuest(true)}
                className="text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                Continue as guest instead
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmitGuest(onGuestSubmit)}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Your name
              </label>
              <input
                id="name"
                type="text"
                {...registerGuest('name', { required: 'Name is required' })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter your name"
              />
              {guestErrors.name && (
                <p className="mt-1 text-sm text-red-600">{guestErrors.name.message}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmittingGuest}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {isSubmittingGuest ? 'Loading...' : 'Continue'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsGuest(false)}
                className="text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                Back to login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

