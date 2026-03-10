/**
 * =============================================================================
 * LINE ITEMS MANAGER COMPONENT
 * =============================================================================
 *
 * Advanced line item management with inline editing, drag-and-drop reordering,
 * real-time calculations, and validation feedback
 */

'use client'

import { useMemo } from 'react'
import { UseFormReturn, useFormState, useWatch } from 'react-hook-form'
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
  costType: string | null
  fullLabel: string
}

interface LineItemsManagerProps {
  items: Array<DirectCostLineItem & { id?: string }>
  budgetCodes: BudgetCode[]
  onAdd: () => void
  onRemove: (index: number) => void
  onUpdate: (index: number, item: DirectCostLineItem) => void
  onCreateBudgetCode?: (index: number) => void
  form: UseFormReturn<DirectCostCreate | DirectCostUpdate>
}

interface SortableLineItemRowProps {
  item: DirectCostLineItem & { id?: string }
  index: number
  itemCount: number
  budgetCodes: BudgetCode[]
  onRemove: () => void
  onDuplicate: () => void
  onCreateBudgetCode?: (index: number) => void
  form: UseFormReturn<DirectCostCreate | DirectCostUpdate>
  errors?: unknown
  isValid: boolean
}

// =============================================================================
// STABLE SENSOR OPTIONS
// Module-level constants so useSensor/useSensors see the same object reference
// every render. Inline object literals create new refs each render, defeating
// useMemo inside useSensor and causing DndContext to re-initialize sensors.
// =============================================================================

const POINTER_SENSOR_OPTIONS = { activationConstraint: { distance: 8 } } as const
const KEYBOARD_SENSOR_OPTIONS = {
  coordinateGetter: sortableKeyboardCoordinates,
} as const

// =============================================================================
// SORTABLE LINE ITEM ROW COMPONENT
// =============================================================================

function SortableLineItemRow({
  item,
  index,
  itemCount,
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

  const quantity = useWatch({
    control: form.control,
    name: `line_items.${index}.quantity`,
  })
  const unitCost = useWatch({
    control: form.control,
    name: `line_items.${index}.unit_cost`,
  })
  const lineTotal = (Number(quantity) || 0) * (Number(unitCost) || 0)

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
      <TableCell className="w-10 px-1 py-1.5 align-top">
        <div
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      </TableCell>

      {/* Budget Code */}
      <TableCell className="min-w-72 px-1 py-1.5 align-top">
        <FormField
          control={form.control}
          name={`line_items.${index}.budget_code_id`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <BudgetCodeSelector
                  value={field.value || ''}
                  onValueChange={(value) => field.onChange(value)}
                  budgetCodes={budgetCodes}
                  onCreateNew={() => onCreateBudgetCode?.(index)}
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
      <TableCell className="min-w-64 px-1 py-1.5 align-top">
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
      <TableCell className="w-36 px-1 py-1.5 align-top">
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
      <TableCell className="w-36 px-1 py-1.5 align-top">
        <FormField
          control={form.control}
          name={`line_items.${index}.uom`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select" />
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
      <TableCell className="w-44 px-1 py-1.5 align-top">
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
      <TableCell className="w-40 px-1 py-1.5 align-top">
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
                <AlertCircle className="mt-1 h-3 w-3 text-status-warning" />
              </TooltipTrigger>
              <TooltipContent>
                <p>High value line item</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="w-24 px-1 py-1.5 align-top">
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
                  disabled={itemCount === 1}
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

  // Subscribe to formState errors ONCE (isolated) — avoids N subscriptions inside items.map()
  // which would cascade re-renders and cause infinite render loops in edit mode.
  // Scoped to 'line_items' so this component only re-renders when line_items errors change,
  // not on every top-level field state change (vendor, date, description, etc.)
  const { errors: formErrors } = useFormState({ control: form.control, name: 'line_items' })
  const watchedLineItems = useWatch({
    control: form.control,
    name: 'line_items',
  }) as DirectCostLineItem[] | undefined

  // Stable sortable IDs — prevents DndContext from seeing new array ref every render
  const sortableIds = useMemo(
    () => items.map((_, index) => `line-item-${index}`),
    [items.length]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, POINTER_SENSOR_OPTIONS),
    useSensor(KeyboardSensor, KEYBOARD_SENSOR_OPTIONS)
  )

  const grandTotal = useMemo(
    () =>
      (watchedLineItems ?? []).reduce((total, item) => {
        return total + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0)
      }, 0),
    [watchedLineItems]
  )

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
    <div className="space-y-4">
      {/* Line Items Table */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="overflow-x-auto overflow-hidden rounded-lg border border-border/70 bg-muted/20">
            <Table>
              <TableHeader className="border-y-0 [&_tr]:border-b-0">
                <TableRow className="bg-muted/70 hover:bg-muted/70">
                  <TableHead className="w-10 px-1 py-1.5"></TableHead>
                  <TableHead className="min-w-72 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                    Budget Code *
                  </TableHead>
                  <TableHead className="min-w-64 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                    Description
                  </TableHead>
                  <TableHead className="w-36 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                    Quantity *
                  </TableHead>
                  <TableHead className="w-36 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                    UOM
                  </TableHead>
                  <TableHead className="w-44 px-1 py-1.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                    Unit Cost *
                  </TableHead>
                  <TableHead className="w-40 px-1 py-1.5 text-right text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                    Line Total
                  </TableHead>
                  <TableHead className="w-24 px-1 py-1.5"></TableHead>
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
                    const errors = (formErrors.line_items as any[] | undefined)?.[index]
                    const isValid =
                      !errors &&
                      !!item.budget_code_id &&
                      !!item.quantity &&
                      item.unit_cost !== undefined

                    return (
                      <SortableLineItemRow
                        key={`line-item-${index}`}
                        item={item}
                        index={index}
                        itemCount={items.length}
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

                {items.length > 0 && (
                  <TableRow className="hover:bg-muted">
                    <TableCell className="px-1 py-2" />
                    <TableCell colSpan={5} className="px-1 py-3 text-xs font-semibold text-foreground">
                      Totals
                    </TableCell>
                    <TableCell className="px-1 py-2 text-right text-sm font-semibold text-foreground">
                      {formatCurrency(grandTotal)}
                    </TableCell>
                    <TableCell className="px-1 py-2" />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            size="default"
            onClick={onAdd}
            className="h-10 gap-2 bg-primary px-4 text-primary-foreground hover:bg-primary/90"
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
      </div>
    </div>
  )
}
