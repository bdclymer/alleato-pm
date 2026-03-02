import * as React from "react"
import { Plus, X, Info, KeyboardIcon, Save } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { BudgetButton } from "./budget-button"
import { BudgetFormField } from "./budget-form-field"
import { BudgetCodeSelector } from "./budget-code-selector"
import { NumberInput } from "@/components/ui/number-input"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface BudgetCode {
  id: string
  code: string
  costType: string | null
  description: string
  fullLabel: string
}

interface LineItemRow {
  id: string
  budgetCodeId: string
  budgetCodeLabel: string
  qty: string
  uom: string
  unitCost: string
  amount: string
  errors?: Record<string, string>
}

interface EnhancedBudgetLineItemModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onSuccess?: () => void
  budgetCodes?: BudgetCode[]
  onCreateBudgetCode?: () => void
}

const UOM_OPTIONS = [
  { value: "EA", label: "EA - Each" },
  { value: "HR", label: "HR - Hour" },
  { value: "DAY", label: "DAY - Day" },
  { value: "WK", label: "WK - Week" },
  { value: "MO", label: "MO - Month" },
  { value: "LS", label: "LS - Lump Sum" },
  { value: "LF", label: "LF - Linear Foot" },
  { value: "SF", label: "SF - Square Foot" },
  { value: "SY", label: "SY - Square Yard" },
  { value: "CF", label: "CF - Cubic Foot" },
  { value: "CY", label: "CY - Cubic Yard" },
  { value: "LB", label: "LB - Pound" },
  { value: "TON", label: "TON - Ton" },
  { value: "GAL", label: "GAL - Gallon" },
]

/**
 * Enhanced budget line item modal with improved UX
 * Features:
 * - Real-time validation with inline feedback
 * - Keyboard shortcuts and optimized navigation
 * - Auto-calculation of amounts
 * - Smart form field management
 * - Contextual help and tooltips
 * - Consistent styling and spacing
 */
