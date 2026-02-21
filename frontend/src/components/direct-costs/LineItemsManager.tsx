/**
 * =============================================================================
 * LINE ITEMS MANAGER COMPONENT
 * =============================================================================
 *
 * Advanced line item management with inline editing, drag-and-drop reordering,
 * real-time calculations, and validation feedback
 */

'use client'

import { useCallback } from 'react'
import { UseFormReturn } from 'react-hook-form'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BudgetCodeSelector } from '@/components/budget/budget-code-selector'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  GripVertical,
  Copy,
  Calculator,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { Text } from '@/components/ui/text'
import {
  DirectCostCreate,
  DirectCostUpdate,
  UnitTypes,
  type DirectCostLineItem,
} from '@/lib/schemas/direct-costs'
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
  costType?: string | null
  fullLabel: string
}

interface LineItemsManagerProps {
  items: Array<DirectCostLineItem & { id?: string }>
  budgetCodes: BudgetCode[]
  onAdd: () => void
  onRemove: (index: number) => void
  onUpdate: (index: number, item: DirectCostLineItem) => void
  onCreateBudgetCode?: () => void
  form: UseFormReturn<DirectCostCreate | DirectCostUpdate>
}

interface SortableLineItemRowProps {
  item: DirectCostLineItem & { id?: string }
  index: number
  budgetCodes: BudgetCode[]
  onRemove: () => void
  onDuplicate: () => void
  onCreateBudgetCode?: () => void
  form: UseFormReturn<DirectCostCreate | DirectCostUpdate>
  errors?: unknown
  isValid: boolean
}

// =============================================================================
// SORTABLE LINE ITEM ROW COMPONENT
// =============================================================================

