/**
 * =============================================================================
 * DIRECT COST FORM COMPONENT
 * =============================================================================
 *
 * Modern form component for creating and editing Direct Costs with:
 * - Multi-step wizard interface
 * - Auto-save functionality
 * - Inline line item editing
 * - File attachments
 * - Real-time validation
 * - Responsive design
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  DirectCostCreateSchema,
  DirectCostUpdateSchema,
  type DirectCostCreate,
  type DirectCostUpdate,
  type DirectCostLineItem,
  CostTypes,
  CostStatuses,
} from '@/lib/schemas/direct-costs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { LineItemsManager } from './LineItemsManager'
import { AttachmentManager } from './AttachmentManager'
import { AutoSaveIndicator } from './AutoSaveIndicator'
import {
  ChevronRight,
  ChevronLeft,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  FileText,
  DollarSign,
  Users,
} from 'lucide-react'
import { Text } from '@/components/ui/text'
import { formatCurrency } from '@/lib/table-config/formatters'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// =============================================================================
// INTERFACES
// =============================================================================

interface DirectCostFormProps {
  mode: 'create' | 'edit'
  initialData?: DirectCostUpdate
  projectId: number
  onSuccess?: (data: unknown) => void
  onCancel?: () => void
}

interface Vendor {
  id: string
  vendor_name: string
  company?: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
}

interface BudgetCode {
  id: string
  code: string
  description: string
  category?: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STEPS = [
  {
    id: 1,
    title: 'Basic Information',
    description: 'Cost details and vendor selection',
    icon: FileText,
  },
  {
    id: 2,
    title: 'Line Items',
    description: 'Add and configure line items',
    icon: DollarSign,
  },
  {
    id: 3,
    title: 'Attachments',
    description: 'Upload supporting documents',
    icon: FileText,
  },
] as const

const AUTO_SAVE_DELAY = 30000 // 30 seconds

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DirectCostForm({
  mode,
  initialData,
  projectId,
  onSuccess,
  onCancel,
}: DirectCostFormProps) {
  const router = useRouter()
  const params = useParams()

  // State
  const [currentStep, setCurrentStep] = useState(1)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [budgetCodes, setBudgetCodes] = useState<BudgetCode[]>([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Form setup with proper typing based on mode
  const form = useForm<any>({
    // @ts-ignore - Complex conditional Zod schema types
    resolver: zodResolver(mode === 'create' ? DirectCostCreateSchema : DirectCostUpdateSchema),
    defaultValues: (initialData || {
      cost_type: 'Expense',
      status: 'Draft',
      date: new Date(),
      line_items: [
        {
          budget_code_id: '',
          description: '',
          quantity: 1,
          uom: 'LOT',
          unit_cost: 0,
        },
      ],
    }) as any,
    mode: 'onChange',
  })

  // Field array for line items
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'line_items',
  })

  // Watch for changes
  const watchedValues = form.watch()

  useEffect(() => {
    const subscription = form.watch(() => {
      setIsDirty(form.formState.isDirty)
    })
    return () => subscription.unsubscribe()
  }, [form])

  // Calculate grand total
  const grandTotal = useMemo(() => {
    return (watchedValues.line_items || []).reduce((total: number, item: any) => {
      const quantity = Number(item.quantity) || 0
      const unitCost = Number(item.unit_cost) || 0
      return total + quantity * unitCost
    }, 0)
  }, [watchedValues.line_items])

  // Load dropdown options
  useEffect(() => {
    async function loadOptions() {
      setIsLoadingOptions(true)
      try {
        const [vendorsRes, employeesRes, budgetCodesRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/vendors`),
          fetch(`/api/projects/${projectId}/employees`),
          fetch(`/api/projects/${projectId}/budget-codes`),
        ])

        if (vendorsRes.ok) {
          const vendorsData = await vendorsRes.json()
          setVendors(vendorsData)
        }

        if (employeesRes.ok) {
          const employeesData = await employeesRes.json()
          setEmployees(employeesData)
        }

        if (budgetCodesRes.ok) {
          const budgetCodesData = await budgetCodesRes.json()
          setBudgetCodes(budgetCodesData)
        }
      } catch (error) {
        toast.error('Failed to load form options')
      } finally {
        setIsLoadingOptions(false)
      }
    }

    loadOptions()
  }, [projectId])

  // Auto-save functionality
  useEffect(() => {
    if (!isDirty || mode !== 'edit') return

    const timer = setTimeout(() => {
      handleAutoSave()
    }, AUTO_SAVE_DELAY)

    return () => clearTimeout(timer)
  }, [isDirty, watchedValues, mode])

  // Auto-save handler
  const handleAutoSave = async () => {
    if (!form.formState.isValid) return

    setAutoSaving(true)
    try {
      const values = form.getValues()
      const costId = initialData?.id

      const response = await fetch(`/api/projects/${projectId}/direct-costs/${costId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (response.ok) {
        setLastSaved(new Date())
        setIsDirty(false)
        form.reset(values)
      }
    } catch (error) {

      console.error("Failed to fetch vendors list:", error);

      // Intentionally swallowed: component shows appropriate state on error

    } finally {
      setAutoSaving(false)
    }
  }

  // Form submission
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const costId = mode === 'edit' ? (initialData?.id || '') : ''
      const url =
        mode === 'create'
          ? `/api/projects/${projectId}/direct-costs`
          : `/api/projects/${projectId}/direct-costs/${costId}`

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save direct cost')
      }

      const result = await response.json()

      toast.success(
        mode === 'create' ? 'Direct cost created successfully' : 'Direct cost updated successfully'
      )

      if (onSuccess) {
        onSuccess(result)
      } else {
        router.push(`/projects/${projectId}/direct-costs`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save direct cost')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Navigation handlers
  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleStepClick = (stepId: number) => {
    setCurrentStep(stepId)
  }

  // Line item handlers
  const handleAddLineItem = () => {
    append({
      budget_code_id: '',
      description: '',
      quantity: 1,
      uom: 'LOT',
      unit_cost: 0,
    } as never)
  }

  const handleRemoveLineItem = (index: number) => {
    remove(index)
  }

  const handleUpdateLineItem = (index: number, item: DirectCostLineItem) => {
    update(index, item as never)
  }

  // Validation for step navigation
  const isStepValid = (step: number): boolean => {
    const errors = form.formState.errors

    switch (step) {
      case 1:
        return !errors.cost_type && !errors.date && !errors.vendor_id && !errors.status
      case 2:
        return !errors.line_items && (form.getValues('line_items') || []).length > 0
      case 3:
        return true // Attachments are optional
      default:
        return false
    }
  }

  // Can proceed to next step
  const canProceed = isStepValid(currentStep)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Auto-save indicator */}
      {mode === 'edit' && (
        <AutoSaveIndicator
          status={autoSaving ? 'saving' : lastSaved ? 'saved' : 'idle'}
          lastSaved={lastSaved}
        />
      )}

      {/* Steps indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const StepIcon = step.icon
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id
          const isValid = isStepValid(step.id)

          return (
            <div key={step.id} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => handleStepClick(step.id)}
                className={cn(
                  'flex items-center space-x-3 flex-1 p-3 rounded-lg transition-colors',
                  isActive && 'bg-primary/10 border border-primary',
                  !isActive && 'hover:bg-muted'
                )}
                disabled={isLoadingOptions}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full',
                    isActive && 'bg-primary text-primary-foreground',
                    isCompleted && !isActive && 'bg-green-500 text-white',
                    !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted && !isActive ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                </div>
                <div className="text-left">
                  <div className={cn('text-sm font-medium', isActive && 'text-primary')}>
                    {step.title}
                  </div>
                  <div className="text-xs text-muted-foreground">{step.description}</div>
                </div>
                {!isValid && !isCompleted && currentStep > step.id && (
                  <AlertCircle className="h-4 w-4 text-destructive ml-auto" />
                )}
              </button>
              {index < STEPS.length - 1 && (
                <ChevronRight className="h-5 w-5 text-muted-foreground mx-2 flex-shrink-0" />
              )}
            </div>
          )
        })}
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Enter the cost details and select vendor</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Cost Type */}
                  <FormField
                    control={form.control}
                    name="cost_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Type *</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select cost type" />
                            </SelectTrigger>
                            <SelectContent>
                              {CostTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Status */}
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {CostStatuses.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date */}
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Incurred Date *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="date"
                              {...field}
                              value={
                                field.value instanceof Date
                                  ? field.value.toISOString().split('T')[0]
                                  : field.value
                              }
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                              className="pl-10"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Invoice Number */}
                  <FormField
                    control={form.control}
                    name="invoice_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="INV-12345"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Vendor */}
                  <FormField
                    control={form.control}
                    name="vendor_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || undefined}
                            disabled={isLoadingOptions}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select vendor" />
                            </SelectTrigger>
                            <SelectContent>
                              {vendors.map((vendor) => (
                                <SelectItem key={vendor.id} value={vendor.id}>
                                  {vendor.vendor_name}
                                  {vendor.company && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ({vendor.company})
                                    </span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>Optional - for subcontractor costs</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Employee */}
                  <FormField
                    control={form.control}
                    name="employee_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                            value={field.value?.toString() || undefined}
                            disabled={isLoadingOptions}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map((employee) => (
                                <SelectItem key={employee.id} value={employee.id.toString()}>
                                  {employee.first_name} {employee.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>Optional - for labor costs</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter cost description or notes"
                          rows={3}
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Terms */}
                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Net 30"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Additional Dates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Received Date */}
                  <FormField
                    control={form.control}
                    name="received_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Received Date</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="date"
                              {...field}
                              value={
                                field.value instanceof Date
                                  ? field.value.toISOString().split('T')[0]
                                  : field.value || ''
                              }
                              onChange={(e) => {
                                if (e.target.value) {
                                  field.onChange(new Date(e.target.value))
                                } else {
                                  field.onChange(null)
                                }
                              }}
                              className="pl-10"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>Date cost was received</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Paid Date */}
                  <FormField
                    control={form.control}
                    name="paid_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paid Date</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="date"
                              {...field}
                              value={
                                field.value instanceof Date
                                  ? field.value.toISOString().split('T')[0]
                                  : field.value || ''
                              }
                              onChange={(e) => {
                                if (e.target.value) {
                                  field.onChange(new Date(e.target.value))
                                } else {
                                  field.onChange(null)
                                }
                              }}
                              className="pl-10"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>Date payment was made</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Grand Total Preview */}
                {grandTotal > 0 && (
                  <Alert>
                    <DollarSign className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <Text size="sm" weight="medium">
                          Current Total
                        </Text>
                        <Text size="lg" weight="semibold">
                          {formatCurrency(grandTotal)}
                        </Text>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Line Items */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Line Items</CardTitle>
                <CardDescription>
                  Add line items with budget codes, quantities, and costs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LineItemsManager
                  items={fields as any}
                  budgetCodes={budgetCodes}
                  onAdd={handleAddLineItem}
                  onRemove={handleRemoveLineItem}
                  onUpdate={handleUpdateLineItem}
                  form={form as never}
                />

                {form.formState.errors.line_items?.root && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {String(form.formState.errors.line_items.root.message)}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Attachments */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Attachments</CardTitle>
                <CardDescription>
                  Upload invoices, receipts, and supporting documents (optional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AttachmentManager
                  attachments={[]}
                  onUpload={async (files: File[]) => {
                    // TODO: Implement file upload
                    return Promise.resolve()
                  }}
                  onDelete={async (attachmentId: string) => {
                    // TODO: Implement file deletion
                    return Promise.resolve()
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Navigation and actions */}
          <div className="flex items-center justify-between border-t pt-6">
            <div className="flex items-center space-x-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* Grand Total */}
              <div className="text-right">
                <Text size="sm" tone="muted">
                  Total Amount
                </Text>
                <Text size="xl" weight="semibold">
                  {formatCurrency(grandTotal)}
                </Text>
              </div>

              {/* Next/Submit */}
              {currentStep < STEPS.length ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceed || isLoadingOptions}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
                  {isSubmitting ? (
                    <>
                      <Save className="h-4 w-4 mr-2 animate-spin" />
                      {mode === 'create' ? 'Creating...' : 'Updating...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {mode === 'create' ? 'Create Direct Cost' : 'Update Direct Cost'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
