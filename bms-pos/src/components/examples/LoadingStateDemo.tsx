import React, { useState } from 'react'
import { useToast } from '../../hooks/useToast'
import { useApi, useMutation } from '../../hooks/useApi'
import { LoadingSpinner } from '../ui/loading-spinner'
import { LoadingOverlay } from '../ui/loading-overlay'
import { SkeletonCard, SkeletonText, SkeletonButton, SkeletonTable } from '../ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'

export const LoadingStateDemo: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo, showLoading } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [overlayLoading, setOverlayLoading] = useState(false)
  const [skeletonMode, setSkeletonMode] = useState<'text' | 'card' | 'button' | 'table'>('text')

  // Example using API hook
  const { data: products, error, isLoading: apiLoading } = useApi<any[]>('/api/products', {
    showErrorToast: true,
  })

  // Example using mutation hook
  const { mutate: saveProduct } = useMutation(
    async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      return { success: true, id: Math.random() }
    },
    {
      onSuccess: () => showSuccess('Product saved successfully!'),
      onError: () => showError('Failed to save product'),
      showSuccessToast: true,
      showErrorToast: true,
      successMessage: 'Product created successfully!',
    },
  )

  const handleSimulateAsync = async () => {
    setIsLoading(true)
    showLoading('Processing your request...', { duration: 2000 })
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      showSuccess('Operation completed successfully!')
    } catch (error) {
      showError('Operation failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleShowError = () => {
    showError('This is an error message with details about what went wrong.')
  }

  const handleShowWarning = () => {
    showWarning('Please check your input. Some fields may need attention.')
  }

  const handleShowInfo = () => {
    showInfo('New features are available. Check the updates section.')
  }

  const handleOverlayLoading = () => {
    setOverlayLoading(true)
    setTimeout(() => setOverlayLoading(false), 3000)
  }

  const handleSaveProduct = async () => {
    await saveProduct({ name: 'Sample Product', price: 100 })
  }

  const renderSkeleton = () => {
    switch (skeletonMode) {
      case 'card':
        return <SkeletonCard className="max-w-md" />
      case 'button':
        return <SkeletonButton className="max-w-md" />
      case 'table':
        return <SkeletonTable rows={3} columns={4} className="max-w-lg" />
      default:
        return <SkeletonText lines={4} className="max-w-md" />
    }
  }

  return (
    <div className="p-6 max-w-4xl space-y-8">
      <h1 className="text-3xl font-bold mb-6">Loading States & Toast Notifications Demo</h1>

      {/* Toast Notification Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Toast Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSimulateAsync} disabled={isLoading}>
              {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Simulate Async Operation
            </Button>
            <Button onClick={handleShowError} variant="destructive">
              Show Error Toast
            </Button>
            <Button onClick={handleShowWarning} variant="outline">
              Show Warning Toast
            </Button>
            <Button onClick={handleShowInfo} variant="secondary">
              Show Info Toast
            </Button>
            <Button onClick={() => showSuccess('This is a success message!')}>
              Show Success Toast
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading States Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Loading States</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Loading Spinners */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Loading Spinners</h3>
            <div className="flex items-center gap-4">
              <LoadingSpinner size="sm" />
              <LoadingSpinner size="md" />
              <LoadingSkeletonContent />
            </div>
          </div>

          {/* Loading Overlay */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Loading Overlay</h3>
            <LoadingOverlay isLoading={overlayLoading} message="Processing data...">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-600">Click button to show overlay</p>
                <Button
                  onClick={handleOverlayLoading}
                  className="mt-2"
                  disabled={overlayLoading}
                >
                  {overlayLoading ? 'Loading...' : 'Show Loading Overlay'}
                </Button>
              </div>
            </LoadingOverlay>
          </div>

          {/* Skeleton Loading */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Skeleton Loading</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={skeletonMode === 'text' ? 'default' : 'outline'}
                  onClick={() => setSkeletonMode('text')}
                >
                  Text
                </Button>
                <Button 
                  size="sm" 
                  variant={skeletonMode === 'card' ? 'default' : 'outline'}
                  onClick={() => setSkeletonMode('card')}
                >
                  Card
                </Button>
                <Button 
                  size="sm" 
                  variant={skeletonMode === 'button' ? 'default' : 'outline'}
                  onClick={() => setSkeletonMode('button')}
                >
                  Button
                </Button>
                <Button 
                  size="sm" 
                  variant={skeletonMode === 'table' ? 'default' : 'outline'}
                  onClick={() => setSkeletonMode('table')}
                >
                  Table
                </Button>
              </div>
              {renderSkeleton()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Integration Example */}
      <Card>
        <CardHeader>
          <CardTitle>API Integration Example</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button onClick={handleSaveProduct}>
              Save Product (with mutation)
            </Button>
            <Button onClick={() => window.location.reload()}>
              Refresh Data
            </Button>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Products (using API hook):</h4>
            {apiLoading ? (
              <SkeletonText lines={3} />
            ) : error ? (
              <p className="text-red-600">Error loading products</p>
            ) : products ? (
              <div className="space-y-2">
                {products.slice(0, 3).map((product: any, index: number) => (
                  <div key={index} className="p-2 border rounded text-sm">
                    {product.name || `Product ${index + 1}`}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No products found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper component for loading spinner with label
const LoadingSkeletonContent: React.FC = () => (
  <div className="flex items-center gap-2">
    <LoadingSpinner size="md" color="gray" />
    <span className="text-sm text-gray-600">Loading content...</span>
  </div>
)