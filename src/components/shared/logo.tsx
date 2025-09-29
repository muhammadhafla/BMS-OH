import { cn } from '@/lib/utils';
import type { FC } from 'react';

export const Logo: FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground',
        className
      )}
    >
      <span className="text-xl font-bold">B</span>
    </div>
  );
};
