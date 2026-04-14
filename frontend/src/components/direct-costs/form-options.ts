/**
 * =============================================================================
 * DIRECT COST FORM — OPTION SYNTHESIS HELPERS
 * =============================================================================
 *
 * Pure functions that build the vendor / employee combobox option lists
 * for `DirectCostForm`.
 *
 * ## Why this file exists
 *
 * `direct_costs.vendor_id` is a FK to `companies.id`, but the form's vendor
 * dropdown is fed by `/api/projects/[id]/vendors` which is project-scoped
 * (only returns companies in `project_vendors` for that project, falling back
 * to all vendor companies globally). That means an existing direct cost can
 * point at a company that is NOT in the scoped dropdown set, which causes
 * the combobox to render a placeholder ("Select vendor...") on Edit instead
 * of the saved vendor name.
 *
 * To guarantee the saved FK target is always renderable, we inject a synthetic
 * option for the record's currently-assigned vendor (from the GET API's
 * `vendor:companies(*)` embed) if it is not already in the fetched list.
 *
 * See docs/patterns/form-id-mismatch-prevention.md for the full pattern and
 * the scope-mismatch variant that this helper defends against.
 */

export interface ComboboxOptionShape {
  value: string
  label: string
  keywords: string[]
}

export interface VendorMeta {
  id: string
  name: string | null
}

export interface EmployeeMeta {
  id: string
  first_name: string
  last_name: string
}

export interface VendorListEntry {
  id: string
  vendor_name: string
  company?: string | null
}

export interface EmployeeListEntry {
  id: string
  first_name: string
  last_name: string
}

/**
 * Build vendor combobox options, injecting the currently-assigned vendor if
 * it isn't already in the fetched list.
 */
export function buildVendorOptions(
  vendors: VendorListEntry[],
  selected: VendorMeta | null,
): ComboboxOptionShape[] {
  const base: ComboboxOptionShape[] = vendors.map((vendor) => ({
    value: vendor.id,
    label: `${vendor.vendor_name}${vendor.company ? ` (${vendor.company})` : ''}`,
    keywords: [vendor.vendor_name, vendor.company].filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    ),
  }))

  if (
    selected &&
    selected.name &&
    !base.some((option) => option.value === selected.id)
  ) {
    base.unshift({
      value: selected.id,
      label: selected.name,
      keywords: [selected.name],
    })
  }

  return base
}

/**
 * Build employee combobox options, injecting the currently-assigned employee if
 * it isn't already in the fetched list.
 */
export function buildEmployeeOptions(
  employees: EmployeeListEntry[],
  selected: EmployeeMeta | null,
): ComboboxOptionShape[] {
  const base: ComboboxOptionShape[] = employees.map((employee) => ({
    value: employee.id,
    label: `${employee.first_name} ${employee.last_name}`,
    keywords: [employee.first_name, employee.last_name].filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    ),
  }))

  if (
    selected &&
    !base.some((option) => option.value === selected.id)
  ) {
    const trimmedLabel =
      `${selected.first_name} ${selected.last_name}`.trim() || selected.id
    base.unshift({
      value: selected.id,
      label: trimmedLabel,
      keywords: [selected.first_name, selected.last_name].filter(
        (value): value is string => typeof value === 'string' && value.length > 0,
      ),
    })
  }

  return base
}
