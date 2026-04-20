"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Mail, Edit, UserX } from "lucide-react";
import { EmptyState } from "@/components/ds";
import { formatDistanceToNow } from "date-fns";
import type { AuthUser } from "@/hooks/use-auth-users";

interface ResponsiveAuthUsersTableProps {
  users: AuthUser[];
  onEdit?: (user: AuthUser) => void;
  onDeactivate?: (user: AuthUser) => void;
  onResendInvite?: (user: AuthUser) => void;
}

export function ResponsiveAuthUsersTable({
  users,
  onEdit,
  onDeactivate,
  onResendInvite,
}: ResponsiveAuthUsersTableProps) {
  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.[0]?.toUpperCase() || "";
    const last = lastName?.[0]?.toUpperCase() || "";
    return `${first}${last}` || "U";
  };

  const getStatusBadge = (membershipStatus: string | null, inviteStatus: string | null) => {
    if (membershipStatus === "inactive") {
      return <Badge variant="secondary">Inactive</Badge>;
    }

    if (inviteStatus === "invited" || inviteStatus === "not_invited") {
      return <Badge variant="outline">Pending Invite</Badge>;
    }

    if (inviteStatus === "accepted" || membershipStatus === "active") {
      return <Badge variant="default">Active</Badge>;
    }

    return <Badge variant="outline">Unknown</Badge>;
  };

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return "Never";

    try {
      return formatDistanceToNow(new Date(lastLogin), { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead className="hidden lg:table-cell">Company</TableHead>
            <TableHead className="hidden lg:table-cell">Last Login</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              {/* User info */}
              <TableCell>
                <div className="flex items-center space-x-4">
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.first_name} ${user.last_name}`}
                      alt={`${user.first_name} ${user.last_name}`}
                    />
                    <AvatarFallback>
                      {getInitials(user.first_name, user.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    {user.job_title && (
                      <p className="text-xs text-muted-foreground truncate">
                        {user.job_title}
                      </p>
                    )}
                    {/* Show email on mobile */}
                    <p className="text-xs text-muted-foreground truncate md:hidden">
                      {user.email}
                    </p>
                  </div>
                </div>
              </TableCell>

              {/* Email - hidden on mobile */}
              <TableCell className="hidden md:table-cell">
                <span className="text-sm text-muted-foreground">
                  {user.email}
                </span>
              </TableCell>

              {/* Company - hidden on mobile and tablet */}
              <TableCell className="hidden lg:table-cell">
                <span className="text-sm text-muted-foreground">
                  {user.company_name || "No company"}
                </span>
              </TableCell>

              {/* Last Login - hidden on mobile and tablet */}
              <TableCell className="hidden lg:table-cell">
                <span className="text-sm text-muted-foreground">
                  {formatLastLogin(user.last_login_at)}
                </span>
              </TableCell>

              {/* Status */}
              <TableCell>
                {getStatusBadge(user.membership_status, user.invite_status)}
              </TableCell>

              {/* Actions */}
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(user)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit User
                      </DropdownMenuItem>
                    )}
                    {onResendInvite && (user.invite_status === "invited" || user.invite_status === "not_invited") && (
                      <DropdownMenuItem onClick={() => onResendInvite(user)}>
                        <Mail className="mr-2 h-4 w-4" />
                        Resend Invite
                      </DropdownMenuItem>
                    )}
                    {onDeactivate && user.membership_status !== "inactive" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDeactivate(user)}
                          className="text-destructive"
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Deactivate
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {users.length === 0 && (
        <EmptyState
          title="No authenticated users found"
          description="No authenticated users are associated with this project."
        />
      )}
    </div>
  );
}