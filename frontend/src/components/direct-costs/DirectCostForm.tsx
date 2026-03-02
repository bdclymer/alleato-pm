/**
 * =============================================================================
 * DIRECT COST FORM COMPONENT
 * =============================================================================
 *
 * Single-page form for creating and editing Direct Costs with:
 * - All fields visible on one page
 * - Auto-save functionality (edit mode)
 * - Inline line item editing
 * - File attachments
 * - Real-time validation
 * - Responsive design
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  DirectCostCreateSchema,
  DirectCostUpdateSchema,
  type DirectCostUpdate,
  type DirectCostLineItem,
  CostTypes,
  CostStatuses,
} from '@/lib/schemas/direct-costs'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Save,
  X,
  AlertCircle,
  Calendar,
  DollarSign,
  Wand2,
} from 'lucide-react'
import { Text } from '@/components/ui/text'
import { formatCurrency } from '@/lib/table-config/formatters'
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

  // State
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [budgetCodes, setBudgetCodes] = useState<BudgetCode[]>([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isAutoFilling, setIsAutoFilling] = useState(false)

  // Auto-fill button visibility - only shown in development
  const showAutoFill = process.env.NODE_ENV === 'development'

  // Auto-fill function for dev testing
  const handleAutoFill = async () => {
    setIsAutoFilling(true)
    try {
      // Use first available vendor or employee
      const vendorId = vendors.length > 0 ? vendors[0].id : null
      const employeeId = employees.length > 0 ? employees[0].id : null
      const budgetCodeId = budgetCodes.length > 0 ? budgetCodes[0].id : null

      if (!vendorId && !employeeId) {
        toast.error('No vendors or employees available - cannot auto-fill')
        return
      }

      if (!budgetCodeId) {
        toast.error('No budget codes available - cannot auto-fill')
        return
      }

      // Generate test data
      const testData = {
        cost_type: 'Expense' as const,
        status: 'Draft' as const,
        date: new Date(),
        invoice_number: `TEST-${Date.now()}`,
        description: `Auto-filled test direct cost - ${new Date().toLocaleString()}`,
        vendor_id: vendorId,
        employee_id: employeeId || null,
        terms: 'Net 30',
        line_items: [
          {
            budget_code_id: budgetCodeId,
            description: 'Test line item',
            quantity: 1,
            uom: 'LOT' as const,
            unit_cost: 100,
          },
        ],
      }

      // Reset form with test data
      form.reset(testData as any)
      toast.success('Form auto-filled with test data')
    } catch (error) {
      toast.error('Failed to auto-fill form')
      console.error('Auto-fill error:', error)
    } finally {
      setIsAutoFilling(false)
    }
  }

  // Form setup
  const form = useForm<any>({
    resolver: zodResolver(
      (mode === 'create' ? DirectCostCreateSchema : DirectCostUpdateSchema) as any
    ),
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
    return (watchedValues.line_items || []).reduce(
      (total: number, item: any) => {
        const quantity = Number(item.quantity) || 0
        const unitCost = Number(item.unit_cost) || 0
        return total + quantity * unitCost
      },
      0
    )
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
          setVendors(await vendorsRes.json())
        }
        if (employeesRes.ok) {
          setEmployees(await employeesRes.json())
        }
        if (budgetCodesRes.ok) {
          const budgetCodesData = await budgetCodesRes.json()
          setBudgetCodes(
            Array.isArray(budgetCodesData)
              ? budgetCodesData
              : budgetCodesData.budgetCodes || []
          )
        }
      } catch (error) {
        toast.error('Failed to load form options')
      } finally {
        setIsLoadingOptions(false)
      }
    }

    loadOptions()
  }, [projectId])

  // Auto-save functionality (edit mode only)
  useEffect(() => {
    if (!isDirty || mode !== 'edit') return

    const timer = setTimeout(() => {
      handleAutoSave()
    }, AUTO_SAVE_DELAY)

    return () => clearTimeout(timer)
  }, [isDirty, watchedValues, mode])

  const handleAutoSave = async () => {
    if (!form.formState.isValid) return

    setAutoSaving(true)
    try {
      const values = form.getValues()
      const costId = initialData?.id

      const response = await fetch(
        `/api/projects/${projectId}/direct-costs/${costId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        }
      )

      if (response.ok) {
        setLastSaved(new Date())
        setIsDirty(false)
        form.reset(values)
      }
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      setAutoSaving(false)
    }
  }

  // Form submission
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const costId = mode === 'edit' ? initialData?.id || '' : ''
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
        mode === 'create'
          ? 'Direct cost created successfully'
          : 'Direct cost updated successfully'
      )

      if (onSuccess) {
        onSuccess(result)
      } else {
        router.push(`/${projectId}/direct-costs`)
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save direct cost'
      )
    } finally {
      setIsSubmitting(false)
    }
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

  return (
    <div className="space-y-8">
      {/* Auto-save indicator */}
      {mode === 'edit' && (
        <AutoSaveIndicator
          status={autoSaving ? 'saving' : lastSaved ? 'saved' : 'idle'}
          lastSaved={lastSaved}
        />
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <Card className="gap-4 border-border/70 shadow-sm">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-xl">Basic Information</CardTitle>
              <CardDescription className="text-sm">
                Enter the cost details and select vendor
              </CardDescription>
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
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
                            onChange={(e) =>
                              field.onChange(new Date(e.target.value))
                            }
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
                          placeholder="Enter invoice number"
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
                      <FormDescription>
                        Optional - for subcontractor costs
                      </FormDescription>
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
                          onValueChange={(value) =>
                            field.onChange(value || null)
                          }
                          value={field.value || undefined}
                          disabled={isLoadingOptions}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((employee) => (
                              <SelectItem
                                key={employee.id}
                                value={employee.id}
                              >
                                {employee.first_name} {employee.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>
                        Optional - for labor costs
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                        placeholder="Enter payment terms"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Additional Dates */}
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
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="gap-4 border-border/70 shadow-sm">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-xl">Line Items</CardTitle>
              <CardDescription className="text-sm">
                Add line items with budget codes, quantities, and costs
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-1">
              <LineItemsManager
                items={fields as any}
                budgetCodes={budgetCodes.map(bc => ({
                  ...bc,
                  costType: bc.category || null,
                  fullLabel: `${bc.code} - ${bc.description}`,
                }))}
                onAdd={handleAddLineItem}
                onRemove={handleRemoveLineItem}
                onUpdate={handleUpdateLineItem}
                onCreateBudgetCode={() => {
                  // TODO: Open budget code creation modal
                  toast.info('Create budget code feature coming soon')
                }}
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

          {/* Attachments */}
          <Card className="gap-4 border-border/70 shadow-sm">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-xl">Attachments</CardTitle>
              <CardDescription className="text-sm">
                Upload invoices, receipts, and supporting documents (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-1">
              <AttachmentManager
                attachments={[]}
                onUpload={async () => {
                  // TODO: Implement file upload
                  return Promise.resolve()
                }}
                onDelete={async () => {
                  // TODO: Implement file deletion
                  return Promise.resolve()
                }}
              />
            </CardContent>
          </Card>

          {/* Grand Total + Actions */}
          <div className="sticky bottom-3 z-10 rounded-xl border border-border/70 bg-background/95 px-4 py-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {onCancel && (
                  <Button type="button" variant="outline" onClick={onCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/${projectId}/direct-costs`)}
                >
                  Back to List
                </Button>
                {/* Auto-Fill Button */}
                {showAutoFill && (
                  <button
                    type="button"
                    onClick={handleAutoFill}
                    disabled={isAutoFilling || isLoadingOptions}
                    className="inline-flex items-center gap-2 px-4 py-1.5 text-sm bg-info/10 text-info hover:bg-info/20 rounded-md transition-colors border border-info/30 disabled:opacity-50"
                    title="Development only: Fill form with test data"
                  >
                    <Wand2 className="w-4 h-4" />
                    {isAutoFilling ? 'Filling...' : 'Auto-Fill'}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 lg:justify-end">
                {/* Grand Total */}
                {grandTotal > 0 && (
                  <div className="flex items-center gap-2 text-right">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Text size="sm" tone="muted">
                        Total Amount
                      </Text>
                      <Text size="xl" weight="semibold">
                        {formatCurrency(grandTotal)}
                      </Text>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isSubmitting || !form.formState.isValid}
                >
                  {isSubmitting ? (
                    <>
                      <Save className="h-4 w-4 mr-2 animate-spin" />
                      {mode === 'create' ? 'Creating...' : 'Updating...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {mode === 'create'
                        ? 'Create Direct Cost'
                        : 'Update Direct Cost'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
