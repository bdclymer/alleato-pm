"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IntegrationStatus = "connected" | "error" | "disconnected";

interface Integration {
  id: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  lastSynced?: string;
  logoInitials: string;
  logoColor: string;
  docsUrl?: string;
}

interface IntegrationGroup {
  title: string;
  description: string;
  items: Integration[];
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const INTEGRATION_GROUPS: IntegrationGroup[] = [
  {
    title: "Financial",
    description: "Connect your accounting and ERP systems for budget and cost sync.",
    items: [
      {
        id: "acumatica",
        name: "Acumatica",
        description: "Sync vendors, cost codes, and invoices with your ERP.",
        status: "connected",
        lastSynced: "2 hours ago",
        logoInitials: "AC",
        logoColor: "bg-blue-600",
      },
      {
        id: "quickbooks",
        name: "QuickBooks Online",
        description: "Two-way sync of invoices, payments, and chart of accounts.",
        status: "disconnected",
        logoInitials: "QB",
        logoColor: "bg-green-600",
      },
      {
        id: "sage",
        name: "Sage 300 CRE",
        description: "Connect job cost data and subcontract commitments.",
        status: "disconnected",
        logoInitials: "SG",
        logoColor: "bg-orange-600",
      },
    ],
  },
  {
    title: "Field Management",
    description: "Pull project data, drawings, and field activity into your workspace.",
    items: [
      {
        id: "procore",
        name: "Procore",
        description: "Sync project data, RFIs, submittals, and field observations.",
        status: "connected",
        lastSynced: "30 minutes ago",
        logoInitials: "PC",
        logoColor: "bg-red-600",
      },
      {
        id: "bluebeam",
        name: "Bluebeam Revu",
        description: "Access markup sessions and drawing revisions.",
        status: "disconnected",
        logoInitials: "BB",
        logoColor: "bg-blue-700",
      },
      {
        id: "procore-drive",
        name: "Procore Drive",
        description: "Sync documents and drawing sets automatically.",
        status: "disconnected",
        logoInitials: "PD",
        logoColor: "bg-red-700",
      },
    ],
  },
  {
    title: "Communication",
    description: "Route alerts, digest reports, and notifications to your team channels.",
    items: [
      {
        id: "slack",
        name: "Slack",
        description: "Send daily digests, budget alerts, and status updates to channels.",
        status: "error",
        lastSynced: "Failed 1 hour ago",
        logoInitials: "SL",
        logoColor: "bg-purple-600",
      },
      {
        id: "teams",
        name: "Microsoft Teams",
        description: "Post notifications and project updates to Teams channels.",
        status: "disconnected",
        logoInitials: "MT",
        logoColor: "bg-blue-500",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Integration row
// ---------------------------------------------------------------------------

function IntegrationStatusBadge({ status, lastSynced }: { status: IntegrationStatus; lastSynced?: string }) {
  if (status === "connected") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>Connected{lastSynced ? ` · synced ${lastSynced}` : ""}</span>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-600">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>{lastSynced || "Connection error"}</span>
      </div>
    );
  }
  return (
    <span className="text-xs text-muted-foreground">Not connected</span>
  );
}

function IntegrationRow({ integration }: { integration: Integration }) {
  const isConnected = integration.status === "connected";
  const hasError = integration.status === "error";

  return (
    <div className="flex items-center gap-4 py-4 px-5">
      {/* Logo */}
      <div
        className={cn(
          "h-10 w-10 shrink-0 rounded-md flex items-center justify-center",
          integration.logoColor
        )}
      >
        <span className="text-xs font-bold text-white">{integration.logoInitials}</span>
      </div>

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{integration.name}</span>
          {integration.docsUrl && (
            <ExternalLink className="h-3 w-3 text-muted-foreground/50" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
          {integration.description}
        </p>
        <div className="mt-1.5">
          <IntegrationStatusBadge
            status={integration.status}
            lastSynced={integration.lastSynced}
          />
        </div>
      </div>

      {/* Action */}
      <div className="shrink-0 flex items-center gap-2">
        {isConnected && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
        {isConnected && (
          <Button variant="outline" size="sm" className="text-xs h-7">
            Configure
          </Button>
        )}
        {hasError && (
          <Button variant="outline" size="sm" className="text-xs h-7 text-red-600 border-red-200 hover:bg-red-50">
            Reconnect
          </Button>
        )}
        {!isConnected && !hasError && (
          <Button size="sm" className="text-xs h-7">
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function IntegrationsSettingsPage() {
  const connectedCount = INTEGRATION_GROUPS.flatMap((g) => g.items).filter(
    (i) => i.status === "connected"
  ).length;

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your financial, field, and communication tools.{" "}
          <span className="text-foreground font-medium">{connectedCount} active</span>{" "}
          of {INTEGRATION_GROUPS.flatMap((g) => g.items).length} available.
        </p>
      </div>

      {/* Groups */}
      <div className="space-y-8">
        {INTEGRATION_GROUPS.map((group, idx) => (
          <div key={group.title}>
            {idx > 0 && <div className="mb-8" />}
            <div className="grid grid-cols-1 gap-0 md:grid-cols-[220px_1fr]">
              {/* Group label */}
              <div className="pb-3 md:pb-0 md:pr-6">
                <h3 className="text-sm font-semibold">{group.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {group.description}
                </p>
              </div>

              {/* Integration cards */}
              <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
                {group.items.map((integration) => (
                  <IntegrationRow key={integration.id} integration={integration} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
