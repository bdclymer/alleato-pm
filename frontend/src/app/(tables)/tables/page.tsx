import Link from "next/link";
import { Database, Table2, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TABLE_REGISTRY, getRegisteredTables } from "@/lib/table-registry";

export const metadata = {
  title: "Admin Table Explorer",
  description: "Browse and manage database tables",
};

export default function AdminTablesPage() {
  const tables = getRegisteredTables();

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Admin Table Explorer
          </h1>
        </div>
        <p className="text-muted-foreground">
          Browse, search, and manage data across your database tables
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((tableName) => {
          const config = TABLE_REGISTRY[tableName];
          const viewCount = config.viewsEnabled.length;

          return (
            <Link
              key={tableName}
              href={`/admin/tables/${tableName}`}
              className="group"
            >
              <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="rounded-md bg-muted p-2">
                      <Table2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <CardTitle className="text-lg">{config.label}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {config.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {config.permissions.read && (
                      <Badge variant="secondary" className="text-xs">
                        Read
                      </Badge>
                    )}
                    {config.permissions.create && (
                      <Badge variant="secondary" className="text-xs">
                        Create
                      </Badge>
                    )}
                    {config.permissions.update && (
                      <Badge variant="secondary" className="text-xs">
                        Update
                      </Badge>
                    )}
                    {config.permissions.delete && (
                      <Badge variant="secondary" className="text-xs">
                        Delete
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs ml-auto">
                      {viewCount} view{viewCount !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {tables.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Database className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg">No tables configured</h3>
          <p className="text-muted-foreground text-sm">
            Add tables to the TABLE_REGISTRY to enable browsing
          </p>
        </div>
      )}
    </div>
  );
}
