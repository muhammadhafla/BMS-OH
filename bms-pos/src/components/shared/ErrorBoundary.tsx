import { Component, ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ErrorInfo {
  componentStack: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    
    // Log error to console in development mode
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Set error info in state
    this.setState({
      errorInfo,
    });

    // In production, you would send error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error monitoring service
      // errorReportingService.reportError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails = false } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      const isDevelopment = process.env.NODE_ENV === 'development';
      const shouldShowDetails = showDetails || isDevelopment;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                Something went wrong
              </CardTitle>
              <CardDescription>
                {isDevelopment
                  ? 'An unexpected error occurred in the application.'
                  : 'We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {shouldShowDetails && error && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Error Details:</h4>
                  <div className="p-3 bg-muted rounded-md text-sm font-mono">
                    <div className="text-destructive font-medium mb-1">
                      {error.name}: {error.message}
                    </div>
                    {error.stack && (
                      <pre className="text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                        {error.stack}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              {shouldShowDetails && errorInfo?.componentStack && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Component Stack:</h4>
                  <div className="p-3 bg-muted rounded-md text-sm font-mono">
                    <pre className="text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex gap-2">
              <Button
                onClick={this.handleRetry}
                variant="outline"
                className="flex-1"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Try Again
              </Button>
              
              <Button
                onClick={this.handleRefresh}
                variant="default"
                className="flex-1"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh App
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;