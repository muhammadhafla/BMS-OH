import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-password-reset-testing';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  
  // Setup test database connection
  const prisma = new PrismaClient();
  await prisma.$connect();
  
  console.log('🧪 Test environment setup completed');
});

// Global test teardown
afterAll(async () => {
  const prisma = new PrismaClient();
  await prisma.$disconnect();
  console.log('🧹 Test environment cleanup completed');
});

// Global beforeEach to clean up database
beforeEach(async () => {
  const prisma = new PrismaClient();
  
  // Clean up test data before each test (order matters due to foreign keys)
  await prisma.passwordResetToken.deleteMany({});
  await prisma.transactionItem.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.inventoryLog.deleteMany({});
  await prisma.purchaseItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.cashDrawerActivity.deleteMany({});
  await prisma.cashDrawerSession.deleteMany({});
  await prisma.journalEntryItem.deleteMany({});
  await prisma.journalEntry.deleteMany({});
  await prisma.chartOfAccount.deleteMany({});
});

// Export Prisma client for tests
export const testPrisma = new PrismaClient();