import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { authService, LoginCredentials, User } from '../../services/AuthService';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof LoginCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await authService.login(credentials);
      
      if (result.success && result.user && result.token) {
        // Save session
        authService.saveSession(result.user, result.token);
        
        // Notify parent component
        onLogin(result.user);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (username: string, password: string) => {
    setCredentials({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">BMS POS</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Field */}
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-gray-700">
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  value={credentials.username}
                  onChange={handleInputChange('username')}
                  placeholder="Enter your username"
                  disabled={loading}
                  autoComplete="username"
                  autoFocus
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={handleInputChange('password')}
                  placeholder="Enter your password"
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !credentials.username.trim() || !credentials.password.trim()}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Login Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Demo Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-gray-600 mb-3">Click to fill demo credentials:</p>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start text-left"
              onClick={() => handleQuickLogin('admin', 'admin123')}
              disabled={loading}
            >
              <div>
                <div className="font-medium">Admin</div>
                <div className="text-xs text-gray-500">admin / admin123</div>
              </div>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start text-left"
              onClick={() => handleQuickLogin('manager1', 'manager123')}
              disabled={loading}
            >
              <div>
                <div className="font-medium">Manager</div>
                <div className="text-xs text-gray-500">manager1 / manager123</div>
              </div>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start text-left"
              onClick={() => handleQuickLogin('cashier1', 'cashier123')}
              disabled={loading}
            >
              <div>
                <div className="font-medium">Cashier</div>
                <div className="text-xs text-gray-500">cashier1 / cashier123</div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginForm;