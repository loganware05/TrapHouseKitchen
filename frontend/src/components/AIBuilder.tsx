import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, X, ShoppingBag, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { useCheckoutSheetStore } from '../stores/checkoutSheetStore';
import { Dish } from '../types';
import { toast } from 'sonner';
import { trackEvent } from '../stores/analyticsStore';

type MealComboLine = {
  dishId: string;
  name: string;
  price: number;
  quantity: number;
  dish: Dish;
};

type MealCombo = {
  name: string;
  description: string;
  items: MealComboLine[];
  totalPrice: number;
};

type BuildMealResponse = {
  status: string;
  data: {
    combinations: MealCombo[];
    interactionId: string;
  };
};

const MIN_BUDGET = 5;
const MAX_BUDGET = 25;

export type AIBuilderSheetProps = {
  open: boolean;
  onClose: () => void;
  initialBudget?: number;
};

export type AIBuilderProps = {
  /** Home page: parent owns the CTA; only the sheet is shown when `open` is true. */
  sheet?: AIBuilderSheetProps;
};

export default function AIBuilder({ sheet }: AIBuilderProps) {
  const { user } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const openCheckout = useCheckoutSheetStore((s) => s.open);

  const controlled = !!sheet;
  const sheetOpen = sheet?.open ?? false;

  const [internalOpen, setInternalOpen] = useState(false);
  const modalOpen = controlled ? sheetOpen : internalOpen;

  const [budget, setBudget] = useState(12);
  const [loading, setLoading] = useState(false);
  const [combinations, setCombinations] = useState<MealCombo[] | null>(null);
  const [interactionId, setInteractionId] = useState<string | null>(null);

  useEffect(() => {
    if (controlled && sheet?.open) {
      const next = sheet.initialBudget;
      if (next != null && Number.isFinite(next)) {
        setBudget(Math.min(MAX_BUDGET, Math.max(MIN_BUDGET, next)));
      }
      setCombinations(null);
      setInteractionId(null);
    }
  }, [controlled, sheet?.open, sheet?.initialBudget]);

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await api.get<{ data: { user: { dietaryPreferences?: { name: string }[] } } }>(
        '/users/profile'
      );
      return res.data.data.user;
    },
    enabled: modalOpen && !!user,
  });

  const dietaryPrefs = userProfile?.dietaryPreferences?.map((p) => p.name) ?? [];

  const closeModal = () => {
    if (controlled) {
      sheet?.onClose();
    } else {
      setInternalOpen(false);
    }
  };

  const runBuild = async () => {
    setLoading(true);
    setCombinations(null);
    setInteractionId(null);
    try {
      const res = await api.post<BuildMealResponse>('/ai/build-meal', { budget });
      const { combinations: combos, interactionId: id } = res.data.data;
      setCombinations(combos);
      setInteractionId(id);
      trackEvent('ai_build_meal', { budget, comboCount: combos.length, interactionId: id });
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      toast.error(msg || 'Could not build a meal. Try a different budget.');
    } finally {
      setLoading(false);
    }
  };

  const logSelection = async (comboIndex: number) => {
    if (!interactionId) return;
    try {
      await api.patch(`/ai/interactions/${interactionId}/selection`, {
        selectedComboIndex: comboIndex,
      });
    } catch {
      // non-blocking
    }
  };

  const addComboToCart = async (combo: MealCombo, index: number) => {
    if (!user) {
      toast.error('Please log in to add items to your cart');
      return;
    }
    if (user.role !== 'CUSTOMER') {
      toast.error('Only customers can add items to cart');
      return;
    }

    await logSelection(index);

    trackEvent('ai_combo_selected', {
      interactionId,
      comboIndex: index,
      totalPrice: combo.totalPrice,
      name: combo.name,
    });

    for (const line of combo.items) {
      addItem(line.dish, line.quantity);
    }
    toast.success(`Added "${combo.name}" to cart ($${combo.totalPrice.toFixed(2)})`);
    openCheckout();
    closeModal();
    setCombinations(null);
    setInteractionId(null);
  };

  if (!user || user.role !== 'CUSTOMER') {
    return null;
  }

  return (
    <>
      {!controlled && (
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 p-5 text-white shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white/15 p-2">
                <Sparkles className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Build my meal under a budget</h2>
                <p className="text-sm text-primary-100">
                  AI picks 2–3 combos from tonight&apos;s menu — respects your allergens & dietary prefs.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setInternalOpen(true);
                setCombinations(null);
                setInteractionId(null);
              }}
              className="shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 shadow hover:bg-primary-50"
            >
              Open meal builder
            </button>
          </div>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-builder-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close meal builder"
            onClick={closeModal}
          />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
              <h2 id="ai-builder-title" className="text-lg font-bold text-gray-900">
                Meal builder
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-4">
              <div>
                <label htmlFor="budget-slider" className="text-sm font-medium text-gray-700">
                  Budget: ${budget.toFixed(2)}
                </label>
                <input
                  id="budget-slider"
                  type="range"
                  min={MIN_BUDGET}
                  max={MAX_BUDGET}
                  step={0.5}
                  value={budget}
                  onChange={(e) => setBudget(parseFloat(e.target.value))}
                  className="mt-2 w-full accent-primary-600"
                />
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>${MIN_BUDGET}</span>
                  <span>${MAX_BUDGET}</span>
                </div>
              </div>

              {dietaryPrefs.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Your dietary preferences
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {dietaryPrefs.map((name) => (
                      <span
                        key={name}
                        className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-800"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={runBuild}
                  disabled={loading}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 min-w-[140px]"
                >
                  {loading ? (
                    'Building…'
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Build my meal
                    </>
                  )}
                </button>
                {combinations && (
                  <button
                    type="button"
                    onClick={runBuild}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try again
                  </button>
                )}
              </div>

              {combinations && combinations.length > 0 && (
                <ul className="space-y-4">
                  {combinations.map((combo, index) => (
                    <li
                      key={`${combo.name}-${index}`}
                      className="rounded-xl border border-gray-200 bg-gray-50/80 p-4"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{combo.name}</h3>
                          {combo.description && (
                            <p className="mt-1 text-sm text-gray-600">{combo.description}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-lg font-bold text-primary-600">
                          ${combo.totalPrice.toFixed(2)}
                        </span>
                      </div>
                      <ul className="mb-3 space-y-1 text-sm text-gray-700">
                        {combo.items.map((line, li) => (
                          <li key={`${line.dishId}-${li}`}>
                            {line.quantity}× {line.name}{' '}
                            <span className="text-gray-500">
                              (${(line.price * line.quantity).toFixed(2)})
                            </span>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => addComboToCart(combo, index)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Add all to cart
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
