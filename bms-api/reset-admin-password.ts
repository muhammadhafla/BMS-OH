#!/usr/bin/env tsx

/**
 * URGENT PASSWORD RESET SCRIPT
 * 
 * This script resets the admin@bms.co.id password to the original value: 'password123'
 * 
 * Database Details:
 * - Email: admin@bms.co.id
 * - Target Password: password123
 * - Hash Method: bcrypt with 12 salt rounds
 * - Table: users
 * - Field: password
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@bms.co.id';
const ORIGINAL_PASSWORD = 'password123';
const SALT_ROUNDS = 12;

async function resetAdminPassword() {
  console.log('🔑 Starting URGENT admin password reset...');
  console.log('=' .repeat(50));

  try {
    // Step 1: Generate the correct bcrypt hash
    console.log('🔐 Step 1: Generating bcrypt hash...');
    const hashedPassword = await bcrypt.hash(ORIGINAL_PASSWORD, SALT_ROUNDS);
    console.log(`✅ Generated hash for '${ORIGINAL_PASSWORD}' with ${SALT_ROUNDS} salt rounds`);
    console.log(`Hash preview: ${hashedPassword.substring(0, 20)}...`);

    // Step 2: Update the admin user password
    console.log('\n📝 Step 2: Updating admin user password in database...');
    
    const updatedUser = await prisma.user.update({
      where: { 
        email: ADMIN_EMAIL 
      },
      data: { 
        password: hashedPassword,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true
      }
    });

    console.log(`✅ Successfully updated user: ${updatedUser.email}`);
    console.log(`   Name: ${updatedUser.name}`);
    console.log(`   Role: ${updatedUser.role}`);
    console.log(`   Updated: ${updatedUser.updatedAt.toISOString()}`);

    // Step 3: Verify the password was updated correctly
    console.log('\n🔍 Step 3: Verifying password reset...');
    
    // Fetch the user to verify the password
    const userToVerify = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: {
        email: true,
        password: true
      }
    });

    if (!userToVerify) {
      throw new Error(`User with email ${ADMIN_EMAIL} not found!`);
    }

    // Test password verification
    const isPasswordValid = await bcrypt.compare(ORIGINAL_PASSWORD, userToVerify.password);
    
    if (isPasswordValid) {
      console.log('✅ Password verification PASSED!');
      console.log('   The admin user can now log in with:');
      console.log(`   📧 Email: ${ADMIN_EMAIL}`);
      console.log(`   🔐 Password: ${ORIGINAL_PASSWORD}`);
    } else {
      console.log('❌ Password verification FAILED!');
      console.log('   There may be an issue with the password hash.');
      throw new Error('Password verification failed after update');
    }

    console.log('\n🎉 SUCCESS: Admin password has been reset to original value!');
    console.log('=' .repeat(50));
    
    return {
      success: true,
      email: ADMIN_EMAIL,
      password: ORIGINAL_PASSWORD,
      userId: updatedUser.id,
      updatedAt: updatedUser.updatedAt
    };

  } catch (error) {
    console.error('❌ ERROR: Failed to reset admin password');
    console.error('Error details:', error instanceof Error ? error.message : error);
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      console.error(`\n⚠️  User ${ADMIN_EMAIL} was not found in the database.`);
      console.error('   Possible reasons:');
      console.error('   - The database has not been seeded yet');
      console.error('   - The email address is different');
      console.error('   - Database connection issue');
    }
    
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Ensure the database is running');
    console.log('2. Run `npm run prisma:seed` to seed the database');
    console.log('3. Check the DATABASE_URL in your .env file');
    console.log('4. Verify the admin user exists: `npm run prisma:studio`');
    
    throw error;
  }
}

// Main execution
async function main() {
  try {
    const result = await resetAdminPassword();
    
    console.log('\n📋 SUMMARY:');
    console.log(`✅ Admin user: ${result.email}`);
    console.log(`✅ Password reset to: ${result.password}`);
    console.log(`✅ User ID: ${result.userId}`);
    console.log(`✅ Timestamp: ${result.updatedAt.toISOString()}`);
    
    console.log('\n🚀 The admin user can now log in with the original password!');
    console.log('🎯 MISSION ACCOMPLISHED!');
    
  } catch (error) {
    console.error('\n💥 CRITICAL: Password reset failed!');
    process.exit(1);
  } finally {
    // Close database connection
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { resetAdminPassword };