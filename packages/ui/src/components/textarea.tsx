import type { TTrpcErrors } from '@sharkord/shared';
import { cn } from '../lib/utils';
import * as React from 'react';

type TextareaProps = React.ComponentProps<'textarea'> & {
  error?: string;
  resetError?: React.Dispatch<React.SetStateAction<TTrpcErrors>>;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, resetError, onChange, name, ...props }, ref) => {
    const onChangeHandler = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (resetError && name && error && error !== '') {
          resetError((prev) => {
            return {
              ...prev,
              [name]: ''
            };
          });
        }

        onChange?.(e);
      },
      [resetError, onChange, error, name]
    );

    return (
      <div className="flex-1 flex-col gap-1">
        <textarea
          ref={ref}
          data-slot="textarea"
          aria-invalid={!!error}
          className={cn(
            'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            className
          )}
          onChange={onChangeHandler}
          {...props}
        />
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
