// Customer management service with localStorage persistence
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  loyaltyPoints: number;
  totalPurchases: number;
  lastVisit?: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateCustomerData {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface UpdateCustomerData {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
}

export interface CustomerSearchQuery {
  query?: string;
  isActive?: boolean;
}

class CustomerService {
  private readonly STORAGE_KEY = 'bms_pos_customers';
  private readonly DEFAULT_CUSTOMER_ID = 'general';

  // Get all customers from localStorage
  private loadCustomersFromStorage(): Customer[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const customers = JSON.parse(stored);
      // Convert date strings back to Date objects
      return customers.map((customer: any) => ({
        ...customer,
        createdAt: new Date(customer.createdAt),
        lastVisit: customer.lastVisit ? new Date(customer.lastVisit) : undefined,
      }));
    } catch (error) {
      console.error('Error loading customers:', error);
      return [];
    }
  }

  // Save customers to localStorage
  private saveCustomers(customers: Customer[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(customers));
    } catch (error) {
      console.error('Error saving customers:', error);
      throw new Error('Failed to save customer data');
    }
  }

  // Generate unique customer ID
  private generateCustomerId(): string {
    return `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Initialize with default "General Customer" for anonymous purchases
  private initializeDefaultCustomer(): void {
    const customers = this.loadCustomersFromStorage();
    const hasGeneralCustomer = customers.find(c => c.id === this.DEFAULT_CUSTOMER_ID);
    
    if (!hasGeneralCustomer) {
      const generalCustomer: Customer = {
        id: this.DEFAULT_CUSTOMER_ID,
        name: 'General Customer',
        loyaltyPoints: 0,
        totalPurchases: 0,
        isActive: true,
        createdAt: new Date(),
        phone: undefined,
        email: undefined,
        address: undefined,
      };
      
      customers.push(generalCustomer);
      this.saveCustomers(customers);
    }
  }

  constructor() {
    this.initializeDefaultCustomer();
  }

  /**
   * Search customers by name, phone, or email
   */
  async searchCustomers(searchQuery: CustomerSearchQuery): Promise<Customer[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const customers = this.loadCustomersFromStorage();
    const { query, isActive = true } = searchQuery;

    let filteredCustomers = customers;

    // Filter by active status
    if (isActive !== undefined) {
      filteredCustomers = filteredCustomers.filter((c: Customer) => c.isActive === isActive);
    }

    // Filter by search query
    if (query && query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      filteredCustomers = filteredCustomers.filter((customer: Customer) => {
        const nameMatch = customer.name.toLowerCase().includes(searchTerm);
        const phoneMatch = customer.phone?.toLowerCase().includes(searchTerm) || false;
        const emailMatch = customer.email?.toLowerCase().includes(searchTerm) || false;
        return nameMatch || phoneMatch || emailMatch;
      });
    }

    // Sort by name
    return filteredCustomers.sort((a: Customer, b: Customer) => a.name.localeCompare(b.name));
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(id: string): Promise<Customer | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const customers = this.loadCustomersFromStorage();
    return customers.find((c: Customer) => c.id === id) || null;
  }

  /**
   * Create a new customer
   */
  async createCustomer(customerData: CreateCustomerData): Promise<Customer> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const customers = this.loadCustomersFromStorage();
    
    // Check for duplicate name
    const existingCustomer = customers.find(
      (c: Customer) => c.name.toLowerCase() === customerData.name.toLowerCase() && c.isActive
    );
    
    if (existingCustomer) {
      throw new Error('Customer with this name already exists');
    }

    // Check for duplicate email
    if (customerData.email) {
      const existingEmail = customers.find(
        (c: Customer) => c.email?.toLowerCase() === customerData.email?.toLowerCase() && c.isActive
      );
      
      if (existingEmail) {
        throw new Error('Customer with this email already exists');
      }
    }

    // Check for duplicate phone
    if (customerData.phone) {
      const existingPhone = customers.find(
        (c: Customer) => c.phone?.replace(/[\s-()]/g, '') === customerData.phone?.replace(/[\s-()]/g, '') && c.isActive
      );
      
      if (existingPhone) {
        throw new Error('Customer with this phone number already exists');
      }
    }

    const newCustomer: Customer = {
      id: this.generateCustomerId(),
      name: customerData.name.trim(),
      phone: customerData.phone?.trim(),
      email: customerData.email?.trim(),
      address: customerData.address?.trim(),
      loyaltyPoints: 0,
      totalPurchases: 0,
      isActive: true,
      createdAt: new Date(),
    };

    customers.push(newCustomer);
    this.saveCustomers(customers);

    return newCustomer;
  }

  /**
   * Update customer information
   */
  async updateCustomer(id: string, updates: UpdateCustomerData): Promise<Customer> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const customers = this.loadCustomersFromStorage();
    const customerIndex = customers.findIndex((c: Customer) => c.id === id);
    
    if (customerIndex === -1) {
      throw new Error('Customer not found');
    }

    const customer = customers[customerIndex];

    // Check for duplicate name (excluding current customer)
    if (updates.name && updates.name.trim() !== customer.name) {
      const existingCustomer = customers.find(
        (c: Customer) => c.id !== id && 
             c.name.toLowerCase() === updates.name?.toLowerCase() && 
             c.isActive
      );
      
      if (existingCustomer) {
        throw new Error('Customer with this name already exists');
      }
    }

    // Check for duplicate email
    if (updates.email && updates.email !== customer.email) {
      const existingEmail = customers.find(
        (c: Customer) => c.id !== id && 
             c.email?.toLowerCase() === updates.email?.toLowerCase() && 
             c.isActive
      );
      
      if (existingEmail) {
        throw new Error('Customer with this email already exists');
      }
    }

    // Check for duplicate phone
    if (updates.phone && updates.phone !== customer.phone) {
      const existingPhone = customers.find(
        (c: Customer) => c.id !== id && 
             c.phone?.replace(/[\s-()]/g, '') === updates.phone?.replace(/[\s-()]/g, '') && 
             c.isActive
      );
      
      if (existingPhone) {
        throw new Error('Customer with this phone number already exists');
      }
    }

    // Update customer
    const updatedCustomer: Customer = {
      ...customer,
      ...updates,
      name: updates.name?.trim() || customer.name,
      phone: updates.phone?.trim() || customer.phone,
      email: updates.email?.trim() || customer.email,
      address: updates.address?.trim() || customer.address,
    };

    customers[customerIndex] = updatedCustomer;
    this.saveCustomers(customers);

    return updatedCustomer;
  }

  /**
   * Add loyalty points to a customer
   */
  async addLoyaltyPoints(customerId: string, points: number): Promise<Customer> {
    if (points <= 0) {
      throw new Error('Points must be a positive number');
    }

    const customers = this.loadCustomersFromStorage();
    const customerIndex = customers.findIndex((c: Customer) => c.id === customerId);
    
    if (customerIndex === -1) {
      throw new Error('Customer not found');
    }

    const customer = customers[customerIndex];
    const updatedCustomer: Customer = {
      ...customer,
      loyaltyPoints: customer.loyaltyPoints + points,
    };

    customers[customerIndex] = updatedCustomer;
    this.saveCustomers(customers);

    return updatedCustomer;
  }

  /**
   * Record a purchase for a customer (updates loyalty points and total purchases)
   */
  async recordPurchase(customerId: string, amount: number, pointsEarned?: number): Promise<Customer> {
    if (amount <= 0) {
      throw new Error('Purchase amount must be positive');
    }

    const customers = this.loadCustomersFromStorage();
    const customerIndex = customers.findIndex((c: Customer) => c.id === customerId);
    
    if (customerIndex === -1) {
      throw new Error('Customer not found');
    }

    const customer = customers[customerIndex];
    const points = pointsEarned !== undefined ? pointsEarned : Math.floor(amount); // 1 point per currency unit
    
    const updatedCustomer: Customer = {
      ...customer,
      totalPurchases: customer.totalPurchases + amount,
      loyaltyPoints: customer.loyaltyPoints + points,
      lastVisit: new Date(),
    };

    customers[customerIndex] = updatedCustomer;
    this.saveCustomers(customers);

    return updatedCustomer;
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(customerId: string): Promise<{
    totalPurchases: number;
    loyaltyPoints: number;
    lastVisit?: Date;
    purchaseCount: number;
  }> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    return {
      totalPurchases: customer.totalPurchases,
      loyaltyPoints: customer.loyaltyPoints,
      lastVisit: customer.lastVisit,
      purchaseCount: Math.floor(customer.totalPurchases), // Simplified for now
    };
  }

  /**
   * Deactivate a customer (soft delete)
   */
  async deactivateCustomer(customerId: string): Promise<Customer> {
    if (customerId === this.DEFAULT_CUSTOMER_ID) {
      throw new Error('Cannot deactivate the general customer');
    }

    return this.updateCustomer(customerId, { isActive: false });
  }

  /**
   * Get all customers (for admin purposes)
   */
  async getAllCustomers(includeInactive: boolean = false): Promise<Customer[]> {
    const customers = this.loadCustomersFromStorage();
    if (!includeInactive) {
      return customers.filter((c: Customer) => c.isActive);
    }
    return customers;
  }

  /**
   * Get the default/general customer
   */
  async getGeneralCustomer(): Promise<Customer> {
    const customer = await this.getCustomerById(this.DEFAULT_CUSTOMER_ID);
    if (!customer) {
      this.initializeDefaultCustomer();
      return this.getCustomerById(this.DEFAULT_CUSTOMER_ID) as Promise<Customer>;
    }
    return customer;
  }
}

export const customerService = new CustomerService();