import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthResponse } from '../types';
import api from '../lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  guestLogin: (name: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      setUser: (user) => set({ user }),
      
      setToken: (token) => {
        if (token) {
          localStorage.setItem('token', token);
        } else {
          localStorage.removeItem('token');
        }
        set({ token });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post<{ data: AuthResponse }>('/auth/login', {
            email,
            password,
          });
          const { user, token } = response.data.data;
          set({ user, token, isLoading: false });
          localStorage.setItem('token', token);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post<{ data: AuthResponse }>('/auth/register', {
            email,
            password,
            name,
          });
          const { user, token } = response.data.data;
          set({ user, token, isLoading: false });
          localStorage.setItem('token', token);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      guestLogin: async (name: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post<{ data: AuthResponse }>('/auth/guest', {
            name,
          });
          const { user, token } = response.data.data;
          set({ user, token, isLoading: false });
          localStorage.setItem('token', token);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },

      fetchUser: async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
          const response = await api.get<{ data: { user: User } }>('/auth/me');
          set({ user: response.data.data.user });
        } catch (error) {
          localStorage.removeItem('token');
          set({ user: null, token: null });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

