'use client';

import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import { Category, Product, BulkUpdateProductsData } from '@/types/category';
import { apiService } from '@/services/api';
import { CategoryForm } from './CategoryForm';
import { ProductListResponse } from '@/types/api-responses';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Settings, 
  Package, 
  Folder, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Search
} from 'lucide-react';

// SWR fetcher
const fetcher = (url: string) => apiService.get(url);

interface BulkCategoryOperationsProps {
  categories: Category[];
  onSuccess?: () => void;
}

export function BulkCategoryOperations({ categories, onSuccess }: BulkCategoryOperationsProps) {
  // State management
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch products for bulk operations
  const { data: productsData, error: productsError, isLoading: productsLoading } = useSWR(
    '/api/products?limit=10000&includeProducts=true',
    fetcher
  );

  const products = (productsData as ProductListResponse)?.data?.items || [];

  // Filter products based on search term
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle product selection
  const handleProductSelect = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  // Handle bulk update
  const handleBulkUpdate = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select products to update');
      return;
    }

    if (!targetCategoryId) {
      toast.error('Please select a target category');
      return;
    }

    setUpdating(true);

    try {
      const data: BulkUpdateProductsData = {
        productIds: selectedProducts,
        categoryId: targetCategoryId
      };

      const response = await apiService.bulkUpdateProductsCategory(data);

      if (response.success) {
        toast.success('Products updated successfully', {
          description: `${selectedProducts.length} products have been moved to the selected category.`,
        });

        // Reset selections
        setSelectedProducts([]);
        setTargetCategoryId('');
        setSearchTerm('');

        // Refresh data
        mutate('/api/products');
        mutate('/api/categories');
        onSuccess?.();
      } else {
        throw new Error(response.message || 'Failed to update products');
      }
    } catch (error: any) {
      toast.error('Failed to update products', {
        description: error.response?.data?.message || error.message,
      });
    } finally {
      setUpdating(false);
    }
  };

  // Get category name by ID
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  // Get products by category
  const getProductsByCategory = (categoryId: string) => {
    return products.filter(p => p.id === categoryId);
  };

  if (productsLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (productsError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load products for bulk operations.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Bulk Category Operations
          </CardTitle>
          <CardDescription>
            Manage categories and products in bulk
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList>
          <TabsTrigger value="products">
            <Package className="h-4 w-4 mr-2" />
            Move Products
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Folder className="h-4 w-4 mr-2" />
            Category Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Move Products to Category</CardTitle>
              <CardDescription>
                Select multiple products and move them to a different category
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products by name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Product Selection */}
              <div className="border rounded-lg">
                <div className="p-4 border-b bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-medium">
                      Select All ({filteredProducts.length} products)
                    </span>
                    <Badge variant="outline" className="ml-2">
                      {selectedProducts.length} selected
                    </Badge>
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50">
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={(checked) => handleProductSelect(product.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          SKU: {product.sku} • Stock: {product.stock}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          ${product.price.toFixed(2)}
                        </div>
                        <Badge variant={product.isActive ? "default" : "secondary"}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Category</label>
                <select
                  value={targetCategoryId}
                  onChange={(e) => setTargetCategoryId(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select a category</option>
                  {categories.filter(c => c.isActive).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Summary */}
              {selectedProducts.length > 0 && targetCategoryId && (
                <Alert>
                  <ArrowRight className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{selectedProducts.length}</strong> products will be moved to "
                    <strong>{getCategoryName(targetCategoryId)}</strong>"
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex justify-end">
                <Button
                  onClick={handleBulkUpdate}
                  disabled={selectedProducts.length === 0 || !targetCategoryId || updating}
                >
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Move {selectedProducts.length} Products
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Category Management</CardTitle>
              <CardDescription>
                Perform batch operations on categories
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Category List */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Available Categories ({categories.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categories.map((category) => {
                    const categoryProducts = getProductsByCategory(category.id);
                    return (
                      <Card key={category.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{category.name}</h4>
                            {category.code && (
                              <p className="text-sm text-muted-foreground">{category.code}</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {categoryProducts.length} products
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={category.isActive ? "default" : "secondary"}>
                              {category.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-medium mb-4">Quick Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkEditOpen(true)}
                  >
                    <Folder className="h-4 w-4 mr-2" />
                    Add New Category
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Edit Modal */}
      <CategoryForm
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        onSuccess={onSuccess}
        mode="create"
      />
    </div>
  );
}