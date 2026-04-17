/**
 * Regression tests for the Direct Cost form's dropdown option synthesis.
 *
 * Bug: `direct_costs.vendor_id` FK targets `companies.id`, but the form's
 * vendor dropdown was fed by a project-scoped endpoint. When a direct cost's
 * vendor fell outside that scoped set (imported record, company removed from
 * project, or company not flagged `is_vendor`), the Edit form rendered a
 * placeholder ("Select vendor...") instead of the saved vendor name.
 *
 * See docs/patterns/form-id-mismatch-prevention.md — scope-mismatch variant.
 */
import {
  buildEmployeeOptions,
  buildVendorOptions,
} from '../form-options'

describe('buildVendorOptions', () => {
  const vendors = [
    { id: 'company-in-list-1', vendor_name: 'Alpha Electric', company: 'Alpha Electric LLC' },
    { id: 'company-in-list-2', vendor_name: 'Beta Plumbing', company: null },
  ]

  it('maps fetched vendors into combobox option shape', () => {
    const options = buildVendorOptions(vendors, null)
    expect(options).toEqual([
      {
        value: 'company-in-list-1',
        label: 'Alpha Electric (Alpha Electric LLC)',
        keywords: ['Alpha Electric', 'Alpha Electric LLC'],
      },
      {
        value: 'company-in-list-2',
        label: 'Beta Plumbing',
        keywords: ['Beta Plumbing'],
      },
    ])
  })

  it('injects the currently-assigned vendor when it is missing from the fetched list', () => {
    // This is the regression: the dropdown is project-scoped but the FK is not.
    const options = buildVendorOptions(vendors, {
      id: 'company-outside-scope',
      name: 'Gamma HVAC',
    })

    expect(options[0]).toEqual({
      value: 'company-outside-scope',
      label: 'Gamma HVAC',
      keywords: ['Gamma HVAC'],
    })
    expect(options).toHaveLength(vendors.length + 1)
    // The assigned vendor is the one the combobox will match against
    // `field.value`, so it must be present or the Edit form shows a placeholder.
    expect(
      options.some((option) => option.value === 'company-outside-scope'),
    ).toBe(true)
  })

  it('does not duplicate the assigned vendor if it is already in the fetched list', () => {
    const options = buildVendorOptions(vendors, {
      id: 'company-in-list-1',
      name: 'Alpha Electric',
    })
    const matches = options.filter((o) => o.value === 'company-in-list-1')
    expect(matches).toHaveLength(1)
  })

  it('skips injection when the assigned vendor has no human-readable name', () => {
    // If we have no name we cannot render a sensible label; better to leave
    // the field blank than to show a UUID.
    const options = buildVendorOptions(vendors, {
      id: 'company-outside-scope',
      name: null,
    })
    expect(options).toHaveLength(vendors.length)
    expect(
      options.some((option) => option.value === 'company-outside-scope'),
    ).toBe(false)
  })

  it('tolerates the fetched list being empty', () => {
    const options = buildVendorOptions([], {
      id: 'company-outside-scope',
      name: 'Orphan Co',
    })
    expect(options).toEqual([
      {
        value: 'company-outside-scope',
        label: 'Orphan Co',
        keywords: ['Orphan Co'],
      },
    ])
  })
})

describe('buildEmployeeOptions', () => {
  const employees = [
    { id: 'emp-1', first_name: 'Ada', last_name: 'Lovelace' },
    { id: 'emp-2', first_name: 'Grace', last_name: 'Hopper' },
  ]

  it('maps fetched employees into combobox option shape', () => {
    const options = buildEmployeeOptions(employees, null)
    expect(options).toEqual([
      { value: 'emp-1', label: 'Ada Lovelace', keywords: ['Ada', 'Lovelace'] },
      {
        value: 'emp-2',
        label: 'Grace Hopper',
        keywords: ['Grace', 'Hopper'],
      },
    ])
  })

  it('injects the currently-assigned employee when it is missing from the fetched list', () => {
    const options = buildEmployeeOptions(employees, {
      id: 'emp-deactivated',
      first_name: 'Alan',
      last_name: 'Turing',
    })
    expect(options[0]).toEqual({
      value: 'emp-deactivated',
      label: 'Alan Turing',
      keywords: ['Alan', 'Turing'],
    })
  })

  it('falls back to the id when the employee has no name', () => {
    const options = buildEmployeeOptions([], {
      id: 'emp-unknown',
      first_name: '',
      last_name: '',
    })
    expect(options[0]?.label).toBe('emp-unknown')
  })
})
