import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AutoForm } from "@/components/admin/table-explorer";
import { getFormColumns } from "@/server/db/introspection";
import {
  isTableAllowed,
  getTableConfig,
  hasPermission,
  type TableName,
} from "@/lib/table-registry";

interface NewRowPageProps {
  params: Promise<{ table: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ table: string }>;
}) {
  const { table } = await params;

  if (!isTableAllowed(table)) {
    return { title: "Table Not Found" };
  }

  const config = getTableConfig(table as TableName);
  return {
    title: `New ${config.label} | Admin Table Explorer`,
    description: `Create a new ${config.label.toLowerCase()} record`,
  };
}

export default async function NewRowPage({ params }: NewRowPageProps) {
  const { table } = await params;

  // Validate table
  if (!isTableAllowed(table)) {
    notFound();
  }

  const tableName = table as TableName;
  const config = getTableConfig(tableName);

  // Check create permission
  if (!hasPermission(tableName, "create")) {
    redirect(`/admin/tables/${table}`);
  }

  // Get form columns
  const columns = await getFormColumns(tableName, "create");

  return (
    <div className="container max-w-2xl py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/admin/tables/${table}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {config.label}
            </Link>
          </Button>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Create New {config.label.replace(/s$/, "")}
        </h1>
        <p className="text-muted-foreground">
          Fill in the details below to create a new record
        </p>
      </div>

      {/* Form */}
      <AutoForm table={tableName} columns={columns} mode="create" />
    </div>
  );
}
