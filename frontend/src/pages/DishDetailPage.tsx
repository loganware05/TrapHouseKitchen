import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, AlertTriangle, Clock, Flame, Plus, Minus } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Dish } from '../types';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { toast } from 'sonner';

export default function DishDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [userAllergens, setUserAllergens] = useState<string[]>([]);

  const { data: dish, isLoading } = useQuery({
    queryKey: ['dish', id],
    queryFn: async () => {
      const res = await api.get<{ data: { dish: Dish } }>(`/dishes/${id}`);
      return res.data.data.dish;
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!dish) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600 mb-4">Dish not found</p>
        <button
          onClick={() => navigate('/menu')}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Back to Menu
        </button>
      </div>
    );
  }

  const dishAllergenIds = dish.allergens?.map((da) => da.allergenId) || [];
  const conflictingAllergens = dish.allergens?.filter((da) =>
    userAllergens.includes(da.allergenId)
  ).map((da) => da.allergen) || [];
  const isSafe = conflictingAllergens.length === 0;

  const handleAddToCart = () => {
    // Check if user is logged in
    if (!user) {
      toast.error('Please log in to add items to your cart');
      navigate('/login');
      return;
    }

    // Check if user is a customer (not chef/admin)
    if (user.role !== 'CUSTOMER') {
      toast.error('Only customers can add items to cart');
      return;
    }

    if (!isSafe) {
      toast.error(
        `Warning: This dish contains ${conflictingAllergens.map((a) => a.name).join(', ')} which you're allergic to!`,
        { duration: 5000 }
      );
      return;
    }

    addItem(dish, quantity);
    toast.success(`Added ${quantity} ${dish.name} to cart!`);
    navigate('/menu');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:ml-64 mb-20 md:mb-8">
      <button
        onClick={() => navigate('/menu')}
        className="flex items-center text-gray-600 hover:text-primary-600 mb-6"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Menu
      </button>

      {!isSafe && (
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-1">Allergen Warning</h3>
              <p className="text-red-800">
                This dish contains: <strong>{conflictingAllergens.map((a) => a.name).join(', ')}</strong>
              </p>
              <p className="text-sm text-red-700 mt-1">
                Based on your allergen profile, this dish may not be safe for you.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {dish.imageUrl ? (
          <img
            src={dish.imageUrl}
            alt={dish.name}
            className="w-full h-64 md:h-96 object-cover"
          />
        ) : (
          <div className="w-full h-64 md:h-96 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
            <span className="text-white text-6xl md:text-8xl font-bold">
              {dish.name.charAt(0)}
            </span>
          </div>
        )}

        <div className="p-6 md:p-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {dish.name}
              </h1>
              <p className="text-gray-600">{dish.category.name}</p>
            </div>
            <span className="text-3xl md:text-4xl font-bold text-primary-600">
              ${dish.price.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-4 mb-6 text-gray-600">
            {dish.prepTime && dish.prepTime > 0 && (
              <span className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                {dish.prepTime} min
              </span>
            )}
            {dish.spiceLevel && dish.spiceLevel > 0 && (
              <span className="flex items-center">
                <Flame className="h-5 w-5 mr-2 text-red-500" />
                Spice Level: {dish.spiceLevel}/5
              </span>
            )}
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            {dish.isVegan && (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                Vegan
              </span>
            )}
            {dish.isVegetarian && !dish.isVegan && (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                Vegetarian
              </span>
            )}
            {dish.isGlutenFree && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                Gluten-Free
              </span>
            )}
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-gray-700 leading-relaxed">{dish.description}</p>
          </div>

          {dish.ingredients && dish.ingredients.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Ingredients</h2>
              <ul className="grid grid-cols-2 gap-2">
                {dish.ingredients.map((di) => (
                  <li key={di.id} className="flex items-center text-gray-700">
                    <span className="w-2 h-2 bg-primary-600 rounded-full mr-2"></span>
                    {di.ingredient.name}
                    {di.isOptional && (
                      <span className="text-xs text-gray-500 ml-1">(optional)</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {dish.allergens && dish.allergens.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Allergen Information</h2>
              <div className="flex flex-wrap gap-2">
                {dish.allergens.map((da) => {
                  const isUserAllergen = userAllergens.includes(da.allergenId);
                  return (
                    <span
                      key={da.id}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        isUserAllergen
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {isUserAllergen && <AlertTriangle className="inline h-3 w-3 mr-1" />}
                      {da.allergen.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-gray-700 font-medium">Quantity:</span>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-gray-100 rounded-l-lg"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <span className="px-4 py-2 font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 hover:bg-gray-100 rounded-r-lg"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={!isSafe}
                className={`px-6 py-3 rounded-lg font-semibold text-lg transition-colors ${
                  isSafe
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSafe ? `Add to Cart - $${(dish.price * quantity).toFixed(2)}` : 'Contains Allergens'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

