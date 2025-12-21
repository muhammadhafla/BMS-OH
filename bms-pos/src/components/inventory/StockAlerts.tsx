import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { LoadingSpinner } from '../ui/loading-spinner'
import { useToast } from '../../hooks/useToast'
import { inventoryService, LowStockAlert, StockMovementType } from '../../services/InventoryService'
import { authService } from '../../services/AuthService'
import { AlertTriangle, Package, RefreshCw, Bell, CheckCircle } from 'lucide-react'

interface StockAlertsProps {
  onRestock?: (productId: string, suggestedReorder: number) => void;
  onViewDetails?: (productId: string) => void;
  maxAlerts?: number;
  showActions?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

const StockAlerts: React.FC<StockAlertsProps> = ({
  onRestock,
  onViewDetails,
  maxAlerts = 10,
  showActions = true,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
}) => {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set())
  const { showSuccess, showError, showWarning, showInfo } = useToast()

  // Load low stock alerts
  const loadAlerts = async () => {
    try {
      const lowStockAlerts = await inventoryService.getLowStockItems()
      setAlerts(lowStockAlerts.slice(0, maxAlerts))
    } catch (error) {
      console.error('Error loading low stock alerts:', error)
      showError('Failed to load stock alerts')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Refresh alerts
  const refreshAlerts = async () => {
    setRefreshing(true)
    await loadAlerts()
    showInfo('Stock alerts refreshed')
  }

  // Handle restock action
  const handleRestock = async (alert: LowStockAlert) => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) {
      showError('User not authenticated')
      return
    }

    try {
      const result = await inventoryService.updateStock(
        alert.productId,
        alert.suggestedReorder,
        'restock',
        currentUser.id,
        'Automatic restock based on low stock alert',
        undefined,
        `Restocked ${alert.suggestedReorder} units to reach reorder level`,
      )

      if (result.success) {
        showSuccess(`Restocked ${alert.suggestedReorder} units for ${alert.productName}`)
        
        // Clear alert
        await inventoryService.clearLowStockAlert(alert.productId)
        
        // Remove from alerts list
        setAlerts(prev => prev.filter(a => a.productId !== alert.productId))
        
        // Call optional callback
        onRestock?.(alert.productId, alert.suggestedReorder)
      } else {
        showError(result.error || 'Failed to restock item')
      }
    } catch (error) {
      console.error('Error restocking item:', error)
      showError('Failed to restock item')
    }
  }

  // Handle bulk restock
  const handleBulkRestock = async () => {
    if (selectedAlerts.size === 0) {
      showWarning('No items selected for restock')
      return
    }

    const currentUser = authService.getCurrentUser()
    if (!currentUser) {
      showError('User not authenticated')
      return
    }

    try {
      const selectedAlertData = alerts.filter(alert => selectedAlerts.has(alert.productId))
      const updates = selectedAlertData.map(alert => ({
        productId: alert.productId,
        quantity: alert.suggestedReorder,
        type: 'restock' as StockMovementType,
        reason: 'Bulk restock from low stock alert',
        notes: `Bulk restock of ${alert.suggestedReorder} units`,
      }))

      const result = await inventoryService.batchUpdateStock(updates, currentUser.id)
      
      if (result.success) {
        const successCount = result.results.filter(r => r.success).length
        showSuccess(`Successfully restocked ${successCount} items`)
        
        // Clear all selected alerts
        for (const alert of selectedAlertData) {
          await inventoryService.clearLowStockAlert(alert.productId)
        }
        
        // Remove successful restocks from alerts
        setAlerts(prev => prev.filter(alert => !selectedAlerts.has(alert.productId)))
        setSelectedAlerts(new Set())
      } else {
        showError('Bulk restock failed')
      }
    } catch (error) {
      console.error('Error in bulk restock:', error)
      showError('Failed to perform bulk restock')
    }
  }

  // Handle alert selection
  const toggleAlertSelection = (productId: string) => {
    setSelectedAlerts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectedAlerts.size === alerts.length) {
      setSelectedAlerts(new Set())
    } else {
      setSelectedAlerts(new Set(alerts.map(alert => alert.productId)))
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Get priority icon
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />
      case 'medium':
        return <Package className="h-4 w-4" />
      case 'low':
        return <Bell className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  useEffect(() => {
    loadAlerts()

    if (autoRefresh) {
      const interval = setInterval(loadAlerts, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [maxAlerts, autoRefresh, refreshInterval])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <LoadingSpinner />
          <span className="ml-2">Loading stock alerts...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Stock Alerts</h2>
          <p className="text-sm text-muted-foreground">
            {alerts.length} item{alerts.length !== 1 ? 's' : ''} need attention
          </p>
        </div>
        
        {showActions && (
          <div className="flex items-center space-x-2">
            {alerts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs"
              >
                {selectedAlerts.size === alerts.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAlerts}
              disabled={refreshing}
              className="flex items-center space-x-1"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        )}
      </div>

      {/* Bulk actions */}
      {showActions && selectedAlerts.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                {selectedAlerts.size} item{selectedAlerts.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                size="sm"
                onClick={handleBulkRestock}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Package className="h-4 w-4 mr-1" />
                Restock Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts list */}
      {alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium text-green-700">All Stock Levels Good</h3>
            <p className="text-sm text-muted-foreground mt-2">
              No items are currently below their reorder levels.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card
              key={alert.productId}
              className={`transition-all hover:shadow-md ${
                selectedAlerts.has(alert.productId) ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {showActions && (
                      <input
                        type="checkbox"
                        checked={selectedAlerts.has(alert.productId)}
                        onChange={() => toggleAlertSelection(alert.productId)}
                        className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    )}
                    
                    <div className={`p-2 rounded-lg ${getPriorityColor(alert.priority)}`}>
                      {getPriorityIcon(alert.priority)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium truncate">{alert.productName}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(alert.priority)}`}>
                          {alert.priority.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Current Stock:</span>
                          <div className="font-medium text-red-600">{alert.currentStock} units</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Reorder Level:</span>
                          <div className="font-medium">{alert.reorderLevel} units</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Shortage:</span>
                          <div className="font-medium text-orange-600">{alert.shortage} units</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Suggested Order:</span>
                          <div className="font-medium text-blue-600">{alert.suggestedReorder} units</div>
                        </div>
                      </div>

                      {alert.lastAlerted && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Last alerted: {formatRelativeTime(alert.lastAlerted)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {showActions && (
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewDetails?.(alert.productId)}
                        className="text-xs"
                      >
                        Details
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRestock(alert)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Restock
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary footer */}
      {alerts.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>{alerts.filter(a => a.priority === 'critical').length} Critical</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>{alerts.filter(a => a.priority === 'high').length} High</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>{alerts.filter(a => a.priority === 'medium').length} Medium</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>{alerts.filter(a => a.priority === 'low').length} Low</span>
                </div>
              </div>
              <div className="text-muted-foreground">
                Total items needing restock: {alerts.length}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default StockAlerts