/**
 * =============================================================================
 * CHANGE ORDER LINE ITEMS TABLE COMPONENT
 * =============================================================================
 *
 * Editable line items table for change orders with inline editing,
 * real-time calculations, cost code integration, and totals display.
 */

'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Plus, Trash2, Calculator } from 'lucide-react'
import { formatCurrency } from '@/lib/table-config/formatters'
import { cn } from '@/lib/utils'
import { useCostCodes, type CostCodeOption } from '@/hooks/use-cost-codes'

// =============================================================================
// INTERFACES
// =============================================================================

export interface ChangeOrderLineItem {
  id?: string
  description: string
  cost_code_id?: string | null
  quantity: number
  unit_of_measure: string
  unit_price: number
  extended_amount?: number // calculated: qty × unit_price
}

interface LineItemsTableProps {
  lineItems: ChangeOrderLineItem[]
  onChange: (items: ChangeOrderLineItem[]) => void
  readOnly?: boolean
  showTotals?: boolean
}

// Unit of Measure options
const UOM_OPTIONS = [
  { value: 'LS', label: 'LS - Lump Sum' },
  { value: 'EA', label: 'EA - Each' },
  { value: 'SF', label: 'SF - Square Foot' },
  { value: 'LF', label: 'LF - Linear Foot' },
  { value: 'CY', label: 'CY - Cubic Yard' },
  { value: 'SY', label: 'SY - Square Yard' },
  { value: 'TON', label: 'TON - Ton' },
  { value: 'HR', label: 'HR - Hour' },
  { value: 'DAY', label: 'DAY - Day' },
  { value: 'MO', label: 'MO - Month' },
]

// =============================================================================
// LINE ITEM ROW COMPONENT
// =============================================================================

interface LineItemRowProps {
  item: ChangeOrderLineItem
  index: number
  costCodeOptions: CostCodeOption[]
  onUpdate: (item: ChangeOrderLineItem) => void
  onDelete: () => void
  readOnly: boolean
  canDelete: boolean
}

