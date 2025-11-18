import React from 'react';
import { usePOSWebSocketConnection } from '@/hooks/useWebSocket';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Wifi,
  WifiOff,
  RotateCcw,
  Activity,
  Clock,
  AlertCircle,
  RefreshCw,
  Database,
  Upload,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConnectionState } from '@/services/WebSocketService';

interface POSWebSocketStatusProps {
  className?: string;
  showDetails?: boolean;
  showSyncStatus?: boolean;
  showReconnectButton?: boolean;
  onReconnect?: () => void;
  onManualSync?: () => void;
}

/**
 * POS WebSocket Connection Status Component
 * Specialized for POS terminals with sync integration
 */
export const POSWebSocketStatus: React.FC<POSWebSocketStatusProps> = ({
  className,
  showDetails = true,
  showSyncStatus = true,
  showReconnectButton = true,
  onReconnect,
  onManualSync
}) => {
  const { connectionState, isConnected, connectionDuration } = usePOSWebSocketConnection();

  // Enhanced status configuration for POS
  const getStatusConfig = (state: typeof connectionState) => {
    switch (state) {
      case 'connected':
        return {
          variant: 'default' as const,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          icon: Wifi,
          text: 'Online',
          description: 'Real-time sync active'
        };
      case 'connecting':
        return {
          variant: 'secondary' as const,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          icon: Activity,
          text: 'Connecting...',
          description: 'Establishing connection'
        };
      case 'reconnecting':
        return {
          variant: 'secondary' as const,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          icon: RotateCcw,
          text: 'Reconnecting...',
          description: 'Attempting to reconnect'
        };
      case 'error':
        return {
          variant: 'destructive' as const,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          icon: AlertCircle,
          text: 'Connection Error',
          description: 'Sync temporarily unavailable'
        };
      case 'disconnected':
      default:
        return {
          variant: 'outline' as const,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          icon: WifiOff,
          text: 'Offline',
          description: 'Offline mode - local only'
        };
    }
  };

  const statusConfig = getStatusConfig(connectionState);
  const StatusIcon = statusConfig.icon;

  // Handle manual reconnect
  const handleReconnect = () => {
    if (onReconnect) {
      onReconnect();
    } else {
      // Fallback: trigger manual sync
      if (onManualSync) {
        onManualSync();
      }
    }
  };

  // Format connection duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className={cn('flex items-center gap-3 p-3 bg-background rounded-lg border', className)}>
      {/* Status Badge */}
      <Badge 
        variant={statusConfig.variant} 
        className={cn(
          'flex items-center gap-1.5 font-medium',
          statusConfig.color,
          statusConfig.bgColor
        )}
      >
        <StatusIcon className="h-3 w-3" />
        <span>{statusConfig.text}</span>
      </Badge>

      {/* Status Description */}
      <div className="text-sm text-muted-foreground">
        {statusConfig.description}
      </div>

      {/* Connection Duration */}
      {showDetails && isConnected && connectionDuration > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDuration(connectionDuration)}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-1 ml-auto">
        {/* Manual Sync Button */}
        {showSyncStatus && onManualSync && isConnected && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onManualSync}
            className="h-7 w-7 p-0"
            title="Manual Sync"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}

        {/* Reconnect Button */}
        {showReconnectButton && connectionState === 'error' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReconnect}
            className="h-7 w-7 p-0"
            title="Reconnect"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * Compact POS WebSocket Status for navigation bars
 */
export const POSWebSocketStatusCompact: React.FC<{ className?: string }> = ({ className }) => {
  const { connectionState, isConnected } = usePOSWebSocketConnection();

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected': return 'text-green-500';
      case 'connecting':
      case 'reconnecting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      case 'disconnected':
      default: return 'text-gray-400';
    }
  };

  return (
    <div className={cn('flex items-center gap-2 px-2 py-1 rounded bg-muted/50', className)}>
      <div className={cn(
        'w-2 h-2 rounded-full transition-colors',
        isConnected ? 'bg-green-500' : 'bg-gray-400'
      )} />
      <span className={cn('text-xs font-medium', getStatusColor())}>
        {connectionState}
      </span>
    </div>
  );
};

/**
 * POS Sync Status Indicator
 * Shows real-time sync status with WebSocket integration
 */
