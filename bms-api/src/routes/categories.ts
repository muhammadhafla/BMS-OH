import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const categorySchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  branchId: z.string().optional()
});

// Get all categories with pagination and search
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      parentId,
      branchId,
      isActive = true,
      includeProducts = false
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {
      isActive: isActive === 'true'
    };

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { code: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    if (parentId !== undefined && parentId !== '') {
      where.parentId = parentId === 'null' ? null : String(parentId);
    }

    if (branchId) {
      where.OR = [
        { branchId: String(branchId) },
        { branchId: null } // Include global categories
      ];
    } else if (req.user!.role === 'STAFF') {
      where.OR = [
        { branchId: req.user!.branchId },
        { branchId: null } // Include global categories
      ];
    }

    const include: any = {
      parent: { select: { id: true, name: true, code: true } },
      children: { 
        select: { 
          id: true, 
          name: true, 
          code: true, 
          isActive: true 
        } 
      },
      branch: { select: { id: true, name: true } }
    };

    if (includeProducts === 'true') {
      include.products = { 
        select: { 
          id: true, 
          name: true, 
          sku: true, 
          price: true, 
          stock: true, 
          isActive: true 
        } 
      };
    }

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take: Number(limit),
        include,
        orderBy: [
          { name: 'asc' }
        ]
      }),
      prisma.category.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        categories,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// Get category tree structure
router.get('/tree', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { branchId } = req.query;

    const where: any = { isActive: true };

    if (branchId) {
      where.OR = [
        { branchId: String(branchId) },
        { branchId: null } // Include global categories
      ];
    } else if (req.user!.role === 'STAFF') {
      where.OR = [
        { branchId: req.user!.branchId },
        { branchId: null } // Include global categories
      ];
    }

    // Get all root categories (no parent)
    const rootCategories = await prisma.category.findMany({
      where: { ...where, parentId: null },
      include: {
        children: {
          where: { isActive: true },
          include: {
            children: {
              where: { isActive: true },
              include: {
                _count: {
                  select: { products: true }
                }
              }
            },
            _count: {
              select: { products: true }
            }
          }
        },
        _count: {
          select: { products: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Function to calculate product count recursively
    const calculateProductCount = (category: any): any => ({
      ...category,
      productCount: category._count.products,
      children: category.children?.map(calculateProductCount) || []
    });

    const tree = rootCategories.map(calculateProductCount);

    res.json({
      success: true,
      data: { tree }
    });
  } catch (error) {
    console.error('Error fetching category tree:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch category tree' });
  }
});

// Get category by ID
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: { 
          select: { 
            id: true, 
            name: true, 
            code: true, 
            isActive: true 
          } 
        },
        products: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            stock: true,
            isActive: true
          }
        },
        branch: { select: { id: true, name: true } }
      }
    });

    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // Check permission
    if (req.user!.role === 'STAFF' && 
        category.branchId && 
        category.branchId !== req.user!.branchId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, data: { category } });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch category' });
  }
});