function LineItemRow({
  item,
  index,
  costCodeOptions,
  onUpdate,
  onDelete,
  readOnly,
  canDelete,
}: LineItemRowProps) {
  const extendedAmount = (item.quantity || 0) * (item.unit_price || 0)

  const handleFieldChange = (
    field: keyof ChangeOrderLineItem,
    value: string | number
  ) => {
    onUpdate({ ...item, [field]: value })
  }

  if (readOnly) {
    const selectedCostCode = costCodeOptions.find(
      (code) => code.value === item.cost_code_id
    )

    return (
      <TableRow>
        <TableCell>
          {selectedCostCode ? selectedCostCode.label : item.cost_code_id || '-'}
        </TableCell>
        <TableCell>{item.description || '-'}</TableCell>
        <TableCell className="text-right">{item.quantity}</TableCell>
        <TableCell>{item.unit_of_measure}</TableCell>
        <TableCell className="text-right">
          {formatCurrency(item.unit_price)}
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(extendedAmount)}
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow className="group hover:bg-muted/50 transition-colors">
      {/* Description */}
      <TableCell className="min-w-64">
        <Input
          placeholder="Line item description"
          value={item.description}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          className="h-9 border-none bg-transparent focus-visible:ring-1"
          data-testid={`line-item-description-${index}`}
        />
      </TableCell>

      {/* Cost Code */}
      <TableCell className="min-w-52">
        <Select
          value={item.cost_code_id || undefined}
          onValueChange={(value) => handleFieldChange('cost_code_id', value)}
        >
          <SelectTrigger className="h-9 border-none bg-transparent focus:ring-1">
            <SelectValue placeholder="Select cost code" />
          </SelectTrigger>
          <SelectContent>
            {costCodeOptions.map((code) => (
              <SelectItem key={code.value} value={code.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{code.code}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {code.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Quantity */}
      <TableCell className="w-28">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={String(item.quantity)}
          onChange={(e) =>
            handleFieldChange('quantity', parseFloat(e.target.value) || 0)
          }
          className="h-9 text-right border-none bg-transparent focus-visible:ring-1"
          placeholder="0"
          data-testid={`line-item-quantity-${index}`}
        />
      </TableCell>

      {/* Unit of Measure */}
      <TableCell className="w-32">
        <Select
          value={item.unit_of_measure}
          onValueChange={(value) => handleFieldChange('unit_of_measure', value)}
        >
          <SelectTrigger className="h-9 border-none bg-transparent focus:ring-1">
            <SelectValue placeholder="Select UOM" />
          </SelectTrigger>
          <SelectContent>
            {UOM_OPTIONS.map((uom) => (
              <SelectItem key={uom.value} value={uom.value}>
                {uom.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Unit Price */}
      <TableCell className="w-32">
        <div className="relative">
          <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={String(item.unit_price)}
            onChange={(e) =>
              handleFieldChange('unit_price', parseFloat(e.target.value) || 0)
            }
            className="h-9 pl-6 text-right border-none bg-transparent focus-visible:ring-1"
            placeholder="0.00"
            data-testid={`line-item-unit-price-${index}`}
          />
        </div>
      </TableCell>

      {/* Extended Amount (Calculated) */}
      <TableCell className="w-32">
        <div className="relative">
          <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            value={formatCurrency(extendedAmount).replace('$', '')}
            className="h-9 pl-6 text-right border-none bg-muted/50 font-medium"
            readOnly
            tabIndex={-1}
            data-testid={`line-item-extended-${index}`}
          />
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell className="w-20">
        <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  disabled={!canDelete}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remove line item</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>
    </TableRow>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function LineItemsTable({
  lineItems,
  onChange,
  readOnly = false,
  showTotals = true,
}: LineItemsTableProps) {
  // Fetch cost codes for the project
  const { options: costCodeOptions, isLoading: costCodesLoading } = useCostCodes({
    enabled: true,
    useFallback: true,
  })

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + (item.quantity || 0) * (item.unit_price || 0)
    }, 0)

    return {
      subtotal,
      total: subtotal, // Can add tax/fees here if needed
    }
  }, [lineItems])

  const handleAddRow = () => {
    const newItem: ChangeOrderLineItem = {
      description: '',
      cost_code_id: null,
      quantity: 1,
      unit_of_measure: 'LS',
      unit_price: 0,
    }
    onChange([...lineItems, newItem])
  }

  const handleUpdateRow = (index: number, updatedItem: ChangeOrderLineItem) => {
    const newItems = [...lineItems]
    newItems[index] = updatedItem
    onChange(newItems)
  }

  const handleDeleteRow = (index: number) => {
    const newItems = lineItems.filter((_, i) => i !== index)
    onChange(newItems)
  }

  // Keyboard navigation helper (Tab between cells)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      // Let default Tab behavior handle navigation
      // Browser will automatically move to next input
    }
  }

  return (
    <div className="space-y-4" onKeyDown={handleKeyDown}>
      {/* Line Items Table */}
      <Card className="border-0 shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {readOnly ? (
                  <>
                    <TableHead className="min-w-48">Cost Code</TableHead>
                    <TableHead className="min-w-48">Description</TableHead>
                    <TableHead className="w-28 text-right">Quantity</TableHead>
                    <TableHead className="w-24">UOM</TableHead>
                    <TableHead className="w-32 text-right">Unit Price</TableHead>
                    <TableHead className="w-32 text-right">
                      Extended Amount
                    </TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="min-w-64">Description</TableHead>
                    <TableHead className="min-w-48">Cost Code</TableHead>
                    <TableHead className="w-28 text-right">Quantity</TableHead>
                    <TableHead className="w-32">UOM</TableHead>
                    <TableHead className="w-32 text-right">Unit Price</TableHead>
                    <TableHead className="w-32 text-right">
                      Extended Amount
                    </TableHead>
                    <TableHead className="w-20 text-center">Actions</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={readOnly ? 6 : 7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <Calculator className="h-8 w-8 text-muted-foreground/50" />
                      <p>No line items yet</p>
                      {!readOnly && (
                        <p className="text-sm">
                          Click &ldquo;Add Line Item&rdquo; to get started
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                lineItems.map((item, index) => (
                  <LineItemRow
                    key={`line-item-${index}`}
                    item={item}
                    index={index}
                    costCodeOptions={costCodeOptions}
                    onUpdate={(updatedItem) => handleUpdateRow(index, updatedItem)}
                    onDelete={() => handleDeleteRow(index)}
                    readOnly={readOnly}
                    canDelete={lineItems.length > 1}
                  />
                ))
              )}

              {/* Totals Row */}
              {showTotals && lineItems.length > 0 && (
                <>
                  <TableRow className="bg-muted/30 font-medium border-t-2">
                    <TableCell
                      colSpan={readOnly ? 5 : 5}
                      className="text-right pr-4"
                    >
                      Subtotal:
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(totals.subtotal)}
                      </div>
                    </TableCell>
                    {!readOnly && <TableCell></TableCell>}
                  </TableRow>
                  <TableRow className="bg-muted/50 font-bold border-t">
                    <TableCell
                      colSpan={readOnly ? 5 : 5}
                      className="text-right pr-4"
                    >
                      Total:
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-lg font-bold">
                        {formatCurrency(totals.total)}
                      </div>
                    </TableCell>
                    {!readOnly && <TableCell></TableCell>}
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Actions */}
      {!readOnly && (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            className="flex items-center gap-2"
            disabled={costCodesLoading}
            data-testid="add-line-item-button"
          >
            <Plus className="h-4 w-4" />
            Add Line Item
          </Button>

          {lineItems.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {lineItems.length} line item{lineItems.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Summary Card */}
      {showTotals && lineItems.length > 0 && (
        <div className="flex justify-end">
          <Card className="min-w-64 border-0 p-4 shadow-none">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Subtotal:</span>
                <span className="text-lg font-semibold">
                  {formatCurrency(totals.subtotal)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-base font-bold">Total:</span>
                <span className="text-xl font-bold">
                  {formatCurrency(totals.total)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
