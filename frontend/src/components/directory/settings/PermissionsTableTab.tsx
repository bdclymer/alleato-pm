"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Search, Check, X } from "lucide-react";
import {
  useDirectoryPermissions,
  PermissionLevel,
  DirectoryUser,
} from "@/hooks/use-directory-permissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PermissionsTableTabProps {
  projectId: string;
}

const PERMISSION_LEVELS: { key: PermissionLevel; label: string }[] = [
  { key: "none", label: "None" },
  { key: "read_only", label: "Read Only" },
  { key: "standard", label: "Standard" },
  { key: "admin", label: "Admin" },
];

export function PermissionsTableTab({ projectId }: PermissionsTableTabProps) {
  const { users, isLoading, error, updatePermission, searchUsers } =
    useDirectoryPermissions(projectId);
  const [searchValue, setSearchValue] = React.useState("");
  const [updatingUser, setUpdatingUser] = React.useState<string | null>(null);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, searchUsers]);

  const handlePermissionChange = async (
    personId: string,
    level: PermissionLevel,
  ) => {
    setUpdatingUser(personId);
    try {
      await updatePermission(personId, level);
    } catch (err) {
      console.error("Failed to update permission:", err);
      // Intentionally swallowed: updatePermission handles error notifications
    } finally {
      setUpdatingUser(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading permissions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">
          Error loading permissions: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Main table */}
      <div className="flex-1 bg-background rounded-lg border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            User Permissions for Directory
          </h2>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Name ▲</TableHead>
                <TableHead className="w-[200px]">Company</TableHead>
                {PERMISSION_LEVELS.map((level) => (
                  <TableHead key={level.key} className="text-center w-[100px]">
                    {level.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <PermissionRow
                  key={user.person_id}
                  user={user}
                  projectId={projectId}
                  isUpdating={updatingUser === user.person_id}
                  onPermissionChange={(level) =>
                    handlePermissionChange(user.person_id, level)
                  }
                />
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={2 + PERMISSION_LEVELS.length}
                    className="text-center text-muted-foreground py-8"
                  >
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Search sidebar */}
      <div className="w-64 shrink-0">
        <div className="bg-background rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            SEARCH PERMISSIONS
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface PermissionRowProps {
  user: DirectoryUser;
  projectId: string;
  isUpdating: boolean;
  onPermissionChange: (level: PermissionLevel) => void;
}

function PermissionRow({
  user,
  projectId,
  isUpdating,
  onPermissionChange,
}: PermissionRowProps) {
  return (
    <TableRow className={cn(isUpdating && "opacity-50")}>
      <TableCell>
        <Link
          href={`/${projectId}/directory/users/${user.person_id}`}
          className="text-blue-600 hover:underline"
        >
          {user.full_name}
        </Link>
      </TableCell>
      <TableCell className="text-foreground">
        {user.company_name || "-"}
      </TableCell>
      {PERMISSION_LEVELS.map((level) => (
        <TableCell key={level.key} className="text-center">
          <PermissionIndicator
            isActive={user.permission_level === level.key}
            level={level.key}
            onClick={() => !isUpdating && onPermissionChange(level.key)}
            disabled={isUpdating}
          />
        </TableCell>
      ))}
    </TableRow>
  );
}

interface PermissionIndicatorProps {
  isActive: boolean;
  level: PermissionLevel;
  onClick: () => void;
  disabled: boolean;
}

function PermissionIndicator({
  isActive,
  level,
  onClick,
  disabled,
}: PermissionIndicatorProps) {
  // Show different indicators based on level and active state
  // Active: green check for positive permissions, red X for "none"
  // Inactive: gray X

  if (isActive) {
    if (level === "none") {
      return (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          disabled={disabled}
          className="h-6 w-6"
          title="No access (active)"
        >
          <X className="w-4 h-4 text-red-500" />
        </Button>
      );
    }
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        disabled={disabled}
        className="h-6 w-6"
        title={`${level} (active)`}
      >
        <Check className="w-4 h-4 text-green-500" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      className="h-6 w-6"
      title={`Set to ${level}`}
    >
      <X className="w-4 h-4 text-muted-foreground/30" />
    </Button>
  );
}
