'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';
import { ProductForm } from '@/components/product/ProductForm';
import { ProductDetailsView } from '@/components/product/ProductDetailsView';
import { CsvImportModal } from '@/components/product/CsvImportModal';

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  barcode: string;
  category: {
    id: string;
    name: string;
  } | null;
  branch: {
    id: string;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductsResponse {
  success: boolean;
  data: {
    products: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// SWR fetcher function
const fetcher = (url: string): Promise<any> => fetch(url).then(res => res.json());

export default function ProductsPage() {
  // State management for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all-categories');
  const [branchFilter, setBranchFilter] = useState<string>('all-branches');
  const [isActiveFilter, setIsActiveFilter] = useState<string>('all-status');
  const [currentPage, setCurrentPage] = useState(1);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isProductDetailsOpen, setIsProductDetailsOpen] = useState(false);

  // Build query string for SWR key
  const buildQueryString = () => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: '10',
    });

    if (searchTerm) params.append('search', searchTerm);
    if (categoryFilter && categoryFilter !== 'all-categories') params.append('categoryId', categoryFilter);
    if (branchFilter && branchFilter !== 'all-branches') params.append('branchId', branchFilter);
    if (isActiveFilter && isActiveFilter !== 'all-status') params.append('isActive', isActiveFilter);

    return params.toString();
  };

  // SWR hook for data fetching
  const { data, error, isLoading, mutate } = useSWR<ProductsResponse>(
    `/api/products?${buildQueryString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  // Get stock status badge
  const getStockStatus = (product: Product) => {
    if (product.stock <= 0) {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Out of Stock</Badge>;
    } else if (product.stock <= product.minStock) {
      return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Low Stock</Badge>;
    } else if (product.stock >= product.maxStock) {
      return <Badge variant="default"><AlertTriangle className="w-3 h-3 mr-1" />Overstock</Badge>;
    } else {
      return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />In Stock</Badge>;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when searching
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle filter changes
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [categoryFilter, branchFilter, isActiveFilter]);

  // Handle product details view
  const handleViewProduct = (productId: string) => {
    setSelectedProductId(productId);
    setIsProductDetailsOpen(true);
  };

  // Handle product details update
  const handleProductUpdate = () => {
    mutate(); // Refresh the products list
  };

  // Handle CSV import completion
  const handleCsvImportComplete = () => {
    mutate(); // Refresh the products list after import
  };

  // Extract data from SWR response
  const products = data?.data?.products || [];
  const pagination = data?.data?.pagination;
  const totalPages = pagination?.pages || 1;
  const totalProducts = pagination?.total || 0;

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Products</h3>
            <p className="text-red-600">{error.message || 'An error occurred'}</p>
            <Button 
              onClick={() => mutate()} 
              className="mt-4"
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your product inventory and catalog
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCsvImportOpen(true)} variant="outline">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setIsProductFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Active and inactive products
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter(p => p.stock > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Products with available stock
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter(p => p.stock > 0 && p.stock <= p.minStock).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Products below minimum level
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter(p => p.stock <= 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Products with zero stock
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Product List</CardTitle>
          <CardDescription>
            View and manage your product inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products by name, SKU, or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-categories">All Categories</SelectItem>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="clothing">Clothing</SelectItem>
                <SelectItem value="food">Food & Beverage</SelectItem>
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-branches">All Branches</SelectItem>
                <SelectItem value="main">Main Branch</SelectItem>
                <SelectItem value="branch-2">Branch 2</SelectItem>
                <SelectItem value="branch-3">Branch 3</SelectItem>
              </SelectContent>
            </Select>
            <Select value={isActiveFilter} onValueChange={setIsActiveFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active Only</SelectItem>
                <SelectItem value="false">Inactive Only</SelectItem>
                <SelectItem value="all-status">All Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Products Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="ml-2">Loading products...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      <div className="flex flex-col items-center justify-center py-8">
                        <Package className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold text-muted-foreground">No products found</h3>
                        <p className="text-sm text-muted-foreground">
                          Try adjusting your search or filter criteria
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.sku}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.category?.name || 'No Category'}
                      </TableCell>
                      <TableCell>{formatCurrency(product.price)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.stock} {product.unit}</div>
                          {product.minStock > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Min: {product.minStock}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStockStatus(product)}
                      </TableCell>
                      <TableCell>{product.branch.name}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewProduct(product.id)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewProduct(product.id)}
                          >
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!isLoading && products.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="flex-1 text-sm text-muted-foreground">
                Showing page {pagination?.page} of {totalPages} ({totalProducts} total products)
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + Math.max(1, currentPage - 2);
                    if (page > totalPages) return null;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Form Modal */}
      <ProductForm
        open={isProductFormOpen}
        onOpenChange={setIsProductFormOpen}
        onSuccess={() => {
          // Refresh the products list when a new product is created
          mutate();
        }}
      />

      {/* Product Details View Modal */}
      {selectedProductId && (
        <ProductDetailsView
          productId={selectedProductId}
          open={isProductDetailsOpen}
          onOpenChange={(open) => {
            setIsProductDetailsOpen(open);
            if (!open) {
              setSelectedProductId(null);
            }
          }}
          onProductUpdate={handleProductUpdate}
        />
      )}

      {/* CSV Import Modal */}
      <CsvImportModal
        open={isCsvImportOpen}
        onOpenChange={setIsCsvImportOpen}
        onImportComplete={handleCsvImportComplete}
      />
    </div>
  );
}