function SortableLineItemRow({
  item,
  index,
  budgetCodes,
  onRemove,
  onDuplicate,
  onCreateBudgetCode,
  form,
  errors,
  isValid,
}: SortableLineItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `line-item-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const lineTotal = (item.quantity || 0) * (item.unit_cost || 0)

  return (
    <TableRow
      ref={setNodeRef}
      className={cn(
        'group border-b border-border/60 bg-background transition-colors hover:bg-muted/20',
        isDragging && 'opacity-50',
        !!errors && 'bg-destructive/5'
      )}
      style={style}
    >
      {/* Drag handle */}
      <TableCell className="w-10 p-3 align-top">
        <div
          {...attributes}
          {...listeners}
          className="mt-2 cursor-grab rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      </TableCell>

      {/* Budget Code */}
      <TableCell className="min-w-72 p-3 align-top">
        <FormField
          control={form.control}
          name={`line_items.${index}.budget_code_id`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <BudgetCodeSelector
                  value={field.value || ''}
                  onValueChange={(value) => field.onChange(value)}
                  budgetCodes={budgetCodes.map(code => ({
                    ...code,
                    costType: code.costType || code.category || null,
                    fullLabel: code.fullLabel || `${code.code} - ${code.description}`,
                  }))}
                  onCreateNew={onCreateBudgetCode}
                  placeholder="Select budget code..."
                  error={!!errors && typeof errors === 'object' && errors !== null && 'budget_code_id' in errors}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </TableCell>

      {/* Description */}
      <TableCell className="min-w-64 p-3 align-top">
        <FormField
          control={form.control}
          name={`line_items.${index}.description`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  placeholder="Enter description"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </TableCell>

      {/* Quantity */}
      <TableCell className="w-36 p-3 align-top">
        <FormField
          control={form.control}
          name={`line_items.${index}.quantity`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <NumberInput
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                  step="1"
                  formatOnBlur={false}
                  className={cn(
                    'h-10 w-full text-right',
                    !!errors && typeof errors === 'object' && errors !== null && 'quantity' in errors && 'text-destructive'
                  )}
                  placeholder="Enter qty"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </TableCell>

      {/* UOM */}
      <TableCell className="w-28 p-3 align-top">
        <FormField
          control={form.control}
          name={`line_items.${index}.uom`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UnitTypes.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
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

      {/* Unit Cost */}
      <TableCell className="w-44 p-3 align-top">
        <FormField
          control={form.control}
          name={`line_items.${index}.unit_cost`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <InputGroup className={cn(
                  !!errors && typeof errors === 'object' && errors !== null && 'unit_cost' in errors && 'border-destructive'
                )}>
                  <InputGroupAddon>$</InputGroupAddon>
                  <InputGroupInput
                    type="number"
                    step="0.01"
                    className="h-10 text-right"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    placeholder="Enter amount"
                  />
                </InputGroup>
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </TableCell>

      {/* Line Total */}
      <TableCell className="w-40 p-3 align-top">
        <div
          className={cn(
            'pt-2 text-right text-sm font-semibold',
            lineTotal > 0 ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {formatCurrency(lineTotal)}
        </div>
        {lineTotal > 1000 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertCircle className="h-3 w-3 text-amber-500 mt-1" />
              </TooltipTrigger>
              <TooltipContent>
                <p>High value line item</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="w-24 p-3 align-top">
        <div className="flex items-center justify-end space-x-1 opacity-80 transition-opacity md:opacity-0 md:group-hover:opacity-100">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onDuplicate}
                  className="h-7 w-7 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Duplicate line item</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRemove}
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  disabled={
                    (form.getValues('line_items') || []).length === 1
                  }
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
        <div className="mt-2 flex justify-end">
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

export function LineItemsManager({
  items,
  budgetCodes,
  onAdd,
  onRemove,
  onCreateBudgetCode,
  form,
}: LineItemsManagerProps) {

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Calculate totals
  const calculateGrandTotal = useCallback(() => {
    return items.reduce((total, item) => {
      return total + (item.quantity || 0) * (item.unit_cost || 0)
    }, 0)
  }, [items])

  const grandTotal = calculateGrandTotal()

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(
        (_, index) => `line-item-${index}` === active.id
      )
      const newIndex = items.findIndex(
        (_, index) => `line-item-${index}` === over.id
      )

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedItems = arrayMove(items, oldIndex, newIndex)

        // Update form values
        reorderedItems.forEach((item, index) => {
          form.setValue(`line_items.${index}`, item)
        })
      }
    }
  }

  // Handle duplicate line item
  const handleDuplicate = (index: number) => {
    const itemToDuplicate = items[index]
    const duplicatedItem = {
      ...itemToDuplicate,
      id: undefined, // Remove ID for new item
      description: `${itemToDuplicate.description || ''} (Copy)`.trim(),
    }

    onAdd()

    // Set the values for the new item after onAdd creates it
    setTimeout(() => {
      const newIndex = items.length
      Object.entries(duplicatedItem).forEach(([key, value]) => {
        if (key !== 'id') {
          form.setValue(
            `line_items.${newIndex}.${key}` as never,
            value as never
          )
        }
      })
    }, 0)
  }

  return (
    <div className="space-y-5">
      {/* Line Items Table */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((_, index) => `line-item-${index}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="overflow-hidden rounded-lg border border-border/70 bg-muted/20">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/70 hover:bg-muted/70">
                  <TableHead className="w-[40px] py-3"></TableHead>
                  <TableHead className="min-w-72 py-3 text-xs font-semibold tracking-wide text-muted-foreground">
                    Budget Code *
                  </TableHead>
                  <TableHead className="min-w-64 py-3 text-xs font-semibold tracking-wide text-muted-foreground">
                    Description
                  </TableHead>
                  <TableHead className="w-36 py-3 text-xs font-semibold tracking-wide text-muted-foreground">
                    Quantity *
                  </TableHead>
                  <TableHead className="w-28 py-3 text-xs font-semibold tracking-wide text-muted-foreground">
                    UOM
                  </TableHead>
                  <TableHead className="w-44 py-3 text-xs font-semibold tracking-wide text-muted-foreground">
                    Unit Cost *
                  </TableHead>
                  <TableHead className="w-40 py-3 text-right text-xs font-semibold tracking-wide text-muted-foreground">
                    Line Total
                  </TableHead>
                  <TableHead className="w-24 py-3"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-8 text-center text-muted-foreground"
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
                    const errors = form.formState.errors.line_items?.[index]
                    const isValid =
                      !errors &&
                      !!form.getValues(`line_items.${index}.budget_code_id`) &&
                      !!form.getValues(`line_items.${index}.quantity`) &&
                      form.getValues(`line_items.${index}.unit_cost`) !==
                        undefined

                    return (
                      <SortableLineItemRow
                        key={`line-item-${index}`}
                        item={item}
                        index={index}
                        budgetCodes={budgetCodes}
                        onRemove={() => onRemove(index)}
                        onDuplicate={() => handleDuplicate(index)}
                        onCreateBudgetCode={onCreateBudgetCode}
                        form={form}
                        errors={errors}
                        isValid={isValid}
                      />
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </SortableContext>
      </DndContext>

      {/* Actions and Total */}
      <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="default"
            onClick={onAdd}
            className="h-10 gap-2 bg-brand px-4 text-white hover:bg-brand-hover"
          >
            <Plus className="h-4 w-4" />
            Add Line Item
          </Button>

          {items.length > 1 && (
            <div className="text-sm text-muted-foreground">
              {items.length} line items
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border/70 bg-background px-4 py-3 text-right">
          <div className="text-xs font-medium tracking-wide text-muted-foreground">Grand Total</div>
          <div className="text-2xl font-semibold">
            {formatCurrency(grandTotal)}
          </div>
          {grandTotal > 10000 && (
            <Badge variant="secondary" className="text-xs mt-1">
              High Value
            </Badge>
          )}
        </div>
      </div>

    </div>
  )
}
