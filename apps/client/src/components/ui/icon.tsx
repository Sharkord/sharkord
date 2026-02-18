import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const iconVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      size: {
        xs: 'h-3 w-3',
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8'
      }
    },
    defaultVariants: {
      size: 'md'
    }
  }
);

export interface IconProps
  extends
    React.ButtonHTMLAttributes<HTMLDivElement>,
    VariantProps<typeof iconVariants> {
  icon: React.ElementType;
}

const Icon = React.forwardRef<HTMLButtonElement, IconProps>(
  ({ size, icon, ...props }, ref) => {
    const element = React.createElement(icon, {
      className: cn(iconVariants({ size }), props.className),
      ref
    });

    return element;
  }
);
Icon.displayName = 'Icon';

export { Icon };
