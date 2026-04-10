/**
 * =============================================================================
 * CHANGE EVENT LINE ITEMS GRID COMPONENT
 * =============================================================================
 *
 * Editable line items grid for change events with inline editing,
 * real-time calculations, and integration with react-hook-form
 */

'use client'

import { UseFormReturn, FieldError } from 'react-hook-form'
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
import { Badge } from '@/components/ui/badge'
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus,
  Trash2,
  Calculator,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { Text } from '@/components/ds/text'
import { formatCurrency } from '@/lib/table-config/formatters'
import { cn } from '@/lib/utils'

// =============================================================================
// INTERFACES
// =============================================================================

interface BudgetCode {
  id: string
  code: string
  description: string
  category?: string
}

interface Vendor {
  id: string
  name: string
}

interface Contract {
  id: string
  number: string
  title: string
}

export interface ChangeEventLineItem {
  id?: string
  budget_code_id?: string | null
  description?: string | null
  quantity?: number | null
  unit_of_measure?: string | null
  unit_cost?: number | null
  cost_rom?: number | null
  revenue_rom?: number | null
  non_committed_cost?: number | null
  vendor_id?: string | null
  contract_id?: number | null
}

export interface ChangeEventFormData {
  line_items: ChangeEventLineItem[]
  [key: string]: unknown
}

export interface MarkupRow {
  markup_type: string
  percentage: number
  calculation_order: number
  compound: boolean
}

interface ChangeEventLineItemsGridProps {
  items: ChangeEventLineItem[]
  budgetCodes: BudgetCode[]
  vendors: Vendor[]
  contracts: Contract[]
  onAdd: () => void
  onRemove: (index: number) => void
  onUpdate: (index: number, item: ChangeEventLineItem) => void
  form: UseFormReturn<ChangeEventFormData>
  expectingRevenue?: boolean
  markupRows?: MarkupRow[]
}

// =============================================================================
// LINE ITEM ROW COMPONENT
// =============================================================================

interface LineItemRowProps {
  item: ChangeEventLineItem
  index: number
  budgetCodes: BudgetCode[]
  vendors: Vendor[]
  contracts: Contract[]
  onRemove: () => void
  form: UseFormReturn<ChangeEventFormData>
  errors?: Record<string, FieldError> | FieldError
  isValid: boolean
  expectingRevenue: boolean
}

