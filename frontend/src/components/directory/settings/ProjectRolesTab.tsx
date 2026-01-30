"use client";

import * as React from "react";
import { X, ChevronDown, Loader2 } from "lucide-react";
import { useProjectRoles, ProjectRole } from "@/hooks/use-project-roles";
import { useProjectUsers } from "@/hooks/use-project-users";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProjectRolesTabProps {
  projectId: string;
}

interface PersonOption {
  id: string;
  name: string;
  company: string | null;
}

export function ProjectRolesTab({ projectId }: ProjectRolesTabProps) {
  const { roles, isLoading, error, updateRoleMembers } =
    useProjectRoles(projectId);
  const { users } = useProjectUsers(projectId);

  // Create person options from users
  const personOptions: PersonOption[] = React.useMemo(() => {
    return (users || []).map((user) => ({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      company: user.company?.name || null,
    }));
  }, [users]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading roles...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading roles: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-lg border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Project Roles</h2>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Role</TableHead>
            <TableHead className="w-[120px]">Type</TableHead>
            <TableHead>Members</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <RoleRow
              key={role.id}
              role={role}
              personOptions={personOptions}
              onUpdateMembers={(memberIds) =>
                updateRoleMembers(role.id, memberIds)
              }
            />
          ))}
          {roles.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                No roles configured for this project
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

interface RoleRowProps {
  role: ProjectRole;
  personOptions: PersonOption[];
  onUpdateMembers: (memberIds: string[]) => Promise<void>;
}

function RoleRow({ role, personOptions, onUpdateMembers }: RoleRowProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [isUpdating, setIsUpdating] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Get current member IDs
  const selectedIds = React.useMemo(
    () => role.members.map((m) => m.person_id),
    [role.members],
  );

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return personOptions;
    const search = searchValue.toLowerCase();
    return personOptions.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.company?.toLowerCase().includes(search),
    );
  }, [personOptions, searchValue]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchValue("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = async (personId: string) => {
    const newIds = selectedIds.includes(personId)
      ? selectedIds.filter((id) => id !== personId)
      : [...selectedIds, personId];

    setIsUpdating(true);
    try {
      await onUpdateMembers(newIds);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async (personId: string) => {
    const newIds = selectedIds.filter((id) => id !== personId);
    setIsUpdating(true);
    try {
      await onUpdateMembers(newIds);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{role.role_name}</TableCell>
      <TableCell className="text-muted-foreground">{role.role_type}</TableCell>
      <TableCell>
        <div className="relative" ref={dropdownRef}>
          {/* Selected members + dropdown trigger */}
          <div
            className={cn(
              "min-h-[38px] border rounded-md px-2 py-1 flex flex-wrap items-center gap-1 cursor-pointer",
              isOpen
                ? "border-orange-500 ring-1 ring-orange-500"
                : "border-border",
              isUpdating && "opacity-50",
            )}
            onClick={() => !isUpdating && setIsOpen(true)}
          >
            {role.members.length === 0 ? (
              <span className="text-muted-foreground text-sm py-1">
                Start typing to search people...
              </span>
            ) : (
              role.members.map((member) => (
                <Badge
                  key={member.person_id}
                  variant="secondary"
                  className="bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center gap-1 pr-1"
                >
                  <span className="max-w-[150px] truncate">
                    {member.person?.full_name || "Unknown"}
                    {member.person?.company_name && (
                      <span className="text-blue-600">
                        {" "}
                        ({member.person.company_name.substring(0, 10)}
                        {member.person.company_name.length > 10 ? "..." : ""})
                      </span>
                    )}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(member.person_id);
                    }}
                    className="hover:bg-blue-300 rounded p-0.5"
                    disabled={isUpdating}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))
            )}
            <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
          </div>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
              <div className="p-2 border-b border-border">
                <input
                  type="text"
                  placeholder="Search people..."
                  className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:border-orange-500"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="py-1">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No people found
                  </div>
                ) : (
                  filteredOptions.map((person) => {
                    const isSelected = selectedIds.includes(person.id);
                    return (
                      <button
                        key={person.id}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between",
                          isSelected && "bg-orange-50",
                        )}
                        onClick={() => handleSelect(person.id)}
                      >
                        <span>
                          {person.name}
                          {person.company && (
                            <span className="text-muted-foreground">
                              {" "}
                              ({person.company})
                            </span>
                          )}
                        </span>
                        {isSelected && (
                          <span className="text-orange-600">✓</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
