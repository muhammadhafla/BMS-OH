import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProductsByBranch() {
  try {
    console.log('🔍 Checking products distribution by branch...');
    
    const products = await prisma.product.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
        branchId: true
      }
    });
    
    // Group by branchId
    const productsByBranch = products.reduce((acc, product) => {
      if (!acc[product.branchId]) {
        acc[product.branchId] = [];
      }
      acc[product.branchId].push(product);
      return acc;
    }, {} as Record<string, any[]>);
    
    console.log('📋 Products by Branch:');
    Object.entries(productsByBranch).forEach(([branchId, products]) => {
      console.log(`Branch ${branchId}: ${products.length} products`);
    });
    
    // Get branch names
    const branches = await prisma.branch.findMany();
    const branchMap = branches.reduce((acc, branch) => {
      acc[branch.id] = branch.name;
      return acc;
    }, {} as Record<string, string>);
    
    console.log('\n📊 Detailed breakdown:');
    Object.entries(productsByBranch).forEach(([branchId, products]) => {
      console.log(`\n🏢 ${branchMap[branchId]} (${branchId}): ${products.length} products`);
      products.slice(0, 3).forEach(product => {
        console.log(`  - ${product.sku}: ${product.name}`);
      });
      if (products.length > 3) {
        console.log(`  ... and ${products.length - 3} more`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductsByBranch();