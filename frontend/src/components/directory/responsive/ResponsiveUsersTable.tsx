"use client";

import { useState } from "react";
import { type PersonWithDetails } from "@/services/directoryService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Mail, Phone } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ResponsiveUsersTableProps {
  users: PersonWithDetails[];
  onEdit?: (user: PersonWithDetails) => void;
  onDeactivate?: (user: PersonWithDetails) => void;
  onViewDetails?: (user: PersonWithDetails) => void;
}

export function ResponsiveUsersTable({
  users,
  onEdit,
  onDeactivate,
  onViewDetails,
}: ResponsiveUsersTableProps) {
  return (
    <div className="space-y-3">
      {/* Desktop View - Hidden on mobile */}
      <div className="hidden md:block">
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left text-sm font-medium">Name</th>
                <th className="p-3 text-left text-sm font-medium">Email</th>
                <th className="p-3 text-left text-sm font-medium">Company</th>
                <th className="p-3 text-left text-sm font-medium">Status</th>
                <th className="p-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b last:border-0 hover:bg-muted/50"
                >
                  <td className="p-3">
                    <div className="font-medium">
                      {user.first_name} {user.last_name}
                    </div>
                    {user.job_title && (
                      <div className="text-sm text-muted-foreground">
                        {user.job_title}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-sm">{user.email}</td>
                  <td className="p-3 text-sm">{user.company?.name || "-"}</td>
                  <td className="p-3">
                    <Badge
                      variant={
                        user.membership?.status === "active"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {user.membership?.status || "unknown"}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onViewDetails && (
                          <DropdownMenuItem onClick={() => onViewDetails(user)}>
                            View Details
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(user)}>
                            Edit
                          </DropdownMenuItem>
                        )}
                        {onDeactivate &&
                          user.membership?.status === "active" && (
                            <DropdownMenuItem
                              onClick={() => onDeactivate(user)}
                            >
                              Deactivate
                            </DropdownMenuItem>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View - Card layout */}
      <div className="md:hidden space-y-3">
        {users.map((user) => (
          <div key={user.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium">
                  {user.first_name} {user.last_name}
                </h3>
                {user.job_title && (
                  <p className="text-sm text-muted-foreground">
                    {user.job_title}
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onViewDetails && (
                    <DropdownMenuItem onClick={() => onViewDetails(user)}>
                      View Details
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(user)}>
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDeactivate && user.membership?.status === "active" && (
                    <DropdownMenuItem onClick={() => onDeactivate(user)}>
                      Deactivate
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2">
              {user.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{user.email}</span>
                </div>
              )}
              {user.phone_mobile && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{user.phone_mobile}</span>
                </div>
              )}
              {user.company && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Company: </span>
                  <span>{user.company.name}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <Badge
                variant={
                  user.membership?.status === "active" ? "default" : "secondary"
                }
              >
                {user.membership?.status || "unknown"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
