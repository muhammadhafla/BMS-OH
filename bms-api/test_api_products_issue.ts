#!/usr/bin/env npx tsx

/**
 * Test script to reproduce and diagnose the products API issue
 * This will test the exact scenario that causes 18 products to appear as empty
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  test: string;
  passed: boolean;
  details: any;
}

async function testAPIProductsIssue(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    console.log('🔍 Testing API Products Issue Diagnosis\n');

    // 1. Test direct database query (should show all 18 products)
    console.log('1️⃣ Testing direct database query...');
    const allProducts = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        branch: { select: { name: true } }
      }
    });
    
    results.push({
      test: 'Direct database query',
      passed: allProducts.length === 18,
      details: {
        found: allProducts.length,
        expected: 18,
        sample: allProducts.slice(0, 3).map(p => ({
          id: p.id,
          name: p.name,
          branch: p.branch.name
        }))
      }
    });
    console.log(`✅ Found ${allProducts.length} products in database\n`);

    // 2. Test API without authentication (should fail)
    console.log('2️⃣ Testing API without authentication...');
    try {
      await axios.get('http://localhost:3001/api/products');
      results.push({
        test: 'API without auth (should fail)',
        passed: false,
        details: 'API call should have failed without authentication'
      });
    } catch (error: any) {
      results.push({
        test: 'API without auth (should fail)',
        passed: error.response?.status === 401,
        details: `Expected 401, got ${error.response?.status || 'no response'}`
      });
    }

    // 3. Test API with login to get token
    console.log('3️⃣ Testing API login...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@bms.co.id',
      password: 'admin123'
    });

    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    
    results.push({
      test: 'API login',
      passed: !!token && !!user,
      details: {
        userRole: user.role,
        userBranch: user.branchId,
        tokenLength: token.length
      }
    });
    console.log(`✅ Logged in as ${user.role} (${user.branchId})\n`);

    // 4. Test API with Admin token (should see all products)
    console.log('4️⃣ Testing API with Admin token...');
    const adminResponse = await axios.get('http://localhost:3001/api/products', {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 1000 }
    });

    results.push({
      test: 'API with Admin token',
      passed: adminResponse.data.data.products.length > 0,
      details: {
        found: adminResponse.data.data.products.length,
        totalInResponse: adminResponse.data.data.pagination.total
      }
    });
    console.log(`✅ Admin sees ${adminResponse.data.data.products.length} products\n`);

    // 5. Test API with STAFF token (should only see branch products)
    console.log('5️⃣ Testing API with STAFF token...');
    const staffLoginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'staff1@bms.co.id',
      password: 'staff123'
    });

    const staffToken = staffLoginResponse.data.data.token;
    const staffUser = staffLoginResponse.data.data.user;

    const staffResponse = await axios.get('http://localhost:3001/api/products', {
      headers: { Authorization: `Bearer ${staffToken}` },
      params: { limit: 1000 }
    });

    results.push({
      test: 'API with STAFF token (branch filtering)',
      passed: staffResponse.data.data.products.length === 6, // Should only see their branch products
      details: {
        found: staffResponse.data.data.products.length,
        userBranch: staffUser.branchId,
        explanation: 'STAFF users should only see products from their branch'
      }
    });
    console.log(`✅ STAFF sees ${staffResponse.data.data.products.length} products (branch-filtered)\n`);

    // 6. Test API with branchId parameter (should override filtering)
    console.log('6️⃣ Testing API with explicit branchId parameter...');
    const branchResponse = await axios.get('http://localhost:3001/api/products', {
      headers: { Authorization: `Bearer ${staffToken}` },
      params: { 
        limit: 1000,
        branchId: 'cmhxgyzdr0000ut83ek2yizuw' // Specify branch explicitly
      }
    });

    results.push({
      test: 'API with explicit branchId parameter',
      passed: branchResponse.data.data.products.length > 0,
      details: {
        found: branchResponse.data.data.products.length,
        requestedBranch: 'cmhxgyzdr0000ut83ek2yizuw'
      }
    });
    console.log(`✅ With explicit branchId: ${branchResponse.data.data.products.length} products\n`);

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    results.push({
      test: 'Overall test execution',
      passed: false,
      details: error.message
    });
  }

  return results;
}

async function main() {
  console.log('🚀 Starting API Products Issue Diagnosis\n');
  
  const results = await testAPIProductsIssue();
  
  console.log('📊 Test Results Summary:');
  console.log('='.repeat(50));
  
  results.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${status} - ${result.test}`);
    console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    console.log();
  });

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n✅ DIAGNOSIS COMPLETE: Issue confirmed - STAFF users see filtered results');
    console.log('\n💡 SOLUTION: Frontend should send branchId parameter or modify API logic');
  } else {
    console.log('\n❌ Some tests failed - need investigation');
  }
}

main().catch(console.error);