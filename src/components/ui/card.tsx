import * as React from 'react';
import { cn } from '@/lib/utils';

const CardComponent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl border border-border bg-background-card text-white shadow-sm',
      className
    )}
    {...props}
  />
));
CardComponent.displayName = 'Card';

const CardHeaderComponent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));
CardHeaderComponent.displayName = 'CardHeader';

const CardTitleComponent = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('font-heading text-xl font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
CardTitleComponent.displayName = 'CardTitle';

const CardDescriptionComponent = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-gray-400', className)}
    {...props}
  />
));
CardDescriptionComponent.displayName = 'CardDescription';

const CardContentComponent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContentComponent.displayName = 'CardContent';

const CardFooterComponent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
CardFooterComponent.displayName = 'CardFooter';

// Memoize all card components to prevent unnecessary re-renders
const Card = React.memo(CardComponent);
const CardHeader = React.memo(CardHeaderComponent);
const CardTitle = React.memo(CardTitleComponent);
const CardDescription = React.memo(CardDescriptionComponent);
const CardContent = React.memo(CardContentComponent);
const CardFooter = React.memo(CardFooterComponent);

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
