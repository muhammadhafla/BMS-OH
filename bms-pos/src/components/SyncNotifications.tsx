import React, { useState, useEffect } from 'react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import {
  CheckCircle,
  Info,
  X,
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  Clock,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { SyncStatus } from '../services/SyncService'

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'sync' | 'connection';
  title: string;
  message: string;
  timestamp: Date;
  autoClose?: boolean;
  duration?: number;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'destructive';
  }>;
}

interface SyncNotificationsProps {
  syncStatus: SyncStatus;
  onSync?: () => void;
  onDismiss?: (notificationId: string) => void;
  onClearAll?: () => void;
}

const SyncNotifications: React.FC<SyncNotificationsProps> = ({ 
  syncStatus, 
  onSync, 
  onDismiss,
  onClearAll, 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  // Auto-generate notifications based on sync status changes
  useEffect(() => {
    const now = new Date()
    
    // Connection status notifications
    if (syncStatus.isOnline) {
      addNotification({
        type: 'connection',
        title: 'Connection Restored',
        message: 'Internet connection is now available',
        autoClose: true,
        duration: 3000,
      })
    }

    // Sync progress notifications
    if (syncStatus.isSyncing) {
      addNotification({
        type: 'sync',
        title: 'Synchronization Started',
        message: 'Syncing data with server...',
        autoClose: false,
      })
    }

    // Sync completion notifications (would be triggered externally)
    // This would typically come from a sync completion callback

    // Error notifications
    if (syncStatus.syncErrors.length > 0) {
      addNotification({
        type: 'error',
        title: 'Sync Errors Detected',
        message: `${syncStatus.syncErrors.length} error(s) occurred during synchronization`,
        autoClose: false,
        actions: [
          {
            label: 'View Details',
            onClick: () => setIsExpanded(true),
            variant: 'outline',
          },
          {
            label: 'Retry',
            onClick: () => onSync?.(),
            variant: 'default',
          },
        ],
      })
    }

    // Pending transactions notification
    if (syncStatus.pendingTransactions > 0 && syncStatus.isOnline && !syncStatus.isSyncing) {
      addNotification({
        type: 'warning',
        title: 'Pending Synchronization',
        message: `${syncStatus.pendingTransactions} transaction(s) waiting to sync`,
        autoClose: true,
        duration: 5000,
        actions: [
          {
            label: 'Sync Now',
            onClick: () => onSync?.(),
            variant: 'default',
          },
        ],
      })
    }

    // Recent sync notification
    if (syncStatus.lastSync && syncStatus.isOnline && !syncStatus.isSyncing) {
      const timeSinceSync = now.getTime() - syncStatus.lastSync.getTime()
      const minutesSinceSync = Math.floor(timeSinceSync / 60000)
      
      if (minutesSinceSync < 5) {
        addNotification({
          type: 'success',
          title: 'Sync Completed',
          message: 'Data synchronized successfully',
          autoClose: true,
          duration: 3000,
        })
      }
    }

  }, [syncStatus, onSync])

  const addNotification = (notificationData: Omit<Notification, 'id' | 'timestamp'>) => {
    const notification: Notification = {
      ...notificationData,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    }

    setNotifications(prev => [notification, ...prev.slice(0, 4)]) // Keep max 5 notifications

    // Auto-close if specified
    if (notification.autoClose && notification.duration) {
      setTimeout(() => {
        dismissNotification(notification.id)
      }, notification.duration)
    }
  }

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    onDismiss?.(id)
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
      case 'sync':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
      case 'connection':
        return syncStatus.isOnline 
          ? <Wifi className="h-5 w-5 text-green-500" />
          : <WifiOff className="h-5 w-5 text-red-500" />
      default:
        return <Info className="h-5 w-5 text-gray-500" />
    }
  }

  const getNotificationBorderColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500'
      case 'error':
        return 'border-l-red-500'
      case 'warning':
        return 'border-l-orange-500'
      case 'info':
        return 'border-l-blue-500'
      case 'sync':
        return 'border-l-blue-500'
      case 'connection':
        return syncStatus.isOnline ? 'border-l-green-500' : 'border-l-red-500'
      default:
        return 'border-l-gray-500'
    }
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-96 space-y-2">
      {/* Notification Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Sync Notifications</h3>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-white">
            {notifications.length}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNotifications([])
                onClearAll?.()
              }}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            className={`border-l-4 ${getNotificationBorderColor(notification.type)} shadow-lg`}
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getNotificationIcon(notification.type)}
                  <h4 className="text-sm font-semibold text-gray-900">
                    {notification.title}
                  </h4>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissNotification(notification.id)}
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {/* Message */}
              <p className="text-sm text-gray-600 mb-3">
                {notification.message}
              </p>

              {/* Timestamp */}
              <div className="flex items-center space-x-1 mb-3">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {notification.timestamp.toLocaleTimeString('id-ID')}
                </span>
              </div>

              {/* Actions */}
              {notification.actions && notification.actions.length > 0 && (
                <div className="flex space-x-2">
                  {notification.actions.map((action, index) => (
                    <Button
                      key={index}
                      variant={action.variant || 'default'}
                      size="sm"
                      onClick={action.onClick}
                      className="text-xs"
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Sync Status Summary (when expanded) */}
      {isExpanded && (
        <Card className="border border-gray-200">
          <div className="p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <Database className="h-4 w-4 mr-2" />
              Current Sync Status
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Connection:</span>
                <div className="flex items-center space-x-1">
                  {syncStatus.isOnline ? (
                    <>
                      <Wifi className="h-3 w-3 text-green-500" />
                      <span className="text-green-600">Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 text-red-500" />
                      <span className="text-red-600">Offline</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending:</span>
                <span className={syncStatus.pendingTransactions > 0 ? 'text-orange-600' : 'text-green-600'}>
                  {syncStatus.pendingTransactions} transaction(s)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Sync:</span>
                <span className="text-gray-900">
                  {syncStatus.lastSync 
                    ? syncStatus.lastSync.toLocaleTimeString('id-ID')
                    : 'Never'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Errors:</span>
                <span className={syncStatus.syncErrors.length > 0 ? 'text-red-600' : 'text-green-600'}>
                  {syncStatus.syncErrors.length > 0 ? `${syncStatus.syncErrors.length} error(s)` : 'None'}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default SyncNotifications