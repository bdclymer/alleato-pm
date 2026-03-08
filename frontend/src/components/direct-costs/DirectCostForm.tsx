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

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, useFormState } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  DirectCostCreateSchema,
  DirectCostUpdateSchema,
  type DirectCostUpdate,
  type DirectCostLineItem,
  CostTypes,
  CostStatuses,
} from '@/lib/schemas/direct-costs'
import { cn } from '@/lib/utils'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
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
  Check,
  ChevronsUpDown,
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
  // isDirty is now derived from useFormState below (avoids formState proxy access)
  const [isAutoFilling, setIsAutoFilling] = useState(false)
  const [vendorPopoverOpen, setVendorPopoverOpen] = useState(false)
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false)

  // Stable budget codes list for LineItemsManager (prevents new array ref on every render)
  const mappedBudgetCodes = useMemo(
    () =>
      budgetCodes.map((bc) => ({
        ...bc,
        costType: bc.category || null,
        fullLabel: `${bc.code} - ${bc.description}`,
      })),
    [budgetCodes]
  )

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

  // Sanitize initialData: strip extra API response fields (line_total, budget_code, vendor,
  // employee) that aren't in the Zod schema. Extra fields in defaultValues cause RHF to
  // immediately compute isDirty=true on mount, which triggers a render cascade.
  const sanitizedInitialData = useMemo(() => {
    if (!initialData) return undefined
    const data = initialData as any
    return {
      ...data,
      line_items: Array.isArray(data.line_items)
        ? data.line_items.map((item: any) => ({
            id: item.id,
            budget_code_id: item.budget_code_id,
            description: item.description,
            quantity: item.quantity,
            uom: item.uom,
            unit_cost: item.unit_cost,
            line_order: item.line_order,
          }))
        : data.line_items,
    }
  }, [initialData])

  // Cache resolver to prevent re-creation on every render
  const resolver = useMemo(
    () => zodResolver(
      (mode === 'create' ? DirectCostCreateSchema : DirectCostUpdateSchema) as any
    ),
    [mode]
  )

  // Form setup
  const form = useForm<any>({
    resolver,
    reValidateMode: 'onBlur',
    defaultValues: (sanitizedInitialData || {
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
  })

  // Field array for line items
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'line_items',
  })

  // Isolated formState subscription — avoids render-level proxy access
  // which triggers resolver on every render and causes infinite loops
  const { errors: formErrors, isDirty } = useFormState({ control: form.control })

  // Grand total state — updated via subscription callback, NOT via
  // render-level form.watch() which causes infinite re-render loops
  // when combined with useFieldArray + mode:'onChange'.
  const [grandTotal, setGrandTotal] = useState(0)

  const computeTotal = useCallback((items: any[]) => {
    return (items || []).reduce(
      (total: number, item: any) => {
        const quantity = Number(item.quantity) || 0
        const unitCost = Number(item.unit_cost) || 0
        return total + quantity * unitCost
      },
      0
    )
  }, [])

  useEffect(() => {
    // Compute initial total
    setGrandTotal(computeTotal(form.getValues('line_items')))

    // Subscribe to ALL form changes via callback (safe — no render-level subscription)
    const subscription = form.watch((_, { name }) => {
      // isDirty is tracked by useFormState above — no direct proxy access here
      // Only recompute total when line items change
      if (!name || name.startsWith('line_items')) {
        setGrandTotal(computeTotal(form.getValues('line_items')))
      }
    })
    return () => subscription.unsubscribe()
  }, [form, computeTotal])

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

  // Auto-save functionality (edit mode only).
  // Depends only on isDirty and mode — NOT on a watched value object,
  // which would create a new reference on every render and re-fire
  // this effect continuously (infinite loop / page hang).
  useEffect(() => {
    if (!isDirty || mode !== 'edit') return

    const timer = setTimeout(() => {
      handleAutoSave()
    }, AUTO_SAVE_DELAY)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, mode])

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
        form.reset(values) // resets RHF isDirty to false automatically
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

  // Line item handlers — wrapped in useCallback so LineItemsManager doesn't
  // see new function refs on every DirectCostForm re-render (e.g. from formState subscription)
  const handleAddLineItem = useCallback(() => {
    append({
      budget_code_id: '',
      description: '',
      quantity: 1,
      uom: 'LOT',
      unit_cost: 0,
    } as never)
  }, [append])

  const handleRemoveLineItem = useCallback((index: number) => {
    remove(index)
  }, [remove])

  const handleUpdateLineItem = useCallback((index: number, item: DirectCostLineItem) => {
    update(index, item as never)
  }, [update])

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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" data-dev-autofill-disabled>
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

                {/* Payment Terms */}
                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || undefined}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment terms" />
                          </SelectTrigger>
                          <SelectContent>
                            {['Due on Receipt', 'Net 10', 'Net 15', 'Net 30', 'Net 60', 'Net 90'].map((term) => (
                              <SelectItem key={term} value={term}>
                                {term}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Vendor */}
                <FormField
                  control={form.control}
                  name="vendor_id"
                  render={({ field }) => {
                    const selectedVendor = vendors.find((v) => v.id === field.value)
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Vendor</FormLabel>
                        <Popover open={vendorPopoverOpen} onOpenChange={setVendorPopoverOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full justify-between text-left font-normal',
                                  !field.value && 'text-muted-foreground',
                                )}
                                disabled={isLoadingOptions}
                              >
                                {selectedVendor
                                  ? `${selectedVendor.vendor_name}${selectedVendor.company ? ` (${selectedVendor.company})` : ''}`
                                  : 'Search vendors...'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Type to search vendors..." />
                              <CommandList>
                                <CommandEmpty>No vendors found.</CommandEmpty>
                                <CommandGroup>
                                  {vendors.map((vendor) => (
                                    <CommandItem
                                      key={vendor.id}
                                      value={`${vendor.vendor_name} ${vendor.company || ''}`}
                                      onSelect={() => {
                                        field.onChange(vendor.id)
                                        setVendorPopoverOpen(false)
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          field.value === vendor.id ? 'opacity-100' : 'opacity-0',
                                        )}
                                      />
                                      {vendor.vendor_name}
                                      {vendor.company && (
                                        <span className="text-xs text-muted-foreground ml-2">
                                          ({vendor.company})
                                        </span>
                                      )}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          Optional - for subcontractor costs
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />

                {/* Employee */}
                <FormField
                  control={form.control}
                  name="employee_id"
                  render={({ field }) => {
                    const selectedEmployee = employees.find((e) => e.id === field.value)
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Employee</FormLabel>
                        <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full justify-between text-left font-normal',
                                  !field.value && 'text-muted-foreground',
                                )}
                                disabled={isLoadingOptions}
                              >
                                {selectedEmployee
                                  ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
                                  : 'Search employees...'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Type to search employees..." />
                              <CommandList>
                                <CommandEmpty>No employees found.</CommandEmpty>
                                <CommandGroup>
                                  {employees.map((employee) => (
                                    <CommandItem
                                      key={employee.id}
                                      value={`${employee.first_name} ${employee.last_name}`}
                                      onSelect={() => {
                                        field.onChange(employee.id)
                                        setEmployeePopoverOpen(false)
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          field.value === employee.id ? 'opacity-100' : 'opacity-0',
                                        )}
                                      />
                                      {employee.first_name} {employee.last_name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          Optional - for labor costs
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
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
                budgetCodes={mappedBudgetCodes}
                onAdd={handleAddLineItem}
                onRemove={handleRemoveLineItem}
                onUpdate={handleUpdateLineItem}
                onCreateBudgetCode={() => {
                  toast.info('Create budget code feature coming soon')
                }}
                form={form as never}
              />
              {(formErrors.line_items as any)?.root && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {String((formErrors.line_items as any).root.message)}
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
                  disabled={isSubmitting}
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
