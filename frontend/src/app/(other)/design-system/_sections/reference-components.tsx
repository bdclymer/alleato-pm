"use client";

import {
  KpiBlock,
  KpiRow,
  SectionHeader,
  MeetingListItem,
  NavSidebar,
  AvatarStack,
  PremiumTable,
  StatusDot,
} from "@/design-system/REFERENCE_COMPONENTS";

interface SampleRow {
  id: number;
  name: string;
  status: "Active" | "Pending" | "Inactive";
  amount: string;
}

const sampleRows: SampleRow[] = [
  { id: 1, name: "Westfield Collective", status: "Active", amount: "$142,800" },
  { id: 2, name: "Harbor View Towers", status: "Pending", amount: "$89,200" },
  { id: 3, name: "Pine Street Renovation", status: "Active", amount: "$234,500" },
  { id: 4, name: "Downtown Commons", status: "Inactive", amount: "$0" },
];

export function ReferenceComponentsSection() {
  return (
    <section id="reference" className="scroll-mt-8">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Reference Components
      </h2>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">
        Custom domain components from REFERENCE_COMPONENTS.tsx — KPI blocks,
        meeting lists, navigation sidebar, and table patterns.
      </p>

      {/* KPI Block */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          KPI Block
        </h3>
        <div className="grid grid-cols-3 gap-12">
          <KpiBlock
            label="Total Budget"
            value="$9.3M"
            context="Original contract value"
          />
          <KpiBlock
            label="Revenue"
            value="$24K"
            delta={{ value: "12.4%", positive: true }}
            context="vs $21.3K last month"
          />
          <KpiBlock
            label="Margin"
            value="18.2%"
            delta={{ value: "3.1%", positive: false }}
            context="Down from 21.3%"
          />
        </div>
      </div>

      {/* KPI Row */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          KPI Row (Bento)
        </h3>
        <KpiRow
          metrics={[
            { label: "Total Budget", value: "$9.3M", context: "Original contract value" },
            { label: "Committed", value: "—", context: "No contracts yet" },
            { label: "Remaining", value: "$9.3M", delta: { value: "100%", positive: true }, context: "100% unallocated" },
            { label: "Open Items", value: "—", context: "Nothing pending" },
          ]}
        />
      </div>

      {/* Section Header */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Section Header
        </h3>
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <SectionHeader
            title="Meetings"
            count={57}
            action={{ label: "View all", href: "#" }}
          />
          <div className="border-t border-border" />
          <SectionHeader title="Recent Activity" />
          <div className="border-t border-border" />
          <SectionHeader
            title="Documents"
            count={234}
            action={{ label: "Upload", href: "#" }}
          />
        </div>
      </div>

      {/* Meeting List Item */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Meeting List Item
        </h3>
        <div className="rounded-lg border border-border bg-card px-4">
          <div className="divide-y divide-border">
            <MeetingListItem
              month="Feb"
              day="24"
              title="OAC- Westfield Collective"
              summary="Construction is nearing completion with key installations in plumbing, electrical, and wood trim starting soon."
              attendeeCount={15}
              attendeeAvatars={["BC", "JD"]}
              overflowCount={12}
              duration="1 min read"
              href="#"
            />
            <MeetingListItem
              month="Feb"
              day="17"
              title="Westfield Collective: Beer Line Discussion"
              summary="The team discussed the rerouting of 4.5-inch PVC beer lines under the bar to prevent interference with coolers."
              attendeeCount={6}
              attendeeAvatars={["AL", "DS"]}
              overflowCount={3}
              duration="2 min read"
              href="#"
            />
          </div>
        </div>
      </div>

      {/* Premium Table */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Premium Table
        </h3>
        <div className="rounded-lg border border-border bg-card p-6">
          <PremiumTable<SampleRow>
            columns={[
              { key: "name", header: "Project", primary: true, render: (row) => row.name },
              {
                key: "status",
                header: "Status",
                render: (row) => (
                  <StatusDot
                    variant={row.status === "Active" ? "success" : row.status === "Pending" ? "warning" : "neutral"}
                    label={row.status}
                  />
                ),
              },
              { key: "amount", header: "Contract Value", align: "right", render: (row) => row.amount },
            ]}
            rows={sampleRows}
            onRowClick={(row) => alert(`Clicked: ${row.name}`)}
          />
        </div>
      </div>

      {/* Avatar Stack */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Avatar Stack
        </h3>
        <div className="flex items-end gap-12">
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Small</p>
            <AvatarStack avatars={["BC", "JD", "MH", "AL", "TK"]} max={3} size="sm" />
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Medium</p>
            <AvatarStack avatars={["BC", "JD", "MH", "AL", "TK", "RP"]} max={4} size="md" />
          </div>
        </div>
      </div>

      {/* Nav Sidebar */}
      <div>
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Nav Sidebar
        </h3>
        <div className="h-96 overflow-hidden rounded-lg border border-border">
          <NavSidebar
            sections={[
              {
                label: "Financial",
                items: [
                  { name: "Budget", href: "#" },
                  { name: "Prime Contracts", href: "#", count: 1 },
                  { name: "Commitments", href: "#" },
                  { name: "Direct Costs", href: "#" },
                ],
              },
              {
                label: "Project",
                items: [
                  { name: "Schedule", href: "#" },
                  { name: "Meetings", href: "#", count: 57, active: true },
                ],
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
