import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-28 w-full rounded-2xl border border-border bg-input px-4 py-3 text-base text-foreground shadow-sm transition-[border-color,box-shadow,background-color] outline-none placeholder:text-muted-foreground/80 focus-visible:border-accent/50 focus-visible:ring-4 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 md:text-sm',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';

export { Textarea };