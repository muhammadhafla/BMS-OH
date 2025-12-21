import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import {
  Search,
  Plus,
  AlertTriangle,
  Scan,
  BarChart3,
  Filter,
  Star,
  Clock,
  Zap,
  Grid,
  List,
  SortAsc,
  SortDesc,
  RefreshCw,
} from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { useToast } from '../hooks/useToast'
import ProductSearchModal from './ProductSearchModal'
// import { syncService } from '../services/SyncService'; // Not used in API mode
import { apiService } from '../services/ApiService'
// PRODUCTION OFFLINE-FIRST MODE (Uncomment these lines for Electron/offline mode)
// import DatabaseService from '../database/DatabaseService';

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  unit: string;
  barcode?: string;
  description?: string;
  category?: string | {
    id: string;
    name: string;
  };
  branch?: {
    id: string;
    name: string;
  };
  // Add legacy properties for compatibility
  categoryName?: string;
  supplier?: string;
  lastUpdated?: string;
  isLowStock?: boolean;
  isPopular?: boolean;
}

interface SearchPanelProps {
  onAddToCart: (product: Product, quantity?: number) => void;
  onStockAlert: () => void;
}

interface SearchFilters {
  category: string;
  supplier: string;
  priceRange: [number, number];
  inStock: boolean;
  lowStock: boolean;
  popular: boolean;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ onAddToCart }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [showProductSearchModal, setShowProductSearchModal] = useState(false)
  const [filteredResults, setFilteredResults] = useState<Product[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'popularity'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [quickAddQuantities, setQuickAddQuantities] = useState<{[key: string]: number}>({})
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    category: '',
    supplier: '',
    priceRange: [0, 1000000],
    inStock: false,
    lowStock: false,
    popular: false,
  })
  const { showSuccess, showError, showWarning } = useToast()

  // PRODUCTION OFFLINE-FIRST MODE: Uncomment for Electron
  // const dbService = new DatabaseService();

  // Load products
  useEffect(() => {
    loadInitialProducts()
    loadRecentSearches()
  }, [])

  const loadInitialProducts = async () => {
    setLoading(true)
    try {
      // API mode - load products directly from backend
      const response = await apiService.getProducts({ limit: 500 })
      
      if (response.success && response.data?.products) {
        setProducts(response.data.products)
        console.log(`✅ Loaded ${response.data.products.length} products from API`)
      } else {
        throw new Error(response.error || 'Failed to load products from API')
      }
    } catch (error) {
      console.warn('Failed to load products:', error)
      showError('Failed to load products. Please check your connection.')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const loadRecentSearches = () => {
    const searches = localStorage.getItem('pos-recent-searches')
    if (searches) {
      setRecentSearches(JSON.parse(searches))
    }
  }

  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return
    
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('pos-recent-searches', JSON.stringify(updated))
  }

  // Enhanced search function
  const performSmartSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setFilteredResults([])
      return
    }

    const searchQuery = query.toLowerCase().trim()
    
    // Exact matches (by name, barcode, or SKU)
    const exactMatches = products.filter(product => {
      const nameMatch = product.name.toLowerCase() === searchQuery
      const barcodeMatch = product.barcode && product.barcode === searchQuery
      const skuMatch = product.sku.toLowerCase() === searchQuery
      
      return nameMatch || barcodeMatch || skuMatch
    })

    // Partial matches with scoring
    const partialMatches = products
      .filter(product => {
        const nameMatch = product.name.toLowerCase().includes(searchQuery)
        const barcodeMatch = product.barcode?.includes(searchQuery)
        const skuMatch = product.sku.toLowerCase().includes(searchQuery)
        const categoryName = (product.category as any)?.name || product.categoryName
        const categoryMatch = categoryName?.toLowerCase().includes(searchQuery)
        
        return nameMatch || barcodeMatch || skuMatch || categoryMatch
      })
      .map(product => ({
        ...product,
        searchScore: calculateSearchScore(product, searchQuery),
      }))
      .sort((a, b) => b.searchScore - a.searchScore)
  
      setFilteredResults(partialMatches)

    // Auto-add if exact match found
    if (exactMatches.length === 1) {
      const product = exactMatches[0]
      if (product.stock > 0) {
        onAddToCart(product, 1)
        showSuccess(`✓ ${product.name} added to cart`)
        saveRecentSearch(query)
        setSearchTerm('')
        setFilteredResults([])
        return
      } else {
        showWarning(`${product.name} is out of stock`)
      }
    }

    // Show modal if no exact match
    if (exactMatches.length === 0 && partialMatches.length > 0) {
      saveRecentSearch(query)
    } else if (partialMatches.length === 0) {
      showError('Product not found')
      saveRecentSearch(query)
    }
  }, [products, onAddToCart, showSuccess, showWarning, showError])

  const calculateSearchScore = (product: Product, query: string): number => {
    let score = 0
    const lowerQuery = query.toLowerCase()
    
    // Name match scoring
    if (product.name.toLowerCase().includes(lowerQuery)) {
      score += 10
      if (product.name.toLowerCase().startsWith(lowerQuery)) score += 5
    }
    
    // SKU match scoring
    if (product.sku.toLowerCase().includes(lowerQuery)) {
      score += 8
      if (product.sku.toLowerCase().startsWith(lowerQuery)) score += 3
    }
    
    // Barcode match scoring
    if (product.barcode?.includes(lowerQuery)) {
      score += 6
    }
    
    // Category match scoring
    const categoryName = (typeof product.category === 'object' && product.category?.name) || product.categoryName
    if (categoryName?.toLowerCase().includes(lowerQuery)) {
      score += 4
    }
    
    // Supplier match scoring
    if (product.supplier?.toLowerCase().includes(lowerQuery)) {
      score += 3
    }
    
    // Popularity bonus (simulate based on sales patterns or stock turnover)
    if (product.isPopular) score += 2
    
    // Stock availability bonus
    if (product.stock > 0) score += 1
    
    // Low stock penalty (less important if low stock)
    const isLowStock = product.isLowStock || product.stock <= 10
    if (isLowStock) score -= 1
    
    return score
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performSmartSearch(searchTerm)
  }

  const handleSearchInputChange = (value: string) => {
    setSearchTerm(value)
    if (value.length >= 2) {
      // Debounced search for real-time feedback
      setTimeout(() => {
        performSmartSearch(value)
      }, 300)
    } else {
      setFilteredResults([])
    }
  }

  const handleProductSelectFromModal = (product: Product) => {
    const quantity = quickAddQuantities[product.id] || 1
    onAddToCart(product, quantity)
    setShowProductSearchModal(false)
    setSearchTerm('')
    setFilteredResults([])
    setQuickAddQuantities(prev => ({ ...prev, [product.id]: 1 }))
  }

  const handleQuickAdd = async (product: Product, quantity: number = 1) => {
    try {
      // Validate stock availability first
      if (product.stock <= 0) {
        showError(`${product.name} is out of stock`)
        return
      }
      
      if (quantity > product.stock) {
        showWarning(`Only ${product.stock} items available`)
        quantity = product.stock
      }
      
      // Attempt to add to cart
      await onAddToCart(product, quantity)
      
      // Success notification - only show if cart addition was successful
      showSuccess(`✅ ${quantity}x ${product.name} added to cart`)
      
      // Clear quick add quantity after successful add
      setQuickAddQuantities(prev => ({ ...prev, [product.id]: 1 }))
      
    } catch (error) {
      console.error('Failed to add item to cart:', error)
      showError(`❌ Failed to add ${product.name} to cart`)
    }
  }

  // Note: updateQuickAddQuantity function removed as it's not used

  // Apply filters and sorting
  const getFilteredAndSortedProducts = useMemo(() => {
    let filtered = [...filteredResults]

    // Apply filters
    if (filters.category) {
      filtered = filtered.filter(p =>
        (typeof p.category === 'object' && p.category?.name === filters.category) ||
        p.categoryName === filters.category,
      )
    }
    if (filters.supplier) {
      filtered = filtered.filter(p => p.supplier === filters.supplier)
    }
    if (filters.inStock) {
      filtered = filtered.filter(p => p.stock > 0)
    }
    if (filters.lowStock) {
      filtered = filtered.filter(p => (p.isLowStock || p.stock <= 10) && p.stock > 0)
    }
    if (filters.popular) {
      filtered = filtered.filter(p => p.isPopular)
    }

    // Apply price range filter
    filtered = filtered.filter(p =>
      p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1],
    )

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'price':
          comparison = a.price - b.price
          break
        case 'stock':
          comparison = a.stock - b.stock
          break
        case 'popularity':
          comparison = (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0)
          break
        default:
          comparison = 0
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [filteredResults, filters, sortBy, sortOrder])

  // Get unique categories and suppliers for filters
  const categories = useMemo(() => {
    const allCategories = products.map(p => {
      const {category} = p
      if (typeof category === 'object' && category && 'name' in category) {
        return category.name
      }
      return category || p.categoryName
    }).filter(Boolean)
    return [...new Set(allCategories)] as string[]
  }, [products])

  const suppliers = useMemo(() => {
    return [...new Set(products.map(p => p.supplier).filter(Boolean))] as string[]
  }, [products])

  const clearFilters = () => {
    setFilters({
      category: '',
      supplier: '',
      priceRange: [0, 1000000],
      inStock: false,
      lowStock: false,
      popular: false,
    })
  }

  const hasActiveFilters = filters.category || filters.supplier || filters.inStock || filters.lowStock || filters.popular || 
                          filters.priceRange[0] > 0 || filters.priceRange[1] < 1000000

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Search Section */}
      <Card className="flex-shrink-0 shadow-lg border-0">
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
              <Scan className="h-5 w-5 text-blue-600" />
              Product Search
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              >
                {viewMode === 'list' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={hasActiveFilters ? 'bg-blue-50 border-blue-200' : ''}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-xs">
                    !
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-4">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Type product name, SKU, or scan barcode..."
                  value={searchTerm}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  className="pl-10 text-lg h-12"
                  autoFocus
                />
                {filteredResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border rounded-b-lg shadow-lg z-10 mt-1">
                    <div className="p-2 text-xs text-gray-500 border-b">
                      {filteredResults.length} results found
                    </div>
                  </div>
                )}
              </div>
              <Button
                type="submit"
                disabled={loading || !searchTerm.trim()}
                className="px-6 h-12 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Recent Searches */}
            {recentSearches.length > 0 && !searchTerm && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Recent searches:</p>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchTerm(search)}
                      className="text-xs"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {search}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowProductSearchModal(true)}
                className="flex-1"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Browse All Products
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={loadInitialProducts}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="flex-shrink-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Filters</CardTitle>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 border rounded-md text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Supplier</label>
                <select
                  value={filters.supplier}
                  onChange={(e) => setFilters(prev => ({ ...prev, supplier: e.target.value }))}
                  className="w-full p-2 border rounded-md text-sm"
                >
                  <option value="">All Suppliers</option>
                  {suppliers.map(supplier => (
                    <option key={supplier} value={supplier}>{supplier}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.inStock}
                  onChange={(e) => setFilters(prev => ({ ...prev, inStock: e.target.checked }))}
                />
                <span className="text-sm">In Stock</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.lowStock}
                  onChange={(e) => setFilters(prev => ({ ...prev, lowStock: e.target.checked }))}
                />
                <span className="text-sm">Low Stock</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.popular}
                  onChange={(e) => setFilters(prev => ({ ...prev, popular: e.target.checked }))}
                />
                <span className="text-sm">Popular</span>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {filteredResults.length > 0 && (
        <Card className="flex-1 min-h-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-gray-600">
                Search Results: {getFilteredAndSortedProducts.length} products
              </CardTitle>
              <div className="flex items-center space-x-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs border rounded px-2 py-1"
                >
                  <option value="name">Name</option>
                  <option value="price">Price</option>
                  <option value="stock">Stock</option>
                  <option value="popularity">Popularity</option>
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0 flex-1 overflow-hidden">
            <div className={`h-full overflow-y-auto space-y-2 ${
              viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-2'
            }`}>
              {getFilteredAndSortedProducts.map((product) => (
                <div
                  key={product.id}
                  className={`p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer ${
                    viewMode === 'grid' ? 'text-center' : 'flex items-center justify-between'
                  } ${product.stock <= 0 ? 'bg-red-50 border-red-200' : 'bg-white hover:bg-gray-50'}`}
                  onClick={() => handleQuickAdd(product, quickAddQuantities[product.id] || 1)}
                >
                  <div className={`${viewMode === 'grid' ? '' : 'flex-1 min-w-0'}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold text-gray-900 truncate">{product.name}</h4>
                      {product.isPopular && <Star className="h-3 w-3 text-yellow-500 fill-current" />}
                      {product.isLowStock && product.stock > 0 && (
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                    <div className={`text-xs text-gray-500 ${viewMode === 'grid' ? 'text-center' : ''}`}>
                      <p>SKU: {product.sku}</p>
                      <p>Stock: {product.stock} {product.unit}</p>
                      {typeof product.category === 'object' && product.category?.name && (
                        <p>Category: {product.category.name}</p>
                      )}
                      {product.categoryName && <p>Category: {product.categoryName}</p>}
                    </div>
                  </div>
                  
                  <div className={`${viewMode === 'grid' ? 'mt-3' : 'text-right ml-3'}`}>
                    <div className="flex items-center space-x-2 justify-end mb-2">
                      <div className="font-bold text-green-600 text-lg">
                        {formatCurrency(product.price)}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-green-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleQuickAdd(product, (quickAddQuantities[product.id] || 1) + 1)
                        }}
                        disabled={product.stock <= 0}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {product.stock <= 0 ? (
                      <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                    ) : product.isLowStock ? (
                      <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">In Stock</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <Card className="flex-shrink-0 bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-2 flex items-center">
              <Zap className="h-4 w-4 mr-1" />
              Quick Search Tips:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>• Type product name or SKU</div>
              <div>• Scan barcode directly</div>
              <div>• Auto-adds if single result</div>
              <div>• Use filters for better results</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Search Modal */}
      <ProductSearchModal
        isOpen={showProductSearchModal}
        onClose={() => setShowProductSearchModal(false)}
        onProductSelect={handleProductSelectFromModal}
        searchQuery={searchTerm}
      />
    </div>
  )
}

export default SearchPanel