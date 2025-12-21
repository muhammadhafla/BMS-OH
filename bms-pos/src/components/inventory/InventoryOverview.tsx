import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { LoadingSpinner } from '../ui/loading-spinner'
import { useToast } from '../../hooks/useToast'
import { inventoryService, InventoryItem, StockMovement, InventoryStats } from '../../services/InventoryService'
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Download, 
  RefreshCw,
  AlertCircle,
  BarChart3,
  FileText,
  Eye,
  Edit,
} from 'lucide-react'

interface InventoryOverviewProps {
  onProductSelect?: (productId: string) => void;
  onProductEdit?: (productId: string) => void;
  showActions?: boolean;
  maxItems?: number;
  initialFilter?: {
    search?: string;
    stockLevel?: 'all' | 'low' | 'out' | 'normal';
    category?: string;
  };
}

type SortField = 'name' | 'stock' | 'value' | 'lastUpdate' | 'movements';
type SortDirection = 'asc' | 'desc';

const InventoryOverview: React.FC<InventoryOverviewProps> = ({
  onProductSelect,
  onProductEdit,
  showActions = true,
  maxItems = 100,
  initialFilter = {},
}) => {
  // State
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [recentMovements, setRecentMovements] = useState<StockMovement[]>([])
  const [stats, setStats] = useState<InventoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState(initialFilter.search || '')
  const [stockFilter, setStockFilter] = useState(initialFilter.stockLevel || 'all')
  // const [categoryFilter, setCategoryFilter] = useState(initialFilter.category || '');
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  
  const { showSuccess, showError, showInfo } = useToast()

  // Load inventory data
  const loadData = async () => {
    try {
      const [inventoryData, statsData, movementsData] = await Promise.all([
        inventoryService.getAllInventory(),
        inventoryService.getInventoryStats(),
        inventoryService.getStockMovements({ limit: 50 }),
      ])
      
      setInventory(inventoryData)
      setStats(statsData)
      setRecentMovements(movementsData)
    } catch (error) {
      console.error('Error loading inventory data:', error)
      showError('Failed to load inventory data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true)
    await loadData()
    showInfo('Inventory data refreshed')
  }

  // Export inventory data
  const handleExport = async () => {
    try {
      setExporting(true)
      const data = await inventoryService.exportInventoryData()
      
      // Create and download file
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `inventory-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      showSuccess('Inventory data exported successfully')
    } catch (error) {
      console.error('Error exporting data:', error)
      showError('Failed to export inventory data')
    } finally {
      setExporting(false)
    }
  }

  // Sort and filter inventory
  const filteredAndSortedInventory = useMemo(() => {
    let filtered = [...inventory]

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(item => 
        item.productId.toLowerCase().includes(search) ||
        // In real app, would also search product name
        item.productId.includes(search),
      )
    }

    // Apply stock level filter
    if (stockFilter !== 'all') {
      switch (stockFilter) {
        case 'low':
          filtered = filtered.filter(item => 
            item.currentStock > 0 && item.currentStock <= item.reorderLevel,
          )
          break
        case 'out':
          filtered = filtered.filter(item => item.currentStock === 0)
          break
        case 'normal':
          filtered = filtered.filter(item => item.currentStock > item.reorderLevel)
          break
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
        case 'name':
          comparison = a.productId.localeCompare(b.productId)
          break
        case 'stock':
          comparison = a.currentStock - b.currentStock
          break
        case 'value':
          comparison = (a.totalValue || 0) - (b.totalValue || 0)
          break
        case 'lastUpdate':
          const aTime = a.movements[a.movements.length - 1]?.timestamp.getTime() || 0
          const bTime = b.movements[b.movements.length - 1]?.timestamp.getTime() || 0
          comparison = aTime - bTime
          break
        case 'movements':
          comparison = a.movements.length - b.movements.length
          break
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered.slice(0, maxItems)
  }, [inventory, searchTerm, stockFilter, sortField, sortDirection, maxItems])

  // Paginated data
  const paginatedInventory = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedInventory.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedInventory, currentPage])

  const totalPages = Math.ceil(filteredAndSortedInventory.length / itemsPerPage)

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Get stock level badge
  const getStockLevelBadge = (item: InventoryItem) => {
    if (item.currentStock === 0) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">Out of Stock</span>
    } else if (item.currentStock <= item.reorderLevel) {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">Low Stock</span>
    } else if (item.currentStock <= item.reorderLevel * 2) {
      return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">Medium</span>
    } else {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Good</span>
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <LoadingSpinner />
          <span className="ml-2">Loading inventory data...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{stats.totalItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recent Movements</p>
                  <p className="text-2xl font-bold">{stats.recentMovements}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Inventory Overview</CardTitle>
              <CardDescription>
                Manage and monitor your product inventory
              </CardDescription>
            </div>
            
            {showActions && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                  disabled={refreshing}
                  className="flex items-center space-x-1"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center space-x-1"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by ID or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Stock level filter */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="px-3 py-2 border border-input rounded-md bg-background text-sm"
            >
              <option value="all">All Stock Levels</option>
              <option value="out">Out of Stock</option>
              <option value="low">Low Stock</option>
              <option value="normal">Good Stock</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th 
                    className="text-left p-4 font-medium cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Product</span>
                      {sortField === 'name' && (
                        <span className="text-xs">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-left p-4 font-medium cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('stock')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Current Stock</span>
                      {sortField === 'stock' && (
                        <span className="text-xs">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th 
                    className="text-left p-4 font-medium cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('value')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Stock Value</span>
                      {sortField === 'value' && (
                        <span className="text-xs">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="text-left p-4 font-medium">Reorder Level</th>
                  <th 
                    className="text-left p-4 font-medium cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('movements')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Movements</span>
                      {sortField === 'movements' && (
                        <span className="text-xs">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  {showActions && <th className="text-right p-4 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedInventory.map((item) => (
                  <tr key={item.productId} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div>
                        <div className="font-medium">Product {item.productId}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {item.productId}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{item.currentStock} units</div>
                      <div className="text-sm text-muted-foreground">
                        {item.reservedStock} reserved
                      </div>
                    </td>
                    <td className="p-4">
                      {getStockLevelBadge(item)}
                    </td>
                    <td className="p-4">
                      <div className="font-medium">
                        {formatCurrency(item.totalValue || 0)}
                      </div>
                      {item.averageCost && (
                        <div className="text-sm text-muted-foreground">
                          Avg: {formatCurrency(item.averageCost)}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div>{item.reorderLevel} units</div>
                      <div className="text-sm text-muted-foreground">
                        Reorder: {item.reorderQuantity}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{item.movements.length}</span>
                        {item.movements.length > 0 && (
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            {item.movements.slice(-3).map((movement) => {
                              const isIncrease = movement.quantity > 0
                              return (
                                <div
                                  key={movement.id}
                                  className={`w-2 h-2 rounded-full ${
                                    isIncrease ? 'bg-green-500' : 'bg-red-500'
                                  }`}
                                  title={`${movement.type}: ${movement.quantity}`}
                                />
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                    {showActions && (
                      <td className="p-4">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onProductSelect?.(item.productId)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onProductEdit?.(item.productId)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredAndSortedInventory.length)} of{' '}
                {filteredAndSortedInventory.length} results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Movements */}
      {recentMovements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Recent Stock Movements</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMovements.slice(0, 10).map((movement) => (
                <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      movement.quantity > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {movement.quantity > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {movement.type.charAt(0).toUpperCase() + movement.type.slice(1)} - Product {movement.productId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(movement.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {movement.quantity > 0 ? '+' : ''}{movement.quantity} units
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {movement.previousStock} → {movement.newStock}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default InventoryOverview