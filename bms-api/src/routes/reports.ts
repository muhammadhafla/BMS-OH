import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Schemas
const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  branchId: z.string().optional()
});

// Schema for future use - will be implemented in custom report feature
// const reportTypeSchema = z.enum(['sales', 'inventory', 'financial', 'customer', 'branch', 'comprehensive']);

// Get comprehensive business analytics
router.get('/analytics', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { startDate, endDate, branchId } = dateRangeSchema.parse(req.query);
    
    const where: any = {
      status: 'COMPLETED'
    };
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (branchId) {
      where.branchId = branchId;
    } else if (req.user!.role === 'STAFF') {
      where.branchId = req.user!.branchId;
    }

    // Core metrics
    const [
      revenueResult,
      totalTransactions,
      totalCustomers,
      totalProducts,
      avgOrderValue,
      conversionRate,
      topSellingProducts,
      revenueByMonth,
      paymentMethodBreakdown,
      branchPerformance
    ] = await Promise.all([
      // Total Revenue
      prisma.transaction.aggregate({
        where,
        _sum: { finalAmount: true }
      }),
      
      // Total Transactions
      prisma.transaction.count({ where }),
      
      // Unique Customers (if customer system exists)
      prisma.transaction.groupBy({
        by: ['userId'],
        where,
        _count: { userId: true }
      }),
      
      // Total Products in inventory
      prisma.product.count({
        where: branchId ? { branchId } : req.user!.role === 'STAFF' ? { branchId: req.user!.branchId } : {}
      }),
      
      // Average Order Value
      prisma.transaction.aggregate({
        where,
        _avg: { finalAmount: true }
      }),
      
      // Sales Performance (last 30 days vs previous 30 days)
      Promise.all([
        prisma.transaction.count({
          where: {
            ...where,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        prisma.transaction.count({
          where: {
            ...where,
            createdAt: {
              gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
              lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        })
      ]).then(([current, previous]) => ({
        current,
        previous,
        rate: previous > 0 ? ((current - previous) / previous) * 100 : 0
      })),
      
      // Top Selling Products
      prisma.transactionItem.groupBy({
        by: ['productId'],
        where: { transaction: where },
        _sum: { quantity: true, total: true },
        _count: { productId: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10
      }),
      
      // Revenue by Month (last 12 months)
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          SUM("finalAmount") as revenue,
          COUNT(*) as transactions
        FROM "transactions"
        WHERE "status" = 'COMPLETED'
          ${startDate && endDate ? prisma.$queryRaw`AND "createdAt" >= ${new Date(startDate)} AND "createdAt" <= ${new Date(endDate)}` : prisma.$queryRaw`AND "createdAt" >= NOW() - INTERVAL '12 months'`}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `,
      
      // Payment Method Breakdown
      prisma.transaction.groupBy({
        by: ['paymentMethod'],
        where,
        _sum: { finalAmount: true },
        _count: { paymentMethod: true }
      }),
      
      // Branch Performance (if admin/manager)
      req.user!.role !== 'STAFF' ? prisma.branch.findMany({
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              transactions: { where: { ...where, status: 'COMPLETED' } }
            }
          }
        }
      }).then(branches => 
        Promise.all(branches.map(async branch => ({
          ...branch,
          totalRevenue: await prisma.transaction.aggregate({
            where: { ...where, status: 'COMPLETED', branchId: branch.id },
            _sum: { finalAmount: true }
          })
        })))
      ) : []
    ]);

    // Get product details for top selling products
    const topProductsWithDetails = await Promise.all(
      topSellingProducts.map(async (item: any) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, sku: true, category: { select: { name: true } } }
        });
        return { 
          ...item, 
          product,
          category: product?.category?.name || 'Uncategorized'
        };
      })
    );

    const currentPeriodSales = conversionRate.current;
    const previousPeriodSales = conversionRate.previous;
    const salesGrowth = conversionRate.rate;

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: Number(revenueResult._sum.finalAmount || 0),
          totalTransactions,
          uniqueCustomers: totalCustomers.length,
          totalProducts,
          avgOrderValue: Number(avgOrderValue._avg.finalAmount || 0),
          salesGrowth: Math.round(salesGrowth * 100) / 100,
          period: {
            current: currentPeriodSales,
            previous: previousPeriodSales
          }
        },
        analytics: {
          topProducts: topProductsWithDetails,
          revenueByMonth,
          paymentMethods: paymentMethodBreakdown.map(pm => ({
            method: pm.paymentMethod,
            count: pm._count.paymentMethod,
            total: Number(pm._sum.finalAmount || 0)
          })),
          branchPerformance: branchPerformance || []
        },
        period: {
          startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: endDate || new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// Get sales performance report
router.get('/sales', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { startDate, endDate, branchId, groupBy = 'day' } = req.query;
    
    const where: any = {
      status: 'COMPLETED'
    };
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate))
      };
    }

    if (branchId) {
      where.branchId = String(branchId);
    } else if (req.user!.role === 'STAFF') {
      where.branchId = req.user!.branchId;
    }

    let dateTrunc;
    switch (groupBy) {
      case 'week':
        dateTrunc = 'week';
        break;
      case 'month':
        dateTrunc = 'month';
        break;
      default:
        dateTrunc = 'day';
    }

    // Sales trend data
    const salesTrend = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('${dateTrunc}', "createdAt") as period,
        SUM("finalAmount") as revenue,
        COUNT(*) as transactions,
        AVG("finalAmount") as avgOrderValue
      FROM "transactions"
      WHERE "status" = 'COMPLETED'
        ${startDate && endDate ? prisma.$queryRaw`AND "createdAt" >= ${new Date(String(startDate))} AND "createdAt" <= ${new Date(String(endDate))}` : prisma.$queryRaw`AND "createdAt" >= NOW() - INTERVAL '30 ${dateTrunc}s'`}
        ${branchId ? prisma.$queryRaw`AND "branchId" = ${String(branchId)}` : ''}
      GROUP BY DATE_TRUNC('${dateTrunc}', "createdAt")
      ORDER BY period ASC
    `;

    // Top products by revenue
    const topProductsRevenue = await prisma.transactionItem.groupBy({
      by: ['productId'],
      where: { transaction: where },
      _sum: { quantity: true, total: true },
      _count: { productId: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 20
    });

    // Product details with categories
    const productsWithDetails = await Promise.all(
      topProductsRevenue.map(async (item: any) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { 
            id: true, 
            name: true, 
            sku: true, 
            category: { select: { name: true } }
          }
        });
        return {
          ...item,
          product,
          category: product?.category?.name || 'Uncategorized'
        };
      })
    );

    // Payment method performance
    const paymentPerformance = await prisma.transaction.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: { finalAmount: true },
      _count: { paymentMethod: true },
      orderBy: { _sum: { finalAmount: 'desc' } }
    });

    res.json({
      success: true,
      data: {
        salesTrend,
        topProducts: productsWithDetails,
        paymentMethods: paymentPerformance.map(pm => ({
          method: pm.paymentMethod,
          count: pm._count.paymentMethod,
          total: Number(pm._sum.finalAmount || 0),
          percentage: 0 // Will be calculated on frontend
        })),
        filters: {
          dateRange: { startDate, endDate },
          branchId,
          groupBy
        }
      }
    });

  } catch (error) {
    console.error('Error fetching sales report:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sales report' });
  }
});

// Get inventory analytics report
router.get('/inventory', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { branchId } = req.query;
    
    const where: any = {};
    
    if (branchId) {
      where.branchId = String(branchId);
    } else if (req.user!.role === 'STAFF') {
      where.branchId = req.user!.branchId;
    }

    // Inventory overview
    const [
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalInventoryValue,
      categoryBreakdown,
      topValuedProducts
    ] = await Promise.all([
      prisma.product.count({
        where: { ...where, isActive: true }
      }),
      
      prisma.product.count({
        where: { 
          ...where, 
          isActive: true,
          stock: { lte: prisma.product.fields.minStock }
        }
      }),
      
      prisma.product.count({
        where: { 
          ...where, 
          isActive: true,
          stock: 0
        }
      }),
      
      prisma.product.aggregate({
        where: { ...where, isActive: true },
        _sum: {
          stock: true,
          price: true
        }
      }).then(result => {
        // Calculate total value (stock * price)
        return result._sum.stock && result._sum.price 
          ? Number(result._sum.stock) * Number(result._sum.price)
          : 0;
      }),
      
      prisma.category.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              products: { where: { ...where, isActive: true } }
            }
          }
        }
      }).then(async categories => 
        Promise.all(categories.map(async category => ({
          ...category,
          totalValue: await prisma.product.aggregate({
            where: { 
              ...where, 
              isActive: true, 
              categoryId: category.id 
            },
            _sum: { stock: true, price: true }
          }).then(result => 
            result._sum.stock && result._sum.price 
              ? Number(result._sum.stock) * Number(result._sum.price)
              : 0
          )
        })))
      ),
      
      prisma.product.findMany({
        where: { ...where, isActive: true },
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          price: true,
          minStock: true,
          category: { select: { name: true } }
        },
        orderBy: { stock: 'desc' },
        take: 20
      })
    ]);

    // Inventory turnover analysis (products with recent sales)
    const inventoryTurnover = await prisma.$queryRaw`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.stock,
        p.price,
        COALESCE(SUM(ti.quantity), 0) as sold_quantity,
        p.price * COALESCE(SUM(ti.quantity), 0) as sold_value
      FROM "products" p
      LEFT JOIN "transaction_items" ti ON p.id = ti."productId"
      LEFT JOIN "transactions" t ON ti."transactionId" = t.id
        AND t."status" = 'COMPLETED'
        AND t."createdAt" >= NOW() - INTERVAL '30 days'
      WHERE p."isActive" = true
        ${branchId ? prisma.$queryRaw`AND p."branchId" = ${String(branchId)}` : ''}
      GROUP BY p.id, p.name, p.sku, p.stock, p.price
      ORDER BY sold_quantity DESC
      LIMIT 50
    `;

    res.json({
      success: true,
      data: {
        summary: {
          totalProducts,
          lowStockProducts,
          outOfStockProducts,
          totalInventoryValue: Number(totalInventoryValue),
          healthyStock: totalProducts - lowStockProducts - outOfStockProducts
        },
        categoryBreakdown,
        topValuedProducts,
        inventoryTurnover,
        alerts: {
          lowStock: lowStockProducts,
          outOfStock: outOfStockProducts
        }
      }
    });

  } catch (error) {
    console.error('Error fetching inventory report:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inventory report' });
  }
});

