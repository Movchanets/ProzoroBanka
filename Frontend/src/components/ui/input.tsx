import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-12 w-full rounded-2xl border border-border bg-input px-4 py-3 text-base text-foreground shadow-sm transition-[border-color,box-shadow,transform,background-color] outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/80 focus-visible:border-accent/50 focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 md:text-sm',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };