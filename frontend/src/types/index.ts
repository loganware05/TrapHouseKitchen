export type UserRole = 'CUSTOMER' | 'CHEF' | 'ADMIN';
export type DishStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'SEASONAL';
export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface User {
  id: string;
  email?: string;
  name: string;
  role: UserRole;
  isGuest: boolean;
  createdAt: string;
  allergenProfile?: UserAllergen[];
  dietaryPreferences?: DietaryPreference[];
}

export interface Allergen {
  id: string;
  name: string;
  description?: string;
  severity: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserAllergen {
  id: string;
  userId: string;
  allergenId: string;
  allergen: Allergen;
  createdAt: string;
}

export interface DietaryPreference {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Ingredient {
  id: string;
  name: string;
  description?: string;
  isVegan: boolean;
  isVegetarian: boolean;
  createdAt: string;
  updatedAt: string;
  allergens?: IngredientAllergen[];
}

export interface IngredientAllergen {
  id: string;
  ingredientId: string;
  allergenId: string;
  allergen: Allergen;
  createdAt: string;
}

export interface DishIngredient {
  id: string;
  dishId: string;
  ingredientId: string;
  quantity?: string;
  isOptional: boolean;
  ingredient: Ingredient;
}

export interface DishAllergen {
  id: string;
  dishId: string;
  allergenId: string;
  allergen: Allergen;
  createdAt: string;
}

export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  status: DishStatus;
  categoryId: string;
  prepTime?: number;
  spiceLevel?: number;
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  createdAt: string;
  updatedAt: string;
  category: Category;
  ingredients?: DishIngredient[];
  allergens?: DishAllergen[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  dishId: string;
  quantity: number;
  priceAtOrder: number;
  customizations?: string;
  dish: Dish;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalPrice: number;
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  items: OrderItem[];
  user?: {
    id: string;
    name: string;
    email?: string;
  };
}

export interface DishRequest {
  id: string;
  userId: string;
  title: string;
  description: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
  };
  votes?: Vote[];
  _count?: {
    votes: number;
  };
}

export interface Vote {
  id: string;
  userId: string;
  dishRequestId: string;
  isUpvote: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

export interface CartItem {
  dish: Dish;
  quantity: number;
  customizations?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

