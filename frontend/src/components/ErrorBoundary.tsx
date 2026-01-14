import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.href = '/';
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-100 rounded-full p-4 mb-4">
                <AlertTriangle className="h-12 w-12 text-red-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Oops! Something went wrong
              </h1>
              
              <p className="text-gray-600 mb-6">
                We're sorry, but something unexpected happened. Don't worry, your data is safe.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm font-mono text-red-800 mb-2">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="text-xs text-red-700">
                      <summary className="cursor-pointer">Stack Trace</summary>
                      <pre className="mt-2 overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={this.handleRefresh}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Refresh Page
                </button>
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  <Home className="h-5 w-5 mr-2" />
                  Go Home
                </button>
              </div>

              <p className="text-sm text-gray-500 mt-6">
                If this problem persists, please contact us at{' '}
                <a
                  href="mailto:support@traphousekitchen.com"
                  className="text-primary-600 hover:text-primary-700"
                >
                  support@traphousekitchen.com
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
