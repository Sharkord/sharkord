import { cn } from '../lib/utils';
import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import { memo } from 'react';

const spinnerVariants = cva('animate-spin', {
  variants: {
    size: {
      xxs: 'h-4 w-4',
      xs: 'h-6 w-6',
      sm: 'h-8 w-8',
      md: 'h-12 w-12',
      lg: 'h-16 w-16'
    }
  },
  defaultVariants: {
    size: 'md'
  }
});

type TSpinnerProps = React.SVGProps<SVGSVGElement> &
  VariantProps<typeof spinnerVariants>;

const Spinner = memo(({ size = 'md', className, ...props }: TSpinnerProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      viewBox="0 0 48 48"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(spinnerVariants({ size }), className)}
      style={{ shapeRendering: 'auto', imageRendering: 'auto' }} // Using CSS properties for rendering
    >
      <path d="M42 24a18 18 0 1 1-12.438-17.12" />
    </svg>
  );
});

export default Spinner;
