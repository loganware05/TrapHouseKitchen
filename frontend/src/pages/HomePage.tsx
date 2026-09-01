import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Plus } from 'lucide-react';
import api from '../lib/api';
import { Dish, Category, Allergen } from '../types';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { toast } from 'sonner';
import { trackEvent } from '../stores/analyticsStore';
import SpendTracker from '../components/SpendTracker';
import { useRegisterPullToRefresh } from '../contexts/PullToRefreshContext';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function DishStripCard({
  dish,
  safe,
  onAdd,
}: {
  dish: Dish;
  safe: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="w-[9.5rem] shrink-0 flex flex-col rounded-th-lg border border-th-border bg-white shadow-th-card overflow-hidden">
      <Link to={`/menu/${dish.id}`} className="block relative aspect-[4/3] bg-th-muted">
        {dish.imageUrl ? (
          <img src={dish.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600 text-2xl font-bold text-white">
            {dish.name.charAt(0)}
          </div>
        )}
        {!safe && (
          <span className="absolute top-1 right-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            Allergen
          </span>
        )}
      </Link>
      <div className="p-2 flex flex-col flex-1">
        <Link to={`/menu/${dish.id}`} className="font-semibold text-sm text-gray-900 line-clamp-2 min-h-[2.5rem] hover:text-primary-600">
          {dish.name}
        </Link>
        <div className="mt-auto pt-2 flex items-center justify-between gap-1">
          <span className="text-sm font-bold text-primary-600 tabular-nums">${dish.price.toFixed(2)}</span>
          <button
            type="button"
            onClick={onAdd}
            disabled={!safe}
            className="rounded-full bg-primary-600 p-2 text-white disabled:bg-gray-300 disabled:text-gray-500"
            aria-label={`Add ${dish.name}`}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const [userAllergens, setUserAllergens] = useState<string[]>([]);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ data: { categories: Category[] } }>('/categories');
      return res.data.data.categories;
    },
  });

  const { data: dishesData } = useQuery({
    queryKey: ['dishes', 'home-all'],
    queryFn: async () => {
      const res = await api.get<{ data: { dishes: Dish[] } }>('/dishes');
      return res.data.data.dishes;
    },
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await api.get<{ data: { user: any } }>('/users/profile');
      return res.data.data.user;
    },
    enabled: !!user,
  });

  const handlePullRefresh = useCallback(async () => {
    const tasks = [
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
      queryClient.invalidateQueries({ queryKey: ['dishes', 'home-all'] }),
    ];
    if (user) {
      tasks.push(queryClient.invalidateQueries({ queryKey: ['userProfile'] }));
    }
    if (user?.role === 'CUSTOMER') {
      tasks.push(queryClient.invalidateQueries({ queryKey: ['orders', 'spend-tracker'] }));
    }
    await Promise.all(tasks);
  }, [queryClient, user]);

  useRegisterPullToRefresh(handlePullRefresh);

  useEffect(() => {
    if (userProfile?.allergenProfile) {
      setUserAllergens(userProfile.allergenProfile.map((ua: any) => ua.allergenId));
    }
  }, [userProfile]);

  const availableDishes = useMemo(
    () => dishesData?.filter((d) => d.status === 'AVAILABLE') ?? [],
    [dishesData]
  );

  const checkDishAllergens = (dish: Dish): { safe: boolean; allergens: Allergen[] } => {
    if (!user || userAllergens.length === 0) {
      return { safe: true, allergens: [] };
    }
    const conflictingAllergens =
      dish.allergens?.filter((da) => userAllergens.includes(da.allergenId)).map((da) => da.allergen) ?? [];
    return {
      safe: conflictingAllergens.length === 0,
      allergens: conflictingAllergens,
    };
  };

  const handleAddToCart = (dish: Dish, source: string) => {
    if (!user) {
      toast.error('Please log in to add items to your cart');
      return;
    }
    if (user.role !== 'CUSTOMER') {
      toast.error('Only customers can add items to cart');
      return;
    }
    const { safe, allergens } = checkDishAllergens(dish);
    if (!safe) {
      toast.error(
        `This dish contains ${allergens.map((a) => a.name).join(', ')} which you're avoiding.`,
        { duration: 5000 }
      );
      return;
    }
    addItem(dish);
    trackEvent('add_to_cart', {
      dishId: dish.id,
      name: dish.name,
      price: dish.price,
      source,
    });
    toast.success('Added to cart');
  };

  const trendingDishes = useMemo(() => {
    const list = [...availableDishes];
    const seed = new Date().toDateString();
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.abs(h + i) % (i + 1);
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list.slice(0, 8);
  }, [availableDishes]);

  const newDishes = useMemo(() => {
    return [...availableDishes]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [availableDishes]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:ml-64 pb-28 md:pb-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting()}
          {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm text-th-muted-fg mt-1">What are we eating tonight?</p>
      </header>

      <div className="mb-6">
        <SpendTracker />
      </div>

      {user && userAllergens.length > 0 && (
        <div className="mb-6 rounded-th-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Allergen alerts are on — we&apos;ll block unsafe adds from the home feed.</span>
        </div>
      )}

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">Trending tonight</h2>
          <Link to="/menu" className="text-sm font-semibold text-primary-600 flex items-center gap-0.5">
            See all
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin">
          {trendingDishes.map((dish) => {
            const { safe } = checkDishAllergens(dish);
            return (
              <DishStripCard
                key={dish.id}
                dish={dish}
                safe={safe}
                onAdd={() => handleAddToCart(dish, 'home_trending')}
              />
            );
          })}
        </div>
        {trendingDishes.length === 0 && (
          <p className="text-sm text-th-muted-fg">Menu is loading or empty — check back soon.</p>
        )}
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">New on the menu</h2>
          <Link to="/menu" className="text-sm font-semibold text-primary-600 flex items-center gap-0.5">
            Browse
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
          {newDishes.map((dish) => {
            const { safe } = checkDishAllergens(dish);
            return (
              <DishStripCard
                key={dish.id}
                dish={dish}
                safe={safe}
                onAdd={() => handleAddToCart(dish, 'home_new')}
              />
            );
          })}
        </div>
      </section>

      {categoriesData && categoriesData.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Jump to category</h2>
          <div className="flex flex-wrap gap-2">
            {categoriesData.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                to={`/menu?category=${encodeURIComponent(c.id)}`}
                className="rounded-full border border-th-border bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:border-primary-300 hover:bg-primary-50"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