// Create new category
router.post('/', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const data = categorySchema.parse(req.body);

    // Check if code is unique
    if (data.code) {
      const existingCategory = await prisma.category.findUnique({
        where: { code: data.code }
      });

      if (existingCategory) {
        return res.status(400).json({ 
          success: false, 
          error: 'Category code already exists' 
        });
      }
    }

    // Validate parent category if provided
    if (data.parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: data.parentId }
      });

      if (!parentCategory) {
        return res.status(400).json({ 
          success: false, 
          error: 'Parent category not found' 
        });
      }

      // Check if parent is active
      if (!parentCategory.isActive) {
        return res.status(400).json({ 
          success: false, 
          error: 'Cannot create child category under inactive parent' 
        });
      }

      // Check hierarchy depth (max 3 levels)
      const getCategoryDepth = async (categoryId: string): Promise<number> => {
        let depth = 0;
        let currentId = categoryId;
        
        while (currentId) {
          const category = await prisma.category.findUnique({
            where: { id: currentId },
            select: { parentId: true }
          });
          
          if (category?.parentId) {
            depth++;
            currentId = category.parentId;
          } else {
            break;
          }
        }
        
        return depth;
      };

      const depth = await getCategoryDepth(data.parentId);
      if (depth >= 2) { // 0 = root, 1 = level 1, 2 = level 2 (max)
        return res.status(400).json({ 
          success: false, 
          error: 'Maximum category hierarchy depth reached (3 levels)' 
        });
      }
    }

    // Check permission for branch-specific categories
    if (data.branchId) {
      if (req.user!.role === 'STAFF' && data.branchId !== req.user!.branchId) {
        return res.status(403).json({ 
          success: false, 
          error: 'Access denied' 
        });
      }
    } else if (req.user!.role === 'STAFF') {
      // Staff can only create categories for their branch
      data.branchId = req.user!.branchId;
    }

    // Check name uniqueness within the same parent
    const existingSibling = await prisma.category.findFirst({
      where: {
        name: data.name,
        parentId: data.parentId,
        isActive: true
      }
    });

    if (existingSibling) {
      return res.status(400).json({ 
        success: false, 
        error: 'Category name must be unique within the same parent' 
      });
    }

    const category = await prisma.category.create({
      data,
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: { 
          select: { 
            id: true, 
            name: true, 
            code: true, 
            isActive: true 
          } 
        },
        branch: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ 
      success: true, 
      data: { category },
      message: 'Category created successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
});

