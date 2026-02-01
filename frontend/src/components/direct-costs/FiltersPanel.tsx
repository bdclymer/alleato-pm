/** * ============================================================================= * DIRECT COSTS FILTERS PANEL COMPONENT * ============================================================================= * * Comprehensive filter panel for the Direct Costs feature. * Includes filters for status, cost type, vendor, date range, amount range, and search. * * @example * ```tsx * import { FiltersPanel } from '@/components/direct-costs'; * * function DirectCostsPage() { * const [filters, setFilters] = useState<DirectCostFilter>({ * status: 'all', * cost_type: 'all', * }); * const vendors = [ * { id: '1', vendor_name: 'Acme Supply Co' }, * { id: '2', vendor_name: 'BuildMart' } * ]; * * return ( * <FiltersPanel * filters={filters} * onFiltersChange={setFilters} * onClearAll={() => setFilters({ status: 'all', cost_type: 'all' })} * vendorOptions={vendors} * /> * ); * } * ``` * * @component * @category Direct Costs */ "use client";
import * as React from "react";
import {
  Search,
  ChevronDown,
  X,
  Calendar,
  DollarSign,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  DirectCostFilter,
  CostStatuses,
  CostTypes,
} from "@/lib/schemas/direct-costs"; /** * Props for the FiltersPanel component */
interface FiltersPanelProps {
  /** Current filter state */ filters: DirectCostFilter;
  /** Callback when any filter changes */ onFiltersChange: (
    filters: DirectCostFilter,
  ) => void;
  /** Callback when"Clear All" is clicked */ onClearAll: () => void;
  /** Optional list of vendors for vendor filter dropdown */ vendorOptions?: Array<{
    id: string;
    vendor_name: string;
  }>;
  /** Optional additional CSS classes */ className?: string;
}
export function FiltersPanel({
  filters,
  onFiltersChange,
  onClearAll,
  vendorOptions = [],
  className,
}: FiltersPanelProps) {
  const handleFilterChange = (
    key: keyof DirectCostFilter,
    value: string | number | Date | undefined,
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  }; // Count active filters const activeFiltersCount = [ filters.status !== 'all' && filters.status, filters.cost_type !== 'all' && filters.cost_type, filters.vendor_id, filters.date_from, filters.date_to, filters.amount_min !== undefined && filters.amount_min !== null, filters.amount_max !== undefined && filters.amount_max !== null, filters.search, ].filter(Boolean).length; // Get selected vendor name for display const selectedVendorName = React.useMemo(() => { if (!filters.vendor_id) return undefined; return vendorOptions.find((v) => v.id === filters.vendor_id)?.vendor_name; }, [filters.vendor_id, vendorOptions]); return ( <div className={cn('bg-background rounded-lg border p-4', className)}> {/* Header */} <div className="flex items-center justify-between mb-4"> <div className="flex items-center gap-2"> <Filter className="w-4 h-4 text-muted-foreground" /> <h3 className="text-sm font-semibold text-foreground">Filters</h3> {activeFiltersCount > 0 && ( <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-2xs font-bold text-blue-700"> {activeFiltersCount} </span> )} </div> {activeFiltersCount > 0 && ( <Button variant="ghost" size="sm" onClick={onClearAll} className="h-7 text-xs" > <X className="w-3.5 h-3.5 mr-1" /> Clear All </Button> )} </div> {/* Filter Grid */} <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"> {/* Status Filter */} <div className="space-y-1.5"> <Label className="text-xs text-foreground">Status</Label> <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)} > <SelectTrigger className="h-9 w-full"> <SelectValue placeholder="All Statuses" /> </SelectTrigger> <SelectContent> <SelectItem value="all">All Statuses</SelectItem> <SelectItem value="Draft">Draft</SelectItem> <SelectItem value="Approved">Approved</SelectItem> <SelectItem value="Rejected">Rejected</SelectItem> <SelectItem value="Paid">Paid</SelectItem> </SelectContent> </Select> </div> {/* Cost Type Filter */} <div className="space-y-1.5"> <Label className="text-xs text-foreground">Cost Type</Label> <Select value={filters.cost_type || 'all'} onValueChange={(value) => handleFilterChange('cost_type', value)} > <SelectTrigger className="h-9 w-full"> <SelectValue placeholder="All Types" /> </SelectTrigger> <SelectContent> <SelectItem value="all">All Types</SelectItem> <SelectItem value="Expense">Expense</SelectItem> <SelectItem value="Invoice">Invoice</SelectItem> <SelectItem value="Subcontractor Invoice"> Subcontractor Invoice </SelectItem> </SelectContent> </Select> </div> {/* Vendor Filter */} <div className="space-y-1.5"> <Label className="text-xs text-foreground">Vendor</Label> <DropdownMenu> <DropdownMenuTrigger asChild> <Button variant="outline" className="h-9 w-full justify-between text-sm font-normal" > <span className="truncate"> {selectedVendorName || 'All Vendors'} </span> <ChevronDown className="w-4 h-4 ml-2 shrink-0 opacity-50" /> </Button> </DropdownMenuTrigger> <DropdownMenuContent align="start" className="w-56"> <DropdownMenuItem onClick={() => handleFilterChange('vendor_id', undefined)}> All Vendors </DropdownMenuItem> {vendorOptions.length > 0 ? ( <> <DropdownMenuSeparator /> {vendorOptions.map((vendor) => ( <DropdownMenuItem key={vendor.id} onClick={() => handleFilterChange('vendor_id', vendor.id)} > {vendor.vendor_name} </DropdownMenuItem> ))} </> ) : ( <DropdownMenuItem disabled>No vendors found</DropdownMenuItem> )} </DropdownMenuContent> </DropdownMenu> </div> {/* Search Filter */} <div className="space-y-1.5"> <Label className="text-xs text-foreground">Search</Label> <div className="relative"> <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /> <Input placeholder="Description, invoice #..." value={filters.search || ''} onChange={(e) => handleFilterChange('search', e.target.value)} className="pl-9 h-9" /> </div> </div> {/* Date From */} <div className="space-y-1.5"> <Label className="text-xs text-foreground flex items-center gap-1"> <Calendar className="w-3.5 h-3.5" /> Date From </Label> <Input type="date" value={ filters.date_from ? new Date(filters.date_from).toISOString().split('T')[0] : '' } onChange={(e) => handleFilterChange( 'date_from', e.target.value ? new Date(e.target.value) : undefined ) } className="h-9" /> </div> {/* Date To */} <div className="space-y-1.5"> <Label className="text-xs text-foreground flex items-center gap-1"> <Calendar className="w-3.5 h-3.5" /> Date To </Label> <Input type="date" value={ filters.date_to ? new Date(filters.date_to).toISOString().split('T')[0] : '' } onChange={(e) => handleFilterChange( 'date_to', e.target.value ? new Date(e.target.value) : undefined ) } className="h-9" /> </div> {/* Amount Min */} <div className="space-y-1.5"> <Label className="text-xs text-foreground flex items-center gap-1"> <DollarSign className="w-3.5 h-3.5" /> Min Amount </Label> <Input type="number" placeholder="0.00" min="0" step="0.01" value={filters.amount_min ?? ''} onChange={(e) => handleFilterChange( 'amount_min', e.target.value ? parseFloat(e.target.value) : undefined ) } className="h-9" /> </div> {/* Amount Max */} <div className="space-y-1.5"> <Label className="text-xs text-foreground flex items-center gap-1"> <DollarSign className="w-3.5 h-3.5" /> Max Amount </Label> <Input type="number" placeholder="0.00" min="0" step="0.01" value={filters.amount_max ?? ''} onChange={(e) => handleFilterChange( 'amount_max', e.target.value ? parseFloat(e.target.value) : undefined ) } className="h-9" /> </div> </div> {/* Active Filter Pills - Show below grid on mobile */} {activeFiltersCount > 0 && ( <div className="mt-4 pt-4 border-t"> <div className="flex flex-wrap items-center gap-2"> <span className="text-xs text-foreground">Active filters:</span> {filters.status && filters.status !== 'all' && ( <button type="button" onClick={() => handleFilterChange('status', 'all')} className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100" > Status: {filters.status} <X className="w-3 h-3" /> </button> )} {filters.cost_type && filters.cost_type !== 'all' && ( <button type="button" onClick={() => handleFilterChange('cost_type', 'all')} className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100" > Type: {filters.cost_type} <X className="w-3 h-3" /> </button> )} {selectedVendorName && ( <button type="button" onClick={() => handleFilterChange('vendor_id', undefined)} className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100" > Vendor: {selectedVendorName} <X className="w-3 h-3" /> </button> )} {filters.date_from && ( <button type="button" onClick={() => handleFilterChange('date_from', undefined)} className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100" > From: {new Date(filters.date_from).toLocaleDateString()} <X className="w-3 h-3" /> </button> )} {filters.date_to && ( <button type="button" onClick={() => handleFilterChange('date_to', undefined)} className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100" > To: {new Date(filters.date_to).toLocaleDateString()} <X className="w-3 h-3" /> </button> )} {filters.amount_min !== undefined && filters.amount_min !== null && ( <button type="button" onClick={() => handleFilterChange('amount_min', undefined)} className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100" > Min: ${filters.amount_min.toFixed(2)} <X className="w-3 h-3" /> </button> )} {filters.amount_max !== undefined && filters.amount_max !== null && ( <button type="button" onClick={() => handleFilterChange('amount_max', undefined)} className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100" > Max: ${filters.amount_max.toFixed(2)} <X className="w-3 h-3" /> </button> )} {filters.search && ( <button type="button" onClick={() => handleFilterChange('search', undefined)} className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100" > Search: {filters.search} <X className="w-3 h-3" /> </button> )} </div> </div> )} </div> );
}
