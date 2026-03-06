"use client";

import * as React from "react";
import { Building2, Upload, CreditCard, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export default function AccountSettingsPage() {
  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your company profile and billing information.
        </p>
      </div>

      <div className="space-y-10">
        {/* Company Profile */}
        <SettingsSection
          title="Company Profile"
          description="This information appears on reports, contracts, and documents generated within the platform."
        >
          {/* Logo upload */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Company Logo
            </Label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-md border border-border bg-muted flex items-center justify-center shrink-0">
                <Building2 className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <div className="space-y-1.5">
                <Button variant="outline" size="sm" className="gap-2">
                  <Upload className="h-3.5 w-3.5" />
                  Upload logo
                </Button>
                <p className="text-xs text-muted-foreground">
                  PNG or SVG. Max 2MB. Recommended 256×256px.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="company-name">Company name</Label>
              <Input id="company-name" defaultValue="Alleato Group LLC" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry</Label>
              <Select defaultValue="commercial">
                <SelectTrigger id="industry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commercial">Commercial Construction</SelectItem>
                  <SelectItem value="residential">Residential Construction</SelectItem>
                  <SelectItem value="industrial">Industrial Construction</SelectItem>
                  <SelectItem value="infrastructure">Infrastructure</SelectItem>
                  <SelectItem value="specialty">Specialty Contractor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" defaultValue="https://alleatogroup.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" defaultValue="(615) 555-0100" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Street address</Label>
            <Input id="address" defaultValue="1234 Commerce Dr, Suite 300" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" defaultValue="Nashville" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" defaultValue="TN" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zip">ZIP code</Label>
              <Input id="zip" defaultValue="37201" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="sm">Save changes</Button>
          </div>
        </SettingsSection>

        <Separator />

        {/* Billing */}
        <SettingsSection
          title="Plan & Billing"
          description="Your current subscription plan, seat usage, and renewal details."
        >
          <div className="rounded-lg border border-border bg-card p-5 space-y-5">
            {/* Plan header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Professional</span>
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600">
                    Active
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  $299 / month · billed monthly
                </p>
              </div>
              <Button variant="outline" size="sm">
                Manage plan
              </Button>
            </div>

            <Separator />

            {/* Seat usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users2 className="h-3.5 w-3.5" />
                  Seats
                </span>
                <span className="font-medium tabular-nums">12 / 25 used</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: "48%" }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                13 seats remaining. Upgrade to add more.
              </p>
            </div>

            <Separator />

            {/* Renewal */}
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" />
                Next renewal
              </span>
              <span className="font-medium">April 1, 2026</span>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
