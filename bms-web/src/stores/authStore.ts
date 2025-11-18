import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import React, { createContext, useContext, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  branchId?: string;
  branch?: {
    id: string;
    name: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setUser: (user: User, token: string) => void;
  updateUser: (user: User) => void;
  checkAuth: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true });
          
          const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (data.success) {
            const { user, token } = data.data;
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
            
            // Set cookie for SSR
            Cookies.set('auth_token', token, { expires: 7 });
            
            return { success: true };
          } else {
            set({ isLoading: false });
            return { success: false, error: data.error };
          }
        } catch {
          set({ isLoading: false });
          return { 
            success: false, 
            error: 'Network error. Please check your connection.' 
          };
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        Cookies.remove('auth_token');
      },

      setUser: (user: User, token: string) => {
        set({
          user,
          token,
          isAuthenticated: true,
        });
        Cookies.set('auth_token', token, { expires: 7 });
      },

      updateUser: (user: User) => {
        set({ user });
      },

      checkAuth: async () => {
        try {
          const token = Cookies.get('auth_token');
          if (!token) {
            set({ isLoading: false, isAuthenticated: false });
            return;
          }

          const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            set({
              user: data.data.user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // Token is invalid
            Cookies.remove('auth_token');
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'bms-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Context for React components
const AuthContext = createContext<AuthState | null>(null);

export const AuthStoreProvider = ({ children }: { children: ReactNode }) => {
  const store = useAuthStore();

  return React.createElement(AuthContext.Provider, { value: store }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthStoreProvider');
  }
  return context;
};

// NextAuth integration hook
export const useNextAuth = () => {
  return {
    ...useAuth(),
    // Additional NextAuth-specific methods can be added here
  };
};