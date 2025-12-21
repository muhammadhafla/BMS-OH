
// Validation Rule Types
export type ValidationType = 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'custom';

export interface ValidationRule {
  type: ValidationType;
  value?: any;
  message?: string;
  validator?: (_value: any, _data?: any) => boolean | string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

export interface ProductValidationData {
  name: string;
  sku: string;
  price: number;
  stock: number;
  category: string;
  description?: string;
}

// Default error messages
const DEFAULT_MESSAGES = {
  required: 'This field is required',
  minLength: (min: number) => `Must be at least ${min} characters long`,
  maxLength: (max: number) => `Must be no more than ${max} characters long`,
  pattern: 'Invalid format',
  min: (min: number) => `Must be at least ${min}`,
  max: (max: number) => `Must be no more than ${max}`,
  custom: 'Invalid value',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  number: 'Must be a valid number',
  integer: 'Must be a whole number',
  positive: 'Must be a positive number',
  currency: (currency: string) => `Please enter a valid ${currency} amount`,
  url: 'Please enter a valid URL',
  alphanumeric: 'Must contain only letters and numbers',
  alpha: 'Must contain only letters',
  sku: 'SKU must be in format ABC-123 or ABC123',
  stock: 'Stock must be a non-negative integer',
  price: 'Price must be a valid decimal number with maximum 2 decimal places',
  category: 'Please select a valid category',
}

// Built-in validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_.~#?&//=]*)$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alpha: /^[a-zA-Z]+$/,
  sku: /^[A-Z]{2,5}[-]?[0-9]{1,6}$/,
  phoneIndonesian: /^(\+62|62|0)[0-9]{9,13}$/,
}

// Built-in validation functions
export const VALIDATION_FUNCTIONS = {
  isEmail: (value: string) => VALIDATION_PATTERNS.email.test(value),
  isPhone: (value: string) => VALIDATION_PATTERNS.phone.test(value.replace(/[\s-()]/g, '')),
  isUrl: (value: string) => VALIDATION_PATTERNS.url.test(value),
  isAlphanumeric: (value: string) => VALIDATION_PATTERNS.alphanumeric.test(value),
  isAlpha: (value: string) => VALIDATION_PATTERNS.alpha.test(value),
  isSKU: (value: string) => VALIDATION_PATTERNS.sku.test(value),
  isPositive: (value: number) => value > 0,
  isNonNegative: (value: number) => value >= 0,
  isInteger: (value: number) => Number.isInteger(value),
  isNumber: (value: any) => !isNaN(value) && !isNaN(parseFloat(value)),
  isValidPrice: (value: number) => {
    if (!VALIDATION_FUNCTIONS.isNumber(value) || value < 0) return false
    const decimalPlaces = (value.toString().split('.')[1] || '').length
    return decimalPlaces <= 2
  },
  isValidStock: (value: number) => {
    return VALIDATION_FUNCTIONS.isNumber(value) && 
           VALIDATION_FUNCTIONS.isNonNegative(value) && 
           VALIDATION_FUNCTIONS.isInteger(value)
  },
  isNonEmpty: (value: any) => {
    if (value === null || value === undefined) return false
    if (typeof value === 'string') return value.trim().length > 0
    if (Array.isArray(value)) return value.length > 0
    return true
  },
}

// Individual validation rule handlers to reduce complexity
class ValidationRuleHandlers {
  private static handleRequired(value: any, rule: ValidationRule): string | null {
    if (!VALIDATION_FUNCTIONS.isNonEmpty(value)) {
      return rule.message || DEFAULT_MESSAGES.required
    }
    return null
  }

  private static handleMinLength(value: string, rule: ValidationRule): string | null {
    if (typeof value === 'string' && value.length < (rule.value as number)) {
      return rule.message ?? DEFAULT_MESSAGES.minLength(rule.value)
    }
    return null
  }

  private static handleMaxLength(value: string, rule: ValidationRule): string | null {
    if (typeof value === 'string' && value.length > (rule.value as number)) {
      return rule.message ?? DEFAULT_MESSAGES.maxLength(rule.value)
    }
    return null
  }

  private static handlePattern(value: string, rule: ValidationRule): string | null {
    if (typeof value === 'string' && !(rule.value as RegExp).test(value)) {
      return rule.message ?? DEFAULT_MESSAGES.pattern
    }
    return null
  }

  private static handleMin(value: number, rule: ValidationRule): string | null {
    if (VALIDATION_FUNCTIONS.isNumber(value) && value < (rule.value as number)) {
      return rule.message ?? DEFAULT_MESSAGES.min(rule.value)
    }
    return null
  }

