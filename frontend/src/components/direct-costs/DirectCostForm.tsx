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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { FormActions } from '@/components/forms/FormActions'
import { FormGrid } from '@/components/forms/FormGrid'
import { FormSection } from '@/components/forms/FormSection'
import { RHFComboboxField } from '@/components/forms/fields/RHFComboboxField'
import { RHFDateField } from '@/components/forms/fields/RHFDateField'
import { RHFSelectField } from '@/components/forms/fields/RHFSelectField'
import { RHFTextareaField } from '@/components/forms/fields/RHFTextareaField'
import { LineItemsManager } from './LineItemsManager'
import { AttachmentManager } from './AttachmentManager'
import { AutoSaveIndicator } from './AutoSaveIndicator'
import {
  buildEmployeeOptions,
  buildVendorOptions,
  type EmployeeMeta,
  type VendorMeta,
} from './form-options'
import { CreateBudgetCodeModal } from '@/app/(main)/[projectId]/budget/setup/components/CreateBudgetCodeModal'
import {
  AlertCircle,
  Wand2,
} from 'lucide-react'
import { appToast as toast } from '@/lib/toast/app-toast'

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
  const [showCreateBudgetCodeModal, setShowCreateBudgetCodeModal] = useState(false)
  const [targetBudgetCodeRowIndex, setTargetBudgetCodeRowIndex] = useState<number | null>(null)

  // Capture currently-assigned vendor/employee metadata BEFORE sanitization strips them.
  // The direct-costs GET API returns `vendor:companies(*)` and `employee:people(*)` alongside
  // `vendor_id` / `employee_id`. We use this metadata to:
  //   1. Guarantee the saved record's vendor/employee always appears as an option, even if
  //      scoping on the `/vendors` endpoint (project_vendors vs all companies) or stale data
  //      would otherwise exclude it.
  //   2. Provide a `selectedLabel` fallback so the combobox never shows a placeholder when
  //      the FK is populated — prevents the "Select vendor..." regression on Edit.
  //
  // See docs/patterns/form-id-mismatch-prevention.md — this is the same bug class that hit
  // change_event_line_items.vendor_id. `direct_costs.vendor_id` FK targets `companies.id`.
  const initialVendorMeta = useMemo<VendorMeta | null>(() => {
    const raw = (initialData as Record<string, unknown> | undefined)?.vendor
    if (!raw || typeof raw !== 'object') return null
    const rec = raw as Record<string, unknown>
    const id = typeof rec.id === 'string' ? rec.id : undefined
    if (!id) return null
    const name =
      typeof rec.name === 'string'
        ? rec.name
        : typeof rec.legal_name === 'string'
          ? rec.legal_name
          : null
    return { id, name }
  }, [initialData])

  const initialEmployeeMeta = useMemo<EmployeeMeta | null>(() => {
    const raw = (initialData as Record<string, unknown> | undefined)?.employee
    if (!raw || typeof raw !== 'object') return null
    const rec = raw as Record<string, unknown>
    const id = typeof rec.id === 'string' ? rec.id : undefined
    if (!id) return null
    return {
      id,
      first_name: typeof rec.first_name === 'string' ? rec.first_name : '',
      last_name: typeof rec.last_name === 'string' ? rec.last_name : '',
    }
  }, [initialData])

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
  // Guardrail: if the saved record points to a vendor that's not in the dropdown list
  // (company not flagged is_vendor, or project_vendors scoping excluded it), inject it
  // so the Edit view renders the correct selection instead of a placeholder.
  // Unit-tested in form-options.test.ts.
  const vendorOptions = useMemo(
    () => buildVendorOptions(vendors, initialVendorMeta),
    [vendors, initialVendorMeta]
  )
  const employeeOptions = useMemo(
    () => buildEmployeeOptions(employees, initialEmployeeMeta),
    [employees, initialEmployeeMeta]
  )

  // Fallback label for the combobox when options are still loading — prevents
  // the user seeing a placeholder ("Search vendors...") on first paint of the Edit form.
  const vendorSelectedLabel = initialVendorMeta?.name ?? undefined
  const employeeSelectedLabel = initialEmployeeMeta
    ? `${initialEmployeeMeta.first_name} ${initialEmployeeMeta.last_name}`.trim() || undefined
    : undefined

  // Auto-fill button visibility - only shown in development
  const showAutoFill = process.env.NODE_ENV === 'development'

  // Auto-fill function for dev testing
  const handleAutoFill = async () => {
    setIsAutoFilling(true)
    try {
      // Use first available options when present, but do not block autofill.
      const vendorId = vendors.length > 0 ? vendors[0].id : null
      const employeeId = employees.length > 0 ? employees[0].id : null
      const budgetCodeId = budgetCodes.length > 0 ? budgetCodes[0].id : null

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
        vendor_id: vendorId || null,
        employee_id: employeeId || null,
        terms: 'Net 30',
        line_items: [
          {
            budget_code_id: budgetCodeId,
            description: 'Test line item',
            quantity: 1,
            uom: 'EA' as const,
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
          uom: '',
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

  // Load dropdown options.
  // Each endpoint failure surfaces a specific, actionable toast (Rule 2 — no generic errors).
  useEffect(() => {
    async function loadOptions() {
      setIsLoadingOptions(true)

      const describeFailure = async (
        response: Response,
        label: string,
      ): Promise<string> => {
        try {
          const body = await response.json()
          const reason =
            (body && typeof body === 'object' && 'error' in body
              ? String((body as { error?: unknown }).error ?? '')
              : '') ||
            (body && typeof body === 'object' && 'message' in body
              ? String((body as { message?: unknown }).message ?? '')
              : '')
          return reason
            ? `${label} load failed: ${reason}`
            : `${label} load failed (HTTP ${response.status})`
        } catch {
          return `${label} load failed (HTTP ${response.status})`
        }
      }

      const [vendorsRes, employeesRes, budgetCodesRes] = await Promise.allSettled([
        fetch(`/api/projects/${projectId}/vendors`),
        fetch(`/api/projects/${projectId}/employees`),
        fetch(`/api/projects/${projectId}/budget-codes`),
      ])

      if (vendorsRes.status === 'fulfilled') {
        const res = vendorsRes.value
        if (res.ok) {
          try {
            const data = await res.json()
            setVendors(Array.isArray(data) ? data : [])
          } catch (error) {
            toast.error(
              `Vendor list returned malformed JSON: ${
                error instanceof Error ? error.message : 'unknown parse error'
              }`,
            )
          }
        } else {
          toast.error(await describeFailure(res, 'Vendors'))
        }
      } else {
        toast.error(
          `Vendor list network error: ${
            vendorsRes.reason instanceof Error
              ? vendorsRes.reason.message
              : 'request failed'
          }`,
        )
      }

      if (employeesRes.status === 'fulfilled') {
        const res = employeesRes.value
        if (res.ok) {
          try {
            const data = await res.json()
            setEmployees(Array.isArray(data) ? data : [])
          } catch (error) {
            toast.error(
              `Employee list returned malformed JSON: ${
                error instanceof Error ? error.message : 'unknown parse error'
              }`,
            )
          }
        } else {
          toast.error(await describeFailure(res, 'Employees'))
        }
      } else {
        toast.error(
          `Employee list network error: ${
            employeesRes.reason instanceof Error
              ? employeesRes.reason.message
              : 'request failed'
          }`,
        )
      }

      if (budgetCodesRes.status === 'fulfilled') {
        const res = budgetCodesRes.value
        if (res.ok) {
          try {
            const data = await res.json()
            setBudgetCodes(
              Array.isArray(data) ? data : data.budgetCodes || [],
            )
          } catch (error) {
            toast.error(
              `Budget codes returned malformed JSON: ${
                error instanceof Error ? error.message : 'unknown parse error'
              }`,
            )
          }
        } else {
          toast.error(await describeFailure(res, 'Budget codes'))
        }
      } else {
        toast.error(
          `Budget codes network error: ${
            budgetCodesRes.reason instanceof Error
              ? budgetCodesRes.reason.message
              : 'request failed'
          }`,
        )
      }

      setIsLoadingOptions(false)
    }

    loadOptions()
  }, [projectId])

  const handleBudgetCodeCreated = useCallback(async (budgetCodeId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/budget-codes`)
      if (!response.ok) return
      const budgetCodesData = await response.json()
      setBudgetCodes(
        Array.isArray(budgetCodesData)
          ? budgetCodesData
          : budgetCodesData.budgetCodes || []
      )
      if (targetBudgetCodeRowIndex !== null && budgetCodeId) {
        form.setValue(
          `line_items.${targetBudgetCodeRowIndex}.budget_code_id`,
          budgetCodeId,
          { shouldDirty: true, shouldValidate: true }
        )
      }
      setTargetBudgetCodeRowIndex(null)
      toast.success('Budget code created successfully')
    } catch {
      toast.error('Budget code created, but failed to refresh list')
      setTargetBudgetCodeRowIndex(null)
    }
  }, [projectId, targetBudgetCodeRowIndex, form])

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
      toast.error('Failed to save direct cost')
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
      uom: '',
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
      {mode === 'edit' && (
        <AutoSaveIndicator
          status={autoSaving ? 'saving' : lastSaved ? 'saved' : 'idle'}
          lastSaved={lastSaved}
        />
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8"
          data-dev-autofill-disabled
        >
          <FormSection
            title="Basic Information"
          >
            <FormGrid columns={2}>
              <RHFSelectField
                control={form.control}
                name="cost_type"
                label="Cost Type *"
                placeholder="Select cost type"
                options={CostTypes.map((type) => ({ value: type, label: type }))}
              />

              <RHFSelectField
                control={form.control}
                name="status"
                label="Status"
                placeholder="Select status"
                options={CostStatuses.map((status) => ({ value: status, label: status }))}
              />

              <RHFDateField
                control={form.control}
                name="date"
                label="Incurred Date *"
                valueType="date"
              />

              <RHFSelectField
                control={form.control}
                name="terms"
                label="Payment Terms"
                placeholder="Select payment terms"
                options={['Due on Receipt', 'Net 10', 'Net 15', 'Net 30', 'Net 60', 'Net 90'].map((term) => ({
                  value: term,
                  label: term,
                }))}
              />

              <RHFComboboxField
                control={form.control}
                name="vendor_id"
                label="Vendor"
                placeholder="Search vendors..."
                searchPlaceholder="Type to search vendors..."
                emptyMessage="No vendors found."
                description="Optional - for subcontractor costs"
                disabled={isLoadingOptions}
                options={vendorOptions}
                selectedLabel={vendorSelectedLabel}
              />

              <RHFComboboxField
                control={form.control}
                name="employee_id"
                label="Employee"
                placeholder="Search employees..."
                searchPlaceholder="Type to search employees..."
                emptyMessage="No employees found."
                description="Optional - for labor costs"
                disabled={isLoadingOptions}
                options={employeeOptions}
                selectedLabel={employeeSelectedLabel}
              />
            </FormGrid>

            <RHFTextareaField
              control={form.control}
              name="description"
              label="Description"
              placeholder="Enter cost description or notes"
              rows={3}
            />

            <FormGrid columns={2}>
              <RHFDateField
                control={form.control}
                name="received_date"
                label="Received Date"
                description="Date cost was received"
                valueType="date"
                nullable
              />

              <RHFDateField
                control={form.control}
                name="paid_date"
                label="Paid Date"
                description="Date payment was made"
                valueType="date"
                nullable
              />
            </FormGrid>
          </FormSection>

          <FormSection
            title="Line Items"          >
            <LineItemsManager
              items={fields as any}
              budgetCodes={mappedBudgetCodes}
              onAdd={handleAddLineItem}
              onRemove={handleRemoveLineItem}
              onUpdate={handleUpdateLineItem}
              onCreateBudgetCode={(index) => {
                setTargetBudgetCodeRowIndex(index)
                setShowCreateBudgetCodeModal(true)
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
          </FormSection>

          <FormSection
            title="Attachments"          >
            <AttachmentManager
              attachments={[]}
              onUpload={async () => {
                return Promise.resolve()
              }}
              onDelete={async () => {
                return Promise.resolve()
              }}
            />
          </FormSection>

          <FormActions
            onCancel={onCancel}
            isSubmitting={isSubmitting}
            align="between"
            submitLabel={mode === 'create' ? 'Create Direct Cost' : 'Update Direct Cost'}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/${projectId}/direct-costs`)}
                  className="w-full sm:w-auto"
                >
                  Back to List
                </Button>
                {showAutoFill && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAutoFill}
                    disabled={isAutoFilling || isLoadingOptions}
                    className="w-full sm:w-auto"
                    title="Development only: Fill form with test data"
                  >
                    <Wand2 className="h-4 w-4" />
                    {isAutoFilling ? 'Filling...' : 'Auto-Fill'}
                  </Button>
                )}
              </div>

            </div>
          </FormActions>
        </form>
      </Form>

      <CreateBudgetCodeModal
        open={showCreateBudgetCodeModal}
        onOpenChange={(open) => {
          setShowCreateBudgetCodeModal(open)
          if (!open) {
            setTargetBudgetCodeRowIndex(null)
          }
        }}
        projectId={String(projectId)}
        onSuccess={handleBudgetCodeCreated}
      />
    </div>
  )
}
