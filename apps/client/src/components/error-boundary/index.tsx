import { logDebug } from '@/helpers/browser-logger';
import { Component, type ErrorInfo, type ReactNode } from 'react';

type TErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
};

type TState = {
  hasError: boolean;
  error: Error | null;
};

class ErrorBoundary extends Component<TErrorBoundaryProps, TState> {
  state: TState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): TState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logDebug('ErrorBoundary caught an error:', { error, errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  private reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      if (typeof fallback === 'function') {
        return fallback(error, this.reset);
      }

      return fallback ?? null;
    }

    return children;
  }
}

export { ErrorBoundary };
