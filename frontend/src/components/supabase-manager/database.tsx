"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Column = {
  name: string;
  type: string;
  notes: string;
};

type TableInfo = {
  id: string;
  name: string;
  description: string;
  rows: string;
  health: "healthy" | "warning";
  region: string;
  replicationLag: string;
  lastQuery: string;
  columns: Column[];
};

type Replica = {
  id: string;
  target: string;
  lag: string;
  status: "online" | "replicating";
};

type MaintenanceWindow = {
  id: string;
  action: string;
  scheduled: string;
  owner: string;
};

const TABLES: TableInfo[] = [
  {
    id: "projects",
    name: "projects",
    description: "Active construction projects and metadata",
    rows: "428",
    health: "healthy",
    region: "us-east-1",
    replicationLag: "4s",
    lastQuery: "11:48 UTC",
    columns: [
      { name: "id", type: "uuid", notes: "Primary key" },
      { name: "client_name", type: "text", notes: "Indexed" },
      { name: "status", type: "text", notes: "Enum" },
      { name: "estimated_revenue", type: "numeric", notes: "" },
    ],
  },
  {
    id: "rfis",
    name: "project_rfis",
    description: "Requests for information with Supabase row level security",
    rows: "1,204",
    health: "healthy",
    region: "us-east-1",
    replicationLag: "7s",
    lastQuery: "11:29 UTC",
    columns: [
      { name: "id", type: "uuid", notes: "Primary key" },
      { name: "project_id", type: "uuid", notes: "FK -> projects" },
      { name: "subject", type: "text", notes: "" },
      { name: "status", type: "text", notes: "Index rfis_status_idx" },
    ],
  },
  {
    id: "meetings",
    name: "meetings",
    description: "Weekly coordination meetings",
    rows: "312",
    health: "warning",
    region: "us-east-1",
    replicationLag: "18s",
    lastQuery: "10:44 UTC",
    columns: [
      { name: "id", type: "uuid", notes: "Primary key" },
      { name: "project_id", type: "uuid", notes: "" },
      { name: "scheduled_for", type: "timestamptz", notes: "" },
      { name: "facilitator", type: "text", notes: "" },
    ],
  },
];

const REPLICAS: Replica[] = [
  { id: "rep-1", target: "eu-west-1", lag: "6s", status: "online" },
  { id: "rep-2", target: "us-west-2", lag: "10s", status: "replicating" },
];

const MAINTENANCE: MaintenanceWindow[] = [
  {
    id: "maint-1",
    action: "Storage reindex",
    scheduled: "Tonight, 02:00 UTC",
    owner: "automation",
  },
  {
    id: "maint-2",
    action: "Add materialized view",
    scheduled: "Friday, 18:00 UTC",
    owner: "marcus@alleato.com",
  },
];

const QUERY_ACTIVITY = [
  {
    id: "qa-1",
    query: "refresh materialized view project_insights_mv",
    duration: "2.8s",
    actor: "system",
    ranAt: "Every 15 minutes",
  },
  {
    id: "qa-2",
    query: "select * from project_rfis where status = 'open' limit 20",
    duration: "180ms",
    actor: "frontend",
    ranAt: "11:18 UTC",
  },
];

export function SupabaseDatabaseManager() {
  const [drawerTarget, setDrawerTarget] = useState<TableInfo | null>(null);

  const tableHealthSummary = useMemo(() => {
    const healthy = TABLES.filter((table) => table.health === "healthy").length;
    return `${healthy}/${TABLES.length} tables healthy`;
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tables & storage</CardTitle>
            <CardDescription>{tableHealthSummary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {TABLES.map((table) => (
              <div
                key={table.id}
                className="flex flex-col gap-2 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{table.name}</p>
                    <Badge
                      variant={
                        table.health === "healthy" ? "default" : "destructive"
                      }
                    >
                      {table.health === "healthy" ? "Healthy" : "Investigate"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {table.description}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {table.rows} rows • replication lag {table.replicationLag} •
                    last query {table.lastQuery}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDrawerTarget(table)}
                >
                  View structure
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Replication & maintenance</CardTitle>
            <CardDescription>
              Monitor cross-region replicas and upcoming jobs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border">
              <div className="border-b px-4 py-4">
                <p className="font-medium">Active replicas</p>
                <p className="text-muted-foreground text-sm">
                  Low-latency access for regional project teams.
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Region</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Lag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {REPLICAS.map((replica) => (
                    <TableRow key={replica.id}>
                      <TableCell className="font-medium">
                        {replica.target}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            replica.status === "online"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {replica.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {replica.lag}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-xl border">
              <div className="border-b px-4 py-4">
                <p className="font-medium">Maintenance</p>
                <p className="text-muted-foreground text-sm">
                  Supabase guardrails keep the cluster tuned.
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Schedule</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MAINTENANCE.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">
                        {task.action}
                      </TableCell>
                      <TableCell>{task.owner}</TableCell>
                      <TableCell className="text-right">
                        {task.scheduled}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Query activity</CardTitle>
          <CardDescription>
            High-impact statements hitting the cluster in the last hour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Statement</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Schedule</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {QUERY_ACTIVITY.map((query) => (
                <TableRow key={query.id}>
                  <TableCell className="font-mono text-sm">
                    {query.query}
                  </TableCell>
                  <TableCell>{query.actor}</TableCell>
                  <TableCell className="text-right">{query.duration}</TableCell>
                  <TableCell className="text-right">{query.ranAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Drawer
        open={!!drawerTarget}
        onOpenChange={(open) => !open && setDrawerTarget(null)}
      >
        <DrawerContent className="max-h-[90vh] overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>{drawerTarget?.name ?? "Table"}</DrawerTitle>
            <DrawerDescription>
              {drawerTarget?.description ??
                "Inspect structure, constraints, and indexes."}
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 px-6 pb-6">
            <div className="grid gap-2">
              <Label htmlFor="retention">Data retention (days)</Label>
              <Input
                id="retention"
                type="number"
                min={30}
                max={365}
                defaultValue={90}
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Column</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drawerTarget?.columns.map((column) => (
                  <TableRow key={column.name}>
                    <TableCell className="font-mono text-sm">
                      {column.name}
                    </TableCell>
                    <TableCell>{column.type}</TableCell>
                    <TableCell>{column.notes || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DrawerFooter className="gap-4">
            <Button variant="outline" onClick={() => setDrawerTarget(null)}>
              Close
            </Button>
            <Button>Save retention policy</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export default SupabaseDatabaseManager;
