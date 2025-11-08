/**
 * Frosted UI Button Component
 * Built with class-variance-authority for consistent styling
 * Mobile-optimized with proper touch targets (Whop feedback fix)
 */

'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles - mobile-optimized touch targets
  cn(
    'inline-flex items-center justify-center',
    'rounded-xl font-medium',
    'transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
    'disabled:pointer-events-none disabled:opacity-50',
    // Ensure text is always readable (Whop feedback fix)
    'whitespace-nowrap'
  ),
  {
    variants: {
      variant: {
        // Primary - Frosted purple (Whop brand)
        primary: cn(
          'backdrop-blur-md bg-purple-600/90 hover:bg-purple-600',
          'border border-purple-500/30 hover:border-purple-400/40',
          'text-white shadow-frosted-md hover:shadow-frosted-lg',
          'active:scale-[0.98]'
        ),
        // Secondary - Frosted glass
        secondary: cn(
          'backdrop-blur-md bg-white/10 hover:bg-white/15',
          'border border-white/15 hover:border-white/25',
          'text-white shadow-frosted-sm hover:shadow-frosted-md',
          'active:scale-[0.98]'
        ),
        // Ghost - Minimal
        ghost: cn(
          'backdrop-blur-sm hover:bg-white/8',
          'text-white/80 hover:text-white',
          'border border-transparent hover:border-white/10'
        ),
        // Danger - Frosted red
        danger: cn(
          'backdrop-blur-md bg-red-600/90 hover:bg-red-600',
          'border border-red-500/30 hover:border-red-400/40',
          'text-white shadow-frosted-md hover:shadow-frosted-lg',
          'active:scale-[0.98]'
        ),
        // Success - Frosted green
        success: cn(
          'backdrop-blur-md bg-green-600/90 hover:bg-green-600',
          'border border-green-500/30 hover:border-green-400/40',
          'text-white shadow-frosted-md hover:shadow-frosted-lg',
          'active:scale-[0.98]'
        ),
        // Outline - Glass with strong border
        outline: cn(
          'backdrop-blur-md bg-transparent hover:bg-white/5',
          'border-2 border-white/30 hover:border-white/50',
          'text-white'
        ),
        // Link - Text only
        link: 'text-white/90 underline-offset-4 hover:underline',
      },
      size: {
        // Mobile-optimized sizes (Whop feedback fix - proper touch targets)
        sm: 'h-9 px-3 text-sm min-w-[80px]', // min-width prevents clipping
        md: 'h-11 px-4 text-base min-w-[100px]',
        lg: 'h-12 px-6 text-lg min-w-[120px]',
        xl: 'h-14 px-8 text-xl min-w-[140px]',
        icon: 'h-10 w-10', // Square icon button
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export interface FrostedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const FrostedButton = React.forwardRef<HTMLButtonElement, FrostedButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </Comp>
    );
  }
);
FrostedButton.displayName = 'FrostedButton';

/**
 * Button Group - for grouped actions
 */
export interface FrostedButtonGroupProps
  extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

const FrostedButtonGroup = React.forwardRef<
  HTMLDivElement,
  FrostedButtonGroupProps
>(({ className, orientation = 'horizontal', children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'flex gap-2',
        // Stack vertically on mobile, horizontal on desktop (Whop feedback fix)
        orientation === 'horizontal'
          ? 'flex-col sm:flex-row'
          : 'flex-col',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
FrostedButtonGroup.displayName = 'FrostedButtonGroup';

export { FrostedButton, FrostedButtonGroup, buttonVariants };
