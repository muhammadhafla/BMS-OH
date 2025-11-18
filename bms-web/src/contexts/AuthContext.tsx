'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Handle session status changes
  useEffect(() => {
    if (status === 'loading') {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [status]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const result = await nextAuthSignIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        return { success: false, error: result.error };
      }

      if (result?.ok) {
        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } catch (error) {
      return { 
        success: false, 
        error: 'Network error. Please check your connection.' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await nextAuthSignOut({ redirect: false });
      router.push('/login');
      router.refresh();
    } catch (error) {
      // Force logout even if there's an error
      router.push('/login');
      router.refresh();
    }
  };

  const refreshSession = () => {
    // Force a session refresh by triggering a re-validation
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const value: AuthContextType = {
    user: session?.user as User | null || null,
    isLoading: status === 'loading' || isLoading,
    isAuthenticated: !!session?.user,
    login,
    logout,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};