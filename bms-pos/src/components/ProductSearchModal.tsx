import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Search, Package, Plus, X, Filter } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { useToast } from '../hooks/useToast';

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  unit: string;
  barcode?: string;
  category?: string;
}

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductSelect: (product: Product) => void;
  searchQuery?: string;
}

const ProductSearchModal: React.FC<ProductSearchModalProps> = ({
  isOpen,
  onClose,
  onProductSelect,
  searchQuery = ''
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const { showSuccess, showError } = useToast();

  // Load products when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProducts();
      setSearchTerm(searchQuery);
    }
  }, [isOpen, searchQuery]);

  // Load products from API or fallback data
  const loadProducts = async () => {
    setLoading(true);
    try {
      // Check if electronAPI is available
      if (window.electronAPI && window.electronAPI.getProducts) {
        const result = await window.electronAPI.getProducts({ limit: 500 });
        if (result.success) {
          setProducts(result.data);
          // Extract unique categories
          const uniqueCategories = [...new Set(result.data.map((p: Product) => p.category).filter(Boolean))];
          setCategories(uniqueCategories as string[]);
        } else {
          throw new Error(result.error || 'Failed to load products');
        }
      } else {
        // Fallback to sample data when electronAPI is not available
        throw new Error('electronAPI not available');
      }
    } catch (error) {
      console.warn('Using fallback sample data:', error);
      // Fallback sample data
      const sampleProducts: Product[] = [
        {
          id: '1',
          sku: 'PROD001',
          name: 'Kopi Arabica Premium 250g',
          price: 45000,
          cost: 35000,
          stock: 25,
          unit: 'pack',
          barcode: '123456789',
          category: 'Beverage'
        },
        {
          id: '2',
          sku: 'PROD002',
          name: 'Teh Celup Tarik 25 Sachet',
          price: 15000,
          cost: 11000,
          stock: 50,
          unit: 'box',
          barcode: '987654321',
          category: 'Beverage'
        },
        {
          id: '3',
          sku: 'PROD003',
          name: 'Roti Tawar Gandum 400g',
          price: 12000,
          cost: 9000,
          stock: 15,
          unit: 'loaf',
          barcode: '555123456',
          category: 'Bakery'
        },
        {
          id: '4',
          sku: 'PROD004',
          name: 'Susu UHT 1 Liter',
          price: 8000,
          cost: 6500,
          stock: 30,
          unit: 'pack',
          barcode: '789123456',
          category: 'Dairy'
        }
      ];
      setProducts(sampleProducts);
      setCategories(['Beverage', 'Bakery', 'Dairy']);
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(search) ||
        product.sku.toLowerCase().includes(search) ||
        (product.barcode && product.barcode.includes(search)) ||
        (product.category && product.category.toLowerCase().includes(search))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [products, searchTerm, selectedCategory]);

  const handleProductSelect = (product: Product) => {
    if (product.stock <= 0) {
      showError('Produk sedang tidak tersedia');
      return;
    }
    
    onProductSelect(product);
    showSuccess(`${product.name} ditambahkan ke keranjang`);
  };

  const getStockStatusBadge = (stock: number) => {
    if (stock <= 0) {
      return <Badge variant="destructive" className="text-xs">Habis</Badge>;
    } else if (stock <= 10) {
      return <Badge variant="secondary" className="text-xs">Stok Menipis</Badge>;
    } else {
      return <Badge variant="default" className="text-xs">Tersedia</Badge>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Pencarian Produk
            {searchQuery && (
              <span className="text-sm text-gray-600 ml-2">
                untuk "{searchQuery}"
              </span>
            )}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="p-4 border-b space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Cari nama, SKU, atau barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Kategori:</span>
            <div className="flex gap-1 flex-wrap">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
                className="text-xs"
              >
                Semua
              </Button>
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="text-xs"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-hidden p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Memuat produk...</p>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Tidak ada produk ditemukan</p>
                <p className="text-sm">Coba ubah kata kunci pencarian atau filter</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 h-full overflow-y-auto">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
                  onClick={() => handleProductSelect(product)}
                >
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      {/* Product Name */}
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                        {product.name}
                      </h3>
                      
                      {/* SKU and Category */}
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>SKU: {product.sku}</span>
                        {product.category && (
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Price and Stock */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-green-600 text-sm">
                            {formatCurrency(product.price)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Stok: {product.stock}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {getStockStatusBadge(product.stock)}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProductSelect(product);
                            }}
                            disabled={product.stock <= 0}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Barcode */}
                      {product.barcode && (
                        <div className="text-xs text-gray-500">
                          Barcode: {product.barcode}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {filteredProducts.length} produk ditemukan
            </div>
            <Button variant="outline" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSearchModal;