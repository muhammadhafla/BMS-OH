import React from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { 
  Wifi, 
  CloudOff, 
  Database, 
  RefreshCw, 
  AlertCircle, 
  Clock,
  CheckCircle,
  WifiOff,
  Activity
} from 'lucide-react';
import { SyncStatus } from '../services/SyncService';

interface SyncStatusHeaderProps {
  syncStatus: SyncStatus;
  onSync: () => void;
  onViewDetails: () => void;
  compact?: boolean;
}

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'syncing' | 'error' | 'pending';
  label: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, label }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          className: 'bg-green-100 text-green-800 border-green-200',
          dotColor: 'bg-green-500'
        };
      case 'offline':
        return {
          icon: <WifiOff className="h-3 w-3" />,
          className: 'bg-red-100 text-red-800 border-red-200',
          dotColor: 'bg-red-500'
        };
      case 'syncing':
        return {
          icon: <RefreshCw className="h-3 w-3 animate-spin" />,
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          dotColor: 'bg-blue-500'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          className: 'bg-red-100 text-red-800 border-red-200',
          dotColor: 'bg-red-500'
        };
      case 'pending':
        return {
          icon: <Clock className="h-3 w-3" />,
          className: 'bg-orange-100 text-orange-800 border-orange-200',
          dotColor: 'bg-orange-500'
        };
      default:
        return {
          icon: <Activity className="h-3 w-3" />,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          dotColor: 'bg-gray-500'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
      <div className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium border ${config.className}`}>
        {config.icon}
        <span>{label}</span>
      </div>
    </div>
  );
};

const SyncStatusHeader: React.FC<SyncStatusHeaderProps> = ({ 
  syncStatus, 
  onSync, 
  onViewDetails,
  compact = false 
}) => {
  const getOverallStatus = (): 'online' | 'offline' | 'syncing' | 'error' | 'pending' => {
    if (syncStatus.isSyncing) return 'syncing';
    if (syncStatus.syncErrors.length > 0) return 'error';
    if (syncStatus.pendingTransactions > 0 || syncStatus.pendingProducts > 0) return 'pending';
    if (syncStatus.isOnline) return 'online';
    return 'offline';
  };

  const getConnectionIcon = () => {
    if (syncStatus.isSyncing) return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
    if (syncStatus.isOnline) return <Wifi className="h-4 w-4 text-green-500" />;
    return <CloudOff className="h-4 w-4 text-red-500" />;
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const overallStatus = getOverallStatus();

  if (compact) {
    return (
      <div className="flex items-center space-x-3 px-4 py-2 bg-white border-b">
        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          {getConnectionIcon()}
          <span className="text-sm font-medium text-gray-900">
            {syncStatus.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Pending Count */}
        {syncStatus.pendingTransactions > 0 && (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            {syncStatus.pendingTransactions} pending
          </Badge>
        )}

        {/* Sync Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onSync}
          disabled={syncStatus.isSyncing || !syncStatus.isOnline}
          className="text-xs"
        >
          {syncStatus.isSyncing ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <Database className="h-3 w-3" />
          )}
          Sync
        </Button>

        {/* View Details */}
        <Button variant="ghost" size="sm" onClick={onViewDetails} className="text-xs">
          Details
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <div className="p-4">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Database className="h-5 w-5 mr-2 text-blue-600" />
              Sync Status
            </h3>
            <StatusIndicator status={overallStatus} label={overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)} />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSync}
              disabled={syncStatus.isSyncing || !syncStatus.isOnline}
            >
              {syncStatus.isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
            
            <Button variant="ghost" size="sm" onClick={onViewDetails}>
              View Details
            </Button>
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Connection Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Connection</span>
              {getConnectionIcon()}
            </div>
            <div className="text-sm text-gray-900">
              {syncStatus.isOnline ? 'Connected to server' : 'No internet connection'}
            </div>
            <StatusIndicator 
              status={syncStatus.isOnline ? 'online' : 'offline'} 
              label={syncStatus.isOnline ? 'Online' : 'Offline'} 
            />
          </div>

          {/* Pending Transactions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Pending Sync</span>
              <Badge variant="outline" className={
                syncStatus.pendingTransactions > 0 
                  ? 'bg-orange-50 text-orange-700 border-orange-200' 
                  : 'bg-green-50 text-green-700 border-green-200'
              }>
                {syncStatus.pendingTransactions}
              </Badge>
            </div>
            <div className="text-sm text-gray-900">
              {syncStatus.pendingTransactions > 0 
                ? `${syncStatus.pendingTransactions} transaction(s) waiting to sync`
                : 'All transactions synced'
              }
            </div>
            <StatusIndicator 
              status={syncStatus.pendingTransactions > 0 ? 'pending' : 'online'} 
              label={syncStatus.pendingTransactions > 0 ? 'Pending' : 'Up to date'} 
            />
          </div>

          {/* Last Sync */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Last Sync</span>
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-sm text-gray-900">
              {formatLastSync(syncStatus.lastSync)}
            </div>
            <div className="text-xs text-gray-500">
              {syncStatus.lastSync 
                ? syncStatus.lastSync.toLocaleString('id-ID') 
                : 'No sync performed yet'
              }
            </div>
          </div>

          {/* Sync Errors */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Errors</span>
              {syncStatus.syncErrors.length > 0 && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="text-sm text-gray-900">
              {syncStatus.syncErrors.length === 0 
                ? 'No sync errors' 
                : `${syncStatus.syncErrors.length} error(s) occurred`
              }
            </div>
            {syncStatus.syncErrors.length > 0 && (
              <StatusIndicator status="error" label="Needs attention" />
            )}
          </div>
        </div>

        {/* Progress Bar (when syncing) */}
        {syncStatus.isSyncing && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Synchronizing...</span>
              <span className="text-xs text-gray-500">Please wait</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full animate-pulse w-2/3"></div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SyncStatusHeader;