"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Text } from "@/components/ui/text";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, RotateCcw } from "lucide-react";
import {
  useUserPermissions,
  useUpdateUserPermissions,
} from "@/hooks/use-user-permissions";
import { Skeleton } from "@/components/ui/skeleton";

interface UserPermissionsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  personId: string;
  userName: string;
}

// Phase 1B: 15 Core Permission Modules
// Additional modules will be available in Phase 2
const TOOLS = [
  { name: "home", label: "Home" },
  { name: "emails", label: "Emails" },
  { name: "prime_contracts", label: "Prime Contracts" },
  { name: "budget", label: "Budget" },
  { name: "commitments", label: "Commitments" },
  { name: "change_orders", label: "Change Orders" },
  { name: "change_events", label: "Change Events" },
  { name: "direct_costs", label: "Direct Costs" },
  { name: "rfis", label: "RFIs" },
  { name: "submittals", label: "Submittals" },
  { name: "punch_list", label: "Punch List" },
  { name: "schedule", label: "Schedule" },
  { name: "photos", label: "Photos" },
  { name: "documents", label: "Documents" },
  { name: "directory", label: "Directory" },
];

// Permission levels as per Procore specification
const PERMISSION_TYPES = [
  { type: "none", label: "None" },
  { type: "read_only", label: "Read Only" },
  { type: "standard", label: "Standard" },
  { type: "admin", label: "Admin" },
] as const;

export function UserPermissionsManager({
  open,
  onOpenChange,
  projectId,
  personId,
  userName,
}: UserPermissionsManagerProps) {
  const { data: permissionsData, isLoading } = useUserPermissions(
    projectId,
    personId,
  );
  const updatePermissionsMutation = useUpdateUserPermissions(
    projectId,
    personId,
  );

  // Track permission overrides (what differs from template)
  const [overrides, setOverrides] = React.useState<
    Array<{ tool_name: string; permission_type: string; is_granted: boolean }>
  >([]);

  // Initialize overrides from fetched data
  React.useEffect(() => {
    if (permissionsData?.permissions) {
      setOverrides(permissionsData.permissions);
    }
  }, [permissionsData]);

  const hasPermission = (toolName: string, permissionType: string): boolean => {
    // Check if there's an override
    const override = overrides.find(
      (o) => o.tool_name === toolName && o.permission_type === permissionType,
    );
    if (override !== undefined) {
      return override.is_granted;
    }

    // Fall back to effective permissions from template
    const effectivePerms =
      permissionsData?.effective_permissions?.[toolName] || [];
    return effectivePerms.includes(permissionType);
  };

  const isFromTemplate = (
    toolName: string,
    permissionType: string,
  ): boolean => {
    const override = overrides.find(
      (o) => o.tool_name === toolName && o.permission_type === permissionType,
    );
    return override === undefined;
  };

  const togglePermission = (toolName: string, permissionType: string) => {
    const currentHasPermission = hasPermission(toolName, permissionType);
    const templatePerms =
      permissionsData?.template_permissions?.[toolName] || [];
    const templateHasPermission = templatePerms.includes(permissionType);

    // Remove existing override if present
    const filteredOverrides = overrides.filter(
      (o) =>
        !(o.tool_name === toolName && o.permission_type === permissionType),
    );

    // If toggling to same as template, just remove override
    if (!currentHasPermission === templateHasPermission) {
      setOverrides(filteredOverrides);
    } else {
      // Add new override
      setOverrides([
        ...filteredOverrides,
        {
          tool_name: toolName,
          permission_type: permissionType,
          is_granted: !currentHasPermission,
        },
      ]);
    }
  };

  const handleReset = () => {
    setOverrides([]);
  };

  const handleSave = async () => {
    await updatePermissionsMutation.mutateAsync(overrides);
    onOpenChange(false);
  };

  const isSaving = updatePermissionsMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Permissions - {userName}</DialogTitle>
          <DialogDescription>
            Grant or revoke specific permissions. Changes override the base
            permission template.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="py-4">
            {/* Permission Template Info */}
            {permissionsData?.template_permissions && (
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="size-4 text-muted-foreground" />
                  <Text weight="medium">Base Permission Template</Text>
                </div>
                <Text size="sm" tone="muted">
                  Permissions below are based on the user's permission template.
                  You can override individual permissions here.
                </Text>
              </div>
            )}

            {/* Permissions Grid */}
            <div className="border rounded-lg overflow-hidden">
              {/* Header Row */}
              <div className="grid grid-cols-5 bg-muted border-b">
                <div className="p-4 font-semibold">Tool</div>
                {PERMISSION_TYPES.map((perm) => (
                  <div
                    key={perm.type}
                    className="p-4 font-semibold text-center"
                  >
                    {perm.label}
                  </div>
                ))}
              </div>

              {/* Tool Rows */}
              {TOOLS.map((tool, index) => (
                <div
                  key={tool.name}
                  className={`grid grid-cols-5 border-b last:border-b-0 ${
                    index % 2 === 0 ? "bg-background" : "bg-muted/30"
                  }`}
                >
                  <div className="p-4 font-medium">{tool.label}</div>
                  {PERMISSION_TYPES.map((perm) => {
                    const hasIt = hasPermission(tool.name, perm.type);
                    const fromTemplate = isFromTemplate(tool.name, perm.type);

                    return (
                      <div
                        key={perm.type}
                        className="p-4 flex items-center justify-center"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Checkbox
                            checked={hasIt}
                            onCheckedChange={() =>
                              togglePermission(tool.name, perm.type)
                            }
                            className={
                              !fromTemplate
                                ? "border-primary data-[state=checked]:bg-primary"
                                : ""
                            }
                          />
                          {!fromTemplate && (
                            <Text size="xs" tone="muted">
                              Override
                            </Text>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Phase 2 Note */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950 dark:border-blue-800">
              <Text size="sm" tone="muted">
                <Text as="span" weight="medium">
                  Note:
                </Text>{" "}
                Additional permission modules (Transmittals, Meetings, Daily
                Log, Drawings, Specifications, Tasks, Admin, and more) will be
                available in Phase 2.
              </Text>
            </div>

            {/* Legend */}
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <Text size="sm" weight="medium" className="mb-2">
                Legend:
              </Text>
              <div className="space-y-1">
                <Text size="xs" tone="muted">
                  • Normal checkbox = Permission from template
                </Text>
                <Text size="xs" tone="muted">
                  • Highlighted checkbox = Permission override (different from
                  template)
                </Text>
              </div>
            </div>

            {/* Override Summary */}
            {overrides.length > 0 && (
              <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <Text size="sm" weight="medium" className="mb-1">
                  {overrides.length} Permission Override
                  {overrides.length !== 1 ? "s" : ""}
                </Text>
                <Text size="xs" tone="muted">
                  These permissions differ from the base template and will be
                  applied specifically to this user.
                </Text>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isSaving || overrides.length === 0}
            className="sm:w-auto"
          >
            <RotateCcw className="size-4 mr-2" />
            Reset to Template
          </Button>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Permissions"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
