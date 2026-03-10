import * as React from "react"
import { cn } from "@/lib/utils"
import { NumberInput } from "@/components/ui/number-input"
import { BudgetButton } from "./budget-button"
import { BudgetFormField } from "./budget-form-field"
import { BudgetCodeSelector } from "./budget-code-selector"
import { Check, X, Plus, Info, KeyboardIcon } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface InlineCreateRowProps {
  onSave: (data: {
    costCode?: string
    description: string
    originalBudgetAmount: string | number
  }) => Promise<void>
  onCancel: () => void
  isCreating: boolean
  budgetCodes?: Array<{
    id: string
    code: string
    costType: string | null
    description: string
    fullLabel: string
  }>
  onCreateBudgetCode?: () => void
}

/**
 * Enhanced inline budget line item creator with improved UX
 * Features:
 * - Smart keyboard navigation (Tab, Enter, Escape)
 * - Auto-focus flow for faster data entry
 * - Visual feedback and validation
 * - Contextual help tooltips
 * - Keyboard shortcuts display
 */
function EnhancedInlineCreateRow({
  onSave,
  onCancel,
  isCreating,
  budgetCodes = [],
  onCreateBudgetCode,
}: InlineCreateRowProps) {
  const [formData, setFormData] = React.useState({
    budgetCodeId: "",
    description: "",
    originalBudgetAmount: "",
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [showKeyboardHelp, setShowKeyboardHelp] = React.useState(false)

  // Refs for keyboard navigation
  const budgetCodeRef = React.useRef<HTMLButtonElement>(null)
  const descriptionRef = React.useRef<HTMLInputElement>(null)
  const amountRef = React.useRef<HTMLInputElement>(null)
  const saveRef = React.useRef<HTMLButtonElement>(null)

  // Auto-focus description field when budget code is selected
  React.useEffect(() => {
    if (formData.budgetCodeId && descriptionRef.current) {
      descriptionRef.current.focus()
    }
  }, [formData.budgetCodeId])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.description.trim()) {
      newErrors.description = "Description is required"
    }

    if (!formData.originalBudgetAmount || parseFloat(formData.originalBudgetAmount) <= 0) {
      newErrors.originalBudgetAmount = "Amount must be greater than 0"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    try {
      await onSave({
        costCode: formData.budgetCodeId,
        description: formData.description,
        originalBudgetAmount: formData.originalBudgetAmount,
      })

      // Reset form after successful save
      setFormData({
        budgetCodeId: "",
        description: "",
        originalBudgetAmount: "",
      })
      setErrors({})
    } catch (error) {
      console.error("Failed to save line item:", error)
    }
  }

  const handleCancel = () => {
    setFormData({
      budgetCodeId: "",
      description: "",
      originalBudgetAmount: "",
    })
    setErrors({})
    onCancel()
  }

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    // Global shortcuts
    if (e.key === "Escape") {
      handleCancel()
      return
    }

    if (e.key === "F1") {
      e.preventDefault()
      setShowKeyboardHelp(!showKeyboardHelp)
      return
    }

    // Field-specific navigation
    if (e.key === "Enter") {
      e.preventDefault()

      switch (field) {
        case "description":
          amountRef.current?.focus()
          break
        case "amount":
          if (!isCreating) {
            handleSave()
          }
          break
      }
    }

    if (e.key === "Tab") {
      // Let default tab behavior handle navigation
      // Clear any field-level errors when moving to next field
      if (errors[field]) {
        setErrors(prev => {
          const next = { ...prev }
          delete next[field]
          return next
        })
      }
    }
  }

  return (
    <tr className="bg-primary/5 border-2 border-primary/20 shadow-sm">
      <td className="py-4 pl-4 pr-2">
        {/* Empty checkbox cell */}
      </td>
      <td className="py-4 px-2">
        {/* Empty expander cell */}
      </td>

      {/* Description Field - spans multiple columns for better UX */}
      <td className="py-4 px-2" colSpan={2}>
        <div className="space-y-2">
          {/* Budget Code Selector (Optional) */}
          <BudgetFormField
            label="Budget Code"
            hint="Optional - can be assigned later"
            className="mb-2"
          >
            <BudgetCodeSelector
              value={formData.budgetCodeId}
              onValueChange={(id) => setFormData(prev => ({ ...prev, budgetCodeId: id }))}
              onCreateNew={onCreateBudgetCode}
              budgetCodes={budgetCodes}
              placeholder="Select budget code (optional)"
              className="h-9"
            />
          </BudgetFormField>

          {/* Description Field */}
          <BudgetFormField
            label="Description"
            required={true}
            error={errors.description}
            hint="Press Enter to move to amount field"
          >
            <input
              ref={descriptionRef}
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              onKeyDown={(e) => handleKeyDown(e, "description")}
              placeholder="Enter line item description *"
              className={cn(
                "h-9 w-full rounded-md border border-input bg-background px-4 py-1 text-sm",
                "focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none",
                "disabled:cursor-not-allowed disabled:opacity-50",
                errors.description && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              )}
              disabled={isCreating}
              autoFocus
            />
          </BudgetFormField>
        </div>
      </td>

      {/* Amount Field */}
      <td className="py-4 px-2">
        <BudgetFormField
          label="Amount"
          required={true}
          error={errors.originalBudgetAmount}
          hint="Press Enter to save"
        >
          <NumberInput
            ref={amountRef}
            value={formData.originalBudgetAmount}
            onChange={(e) => setFormData(prev => ({ ...prev, originalBudgetAmount: e.target.value }))}
            onKeyDown={(e) => handleKeyDown(e, "amount")}
            placeholder="Amount *"
            className="h-9"
            disabled={isCreating}
            clearZeroOnFocus={true}
            autoSelectOnFocus={true}
          />
        </BudgetFormField>
      </td>

      {/* Empty cells for other columns */}
      {Array.from({ length: 10 }).map((_, index) => (
        <td key={index} className="py-4 px-2">
          {/* Empty */}
        </td>
      ))}

      {/* Action Buttons */}
      <td className="py-4 px-2">
        <div className="flex items-center gap-1 justify-end">
          {/* Keyboard Help Tooltip */}
          <Tooltip open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
            <TooltipTrigger asChild>
              <BudgetButton
                intent="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                type="button"
              >
                <KeyboardIcon className="h-3 w-3" />
              </BudgetButton>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-2">
                <div className="font-medium">Keyboard Shortcuts</div>
                <div className="space-y-1 text-xs">
                  <div><kbd className="bg-muted px-1 rounded">Tab</kbd> - Next field</div>
                  <div><kbd className="bg-muted px-1 rounded">Enter</kbd> - Next/Save</div>
                  <div><kbd className="bg-muted px-1 rounded">Esc</kbd> - Cancel</div>
                  <div><kbd className="bg-muted px-1 rounded">F1</kbd> - Toggle help</div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Save Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <BudgetButton
                ref={saveRef}
                intent="primary"
                size="icon"
                className="h-8 w-8"
                onClick={handleSave}
                disabled={isCreating || !formData.description.trim()}
                type="button"
              >
                {isCreating ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </BudgetButton>
            </TooltipTrigger>
            <TooltipContent side="top">
              Save (Enter)
            </TooltipContent>
          </Tooltip>

          {/* Cancel Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <BudgetButton
                intent="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCancel}
                disabled={isCreating}
                type="button"
              >
                <X className="h-3 w-3" />
              </BudgetButton>
            </TooltipTrigger>
            <TooltipContent side="top">
              Cancel (Esc)
            </TooltipContent>
          </Tooltip>
        </div>
      </td>
    </tr>
  )
}

export { EnhancedInlineCreateRow }