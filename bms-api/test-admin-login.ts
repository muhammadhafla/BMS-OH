#!/usr/bin/env tsx

/**
 * LOGIN VERIFICATION TEST
 * 
 * This script tests that the admin user can successfully log in 
 * with the restored password: 'password123'
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@bms.co.id';
const ADMIN_PASSWORD = 'password123';

async function testAdminLogin() {
  console.log('🔐 Testing Admin Login Functionality');
  console.log('=' .repeat(40));

  try {
    // Find the admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        isActive: true
      }
    });

    if (!adminUser) {
      throw new Error(`Admin user ${ADMIN_EMAIL} not found!`);
    }

    console.log(`✅ Found admin user: ${adminUser.email}`);
    console.log(`   Name: ${adminUser.name}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Active: ${adminUser.isActive}`);

    // Test password verification
    const isPasswordValid = await bcrypt.compare(ADMIN_PASSWORD, adminUser.password);
    
    if (!isPasswordValid) {
      throw new Error('Password verification failed!');
    }

    console.log('✅ Password verification: PASSED');
    console.log('✅ Login test: SUCCESSFUL');
    
    console.log('\n🎯 FINAL RESULT:');
    console.log('=' .repeat(20));
    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log(`🔐 Password: ${ADMIN_PASSWORD}`);
    console.log(`✅ Status: READY FOR LOGIN`);
    console.log('\n🚀 The admin user can successfully log in!');
    
    return true;

  } catch (error) {
    console.error('❌ LOGIN TEST FAILED');
    console.error('Error:', error instanceof Error ? error.message : error);
    return false;
  }
}

// Main execution
async function main() {
  try {
    const success = await testAdminLogin();
    
    if (success) {
      console.log('\n🎉 MISSION ACCOMPLISHED!');
      console.log('The admin password has been successfully restored and tested.');
    } else {
      console.log('\n❌ MISSION FAILED!');
      console.log('There may be an issue with the password reset.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { testAdminLogin };