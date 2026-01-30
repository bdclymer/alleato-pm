"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Shield,
  UserX,
  RefreshCw,
  Edit,
} from "lucide-react";
import { useRemoveUser, useResendInvite } from "@/hooks/use-user-mutations";
import { UserFormDialog } from "./UserFormDialog";
import type { PersonWithDetails } from "@/services/directoryService";

interface UserDetailSheetProps {
  user: PersonWithDetails;
  projectId: string;
  trigger: React.ReactNode;
  onUserUpdated?: () => void;
}

export function UserDetailSheet({
  user,
  projectId,
  trigger,
  onUserUpdated,
}: UserDetailSheetProps) {
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const removeUserMutation = useRemoveUser(projectId, user.id);
  const resendInviteMutation = useResendInvite(projectId, user.id);

  const fullName = `${user.first_name} ${user.last_name}`;
  const isActive = user.membership?.status === "active";
  const isPendingInvite =
    user.membership?.invite_status === "invited" ||
    user.membership?.invite_status === "not_invited";

  const handleRemove = async () => {
    if (
      confirm(`Are you sure you want to remove ${fullName} from the project?`)
    ) {
      await removeUserMutation.mutateAsync();
      setIsSheetOpen(false);
      onUserUpdated?.();
    }
  };

  const handleResendInvite = async () => {
    await resendInviteMutation.mutateAsync();
  };

  const handleEdit = () => {
    setIsEditOpen(true);
  };

  return (
    <>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="right"
          className="flex flex-col w-[400px] sm:w-[540px]"
        >
          <SheetHeader className="gap-1">
            <SheetTitle>{fullName}</SheetTitle>
            <SheetDescription>
              {user.job_title || "Team Member"}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto py-4 text-sm">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <Badge variant={isActive ? "active" : "inactive"}>
                {user.membership?.status || "Unknown"}
              </Badge>
              {isPendingInvite && (
                <Badge variant="outline">Pending Invite</Badge>
              )}
            </div>

            <Separator />

            {/* Contact Information */}
            <div>
              <h3 className="font-semibold mb-3">Contact Information</h3>
              <div className="space-y-3">
                {user.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-muted-foreground" />
                    <a
                      href={`mailto:${user.email}`}
                      className="text-primary hover:underline"
                    >
                      <Text as="span" size="sm">
                        {user.email}
                      </Text>
                    </a>
                  </div>
                )}
                {user.phone_mobile && (
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-muted-foreground" />
                    <a
                      href={`tel:${user.phone_mobile}`}
                      className="text-primary hover:underline"
                    >
                      <Text as="span" size="sm">
                        {user.phone_mobile} (Mobile)
                      </Text>
                    </a>
                  </div>
                )}
                {user.phone_business && (
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-muted-foreground" />
                    <a
                      href={`tel:${user.phone_business}`}
                      className="text-primary hover:underline"
                    >
                      <Text as="span" size="sm">
                        {user.phone_business} (Business)
                      </Text>
                    </a>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Company & Role Information */}
            <div>
              <h3 className="font-semibold mb-3">Organization</h3>
              <div className="space-y-3">
                {user.company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground" />
                    <Text as="span" size="sm">
                      {user.company.name}
                    </Text>
                  </div>
                )}
                {user.job_title && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="size-4 text-muted-foreground" />
                    <Text as="span" size="sm">
                      {user.job_title}
                    </Text>
                  </div>
                )}
                {(user.membership as { department?: string })?.department && (
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground" />
                    <Text as="span" size="sm">
                      {(user.membership as { department?: string }).department}
                    </Text>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Permissions */}
            <div>
              <h3 className="font-semibold mb-3">Permissions</h3>
              <div className="space-y-3">
                {user.permission_template && (
                  <div className="flex items-center gap-2">
                    <Shield className="size-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <Text as="span" size="sm" weight="medium">
                        {user.permission_template.name}
                      </Text>
                      {user.permission_template.description && (
                        <Text as="span" size="xs" tone="muted">
                          {user.permission_template.description}
                        </Text>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Activity */}
            <div>
              <h3 className="font-semibold mb-3">Activity</h3>
              <div className="space-y-3">
                {user.created_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-muted-foreground" />
                    <Text as="span" size="sm">
                      Added {new Date(user.created_at).toLocaleDateString()}
                    </Text>
                  </div>
                )}
                {user.membership?.last_invited_at && (
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-muted-foreground" />
                    <Text as="span" size="sm">
                      Last invited{" "}
                      {new Date(
                        user.membership.last_invited_at,
                      ).toLocaleDateString()}
                    </Text>
                  </div>
                )}
              </div>
            </div>
          </div>

          <SheetFooter className="flex flex-col gap-2 sm:flex-col">
            <Button variant="outline" onClick={handleEdit} className="w-full">
              <Edit className="size-4 mr-2" />
              Edit User
            </Button>

            {isPendingInvite && (
              <Button
                variant="outline"
                onClick={handleResendInvite}
                disabled={resendInviteMutation.isPending}
                className="w-full"
              >
                <RefreshCw className="size-4 mr-2" />
                {resendInviteMutation.isPending
                  ? "Sending..."
                  : "Resend Invite"}
              </Button>
            )}

            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removeUserMutation.isPending}
              className="w-full"
            >
              <UserX className="size-4 mr-2" />
              {removeUserMutation.isPending
                ? "Removing..."
                : "Remove from Project"}
            </Button>

            <SheetClose asChild>
              <Button variant="ghost" className="w-full">
                Close
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit User Dialog */}
      <UserFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        projectId={projectId}
        user={{
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone_mobile: user.phone_mobile,
          phone_business: user.phone_business,
          job_title: user.job_title,
          company_id: user.company_id,
          membership: {
            permission_template_id: user.membership?.permission_template_id,
            department: (user.membership as { department?: string })
              ?.department,
          },
        }}
        onSuccess={() => {
          setIsEditOpen(false);
          onUserUpdated?.();
        }}
      />
    </>
  );
}