// Get financial report (P&L, Balance Sheet components)
router.get('/financial', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    
    const where: any = {
      status: 'COMPLETED'
    };
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate))
      };
    }

    if (branchId) {
      where.branchId = String(branchId);
    } else if (req.user!.role === 'STAFF') {
      where.branchId = req.user!.branchId;
    }

    // Income Statement components
    const [
      totalCOGS,
      operatingExpenses
    ] = await Promise.all([
      // Cost of Goods Sold (using product cost * quantity sold)
      prisma.$queryRaw`
        SELECT SUM(p.cost * ti.quantity) as total_cogs
        FROM "transaction_items" ti
        JOIN "transactions" t ON ti."transactionId" = t.id
        JOIN "products" p ON ti."productId" = p.id
        WHERE t.status = 'COMPLETED'
          ${startDate && endDate ? prisma.$queryRaw`AND t.createdAt >= ${new Date(String(startDate))} AND t.createdAt <= ${new Date(String(endDate))}` : prisma.$queryRaw`AND t.createdAt >= NOW() - INTERVAL '30 days'`}
          ${branchId ? prisma.$queryRaw`AND t.branchId = ${String(branchId)}` : ''}
      `,
      
      // Operating Expenses (from journal entries)
      prisma.$queryRaw`
        SELECT 
          coa.name as account_name,
          coa.type,
          SUM(jei.debit - jei.credit) as total_amount
        FROM "journal_entry_items" jei
        JOIN "chart_of_accounts" coa ON jei."accountId" = coa.id
        JOIN "journal_entries" je ON jei."journalEntryId" = je.id
        WHERE coa.type = 'EXPENSE'
          ${startDate && endDate ? prisma.$queryRaw`AND je.date >= ${new Date(String(startDate))} AND je.date <= ${new Date(String(endDate))}` : prisma.$queryRaw`AND je.date >= NOW() - INTERVAL '30 days'`}
          ${branchId ? prisma.$queryRaw`AND je.branchId = ${String(branchId)}` : ''}
        GROUP BY coa.name, coa.type
      `
    ]);

    // Get total revenue separately to avoid circular dependency
    const totalRevenueData = await prisma.transaction.aggregate({
      where,
      _sum: { finalAmount: true }
    });

    const totalRevenueValue = Number(totalRevenueData._sum.finalAmount || 0);
    const totalCOGSValue = Number((totalCOGS as any)[0]?.total_cogs || 0);
    const grossProfitValue = totalRevenueValue - totalCOGSValue;
    const grossProfitMargin = totalRevenueValue > 0 ? (grossProfitValue / totalRevenueValue) * 100 : 0;

    res.json({
      success: true,
      data: {
        incomeStatement: {
          revenue: totalRevenueValue,
          costOfGoodsSold: totalCOGSValue,
          grossProfit: grossProfitValue,
          grossProfitMargin: Math.round(grossProfitMargin * 100) / 100,
          operatingExpenses: operatingExpenses,
          netIncome: 0, // Will be calculated
          revenueBreakdown: {
            byPaymentMethod: await prisma.transaction.groupBy({
              by: ['paymentMethod'],
              where,
              _sum: { finalAmount: true }
            })
          }
        },
        period: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('Error fetching financial report:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch financial report' });
  }
});

