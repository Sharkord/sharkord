import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const iconButtonVariants = cva(
  'inline-flex items-center justify-center transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 outline-none shrink-0',
  {
    variants: {
      variant: {
        default: 'text-foreground hover:text-primary',
        destructive: 'text-foreground hover:text-destructive',
        primary: 'text-primary hover:text-primary/80',
        secondary: 'text-muted-foreground hover:text-foreground',
        ghost: 'text-muted-foreground hover:text-foreground'
      },
      size: {
        default: '[&_svg]:size-5',
        sm: '[&_svg]:size-4',
        lg: '[&_svg]:size-6',
        xl: '[&_svg]:size-7'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

type IconButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof iconButtonVariants> & {
    icon: LucideIcon;
  };

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, icon: Icon, ...props }, ref) => {
    return (
      <button
        ref={ref}
        data-slot="icon-button"
        className={cn(iconButtonVariants({ variant, size, className }))}
        {...props}
      >
        <Icon />
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export { IconButton, iconButtonVariants };
