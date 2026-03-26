import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Flame, Clock, Plus, Search } from 'lucide-react';
import api from '../lib/api';
import { Dish, Category, Allergen } from '../types';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { useCheckoutSheetStore } from '../stores/checkoutSheetStore';
import { toast } from 'sonner';
import { trackEvent } from '../stores/analyticsStore';

export default function MenuPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category') || 'all';

  const { user } = useAuthStore();
  const addItem = useCartStore((state) => state.addItem);
  const openCheckout = useCheckoutSheetStore((s) => s.open);

  const [selectedCategory, setSelectedCategory] = useState<string>(categoryFromUrl);
  const [search, setSearch] = useState('');
  const [userAllergens, setUserAllergens] = useState<string[]>([]);

  useEffect(() => {
    setSelectedCategory(categoryFromUrl);
  }, [categoryFromUrl]);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ data: { categories: Category[] } }>('/categories');
      return res.data.data.categories;
    },
  });

  const { data: dishesData } = useQuery({
    queryKey: ['dishes', selectedCategory],
    queryFn: async () => {
      const params = selectedCategory !== 'all' ? { categoryId: selectedCategory } : {};
      const res = await api.get<{ data: { dishes: Dish[] } }>('/dishes', { params });
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

  useEffect(() => {
    if (userProfile?.allergenProfile) {
      setUserAllergens(userProfile.allergenProfile.map((ua: any) => ua.allergenId));
    }
  }, [userProfile]);

  const availableDishes = dishesData?.filter((dish) => dish.status === 'AVAILABLE') || [];

  const filteredDishes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableDishes;
    return availableDishes.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q))
    );
  }, [availableDishes, search]);

  const checkDishAllergens = (dish: Dish): { safe: boolean; allergens: Allergen[] } => {
    if (!user || userAllergens.length === 0) {
      return { safe: true, allergens: [] };
    }
    const conflictingAllergens =
      dish.allergens?.filter((da) => userAllergens.includes(da.allergenId)).map((da) => da.allergen) || [];
    return {
      safe: conflictingAllergens.length === 0,
      allergens: conflictingAllergens,
    };
  };

  const selectCategory = (id: string) => {
    setSelectedCategory(id);
    if (id === 'all') {
      searchParams.delete('category');
      setSearchParams(searchParams, { replace: true });
    } else {
      setSearchParams({ category: id }, { replace: true });
    }
  };

  const handleAddToCart = (dish: Dish) => {
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
        `Warning: This dish contains ${allergens.map((a) => a.name).join(', ')} which you're allergic to!`,
        { duration: 5000 }
      );
      return;
    }
    addItem(dish);
    trackEvent('add_to_cart', {
      dishId: dish.id,
      name: dish.name,
      price: dish.price,
      source: 'menu',
    });
    toast.success('Added to cart');
    openCheckout();
  };

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:ml-64 pb-28 md:pb-8">
      <h1 className="text-th-display text-gray-900 mb-4">Menu</h1>

      <div className="sticky top-14 z-30 md:top-16 -mx-4 px-4 py-3 bg-th-surface/95 backdrop-blur-md border-b border-th-border md:static md:border-0 md:bg-transparent md:p-0 md:mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-th-muted-fg" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes..."
            className="w-full rounded-th-lg border border-th-border bg-white py-2.5 pl-10 pr-4 text-th-body shadow-th-card focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            aria-label="Search menu"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => selectCategory('all')}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-colors ${
              selectedCategory === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border border-th-border hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {categoriesData?.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => selectCategory(category.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-colors ${
                selectedCategory === category.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-th-border hover:bg-gray-50'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {user && userAllergens.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-th-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <AlertTriangle className="inline h-4 w-4 mr-1" />
            Allergen filtering is active. Dishes containing your allergens are highlighted.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDishes.map((dish) => {
          const { safe, allergens } = checkDishAllergens(dish);
          return (
            <div
              key={dish.id}
              className={`bg-white rounded-th-lg shadow-th-card overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.99] ${
                !safe ? 'ring-2 ring-red-500' : ''
              }`}
            >
              <Link to={`/menu/${dish.id}`}>
                <div className="relative">
                  {dish.imageUrl ? (
                    <img src={dish.imageUrl} alt="" className="w-full h-44 object-cover" />
                  ) : (
                    <div className="w-full h-44 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                      <span className="text-white text-4xl font-bold">{dish.name.charAt(0)}</span>
                    </div>
                  )}
                  {!safe && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      <AlertTriangle className="inline h-3 w-3 mr-1" />
                      Allergen
                    </div>
                  )}
                </div>
              </Link>

              <div className="p-4">
                <Link to={`/menu/${dish.id}`}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 hover:text-primary-600 line-clamp-2">
                    {dish.name}
                  </h3>
                </Link>
                <p className="text-th-muted-fg text-sm mb-3 line-clamp-2">{dish.description}</p>

                <div className="flex items-center gap-3 mb-3 text-sm text-th-muted-fg">
                  {dish.prepTime != null && dish.prepTime > 0 && (
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {dish.prepTime} min
                    </span>
                  )}
                  {dish.spiceLevel != null && dish.spiceLevel > 0 && (
                    <span className="flex items-center">
                      <Flame className="h-4 w-4 mr-1 text-red-500" />
                      {Array(dish.spiceLevel).fill('🌶️').join('')}
                    </span>
                  )}
                </div>

                <div className="flex gap-2 mb-3 flex-wrap">
                  {dish.isVegan && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Vegan</span>
                  )}
                  {dish.isVegetarian && !dish.isVegan && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Vegetarian</span>
                  )}
                  {dish.isGlutenFree && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Gluten-Free</span>
                  )}
                </div>

                {!safe && allergens.length > 0 && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-th-md">
                    <p className="text-xs text-red-800 font-medium">
                      Contains: {allergens.map((a) => a.name).join(', ')}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xl font-bold text-primary-600 tabular-nums">${dish.price.toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => handleAddToCart(dish)}
                    disabled={!safe}
                    className={`px-4 py-2.5 rounded-th-lg font-semibold text-sm transition-colors flex items-center gap-2 ${
                      safe
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDishes.length === 0 && (
        <div className="text-center py-16">
          <p className="text-th-muted-fg text-lg">No dishes match your search.</p>
        </div>
      )}

    </div>
  );
}
