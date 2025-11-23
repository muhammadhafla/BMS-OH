'use client';

import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import { CategoryTreeView } from './CategoryTreeView';
import { CategoryForm } from './CategoryForm';
import { Category, CategoryTreeNode } from '@/types/category';
import { apiService } from '@/services/api';
import { CategoryImportModal } from './CategoryImportModal';
import { CategoryStatsPanel } from './CategoryStatsPanel';
import { BulkCategoryOperations } from './BulkCategoryOperations';
import { CategoryTreeResponse, CategoryListResponse } from '@/types/api-responses';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Folder,
  Plus,
  Upload,
  Download,
  BarChart3,
  Settings,
  Package,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

// SWR fetcher
const fetcher = (url: string) => apiService.get(url);

interface CategoryManagementProps {
  className?: string;
}

export function CategoryManagement({ className }: CategoryManagementProps) {
  // State management
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formOpen, setFormOpen] = useState(false);
  const [parentId, setParentId] = useState<string | undefined>(undefined);
  const [importOpen, setImportOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch category tree data
  const { data: treeData, error: treeError, isLoading: treeLoading } = useSWR(
    '/api/categories/tree',
    fetcher,
    { revalidateOnFocus: false }
  );

  // Fetch categories for flat list
  const { data: categoriesData, error: categoriesError, isLoading: categoriesLoading } = useSWR(
    '/api/categories?limit=1000&includeProducts=true',
    fetcher,
    { revalidateOnFocus: false }
  );

  const categories = (categoriesData as CategoryListResponse)?.data?.items || [];
  const categoryTree = (treeData as CategoryTreeResponse)?.data?.tree || [];

  // Refresh all data
  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        mutate('/api/categories'),
        mutate('/api/categories/tree'),
        mutate('/api/categories?limit=1000&includeProducts=true')
      ]);
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // Handle category selection
  const handleCategorySelect = (category: CategoryTreeNode) => {
    // Convert tree node to full category if needed
    const fullCategory: Category = {
      id: category.id,
      name: category.name,
      code: category.code || '',
      description: category.description || '',
      parentId: category.parentId || '',
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      branchId: category.branchId || '',
    };
    setSelectedCategory(fullCategory);
  };

  // Handle category edit
  const handleCategoryEdit = (category: CategoryTreeNode) => {
    const fullCategory: Category = {
      id: category.id,
      name: category.name,
      code: category.code || '',
      description: category.description || '',
      parentId: category.parentId || '',
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      branchId: category.branchId || '',
    };
    setSelectedCategory(fullCategory);
    setFormMode('edit');
    setFormOpen(true);
  };

  // Handle category delete
  const handleCategoryDelete = async (category: CategoryTreeNode) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      const response = await apiService.deleteCategory(category.id);
      
      if (response.success) {
        toast.success('Category deleted successfully', {
          description: `"${category.name}" has been deleted.`,
        });
        
        // Refresh data
        refreshData();
        
        // Clear selection if this category was selected
        if (selectedCategory?.id === category.id) {
          setSelectedCategory(null);
        }
      } else {
        throw new Error(response.message || 'Failed to delete category');
      }
    } catch (error: any) {
      toast.error('Failed to delete category', {
        description: error.response?.data?.message || error.message,
      });
    }
  };

  // Handle add category
  const handleAddCategory = (parentId?: string) => {
    setParentId(parentId);
    setSelectedCategory(null);
    setFormMode('create');
    setFormOpen(true);
  };

  // Handle form success
  const handleFormSuccess = () => {
    setFormOpen(false);
    setSelectedCategory(null);
    setParentId(undefined);
    refreshData();
  };

  // Export categories to CSV
  const handleExportCategories = async () => {
    try {
      const blob = await apiService.exportCategories();
      
      // Create and download CSV
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'categories-export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Categories exported successfully');
    } catch (error: any) {
      toast.error('Failed to export categories', {
        description: error.response?.data?.message || error.message,
      });
    }
  };

  // Get total statistics
  const getTotalStats = () => {
    const totalCategories = categories.length;
    const activeCategories = categories.filter(c => c.isActive).length;
    const totalProducts = categories.reduce((sum, cat) => sum + (cat.products?.length || 0), 0);
    
    return { totalCategories, activeCategories, totalProducts };
  };

  const { totalCategories, activeCategories, totalProducts } = getTotalStats();

  // Loading state
  if (treeLoading || categoriesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Category Management</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="h-96 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  // Error state
  if (treeError || categoriesError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Category Management</h1>
          <Button onClick={refreshData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load categories. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Category Management</h1>
          <p className="text-muted-foreground">
            Organize your products with hierarchical categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={refreshData}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => handleExportCategories()}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={() => setImportOpen(true)}
            variant="outline"
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => handleAddCategory()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCategories}</div>
            <p className="text-xs text-muted-foreground">
              {activeCategories} active, {totalCategories - activeCategories} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Across all categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Category Hierarchy</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categoryTree.length > 0 ? '3' : '1'}
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum levels deep
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="tree" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tree">Category Tree</TabsTrigger>
          <TabsTrigger value="stats" disabled={!selectedCategory}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <Settings className="h-4 w-4 mr-2" />
            Bulk Operations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tree" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category Tree */}
            <div className="lg:col-span-2">
              <CategoryTreeView
                categories={categoryTree}
                {...(selectedCategory?.id && { selectedCategoryId: selectedCategory.id })}
                onCategorySelect={handleCategorySelect}
                onCategoryEdit={handleCategoryEdit}
                onCategoryDelete={handleCategoryDelete}
                onCategoryAdd={handleAddCategory}
                className="h-[600px]"
              />
            </div>

            {/* Category Details Panel */}
            <div className="space-y-6">
              {selectedCategory ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      {selectedCategory.name}
                    </CardTitle>
                    <CardDescription>
                      {selectedCategory.code && (
                        <Badge variant="outline" className="mr-2">
                          {selectedCategory.code}
                        </Badge>
                      )}
                      {selectedCategory.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={selectedCategory.isActive ? 'default' : 'secondary'}>
                        {selectedCategory.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Created:</span>{' '}
                        {new Date(selectedCategory.createdAt).toLocaleDateString('id-ID')}
                      </div>
                      <div>
                        <span className="font-medium">Updated:</span>{' '}
                        {new Date(selectedCategory.updatedAt).toLocaleDateString('id-ID')}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCategoryEdit(selectedCategory as CategoryTreeNode)}
                        className="flex-1"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddCategory(selectedCategory?.id)}
                        className="flex-1"
                      >
                        Add Subcategory
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground">
                      <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a category to view details</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleAddCategory()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Category
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {/* Navigate to bulk operations tab */}}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Bulk Operations
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleExportCategories}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Categories
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stats">
          {selectedCategory ? (
            <CategoryStatsPanel 
              categoryId={selectedCategory.id}
              categoryName={selectedCategory.name}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a category to view statistics</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bulk">
          <BulkCategoryOperations
            categories={categories}
            onSuccess={refreshData}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CategoryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
        category={selectedCategory}
        parentId={parentId}
        mode={formMode}
      />

      <CategoryImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={refreshData}
      />
    </div>
  );
}