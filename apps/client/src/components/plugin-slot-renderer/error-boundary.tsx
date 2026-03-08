import { logDebug } from '@/helpers/browser-logger';
import {
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@sharkord/ui';
import { Bug } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { toast } from 'sonner';

type TErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  pluginId: string;
  slotId: string;
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

  copyErrorDetails = () => {
    const { error } = this.state;

    if (!error) return;

    const errorDetails = `Error: ${error.message}\nStack: ${error.stack}`;

    navigator.clipboard.writeText(errorDetails);

    toast.success('Error details copied to clipboard');
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      if (typeof fallback === 'function') {
        return fallback(error, this.reset);
      }

      if (fallback) {
        return fallback;
      }

      return (
        <Popover>
          <PopoverTrigger asChild>
            <IconButton
              icon={Bug}
              className="text-red-500 border-red-500"
              size="xs"
              title="An error occurred. Click to copy details."
            />
          </PopoverTrigger>
          <PopoverContent className="w-96">
            <div>
              <span className="text-xs text-red-500 mb-2 block">
                An error occurred in plugin{' '}
                <span className="font-bold">{this.props.pluginId}</span> at slot{' '}
                <span className="font-bold">{this.props.slotId}</span>.
              </span>

              <span className="text-xs text-red-500 mb-2 block">
                Please report this to the plugin developer.
              </span>

              <details>
                <summary className="text-[10px] text-red-500">
                  Error Details
                </summary>

                <div>
                  <span
                    className="text-red-500 underline text-xs cursor-pointer"
                    onClick={this.copyErrorDetails}
                  >
                    Copy details
                  </span>

                  <pre className="text-xs text-red-500 overflow-auto max-h-48">
                    {error.message}
                    <br />
                    {error.stack}
                  </pre>
                </div>
              </details>
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    return children;
  }
}

export { ErrorBoundary };
