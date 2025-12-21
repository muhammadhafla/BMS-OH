import React from 'react'
import { cn } from '../../lib/utils'
import { LoadingSpinner } from './loading-spinner'

export interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading: boolean
  message?: string
  showSpinner?: boolean
  backdrop?: boolean
  blur?: boolean
  centerContent?: boolean
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Loading...',
  showSpinner = true,
  backdrop = true,
  blur = true,
  centerContent = true,
  className,
  children,
  ...props
}) => {
  if (!isLoading) {
    return <>{children}</>
  }

  return (
    <div className={cn('relative', className)} {...props}>
      {children}
      <div
        className={cn(
          'absolute inset-0 z-50 flex items-center justify-center',
          backdrop && 'bg-black/20',
          blur && 'backdrop-blur-sm',
          centerContent && 'items-center',
        )}
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-2 rounded-lg bg-white p-6 shadow-lg">
          {showSpinner && <LoadingSpinner size="lg" />}
          <p className="text-sm text-gray-600">{message}</p>
        </div>
      </div>
    </div>
  )
}