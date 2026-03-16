"use client";

import * as React from "react";
import { RefreshCw, UserPlus } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";

type AccessFilter = "all" | "admin" | "standard";
type SortBy = "name" | "role" | "updated";

interface UserProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean | null;
  role: string | null;
  updated_at: string;
}

function getDisplayName(profile: UserProfileRow): string {
  if (profile.full_name?.trim()) {
    return profile.full_name.trim();
  }
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

export default function MembersSettingsPage() {
  const [rows, setRows] = React.useState<UserProfileRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [accessFilter, setAccessFilter] = React.useState<AccessFilter>("all");
  const [sortBy, setSortBy] = React.useState<SortBy>("name");

  const loadMembers = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from("user_profiles")
        .select("id, email, full_name, is_admin, role, updated_at")
        .order("full_name", { ascending: true, nullsFirst: false })
        .order("email", { ascending: true });

      if (queryError) {
        throw new Error(queryError.message);
      }

      setRows((data ?? []) as UserProfileRow[]);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to load members";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const filteredRows = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const next = rows.filter((profile) => {
      if (accessFilter === "admin" && !profile.is_admin) {
        return false;
      }
      if (accessFilter === "standard" && profile.is_admin) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        getDisplayName(profile).toLowerCase().includes(normalizedSearch) ||
        profile.email.toLowerCase().includes(normalizedSearch) ||
        (profile.role ?? "").toLowerCase().includes(normalizedSearch)
      );
    });

    next.sort((a, b) => {
      if (sortBy === "role") {
        return (a.role ?? "").localeCompare(b.role ?? "");
      }
      if (sortBy === "updated") {
        return b.updated_at.localeCompare(a.updated_at);
      }
      return getDisplayName(a).localeCompare(getDisplayName(b));
    });

    return next;
  }, [rows, search, accessFilter, sortBy]);

  return (
    <div className="mx-auto w-full max-w-5xl px-8 py-8 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Contacts from the user profiles table.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadMembers()} disabled={isLoading}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button size="sm" className="gap-2">
            <UserPlus className="h-3.5 w-3.5" />
            Invite member
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-9 sm:max-w-xs"
        />

        <Select value={accessFilter} onValueChange={(value) => setAccessFilter(value as AccessFilter)}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Access" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All access</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
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

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Loading contacts...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No contacts found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {getInitials(profile)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-medium text-foreground">{getDisplayName(profile)}</p>
                    </div>
                  </TableCell>
                  <TableCell>{profile.email}</TableCell>
                  <TableCell>{profile.role || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={profile.is_admin ? "admin" : "outline"}>
                      {profile.is_admin ? "Admin" : "Standard"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && !error ? (
        <p className="text-xs text-muted-foreground">
          Showing {filteredRows.length} of {rows.length} contacts from user_profiles.
        </p>
      ) : null}
    </div>
  );
}