// Update category
router.put('/:id', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    const data = categorySchema.partial().parse(req.body);

    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        children: true
      }
    });

    if (!existingCategory) {
      return res.status(404).json({ 
        success: false, 
        error: 'Category not found' 
      });
    }

    // Check permission
    if (req.user!.role === 'STAFF' && 
        existingCategory.branchId && 
        existingCategory.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Check code uniqueness if being updated
    if (data.code && data.code !== existingCategory.code) {
      const duplicateCode = await prisma.category.findUnique({
        where: { code: data.code }
      });
      
      if (duplicateCode) {
        return res.status(400).json({ 
          success: false, 
          error: 'Category code already exists' 
        });
      }
    }

    // Cannot deactivate if has active children
    if (data.isActive === false && existingCategory.children.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot deactivate category with child categories' 
      });
    }

    // Validate new parent if provided
    if (data.parentId) {
      // Cannot set as child of itself
      if (data.parentId === id) {
        return res.status(400).json({ 
          success: false, 
          error: 'Category cannot be its own parent' 
        });
      }

      // Cannot set as child of its own descendants
      const isDescendant = async (parentId: string, childId: string): Promise<boolean> => {
        const category = await prisma.category.findUnique({
          where: { id: parentId },
          select: { parentId: true }
        });
        
        if (!category || !category.parentId) return false;
        if (category.parentId === childId) return true;
        return isDescendant(category.parentId, childId);
      };

      if (await isDescendant(data.parentId, id)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Cannot move category under its own descendant' 
        });
      }

      // Check hierarchy depth
      const getCategoryDepth = async (categoryId: string): Promise<number> => {
        let depth = 0;
        let currentId = categoryId;
        
        while (currentId) {
          const category = await prisma.category.findUnique({
            where: { id: currentId },
            select: { parentId: true }
          });
          
          if (category?.parentId) {
            depth++;
            currentId = category.parentId;
          } else {
            break;
          }
        }
        
        return depth;
      };

      const depth = await getCategoryDepth(data.parentId);
      if (depth >= 2) {
        return res.status(400).json({ 
          success: false, 
          error: 'Maximum category hierarchy depth reached (3 levels)' 
        });
      }
    }

    // Check name uniqueness within the same parent
    if (data.name && data.name !== existingCategory.name) {
      const existingSibling = await prisma.category.findFirst({
        where: {
          name: data.name,
          parentId: data.parentId || existingCategory.parentId,
          isActive: true,
          NOT: { id }
        }
      });

      if (existingSibling) {
        return res.status(400).json({ 
          success: false, 
          error: 'Category name must be unique within the same parent' 
        });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data,
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: { 
          select: { 
            id: true, 
            name: true, 
            code: true, 
            isActive: true 
          } 
        },
        branch: { select: { id: true, name: true } }
      }
    });

    res.json({ 
      success: true, 
      data: { category },
      message: 'Category updated successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid input data',
        details: error.errors 
      });
    }
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;

    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    if (!existingCategory) {
      return res.status(404).json({ 
        success: false, 
        error: 'Category not found' 
      });
    }

    // Check permission
    if (req.user!.role === 'STAFF' && 
        existingCategory.branchId && 
        existingCategory.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Cannot delete if has child categories
    if (existingCategory.children.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete category with child categories. Please delete or move child categories first.' 
      });
    }

    // Check if category has products
    if (existingCategory._count.products > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot delete category with ${existingCategory._count.products} products. Please move products to another category first.` 
      });
    }

    // Hard delete the category
    await prisma.category.delete({
      where: { id }
    });

    res.json({ 
      success: true, 
      message: 'Category deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
});

// Get category statistics
router.get('/:id/stats', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id }
    });

    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // Get direct products count
    const directProductsCount = await prisma.product.count({
      where: { categoryId: id, isActive: true }
    });

    // Get all descendant categories
    const getDescendantIds = async (categoryId: string): Promise<string[]> => {
      const children = await prisma.category.findMany({
        where: { parentId: categoryId, isActive: true },
        select: { id: true }
      });

      let descendants = children.map(c => c.id);
      for (const child of children) {
        const childDescendants = await getDescendantIds(child.id);
        descendants = [...descendants, ...childDescendants];
      }

      return descendants;
    };

    const descendantIds = await getDescendantIds(id);

    // Get total products count (including descendants)
    const totalProductsCount = await prisma.product.count({
      where: {
        categoryId: { in: [id, ...descendantIds] },
        isActive: true
      }
    });

    // Get total stock value
    const stockValue = await prisma.product.aggregate({
      where: {
        categoryId: { in: [id, ...descendantIds] },
        isActive: true
      },
      _sum: {
        stock: true
      }
    });

    // Get low stock products count - Need to get all products and filter in memory
    const allProducts = await prisma.product.findMany({
      where: {
        categoryId: { in: [id, ...descendantIds] },
        isActive: true
      },
      select: { stock: true, minStock: true }
    });
    
    const lowStockCount = allProducts.filter(product => product.stock <= product.minStock).length;

    res.json({
      success: true,
      data: {
        directProductsCount,
        totalProductsCount,
        totalStock: stockValue._sum.stock || 0,
        lowStockCount,
        descendantCategoriesCount: descendantIds.length
      }
    });
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch category statistics' });
  }
});

// Bulk update products category
router.patch('/bulk-update-products', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { productIds, categoryId } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Product IDs array is required' 
      });
    }

    if (!categoryId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Category ID is required' 
      });
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return res.status(404).json({ 
        success: false, 
        error: 'Category not found' 
      });
    }

    // Check permission
    if (req.user!.role === 'STAFF' && 
        category.branchId && 
        category.branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Update products
    const updatedProducts = await prisma.product.updateMany({
      where: {
        id: { in: productIds },
        branchId: req.user!.role === 'STAFF' ? req.user!.branchId : undefined
      },
      data: { categoryId }
    });

    res.json({ 
      success: true, 
      data: { updatedCount: updatedProducts.count },
      message: `${updatedProducts.count} products updated successfully` 
    });
  } catch (error) {
    console.error('Error bulk updating products:', error);
    res.status(500).json({ success: false, error: 'Failed to bulk update products' });
  }
});

// CSV Import functionality
router.post('/import-csv', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    // Only Admin and Manager can import categories
    if (!['ADMIN', 'MANAGER'].includes(req.user!.role)) {
      res.status(403).json({
        success: false,
        error: 'Only administrators and managers can import categories'
      });
      return;
    }

    const { csvData, branchId } = req.body;

    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'CSV data is required' 
      });
    }

    if (!branchId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Branch ID is required' 
      });
    }

    // Verify branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: branchId }
    });

    if (!branch) {
      return res.status(404).json({ 
        success: false, 
        error: 'Branch not found' 
      });
    }

    // Check permission
    if (req.user!.role === 'MANAGER' && branchId !== req.user!.branchId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    // Parse CSV data
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'CSV must contain at least a header row and one data row' 
      });
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    // Expected headers
    const requiredHeaders = ['name'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Missing required columns: ${missingHeaders.join(', ')}` 
      });
    }

    // Process data rows
    const results: {
      success: Array<{ row: number; name: string; code?: string; id: string }>;
      errors: Array<{ row: number; error: string; name?: string }>;
      total: number;
      created: number;
      skipped: number;
      failed: number;
    } = {
      success: [],
      errors: [],
      total: 0,
      created: 0,
      skipped: 0,
      failed: 0
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      results.total++;
      
      try {
        // Parse CSV line (handle quoted fields)
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());
        
        // Create object from header and values
        const categoryData: any = {};
        headers.forEach((header, index) => {
          let value = values[index] || '';
          // Remove quotes if present
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          categoryData[header] = value;
        });

        // Validate required fields
        if (!categoryData.name) {
          results.errors.push({
            row: i + 1,
            error: 'Name is required'
          });
          results.failed++;
          continue;
        }

        // Check for duplicate code
        if (categoryData.code) {
          const existingCategory = await prisma.category.findUnique({
            where: { code: categoryData.code }
          });

          if (existingCategory) {
            results.errors.push({
              row: i + 1,
              error: 'Category code already exists',
              name: categoryData.name
            });
            results.failed++;
            continue;
          }
        }

        // Create category data object
        const newCategory = {
          name: categoryData.name,
          code: categoryData.code || null,
          description: categoryData.description || null,
          branchId,
          isActive: categoryData.isactive !== 'false'
        };

        // Create category
        const category = await prisma.category.create({
          data: newCategory
        });

        results.success.push({
          row: i + 1,
          name: category.name,
          code: category.code || undefined,
          id: category.id
        });
        results.created++;

      } catch (error) {
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        results.failed++;
      }
    }

    res.json({
      success: results.failed === 0,
      data: results,
      message: `Import completed. ${results.created} categories created, ${results.skipped} skipped, ${results.failed} failed.`
    });

  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({ success: false, error: 'Failed to import categories from CSV' });
  }
});

