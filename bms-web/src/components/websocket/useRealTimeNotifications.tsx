import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { BMSWebSocketEvent } from '@/lib/websocket';
import { toast } from 'sonner';

/**
 * Real-time notification hook that handles system notifications
 * and displays appropriate toast messages
 */
export const useRealTimeNotifications = () => {
  const [notifications, setNotifications] = useState<BMSWebSocketEvent[]>([]);
  
  const { subscribe } = useWebSocket({
    autoConnect: true,
    namespace: 'main',
    eventHandlers: {
      'system:notification': (event: BMSWebSocketEvent) => {
        // Add to notifications list
        setNotifications(prev => [event, ...prev.slice(0, 49)]); // Keep last 50
        
        // Show toast notification
        const { title, message, severity, category } = event.data as any;
        
        switch (severity) {
          case 'success':
            toast.success(title || 'Success', {
              description: message,
              duration: 5000,
            });
            break;
          case 'warning':
            toast.warning(title || 'Warning', {
              description: message,
              duration: 7000,
            });
            break;
          case 'error':
            toast.error(title || 'Error', {
              description: message,
              duration: 10000,
            });
            break;
          case 'info':
          default:
            toast(title || 'Information', {
              description: message,
              duration: 5000,
            });
            break;
        }
      },
      
      'low-stock:alert': (event: BMSWebSocketEvent) => {
        const { productName, currentStock, minStock } = event.data as any;
        
        toast.warning('Low Stock Alert', {
          description: `${productName} is running low (${currentStock}/${minStock} remaining)`,
          duration: 10000,
          action: {
            label: 'View Product',
            onClick: () => {
              // Navigate to product page
              window.location.href = `/products/${event.data.productId}`;
            }
          }
        });
      },
      
      'transaction:created': (event: BMSWebSocketEvent) => {
        const { transactionCode, totalAmount, customerName } = event.data as any;
        
        toast.success('New Transaction', {
          description: `Transaction ${transactionCode} - $${totalAmount}${customerName ? ` (${customerName})` : ''}`,
          duration: 5000,
        });
      }
    }
  });

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, data: { ...notification.data, read: true } }
          : notification
      )
    );
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Get unread count
  const unreadCount = notifications.filter(n => !n.data?.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearNotifications,
    subscribe
  };
};