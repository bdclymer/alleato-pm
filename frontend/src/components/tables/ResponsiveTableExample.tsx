/**
 * Example of how to migrate from DataTable to DataTableResponsive
 *
 * Before:
 * ```tsx
 * <DataTable
 *   columns={columns}
 *   data={data}
 *   onRowClick={handleView}
 * />
 * ```
 *
 * After:
 * ```tsx
 * <DataTableResponsive
 *   columns={columns}
 *   data={data}
 *   onRowClick={handleView}
 *   searchKey="name" // The column key to search by
 *   searchPlaceholder="Search..."
 *   filterOptions={[
 *     {
 *       column: 'status',
 *       title: 'Status',
 *       options: [
 *         { label: 'Active', value: 'active' },
 *         { label: 'Inactive', value: 'inactive' },
 *       ]
 *     },
 *     {
 *       column: 'type',
 *       title: 'Type',
 *       options: [
 *         { label: 'Type A', value: 'type_a' },
 *         { label: 'Type B', value: 'type_b' },
 *       ]
 *     }
 *   ]}
 *   mobileColumns={['name', 'status', 'amount']} // Columns to show on mobile
 *   mobileCardRenderer={(item) => (
 *     // Custom mobile card layout
 *     <div className="space-y-2">
 *       <div className="flex justify-between items-start">
 *         <div>
 *           <div className="font-medium">{item.name}</div>
 *           <div className="text-sm text-muted-foreground">{item.description}</div>
 *         </div>
 *         <StatusBadge status={item.status} />
 *       </div>
 *       <div className="flex justify-between items-center pt-2 border-t">
 *         <span className="text-sm text-muted-foreground">Amount</span>
 *         <span className="font-medium">{formatCurrency(item.amount)}</span>
 *       </div>
 *     </div>
 *   )}
 * />
 * ```
 */

// Sample implementation for different table types:

// 1. Simple table with basic filters
export const SimpleTableExample = `
<DataTableResponsive
  columns={columns}
  data={data}
  searchKey="name"
  searchPlaceholder="Search by name..."
  mobileColumns={['name', 'email', 'status']}
/>
`;

// 2. Financial table with custom mobile renderer
export const FinancialTableExample = `
<DataTableResponsive
  columns={columns}
  data={commitments}
  onRowClick={handleView}
  searchKey="title"
  searchPlaceholder="Search commitments..."
  filterOptions={[
    {
      column: 'status',
      title: 'Status',
      options: statusOptions
    },
    {
      column: 'type',
      title: 'Type', 
      options: typeOptions
    }
  ]}
  mobileCardRenderer={(item) => (
    <div className="space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium text-primary">{item.number}</div>
          <div className="text-sm">{item.title}</div>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <div className="flex justify-between pt-2 border-t">
        <span className="text-sm text-muted-foreground">Amount</span>
        <span className="font-medium">{formatCurrency(item.amount)}</span>
      </div>
    </div>
  )}
/>
`;

// 3. Project table with actions
export const ProjectTableExample = `
<DataTableResponsive
  columns={columns}
  data={projects}
  onRowClick={handleView}
  searchKey="project_name"
  searchPlaceholder="Search projects..."
  filterOptions={[
    {
      column: 'status',
      title: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'On Hold', value: 'on_hold' },
        { label: 'Completed', value: 'completed' },
      ]
    },
    {
      column: 'priority',
      title: 'Priority',
      options: [
        { label: 'High', value: 'high' },
        { label: 'Medium', value: 'medium' },
        { label: 'Low', value: 'low' },
      ]
    }
  ]}
  mobileCardRenderer={(project) => (
    <div className="space-y-4">
      <div>
        <div className="font-medium">{project.project_name}</div>
        <div className="text-sm text-muted-foreground">{project.client_name}</div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={project.status} />
        <Badge variant="outline">{project.priority}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Start:</span>{' '}
          {formatDate(project.start_date)}
        </div>
        <div>
          <span className="text-muted-foreground">End:</span>{' '}
          {formatDate(project.end_date)}
        </div>
      </div>
    </div>
  )}
/>
`;
