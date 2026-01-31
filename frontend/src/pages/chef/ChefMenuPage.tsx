import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import api from '../../lib/api';
import { Dish, Category, Ingredient, Allergen } from '../../types';

interface DishForm {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  imageUrl?: string;
  prepTime?: number;
  spiceLevel?: number;
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  status: string;
}

export default function ChefMenuPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<DishForm>();

  const { data: dishesData } = useQuery({
    queryKey: ['dishes'],
    queryFn: async () => {
      const res = await api.get<{ data: { dishes: Dish[] } }>('/dishes');
      return res.data.data.dishes;
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<{ data: { categories: Category[] } }>('/categories');
      return res.data.data.categories;
    },
  });

  const { data: ingredientsData } = useQuery({
    queryKey: ['ingredients'],
    queryFn: async () => {
      const res = await api.get<{ data: { ingredients: Ingredient[] } }>('/ingredients');
      return res.data.data.ingredients;
    },
  });

  const { data: allergensData } = useQuery({
    queryKey: ['allergens'],
    queryFn: async () => {
      const res = await api.get<{ data: { allergens: Allergen[] } }>('/allergens');
      return res.data.data.allergens;
    },
  });

  const createDishMutation = useMutation({
    mutationFn: async (data: any) => {
      await api.post('/dishes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
      toast.success('Dish created successfully!');
      resetForm();
    },
    onError: () => {
      toast.error('Failed to create dish');
    },
  });

  const updateDishMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await api.put(`/dishes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
      toast.success('Dish updated successfully!');
      resetForm();
    },
    onError: () => {
      toast.error('Failed to update dish');
    },
  });

  const deleteDishMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/dishes/${id}`);
      return response.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
      toast.success(data?.message || 'Dish removed from menu (set to unavailable)');
    },
    onError: (error: any) => {
      console.error('Delete dish error:', error);
      toast.error(error.response?.data?.message || 'Failed to remove dish');
    },
  });

  const resetForm = () => {
    reset();
    setShowForm(false);
    setEditingDish(null);
    setSelectedIngredients([]);
    setSelectedAllergens([]);
  };

  const handleEdit = (dish: Dish) => {
    setEditingDish(dish);
    setShowForm(true);
    setValue('name', dish.name);
    setValue('description', dish.description);
    setValue('price', dish.price);
    setValue('categoryId', dish.categoryId);
    setValue('imageUrl', dish.imageUrl || '');
    setValue('prepTime', dish.prepTime || 0);
    setValue('spiceLevel', dish.spiceLevel || 0);
    setValue('isVegan', dish.isVegan);
    setValue('isVegetarian', dish.isVegetarian);
    setValue('isGlutenFree', dish.isGlutenFree);
    setValue('status', dish.status);
    setSelectedIngredients(dish.ingredients?.map((di) => di.ingredientId) || []);
    setSelectedAllergens(dish.allergens?.map((da) => da.allergenId) || []);
  };

  const onSubmit = (data: DishForm) => {
    const dishData = {
      ...data,
      price: Number(data.price),
      prepTime: data.prepTime ? Number(data.prepTime) : undefined,
      spiceLevel: data.spiceLevel ? Number(data.spiceLevel) : undefined,
      ingredientIds: selectedIngredients,
      allergenIds: selectedAllergens,
    };

    if (editingDish) {
      updateDishMutation.mutate({ id: editingDish.id, data: dishData });
    } else {
      createDishMutation.mutate(dishData);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:ml-64 mb-20 md:mb-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          {showForm ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          {showForm ? 'Cancel' : 'Add Dish'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {editingDish ? 'Edit Dish' : 'Create New Dish'}
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('price', { required: 'Price is required', min: 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  {...register('categoryId', { required: 'Category is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select category</option>
                  {categoriesData?.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  {...register('status')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="UNAVAILABLE">Unavailable</option>
                  <option value="SEASONAL">Seasonal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prep Time (minutes)
                </label>
                <input
                  type="number"
                  {...register('prepTime')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Spice Level (0-5)
                </label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  {...register('spiceLevel')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                {...register('description', { required: 'Description is required' })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image URL
              </label>
              <input
                {...register('imageUrl')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="checkbox" {...register('isVegan')} className="mr-2" />
                <span className="text-sm text-gray-700">Vegan</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" {...register('isVegetarian')} className="mr-2" />
                <span className="text-sm text-gray-700">Vegetarian</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" {...register('isGlutenFree')} className="mr-2" />
                <span className="text-sm text-gray-700">Gluten-Free</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              {editingDish ? 'Update Dish' : 'Create Dish'}
            </button>
          </form>
        </div>
      )}

      {/* Dishes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dishesData?.map((dish) => (
          <div key={dish.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {dish.imageUrl ? (
              <img src={dish.imageUrl} alt={dish.name} className="w-full h-48 object-cover" />
            ) : (
              <div className="w-full h-48 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <span className="text-white text-4xl font-bold">{dish.name.charAt(0)}</span>
              </div>
            )}
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{dish.name}</h3>
                <span className="text-xl font-bold text-primary-600">${dish.price.toFixed(2)}</span>
              </div>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{dish.description}</p>
              <p className="text-sm text-gray-500 mb-3">{dish.category.name}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(dish)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm('Remove this dish from the menu? It will be set to unavailable but order history will be preserved.')) {
                      deleteDishMutation.mutate(dish.id);
                    }
                  }}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  title="Remove dish from menu"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

