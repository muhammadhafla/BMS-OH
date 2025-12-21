import React, { useState, useEffect } from 'react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import {
  X,
  Database,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Upload,
  Trash2,
  BarChart3,
  History,
  FileText,
  AlertCircle,
  Settings,
} from 'lucide-react'
import { SyncStatus, syncService } from '../services/SyncService'

interface SyncHistoryEntry {
  id: string;
  timestamp: Date;
  type: 'auto' | 'manual';
  status: 'success' | 'error' | 'partial' | 'in_progress';
  productsSynced?: number;
  transactionsSynced?: number;
  errors?: string[];
  duration?: number;
}

interface PendingTransaction {
  id: string;
  transactionCode: string;
  timestamp: Date;
  amount: number;
  items: number;
  status: 'pending' | 'failed' | 'retry';
  error?: string;
  retryCount: number;
  lastAttempt?: Date;
}

interface SyncStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: SyncStatus;
  onSync?: () => void;
}

const SyncStatusModal: React.FC<SyncStatusModalProps> = ({ 
  isOpen, 
  onClose, 
  syncStatus, 
  onSync, 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'queue' | 'errors' | 'settings'>('overview')
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([])
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true)
  const [syncInterval, setSyncInterval] = useState(5)

  // Mock data for demonstration - in real implementation, this would come from SyncService
  useEffect(() => {
    if (isOpen) {
      loadSyncHistory()
      loadPendingTransactions()
    }
  }, [isOpen])

  const loadSyncHistory = () => {
    // Mock sync history data
    const mockHistory: SyncHistoryEntry[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        type: 'manual',
        status: 'success',
        productsSynced: 150,
        transactionsSynced: 12,
        duration: 45000,
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        type: 'auto',
        status: 'success',
        productsSynced: 150,
        transactionsSynced: 8,
        duration: 32000,
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        type: 'auto',
        status: 'partial',
        productsSynced: 145,
        transactionsSynced: 10,
        errors: ['Failed to sync 5 products - connection timeout'],
        duration: 60000,
      },
    ]
    setSyncHistory(mockHistory)
  }

  const loadPendingTransactions = () => {
    // Mock pending transactions data
    const mockPending: PendingTransaction[] = [
      {
        id: '1',
        transactionCode: 'TXN-001',
        timestamp: new Date(Date.now() - 600000),
        amount: 250000,
        items: 3,
        status: 'pending',
        retryCount: 0,
      },
      {
        id: '2',
        transactionCode: 'TXN-002',
        timestamp: new Date(Date.now() - 300000),
        amount: 150000,
        items: 2,
        status: 'failed',
        error: 'Server error 500',
        retryCount: 2,
        lastAttempt: new Date(Date.now() - 120000),
      },
    ]
    setPendingTransactions(mockPending)
  }

  const handleSyncNow = async () => {
    setIsLoading(true)
    setSyncProgress(0)

    // Simulate sync progress
    const progressInterval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          setIsLoading(false)
          onSync?.()
          return 100
        }
        return prev + 10
      })
    }, 500)

    // In real implementation, this would call syncService.syncNow()
    try {
      const result = await syncService.syncNow()
      clearInterval(progressInterval)
      setIsLoading(false)
      setSyncProgress(100)
      
      // Add to history
      const newEntry: SyncHistoryEntry = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type: 'manual',
        status: result.success ? 'success' : 'error',
        productsSynced: result.productsSynced,
        transactionsSynced: result.transactionsSynced,
        errors: result.errors,
        duration: 30000, // Mock duration
      }
      setSyncHistory(prev => [newEntry, ...prev])
    } catch (error) {
      clearInterval(progressInterval)
      setIsLoading(false)
    }
  }

  const retryFailedTransaction = async (transactionId: string) => {
    // In real implementation, this would retry the specific transaction
    setPendingTransactions(prev => 
      prev.map(t => 
        t.id === transactionId 
          ? { ...t, retryCount: t.retryCount + 1, lastAttempt: new Date(), status: 'pending' as const }
          : t,
      ),
    )
  }

  const clearAllErrors = () => {
    syncService.clearSyncErrors()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      partial: 'bg-orange-100 text-orange-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      retry: 'bg-blue-100 text-blue-800',
    }
    return variants[status as keyof typeof variants] || variants.pending
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Database className="h-6 w-6 mr-2 text-blue-600" />
            Sync Status Dashboard
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Bar (when syncing) */}
        {isLoading && (
          <div className="px-6 py-3 bg-blue-50 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">Synchronizing...</span>
              <span className="text-sm text-blue-700">{syncProgress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b">
          <div className="flex space-x-0">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'history', label: 'History', icon: History },
              { id: 'queue', label: 'Queue', icon: FileText },
              { id: 'errors', label: 'Errors', icon: AlertCircle },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Current Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Connection</p>
                      <p className="text-lg font-semibold">
                        {syncStatus.isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                    {syncStatus.isOnline ? 
                      <Wifi className="h-8 w-8 text-green-500" /> : 
                      <WifiOff className="h-8 w-8 text-red-500" />
                    }
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending Sync</p>
                      <p className="text-lg font-semibold">{syncStatus.pendingTransactions}</p>
                    </div>
                    <Upload className="h-8 w-8 text-orange-500" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Last Sync</p>
                      <p className="text-lg font-semibold">
                        {syncStatus.lastSync ? 
                          `${Math.floor((Date.now() - syncStatus.lastSync.getTime()) / 60000)}m ago` :
                          'Never'
                        }
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-500" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Errors</p>
                      <p className="text-lg font-semibold">{syncStatus.syncErrors.length}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    onClick={handleSyncNow}
                    disabled={isLoading || !syncStatus.isOnline}
                    className="flex flex-col items-center p-4 h-auto"
                  >
                    <RefreshCw className="h-6 w-6 mb-2" />
                    Sync Now
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="flex flex-col items-center p-4 h-auto"
                    onClick={() => setActiveTab('history')}
                  >
                    <History className="h-6 w-6 mb-2" />
                    View History
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="flex flex-col items-center p-4 h-auto"
                    onClick={() => setActiveTab('queue')}
                  >
                    <FileText className="h-6 w-6 mb-2" />
                    Pending Items
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="flex flex-col items-center p-4 h-auto"
                    onClick={clearAllErrors}
                  >
                    <Trash2 className="h-6 w-6 mb-2" />
                    Clear Errors
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Sync History</h3>
              {syncHistory.map((entry) => (
                <Card key={entry.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(entry.status)}
                      <div>
                        <p className="font-medium">
                          {entry.type === 'manual' ? 'Manual Sync' : 'Auto Sync'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {entry.timestamp.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusBadge(entry.status)}>
                        {entry.status}
                      </Badge>
                      {entry.duration && (
                        <span className="text-sm text-gray-500">
                          {Math.floor(entry.duration / 1000)}s
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Products Synced: </span>
                      <span className="font-medium">{entry.productsSynced || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Transactions Synced: </span>
                      <span className="font-medium">{entry.transactionsSynced || 0}</span>
                    </div>
                  </div>
                  
                  {entry.errors && entry.errors.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm font-medium text-red-800 mb-1">Errors:</p>
                      {entry.errors.map((error, index) => (
                        <p key={index} className="text-sm text-red-700">• {error}</p>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'queue' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Pending Transaction Queue</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={loadPendingTransactions}
                >
                  Refresh
                </Button>
              </div>
              
              {pendingTransactions.length === 0 ? (
                <Card className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">No pending transactions</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {pendingTransactions.map((transaction) => (
                    <Card key={transaction.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium">{transaction.transactionCode}</h4>
                            <Badge className={getStatusBadge(transaction.status)}>
                              {transaction.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>Amount: Rp {transaction.amount.toLocaleString('id-ID')}</div>
                            <div>Items: {transaction.items}</div>
                            <div>Created: {transaction.timestamp.toLocaleString('id-ID')}</div>
                            {transaction.lastAttempt && (
                              <div>Last Attempt: {transaction.lastAttempt.toLocaleString('id-ID')}</div>
                            )}
                          </div>
                          
                          {transaction.error && (
                            <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                              Error: {transaction.error}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            Retry: {transaction.retryCount}
                          </Badge>
                          {transaction.status === 'failed' && (
                            <Button
                              size="sm"
                              onClick={() => retryFailedTransaction(transaction.id)}
                            >
                              Retry
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'errors' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Sync Errors</h3>
                <Button variant="outline" size="sm" onClick={clearAllErrors}>
                  Clear All
                </Button>
              </div>
              
              {syncStatus.syncErrors.length === 0 ? (
                <Card className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">No sync errors</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {syncStatus.syncErrors.map((error, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-800">Sync Error</p>
                          <p className="text-sm text-red-700 mt-1">{error}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // In real implementation, this would remove specific error
                            // For now, clear all errors
                            clearAllErrors()
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Sync Settings</h3>
              
              <Card className="p-4">
                <h4 className="font-medium mb-4">Auto Sync Configuration</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Auto Sync</p>
                      <p className="text-sm text-gray-600">Automatically sync data at regular intervals</p>
                    </div>
                    <Button
                      variant={autoSyncEnabled ? 'default' : 'outline'}
                      onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                    >
                      {autoSyncEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Sync Interval</p>
                      <p className="text-sm text-gray-600">How often to auto sync (in minutes)</p>
                    </div>
                    <select 
                      value={syncInterval} 
                      onChange={(e) => setSyncInterval(Number(e.target.value))}
                      className="border rounded px-3 py-2"
                    >
                      <option value={1}>1 minute</option>
                      <option value={5}>5 minutes</option>
                      <option value={10}>10 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                    </select>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-medium mb-4">Data Management</h4>
                <div className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Export Local Data
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data from Backup
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleString('id-ID')}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              onClick={handleSyncNow}
              disabled={isLoading || !syncStatus.isOnline}
            >
              {isLoading ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SyncStatusModal