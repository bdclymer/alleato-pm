// @ts-nocheck
"use client";

import {
  KpiBlock,
  KpiRow,
  SectionHeader,
  MeetingListItem,
  NavSidebar,
  PageHeader,
  Button,
  StatusDot,
  StatusBadge,
  EmptyState,
  PremiumTable,
  AvatarStack,
  ProjectHomeExample,
} from "@/design-system/REFERENCE_COMPONENTS";
import { FileText, Plus, Pencil, ChevronRight } from "lucide-react";

// Sample table data
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

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen space-y-16 pb-20">
      {/* Page title */}
      <div className="border-b border-gray-200 bg-white px-8 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Design System Reference
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All reference components from REFERENCE_COMPONENTS.tsx rendered for
          visual review.
        </p>
      </div>

      <div className="mx-auto max-w-6xl space-y-20 px-8">
        {/* ================================================================ */}
        {/* 1. KPI Block */}
        {/* ================================================================ */}
        <section>
          <SectionLabel>1. KPI Block</SectionLabel>
          <p className="mb-6 text-sm text-muted-foreground">
            The fundamental metric display unit. Shows label (eyebrow), value,
            optional delta badge, and context line.
          </p>

          <div className="grid grid-cols-3 gap-12">
            <div>
              <SubLabel>Prominent (default)</SubLabel>
              <KpiBlock
                label="Total Budget"
                value="$9.3M"
                context="Original contract value"
              />
            </div>
            <div>
              <SubLabel>With delta (positive)</SubLabel>
              <KpiBlock
                label="Revenue"
                value="$24K"
                delta={{ value: "12.4%", positive: true }}
                context="vs $21.3K last month"
              />
            </div>
            <div>
              <SubLabel>With delta (negative)</SubLabel>
              <KpiBlock
                label="Margin"
                value="18.2%"
                delta={{ value: "3.1%", positive: false }}
                context="Down from 21.3%"
              />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-12">
            <div>
              <SubLabel>Compact size</SubLabel>
              <KpiBlock
                label="Open RFIs"
                value="12"
                size="compact"
                context="3 overdue"
              />
            </div>
            <div>
              <SubLabel>No context</SubLabel>
              <KpiBlock label="Change Orders" value="7" size="compact" />
            </div>
            <div>
              <SubLabel>Em dash (empty)</SubLabel>
              <KpiBlock
                label="Committed"
                value="—"
                context="No contracts yet"
              />
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* 2. KPI Row (Bento) */}
        {/* ================================================================ */}
        <section>
          <SectionLabel>2. KPI Row (Bento Style)</SectionLabel>
          <p className="mb-6 text-sm text-muted-foreground">
            Multiple KPI blocks in a shared container with dividers. Avoids the
            &quot;card trap&quot; of individual bordered cards.
          </p>

          <SubLabel>4-column row</SubLabel>
          <KpiRow
            metrics={[
              {
                label: "Total Budget",
                value: "$9.3M",
                context: "Original contract value",
              },
              { label: "Committed", value: "—", context: "No contracts yet" },
              {
                label: "Remaining",
                value: "$9.3M",
                delta: { value: "100%", positive: true },
                context: "100% unallocated",
              },
              { label: "Open Items", value: "—", context: "Nothing pending" },
            ]}
          />

          <div className="mt-8">
            <SubLabel>3-column row</SubLabel>
            <KpiRow
              metrics={[
                {
                  label: "Active Projects",
                  value: "24",
                  delta: { value: "4", positive: true },
                  context: "4 started this month",
                },
                {
                  label: "Total Contract Value",
                  value: "$47.2M",
                  context: "Across all projects",
                },
                {
                  label: "Avg Margin",
                  value: "22.4%",
                  delta: { value: "1.2%", positive: false },
                  context: "Target: 25%",
                },
              ]}
            />
          </div>
        </section>

        {/* ================================================================ */}
        {/* 3. Section Header */}
        {/* ================================================================ */}
        <section>
          <SectionLabel>3. Section Header</SectionLabel>
          <p className="mb-6 text-sm text-muted-foreground">
            Title + optional count + optional action link. Used to introduce
            content sections.
          </p>

          <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
            <SectionHeader
              title="Meetings"
              count={57}
              action={{ label: "View all", href: "#" }}
            />
            <div className="border-t border-gray-100" />
            <SectionHeader title="Recent Activity" />
            <div className="border-t border-gray-100" />
            <SectionHeader
              title="Documents"
              count={234}
              action={{ label: "Upload", href: "#" }}
            />
          </div>
        </section>

        {/* ================================================================ */}
        {/* 4. Meeting List Item */}
        {/* ================================================================ */}
        <section>
          <SectionLabel>4. Meeting List Item</SectionLabel>
          <p className="mb-6 text-sm text-muted-foreground">
            Rich list row with date column, title (accent on hover), summary
            (2-line clamp), avatar stack, and meta row.
          </p>

          <div className="rounded-lg border border-gray-200 bg-white px-4">
            <div className="divide-y divide-gray-100">
              <MeetingListItem
                month="Feb"
                day="24"
                title="OAC- Westfield Collective"
                summary="Construction is nearing completion with key installations in plumbing, electrical, and wood trim starting soon. An impromptu inspection raised concerns regarding door and sprinkler placements, but these won't hinder obtaining the Temporary Certificate of Occupancy (TCO)."
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
                summary="The team discussed the rerouting of 4.5-inch PVC beer lines under the bar to prevent interference with coolers and floor conditions. They agreed on trenching and sleeving to protect the lines."
                attendeeCount={6}
                attendeeAvatars={["AL", "DS"]}
                overflowCount={3}
                duration="2 min read"
                href="#"
              />
              <MeetingListItem
                month="Feb"
                day="10"
                title="Weekly Progress Review"
                summary="Reviewed milestones for Phase 2 completion. HVAC installation is 85% complete. Electrical rough-in expected to finish by end of week."
                attendeeCount={8}
                attendeeAvatars={["MH", "TK", "RP"]}
                overflowCount={5}
                href="#"
              />
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* 5. Button Variants */}
        {/* ================================================================ */}
        <section>
          <SectionLabel>5. Button Variants</SectionLabel>
          <p className="mb-6 text-sm text-muted-foreground">
            3 variants (primary, secondary, ghost) x 2 sizes (md, sm). Every
            button has hover, focus-visible, and active states.
          </p>

          <div className="space-y-6">
            <div>
              <SubLabel>Medium (default)</SubLabel>
              <div className="flex items-center gap-4">
                <Button
                  variant="primary"
                  icon={<Plus className="h-3.5 w-3.5" />}
                >
                  Create Contract
                </Button>
                <Button
                  variant="secondary"
                  icon={<Pencil className="h-3.5 w-3.5" />}
                >
                  Edit Project
                </Button>
                <Button variant="ghost">Cancel</Button>
                <Button variant="primary" disabled>
                  Disabled
                </Button>
              </div>
            </div>

            <div>
              <SubLabel>Small</SubLabel>
              <div className="flex items-center gap-4">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="h-3 w-3" />}
                >
                  Add
                </Button>
                <Button variant="secondary" size="sm">
                  Export
                </Button>
                <Button variant="ghost" size="sm">
                  More
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* 6. Status Indicators */}
        {/* ================================================================ */}
        <section>
          <SectionLabel>6. Status Indicators</SectionLabel>
          <p className="mb-6 text-sm text-muted-foreground">
            Dot + label (inline, for tables) and Badge (for tags/categories).
            Use sparingly — status colors on &lt;5% of UI surface.
          </p>

          <div className="grid grid-cols-2 gap-12">
            <div>
              <SubLabel>Status Dot (inline)</SubLabel>
              <div className="space-y-3">
                <StatusDot variant="success" label="Active" />
                <br />
                <StatusDot variant="warning" label="Pending Review" />
                <br />
                <StatusDot variant="error" label="Overdue" />
                <br />
                <StatusDot variant="info" label="Draft" />
                <br />
                <StatusDot variant="neutral" label="Inactive" />
              </div>
            </div>

            <div>
              <SubLabel>Status Badge (emphasized)</SubLabel>
              <div className="flex flex-wrap gap-2">
                <StatusBadge variant="success" label="Approved" />
                <StatusBadge variant="warning" label="Under Review" />
                <StatusBadge variant="error" label="Rejected" />
                <StatusBadge variant="info" label="Draft" />
                <StatusBadge variant="neutral" label="Archived" />
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* 7. Avatar Stack */}
        {/* ================================================================ */}
        <section>
          <SectionLabel>7. Avatar Stack</SectionLabel>
          <p className="mb-6 text-sm text-muted-foreground">
            Overlapping avatar circles with initials. Shows first N, then +X
            overflow.
          </p>

          <div className="flex items-end gap-12">
            <div>
              <SubLabel>Small (default)</SubLabel>
              <AvatarStack
                avatars={["BC", "JD", "MH", "AL", "TK"]}
                max={3}
                size="sm"
              />
            </div>
            <div>
              <SubLabel>Medium</SubLabel>
              <AvatarStack
                avatars={["BC", "JD", "MH", "AL", "TK", "RP"]}
                max={4}
                size="md"
              />
            </div>
            <div>
              <SubLabel>No overflow</SubLabel>
              <AvatarStack avatars={["BC", "JD"]} max={3} size="sm" />
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* 8. Premium Table */}
        {/* ================================================================ */}
        <section>
          <SectionLabel>8. Premium Table</SectionLabel>
          <p className="mb-6 text-sm text-muted-foreground">
            11px uppercase headers, primary weight on identifier column, subtle
            dividers, row hover, tabular-nums for numbers.
          </p>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <PremiumTable<SampleRow>
              columns={[
                {
                  key: "name",
                  header: "Project",
                  primary: true,
                  render: (row) => row.name,
                },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => (
                    <StatusDot
                      variant={
                        row.status === "Active"
                          ? "success"
                          : row.status === "Pending"
                            ? "warning"
                            : "neutral"
                      }
                      label={row.status}
                    />
                  ),
                },
                {
                  key: "amount",
                  header: "Contract Value",
                  align: "right",
                  render: (row) => row.amount,
                },
              ]}
              rows={sampleRows}
              onRowClick={(row) => alert(`Clicked: ${row.name}`)}
            />
          </div>
        </section>

        {/* ================================================================ */}
        {/* 9. Empty State */}
        {/* ================================================================ */}
        <section>
          <SectionLabel>9. Empty State</SectionLabel>
          <p className="mb-6 text-sm text-muted-foreground">
            Icon + title + description + optional CTA. Never just &quot;No
            data&quot;.
          </p>

          <div className="rounded-lg border border-gray-200 bg-white">
            <EmptyState
              icon={<FileText className="h-6 w-6 text-muted-foreground" />}
              title="No contracts yet"
              description="Create your first prime contract to start tracking committed costs for this project."
              action={{
                label: "Create Contract",
                onClick: () => alert("Create contract clicked"),
              }}
            />
          </div>
        </section>

        {/* ================================================================ */}
        {/* 10. Page Header */}
        {/* ================================================================ */}
        <section>
          <SectionLabel>10. Page Header</SectionLabel>
          <p className="mb-6 text-sm text-muted-foreground">
            Breadcrumb + project code + title + action buttons.
          </p>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <PageHeader
              breadcrumbs={[
                { label: "Projects", href: "#" },
                { label: "Westfield Collective" },
              ]}
              projectCode="24-115"
              title="Westfield Collective"
              actions={
                <>
                  <Button
                    variant="secondary"
                    icon={<Pencil className="h-3.5 w-3.5" />}
                  >
                    Edit Project
                  </Button>
                  <Button
                    variant="primary"
                    icon={<ChevronRight className="h-3.5 w-3.5" />}
                  >
                    Setup Checklist
                  </Button>
                </>
              }
            />
          </div>
        </section>

        {/* ================================================================ */}
        {/* 11. Nav Sidebar */}
        {/* ================================================================ */}
        <section>
          <SectionLabel>11. Nav Sidebar</SectionLabel>
          <p className="mb-6 text-sm text-muted-foreground">
            Right sidebar with categorized navigation. Section labels use
            eyebrow style. Active item gets bg-gray-100 + font-medium.
          </p>

          <div className="h-[500px] overflow-hidden rounded-lg border border-gray-200">
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
                    { name: "RFIs", href: "#" },
                    { name: "Meetings", href: "#", count: 57, active: true },
                  ],
                },
                {
                  label: "Files",
                  items: [
                    { name: "Drawings", href: "#" },
                    { name: "Documents", href: "#" },
                    { name: "Photos", href: "#" },
                  ],
                },
              ]}
            />
          </div>
        </section>

        {/* ================================================================ */}
        {/* 12. Full Page Example */}
        {/* ================================================================ */}
        <section>
          <SectionLabel>12. Complete Page Example — Project Home</SectionLabel>
          <p className="mb-6 text-sm text-muted-foreground">
            All components composed into a full project home page. This is the
            reference layout.
          </p>

          <div className="overflow-hidden rounded-lg border-2 border-gray-300">
            <ProjectHomeExample />
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Helper components for the showcase page ──────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
      {children}
    </h2>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}