// Get customer analytics (placeholder for future customer management)
router.get('/customers', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;
    
    const where: any = {
      status: 'COMPLETED'
    };
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate))
      };
    }

    if (branchId) {
      where.branchId = String(branchId);
    } else if (req.user!.role === 'STAFF') {
      where.branchId = req.user!.branchId;
    }

    // Customer analytics based on transaction users
    const customerAnalytics = await prisma.transaction.groupBy({
      by: ['userId'],
      where,
      _sum: { finalAmount: true },
      _count: { userId: true },
      orderBy: { _sum: { finalAmount: 'desc' } },
      take: 50
    });

    // Get customer details
    const customersWithDetails = await Promise.all(
      customerAnalytics.map(async (customer: any) => {
        const user = await prisma.user.findUnique({
          where: { id: customer.userId },
          select: { 
            id: true, 
            name: true, 
            email: true,
            role: true,
            branch: { select: { name: true } }
          }
        });
        return {
          ...customer,
          user,
          totalSpent: Number(customer._sum.finalAmount || 0),
          transactionCount: customer._count.userId,
          avgOrderValue: customer._count.userId > 0 
            ? Number(customer._sum.finalAmount || 0) / customer._count.userId 
            : 0
        };
      })
    );

    res.json({
      success: true,
      data: {
        customers: customersWithDetails,
        summary: {
          totalCustomers: customerAnalytics.length,
          totalRevenue: customerAnalytics.reduce((sum: number, c: any) => 
            sum + Number(c._sum.finalAmount || 0), 0),
          avgCustomerValue: customerAnalytics.length > 0 
            ? customerAnalytics.reduce((sum: number, c: any) => 
                sum + Number(c._sum.finalAmount || 0), 0) / customerAnalytics.length
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching customer report:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch customer report' });
  }
});

// Generate custom report
router.post('/custom', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      reportType, 
      metrics, 
      dimensions, 
      filters
      // dateRange, // Will be implemented in future custom report feature
      // branchId   // Will be implemented in future custom report feature
    } = req.body;

    // This would be a complex implementation for custom report builder
    // For now, return a basic structure
    res.json({
      success: true,
      data: {
        message: 'Custom report generation feature coming soon',
        reportType,
        metrics,
        dimensions,
        filters,
        status: 'pending_implementation'
      }
    });

  } catch (error) {
    console.error('Error generating custom report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate custom report' });
  }
});

export { router as reportsRouter };