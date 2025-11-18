import React from 'react';
import { useWebSocketConnection } from '@/hooks/useWebSocket';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wifi, 
  WifiOff, 
  RotateCcw, 
  Activity,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WebSocketStatusProps {
  className?: string;
  showDetails?: boolean;
  showReconnectButton?: boolean;
  onReconnect?: () => void;
}

/**
 * WebSocket Connection Status Component
 * Shows real-time connection status with visual indicators
 */
export const WebSocketStatus: React.FC<WebSocketStatusProps> = ({
  className,
  showDetails = false,
  showReconnectButton = true,
  onReconnect
}) => {
  const { connectionState, isConnected, connectionDuration, onConnectionStateChange } = useWebSocketConnection();

  // Connection state configuration
  const getStatusConfig = (state: typeof connectionState) => {
    switch (state) {
      case 'connected':
        return {
          variant: 'default' as const,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          icon: Wifi,
          text: 'Connected',
          description: 'Real-time updates active'
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
          description: 'Unable to establish connection'
        };
      case 'disconnected':
      default:
        return {
          variant: 'outline' as const,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          icon: WifiOff,
          text: 'Disconnected',
          description: 'Real-time updates disabled'
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
      // Trigger a page refresh as fallback
      window.location.reload();
    }
  };

  // Format connection duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
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

      {/* Details Panel */}
      {showDetails && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {/* Connection Duration */}
          {isConnected && connectionDuration > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatDuration(connectionDuration)}</span>
            </div>
          )}

          {/* Reconnect Button */}
          {showReconnectButton && connectionState === 'error' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReconnect}
              className="h-6 px-2 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Connection Description */}
      {showDetails && (
        <div className="text-xs text-muted-foreground">
          {statusConfig.description}
        </div>
      )}
    </div>
  );
};

/**
 * Compact WebSocket Status for use in navigation/sidebar
 */
export const WebSocketStatusCompact: React.FC<{ className?: string }> = ({ className }) => {
  const { connectionState, isConnected } = useWebSocketConnection();

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
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'w-2 h-2 rounded-full transition-colors',
        isConnected ? 'bg-green-500' : 'bg-gray-300'
      )} />
      <span className={cn('text-xs font-medium', getStatusColor())}>
        {connectionState}
      </span>
    </div>
  );
};

/**
 * WebSocket Status Modal for detailed monitoring
 */
export const WebSocketStatusModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { connectionState, isConnected, connectionDuration, onConnectionStateChange } = useWebSocketConnection();

  if (!isOpen) return null;

  const statusConfig = getStatusConfig(connectionState);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">WebSocket Status</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-3">
            <StatusIcon className={cn('h-5 w-5', statusConfig.color)} />
            <div>
              <div className="font-medium">{statusConfig.text}</div>
              <div className="text-sm text-muted-foreground">
                {statusConfig.description}
              </div>
            </div>
          </div>

          {/* Connection Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Status</div>
              <div className="font-medium">{connectionState}</div>
            </div>
            
            <div>
              <div className="text-muted-foreground">Duration</div>
              <div className="font-medium">
                {isConnected && connectionDuration > 0 
                  ? `${Math.floor(connectionDuration / 1000)}s`
                  : 'N/A'
                }
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {connectionState === 'error' && (
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reconnect
              </Button>
            )}
            
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
const getStatusConfig = (state: typeof connectionState) => {
  switch (state) {
    case 'connected':
      return {
        variant: 'default' as const,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        icon: Wifi,
        text: 'Connected',
        description: 'Real-time updates active'
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
        description: 'Unable to establish connection'
      };
    case 'disconnected':
    default:
      return {
        variant: 'outline' as const,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        icon: WifiOff,
        text: 'Disconnected',
        description: 'Real-time updates disabled'
      };
  }
};