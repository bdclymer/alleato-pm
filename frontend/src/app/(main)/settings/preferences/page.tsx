"use client";

import * as React from "react";
import { Bell, Globe, Calendar, DollarSign } from "lucide-react";
import { PageShell } from "@/components/layout";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ToggleRowProps {
  title: string;
  description: string;
  defaultChecked?: boolean;
  id: string;
}

function ToggleRow({ title, description, defaultChecked = true, id }: ToggleRowProps) {
  const [checked, setChecked] = React.useState(defaultChecked);
  return (
    <div className="flex items-center justify-between gap-6 py-3.5">
      <div>
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
          {title}
        </Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={setChecked} />
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
      <div>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
      </div>
      <div className="rounded-lg border border-border px-5 divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

export default function PreferencesSettingsPage() {
  return (
    <PageShell variant="content" title="Preferences">
      <div className="space-y-8">
        {/* Notifications */}
        <SectionCard icon={Bell} title="Notifications">
          <ToggleRow
            id="daily-digest"
            title="Daily digest email"
            description="Receive a morning summary of project activity, budget alerts, and tasks."
            defaultChecked={true}
          />
          <ToggleRow
            id="weekly-summary"
            title="Weekly executive summary"
            description="A condensed view of project health, financials, and milestones sent every Monday."
            defaultChecked={true}
          />
          <ToggleRow
            id="budget-alerts"
            title="Budget threshold alerts"
            description="Notify me when a budget line item exceeds its committed amount."
            defaultChecked={true}
          />
          <ToggleRow
            id="change-order-alerts"
            title="Change order approvals"
            description="Get notified when a change order is submitted for your review."
            defaultChecked={true}
          />
          <ToggleRow
            id="rfi-alerts"
            title="RFI responses"
            description="Email notifications when an RFI you submitted receives a response."
            defaultChecked={false}
          />
          <ToggleRow
            id="mention-alerts"
            title="Mentions and comments"
            description="Notify me when someone mentions me or comments on my work."
            defaultChecked={true}
          />
        </SectionCard>

        <Separator />

        {/* Display */}
        <SectionCard icon={Globe} title="Display">
          <div className="flex items-center justify-between gap-6 py-3.5">
            <div>
              <p className="text-sm font-medium">Timezone</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Used for scheduling and date display throughout the platform.
              </p>
            </div>
            <Select defaultValue="america-chicago">
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="america-new_york">Eastern (ET)</SelectItem>
                <SelectItem value="america-chicago">Central (CT)</SelectItem>
                <SelectItem value="america-denver">Mountain (MT)</SelectItem>
                <SelectItem value="america-los_angeles">Pacific (PT)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-6 py-3.5">
            <div>
              <Label htmlFor="date-format" className="text-sm font-medium">
                Date format
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                How dates appear across the platform.
              </p>
            </div>
            <Select defaultValue="mdy">
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SectionCard>

        <Separator />

        {/* Financial defaults */}
        <SectionCard icon={DollarSign} title="Financial Defaults">
          <div className="flex items-center justify-between gap-6 py-3.5">
            <div>
              <p className="text-sm font-medium">Currency</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Default currency for all financial displays and exports.
              </p>
            </div>
            <Select defaultValue="usd">
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usd">USD — US Dollar</SelectItem>
                <SelectItem value="cad">CAD — Canadian Dollar</SelectItem>
                <SelectItem value="eur">EUR — Euro</SelectItem>
                <SelectItem value="gbp">GBP — British Pound</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-6 py-3.5">
            <div>
              <p className="text-sm font-medium">Number format</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                How large numbers are displayed (e.g. 1,234,567.89).
              </p>
            </div>
            <Select defaultValue="comma">
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comma">1,234,567.89</SelectItem>
                <SelectItem value="period">1.234.567,89</SelectItem>
                <SelectItem value="space">1 234 567.89</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ToggleRow
            id="show-cents"
            title="Show cents in budget views"
            description="Display two decimal places in budget and cost reports."
            defaultChecked={false}
          />
        </SectionCard>

        <div className="flex justify-end pt-2">
          <Button size="sm">Save preferences</Button>
        </div>
      </div>
    </PageShell>
  );
}
