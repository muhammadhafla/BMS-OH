import React from 'react'
import { Button } from './ui/button'
import {
  User,
  LogOut,
  Package,
  Settings,
  Wifi,
  Clock,
  Store,
  Scan,
  ChevronDown,
  Bell,
  RefreshCw,
  CloudOff,
  Database,
} from 'lucide-react'

interface Cashier {
  name: string;
  id: string;
  role: string;
  lastLogin?: string;
}

interface Branch {
  name: string;
  address: string;
  phone: string;
}

interface SyncStatus {
  isSyncing: boolean;
  isOnline: boolean;
  pendingTransactions: number;
}

interface POSHeaderProps {
  cashier: Cashier;
  branch: Branch;
  onLogout: () => void;
  activeView: 'pos' | 'inventory' | 'adjustment' | 'alerts';
  onViewChange: (_view: 'pos' | 'inventory' | 'adjustment' | 'alerts') => void;  
  showStockAlerts: boolean;
  connectionStatus: 'online' | 'offline';
  isInventoryDropdownOpen: boolean;
  setIsInventoryDropdownOpen: (_open: boolean) => void;  
  setIsAlertsModalOpen: (_open: boolean) => void;  
  syncStatus: SyncStatus;
  onSync: () => void;
}

const POSHeader: React.FC<POSHeaderProps> = ({
  cashier,
  branch,
  onLogout,
  activeView,
  onViewChange,
  showStockAlerts,
  connectionStatus,
  isInventoryDropdownOpen,
  setIsInventoryDropdownOpen,
  setIsAlertsModalOpen,
  syncStatus,
  onSync,
}) => {
  return (
    <div className="bg-white border-b shadow-sm">
      {/* Top Bar */}
      <div className="px-6 py-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex justify-between items-center">
          {/* Left - Branding & Store Info */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">BMS POS</h1>
                <p className="text-sm text-gray-600">{branch.name}</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>{branch.address}</p>
              <p>{branch.phone}</p>
            </div>
          </div>

          {/* Right - System Controls */}
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              {connectionStatus === 'online' ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <CloudOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm text-gray-600">
                {connectionStatus === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Sync Status */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSync}
                disabled={syncStatus.isSyncing}
                className="text-xs"
              >
                {syncStatus.isSyncing ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  syncStatus.isOnline ? (
                    <Database className="h-3 w-3" />
                  ) : (
                    <CloudOff className="h-3 w-3 text-red-500" />
                  )
                )}
                {syncStatus.pendingTransactions > 0 && (
                  <span className="ml-1 text-xs bg-orange-100 text-orange-800 px-1 rounded">
                    {syncStatus.pendingTransactions}
                  </span>
                )}
              </Button>
            </div>

            {/* Alerts Icon */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAlertsModalOpen(true)}
              className="relative text-gray-600 hover:text-gray-900"
            >
              <Bell className="h-4 w-4" />
              {showStockAlerts && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </Button>

            {/* Time Display */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{new Date().toLocaleString('id-ID')}</span>
            </div>

            {/* Cashier Info */}
            <div className="flex items-center space-x-2 text-sm">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-900">{cashier.name}</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {cashier.role}
              </span>
            </div>

            {/* Logout Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6 py-3">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <Button
            variant={activeView === 'pos' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('pos')}
            className="text-sm font-medium"
          >
            <Scan className="h-4 w-4 mr-2" />
            POS
          </Button>

          {/* Inventory Dropdown */}
          <div className="relative">
            <Button
              variant={activeView === 'inventory' || activeView === 'adjustment' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setIsInventoryDropdownOpen(!isInventoryDropdownOpen)}
              className="text-sm font-medium"
            >
              <Package className="h-4 w-4 mr-2" />
              Inventory
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>

            {/* Dropdown Menu */}
            {isInventoryDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <Button
                  variant={activeView === 'inventory' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    onViewChange('inventory')
                    setIsInventoryDropdownOpen(false)
                  }}
                  className="w-full justify-start text-sm font-normal rounded-none border-0"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Overview
                </Button>
                <Button
                  variant={activeView === 'adjustment' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    onViewChange('adjustment')
                    setIsInventoryDropdownOpen(false)
                  }}
                  className="w-full justify-start text-sm font-normal rounded-none border-0"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Adjust Stock
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay for dropdown */}
      {isInventoryDropdownOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsInventoryDropdownOpen(false)}
        />
      )}
    </div>
  )
}

export default POSHeader