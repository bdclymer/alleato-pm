import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AutoForm } from "@/components/admin/table-explorer";
import { getRow } from "@/server/db/crud";
import { getColumnMetadata, getFormColumns } from "@/server/db/introspection";
import {
  isTableAllowed,
  getTableConfig,
  getRowTitle,
  hasPermission,
  type TableName,
} from "@/lib/table-registry";
import { RowDetailClient } from "./RowDetailClient";
import { FormLayout } from "@/components/layouts";
import { PageHeader } from "@/components/layout";
interface RowDetailPageProps {
  params: Promise<{ table: string; recordId: string }>;
  searchParams: Promise<{ edit?: string }>;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ table: string; recordId: string }>;
}) {
  const { table, recordId } = await params;
  if (!isTableAllowed(table)) {
    return { title: "Table Not Found" };
  }
  const config = getTableConfig(table as TableName);
  return {
    title: `${config.label} #${recordId} | Admin Table Explorer`,
    description: `View and edit ${config.label.toLowerCase()} record`,
  };
}
export default async function RowDetailPage({
  params,
  searchParams,
}: RowDetailPageProps) {
  const { table, recordId } = await params;
  const search = await searchParams; // Validate table if (!isTableAllowed(table)) { notFound(); } const tableName = table as TableName; const config = getTableConfig(tableName); // Fetch the row const result = await getRow({ table: tableName, id: recordId }); if (!result.success || !result.data) { notFound(); } const row = result.data; const rowTitle = getRowTitle(tableName, row); const isEditMode = search.edit === 'true'; // Get columns const [allColumns, formColumns] = await Promise.all([ getColumnMetadata(tableName), getFormColumns(tableName, 'edit'), ]); const canEdit = hasPermission(tableName, 'update'); const canDelete = hasPermission(tableName, 'delete'); return ( <> <PageHeader title={rowTitle} description={`${config.label} record details`} breadcrumbs={[ { label: 'Admin', href: '/admin/tables' }, { label: config.label, href: `/admin/tables/${table}` }, { label: rowTitle }, ]} actions={ <div className="flex items-center gap-2"> <Button variant="ghost" size="sm" asChild> <Link href={`/admin/tables/${table}`}> <ArrowLeft className="mr-2 h-4 w-4" /> Back to {config.label} </Link> </Button> {!isEditMode && ( <RowDetailClient table={table} rowId={recordId} rowTitle={rowTitle} canEdit={canEdit} canDelete={canDelete} /> )} </div> } /> <FormLayout> {isEditMode && canEdit ? ( <AutoForm table={tableName} columns={formColumns} initialValues={row} mode="edit" rowId={recordId} /> ) : ( <Card> <CardHeader> <CardTitle>Record Details</CardTitle> </CardHeader> <CardContent> <dl className="divide-y"> {allColumns.map((col) => { const value = row[col.column_name]; return ( <div key={col.column_name} className="py-3 sm:grid sm:grid-cols-3 sm:gap-4" > <dt className="text-sm font-medium text-muted-foreground"> {col.label} </dt> <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0"> <FieldValue value={value} column={col} /> </dd> </div> ); })} </dl> </CardContent> </Card> )} </FormLayout> </> );
}
import { type ColumnMetadata } from "@/server/db/introspection";
interface FieldValueProps {
  value: unknown;
  column: ColumnMetadata;
}
function FieldValue({ value, column }: FieldValueProps) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">Empty</span>;
  } // Boolean if (column.inputType === 'boolean') { return ( <Badge variant={value ? 'success' : 'secondary'}> {value ? 'Yes' : 'No'} </Badge> ); } // Dates if (column.inputType === 'datetime' || column.inputType === 'date') { try { const date = new Date(String(value)); return ( <span> {date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', ...(column.inputType === 'datetime' ? { hour: '2-digit', minute: '2-digit' } : {}), })} </span> ); } catch { return <span>{String(value)}</span>; } } // Numbers if (column.inputType === 'number') { const numValue = typeof value === 'number' ? value : parseFloat(String(value)); if (!isNaN(numValue)) { if ( column.column_name.includes('amount') || column.column_name.includes('price') || column.column_name.includes('cost') ) { return ( <span className="font-mono"> {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', }).format(numValue)} </span> ); } return <span className="font-mono">{numValue.toLocaleString()}</span>; } } // JSON if (column.inputType === 'json') { try { const str = typeof value === 'string' ? value : JSON.stringify(value, null, 2); return ( <pre className="bg-muted p-2 rounded-md text-xs overflow-x-auto max-w-full"> <code>{str}</code> </pre> ); } catch { return <span>Invalid JSON</span>; } } // UUID if (column.inputType === 'uuid') { return <span className="font-mono text-sm">{String(value)}</span>; } // URL if (column.inputType === 'url' && typeof value === 'string' && value.startsWith('http')) { return ( <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all" > {value} </a> ); } // Email if (column.inputType === 'email' && typeof value === 'string') { return ( <a href={`mailto:${value}`} className="text-primary hover:underline"> {value} </a> ); } // Default text const str = String(value); if (str.length > 500) { return ( <div className="max-h-32 overflow-y-auto"> <p className="whitespace-pre-wrap">{str}</p> </div> ); } return <span className="whitespace-pre-wrap">{str}</span>;
}
