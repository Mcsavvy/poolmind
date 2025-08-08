'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface FullPageLoaderProps {
  text?: string;
  className?: string;
  icon?: ReactNode;
}

export function FullPageLoader({ text, className, icon }: FullPageLoaderProps) {
  return (
    <div
      className={cn(
        'min-h-screen w-full flex items-center justify-center bg-background',
        className,
      )}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <div className="wavy-loader" />
          <div className="absolute inset-0 flex items-center justify-end pr-2">
            {/* {icon ?? (
              <div
                className={cn(
                  'h-4 w-4 rounded-full',
                  'bg-[radial-gradient(circle_at_30%_30%,#ffd54f_0%,#ffb300_40%,#ef6c00_70%)]',
                  'shadow-[0_0_12px_rgba(255,193,7,0.45)]',
                )}
              />
            )} */}
          </div>
        </div>
        {text ? (
          <p className="text-sm text-muted-foreground tracking-tight">
            {text}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default FullPageLoader;


