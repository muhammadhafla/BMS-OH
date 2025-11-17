import React from "react"
import { cn } from "../../lib/utils"

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
  color?: "primary" | "secondary" | "white" | "gray"
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
}

const colorClasses = {
  primary: "text-blue-600",
  secondary: "text-purple-600",
  white: "text-white",
  gray: "text-gray-600",
}

export const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size = "md", color = "primary", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "animate-spin rounded-full border-2 border-current border-t-transparent",
          sizeClasses[size],
          colorClasses[color],
          className
        )}
        aria-label="Loading"
        role="status"
        {...props}
      >
        <span className="sr-only">Loading...</span>
      </div>
    )
  }
)

LoadingSpinner.displayName = "LoadingSpinner"