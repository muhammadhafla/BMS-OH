'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Package, Search, Trash2, Edit, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CategoryTreeNode } from '@/types/category';

interface CategoryTreeViewProps {
  categories: CategoryTreeNode[];
  selectedCategoryId?: string;
  onCategorySelect?: (category: CategoryTreeNode) => void;
  onCategoryEdit?: (category: CategoryTreeNode) => void;
  onCategoryDelete?: (category: CategoryTreeNode) => void;
  onCategoryAdd?: (parentId?: string) => void;
  className?: string;
  showActions?: boolean;
}

interface TreeNodeProps {
  category: CategoryTreeNode;
  level: number;
  selectedCategoryId?: string | undefined;
  onSelect: (category: CategoryTreeNode) => void;
  onEdit: (category: CategoryTreeNode) => void;
  onDelete: (category: CategoryTreeNode) => void;
  onAdd: (parentId?: string | undefined) => void;
  showActions: boolean;
}

function TreeNode({
  category,
  level,
  selectedCategoryId,
  onSelect,
  onEdit,
  onDelete,
  onAdd,
  showActions
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const hasChildren = category.children && category.children.length > 0;
  const isSelected = selectedCategoryId === category.id;

  const handleToggleExpand = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleSelect = () => {
    onSelect(category);
  };

  const indentLevel = level * 20; // 20px per level

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors",
          isSelected && "bg-accent text-accent-foreground",
          level > 0 && "ml-4"
        )}
        style={{ paddingLeft: `${16 + indentLevel}px` }}
        onClick={handleSelect}
      >
        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleExpand();
          }}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : (
            <div className="h-3 w-3" />
          )}
        </Button>

        {/* Category Icon */}
        <div className="flex-shrink-0">
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500" />
            )
          ) : (
            <Package className="h-4 w-4 text-gray-500" />
          )}
        </div>

        {/* Category Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{category.name}</span>
            {category.code && (
              <Badge variant="outline" className="text-xs">
                {category.code}
              </Badge>
            )}
          </div>
          {category.description && (
            <p className="text-xs text-muted-foreground truncate">
              {category.description}
            </p>
          )}
        </div>

        {/* Product Count */}
        <div className="flex-shrink-0">
          <Badge variant="secondary" className="text-xs">
            {category.productCount}
          </Badge>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onAdd(category.id);
              }}
              title="Add subcategory"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(category);
              }}
              title="Edit category"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(category);
              }}
              title="Delete category"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {category.children?.map((child) => (
            <TreeNode
              key={child.id}
              category={child}
              level={level + 1}
              selectedCategoryId={selectedCategoryId}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onAdd={onAdd}
              showActions={showActions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryTreeView({
  categories,
  selectedCategoryId,
  onCategorySelect,
  onCategoryEdit,
  onCategoryDelete,
  onCategoryAdd,
  className,
  showActions = true
}: CategoryTreeViewProps) {
  const [, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-expand root level categories
  useEffect(() => {
    const rootIds = new Set(categories.map(c => c.id));
    setExpandedNodes(rootIds);
  }, [categories]);

  // Filter categories based on search term
  const filteredCategories = React.useMemo(() => {
    if (!searchTerm) return categories;

    const search = searchTerm.toLowerCase();
    const filteredArray: CategoryTreeNode[] = [];

    const filterNode = (node: CategoryTreeNode): CategoryTreeNode | null => {
      const matchesSearch =
        node.name.toLowerCase().includes(search) ||
        node.code?.toLowerCase().includes(search) ||
        node.description?.toLowerCase().includes(search);

      const filteredChildren = node.children
        ?.map(filterNode)
        .filter(Boolean) as CategoryTreeNode[] || [];

      if (matchesSearch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren
        };
      }

      return null;
    };

    categories.forEach(category => {
      const filtered = filterNode(category);
      if (filtered) {
        filteredArray.push(filtered);
      }
    });

    return filteredArray;
  }, [categories, searchTerm]);

  if (categories.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No categories found</h3>
        <p className="text-muted-foreground mb-4">
          Get started by creating your first category.
        </p>
        <Button onClick={() => onCategoryAdd?.()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with search and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Folder className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Categories</h2>
          <Badge variant="outline">{categories.length}</Badge>
        </div>
        
        {onCategoryAdd && (
          <Button size="sm" onClick={() => onCategoryAdd()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        )}
      </div>

      {/* Search Input */}
      {categories.length > 5 && (
        <div className="relative">
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-4 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Tree View */}
      <div className="border rounded-lg p-2 bg-card">
        {filteredCategories.length > 0 ? (
          <div className="space-y-1 group">
            {filteredCategories.map((category) => (
              <TreeNode
                key={category.id}
                category={category}
                level={0}
                selectedCategoryId={selectedCategoryId || undefined}
                onSelect={onCategorySelect || (() => {})}
                onEdit={onCategoryEdit || (() => {})}
                onDelete={onCategoryDelete || (() => {})}
                onAdd={onCategoryAdd || (() => {})}
                showActions={showActions}
              />
            ))}
          </div>
        ) : searchTerm ? (
          <div className="text-center py-8">
            <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No categories found for "{searchTerm}"</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}