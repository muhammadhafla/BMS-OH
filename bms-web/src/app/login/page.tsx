'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LoginForm } from '@/components/auth/LoginForm';
import { Loader2 } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard or the intended page
    if (session?.user) {
      const callbackUrl = searchParams.get('callbackUrl');
      const authRedirect = typeof window !== 'undefined' ? localStorage.getItem('auth_redirect') : null;
      
      // Clean up stored redirect URL
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_redirect');
      }

      // Redirect to the intended page, or callbackUrl, or dashboard
      const redirectTo = callbackUrl || authRedirect || '/dashboard';
      router.push(redirectTo);
    }
  }, [session, router, searchParams]);

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is already authenticated, show loading while redirecting
  if (session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-primary shadow-lg">
            <span className="text-primary-foreground font-bold text-2xl">BMS</span>
          </div>
          <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome Back
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Business Management System
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Sign in to access your account
          </p>
        </div>

        <LoginForm />
        
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Need help? Contact your system administrator
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;