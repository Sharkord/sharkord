import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle } from 'lucide-react';
import { memo } from 'react';
import type { TCommandResponse } from './types';

type TResponseProps = {
  response: TCommandResponse;
};

const Response = memo(({ response }: TResponseProps) => {
  return (
    <div className="mt-6">
      <h3 className="font-medium text-sm mb-2">Response</h3>
      <div
        className={cn(
          'p-4 rounded-lg border',
          response.success
            ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
            : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
        )}
      >
        <div className="flex items-start gap-2">
          {response.success ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            {response.success ? (
              <div>
                <p className="font-medium text-sm text-green-900 dark:text-green-100 mb-2">
                  Command executed successfully
                </p>
                {response.data !== undefined && (
                  <pre className="text-xs bg-black/10 dark:bg-white/10 p-3 rounded overflow-x-auto">
                    {JSON.stringify(response.data, null, 2)}
                  </pre>
                )}
              </div>
            ) : (
              <div>
                <p className="font-medium text-sm text-red-900 dark:text-red-100 mb-1">
                  Command failed
                </p>
                <p className="text-sm text-red-800 dark:text-red-200">
                  {response.error}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export { Response };
