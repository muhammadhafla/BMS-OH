import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// import { Router } from 'express';
// import { PrismaClient } from '@prisma/client';
// import { authenticate, AuthenticatedRequest } from '../middleware/auth';
// import { z } from 'zod';

// const router = Router();
// const prisma = new PrismaClient();

// // const createAccountSchema = z.object({
// //   code: z.string().min(1),
// //   name: z.string().min(1),
// //   type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
// //   description: z.string().optional(),
// //   parentId: z.string().optional().nullable()
// // });

// // const updateAccountSchema = z.object({
// //   code: z.string().min(1).optional(),
// //   name: z.string().min(1).optional(),
// //   type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']).optional(),
// //   description: z.string().optional().nullable(),
// //   parentId: z.string().optional().nullable(),
// //   isActive: z.boolean().optional()
// // });

// // const createJournalEntrySchema = z.object({
// //   entryCode: z.string().min(1),
// //   date: z.string().datetime(),
// //   description: z.string().min(1),
// //   reference: z.string().optional(),
// //   items: z.array(z.object({
// //     accountId: z.string(),
// //     description: z.string(),
// //     debit: z.number().min(0).default(0),
// //     credit: z.number().min(0).default(0)
// //   })).min(2)
// // });

// Default chart of accounts
const defaultAccounts = [
  // Assets
  { code: '1110', name: 'Kas', type: 'ASSET', description: 'Uang tunai yang dimiliki perusahaan' },
  { code: '1120', name: 'Bank', type: 'ASSET', description: 'Uang yang disimpan di rekening bank' },
  { code: '1210', name: 'Piutang Usaha', type: 'ASSET', description: 'Uang yang akan diterima dari pelanggan' },
  { code: '1310', name: 'Persediaan Barang', type: 'ASSET', description: 'Nilai barang dagangan yang tersedia untuk dijual' },
  { code: '1510', name: 'Peralatan Kantor', type: 'ASSET', description: 'Nilai peralatan kantor seperti komputer, meja, dll' },

  // Liabilities
  { code: '2110', name: 'Utang Usaha', type: 'LIABILITY', description: 'Uang yang harus dibayarkan kepada pemasok' },
  { code: '2210', name: 'Utang Gaji', type: 'LIABILITY', description: 'Gaji yang belum dibayarkan kepada karyawan' },

  // Equity
  { code: '3110', name: 'Modal Disetor', type: 'EQUITY', description: 'Modal awal yang diinvestasikan oleh pemilik' },
  { code: '3210', name: 'Laba Ditahan', type: 'EQUITY', description: 'Akumulasi laba bersih yang tidak dibagikan sebagai dividen' },

  // Revenue
  { code: '4110', name: 'Pendapatan Penjualan', type: 'REVENUE', description: 'Pendapatan dari penjualan produk atau jasa' },

  // Expenses
  { code: '5110', name: 'Harga Pokok Penjualan (HPP)', type: 'EXPENSE', description: 'Biaya langsung yang terkait dengan produksi barang yang dijual' },
  { code: '5210', name: 'Beban Gaji', type: 'EXPENSE', description: 'Biaya gaji dan upah karyawan' },
  { code: '5220', name: 'Beban Sewa', type: 'EXPENSE', description: 'Biaya sewa untuk kantor atau toko' },
  { code: '5230', name: 'Beban Utilitas', type: 'EXPENSE', description: 'Biaya listrik, air, dan internet' }
];

// Seed chart of accounts with defaults
router.post('/seed-accounts', authenticate, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    // Only Admin can seed accounts
    if (req.user!.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'Only administrators can seed chart of accounts'
      });
      return;
    }

    const { branchId } = req.body;

    if (!branchId) {
      res.status(400).json({
        success: false,
        error: 'Branch ID is required'
      });
      return;
    }

    // Verify branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: branchId }
    });

    if (!branch) {
      res.status(404).json({
        success: false,
        error: 'Branch not found'
      });
      return;
    }

    // Check if accounts already exist for this branch
    const existingAccounts = await prisma.chartOfAccount.findMany({
      where: { branchId }
    });

    if (existingAccounts.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Chart of accounts already exists for this branch'
      });
      return;
    }

    // Create default accounts
    const accounts = await prisma.$transaction(
      defaultAccounts.map(account =>
        prisma.chartOfAccount.create({
          data: {
            ...account,
            branchId,
            isActive: true
          }
        })
      )
    );

    res.json({
      success: true,
      data: { accounts },
      message: 'Chart of accounts seeded successfully'
    });
  } catch (error) {
    console.error('Error seeding chart of accounts:', error);
    res.status(500).json({ success: false, error: 'Failed to seed chart of accounts' });
  }
});

