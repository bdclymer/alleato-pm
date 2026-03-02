"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type ProviderStatus = "enabled" | "disabled";

type Provider = {
  id: string;
  name: string;
  description: string;
  status: ProviderStatus;
  region: string;
  audience: string;
  lastUpdated: string;
};

type Policy = {
  id: string;
  name: string;
  description: string;
  enforced: boolean;
};

type AuditEvent = {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
};

const PROVIDERS: Provider[] = [
  {
    id: "magic",
    name: "Magic Link",
    description: "OTP emails with expiring session links",
    status: "enabled",
    region: "us-east-1",
    audience: "internal-projects",
    lastUpdated: "8 minutes ago",
  },
  {
    id: "google",
    name: "Google OAuth",
    description: "Domain-restricted workforce SSO",
    status: "enabled",
    region: "global",
    audience: "@alleato.com",
    lastUpdated: "22 minutes ago",
  },
  {
    id: "azure-ad",
    name: "Azure AD",
    description: "Enterprise subcontractor portal",
    status: "disabled",
    region: "eu-west-1",
    audience: "trusted partners",
    lastUpdated: "1 day ago",
  },
];

const POLICIES: Policy[] = [
  {
    id: "mfa",
    name: "Mandatory MFA",
    description: "Require WebAuthn or OTP after 12 hours idle time",
    enforced: true,
  },
  {
    id: "session",
    name: "Session Rotation",
    description: "Rotate refresh tokens every 7 days",
    enforced: true,
  },
  {
    id: "ip-allow",
    name: "Perimeter Allow List",
    description: "Restrict admin logins to office network ranges",
    enforced: false,
  },
];

const AUDIT_EVENTS: AuditEvent[] = [
  {
    id: "ae-1",
    actor: "nina@alleato.com",
    action: "Rotated client secret",
    target: "Google OAuth",
    timestamp: "13:20 UTC",
  },
  {
    id: "ae-2",
    actor: "marvin@alleato.com",
    action: "Disabled social login",
    target: "Azure AD",
    timestamp: "11:04 UTC",
  },
  {
    id: "ae-3",
    actor: "automation",
    action: "Applied MFA policy",
    target: "All providers",
    timestamp: "Yesterday",
  },
];

export function SupabaseAuthManager() {
  const [providers, setProviders] = useState(PROVIDERS);
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);

  const handleToggle = (id: string) => {
    setProviders((prev) =>
      prev.map((provider) =>
        provider.id === id
          ? {
              ...provider,
              status: provider.status === "enabled" ? "disabled" : "enabled",
              lastUpdated: "Just now",
            }
          : provider,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Authentication providers</CardTitle>
            <CardDescription>
              Toggle and configure each provider without leaving the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="flex items-start justify-between rounded-xl border p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{provider.name}</p>
                    <Badge
                      variant={
                        provider.status === "enabled" ? "default" : "secondary"
                      }
                    >
                      {provider.status === "enabled" ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {provider.description}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Target audience: {provider.audience} • Updated{" "}
                    {provider.lastUpdated}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-4">
                  <Switch
                    checked={provider.status === "enabled"}
                    onCheckedChange={() => handleToggle(provider.id)}
                    aria-label={`Toggle ${provider.name}`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setActiveProvider(provider)}
                  >
                    Configure
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security policies & audit</CardTitle>
            <CardDescription>
              Enforce consistent controls and keep a pulse on administrative
              changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {POLICIES.map((policy) => (
              <div key={policy.id} className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{policy.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {policy.description}
                  </p>
                </div>
                <Switch
                  checked={policy.enforced}
                  aria-label={`Toggle policy ${policy.name}`}
                  disabled
                />
              </div>
            ))}

            <div className="rounded-xl border">
              <div className="border-b px-4 py-4">
                <p className="font-medium">Recent audit events</p>
                <p className="text-muted-foreground text-sm">
                  The last 24 hours of configuration activity.
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {AUDIT_EVENTS.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">
                        {event.actor}
                      </TableCell>
                      <TableCell>{event.action}</TableCell>
                      <TableCell>{event.target}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {event.timestamp}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!activeProvider}
        onOpenChange={(open) => !open && setActiveProvider(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Configure {activeProvider?.name ?? "provider"}
            </DialogTitle>
            <DialogDescription>
              Connection details are stored securely in Supabase config vaults.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="client-id">Client ID</Label>
              <Input
                id="client-id"
                placeholder="paste client id"
                defaultValue={activeProvider?.id.toUpperCase()}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="secret">Client secret</Label>
              <Input
                id="secret"
                type="password"
                placeholder="••••••"
                defaultValue="••••••"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="redirects">Redirect URLs</Label>
              <Textarea
                id="redirects"
                rows={3}
                defaultValue={`https://app.alleato.com/auth/callback/${activeProvider?.id ?? "provider"}`}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-4">
            <Button variant="outline" onClick={() => setActiveProvider(null)}>
              Cancel
            </Button>
            <Button>Save provider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SupabaseAuthManager;
