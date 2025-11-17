const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProducts() {
  try {
    console.log('🔍 Checking products in database...');
    
    const products = await prisma.product.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
        isActive: true,
        branchId: true,
        price: true,
        stock: true
      }
    });
    
    console.log(`✅ Found ${products.length} products total`);
    console.log('📋 Sample products:');
    console.log(JSON.stringify(products.slice(0, 3), null, 2));
    
    const activeProducts = products.filter(p => p.isActive === true);
    console.log(`✅ Active products: ${activeProducts.length}`);
    
    const inactiveProducts = products.filter(p => p.isActive === false);
    console.log(`❌ Inactive products: ${inactiveProducts.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();