import React from 'react'
import { TableHead, TableHeader, TableRow } from './ui/table'
import { TrendingUp } from 'lucide-react'

interface SortConfig {
  sortBy: 'name' | 'price' | 'quantity' | 'total'
  sortOrder: 'asc' | 'desc'
}

interface TableHeadersProps {
  sortConfig: SortConfig
  onToggleSort: (column: 'name' | 'price' | 'quantity' | 'total') => void
}

const TableHeaders: React.FC<TableHeadersProps> = ({ sortConfig, onToggleSort }) => {
  return (
    <TableHeader className="sticky top-0 bg-white border-b z-10">
      <TableRow className="text-sm font-semibold text-gray-700">
        <TableHead
          className="w-20 text-center cursor-pointer hover:bg-gray-50"
          onClick={() => onToggleSort('quantity')}
        >
          <div className="flex items-center justify-center space-x-1">
            <span>Qty</span>
            {sortConfig.sortBy === 'quantity' && (
              <TrendingUp
                className={`h-3 w-3 ${sortConfig.sortOrder === 'desc' ? 'rotate-180' : ''}`}
              />
            )}
          </div>
        </TableHead>
        <TableHead
          className="cursor-pointer hover:bg-gray-50"
          onClick={() => onToggleSort('name')}
        >
          <div className="flex items-center space-x-1">
            <span>Product</span>
            {sortConfig.sortBy === 'name' && (
              <TrendingUp
                className={`h-3 w-3 ${sortConfig.sortOrder === 'desc' ? 'rotate-180' : ''}`}
              />
            )}
          </div>
        </TableHead>
        <TableHead
          className="text-right w-24 cursor-pointer hover:bg-gray-50"
          onClick={() => onToggleSort('price')}
        >
          <div className="flex items-center justify-end space-x-1">
            <span>Price</span>
            {sortConfig.sortBy === 'price' && (
              <TrendingUp
                className={`h-3 w-3 ${sortConfig.sortOrder === 'desc' ? 'rotate-180' : ''}`}
              />
            )}
          </div>
        </TableHead>
        <TableHead className="text-right w-20">Discount</TableHead>
        <TableHead
          className="text-right w-28 cursor-pointer hover:bg-gray-50"
          onClick={() => onToggleSort('total')}
        >
          <div className="flex items-center justify-end space-x-1">
            <span>Total</span>
            {sortConfig.sortBy === 'total' && (
              <TrendingUp
                className={`h-3 w-3 ${sortConfig.sortOrder === 'desc' ? 'rotate-180' : ''}`}
              />
            )}
          </div>
        </TableHead>
        <TableHead className="w-20 text-center">Actions</TableHead>
      </TableRow>
    </TableHeader>
  )
}

export default TableHeaders