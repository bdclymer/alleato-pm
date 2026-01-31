"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ClientStatusToggleProps {
  projectId: string;
  userId: string;
  userName?: string;
  initialIsClient?: boolean;
  initialCompanyId?: number;
  companies?: Array<{ id: number; name: string }>;
  onUpdate?: (isClient: boolean, companyId?: number) => void;
}

export function ClientStatusToggle({
  projectId,
  userId,
  userName,
  initialIsClient = false,
  initialCompanyId,
  companies = [],
  onUpdate,
}: ClientStatusToggleProps) {
  const [isClient, setIsClient] = useState(initialIsClient);
  const [clientCompanyId, setClientCompanyId] = useState<number | undefined>(initialCompanyId);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleClient = async (checked: boolean) => {
    setIsUpdating(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("project_directory_memberships")
        .update({
          user_type: checked ? 'Client' : 'Team',
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", parseInt(projectId))
        .eq("user_id", userId);

      if (error) throw error;

      setIsClient(checked);
      toast.success(
        checked
          ? `${userName || "User"} marked as client`
          : `${userName || "User"} removed as client`
      );

      onUpdate?.(checked, checked ? clientCompanyId : undefined);
    } catch (error) {
      console.error("Error updating client status:", error);
      toast.error("Failed to update client status");
      // Revert the state
      setIsClient(!checked);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCompanyChange = async (companyIdStr: string) => {
    const companyId = parseInt(companyIdStr);
    setIsUpdating(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("project_directory_memberships")
        .update({
          company_id: companyId,
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", parseInt(projectId))
        .eq("user_id", userId);

      if (error) throw error;

      setClientCompanyId(companyId);
      toast.success("Client company updated");
      onUpdate?.(isClient, companyId);
    } catch (error) {
      console.error("Error updating client company:", error);
      toast.error("Failed to update client company");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4" />
          Client Access Settings
        </CardTitle>
        <CardDescription className="text-sm">
          Configure whether this user has client-level access to the project
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label
            htmlFor={`client-toggle-${userId}`}
            className="text-sm font-medium flex items-center gap-2"
          >
            Mark as Client
          </Label>
          <Switch
            id={`client-toggle-${userId}`}
            checked={isClient}
            onCheckedChange={handleToggleClient}
            disabled={isUpdating}
          />
        </div>

        {isClient && companies.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Client Company
            </Label>
            <Select
              value={clientCompanyId?.toString()}
              onValueChange={handleCompanyChange}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {isClient && (
          <div className="text-xs text-muted-foreground bg-muted rounded-md p-3">
            <p className="font-medium mb-1">Client Access Restrictions:</p>
            <ul className="space-y-1">
              <li>• Limited to client dashboard view</li>
              <li>• No access to financial data</li>
              <li>• Read-only permissions on shared documents</li>
              <li>• Cannot modify project settings</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}