export function EnhancedBudgetLineItemModal({
  open,
  onOpenChange,
  projectId,
  onSuccess,
  budgetCodes = [],
  onCreateBudgetCode,
}: EnhancedBudgetLineItemModalProps) {
  const [rows, setRows] = React.useState<LineItemRow[]>([
    {
      id: "1",
      budgetCodeId: "",
      budgetCodeLabel: "",
      qty: "",
      uom: "",
      unitCost: "",
      amount: "",
    },
  ])
  const [loading, setLoading] = React.useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = React.useState(false)

  // Reset form when modal closes
  React.useEffect(() => {
    if (!open) {
      setRows([
        {
          id: "1",
          budgetCodeId: "",
          budgetCodeLabel: "",
          qty: "",
          uom: "",
          unitCost: "",
          amount: "",
        },
      ])
    }
  }, [open])

  // Auto-calculate amount when qty or unitCost changes
  const calculateAmount = (qty: string, unitCost: string): string => {
    const qtyNum = parseFloat(qty) || 0
    const costNum = parseFloat(unitCost) || 0
    return (qtyNum * costNum).toFixed(2)
  }

  const updateRow = (
    rowId: string,
    updates: Partial<LineItemRow>
  ) => {
    setRows(prev => prev.map(row => {
      if (row.id !== rowId) return row

      const updatedRow = { ...row, ...updates }

      // Auto-calculate amount if qty or unitCost changed
      if ('qty' in updates || 'unitCost' in updates) {
        updatedRow.amount = calculateAmount(updatedRow.qty, updatedRow.unitCost)
      }

      // Clear field-level errors when user starts typing
      if (updatedRow.errors) {
        const clearedErrors = { ...updatedRow.errors }
        Object.keys(updates).forEach(key => {
          delete clearedErrors[key]
        })
        updatedRow.errors = Object.keys(clearedErrors).length > 0 ? clearedErrors : undefined
      }

      return updatedRow
    }))
  }

  const validateRow = (row: LineItemRow): Record<string, string> => {
    const errors: Record<string, string> = {}

    if (!row.budgetCodeId) {
      errors.budgetCodeId = "Budget code is required"
    }

    if (parseFloat(row.amount) <= 0) {
      errors.amount = "Amount must be greater than 0"
    }

    return errors
  }

  const addRow = () => {
    const newRow: LineItemRow = {
      id: Date.now().toString(),
      budgetCodeId: "",
      budgetCodeLabel: "",
      qty: "",
      uom: "",
      unitCost: "",
      amount: "",
    }
    setRows(prev => [...prev, newRow])
  }

  const removeRow = (rowId: string) => {
    if (rows.length === 1) return
    setRows(prev => prev.filter(row => row.id !== rowId))
  }

  const handleSubmit = async () => {
    // Validate all rows
    let hasErrors = false
    const updatedRows = rows.map(row => {
      const errors = validateRow(row)
      if (Object.keys(errors).length > 0) {
        hasErrors = true
        return { ...row, errors }
      }
      return { ...row, errors: undefined }
    })

    setRows(updatedRows)

    if (hasErrors) {
      toast.error("Please fix the errors before submitting")
      return
    }

    setLoading(true)
    try {
      // Prepare data for API
      const lineItemsToSubmit = rows.map(row => {
        const budgetCode = budgetCodes.find(c => c.id === row.budgetCodeId)
        return {
          costCodeId: budgetCode?.code || row.budgetCodeId,
          costType: budgetCode?.costType || null,
          qty: row.qty,
          uom: row.uom,
          unitCost: row.unitCost,
          amount: row.amount,
        }
      })

      // Call API
      const response = await fetch(`/api/projects/${projectId}/budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItems: lineItemsToSubmit }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create budget line items")
      }

      toast.success(`Created ${rows.length} budget line item${rows.length > 1 ? 's' : ''}`)
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(
        `Failed to create budget line items: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = rows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                Create Budget Line Items
              </DialogTitle>
              <DialogDescription className="mt-1">
                Add one or more line items to the project budget with enhanced input validation
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Keyboard Help */}
              <Tooltip open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
                <TooltipTrigger asChild>
                  <BudgetButton
                    intent="ghost"
                    size="icon"
                    onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                    type="button"
                  >
                    <KeyboardIcon className="h-4 w-4" />
                  </BudgetButton>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <div className="space-y-2">
                    <div className="font-medium">Keyboard Shortcuts</div>
                    <div className="space-y-1 text-xs">
                      <div><kbd className="bg-muted px-1 rounded">Ctrl+S</kbd> - Save all</div>
                      <div><kbd className="bg-muted px-1 rounded">Ctrl+N</kbd> - Add row</div>
                      <div><kbd className="bg-muted px-1 rounded">Tab</kbd> - Next field</div>
                      <div><kbd className="bg-muted px-1 rounded">Esc</kbd> - Close</div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Summary Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-muted/30 rounded-lg text-sm">
            <span className="text-muted-foreground">
              {rows.length} line item{rows.length > 1 ? 's' : ''}
            </span>
            <span className="font-medium">
              Total: <span className="text-brand">${totalAmount.toFixed(2)}</span>
            </span>
          </div>
        </DialogHeader>

        {/* Body - Scrollable form content */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-6">
            {rows.map((row, index) => (
              <div
                key={row.id}
                className={cn(
                  "border rounded-lg p-4 space-y-4",
                  row.errors && Object.keys(row.errors).length > 0
                    ? "border-destructive/20 bg-destructive/5"
                    : "border-border bg-background"
                )}
              >
                {/* Row Header */}
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground">
                    Line Item {index + 1}
                  </h3>
                  {rows.length > 1 && (
                    <BudgetButton
                      intent="ghost"
                      size="icon"
                      onClick={() => removeRow(row.id)}
                      type="button"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </BudgetButton>
                  )}
                </div>

                {/* Form Fields Grid */}
                <div className="grid grid-cols-12 gap-4">
                  {/* Budget Code - Full width on mobile, 4 cols on desktop */}
                  <div className="col-span-12 md:col-span-4">
                    <BudgetFormField
                      label="Budget Code"
                      required={true}
                      error={row.errors?.budgetCodeId}
                      hint="Select an existing code or create new one"
                    >
                      <BudgetCodeSelector
                        value={row.budgetCodeId}
                        onValueChange={(id, code) => updateRow(row.id, {
                          budgetCodeId: id,
                          budgetCodeLabel: code.fullLabel
                        })}
                        onCreateNew={onCreateBudgetCode}
                        budgetCodes={budgetCodes}
                        error={!!row.errors?.budgetCodeId}
                      />
                    </BudgetFormField>
                  </div>

                  {/* Quantity */}
                  <div className="col-span-6 md:col-span-2">
                    <BudgetFormField
                      label="Quantity"
                      hint="Optional"
                    >
                      <NumberInput
                        step="0.001"
                        value={row.qty}
                        onChange={(e) => updateRow(row.id, { qty: e.target.value })}
                        placeholder="Qty"
                        className="text-center"
                        clearZeroOnFocus={true}
                      />
                    </BudgetFormField>
                  </div>

                  {/* UOM */}
                  <div className="col-span-6 md:col-span-2">
                    <BudgetFormField
                      label="Unit of Measure"
                      hint="Optional"
                    >
                      <Select
                        value={row.uom}
                        onValueChange={(value) => updateRow(row.id, { uom: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="UOM" />
                        </SelectTrigger>
                        <SelectContent>
                          {UOM_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </BudgetFormField>
                  </div>

                  {/* Unit Cost */}
                  <div className="col-span-6 md:col-span-2">
                    <BudgetFormField
                      label="Unit Cost"
                      hint="Optional if using lump sum"
                    >
                      <NumberInput
                        step="0.01"
                        value={row.unitCost}
                        onChange={(e) => updateRow(row.id, { unitCost: e.target.value })}
                        placeholder="Unit cost"
                        clearZeroOnFocus={true}
                      />
                    </BudgetFormField>
                  </div>

                  {/* Amount */}
                  <div className="col-span-6 md:col-span-2">
                    <BudgetFormField
                      label="Amount"
                      required={true}
                      error={row.errors?.amount}
                      success={parseFloat(row.amount) > 0 ? undefined : undefined}
                      hint="Auto-calculated or manual entry"
                    >
                      <NumberInput
                        step="0.01"
                        value={row.amount}
                        onChange={(e) => updateRow(row.id, { amount: e.target.value })}
                        placeholder="Amount *"
                        className="font-medium"
                        clearZeroOnFocus={true}
                        autoSelectOnFocus={true}
                      />
                    </BudgetFormField>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Row Button */}
            <div className="flex justify-center">
              <BudgetButton
                intent="secondary"
                onClick={addRow}
                disabled={loading}
                type="button"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Another Line Item
              </BudgetButton>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Press <kbd className="bg-muted px-1 rounded text-xs">Ctrl+S</kbd> to save all items
          </div>
          <div className="flex gap-4">
            <BudgetButton
              intent="secondary"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              type="button"
            >
              Cancel
            </BudgetButton>
            <BudgetButton
              intent="primary"
              onClick={handleSubmit}
              disabled={loading || rows.length === 0}
              type="button"
              className="gap-2 min-w-[140px]"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create {rows.length} Item{rows.length > 1 ? 's' : ''}
                </>
              )}
            </BudgetButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}