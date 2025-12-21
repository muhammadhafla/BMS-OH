import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { LoadingSpinner } from '../ui/loading-spinner'
import { LoadingOverlay } from '../ui/loading-overlay'
import { useToast } from '../../hooks/useToast'
import { inventoryService } from '../../services/InventoryService'
import { authService, User } from '../../services/AuthService'
import Validator, { ValidationSchema, ValidationResult } from '../../utils/validation'
import { 
  Settings, 
  Save, 
  X, 
  CheckCircle, 
  AlertTriangle, 
   
  User as UserIcon,
  
  Package,
  Plus,
  Minus,
  
} from 'lucide-react'

interface StockAdjustmentFormData {
  productId: string;
  adjustmentType: 'increase' | 'decrease' | 'set';
  quantity: number;
  reason: string;
  notes: string;
  requiresApproval: boolean;
  approverId?: string;
}

interface StockAdjustmentProps {
  onClose?: () => void;
  onSuccess?: (adjustment: any) => void;
  initialProductId?: string;
  prefillData?: Partial<StockAdjustmentFormData>;
  showApprovalWorkflow?: boolean;
  maxAdjustmentAmount?: number;
}

const REASON_CODES = [
  { value: 'damaged_goods', label: 'Damaged Goods' },
  { value: 'theft_loss', label: 'Theft/Loss' },
  { value: 'expired_products', label: 'Expired Products' },
  { value: 'inventory_count_correction', label: 'Inventory Count Correction' },
  { value: 'supplier_error', label: 'Supplier Error' },
  { value: 'system_error', label: 'System Error' },
  { value: 'customer_return_damaged', label: 'Customer Return (Damaged)' },
  { value: 'promotional_giveaway', label: 'Promotional Giveaway' },
  { value: 'samples', label: 'Samples' },
  { value: 'other', label: 'Other' },
]

const APPROVAL_THRESHOLD = 50 // Require approval for adjustments > 50 units

