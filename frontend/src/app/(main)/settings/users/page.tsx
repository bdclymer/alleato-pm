"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, RefreshCw, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type TableColumn } from "@/components/ds";
import { PageShell } from "@/components/layout";
import { createClient } from "@/lib/supabase/client";

const ROLES = [
  { value: "project_manager", label: "Project Manager" },
  { value: "superintendent", label: "Superintendent" },
  { value: "estimator", label: "Estimator" },
  { value: "accountant", label: "Accountant" },
  { value: "foreman", label: "Foreman" },
  { value: "executive", label: "Executive" },
  { value: "viewer", label: "Viewer" },
];

type AccessFilter = "all" | "admin" | "standard";
type SortBy = "name" | "role" | "updated";

interface UserProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean | null;
  role: string | null;
  is_active: boolean;
  updated_at: string;
}

function getDisplayName(profile: UserProfileRow): string {
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const localPart = profile.email.split("@")[0] ?? "";
  return localPart || "Unnamed user";
}

function getInitials(profile: UserProfileRow): string {
  const source = getDisplayName(profile);
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "--";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function UsersSettingsPage() {
  const router = useRouter();
  const [rows, setRows] = React.useState<UserProfileRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [accessFilter, setAccessFilter] = React.useState<AccessFilter>("all");
  const [sortBy, setSortBy] = React.useState<SortBy>("name");

  // Invite modal state
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteName, setInviteName] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("");
  const [isSendingInvite, setIsSendingInvite] = React.useState(false);

  const loadUsers = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from("user_profiles")
        .select("id, email, full_name, is_admin, role, is_active, updated_at")
        .order("full_name", { ascending: true, nullsFirst: false })
        .order("email", { ascending: true });
      if (queryError) throw new Error(queryError.message);
      setRows((data ?? []) as UserProfileRow[]);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDeactivate = React.useCallback(async (profile: UserProfileRow) => {
    try {
      const res = await fetch(`/api/settings/users/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !profile.is_active }),
      });
      if (!res.ok) throw new Error();
      toast.success(profile.is_active ? "User deactivated" : "User activated");
      void loadUsers();
    } catch {
      toast.error("Failed to update user status");
    }
  }, [loadUsers]);

  const handleDelete = React.useCallback(async (profile: UserProfileRow) => {
    if (!confirm(`Delete ${getDisplayName(profile)}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/settings/users/${profile.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("User deleted");
      void loadUsers();
    } catch {
      toast.error("Failed to delete user");
    }
  }, [loadUsers]);

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setIsSendingInvite(true);
    try {
      const res = await fetch("/api/settings/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          full_name: inviteName.trim() || undefined,
          role: inviteRole || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to send invite");
      toast.success(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("");
      void loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const columns = React.useMemo<TableColumn<UserProfileRow>[]>(() => [
    {
      key: "name",
      header: "User",
      primary: true,
      render: (profile) => (
        <button
          type="button"
          className="flex items-center gap-3 text-left hover:underline underline-offset-2"
          onClick={() => router.push(`/settings/users/${profile.id}`)}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {getInitials(profile)}
            </AvatarFallback>
          </Avatar>
          <span>{getDisplayName(profile)}</span>
        </button>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (profile) => profile.email,
    },
    {
      key: "role",
      header: "Role",
      render: (profile) => profile.role || "-",
    },
    {
      key: "access",
      header: "Access",
      render: (profile) => (
        <Badge variant={profile.is_active ? (profile.is_admin ? "admin" : "outline") : "secondary"}>
          {!profile.is_active ? "Inactive" : profile.is_admin ? "Admin" : "Standard"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right" as const,
      render: (profile) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/settings/users/${profile.id}`)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleDeactivate(profile)}>
              {profile.is_active ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => void handleDelete(profile)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [router, handleDeactivate, handleDelete]);

  React.useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const next = rows.filter((p) => {
      if (accessFilter === "admin" && !p.is_admin) return false;
      if (accessFilter === "standard" && p.is_admin) return false;
      if (!q) return true;
      return (
        getDisplayName(p).toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.role ?? "").toLowerCase().includes(q)
      );
    });

    next.sort((a, b) => {
      if (sortBy === "role") return (a.role ?? "").localeCompare(b.role ?? "");
      if (sortBy === "updated") return b.updated_at.localeCompare(a.updated_at);
      return getDisplayName(a).localeCompare(getDisplayName(b));
    });

    return next;
  }, [rows, search, accessFilter, sortBy]);

  return (
    <>
      <PageShell
        variant="dashboard"
        title="Users"
        description="Manage user access and roles"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void loadUsers()} disabled={isLoading}>
              <RefreshCw />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus />
              Invite user
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 sm:max-w-xs"
            />
            <Select value={accessFilter} onValueChange={(v) => setAccessFilter(v as AccessFilter)}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Access" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All access</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort: Name</SelectItem>
                <SelectItem value="role">Sort: Role</SelectItem>
                <SelectItem value="updated">Sort: Updated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading users...</p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-destructive">{error}</p>
          ) : (
            <DataTable
              columns={columns}
              rows={filteredRows}
              emptyMessage="No users found."
            />
          )}

          {!isLoading && !error && (
            <p className="text-xs text-muted-foreground">
              Showing {filteredRows.length} of {rows.length} users
            </p>
          )}
        </div>
      </PageShell>

      {/* Invite user dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
          </DialogHeader>

          <div className="divide-y divide-border">
            <div className="py-4 grid grid-cols-[140px_1fr] items-center gap-4">
              <Label htmlFor="invite-email" className="text-sm text-muted-foreground">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="name@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleSendInvite(); }}
                autoFocus
              />
            </div>
            <div className="py-4 grid grid-cols-[140px_1fr] items-center gap-4">
              <Label htmlFor="invite-name" className="text-sm text-muted-foreground">
                Full name
              </Label>
              <Input
                id="invite-name"
                placeholder="Optional"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>
            <div className="py-4 grid grid-cols-[140px_1fr] items-center gap-4">
              <Label htmlFor="invite-role" className="text-sm text-muted-foreground">
                Role
              </Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            An invitation email will be sent. The link expires in 24 hours.
          </p>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(false)} disabled={isSendingInvite}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSendInvite()}
              disabled={!inviteEmail.trim() || isSendingInvite}
            >
              {isSendingInvite ? "Sending..." : "Send invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