  private static handleMax(value: number, rule: ValidationRule): string | null {
    if (VALIDATION_FUNCTIONS.isNumber(value) && value > (rule.value as number)) {
      return rule.message ?? DEFAULT_MESSAGES.max(rule.value)
    }
    return null
  }

  private static handleCustom(value: any, rule: ValidationRule, data: any): string | null {
    if (rule.validator) {
      const result = rule.validator(value, data)
      if (result === false) {
        return rule.message ?? DEFAULT_MESSAGES.custom
      }
      if (typeof result === 'string') {
        return result
      }
    }
    return null
  }

  // Main handler that delegates to specific rule handlers
  static validateRule(
    type: ValidationType,
    value: any,
    rule: ValidationRule,
    data: any,
  ): string | null {
    // Skip validation if field is empty and not required
    if (!VALIDATION_FUNCTIONS.isNonEmpty(value) && type !== 'required') {
      return null
    }

    switch (type) {
      case 'required':
        return this.handleRequired(value, rule)
      case 'minLength':
        return this.handleMinLength(value, rule)
      case 'maxLength':
        return this.handleMaxLength(value, rule)
      case 'pattern':
        return this.handlePattern(value, rule)
      case 'min':
        return this.handleMin(value, rule)
      case 'max':
        return this.handleMax(value, rule)
      case 'custom':
        return this.handleCustom(value, rule, data)
      default:
        // Unknown validation type encountered
        return null
    }
  }
}

class Validator {
  /**
   * Main validation function
   * @param data - Data to validate
   * @param schema - Validation schema
   * @returns ValidationResult with isValid boolean and errors object
   */
  static validate(data: any, schema: ValidationSchema): ValidationResult {
    const errors: Record<string, string[]> = {}
    let isValid = true

    for (const [field, rules] of Object.entries(schema)) {
      const fieldErrors: string[] = []
      const value = data[field]

      for (const rule of rules) {
        const errorMessage = this.validateField(field, value, rule, data)
        if (errorMessage) {
          fieldErrors.push(errorMessage)
          isValid = false
        }
      }

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors
      }
    }

