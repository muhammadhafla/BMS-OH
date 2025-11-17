'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, RefreshCw } from 'lucide-react';

// Table loading skeleton
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="space-y-3">
    {/* Table header skeleton */}
    <div className="flex space-x-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-[100px]" />
      ))}
    </div>
    
    {/* Table rows skeleton */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex space-x-4">
        {Array.from({ length: columns }).map((_, j) => (
          <Skeleton key={j} className="h-4 w-[100px]" />
        ))}
      </div>
    ))}
  </div>
);

// Card grid loading skeleton
export const CardGridSkeleton: React.FC<{ cards?: number }> = ({ cards = 4 }) => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: cards }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="mt-2 h-8 w-16" />
          <Skeleton className="mt-1 h-3 w-32" />
        </CardContent>
      </Card>
    ))}
  </div>
);

// List loading skeleton
export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="space-y-4">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
      </div>
    ))}
  </div>
);

// Generic loading spinner
export const LoadingSpinner: React.FC<{ message?: string; className?: string }> = ({ 
  message = "Loading...", 
  className 
}) => (
  <div className={`flex items-center justify-center p-8 ${className}`}>
    <div className="flex flex-col items-center space-y-2">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  </div>
);

// Page loading state
export const PageLoading: React.FC<{ message?: string }> = ({ 
  message = "Loading page..." 
}) => (
  <div className="flex-1 flex items-center justify-center min-h-[400px]">
    <Card className="w-full max-w-md">
      <CardContent className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <h3 className="text-lg font-semibold mb-2">Loading</h3>
        <p className="text-sm text-muted-foreground text-center">{message}</p>
      </CardContent>
    </Card>
  </div>
);

// Content loading state for cards
export const ContentLoading: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}>
    <CardGridSkeleton />
    <div className="mt-6">
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-10 w-24" />
            </div>
            <TableSkeleton rows={6} columns={5} />
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

// Button loading state
export const ButtonLoading: React.FC<{ children: React.ReactNode; isLoading?: boolean }> = ({ 
  children, 
  isLoading = false 
}) => (
  <Button disabled={isLoading}>
    {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
    {children}
  </Button>
);

// Refresh button with loading state
export const RefreshButton: React.FC<{ 
  onRefresh: () => void; 
  isLoading?: boolean; 
  className?: string 
}> = ({ onRefresh, isLoading = false, className }) => (
  <Button 
    variant="outline" 
    onClick={onRefresh} 
    disabled={isLoading}
    className={className}
  >
    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
    {isLoading ? 'Refreshing...' : 'Refresh'}
  </Button>
);

// Loading overlay for modals and dialogs
export const LoadingOverlay: React.FC<{ message?: string }> = ({ 
  message = "Processing..." 
}) => (
  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <Card>
      <CardContent className="flex flex-col items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-sm font-medium">{message}</p>
      </CardContent>
    </Card>
  </div>
);

// Skeleton components for specific content types
export const ProductCardSkeleton: React.FC = () => (
  <Card>
    <CardContent className="p-4">
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-12 w-12 rounded" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-4 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div>
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-96" />
    </div>
    <CardGridSkeleton />
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
      <Card className="col-span-4">
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <TableSkeleton rows={4} columns={3} />
          </div>
        </CardContent>
      </Card>
      <Card className="col-span-3">
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <ListSkeleton items={4} />
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default {
  TableSkeleton,
  CardGridSkeleton,
  ListSkeleton,
  LoadingSpinner,
  PageLoading,
  ContentLoading,
  ButtonLoading,
  RefreshButton,
  LoadingOverlay,
  ProductCardSkeleton,
  DashboardSkeleton,
};