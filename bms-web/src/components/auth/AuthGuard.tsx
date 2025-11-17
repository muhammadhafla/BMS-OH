'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, Shield, LogIn } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: string[];
  redirectTo?: string;
  fallback?: React.ReactNode;
}

interface RoleHierarchy {
  [key: string]: number;
}

// Define role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY: RoleHierarchy = {
  STAFF: 1,
  MANAGER: 2,
  ADMIN: 3,
};

// Check if user has required role
const hasRequiredRole = (userRole: string | null, requiredRoles?: string[]): boolean => {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  if (!userRole) return false;
  
  // If user has any of the required roles
  return requiredRoles.includes(userRole);
};

// Check if user role meets minimum requirement
const hasMinimumRole = (userRole: string | null, minimumRole: string): boolean => {
  if (!userRole) return false;
  
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;
  
  return userLevel >= requiredLevel;
};

const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requiredRole, 
  redirectTo = '/login',
  fallback 
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setCheckingAuth(true);
      
      // Simulate auth check (in real app, this would validate token, etc.)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCheckingAuth(false);
    };

    checkAuth();
  }, [pathname]);

  useEffect(() => {
    if (!isLoading && !checkingAuth) {
      if (!isAuthenticated) {
        // Redirect to login if not authenticated
        const loginUrl = new URL(redirectTo, window.location.origin);
        loginUrl.searchParams.set('redirect', pathname);
        router.push(loginUrl.toString());
        return;
      }

      // Check role-based access
      if (requiredRole && !hasRequiredRole(user?.role, requiredRole)) {
        // User doesn't have required role, show access denied
        if (fallback) {
          return; // Show custom fallback
        } else {
          router.push('/unauthorized');
          return;
        }
      }
    }
  }, [isAuthenticated, isLoading, checkingAuth, user?.role, requiredRole, redirectTo, pathname, router, fallback]);

  // Show loading state while checking authentication
  if (isLoading || checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Checking authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show custom fallback if provided and user doesn't have access
  if (fallback && (!isAuthenticated || (requiredRole && !hasRequiredRole(user?.role, requiredRole)))) {
    return <>{fallback}</>;
  }

  // Show unauthorized page if user doesn't have required role
  if (requiredRole && !hasRequiredRole(user?.role, requiredRole)) {
    return <UnauthorizedPage />;
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return <LoginPrompt redirectTo={pathname} />;
  }

  return <>{children}</>;
};

// Component for unauthorized access
const UnauthorizedPage: React.FC = () => {
  const router = useRouter();
  
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Please contact your administrator if you believe this is an error.
          </p>
          <div className="flex space-x-2 justify-center">
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
            <Button onClick={() => router.push('/dashboard')}>
              Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Component for login prompt
const LoginPrompt: React.FC<{ redirectTo?: string }> = ({ redirectTo }) => {
  const router = useRouter();
  
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <LogIn className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl">Authentication Required</CardTitle>
          <CardDescription>
            Please log in to access this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            You need to be logged in to view this content.
          </p>
          <div className="flex space-x-2 justify-center">
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
            <Button onClick={() => router.push(`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`)}>
              <LogIn className="w-4 h-4 mr-2" />
              Log In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Hook for role-based access control
export const useAuth = () => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  
  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };
  
  const hasAnyRole = (roles: string[]): boolean => {
    return roles.includes(user?.role || '');
  };
  
  const checkMinimumRole = (minimumRole: string): boolean => {
    return hasMinimumRole(user?.role, minimumRole);
  };
  
  const canAccess = (requiredRoles: string[]): boolean => {
    return hasRequiredRole(user?.role, requiredRoles);
  };
  
  const isAdmin = (): boolean => {
    return user?.role === 'ADMIN';
  };
  
  const isManager = (): boolean => {
    return user?.role === 'MANAGER' || user?.role === 'ADMIN';
  };
  
  return {
    isAuthenticated,
    user,
    isLoading,
    hasRole,
    hasAnyRole,
    hasMinimumRole: (role: string) => hasMinimumRole(user?.role, role),
    canAccess,
    isAdmin,
    isManager,
  };
};

// Component for conditional rendering based on user role
interface RoleBasedComponentProps {
  children: React.ReactNode;
  requiredRole: string | string[];
  fallback?: React.ReactNode;
}

export const RoleBasedComponent: React.FC<RoleBasedComponentProps> = ({ 
  children, 
  requiredRole, 
  fallback = null 
}) => {
  const { canAccess } = useAuth();
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  
  if (!canAccess(roles)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// HOC for protecting components
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requiredRole?: string[];
    redirectTo?: string;
  }
) => {
  const AuthenticatedComponent = (props: P) => (
    <AuthGuard requiredRole={options?.requiredRole} redirectTo={options?.redirectTo}>
      <Component {...props} />
    </AuthGuard>
  );
  
  AuthenticatedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  
  return AuthenticatedComponent;
};

export default AuthGuard;