    return { isValid, errors }
  }

  /**
   * Validate a single field against a rule
   * @param fieldName - Name of the field
   * @param value - Value to validate
   * @param rule - Validation rule
   * @param data - Full data object for custom validation
   * @returns Error message or null if valid
   */
  private static validateField(
    _fieldName: string,
    value: any,
    rule: ValidationRule,
    data: any,
  ): string | null {
    return ValidationRuleHandlers.validateRule(rule.type, value, rule, data)
  }

  /**
   * Validate email format
   * @param email - Email to validate
   * @returns boolean
   */
  static isValidEmail(email: string): boolean {
    return VALIDATION_FUNCTIONS.isEmail(email)
  }

  /**
   * Validate phone number
   * @param phone - Phone number to validate
   * @returns boolean
   */
  static isValidPhone(phone: string): boolean {
    return VALIDATION_FUNCTIONS.isPhone(phone)
  }

  /**
   * Validate SKU format
   * @param sku - SKU to validate
   * @returns boolean
   */
  static isValidSKU(sku: string): boolean {
    return VALIDATION_FUNCTIONS.isSKU(sku)
  }

  /**
   * Validate product data
   * @param product - Product data to validate
   * @returns ValidationResult
   */
  static validateProduct(product: Partial<ProductValidationData>): ValidationResult {
    return this.validate(product, this.createProductValidation())
  }

  /**
   * Create product validation schema
   * @returns ValidationSchema
   */
  static createProductValidation(): ValidationSchema {
    return {
      name: [
        { type: 'required' as const, message: 'Product name is required' },
        { type: 'minLength' as const, value: 2, message: 'Product name must be at least 2 characters' },
        { type: 'maxLength' as const, value: 100, message: 'Product name must be no more than 100 characters' },
      ],
      sku: [
        { type: 'required' as const, message: 'SKU is required' },
        { 
          type: 'custom' as const, 
          validator: (value: string) => {
            if (!VALIDATION_FUNCTIONS.isSKU(value)) {
              return 'SKU must be in format ABC-123 or ABC123 (2-5 letters, optional dash, 1-6 numbers)'
            }
            return true
          },
        },
      ],
      price: [
        { type: 'required' as const, message: 'Price is required' },
        { 
          type: 'custom' as const, 
          validator: (value: number) => {
            if (!VALIDATION_FUNCTIONS.isValidPrice(value)) {
              return 'Price must be a valid number with maximum 2 decimal places'
            }
            if (!VALIDATION_FUNCTIONS.isPositive(value)) {
              return 'Price must be a positive number'
            }
            return true
          },
        },
      ],
      stock: [
        { type: 'required' as const, message: 'Stock quantity is required' },
        { 
          type: 'custom' as const, 
          validator: (value: number) => {
            if (!VALIDATION_FUNCTIONS.isValidStock(value)) {
              return 'Stock must be a non-negative whole number'
            }
            return true
          },
        },
      ],
      category: [
        { type: 'required' as const, message: 'Category is required' },
        { 
          type: 'custom' as const, 
          validator: (value: string) => {
            if (typeof value === 'string' && value.trim().length === 0) {
              return 'Please select a valid category'
            }
            return true
          },
        },
      ],
      description: [
        { 
          type: 'maxLength' as const, 
          value: 500, 
          message: 'Description must be no more than 500 characters', 
        },
      ],
    }
  }

  /**
   * Create user validation schema
   * @returns ValidationSchema
   */
  static createUserValidation(): ValidationSchema {
    return {
      username: [
        { type: 'required' as const, message: 'Username is required' },
        { type: 'minLength' as const, value: 3, message: 'Username must be at least 3 characters' },
        { type: 'maxLength' as const, value: 50, message: 'Username must be no more than 50 characters' },
        {
          type: 'pattern' as const,
          value: /^[a-zA-Z0-9_]+$/,
          message: 'Username can only contain letters, numbers, and underscores',
        },
      ],
      email: [
        { type: 'required' as const, message: 'Email is required' },
        {
          type: 'custom' as const,
          validator: (value: string) => {
            if (!VALIDATION_FUNCTIONS.isEmail(value)) {
              return 'Please enter a valid email address'
            }
            return true
          },
        },
      ],
      role: [
        { type: 'required' as const, message: 'Role is required' },
      ],
    }
  }

  /**
   * Create transaction validation schema
   * @returns ValidationSchema
   */
  static createTransactionValidation(): ValidationSchema {
    return {
      items: [
        {
          type: 'custom' as const,
          validator: (value: any[]) => {
            if (!Array.isArray(value) || value.length === 0) {
              return 'At least one item is required for the transaction'
            }
            return true
          },
        },
      ],
      total: [
        { type: 'required' as const, message: 'Total amount is required' },
        {
          type: 'custom' as const,
          validator: (value: number) => {
            if (!VALIDATION_FUNCTIONS.isValidPrice(value) || !VALIDATION_FUNCTIONS.isPositive(value)) {
              return 'Total must be a valid positive amount'
            }
            return true
          },
        },
      ],
    }
  }

  /**
   * Create customer validation schema
   * @returns ValidationSchema
   */
  static createCustomerValidation(): ValidationSchema {
    return {
      name: [
        { type: 'required' as const, message: 'Customer name is required' },
        { type: 'minLength' as const, value: 2, message: 'Customer name must be at least 2 characters' },
        { type: 'maxLength' as const, value: 100, message: 'Customer name must be no more than 100 characters' },
      ],
      phone: [
        {
          type: 'custom' as const,
          validator: (value: string) => {
            if (value && !VALIDATION_FUNCTIONS.isPhone(value)) {
              return 'Please enter a valid phone number'
            }
            return true
          },
        },
      ],
      email: [
        {
          type: 'custom' as const,
          validator: (value: string) => {
            if (value && !VALIDATION_FUNCTIONS.isEmail(value)) {
              return 'Please enter a valid email address'
            }
            return true
          },
        },
      ],
      address: [
        {
          type: 'maxLength' as const,
          value: 500,
          message: 'Address must be no more than 500 characters',
        },
      ],
    }
  }

  /**
   * Get validation errors as a flat object for form display
   * @param errors - Nested error object
   * @returns Flattened error object
   */
  static flattenErrors(errors: Record<string, string[]>): Record<string, string> {
    const flattened: Record<string, string> = {}
    
    for (const [field, fieldErrors] of Object.entries(errors)) {
      flattened[field] = fieldErrors[0] // Use first error message
    }
    
    return flattened
  }

  /**
   * Format validation errors for display
   * @param errors - Validation errors
   * @returns Formatted error string
   */
  static formatErrors(errors: Record<string, string[]>): string {
    const flattened = this.flattenErrors(errors)
    return Object.values(flattened).join(', ')
  }
}

export default Validator