function LineItemRow({
  item,
  index,
  budgetCodes,
  vendors,
  contracts,
  onRemove,
  form,
  errors,
  isValid,
  expectingRevenue,
}: LineItemRowProps) {
  const lineTotal = (item.quantity || 0) * (item.unit_cost || 0)
  const selectedBudgetCode = budgetCodes?.find(
    (bc) => bc.id === item.budget_code_id
  )

  // Type guard to check if errors is a Record
  const errorRecord = errors && typeof errors === 'object' && 'budget_code_id' in errors
    ? errors as Record<string, FieldError>
    : undefined

  return (
    <TableRow
      className={cn(
        'group hover:bg-muted/50 transition-colors',
        errors && 'bg-destructive/5'
      )}
    >
      {/* Budget Code */}
      <TableCell className="min-w-52">
        <FormField
          control={form.control}
          name={`line_items.${index}.budget_code_id`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                >
                  <SelectTrigger
                    className={cn(
                      'h-9',
                      errorRecord?.budget_code_id && 'border-destructive'
                    )}
                  >
                    <SelectValue placeholder="Select budget code" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetCodes.map((code) => (
                      <SelectItem key={code.id} value={code.id}>
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
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        {selectedBudgetCode && (
          <div className="mt-1 text-xs text-muted-foreground">
            {selectedBudgetCode.category && (
              <Badge variant="outline" className="text-xs">
                {selectedBudgetCode.category}
              </Badge>
            )}
          </div>
        )}
      </TableCell>

      {/* Description */}
      <TableCell className="min-w-52">
        <FormField
          control={form.control}
          name={`line_items.${index}.description`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  placeholder="Line item description"
                  {...field}
                  value={field.value || ''}
                  className="h-9 border-none bg-transparent focus-visible:ring-1"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </TableCell>

      {/* Vendor */}
      <TableCell className="min-w-40">
        <FormField
          control={form.control}
          name={`line_items.${index}.vendor_id`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                >
                  <SelectTrigger className="h-9 border-none bg-transparent focus:ring-1">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </TableCell>

      {/* Contract */}
      <TableCell className="min-w-40">
        <FormField
          control={form.control}
          name={`line_items.${index}.contract_id`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={field.value?.toString() || undefined}
                >
                  <SelectTrigger className="h-9 border-none bg-transparent focus:ring-1">
                    <SelectValue placeholder="Select contract" />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.map((contract) => (
                      <SelectItem
                        key={contract.id}
                        value={contract.id.toString()}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{contract.number}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {contract.title}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </TableCell>

      {/* Quantity */}
      <TableCell className="w-28">
        <FormField
          control={form.control}
          name={`line_items.${index}.quantity`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    value={String(field.value ?? '')}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className={cn(
                      'h-9 text-right border-none bg-transparent focus-visible:ring-1',
                      errorRecord?.quantity && 'text-destructive'
                    )}
                    placeholder=""
                    data-testid={`change-event-line-item-quantity-${index}`}
                  />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </TableCell>

      {/* UOM */}
      <TableCell className="w-24">
        <FormField
          control={form.control}
          name={`line_items.${index}.unit_of_measure`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  {...field}
                  value={field.value || 'LS'}
                  className="h-9 border-none bg-transparent focus-visible:ring-1"
                  placeholder="LS"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </TableCell>

      {/* Unit Cost */}
      <TableCell className="w-32">
        <FormField
          control={form.control}
          name={`line_items.${index}.unit_cost`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    value={String(field.value ?? '')}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className={cn(
                      'h-9 pl-6 text-right border-none bg-transparent focus-visible:ring-1',
                      errorRecord?.unit_cost && 'border-destructive'
                    )}
                    placeholder=""
                    data-testid={`change-event-line-item-unit-cost-${index}`}
                  />
                </div>
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </TableCell>

      {/* Cost ROM (Calculated) */}
      <TableCell className="w-32">
        <FormField
          control={form.control}
          name={`line_items.${index}.cost_rom`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    value={lineTotal}
                    className="h-9 pl-6 text-right border-none bg-muted/50 font-medium"
                    readOnly
                    data-testid={`change-event-line-item-cost-rom-${index}`}
                  />
                </div>
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </TableCell>

      {/* Revenue ROM (Conditional) */}
      {expectingRevenue && (
        <TableCell className="w-32">
          <FormField
            control={form.control}
            name={`line_items.${index}.revenue_rom`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...field}
                      value={String(field.value ?? '')}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="h-9 pl-6 text-right border-none bg-transparent focus-visible:ring-1"
                      placeholder=""
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </TableCell>
      )}

      {/* Non-Committed Cost */}
      <TableCell className="w-32">
        <FormField
          control={form.control}
          name={`line_items.${index}.non_committed_cost`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    value={String(field.value ?? '')}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className="h-9 pl-6 text-right border-none bg-transparent focus-visible:ring-1"
                    placeholder=""
                    data-testid={`change-event-line-item-non-committed-${index}`}
                  />
                </div>
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
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
                  onClick={onRemove}
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  disabled={(form.getValues('line_items') || []).length === 1}
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

        {/* Validation indicator */}
        <div className="mt-1 flex justify-center">
          {isValid ? (
            <CheckCircle2 className="h-3 w-3 text-green-500" />
          ) : errors ? (
            <AlertCircle className="h-3 w-3 text-destructive" />
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ChangeEventLineItemsGrid({
  items,
  budgetCodes,
  vendors,
  contracts,
  onAdd,
  onRemove,
  form,
  expectingRevenue = false,
  markupRows = [],
}: ChangeEventLineItemsGridProps) {
  // Calculate totals
  const calculateTotals = () => {
    return items.reduce(
      (totals, item) => ({
        costRom: totals.costRom + ((item.quantity || 0) * (item.unit_cost || 0)),
        revenueRom: totals.revenueRom + (item.revenue_rom || 0),
        nonCommittedCost:
          totals.nonCommittedCost + (item.non_committed_cost || 0),
      }),
      { costRom: 0, revenueRom: 0, nonCommittedCost: 0 }
    )
  }

  const totals = calculateTotals()

  // Calculate markup amounts from Revenue ROM total
  const markupAmounts = markupRows
    .sort((a, b) => a.calculation_order - b.calculation_order)
    .map((markup) => {
      const base = markup.compound
        ? totals.revenueRom // compound would use running total, simplified here
        : totals.revenueRom
      const amount = base * (markup.percentage / 100)
      return {
        ...markup,
        amount,
        label: markup.markup_type.charAt(0).toUpperCase() + markup.markup_type.slice(1),
      }
    })

  return (
    <div className="space-y-4">
      {/* Line Items Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-48">Budget Code *</TableHead>
                <TableHead className="min-w-48">Description</TableHead>
                <TableHead className="min-w-40">Vendor</TableHead>
                <TableHead className="min-w-40">Contract</TableHead>
                <TableHead className="w-28 text-right">Quantity</TableHead>
                <TableHead className="w-24">UOM</TableHead>
                <TableHead className="w-32 text-right">Unit Cost</TableHead>
                <TableHead className="w-32 text-right">Cost ROM</TableHead>
                {expectingRevenue && (
                  <TableHead className="w-32 text-right">Revenue ROM</TableHead>
                )}
                <TableHead className="w-32 text-right">
                  Non-Committed
                </TableHead>
                <TableHead className="w-20 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={expectingRevenue ? 11 : 10}
                    className="text-center py-8 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <Calculator className="h-8 w-8 text-muted-foreground/50" />
                      <Text>No line items yet</Text>
                      <Text size="sm">
                        Click &ldquo;Add Line Item&rdquo; to get started
                      </Text>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => {
                  const errors = form.formState.errors.line_items?.[index] as Record<string, FieldError> | FieldError | undefined
                  const isValid =
                    !errors &&
                    !!form.getValues(`line_items.${index}.budget_code_id`) &&
                    !!form.getValues(`line_items.${index}.quantity`)

                  return (
                    <LineItemRow
                      key={`line-item-${index}`}
                      item={item}
                      index={index}
                      budgetCodes={budgetCodes}
                      vendors={vendors}
                      contracts={contracts}
                      onRemove={() => onRemove(index)}
                      form={form}
                      errors={errors}
                      isValid={isValid}
                      expectingRevenue={expectingRevenue}
                    />
                  )
                })
              )}

              {/* Totals Row */}
              {items.length > 0 && (
                <TableRow className="bg-muted/30 font-medium border-t-2">
                  <TableCell colSpan={7} className="text-right pr-4">
                    Totals:
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(totals.costRom)}
                    </div>
                  </TableCell>
                  {expectingRevenue && (
                    <TableCell className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(totals.revenueRom)}
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(totals.nonCommittedCost)}
                    </div>
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}

              {/* Auto-Calculated Markup Rows (Insurance, Fee, etc.) */}
              {items.length > 0 && markupAmounts.length > 0 && expectingRevenue && (
                <>
                  {markupAmounts.map((markup) => (
                    <TableRow
                      key={markup.markup_type}
                      className="bg-amber-50/50 dark:bg-amber-950/20 text-sm italic"
                    >
                      <TableCell colSpan={7} className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Calculator className="h-3 w-3 text-amber-600" />
                          <span className="text-amber-700 dark:text-amber-400">
                            {markup.label} ({markup.percentage}%)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-amber-700 dark:text-amber-400">
                          {formatCurrency(markup.amount)}
                        </span>
                      </TableCell>
                      {expectingRevenue && (
                        <TableCell className="text-right">
                          <span className="text-amber-700 dark:text-amber-400">
                            {formatCurrency(markup.amount)}
                          </span>
                        </TableCell>
                      )}
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold border-t">
                    <TableCell colSpan={7} className="text-right pr-4">
                      Grand Total (with markup):
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totals.costRom + markupAmounts.reduce((s, m) => s + m.amount, 0))}
                    </TableCell>
                    {expectingRevenue && (
                      <TableCell className="text-right">
                        {formatCurrency(totals.revenueRom + markupAmounts.reduce((s, m) => s + m.amount, 0))}
                      </TableCell>
                    )}
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="flex items-center gap-2"
          data-testid="change-event-line-item-add"
        >
          <Plus />
          Add Line Item
        </Button>

        {items.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {items.length} line item{items.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Total Cost ROM</div>
                <div
                  className="text-lg font-semibold"
                  data-testid="change-event-line-item-total-cost-rom"
                >
                  {formatCurrency(totals.costRom)}
                </div>
              </div>
            </div>
          </Card>

          {expectingRevenue && (
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-mono text-muted-foreground">
                  $
                </span>
                <div>
                  <div className="text-sm font-medium">Total Revenue ROM</div>
                  <div
                    className="text-lg font-semibold"
                    data-testid="change-event-line-item-total-revenue-rom"
                  >
                    {formatCurrency(totals.revenueRom)}
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Non-Committed</div>
                <div
                  className="text-lg font-semibold"
                  data-testid="change-event-line-item-total-non-committed"
                >
                  {formatCurrency(totals.nonCommittedCost)}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
