import { createClient } from '@/lib/supabase/server'
import {
  GenericDataTable,
  type GenericTableConfig,
} from '@/components/tables/generic-table-factory'
import { TableLayout } from '@/components/layouts'
import { PageHeader } from '@/components/layout'

const config: GenericTableConfig = {
  title: 'Subcontractors',
  description: 'Manage subcontractors',
  searchFields: [
    'company_name',
    'legal_business_name',
    'dba_name',
    'company_type',
  ],
  exportFilename: 'subcontractors-export.csv',
  editConfig: {
    tableName: 'subcontractors',
    editableFields: [
      'company_name',
      'company_type',
      'primary_contact_name',
      'primary_contact_title',
      'primary_contact_email',
      'primary_contact_phone',
      'address_line_1',
      'address_line_2',
      'city',
      'state_province',
      'postal_code',
      'country',
      'specialties',
      'service_areas',
      'status',
    ],
  },
  columns: [
    {
      id: 'company_name',
      label: 'Company Name',
      defaultVisible: true,
      type: 'text',
    },
    {
      id: 'company_type',
      label: 'Company Type',
      defaultVisible: true,
      type: 'text',
    },
    {
      id: 'primary_contact_name',
      label: 'Primary Contact Name',
      defaultVisible: true,
      type: 'text',
    },
    {
      id: 'primary_contact_title',
      label: 'Primary Contact Title',
      defaultVisible: true,
      type: 'text',
    },
    {
      id: 'primary_contact_email',
      label: 'Primary Contact Email',
      defaultVisible: true,
      type: 'email',
    },
    {
      id: 'primary_contact_phone',
      label: 'Primary Contact Phone',
      defaultVisible: true,
      type: 'text',
    },
    {
      id: 'address_line_1',
      label: 'Address Line 1',
      defaultVisible: true,
      type: 'text',
    },
    {
      id: 'address_line_2',
      label: 'Address Line 2',
      defaultVisible: true,
      type: 'text',
    },
    {
      id: 'city',
      label: 'City',
      defaultVisible: true,
      type: 'text',
    },
    {
      id: 'state_province',
      label: 'State Province',
      defaultVisible: true,
      type: 'text',
    },
    {
      id: 'postal_code',
      label: 'Postal Code',
      defaultVisible: true,
      type: 'text',
    },
    {
      id: 'country',
      label: 'Country',
      defaultVisible: true,
      type: 'text',
    },
    {
      id: 'specialties',
      label: 'Specialties',
      defaultVisible: true,
      type: 'text',
    },
    {
      id: 'service_areas',
      label: 'Service Areas',
      defaultVisible: true,
      type: 'text',
    },
    {
      id: 'status',
      label: 'Status',
      defaultVisible: true,
      type: 'badge',
      isSecondary: true,
    },
  ],
  filters: [
    {
      id: 'status',
      label: 'Status',
      field: 'status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  ],
}

export default async function SubcontractorsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subcontractors')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <>
        <PageHeader
          title="Subcontractors"
          description="Manage subcontractors"
          breadcrumbs={[
            { label: 'Dashboard', href: '/' },
            { label: 'Subcontractors' },
          ]}
        />
        <TableLayout>
          <div className="text-center text-destructive">
            Error loading subcontractors. Please try again later.
          </div>
        </TableLayout>
      </>
    )
  }

  return (
    <>
      <TableLayout>
        <GenericDataTable data={data || []} config={config} />
      </TableLayout>
    </>
  )
}
