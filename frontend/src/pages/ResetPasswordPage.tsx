import { useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ChefHat } from 'lucide-react';
import api from '../lib/api';

interface Form {
  password: string;
  confirm: string;
}

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get('token')?.trim() ?? '', [params]);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<Form>();

  const onSubmit = async (data: Form) => {
    if (!token) {
      toast.error('Invalid or missing reset link.');
      return;
    }
    try {
      await api.post('/auth/reset-password', {
        token,
        password: data.password,
      });
      toast.success('Password updated. You can sign in now.');
      navigate('/login', { replace: true });
    } catch (error: unknown) {
      const msg =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      toast.error(msg || 'Could not reset password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <ChefHat className="mx-auto h-12 w-12 text-primary-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Choose a new password</h2>
          {!token && (
            <p className="mt-2 text-sm text-red-600">
              This link is missing a token. Request a new reset email from the login page.
            </p>
          )}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'At least 6 characters' },
                })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                {...register('confirm', {
                  required: 'Please confirm your password',
                  validate: (v) => v === watch('password') || 'Passwords do not match',
                })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
              {errors.confirm && (
                <p className="mt-1 text-sm text-red-600">{errors.confirm.message}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !token}
            className="w-full flex justify-center py-3 px-4 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving…' : 'Update password'}
          </button>

          <div className="text-center">
            <Link to="/login" className="text-sm font-medium text-primary-600 hover:text-primary-500">
              ← Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