const StockAdjustment: React.FC<StockAdjustmentProps> = ({
  onClose,
  onSuccess,
  initialProductId,
  prefillData,
  showApprovalWorkflow = true,
  maxAdjustmentAmount = 1000,
}) => {
  const [formData, setFormData] = useState<StockAdjustmentFormData>({
    productId: initialProductId || '',
    adjustmentType: 'increase',
    quantity: 0,
    reason: '',
    notes: '',
    requiresApproval: false,
    approverId: '',
    ...prefillData,
  })

  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [approvalMode, setApprovalMode] = useState(false)
  const [approvers] = useState<User[]>([
    { id: '3', username: 'manager1', role: 'manager', permissions: ['all'], isActive: true },
    { id: '1', username: 'admin', role: 'admin', permissions: ['all'], isActive: true },
  ])

  const { showSuccess, showError, showWarning } = useToast()

  // Load inventory and current user
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [inventoryData, user] = await Promise.all([
          inventoryService.getAllInventory(),
          Promise.resolve(authService.getCurrentUser()),
        ])
        
        setInventory(inventoryData)
        setCurrentUser(user)

        // Auto-select product if initialProductId provided
        if (initialProductId) {
          const product = inventoryData.find(p => p.productId === initialProductId)
          setSelectedProduct(product)
        }
      } catch (error) {
        console.error('Error loading data:', error)
        showError('Failed to load inventory data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [initialProductId])

  // Validation schema
  const getValidationSchema = (): ValidationSchema => ({
    productId: [
      { type: 'required', message: 'Product selection is required' },
    ],
    quantity: [
      { type: 'required', message: 'Quantity is required' },
      { type: 'custom', validator: (value: number) => {
        if (isNaN(value) || value <= 0) return 'Quantity must be a positive number'
        if (value > maxAdjustmentAmount) return `Maximum adjustment is ${maxAdjustmentAmount} units`
        return true
      }},
    ],
    reason: [
      { type: 'required', message: 'Reason is required' },
    ],
    notes: [
      { type: 'minLength', value: 10, message: 'Notes must be at least 10 characters' },
    ],
    approverId: [
      { type: 'custom', validator: (value: string) => {
        if (formData.requiresApproval && !value) return 'Approver selection is required'
        return true
      }},
    ],
  })

  // Validate form
  const validateForm = (): ValidationResult => {
    const result = Validator.validate(formData, getValidationSchema())
    const flattened = Validator.flattenErrors(result.errors)
    setValidationErrors(flattened)
    return result
  }

  // Handle form changes
  const handleInputChange = (field: keyof StockAdjustmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Check if approval is required
    if (field === 'quantity') {
      const requiresApproval = value > APPROVAL_THRESHOLD
      setFormData(prev => ({ ...prev, requiresApproval }))
    }
  }

  // Handle product selection
  const handleProductSelect = (productId: string) => {
    const product = inventory.find(p => p.productId === productId)
    setSelectedProduct(product)
    handleInputChange('productId', productId)
  }

  // Handle adjustment type change
  const handleAdjustmentTypeChange = (type: 'increase' | 'decrease' | 'set') => {
    setFormData(prev => ({ ...prev, adjustmentType: type }))
  }

  // Calculate new stock level
  const calculateNewStock = (): number => {
    if (!selectedProduct) return 0
    
    const {currentStock} = selectedProduct
    const {quantity} = formData
    
    switch (formData.adjustmentType) {
      case 'increase':
        return currentStock + quantity
      case 'decrease':
        return currentStock - quantity
      case 'set':
        return quantity
      default:
        return currentStock
    }
  }

  // Check if adjustment would result in negative stock
  const wouldBeNegativeStock = (): boolean => {
    const newStock = calculateNewStock()
    return newStock < 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    const validation = validateForm()
    if (!validation.isValid) {
      showWarning('Please correct the form errors')
      return
    }

    if (!currentUser) {
      showError('User not authenticated')
      return
    }

    // Check for negative stock
    if (wouldBeNegativeStock()) {
      showError('Adjustment would result in negative stock. Please reduce the quantity.')
      return
    }

    // Check if approval is required
    if (formData.requiresApproval && showApprovalWorkflow) {
      setApprovalMode(true)
      return
    }

    await processAdjustment()
  }

  // Process the actual adjustment
  const processAdjustment = async () => {
    if (!currentUser) {
      showError('User not authenticated')
      return
    }

    setSaving(true)
    
    try {
      const newStock = calculateNewStock()
      const stockDifference = newStock - selectedProduct.currentStock
      
      const result = await inventoryService.updateStock(
        formData.productId,
        stockDifference,
        'adjustment',
        currentUser.id,
        formData.reason,
        undefined,
        `Manual adjustment: ${formData.notes}`,
      )

      if (result.success) {
        showSuccess('Stock adjustment completed successfully')
        onSuccess?.(result.movement)
        onClose?.()
      } else {
        showError(result.error || 'Failed to adjust stock')
      }
    } catch (error) {
      console.error('Error adjusting stock:', error)
      showError('Failed to adjust stock')
    } finally {
      setSaving(false)
    }
  }

  // Handle approval submission
  const handleApproval = async (approved: boolean) => {
    if (!approved) {
      setApprovalMode(false)
      return
    }

    if (!formData.approverId) {
      showError('Please select an approver')
      return
    }

    const approver = approvers.find(a => a.id === formData.approverId)
    if (!approver) {
      showError('Invalid approver selected')
      return
    }

    await processAdjustment()
  }

  // Get adjustment type icon
  const getAdjustmentIcon = (type: string) => {
    switch (type) {
      case 'increase': return <Plus className="h-4 w-4 text-green-600" />
      case 'decrease': return <Minus className="h-4 w-4 text-red-600" />
      case 'set': return <Settings className="h-4 w-4 text-blue-600" />
      default: return <Package className="h-4 w-4" />
    }
  }

  // Get adjustment type description
  const getAdjustmentDescription = (type: string) => {
    switch (type) {
      case 'increase': return 'Add units to current stock'
      case 'decrease': return 'Remove units from current stock'
      case 'set': return 'Set exact stock level'
      default: return ''
    }
  }

  if (approvalMode) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <span>Approval Required</span>
          </CardTitle>
          <CardDescription>
            This stock adjustment requires manager approval
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Adjustment Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium">Adjustment Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Product:</span>
                <div className="font-medium">{selectedProduct?.productId}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Type:</span>
                <div className="font-medium flex items-center space-x-1">
                  {getAdjustmentIcon(formData.adjustmentType)}
                  <span>{formData.adjustmentType}</span>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Current Stock:</span>
                <div className="font-medium">{selectedProduct?.currentStock} units</div>
              </div>
              <div>
                <span className="text-muted-foreground">New Stock:</span>
                <div className="font-medium text-blue-600">{calculateNewStock()} units</div>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Reason:</span>
                <div className="font-medium">
                  {REASON_CODES.find(r => r.value === formData.reason)?.label || formData.reason}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Notes:</span>
                <div className="font-medium">{formData.notes}</div>
              </div>
            </div>
          </div>

          {/* Approver Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Approver</label>
            <select
              value={formData.approverId}
              onChange={(e) => handleInputChange('approverId', e.target.value)}
              className="w-full p-2 border border-input rounded-md bg-background"
            >
              <option value="">Select approver...</option>
              {approvers.map(approver => (
                <option key={approver.id} value={approver.id}>
                  {approver.username} ({approver.role})
                </option>
              ))}
            </select>
            {validationErrors.approverId && (
              <p className="text-sm text-red-600">{validationErrors.approverId}</p>
            )}
          </div>

          {/* Approval Actions */}
          <div className="flex items-center justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setApprovalMode(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleApproval(false)}
              disabled={saving}
            >
              Reject
            </Button>
            <Button
              onClick={() => handleApproval(true)}
              disabled={saving || !formData.approverId}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? <LoadingSpinner size="sm" /> : 'Approve & Process'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Stock Adjustment</span>
              </CardTitle>
              <CardDescription>
                Manually adjust inventory levels with proper audit logging
              </CardDescription>
            </div>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Approval Warning */}
      {formData.quantity > APPROVAL_THRESHOLD && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Large Adjustment Detected
              </span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Adjustments over {APPROVAL_THRESHOLD} units require manager approval.
            </p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Product Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Product</label>
                <select
                  value={formData.productId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full p-2 border border-input rounded-md bg-background mt-1"
                  disabled={!!initialProductId}
                >
                  <option value="">Select a product...</option>
                  {inventory.map(product => (
                    <option key={product.productId} value={product.productId}>
                      {product.productId} - Current: {product.currentStock} units
                    </option>
                  ))}
                </select>
                {validationErrors.productId && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.productId}</p>
                )}
              </div>

              {selectedProduct && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Current Stock Status</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Current Stock:</span>
                      <div className="font-medium">{selectedProduct.currentStock} units</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reserved:</span>
                      <div className="font-medium">{selectedProduct.reservedStock} units</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reorder Level:</span>
                      <div className="font-medium">{selectedProduct.reorderLevel} units</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Available:</span>
                      <div className="font-medium">
                        {selectedProduct.currentStock - selectedProduct.reservedStock} units
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Adjustment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Adjustment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Adjustment Type */}
              <div>
                <label className="text-sm font-medium">Adjustment Type</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(['increase', 'decrease', 'set'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleAdjustmentTypeChange(type)}
                      className={`p-2 border rounded-md text-sm font-medium transition-colors ${
                        formData.adjustmentType === type
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-1">
                        {getAdjustmentIcon(type)}
                        <span className="capitalize">{type}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getAdjustmentDescription(formData.adjustmentType)}
                </p>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-sm font-medium">
                  {formData.adjustmentType === 'set' ? 'Set Stock To' : 'Quantity'}
                </label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
                  placeholder="Enter quantity"
                  min="1"
                  max={maxAdjustmentAmount}
                  className="mt-1"
                />
                {validationErrors.quantity && (
                  <p className="text-sm text-red-600 mt-1">{validationErrors.quantity}</p>
                )}
              </div>

              {/* Preview */}
              {selectedProduct && formData.quantity > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Preview</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Current Stock:</span>
                      <span className="font-medium">{selectedProduct.currentStock} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span>New Stock:</span>
                      <span className="font-medium text-blue-600">{calculateNewStock()} units</span>
                    </div>
                    {wouldBeNegativeStock() && (
                      <div className="flex items-center space-x-1 text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="text-xs">Would result in negative stock</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reason and Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reason & Documentation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Reason Code */}
            <div>
              <label className="text-sm font-medium">Reason Code</label>
              <select
                value={formData.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                className="w-full p-2 border border-input rounded-md bg-background mt-1"
              >
                <option value="">Select a reason...</option>
                {REASON_CODES.map(reason => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
              {validationErrors.reason && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.reason}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium">Detailed Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Provide detailed explanation for this adjustment..."
                rows={4}
                className="w-full p-2 border border-input rounded-md bg-background mt-1 resize-none"
              />
              {validationErrors.notes && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.notes}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 10 characters required for audit trail
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {currentUser && (
                  <div className="flex items-center space-x-1">
                    <UserIcon className="h-3 w-3" />
                    <span>Adjusting as: {currentUser.username}</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                {onClose && (
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={saving || loading || !selectedProduct}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">
                        {formData.requiresApproval ? 'Requesting Approval...' : 'Processing...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {formData.requiresApproval ? 'Request Approval' : 'Apply Adjustment'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>

      <LoadingOverlay isLoading={loading || saving} />
    </div>
  )
}

export default StockAdjustment