export const POSSyncStatusIndicator: React.FC<{
  className?: string;
  showDetailed?: boolean;
}> = ({ className, showDetailed = false }) => {
  const { syncMonitoring } = usePOSSyncMonitoring();

  const getSyncStatusConfig = () => {
    const { isOnline, isSyncing, pendingTransactions, pendingProducts, connectionHealth } = syncMonitoring;
    
    if (isSyncing) {
      return {
        variant: 'secondary' as const,
        icon: RefreshCw,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        text: 'Syncing...',
        description: 'Synchronizing data'
      };
    }
    
    if (!isOnline || connectionHealth === 'offline') {
      return {
        variant: 'outline' as const,
        icon: Database,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        text: 'Offline',
        description: 'Local mode'
      };
    }
    
    if (connectionHealth === 'unstable') {
      return {
        variant: 'secondary' as const,
        icon: Wifi,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        text: 'Unstable',
        description: 'Connection issues'
      };
    }
    
    if (pendingTransactions > 0 || pendingProducts > 0) {
      return {
        variant: 'default' as const,
        icon: Upload,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        text: 'Pending Sync',
        description: `${pendingTransactions + pendingProducts} items pending`
      };
    }
    
    return {
      variant: 'default' as const,
      icon: Download,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      text: 'Synced',
      description: 'All data synchronized'
    };
  };

  const statusConfig = getSyncStatusConfig();
  const StatusIcon = statusConfig.icon;

  if (!showDetailed) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <StatusIcon className={cn('h-3 w-3', statusConfig.color)} />
        <span className={cn('text-xs font-medium', statusConfig.color)}>
          {statusConfig.text}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 p-2 bg-background rounded border', className)}>
      <StatusIcon className={cn('h-4 w-4', statusConfig.color)} />
      <div>
        <div className="text-sm font-medium">{statusConfig.text}</div>
        <div className="text-xs text-muted-foreground">{statusConfig.description}</div>
      </div>
      
      {/* Pending counts */}
      {(syncMonitoring.pendingTransactions > 0 || syncMonitoring.pendingProducts > 0) && (
        <div className="ml-auto text-xs">
          <div>{syncMonitoring.pendingTransactions} transactions</div>
          <div>{syncMonitoring.pendingProducts} products</div>
        </div>
      )}
    </div>
  );
};

/**
 * POS WebSocket Control Panel
 * Comprehensive control for POS WebSocket and sync operations
 */
export const POSWebSocketControlPanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { syncMonitoring } = usePOSSyncMonitoring();
  const { connectionState, isConnected, connectionDuration } = usePOSWebSocketConnection();

  if (!isOpen) return null;

  const statusConfig = getStatusConfig(connectionState);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            WebSocket & Sync Status
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        <div className="space-y-6">
          {/* Connection Status */}
          <div className="space-y-3">
            <h4 className="font-medium">Connection Status</h4>
            <div className="flex items-center gap-3 p-3 border rounded">
              <StatusIcon className={cn('h-5 w-5', statusConfig.color)} />
              <div className="flex-1">
                <div className="font-medium">{statusConfig.text}</div>
                <div className="text-sm text-muted-foreground">{statusConfig.description}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                {isConnected && connectionDuration > 0 
                  ? `${Math.floor(connectionDuration / 1000)}s`
                  : 'N/A'
                }
              </div>
            </div>
          </div>

          {/* Sync Status */}
          <div className="space-y-3">
            <h4 className="font-medium">Synchronization</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Online Status</div>
                <div className="font-medium">
                  {syncMonitoring.isOnline ? 'Online' : 'Offline'}
                </div>
              </div>
              
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Sync Status</div>
                <div className="font-medium">
                  {syncMonitoring.isSyncing ? 'Syncing' : 'Idle'}
                </div>
              </div>
              
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Pending Transactions</div>
                <div className="font-medium">{syncMonitoring.pendingTransactions}</div>
              </div>
              
              <div className="p-3 border rounded">
                <div className="text-sm text-muted-foreground">Connection Health</div>
                <div className="font-medium capitalize">{syncMonitoring.connectionHealth}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reconnect
            </Button>
            
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function (duplicated to avoid import issues)
const getStatusConfig = (state: ConnectionState) => {
  switch (state) {
    case 'connected':
      return {
        variant: 'default' as const,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        icon: Wifi,
        text: 'Online',
        description: 'Real-time sync active'
      };
    case 'connecting':
      return {
        variant: 'secondary' as const,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        icon: Activity,
        text: 'Connecting...',
        description: 'Establishing connection'
      };
    case 'reconnecting':
      return {
        variant: 'secondary' as const,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        icon: RotateCcw,
        text: 'Reconnecting...',
        description: 'Attempting to reconnect'
      };
    case 'error':
      return {
        variant: 'destructive' as const,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: AlertCircle,
        text: 'Connection Error',
        description: 'Sync temporarily unavailable'
      };
    case 'disconnected':
    default:
      return {
        variant: 'outline' as const,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        icon: WifiOff,
        text: 'Offline',
        description: 'Offline mode - local only'
      };
  }
};

// Re-export the usePOSSyncMonitoring hook for use in the control panel
import { usePOSSyncMonitoring } from '@/hooks/useWebSocket';