import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Dish } from '../types';

interface CartState {
  items: CartItem[];
  addItem: (dish: Dish, quantity?: number) => void;
  removeItem: (dishId: string) => void;
  updateQuantity: (dishId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (dish, quantity = 1) => {
        const items = get().items;
        const existingItem = items.find((item) => item.dish.id === dish.id);

        if (existingItem) {
          set({
            items: items.map((item) =>
              item.dish.id === dish.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          set({ items: [...items, { dish, quantity }] });
        }
      },

      removeItem: (dishId) => {
        set({ items: get().items.filter((item) => item.dish.id !== dishId) });
      },

      updateQuantity: (dishId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(dishId);
        } else {
          set({
            items: get().items.map((item) =>
              item.dish.id === dishId ? { ...item, quantity } : item
            ),
          });
        }
      },

      clearCart: () => set({ items: [] }),

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.dish.price * item.quantity,
          0
        );
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);

