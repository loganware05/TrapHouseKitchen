import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ChefHat } from 'lucide-react';
import api from '../lib/api';

interface Form {
  email: string;
}

type ForgotResponse = {
  status: string;
  message?: string;
  data?: { resetUrl?: string; resetToken?: string };
};

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>();
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const onSubmit = async (data: Form) => {
    try {
      setDevResetUrl(null);
      const res = await api.post<ForgotResponse>('/auth/forgot-password', {
        email: data.email.trim(),
      });
      toast.success(
        res.data.message ||
          'If that email is on file, check your inbox for reset instructions.'
      );
      if (res.data.data?.resetUrl) {
        setDevResetUrl(res.data.data.resetUrl);
      }
    } catch (error: unknown) {
      const msg =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      toast.error(msg || 'Something went wrong. Try again.');
    }
  };

  const copyLink = async () => {
    if (!devResetUrl) return;
    try {
      await navigator.clipboard.writeText(devResetUrl);
      toast.success('Reset link copied');
    } catch {
      toast.error('Could not copy — select the link manually');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <ChefHat className="mx-auto h-12 w-12 text-primary-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Reset your password</h2>
          <p className="mt-2 text-sm text-gray-600">
            We&apos;ll email you a link if an account exists for this address.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email', { required: 'Email is required' })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-3 px-4 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </button>

          {devResetUrl && (
            <div
              className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-left space-y-2"
              data-testid="dev-reset-link"
            >
              <p className="text-sm font-medium text-amber-900">
                Non-prod smoke helper — reset link (not emailed / or also emailed if Resend is set)
              </p>
              <a
                href={devResetUrl}
                className="block break-all text-sm text-primary-700 underline"
              >
                {devResetUrl}
              </a>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyLink}
                  className="text-sm font-medium text-amber-900 underline"
                >
                  Copy link
                </button>
                <Link
                  to={(() => {
                    try {
                      const u = new URL(devResetUrl);
                      return `${u.pathname}${u.search}`;
                    } catch {
                      return '/reset-password';
                    }
                  })()}
                  className="text-sm font-medium text-primary-700 underline"
                >
                  Open reset page
                </Link>
              </div>
            </div>
          )}

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
