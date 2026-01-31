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
        .from("project_users")
        .update({
          is_client: checked,
          client_company_id: checked ? clientCompanyId : null,
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", projectId)
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
        .from("project_users")
        .update({
          client_company_id: companyId,
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", projectId)
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
          Client Access
        </CardTitle>
        <CardDescription>
          Mark this user as an external client for restricted access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor={`client-toggle-${userId}`} className="text-sm">
            Is Client User
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
            <Label htmlFor={`client-company-${userId}`} className="text-sm flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Client Company
            </Label>
            <Select
              value={clientCompanyId?.toString()}
              onValueChange={handleCompanyChange}
              disabled={isUpdating}
            >
              <SelectTrigger id={`client-company-${userId}`}>
                <SelectValue placeholder="Select client company" />
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
          <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/50 p-3 rounded-md">
            <p className="font-medium mb-1">Client users have:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>Access to Client Dashboard</li>
              <li>Read-only access to project information</li>
              <li>Cannot view private documents/photos</li>
              <li>Limited access to financial details</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}