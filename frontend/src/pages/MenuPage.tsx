import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, Flame, Clock, Plus } from 'lucide-react';
import api from '../lib/api';
import { Dish, Category, Allergen } from '../types';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { toast } from 'sonner';

export default function MenuPage() {
  const { user } = useAuthStore();
  const addItem = useCartStore((state) => state.addItem);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [userAllergens, setUserAllergens] = useState<string[]>([]);

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

  const checkDishAllergens = (dish: Dish): { safe: boolean; allergens: Allergen[] } => {
    if (!user || userAllergens.length === 0) {
      return { safe: true, allergens: [] };
    }

    const dishAllergenIds = dish.allergens?.map((da) => da.allergenId) || [];
    const conflictingAllergens = dish.allergens?.filter((da) =>
      userAllergens.includes(da.allergenId)
    ).map((da) => da.allergen) || [];

    return {
      safe: conflictingAllergens.length === 0,
      allergens: conflictingAllergens,
    };
  };

  const handleAddToCart = (dish: Dish) => {
    const { safe, allergens } = checkDishAllergens(dish);
    
    if (!safe) {
      toast.error(
        `Warning: This dish contains ${allergens.map((a) => a.name).join(', ')} which you're allergic to!`,
        { duration: 5000 }
      );
      return;
    }

    addItem(dish);
    toast.success('Added to cart!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:ml-64 mb-20 md:mb-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Our Menu</h1>
        
        {user && userAllergens.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <AlertTriangle className="inline h-4 w-4 mr-1" />
              Allergen filtering is active. Dishes containing your allergens will be highlighted.
            </p>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {categoriesData?.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Dishes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dishesData?.map((dish) => {
          const { safe, allergens } = checkDishAllergens(dish);
          
          return (
            <div
              key={dish.id}
              className={`bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105 ${
                !safe ? 'border-2 border-red-500' : ''
              }`}
            >
              <Link to={`/menu/${dish.id}`}>
                <div className="relative">
                  {dish.imageUrl ? (
                    <img
                      src={dish.imageUrl}
                      alt={dish.name}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                      <span className="text-white text-4xl font-bold">
                        {dish.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  
                  {!safe && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      <AlertTriangle className="inline h-3 w-3 mr-1" />
                      Contains Allergen
                    </div>
                  )}
                </div>
              </Link>

              <div className="p-4">
                <Link to={`/menu/${dish.id}`}>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-primary-600">
                    {dish.name}
                  </h3>
                </Link>
                
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {dish.description}
                </p>

                <div className="flex items-center gap-3 mb-3 text-sm text-gray-500">
                  {dish.prepTime && dish.prepTime > 0 && (
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {dish.prepTime} min
                    </span>
                  )}
                  {dish.spiceLevel && dish.spiceLevel > 0 && (
                    <span className="flex items-center">
                      <Flame className="h-4 w-4 mr-1 text-red-500" />
                      {Array(dish.spiceLevel).fill('🌶️').join('')}
                    </span>
                  )}
                </div>

                <div className="flex gap-2 mb-3 flex-wrap">
                  {dish.isVegan && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Vegan
                    </span>
                  )}
                  {dish.isVegetarian && !dish.isVegan && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Vegetarian
                    </span>
                  )}
                  {dish.isGlutenFree && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Gluten-Free
                    </span>
                  )}
                </div>

                {!safe && allergens.length > 0 && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-xs text-red-800 font-medium">
                      Contains: {allergens.map((a) => a.name).join(', ')}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary-600">
                    ${dish.price.toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleAddToCart(dish)}
                    disabled={!safe}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
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

      {dishesData?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No dishes found in this category.</p>
        </div>
      )}
    </div>
  );
}