// Download sample CSV template
router.get('/sample-csv', authenticate, async (_req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const sampleData = [
      [
        'name',
        'code',
        'description',
        'isactive'
      ],
      [
        'Electronics',
        'ELEC',
        'Electronic devices and accessories',
        'true'
      ],
      [
        'Computers',
        'COMP',
        'Desktop and laptop computers',
        'true'
      ],
      [
        'Mobile Phones',
        'MOB',
        'Smartphones and mobile devices',
        'true'
      ]
    ];

    const csvContent = sampleData.map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="category-import-template.csv"');
    res.send(csvContent);

  } catch (error) {
    console.error('Error generating sample CSV:', error);
    res.status(500).json({ success: false, error: 'Failed to generate sample CSV' });
  }
});

// Export categories to CSV
router.get('/export-csv', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
  try {
    const { branchId } = req.query;

    const where: any = { isActive: true };

    if (branchId) {
      where.OR = [
        { branchId: String(branchId) },
        { branchId: null }
      ];
    } else if (req.user!.role === 'STAFF') {
      where.OR = [
        { branchId: req.user!.branchId },
        { branchId: null }
      ];
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        parent: { select: { name: true, code: true } },
        branch: { select: { name: true } },
        _count: { select: { products: true } }
      },
      orderBy: [
        { parentId: 'asc' },
        { name: 'asc' }
      ]
    });

    const csvData = [
      ['name', 'code', 'description', 'parent', 'products_count', 'branch', 'isactive'],
      ...categories.map(category => [
        category.name,
        category.code || '',
        category.description || '',
        category.parent ? `${category.parent.name} (${category.parent.code})` : '',
        category._count.products,
        category.branch ? category.branch.name : 'Global',
        category.isActive.toString()
      ])
    ];

    const csvContent = csvData.map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="categories-export.csv"');
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ success: false, error: 'Failed to export categories' });
  }
});

export { router as categoriesRouter };