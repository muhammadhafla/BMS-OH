'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import Link from 'next/link';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

// Global error boundary for the application
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // Log error to monitoring service (e.g., Sentry, LogRocket, etc.)
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // In a real application, you would send this to your error monitoring service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
    };
    
    console.log('Error report:', errorReport);
    
    // Example: Send to Sentry
    // Sentry.captureException(error, {
    //   extra: errorReport,
    // });
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined as Error | undefined,
      errorInfo: undefined as ErrorInfo | undefined
    });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return <DefaultErrorBoundary error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

// Default error boundary component
interface DefaultErrorBoundaryProps {
  error?: Error;
  onReset: () => void;
}

const DefaultErrorBoundary: React.FC<DefaultErrorBoundaryProps> = ({ error, onReset }) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Something went wrong</CardTitle>
          <CardDescription>
            We apologize for the inconvenience. An unexpected error has occurred.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Details */}
          {isDevelopment && error && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Bug className="w-4 h-4" />
                <span className="font-mono text-sm">Error Details (Development Only)</span>
              </div>
              <div className="space-y-2">
                <div>
                  <strong>Message:</strong>
                  <pre className="mt-1 text-sm text-muted-foreground overflow-x-auto">
                    {error.message}
                  </pre>
                </div>
                {error.stack && (
                  <div>
                    <strong>Stack Trace:</strong>
                    <pre className="mt-1 text-xs text-muted-foreground overflow-x-auto max-h-40">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onReset} className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/" className="flex items-center space-x-2">
                <Home className="w-4 h-4" />
                <span>Go to Dashboard</span>
              </Link>
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              If this problem persists, please contact our support team or try refreshing the page.
            </p>
            <p className="mt-2">
              <Button variant="link" className="p-0 h-auto">
                Contact Support
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Specialized error boundaries for different contexts

// Page error boundary
export const PageErrorBoundary: React.FC<Props> = ({ children, onError }) => {
  return (
    <ErrorBoundary
      onError={onError || undefined}
      fallback={
        <div className="flex-1 p-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Page Error</h2>
              <p className="text-muted-foreground mb-4">
                This page encountered an error and couldn't be loaded.
              </p>
              <div className="flex space-x-2">
                <Button onClick={() => window.location.reload()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">
                    <Home className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

// Component error boundary
export const ComponentErrorBoundary: React.FC<Props> = ({ children, onError }) => {
  return (
    <ErrorBoundary
      onError={onError || undefined}
      fallback={
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Component failed to load</span>
            </div>
          </CardContent>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

// Async operation error boundary
export const AsyncErrorBoundary: React.FC<Props> = ({ children, onError }) => {
  return (
    <ErrorBoundary
      onError={onError || undefined}
      fallback={
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Operation Failed</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The requested operation could not be completed.
            </p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

// Error boundary for forms
export const FormErrorBoundary: React.FC<Props> = ({ children, onError }) => {
  return (
    <ErrorBoundary
      onError={onError || undefined}
      fallback={
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Form Error</span>
          </div>
          <p className="text-sm text-red-700 mt-1">
            There was an error processing the form. Please try again.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;