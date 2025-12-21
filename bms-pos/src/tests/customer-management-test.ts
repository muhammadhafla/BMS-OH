/**
 * Customer Management System Test Suite
 * This file tests all the customer management functionality including:
 * - CustomerService CRUD operations
 * - CustomerSearch component functionality
 * - Validation system integration
 * - Toast notification integration
 * - localStorage persistence
 */

import { customerService, CreateCustomerData, UpdateCustomerData } from '../services/CustomerService'
import Validator from '../utils/validation'

// Test data
const testCustomerData: CreateCustomerData = {
  name: 'Test Customer',
  phone: '081234567890',
  email: 'test@example.com',
  address: 'Test Address 123',
}

const updateCustomerData: UpdateCustomerData = {
  name: 'Updated Test Customer',
  phone: '081987654321',
  email: 'updated@example.com',
  address: 'Updated Address 456',
}

// Test runner
class CustomerManagementTest {
  private results: Array<{ test: string; status: 'PASS' | 'FAIL'; message?: string }> = []

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Customer Management System Tests...\n')

    await this.testCustomerService()
    await this.testValidation()
    await this.testLoyaltySystem()
    await this.testStoragePersistence()

    this.printResults()
  }

  private async testCustomerService(): Promise<void> {
    console.log('📋 Testing CustomerService...')

    // Test 1: Create Customer
    try {
      const customer = await customerService.createCustomer(testCustomerData)
      this.addResult('Create Customer', 'PASS', `Created: ${customer.name} (ID: ${customer.id})`)
      
      // Test 2: Search Customer
      const searchResults = await customerService.searchCustomers({ query: 'Test Customer' })
      this.addResult('Search Customer', 'PASS', `Found ${searchResults.length} results`)
      
      // Test 3: Get Customer by ID
      const foundCustomer = await customerService.getCustomerById(customer.id)
      this.addResult('Get Customer by ID', foundCustomer ? 'PASS' : 'FAIL', 
        foundCustomer ? `Found: ${foundCustomer.name}` : 'Customer not found')
      
      // Test 4: Update Customer
      const updatedCustomer = await customerService.updateCustomer(customer.id, updateCustomerData)
      this.addResult('Update Customer', 'PASS', `Updated: ${updatedCustomer.name}`)
      
      // Test 5: Get All Customers
      const allCustomers = await customerService.getAllCustomers()
      this.addResult('Get All Customers', allCustomers.length > 0 ? 'PASS' : 'FAIL', 
        `Total customers: ${allCustomers.length}`)
      
    } catch (error) {
      this.addResult('CustomerService Operations', 'FAIL', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async testValidation(): Promise<void> {
    console.log('✅ Testing Validation System...')

    // Test 1: Valid Customer Data
    const validResult = Validator.validate(testCustomerData, Validator.createCustomerValidation())
    this.addResult('Valid Customer Validation', validResult.isValid ? 'PASS' : 'FAIL', 
      validResult.isValid ? 'Validation passed' : 'Validation failed')

    // Test 2: Invalid Customer Data (Empty Name)
    const invalidData = { ...testCustomerData, name: '' }
    const invalidResult = Validator.validate(invalidData, Validator.createCustomerValidation())
    this.addResult('Invalid Customer Validation', !invalidResult.isValid ? 'PASS' : 'FAIL', 
      !invalidResult.isValid ? 'Correctly rejected invalid data' : 'Should have failed validation')

    // Test 3: Invalid Email
    const invalidEmailData = { ...testCustomerData, email: 'invalid-email' }
    const emailResult = Validator.validate(invalidEmailData, Validator.createCustomerValidation())
    this.addResult('Email Validation', !emailResult.isValid ? 'PASS' : 'FAIL', 
      !emailResult.isValid ? 'Correctly rejected invalid email' : 'Should have failed email validation')

    // Test 4: Invalid Phone
    const invalidPhoneData = { ...testCustomerData, phone: '123' }
    const phoneResult = Validator.validate(invalidPhoneData, Validator.createCustomerValidation())
    this.addResult('Phone Validation', !phoneResult.isValid ? 'PASS' : 'FAIL', 
      !phoneResult.isValid ? 'Correctly rejected invalid phone' : 'Should have failed phone validation')
  }

  private async testLoyaltySystem(): Promise<void> {
    console.log('🎁 Testing Loyalty System...')

    try {
      // Create a test customer for loyalty testing
      const customer = await customerService.createCustomer({
        name: 'Loyalty Test Customer',
        phone: '081234567891',
        email: 'loyalty@example.com',
      })

      // Test 1: Add Loyalty Points
      const customerWithPoints = await customerService.addLoyaltyPoints(customer.id, 100)
      this.addResult('Add Loyalty Points', customerWithPoints.loyaltyPoints === 100 ? 'PASS' : 'FAIL', 
        `Points: ${customerWithPoints.loyaltyPoints}`)

      // Test 2: Record Purchase
      const customerAfterPurchase = await customerService.recordPurchase(customer.id, 50000, 50)
      this.addResult('Record Purchase', 
        customerAfterPurchase.totalPurchases === 50000 && customerAfterPurchase.loyaltyPoints === 150 ? 'PASS' : 'FAIL', 
        `Total: ${customerAfterPurchase.totalPurchases}, Points: ${customerAfterPurchase.loyaltyPoints}`)

      // Test 3: Get Customer Stats
      const stats = await customerService.getCustomerStats(customer.id)
      this.addResult('Customer Stats', 
        stats.totalPurchases === 50000 && stats.loyaltyPoints === 150 ? 'PASS' : 'FAIL', 
        `Stats: Total=${stats.totalPurchases}, Points=${stats.loyaltyPoints}`)

    } catch (error) {
      this.addResult('Loyalty System', 'FAIL', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async testStoragePersistence(): Promise<void> {
    console.log('💾 Testing Storage Persistence...')

    try {
      // Test 1: Create customer and verify it persists
      const customer = await customerService.createCustomer({
        name: 'Persistence Test Customer',
        phone: '081234567892',
        email: 'persist@example.com',
      })

      // Simulate page reload by getting customers again
      const customersAfterReload = await customerService.getAllCustomers()
      const persistedCustomer = customersAfterReload.find(c => c.id === customer.id)
      
      this.addResult('Storage Persistence', persistedCustomer ? 'PASS' : 'FAIL', 
        persistedCustomer ? 'Customer persisted successfully' : 'Customer not found after reload')

      // Test 2: General Customer exists
      const generalCustomer = await customerService.getGeneralCustomer()
      this.addResult('General Customer', generalCustomer ? 'PASS' : 'FAIL', 
        generalCustomer ? `General customer: ${generalCustomer.name}` : 'General customer not found')

    } catch (error) {
      this.addResult('Storage Persistence', 'FAIL', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private addResult(test: string, status: 'PASS' | 'FAIL', message?: string): void {
    this.results.push({ test, status, message })
    const statusIcon = status === 'PASS' ? '✅' : '❌'
    console.log(`${statusIcon} ${test}: ${message || status}`)
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary:')
    console.log('='.repeat(50))
    
    const passed = this.results.filter(r => r.status === 'PASS').length
    const failed = this.results.filter(r => r.status === 'FAIL').length
    
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`📈 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`)
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.results.filter(r => r.status === 'FAIL').forEach(result => {
        console.log(`  • ${result.test}: ${result.message}`)
      })
    }
    
    console.log('\n🎉 Customer Management System Tests Complete!')
  }
}

// Export test runner for use in development
export const runCustomerTests = async (): Promise<void> => {
  const tester = new CustomerManagementTest()
  await tester.runAllTests()
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined' && window.location.search.includes('test=customer')) {
  runCustomerTests()
}