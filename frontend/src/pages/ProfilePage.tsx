import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Elements } from '@stripe/react-stripe-js';
import { User, AlertTriangle, Save, CreditCard, Trash2, Star, PieChart, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import stripePromise from '../lib/stripe';
import { useAuthStore } from '../stores/authStore';
import { Allergen } from '../types';
import SavePaymentMethodForm from '../components/SavePaymentMethodForm';
import OrderReceipt from '../components/OrderReceipt';
import type { SavedCardSummary } from '../types';
import { customerOrdersQueryOptions } from '../lib/customerOrders';
import { selectRecentReceipts } from '../lib/orderReceipt';
import { useRegisterPullToRefresh } from '../contexts/PullToRefreshContext';

const PROFILE_RECEIPT_LIMIT = 3;

type UserSpendData = {
  period: string;
  weeklyBudget: number;
  spentInPeriod: number;
  budgetRemaining: number;
  categoryBreakdown: Array<{
    categoryName: string;
    amount: number;
    percentOfSpend: number;
  }>;
  orderCount: number;
};

function formatBrand(brand: string) {
  if (!brand) return 'Card';
  return brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  const [addCardClientSecret, setAddCardClientSecret] = useState<string | null>(null);
  const [addCardLoading, setAddCardLoading] = useState(false);
  const [receiptsOpen, setReceiptsOpen] = useState(false);

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await api.get<{ data: { user: any } }>('/users/profile');
      const profile = res.data.data.user;
      setSelectedAllergens(profile.allergenProfile?.map((ua: any) => ua.allergenId) || []);
      setDietaryPrefs(profile.dietaryPreferences?.map((dp: any) => dp.name) || []);
      return profile;
    },
  });

  const { data: allergensData } = useQuery({
    queryKey: ['allergens'],
    queryFn: async () => {
      const res = await api.get<{ data: { allergens: Allergen[] } }>('/allergens');
      return res.data.data.allergens;
    },
  });

  const [spendPeriod, setSpendPeriod] = useState<'7d' | '30d'>('7d');

  const { data: spendData, isLoading: spendLoading } = useQuery({
    queryKey: ['userSpend', spendPeriod],
    queryFn: async () => {
      const res = await api.get<{ status: string; data: UserSpendData }>(
        '/analytics/user-spend',
        { params: { period: spendPeriod } }
      );
      return res.data.data;
    },
    enabled: !!user && user.role === 'CUSTOMER',
  });

  const { data: savedMethods = [] } = useQuery({
    queryKey: ['savedPaymentMethods'],
    queryFn: async () => {
      const res = await api.get<{ data: { methods: SavedCardSummary[] } }>('/payment/methods');
      return res.data.data.methods;
    },
    enabled: !!user && !user.isGuest,
  });

  const { data: ordersData } = useQuery({
    ...customerOrdersQueryOptions(!!user && user.role === 'CUSTOMER'),
  });

  const recentReceipts = selectRecentReceipts(ordersData ?? [], PROFILE_RECEIPT_LIMIT);

  const handlePullRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['userProfile'] }),
      queryClient.invalidateQueries({ queryKey: ['allergens'] }),
      queryClient.invalidateQueries({ queryKey: ['userSpend'] }),
      queryClient.invalidateQueries({ queryKey: ['savedPaymentMethods'] }),
      queryClient.invalidateQueries({ queryKey: ['orders'] }),
    ]);
  }, [queryClient]);

  useRegisterPullToRefresh(handlePullRefresh);

  const handleWriteReview = (orderId: string, dishId?: string) => {
    if (dishId) {
      navigate(`/reviews/new?orderId=${orderId}&dishId=${dishId}`);
    } else {
      navigate(`/reviews/new?orderId=${orderId}`);
    }
  };

  useEffect(() => {
    if (searchParams.get('setup_return') !== '1') return;
    const sid = searchParams.get('setup_intent');
    if (!sid) {
      setSearchParams({}, { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await api.post('/payment/methods/sync', { setupIntentId: sid });
        if (!cancelled) {
          toast.success('Card saved for faster checkout');
          queryClient.invalidateQueries({ queryKey: ['savedPaymentMethods'] });
        }
      } catch {
        if (!cancelled) toast.error('Could not save card. Try again.');
      } finally {
        if (!cancelled) setSearchParams({}, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams, queryClient]);

  const deleteCardMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/payment/methods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedPaymentMethods'] });
      toast.success('Card removed');
    },
    onError: () => toast.error('Could not remove card'),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/payment/methods/${id}/default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedPaymentMethods'] });
      toast.success('Default card updated');
    },
    onError: () => toast.error('Could not update default'),
  });

  const startAddCard = async () => {
    try {
      setAddCardLoading(true);
      const res = await api.post<{ data: { clientSecret: string } }>('/payment/setup-intent');
      setAddCardClientSecret(res.data.data.clientSecret);
    } catch {
      toast.error('Could not start card setup');
    } finally {
      setAddCardLoading(false);
    }
  };

  const updateAllergensMutation = useMutation({
    mutationFn: async (allergenIds: string[]) => {
      await api.post('/users/allergens', { allergenIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      toast.success('Allergen profile updated!');
    },
    onError: () => {
      toast.error('Failed to update allergen profile');
    },
  });

  const updateDietaryPrefsMutation = useMutation({
    mutationFn: async (preferences: string[]) => {
      const prefs = preferences.map((name) => ({ name }));
      await api.post('/users/dietary-preferences', { preferences: prefs });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      toast.success('Dietary preferences updated!');
    },
    onError: () => {
      toast.error('Failed to update dietary preferences');
    },
  });

  const handleSaveAllergens = () => {
    updateAllergensMutation.mutate(selectedAllergens);
  };

  const handleSaveDietaryPrefs = () => {
    updateDietaryPrefsMutation.mutate(dietaryPrefs);
  };

  const toggleAllergen = (allergenId: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(allergenId)
        ? prev.filter((id) => id !== allergenId)
        : [...prev, allergenId]
    );
  };

  const commonDietaryPreferences = [
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Dairy-Free',
    'Keto',
    'Paleo',
    'Low-Carb',
    'Halal',
    'Kosher',
  ];

  const toggleDietaryPref = (pref: string) => {
    setDietaryPrefs((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:ml-64 mb-20 md:mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

      {/* User Info */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="bg-primary-100 p-4 rounded-full">
            <User className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{user?.name}</h2>
            {user?.email && <p className="text-gray-600">{user.email}</p>}
            {user?.isGuest && (
              <span className="inline-block mt-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                Guest Account
              </span>
            )}
          </div>
        </div>
      </div>

      {user?.role === 'CUSTOMER' && recentReceipts.length > 0 && (
        <section className="mb-6" aria-labelledby="recent-receipts-heading">
          <button
            type="button"
            id="recent-receipts-heading"
            onClick={() => setReceiptsOpen((open) => !open)}
            aria-expanded={receiptsOpen}
            aria-label="Receipts"
            className="w-full flex items-center justify-between gap-3 rounded-th-lg border border-th-border bg-white px-4 py-3 text-left shadow-th-card hover:bg-th-surface-muted transition-colors"
          >
            <span>
              <span className="block text-xl font-semibold text-gray-900">Receipts</span>
              <span className="block text-sm text-gray-600 mt-0.5">
                Up to {PROFILE_RECEIPT_LIMIT} recent completed orders (30-day window)
              </span>
            </span>
            {receiptsOpen ? (
              <ChevronDown className="h-5 w-5 text-th-muted-fg shrink-0" aria-hidden />
            ) : (
              <ChevronRight className="h-5 w-5 text-th-muted-fg shrink-0" aria-hidden />
            )}
          </button>
          {receiptsOpen && (
            <div className="mt-4 space-y-4">
              {recentReceipts.map((order) => (
                <OrderReceipt
                  key={order.id}
                  order={order}
                  onWriteReview={handleWriteReview}
                />
              ))}
              <div className="text-center">
                <Link to="/orders" className="text-sm font-medium text-primary-600 hover:underline">
                  View all orders
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {user?.role === 'CUSTOMER' && (
        <div className="bg-white rounded-th-xl shadow-th-card p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Legal</h2>
          <nav className="space-y-1" aria-label="Legal links">
            <Link
              to="/privacy"
              className="flex items-center justify-between rounded-th-lg px-3 py-3 text-gray-700 hover:bg-th-surface-muted transition-colors text-sm"
            >
              Privacy policy
              <ChevronRight className="h-4 w-4 text-th-muted-fg" />
            </Link>
            <Link
              to="/terms"
              className="flex items-center justify-between rounded-th-lg px-3 py-3 text-gray-700 hover:bg-th-surface-muted transition-colors text-sm"
            >
              Terms of service
              <ChevronRight className="h-4 w-4 text-th-muted-fg" />
            </Link>
          </nav>
        </div>
      )}

      {user?.role === 'CUSTOMER' && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-primary-600" />
                Spending insights
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Paid orders in the selected period vs your weekly budget target.
              </p>
            </div>
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 shrink-0">
              {(['7d', '30d'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSpendPeriod(p)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    spendPeriod === p
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {p === '7d' ? '7 days' : '30 days'}
                </button>
              ))}
            </div>
          </div>

          {spendLoading || !spendData ? (
            <p className="text-gray-500 text-sm py-4">Loading spend summary…</p>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Budget progress</span>
                  <span>
                    ${spendData.spentInPeriod.toFixed(2)} / ${spendData.weeklyBudget.toFixed(2)}
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      spendData.spentInPeriod > spendData.weeklyBudget
                        ? 'bg-amber-500'
                        : 'bg-primary-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        spendData.weeklyBudget > 0
                          ? (spendData.spentInPeriod / spendData.weeklyBudget) * 100
                          : 0
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {spendData.orderCount} paid order{spendData.orderCount === 1 ? '' : 's'} ·{' '}
                  {spendData.budgetRemaining >= 0
                    ? `$${spendData.budgetRemaining.toFixed(2)} left vs budget`
                    : `$${Math.abs(spendData.budgetRemaining).toFixed(2)} over budget`}
                </p>
              </div>

              {spendData.categoryBreakdown.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">By category</h3>
                  <ul className="space-y-2">
                    {spendData.categoryBreakdown.map((row) => (
                      <li key={row.categoryName} className="flex items-center gap-2 text-sm">
                        <span className="w-36 text-gray-600 truncate">{row.categoryName}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-400 rounded-full"
                            style={{ width: `${Math.min(100, row.percentOfSpend)}%` }}
                          />
                        </div>
                        <span className="w-20 text-right text-gray-900 font-medium">
                          ${row.amount.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Saved payment methods (1-tap checkout) */}
      {user && !user.isGuest && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Saved cards</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Use a saved card at checkout with one tap. Cards are stored securely with Stripe.
          </p>

          {savedMethods.length > 0 && (
            <ul className="space-y-2 mb-4">
              {savedMethods.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2 p-3 rounded-lg border border-gray-200"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatBrand(m.brand)} •••• {m.last4}
                      {m.isDefault && (
                        <span className="ml-2 text-xs text-primary-600 font-normal">Default</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      Exp {m.expiryMonth}/{m.expiryYear}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!m.isDefault && (
                      <button
                        type="button"
                        onClick={() => setDefaultMutation.mutate(m.id)}
                        disabled={setDefaultMutation.isPending}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"
                        title="Set as default"
                        aria-label="Set as default"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteCardMutation.mutate(m.id)}
                      disabled={deleteCardMutation.isPending}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Remove card"
                      aria-label="Remove card"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!addCardClientSecret && (
            <button
              type="button"
              onClick={startAddCard}
              disabled={addCardLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {addCardLoading ? 'Loading…' : savedMethods.length ? 'Add another card' : 'Add a card'}
            </button>
          )}

          {addCardClientSecret && (
            <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: addCardClientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: { colorPrimary: '#ea580c' },
                  },
                }}
              >
                <SavePaymentMethodForm
                  onComplete={() => {
                    setAddCardClientSecret(null);
                    queryClient.invalidateQueries({ queryKey: ['savedPaymentMethods'] });
                  }}
                  onCancel={() => setAddCardClientSecret(null)}
                />
              </Elements>
            </div>
          )}
        </div>
      )}

      {/* Allergen Profile */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
              Allergen Profile
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Select allergens you're sensitive to. We'll warn you about dishes containing them.
            </p>
          </div>
          <button
            onClick={handleSaveAllergens}
            disabled={updateAllergensMutation.isPending}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {allergensData?.map((allergen) => (
            <button
              key={allergen.id}
              onClick={() => toggleAllergen(allergen.id)}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                selectedAllergens.includes(allergen.id)
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-gray-900">{allergen.name}</p>
              {allergen.description && (
                <p className="text-xs text-gray-600 mt-1">{allergen.description}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Dietary Preferences */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Dietary Preferences</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select your dietary preferences to help filter menu items.
            </p>
          </div>
          <button
            onClick={handleSaveDietaryPrefs}
            disabled={updateDietaryPrefsMutation.isPending}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {commonDietaryPreferences.map((pref) => (
            <button
              key={pref}
              onClick={() => toggleDietaryPref(pref)}
              className={`p-3 rounded-lg border-2 transition-all ${
                dietaryPrefs.includes(pref)
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-gray-900">{pref}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

