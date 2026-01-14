import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, AlertTriangle, Save } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { Allergen } from '../types';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);

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

