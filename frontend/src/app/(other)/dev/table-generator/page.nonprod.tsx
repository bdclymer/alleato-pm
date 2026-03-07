'use client'

/**
 * ============================================================================
 * TABLE PAGE GENERATOR (DEV ONLY)
 * ============================================================================
 *
 * A development-only tool for rapidly generating table page configurations.
 *
 * Features:
 * - Select a Supabase table
 * - Auto-detect columns and types
 * - Configure visible columns
 * - Set search fields
 * - Configure filters
 * - Enable editing capabilities
 * - Generate complete page.tsx code
 * - Copy to clipboard
 *
 * Only accessible in local/development environments.
 */

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Copy, Download, Loader2, AlertCircle, Check, ChevronsUpDown } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { FormLayout } from '@/components/layouts'
import { PageHeader } from '@/components/layout'

interface Column {
  name: string
  type: 'text' | 'date' | 'badge' | 'number' | 'email'
  isSystemField: boolean
  defaultVisible: boolean
  isPrimary?: boolean
  isSecondary?: boolean
}

interface FilterOption {
  field: string
  label: string
  options: { value: string; label: string }[]
}

export default function TableGeneratorPage() {
  // State
  const [tables, setTables] = useState<string[]>([])
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [columns, setColumns] = useState<Column[]>([])
  const [tableName, setTableName] = useState<string>('')
  const [tableDescription, setTableDescription] = useState<string>('')
  const [searchFields, setSearchFields] = useState<string[]>([])
  const [filters, setFilters] = useState<FilterOption[]>([])
  const [enableEdit, setEnableEdit] = useState(true)
  const [enableRowClick, setEnableRowClick] = useState(false)
  const [rowClickPath, setRowClickPath] = useState<string>('')
  const [generatedCode, setGeneratedCode] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingTables, setIsFetchingTables] = useState(true)

  // Fetch available tables on mount
  useEffect(() => {
    fetchTables()
  }, [])

  const fetchTables = async () => {
    setIsFetchingTables(true)
    try {
      const response = await fetch('/api/dev/schema')
      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        return
      }

      setTables(data.tables || [])
    } catch (error) {
      toast.error('Failed to fetch tables')
      } finally {
      setIsFetchingTables(false)
    }
  }

  const fetchColumns = async (table: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/dev/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableName: table }),
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        if (data.details) {
          toast.info(data.details)
        }
        return
      }

      const cols: Column[] = data.columns.map((col: { name: string; type: string; isSystemField: boolean }) => ({
        ...col,
        defaultVisible: !col.isSystemField && col.name !== 'updated_at',
        isPrimary: col.name === 'name' || col.name === 'title' || col.name === 'description',
        isSecondary: col.name === 'status' || col.name === 'category',
      }))

      setColumns(cols)

      // Auto-set search fields (text columns only)
      const textFields = cols
        .filter(c => c.type === 'text' && !c.isSystemField)
        .map(c => c.name)
      setSearchFields(textFields.slice(0, 4))

      // Set default table name
      const formatted = table
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      setTableName(formatted)
      setTableDescription(`Manage ${formatted.toLowerCase()}`)

      // Set default row click path
      if (enableRowClick) {
        setRowClickPath(`/${table}/{id}`)
      }

      // Show success message
      if (data.note) {
        toast.warning(data.note)
      } else {
        toast.success(`Loaded ${cols.length} columns from ${table}`)
      }
    } catch (error) {
      toast.error('Failed to fetch columns')
      } finally {
      setIsLoading(false)
    }
  }

  const handleTableSelect = (table: string) => {
    setSelectedTable(table)
    setSearchQuery('')
    setOpen(false)
    fetchColumns(table)
  }

  // Filter tables based on search query
  const filteredTables = useMemo(() => {
    if (!searchQuery) return tables
    const query = searchQuery.toLowerCase()
    return tables.filter(table => table.toLowerCase().includes(query))
  }, [tables, searchQuery])

  const toggleColumn = (columnName: string, field: keyof Column) => {
    setColumns(prev =>
      prev.map(col => (col.name === columnName ? { ...col, [field]: !col[field] } : col))
    )
  }

  const toggleSearchField = (field: string) => {
    setSearchFields(prev => (prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]))
  }

  const addFilter = () => {
    const newFilter: FilterOption = {
      field: '',
      label: '',
      options: [{ value: '', label: '' }],
    }
    setFilters(prev => [...prev, newFilter])
  }

  const removeFilter = (index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index))
  }

  const updateFilter = (index: number, updates: Partial<FilterOption>) => {
    setFilters(prev => prev.map((filter, i) => (i === index ? { ...filter, ...updates } : filter)))
  }

  const addFilterOption = (filterIndex: number) => {
    setFilters(prev =>
      prev.map((filter, i) =>
        i === filterIndex ? { ...filter, options: [...filter.options, { value: '', label: '' }] } : filter
      )
    )
  }

  const updateFilterOption = (
    filterIndex: number,
    optionIndex: number,
    key: 'value' | 'label',
    value: string
  ) => {
    setFilters(prev =>
      prev.map((filter, i) =>
        i === filterIndex
          ? {
              ...filter,
              options: filter.options.map((opt, j) => (j === optionIndex ? { ...opt, [key]: value } : opt)),
            }
          : filter
      )
    )
  }

  const generateCode = () => {
    if (!selectedTable) {
      toast.error('Please select a table first')
      return
    }

    const visibleColumns = columns.filter(c => c.defaultVisible)
    const editableFields = columns.filter(c => !c.isSystemField && c.defaultVisible).map(c => c.name)

    // Build column configuration
    const columnsConfig = visibleColumns.map(col => {
      const config: Record<string, unknown> = {
        id: col.name,
        label: col.name
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        defaultVisible: true,
        type: col.type,
      }

      if (col.isPrimary) config.isPrimary = true
      if (col.isSecondary) config.isSecondary = true

      return config
    })

    // Build config object
    const configObj = {
      title: tableName,
      description: tableDescription,
      searchFields,
      exportFilename: `${selectedTable}-export.csv`,
      ...(enableEdit && {
        editConfig: {
          tableName: selectedTable,
          editableFields,
        },
      }),
      columns: columnsConfig,
      ...(filters.length > 0 && {
        filters: filters.map(f => ({
          id: f.field,
          label: f.label,
          field: f.field,
          options: f.options.filter(opt => opt.value && opt.label),
        })),
      }),
      ...(enableRowClick &&
        rowClickPath && {
          rowClickPath,
        }),
    }

    const code = `import { createClient } from '@/lib/supabase/server'
import { GenericDataTable, type GenericTableConfig } from '@/components/tables/generic-table-factory'

// ============================================================================
// 🎯 TABLE CONFIGURATION
// ============================================================================
// Customize the fields below to match your needs:
// - title: Page heading
// - description: Subtitle text
// - searchFields: Which fields are searchable
// - columns: Displayed columns and their properties
// - filters: Dropdown filters (if any)
// - editConfig: Enable inline editing (if needed)
// - rowClickPath: Navigation on row click (if needed)
// ============================================================================

const config: GenericTableConfig = ${JSON.stringify(configObj, null, 2)}

export default async function ${tableName.replace(/\s/g, '')}Page() {
  const supabase = await createClient()

  // ============================================================================
  // 📊 DATA FETCHING
  // ============================================================================
  // Customize the query below:
  // - Add .select() joins for related data
  // - Change .order() for different sorting
  // - Add .filter() for default filters
  // ============================================================================

  const { data, error } = await supabase
    .from('${selectedTable}')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="text-center text-destructive">
        Error loading ${tableName.toLowerCase()}. Please try again later.
      </div>
    )
  }

  return <GenericDataTable data={data || []} config={config} />
}
`

    setGeneratedCode(code)
    toast.success('Code generated! Copy or download below.')
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode)
      toast.success('Copied to clipboard!')
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  const downloadFile = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedTable}-page.tsx`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('File downloaded!')
  }

  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="container mx-auto py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not Available</AlertTitle>
          <AlertDescription>This tool is only available in development environments.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Table Page Generator"
        description="Generate table page configurations from your Supabase schema"
        breadcrumbs={[{ label: 'Dev', href: '/dev' }, { label: 'Table Generator' }]}
      />

      <FormLayout>
        {/* Step 1: Select Table */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">1. Select Table</h2>
            <p className="text-sm text-muted-foreground">
              Choose a Supabase table to generate a page for
              {!isFetchingTables && tables.length > 0 && <span className="ml-2">({tables.length} tables found)</span>}
            </p>
          </div>

          <div className="space-y-4">
            {isFetchingTables ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading tables...</span>
              </div>
            ) : (
              <>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                      {selectedTable || 'Select a table...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search tables..." value={searchQuery} onValueChange={setSearchQuery} />
                      <CommandList>
                        <CommandEmpty>No table found.</CommandEmpty>
                        <CommandGroup>
                          {filteredTables.map(table => (
                            <CommandItem key={table} value={table} onSelect={() => handleTableSelect(table)}>
                              <Check
                                className={cn('mr-2 h-4 w-4', selectedTable === table ? 'opacity-100' : 'opacity-0')}
                              />
                              {table}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {tables.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No tables found</AlertTitle>
                    <AlertDescription>
                      The API couldn&apos;t find any accessible tables. Check your Supabase connection and RLS policies.
                    </AlertDescription>
                  </Alert>
                )}

                <Button variant="ghost" size="sm" onClick={fetchTables} disabled={isFetchingTables} className="w-full">
                  {isFetchingTables ? 'Refreshing...' : 'Refresh Table List'}
                </Button>
              </>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {selectedTable && !isLoading && (
          <>
            {/* Step 2: Configure Basic Info */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">2. Basic Configuration</h2>
                <p className="text-sm text-muted-foreground">Set the page title and description</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tableName">Table Title</Label>
                  <Input
                    id="tableName"
                    value={tableName}
                    onChange={e => setTableName(e.target.value)}
                    placeholder="e.g., Risks"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tableDescription">Description</Label>
                  <Input
                    id="tableDescription"
                    value={tableDescription}
                    onChange={e => setTableDescription(e.target.value)}
                    placeholder="e.g., Track and manage project risks"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Configure Columns */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">3. Configure Columns</h2>
                <p className="text-sm text-muted-foreground">Select which columns to show and their properties</p>
              </div>

              <div>
                <div className="space-y-2">
                  {columns.map(col => (
                    <div key={col.name} className="flex items-center gap-4 p-4 border rounded">
                      <Checkbox
                        checked={col.defaultVisible}
                        onCheckedChange={() => toggleColumn(col.name, 'defaultVisible')}
                        disabled={col.isSystemField}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{col.name}</p>
                        <p className="text-sm text-muted-foreground">Type: {col.type}</p>
                      </div>

                      {!col.isSystemField && col.defaultVisible && (
                        <div className="flex gap-2">
                          <label className="flex items-center gap-1 text-sm">
                            <Checkbox
                              checked={col.isPrimary || false}
                              onCheckedChange={() => toggleColumn(col.name, 'isPrimary')}
                            />
                            Primary
                          </label>
                          <label className="flex items-center gap-1 text-sm">
                            <Checkbox
                              checked={col.isSecondary || false}
                              onCheckedChange={() => toggleColumn(col.name, 'isSecondary')}
                            />
                            Secondary
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 4: Search Fields */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">4. Search Fields</h2>
                <p className="text-sm text-muted-foreground">Select which fields should be searchable</p>
              </div>

              <div>
                <div className="space-y-2">
                  {columns
                    .filter(c => c.type === 'text' && !c.isSystemField)
                    .map(col => (
                      <label key={col.name} className="flex items-center gap-2">
                        <Checkbox
                          checked={searchFields.includes(col.name)}
                          onCheckedChange={() => toggleSearchField(col.name)}
                        />
                        {col.name}
                      </label>
                    ))}
                </div>
              </div>
            </div>

            {/* Step 5: Filters */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">5. Filters (Optional)</h2>
                <p className="text-sm text-muted-foreground">Add dropdown filters for common fields</p>
              </div>

              <div className="space-y-4">
                {filters.map((filter, idx) => (
                  <div key={idx} className="p-4 border rounded space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Filter {idx + 1}</h4>
                      <Button variant="ghost" size="sm" onClick={() => removeFilter(idx)}>
                        Remove
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Field</Label>
                        <Select value={filter.field} onValueChange={value => updateFilter(idx, { field: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {columns
                              .filter(c => c.type === 'badge')
                              .map(col => (
                                <SelectItem key={col.name} value={col.name}>
                                  {col.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Label</Label>
                        <Input
                          value={filter.label}
                          onChange={e => updateFilter(idx, { label: e.target.value })}
                          placeholder="e.g., Status"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Options</Label>
                      {filter.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex gap-2">
                          <Input
                            placeholder="value"
                            value={opt.value}
                            onChange={e => updateFilterOption(idx, optIdx, 'value', e.target.value)}
                          />
                          <Input
                            placeholder="label"
                            value={opt.label}
                            onChange={e => updateFilterOption(idx, optIdx, 'label', e.target.value)}
                          />
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => addFilterOption(idx)}>
                        Add Option
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addFilter}>
                  Add Filter
                </Button>
              </div>
            </div>

            {/* Step 6: Additional Features */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">6. Additional Features</h2>
                <p className="text-sm text-muted-foreground">Configure editing and navigation</p>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-2">
                  <Checkbox checked={enableEdit} onCheckedChange={v => setEnableEdit(!!v)} />
                  Enable inline editing
                </label>

                <label className="flex items-center gap-2">
                  <Checkbox checked={enableRowClick} onCheckedChange={v => setEnableRowClick(!!v)} />
                  Enable row click navigation
                </label>

                {enableRowClick && (
                  <div className="space-y-2">
                    <Label>Row Click Path</Label>
                    <Input
                      value={rowClickPath}
                      onChange={e => setRowClickPath(e.target.value)}
                      placeholder="e.g., /risks/{id}"
                    />
                    <p className="text-xs text-muted-foreground">Use {'{id}'} as placeholder for row ID</p>
                  </div>
                )}
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex justify-end pt-4">
              <Button size="lg" onClick={generateCode}>
                Generate Code
              </Button>
            </div>

            {/* Generated Code */}
            {generatedCode && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">Generated Code</h2>
                  <p className="text-sm text-muted-foreground">
                    Copy this code to your page.tsx file: frontend/src/app/(tables)/{selectedTable}/page.tsx
                  </p>
                </div>

                <div className="space-y-4">
                  <Textarea value={generatedCode} readOnly rows={20} className="font-mono text-sm" />
                  <div className="flex gap-2">
                    <Button onClick={copyToClipboard}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy to Clipboard
                    </Button>
                    <Button variant="outline" onClick={downloadFile}>
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </FormLayout>
    </>
  )
}
