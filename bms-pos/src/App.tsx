import React, { useState, useEffect } from 'react';
import { authService, User } from './services/AuthService';
import LoginForm from './components/auth/LoginForm';
import POSLayout from './components/POSLayout';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { ToastProvider } from './components/providers/toast-provider';
import { LoadingSpinner } from './components/ui/loading-spinner';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Check for existing session on app load
    const initializeAuth = async () => {
      try {
        // Validate existing session
        const currentUser = authService.getCurrentUser();
        
        if (currentUser) {
          setUser(currentUser);
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing authentication:', error);
        setAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    setAuthenticated(true);
  };

  const handleLogout = () => {
    // Clear authentication state
    setUser(null);
    setAuthenticated(false);
    
    // Clear session from auth service
    authService.logout();
  };

  // Show loading screen while checking session
  if (loading) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Conditionally render LoginForm or POSLayout based on authentication state
  return (
    <ToastProvider>
      <ErrorBoundary>
        <div className="h-screen w-screen bg-background">
          {authenticated && user ? (
            <POSLayoutWithAuth user={user} onLogout={handleLogout} />
          ) : (
            <LoginForm onLogin={handleLogin} />
          )}
        </div>
      </ErrorBoundary>
    </ToastProvider>
  );
}

// Enhanced POSLayout component with authentication info and logout functionality
interface POSLayoutWithAuthProps {
  user: User;
  onLogout: () => void;
}

const POSLayoutWithAuth: React.FC<POSLayoutWithAuthProps> = ({ user, onLogout }) => {
  // Pass user info to POSLayout and handle logout through POSLayout
  return (
    <div className="h-full">
      <POSLayout user={user} onLogout={onLogout} />
    </div>
  );
};

export default App;