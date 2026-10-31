import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logger } from '../utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ErrorBoundary caught an error', error, { errorInfo });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send this to an error tracking service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-screen w-full bg-white items-center justify-center flex-col gap-4 p-4">
          <div className="bg-red-50 p-4 rounded-full text-red-500 mb-2">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Что-то пошло не так</h2>
          <p className="text-gray-600 text-sm text-center max-w-md">
            Произошла непредвиденная ошибка. Пожалуйста, попробуйте обновить страницу.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <details className="mt-4 p-4 bg-gray-50 rounded-lg max-w-2xl w-full text-left">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                Детали ошибки (только в режиме разработки)
              </summary>
              <pre className="text-xs text-gray-600 overflow-auto">
                {this.state.error.toString()}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleReset}
            className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Попробовать снова
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