// Get chart of accounts
router.get('/accounts', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      type,
      branchId,
      isActive = 'true'
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {
      isActive: isActive === 'true'
    };

    // Type filter
    if (type) {
      where.type = String(type);
    }

    // Branch filter
    if (branchId) {
      where.branchId = String(branchId);
    } else if (req.user!.role === 'STAFF') {
      where.branchId = req.user!.branchId;
    }

    const [accounts, total] = await Promise.all([
      prisma.chartOfAccount.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          branch: { select: { id: true, name: true } },
          parent: { select: { id: true, name: true, code: true } },
          _count: {
            select: {
              journalEntries: true,
              children: true
            }
          }
        },
        orderBy: [
          { type: 'asc' },
          { code: 'asc' }
        ]
      }),
      prisma.chartOfAccount.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        accounts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching chart of accounts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch chart of accounts' });
  }
});

// Get trial balance
router.get('/trial-balance', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { branchId, asOfDate } = req.query;

    const where: any = {
      isActive: true
    };

    if (branchId) {
      where.branchId = String(branchId);
    } else if (req.user!.role === 'STAFF') {
      where.branchId = req.user!.branchId;
    }

    // Get all accounts with their balances
    const accounts = await prisma.chartOfAccount.findMany({
      where,
      include: {
        journalEntryItems: asOfDate ? {
          where: {
            journalEntry: {
              date: { lte: new Date(String(asOfDate)) }
            }
          },
          select: {
            debit: true,
            credit: true
          }
        } : {
          select: {
            debit: true,
            credit: true
          }
        }
      },
      orderBy: [
        { type: 'asc' },
        { code: 'asc' }
      ]
    });

    // Calculate balances for each account
    const trialBalance = accounts.map(account => {
      let totalDebit = 0;
      let totalCredit = 0;

      account.journalEntryItems.forEach((item: any) => {
        totalDebit += Number(item.debit);
        totalCredit += Number(item.credit);
      });

      let balance = 0;
      let balanceType = '';

      if (['ASSET', 'EXPENSE'].includes(account.type)) {
        balance = totalDebit - totalCredit;
        if (balance > 0) {
          balanceType = 'DEBIT';
        } else if (balance < 0) {
          balanceType = 'CREDIT';
          balance = Math.abs(balance);
        }
      } else {
        balance = totalCredit - totalDebit;
        if (balance > 0) {
          balanceType = 'CREDIT';
        } else if (balance < 0) {
          balanceType = 'DEBIT';
          balance = Math.abs(balance);
        }
      }

      return {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        totalDebit,
        totalCredit,
        balance: Math.round(balance * 100) / 100,
        balanceType
      };
    });

    // Calculate totals
    const totals = trialBalance.reduce((acc: any, account: any) => {
      acc.totalDebit += account.totalDebit;
      acc.totalCredit += account.totalCredit;
      if (account.balanceType === 'DEBIT') {
        acc.balanceDebit += account.balance;
      } else if (account.balanceType === 'CREDIT') {
        acc.balanceCredit += account.balance;
      }
      return acc;
    }, {
      totalDebit: 0,
      totalCredit: 0,
      balanceDebit: 0,
      balanceCredit: 0
    });

    res.json({
      success: true,
      data: {
        trialBalance,
        totals: {
          ...totals,
          totalDebit: Math.round(totals.totalDebit * 100) / 100,
          totalCredit: Math.round(totals.totalCredit * 100) / 100,
          balanceDebit: Math.round(totals.balanceDebit * 100) / 100,
          balanceCredit: Math.round(totals.balanceCredit * 100) / 100
        },
        asOfDate: asOfDate ? String(asOfDate) : new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Error generating trial balance:', error);
    res.status(500).json({ success: false, error: 'Failed to generate trial balance' });
  }
});

export { router as accountingRouter };