/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock window events
global.window = Object.create(window);
global.window.dispatchEvent = jest.fn();
global.window.addEventListener = jest.fn();
global.window.removeEventListener = jest.fn();

// Mock crypto for secure token generation
(global as any).crypto = {
  getRandomValues: jest.fn((array: any) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
};

// Mock fetch
global.fetch = jest.fn();

// Mock import.meta.env for Vite environment variables
(global as any).import = {
  meta: {
    env: {
      VITE_API_URL: 'http://localhost:3001/api',
      VITE_SESSION_TIMEOUT: '24',
      VITE_ENABLE_SECURE_COOKIES: 'false',
      VITE_TOKEN_REFRESH_INTERVAL: '3600',
      VITE_ENABLE_RATE_LIMITING: 'true',
      VITE_MAX_LOGIN_ATTEMPTS: '5',
      VITE_ADMIN_USERNAME: 'admin',
      VITE_ADMIN_PASSWORD_HASH: '',
      VITE_CASHIER_USERNAME: 'cashier1',
      VITE_CASHIER_PASSWORD_HASH: '',
      VITE_MANAGER_USERNAME: 'manager1',
      VITE_MANAGER_PASSWORD_HASH: '',
      VITE_MOCK_MODE: 'false',
      VITE_DEBUG_MODE: 'false'
    }
  }
};

// Mock console methods in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup test utilities
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
  localStorageMock.setItem.mockImplementation(() => {});
  localStorageMock.removeItem.mockImplementation(() => {});
  sessionStorageMock.getItem.mockReturnValue(null);
  sessionStorageMock.setItem.mockImplementation(() => {});
  sessionStorageMock.removeItem.mockImplementation(() => {});
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});

// Test utilities
export const createMockUser = (overrides = {}) => ({
  id: '1',
  username: 'testuser',
  role: 'admin' as const,
  permissions: ['all'],
  lastLogin: '2024-01-01T00:00:00Z',
  isActive: true,
  ...overrides,
});

export const createMockProduct = (overrides = {}) => ({
  id: '1',
  sku: 'TEST001',
  name: 'Test Product',
  price: 10000,
  cost: 8000,
  stock: 100,
  unit: 'pcs',
  barcode: '123456789',
  description: 'Test product description',
  category: { id: 'cat1', name: 'Test Category' },
  ...overrides,
});

export const createMockTransaction = (overrides = {}) => ({
  id: '1',
  transactionCode: 'TXN001',
  items: [
    {
      productId: '1',
      quantity: 1,
      unitPrice: 10000,
      discount: 0,
      total: 10000,
    },
  ],
  totalAmount: 10000,
  discount: 0,
  finalAmount: 10000,
  paymentMethod: 'cash',
  amountPaid: 10000,
  change: 0,
  status: 'COMPLETED',
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Mock API responses
export const createMockApiResponse = <T>(data: T, success = true) => ({
  success,
  data,
  error: success ? undefined : 'Test error',
  message: success ? 'Success' : undefined,
});

// Wait for async operations in tests
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Helper to mock environment variables
export const mockEnvironmentVariables = (variables: Record<string, string>) => {
  Object.keys(variables).forEach(key => {
    process.env[key] = variables[key];
  });
};

// Helper to restore environment variables
export const restoreEnvironmentVariables = () => {
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('VITE_')) {
      delete process.env[key];
    }
  });
};