import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBranchesAndUsers() {
  try {
    console.log('🔍 Checking branches and users...');
    
    const branches = await prisma.branch.findMany({
      select: {
        id: true,
        name: true
      }
    });
    
    console.log('📋 Branches:');
    console.log(JSON.stringify(branches, null, 2));
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        branchId: true
      }
    });
    
    console.log('👥 Users with branchId:');
    console.log(JSON.stringify(users, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBranchesAndUsers();