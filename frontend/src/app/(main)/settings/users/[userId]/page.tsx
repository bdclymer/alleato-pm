"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageShell } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean | null;
  role: string | null;
  is_active: boolean;
  permissions?: Record<string, boolean> | null;
}

const ROLES = [
  { value: "project_manager", label: "Project Manager" },
  { value: "superintendent", label: "Superintendent" },
  { value: "estimator", label: "Estimator" },
  { value: "accountant", label: "Accountant" },
  { value: "foreman", label: "Foreman" },
  { value: "executive", label: "Executive" },
  { value: "viewer", label: "Viewer" },
];

const ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  executive:       { manage_users: true,  manage_billing: true,  manage_projects: true,  view_financials: true,  edit_budgets: true,  approve_change_orders: true,  view_reports: true  },
  project_manager: { manage_users: false, manage_billing: false, manage_projects: true,  view_financials: true,  edit_budgets: true,  approve_change_orders: true,  view_reports: true  },
  superintendent:  { manage_users: false, manage_billing: false, manage_projects: false, view_financials: false, edit_budgets: false, approve_change_orders: false, view_reports: true  },
  estimator:       { manage_users: false, manage_billing: false, manage_projects: false, view_financials: true,  edit_budgets: true,  approve_change_orders: false, view_reports: true  },
  accountant:      { manage_users: false, manage_billing: true,  manage_projects: false, view_financials: true,  edit_budgets: true,  approve_change_orders: false, view_reports: true  },
  foreman:         { manage_users: false, manage_billing: false, manage_projects: false, view_financials: false, edit_budgets: false, approve_change_orders: false, view_reports: false },
  viewer:          { manage_users: false, manage_billing: false, manage_projects: false, view_financials: false, edit_budgets: false, approve_change_orders: false, view_reports: true  },
};

const PERMISSION_LABELS: Record<string, string> = {
  manage_users:          "Manage Users",
  manage_billing:        "Manage Billing",
  manage_projects:       "Manage Projects",
  view_financials:       "View Financials",
  edit_budgets:          "Edit Budgets",
  approve_change_orders: "Approve Change Orders",
  view_reports:          "View Reports",
};

const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS);

function FieldRow({
  label,
  htmlFor,
  children,
  description,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-[200px_1fr] sm:items-center sm:gap-6">
      <div className="sm:pt-0">
        <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const userId = params.userId;

  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const [fullName, setFullName] = React.useState("");
  const [role, setRole] = React.useState("");
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [isActive, setIsActive] = React.useState(true);
  const [permissions, setPermissions] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/settings/users/${userId}`);
        const json = (await res.json()) as { data?: UserProfile; error?: string };
        if (!res.ok || !json.data) throw new Error(json.error ?? "Not found");
        setUser(json.data);
        setFullName(json.data.full_name ?? "");
        setRole(json.data.role ?? "");
        setIsAdmin(json.data.is_admin ?? false);
        setIsActive(json.data.is_active);
        const defaults = json.data.role ? ROLE_PERMISSIONS[json.data.role] ?? {} : {};
        setPermissions({ ...defaults, ...(json.data.permissions ?? {}) });
      } catch {
        toast.error("Failed to load user");
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [userId]);

  const handleRoleChange = (next: string) => {
    setRole(next);
    setPermissions({ ...(ROLE_PERMISSIONS[next] ?? {}) });
  };

  const togglePermission = (key: string, checked: boolean) => {
    setPermissions((prev) => ({ ...prev, [key]: checked }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/settings/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          role: role || null,
          is_admin: isAdmin,
          is_active: isActive,
          permissions,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("User updated");
    } catch {
      toast.error("Failed to save user");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/settings/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (!res.ok) throw new Error();
      setIsActive((prev) => !prev);
      toast.success(isActive ? "User deactivated" : "User activated");
    } catch {
      toast.error("Failed to update user status");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/settings/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("User deleted");
      router.push("/settings/users");
    } catch {
      toast.error("Failed to delete user");
    }
  };

  if (isLoading) {
    return (
      <PageShell variant="form" title="User" onBack={() => router.push("/settings/users")}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-52" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell variant="form" title="User not found" onBack={() => router.push("/settings/users")}>
        <p className="text-sm text-destructive">User could not be loaded.</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      variant="form"
      title={fullName || user.email}
      description={user.email}
      onBack={() => router.push("/settings/users")}
      backLabel="Users"
      statusBadge={
        <Badge variant={isActive ? (isAdmin ? "admin" : "outline") : "secondary"}>
          {!isActive ? "Inactive" : isAdmin ? "Admin" : "Standard"}
        </Badge>
      }
      actions={
        <Button size="sm" onClick={() => void handleSave()} disabled={isSaving}>
          <Save />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      }
    >
      <div className="space-y-10">
        {/* Profile */}
        <section>
          <div className="mb-2">
            <h2 className="text-sm font-semibold text-foreground">Profile</h2>
            <p className="text-xs text-muted-foreground">Basic account details.</p>
          </div>
          <div className="divide-y divide-border">
            <FieldRow label="Full name" htmlFor="full_name">
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                className="max-w-md"
              />
            </FieldRow>
            <FieldRow label="Email" htmlFor="email">
              <Input id="email" value={user.email} disabled className="max-w-md opacity-60" />
            </FieldRow>
            <FieldRow label="Role" htmlFor="role">
              <Select value={role} onValueChange={handleRoleChange}>
                <SelectTrigger id="role" className="max-w-md">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow
              label="Admin access"
              description="Full access to all settings and data"
            >
              <Switch checked={isAdmin} onCheckedChange={setIsAdmin} />
            </FieldRow>
            <FieldRow label="Status" description="Deactivated users cannot sign in">
              <div className="flex items-center gap-3">
                <Switch checked={isActive} onCheckedChange={() => void handleDeactivate()} />
                <span className="text-sm text-muted-foreground">
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </FieldRow>
          </div>
        </section>

        {/* Permissions */}
        <section>
          <div className="mb-2">
            <h2 className="text-sm font-semibold text-foreground">Permissions</h2>
            <p className="text-xs text-muted-foreground">
              Selecting a role applies its default permissions. Override individual permissions below.
            </p>
          </div>
          <div className="divide-y divide-border">
            {PERMISSION_KEYS.map((perm) => {
              const roleDefault = role ? ROLE_PERMISSIONS[role]?.[perm] ?? false : false;
              const current = permissions[perm] ?? false;
              const overridden = role ? current !== roleDefault : false;
              return (
                <FieldRow
                  key={perm}
                  label={PERMISSION_LABELS[perm]}
                  description={
                    overridden
                      ? `Overridden (role default: ${roleDefault ? "granted" : "denied"})`
                      : undefined
                  }
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`perm-${perm}`}
                      checked={current}
                      onCheckedChange={(checked) => togglePermission(perm, checked === true)}
                      disabled={!role}
                    />
                    <Label htmlFor={`perm-${perm}`} className="text-sm text-muted-foreground">
                      {current ? "Granted" : "Denied"}
                    </Label>
                  </div>
                </FieldRow>
              );
            })}
          </div>
        </section>

        {/* Account Info */}
        <section>
          <div className="mb-2">
            <h2 className="text-sm font-semibold text-foreground">Account Info</h2>
          </div>
          <dl className="divide-y divide-border">
            <div className="grid grid-cols-[200px_1fr] items-center gap-6 py-3">
              <dt className="text-sm text-muted-foreground">User ID</dt>
              <dd className="font-mono text-xs text-muted-foreground break-all">{user.id}</dd>
            </div>
            <div className="grid grid-cols-[200px_1fr] items-center gap-6 py-3">
              <dt className="text-sm text-muted-foreground">Access level</dt>
              <dd className="text-sm font-medium text-foreground">
                {isAdmin ? "Admin" : "Standard"}
              </dd>
            </div>
          </dl>
        </section>

        {/* Danger zone */}
        <section>
          <div className="mb-2">
            <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
          </div>
          <div className="py-2">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 px-2 text-sm font-normal text-destructive hover:bg-destructive/5 hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete user
            </Button>
          </div>
        </section>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{fullName || user.email}</strong>? This will
              deactivate their account and revoke all access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDelete()}
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
