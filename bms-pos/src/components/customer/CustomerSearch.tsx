import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Customer, customerService, CreateCustomerData } from '@/services/CustomerService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import Validator, { ValidationResult } from '@/utils/validation';
import { formatCurrency } from '@/lib/utils';

interface CustomerSearchProps {
  onCustomerSelect: (customer: Customer | null) => void;
  selectedCustomer?: Customer | null;
  className?: string;
}

interface NewCustomerForm {
  name: string;
  phone: string;
  email: string;
  address: string;
}

const CustomerSearch: React.FC<CustomerSearchProps> = ({
  onCustomerSelect,
  selectedCustomer,
  className = '',
}) => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState<NewCustomerForm>({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Hooks
  const { showSuccess, showError, showLoading, dismiss } = useToast();

  // Debounced search function
  const debounce = useCallback((func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }, []);

  // Search customers with debouncing
  const performSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await customerService.searchCustomers({ 
          query: query.trim(),
          isActive: true 
        });
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        showError('Failed to search customers');
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [showError]
  );

  // Effect for search query changes
  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    onCustomerSelect(customer);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Handle clearing customer selection
  const handleClearSelection = () => {
    onCustomerSelect(null);
  };

  // Handle new customer form changes
  const handleNewCustomerChange = (field: keyof NewCustomerForm, value: string) => {
    setNewCustomer(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Validate new customer form
  const validateNewCustomer = (): ValidationResult => {
    const result = Validator.validate(newCustomer, Validator.createCustomerValidation());
    return result;
  };

  // Handle new customer creation
  const handleCreateCustomer = async () => {
    // Validate form
    const validation = validateNewCustomer();
    if (!validation.isValid) {
      setValidationErrors(Validator.flattenErrors(validation.errors));
      return;
    }

    setIsCreating(true);
    const loadingToast = showLoading('Creating customer...');

    try {
      const customerData: CreateCustomerData = {
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim() || undefined,
        email: newCustomer.email.trim() || undefined,
        address: newCustomer.address.trim() || undefined,
      };

      const createdCustomer = await customerService.createCustomer(customerData);
      
      dismiss(loadingToast);
      showSuccess(`Customer "${createdCustomer.name}" created successfully`);
      
      // Select the newly created customer
      onCustomerSelect(createdCustomer);
      
      // Reset form
      setNewCustomer({ name: '', phone: '', email: '', address: '' });
      setShowNewCustomerForm(false);
      setValidationErrors({});
    } catch (error) {
      dismiss(loadingToast);
      showError(error instanceof Error ? error.message : 'Failed to create customer');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle cancel new customer form
  const handleCancelNewCustomer = () => {
    setNewCustomer({ name: '', phone: '', email: '', address: '' });
    setShowNewCustomerForm(false);
    setValidationErrors({});
  };

  // Format customer display info
  const formatCustomerInfo = (customer: Customer) => {
    const parts = [];
    if (customer.phone) parts.push(customer.phone);
    if (customer.email) parts.push(customer.email);
    if (customer.loyaltyPoints > 0) parts.push(`${customer.loyaltyPoints} points`);
    return parts.join(' • ');
  };

  // Memoized components
  const searchInput = useMemo(() => (
    <div className="relative">
      <Input
        type="text"
        placeholder="Search customers by name, phone, or email..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10"
        disabled={isSearching}
      />
      {isSearching && (
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  ), [searchQuery, isSearching]);

  const selectedCustomerDisplay = useMemo(() => {
    if (!selectedCustomer) return null;

    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-medium text-lg">{selectedCustomer.name}</h3>
              {formatCustomerInfo(selectedCustomer) && (
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCustomerInfo(selectedCustomer)}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-muted-foreground">
                  Total Purchases: {formatCurrency(selectedCustomer.totalPurchases)}
                </span>
                <span className="text-muted-foreground">
                  Last Visit: {selectedCustomer.lastVisit 
                    ? new Date(selectedCustomer.lastVisit).toLocaleDateString() 
                    : 'Never'
                  }
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSelection}
              className="ml-4"
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }, [selectedCustomer]);

  const newCustomerForm = useMemo(() => {
    if (!showNewCustomerForm) return null;

    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Add New Customer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={newCustomer.name}
              onChange={(e) => handleNewCustomerChange('name', e.target.value)}
              placeholder="Customer name"
              className={validationErrors.name ? 'border-destructive' : ''}
            />
            {validationErrors.name && (
              <p className="text-sm text-destructive mt-1">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input
              value={newCustomer.phone}
              onChange={(e) => handleNewCustomerChange('phone', e.target.value)}
              placeholder="Phone number"
              className={validationErrors.phone ? 'border-destructive' : ''}
            />
            {validationErrors.phone && (
              <p className="text-sm text-destructive mt-1">{validationErrors.phone}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={newCustomer.email}
              onChange={(e) => handleNewCustomerChange('email', e.target.value)}
              placeholder="Email address"
              className={validationErrors.email ? 'border-destructive' : ''}
            />
            {validationErrors.email && (
              <p className="text-sm text-destructive mt-1">{validationErrors.email}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Address</label>
            <Input
              value={newCustomer.address}
              onChange={(e) => handleNewCustomerChange('address', e.target.value)}
              placeholder="Address"
              className={validationErrors.address ? 'border-destructive' : ''}
            />
            {validationErrors.address && (
              <p className="text-sm text-destructive mt-1">{validationErrors.address}</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleCreateCustomer}
              disabled={isCreating}
              className="flex-1"
            >
              {isCreating ? 'Creating...' : 'Create Customer'}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancelNewCustomer}
              disabled={isCreating}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }, [showNewCustomerForm, newCustomer, validationErrors, isCreating]);

  const searchResultsList = useMemo(() => {
    if (searchQuery.trim() && searchResults.length > 0) {
      return (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-60 overflow-y-auto">
              {searchResults.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleCustomerSelect(customer)}
                  className="w-full text-left p-4 hover:bg-muted/50 border-b last:border-b-0 focus:outline-none focus:bg-muted/50"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{customer.name}</h4>
                      {formatCustomerInfo(customer) && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatCustomerInfo(customer)}
                        </p>
                      )}
                    </div>
                    {customer.loyaltyPoints > 0 && (
                      <div className="text-right">
                        <span className="text-sm font-medium text-primary">
                          {customer.loyaltyPoints} pts
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (searchQuery.trim() && !isSearching && searchResults.length === 0) {
      return (
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground">No customers found</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewCustomerForm(true)}
              className="mt-2"
            >
              Add New Customer
            </Button>
          </CardContent>
        </Card>
      );
    }

    return null;
  }, [searchQuery, searchResults, isSearching, showNewCustomerForm]);

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Customer Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected Customer Display */}
          {selectedCustomerDisplay}

          {/* Search Input */}
          <div className="flex gap-2">
            <div className="flex-1">
              {searchInput}
            </div>
            {!showNewCustomerForm && (
              <Button
                variant="outline"
                onClick={() => setShowNewCustomerForm(true)}
                className="shrink-0"
              >
                Add Customer
              </Button>
            )}
          </div>

          {/* New Customer Form */}
          {newCustomerForm}

          {/* Search Results */}
          {searchResultsList}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerSearch;