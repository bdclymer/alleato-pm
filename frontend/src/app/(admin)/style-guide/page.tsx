"use client";

import {
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Video,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/layout";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header-unified";
import { SectionHeader } from "@/components/ds/section-header";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  StatusBadge,
  StatusDot,
  StatusText,
  CellText,
  TruncatedCell,
  CellLink,
  CellEmail,
  CellCurrency,
  CellNumber,
  CellPercent,
  CellDate,
  CellStatus,
  TableTagBadge,
  CellBadge,
  TableAvatarUsers,
  TableCountIndicator,
  TableRowActionsMenu,
} from "@/components/ds";

export default function StyleGuidePage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <PageContainer maxWidth="full" className="max-w-[1800px] py-12">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-brand transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        {/* Page Header */}
        <PageHeader
          title="Design System Style Guide"
          description="Visual reference for Alleato's design patterns, components, and styling conventions"
        />

        {/* Color Palette */}
        <section className="mb-20">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-sans font-light tracking-tight text-neutral-900 mb-2">
              Color Palette
            </h2>
            <p className="text-sm text-neutral-500">
              Brand colors and semantic palette
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Brand Orange */}
            <div className="border border-neutral-200 bg-background p-6">
              <div className="h-24 bg-brand mb-4 border border-neutral-200"></div>
              <h3 className="text-lg font-sans font-light text-neutral-900 mb-2">
                Brand Orange
              </h3>
              <p className="text-sm text-neutral-600 font-mono">#DB802D</p>
              <p className="text-xs text-neutral-500 mt-1">
                text-brand, bg-brand
              </p>
            </div>

            {/* Neutral */}
            <div className="border border-neutral-200 bg-background p-6">
              <div className="h-24 bg-neutral-900 mb-4 border border-neutral-200"></div>
              <h3 className="text-lg font-sans font-light text-neutral-900 mb-2">
                Neutral Gray
              </h3>
              <p className="text-sm text-neutral-600 font-mono">#171717</p>
              <p className="text-xs text-neutral-500 mt-1">text-neutral-900</p>
            </div>

            {/* Green (Decisions) */}
            <div className="border border-neutral-200 bg-background p-6">
              <div className="h-24 bg-green-700 mb-4 border border-neutral-200"></div>
              <h3 className="text-lg font-sans font-light text-neutral-900 mb-2">
                Success Green
              </h3>
              <p className="text-sm text-neutral-600 font-mono">#15803d</p>
              <p className="text-xs text-neutral-500 mt-1">
                text-green-700 (Decisions)
              </p>
            </div>

            {/* Blue (Action Items) */}
            <div className="border border-neutral-200 bg-background p-6">
              <div className="h-24 bg-blue-700 mb-4 border border-neutral-200"></div>
              <h3 className="text-lg font-sans font-light text-neutral-900 mb-2">
                Info Blue
              </h3>
              <p className="text-sm text-neutral-600 font-mono">#1d4ed8</p>
              <p className="text-xs text-neutral-500 mt-1">
                text-blue-700 (Actions)
              </p>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="mb-20">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-sans font-light tracking-tight text-neutral-900 mb-2">
              Typography
            </h2>
            <p className="text-sm text-neutral-500">Type scale and hierarchy</p>
          </div>

          <div className="border border-neutral-200 bg-background p-8 space-y-8">
            {/* Page Title */}
            <div>
              <p className="text-xs text-neutral-500 mb-2">
                Page Title (PageHeader)
              </p>
              <h1 className="text-4xl md:text-5xl font-sans font-light tracking-tight text-neutral-900">
                Page Title Example
              </h1>
            </div>

            {/* Section Heading */}
            <div>
              <p className="text-xs text-neutral-500 mb-2">Section Heading</p>
              <h2 className="text-2xl md:text-3xl font-sans font-light tracking-tight text-neutral-900">
                Section Heading Example
              </h2>
            </div>

            {/* Card Title */}
            <div>
              <p className="text-xs text-neutral-500 mb-2">Card Title</p>
              <h3 className="text-lg font-sans font-light text-neutral-900">
                Card Title Example
              </h3>
            </div>

            {/* Section Header */}
            <div>
              <p className="text-xs text-neutral-500 mb-2">
                Section Header (Small)
              </p>
              <SectionHeader title="Section Name" />
            </div>

            {/* Body Text */}
            <div>
              <p className="text-xs text-neutral-500 mb-2">Body Text</p>
              <p className="text-sm text-neutral-700 leading-relaxed">
                This is an example of body text. It uses a small font size with
                relaxed line height for optimal readability. The color is
                neutral-700 for good contrast while maintaining a soft
                appearance.
              </p>
            </div>

            {/* Muted Text */}
            <div>
              <p className="text-xs text-neutral-500 mb-2">Muted Text</p>
              <p className="text-sm text-neutral-500">
                This is muted text used for secondary information
              </p>
            </div>
          </div>
        </section>

        {/* Stat Cards */}
        <section className="mb-20">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-sans font-light tracking-tight text-neutral-900 mb-2">
              Stat Cards
            </h2>
            <p className="text-sm text-neutral-500">
              Display key metrics and statistics
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard label="Total Meetings" value={42} />
            <MetricCard
              label="Active Tasks"
              value={18}
              change={{ value: 12, type: "positive" }}
            />
            <MetricCard label="With Recordings" value={35} />
            <MetricCard label="Avg. Participants" value={8} />
          </div>
        </section>

        {/* Content Cards */}
        <section className="mb-20">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-sans font-light tracking-tight text-neutral-900 mb-2">
              Content Cards
            </h2>
            <p className="text-sm text-neutral-500">
              Display content with metadata
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Kickoff Meeting</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Discussed project timeline, deliverables, and team responsibilities. Key decisions made regarding technology stack and architecture.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Budget Review Session</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Quarterly budget review with detailed analysis of spending patterns and forecast adjustments.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Metadata Cards */}
        <section className="mb-20">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-sans font-light tracking-tight text-neutral-900 mb-2">
              Metadata Cards
            </h2>
            <p className="text-sm text-neutral-500">
              Display structured information with icons
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="border border-neutral-200 bg-background p-6">
              <div className="flex items-center gap-4 mb-4">
                <Calendar className="h-4 w-4 text-brand" />
                <SectionHeader title="Date" />
              </div>
              <p className="text-base font-light text-neutral-900">
                Friday, December 15, 2024
              </p>
            </div>

            <div className="border border-neutral-200 bg-background p-6">
              <div className="flex items-center gap-4 mb-4">
                <Clock className="h-4 w-4 text-brand" />
                <SectionHeader title="Duration" />
              </div>
              <p className="text-base font-light text-neutral-900">
                45 minutes
              </p>
            </div>

            <div className="border border-neutral-200 bg-background p-6">
              <div className="flex items-center gap-4 mb-4">
                <User className="h-4 w-4 text-brand" />
                <SectionHeader title="Participants" />
              </div>
              <p className="text-base font-light text-neutral-900">8 people</p>
            </div>

            <div className="border border-neutral-200 bg-background p-6">
              <div className="flex items-center gap-4 mb-4">
                <FileText className="h-4 w-4 text-brand" />
                <SectionHeader title="Type" />
              </div>
              <p className="text-base font-light text-neutral-900">
                Project Meeting
              </p>
            </div>
          </div>
        </section>

        {/* Lists with Bullets */}
        <section className="mb-20">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-sans font-light tracking-tight text-neutral-900 mb-2">
              Lists with Brand Bullets
            </h2>
            <p className="text-sm text-neutral-500">
              Bulleted lists with brand-colored bullets
            </p>
          </div>

          <div className="border border-neutral-200 bg-background p-8">
            <ul className="space-y-4">
              <li className="flex items-start gap-4 text-sm text-neutral-700 leading-relaxed">
                <span className="text-brand mt-0.5">•</span>
                <span>
                  Finalize project timeline and key milestones for Q1 delivery
                </span>
              </li>
              <li className="flex items-start gap-4 text-sm text-neutral-700 leading-relaxed">
                <span className="text-brand mt-0.5">•</span>
                <span>Review and approve technology stack selection</span>
              </li>
              <li className="flex items-start gap-4 text-sm text-neutral-700 leading-relaxed">
                <span className="text-brand mt-0.5">•</span>
                <span>Assign team members to specific work packages</span>
              </li>
              <li className="flex items-start gap-4 text-sm text-neutral-700 leading-relaxed">
                <span className="text-brand mt-0.5">•</span>
                <span>Schedule weekly standup meetings for status updates</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Outcome Badges */}
        <section className="mb-20">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-sans font-light tracking-tight text-neutral-900 mb-2">
              Outcome Badges
            </h2>
            <p className="text-sm text-neutral-500">
              Semantic colors for different outcome types
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="border border-neutral-200 bg-background p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-success" />
                <h3 className="text-sm font-semibold text-success">
                  DECISIONS
                </h3>
              </div>
              <p className="text-sm text-neutral-700">
                Use green color for decisions and approvals
              </p>
            </div>

            <div className="border border-neutral-200 bg-background p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-info" />
                <h3 className="text-sm font-semibold text-info">
                  ACTION ITEMS
                </h3>
              </div>
              <p className="text-sm text-neutral-700">
                Use blue color for action items and tasks
              </p>
            </div>

            <div className="border border-neutral-200 bg-background p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
                <h3 className="text-sm font-semibold text-amber-700">RISKS</h3>
              </div>
              <p className="text-sm text-neutral-700">
                Use amber color for risks and warnings
              </p>
            </div>

            <div className="border border-neutral-200 bg-background p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-purple-700" />
                <h3 className="text-sm font-semibold text-purple-700">
                  OPPORTUNITIES
                </h3>
              </div>
              <p className="text-sm text-neutral-700">
                Use purple color for opportunities
              </p>
            </div>
          </div>
        </section>

        {/* Empty States */}
        <section className="mb-20">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-sans font-light tracking-tight text-neutral-900 mb-2">
              Empty States
            </h2>
            <p className="text-sm text-neutral-500">
              When no data is available
            </p>
          </div>

          <EmptyState
            icon={<Calendar className="h-12 w-12" />}
            title="No meetings found"
            description="No meeting records for this project yet. Meetings will appear here once they are uploaded or synced from your meeting platform."
          />
        </section>

        {/* Spacing Scale */}
        <section className="mb-20">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-sans font-light tracking-tight text-neutral-900 mb-2">
              Spacing Scale
            </h2>
            <p className="text-sm text-neutral-500">
              Consistent spacing throughout the application
            </p>
          </div>

          <div className="border border-neutral-200 bg-background p-8">
            <div className="space-y-6">
              <div>
                <p className="text-xs text-neutral-500 mb-2">
                  Small gap (gap-2, gap-4)
                </p>
                <div className="flex gap-2">
                  <div className="h-8 w-8 bg-brand"></div>
                  <div className="h-8 w-8 bg-brand"></div>
                  <div className="h-8 w-8 bg-brand"></div>
                </div>
              </div>

              <div>
                <p className="text-xs text-neutral-500 mb-2">
                  Medium gap (gap-4, gap-6)
                </p>
                <div className="flex gap-6">
                  <div className="h-8 w-8 bg-brand"></div>
                  <div className="h-8 w-8 bg-brand"></div>
                  <div className="h-8 w-8 bg-brand"></div>
                </div>
              </div>

              <div>
                <p className="text-xs text-neutral-500 mb-2">
                  Large gap (gap-8)
                </p>
                <div className="flex gap-8">
                  <div className="h-8 w-8 bg-brand"></div>
                  <div className="h-8 w-8 bg-brand"></div>
                  <div className="h-8 w-8 bg-brand"></div>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-200">
                <p className="text-xs text-neutral-500 mb-4">Section spacing</p>
                <div className="space-y-2 text-sm text-neutral-700 font-mono">
                  <p>mb-6 - Small section gap</p>
                  <p>mb-8 - Medium section gap</p>
                  <p>mb-12 - Large section gap</p>
                  <p>mb-16 - Extra large section gap</p>
                  <p>mb-20 - XXL section gap</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Layout Patterns */}
        <section className="mb-20">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-sans font-light tracking-tight text-neutral-900 mb-2">
              Layout Patterns
            </h2>
            <p className="text-sm text-neutral-500">
              Standard page structure and containers
            </p>
          </div>

          <div className="border border-neutral-200 bg-background p-8">
            <div className="space-y-4 font-mono text-sm">
              <div>
                <p className="text-neutral-900 mb-2">Page Container:</p>
                <code className="block bg-neutral-50 p-4 text-neutral-700 rounded">
                  {`<div className="min-h-screen bg-neutral-50">`}
                  <br />
                  {`  <div className="max-w-[1800px] mx-auto px-6 md:px-10 lg:px-12 py-12">`}
                  <br />
                  {`    {/* Page content */}`}
                  <br />
                  {`  </div>`}
                  <br />
                  {`</div>`}
                </code>
              </div>

              <div className="pt-4">
                <p className="text-neutral-900 mb-2">
                  Grid Layout (4 columns):
                </p>
                <code className="block bg-neutral-50 p-4 text-neutral-700 rounded">
                  {`<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">`}
                  <br />
                  {`  {/* Cards */}`}
                  <br />
                  {`</div>`}
                </code>
              </div>

              <div className="pt-4">
                <p className="text-neutral-900 mb-2">
                  Grid Layout (2 columns):
                </p>
                <code className="block bg-neutral-50 p-4 text-neutral-700 rounded">
                  {`<div className="grid grid-cols-1 md:grid-cols-2 gap-6">`}
                  <br />
                  {`  {/* Cards */}`}
                  <br />
                  {`</div>`}
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* TABLE CELL COMPONENTS */}
        {/* ================================================================ */}
        <section className="mb-20">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-sans font-light tracking-tight text-neutral-900 mb-2">
              Table Cell Components
            </h2>
            <p className="text-sm text-neutral-500 mb-1">
              Every table column <strong>must</strong> use one of these cell renderers. No raw strings, ad-hoc formatting, or custom JSX in column definitions.
            </p>
            <p className="text-xs text-neutral-400 font-mono mt-1">
              import from &quot;@/components/tables/unified/table-primitives&quot;
            </p>
          </div>

          {/* Live Reference Table */}
          <div className="border border-neutral-200 bg-background mb-12 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100">
              <h3 className="text-sm font-medium text-neutral-900">Live Reference Table</h3>
              <p className="text-xs text-neutral-500 mt-0.5">All cell types shown in context with sample construction data</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Title (Truncated)</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><CellNumber value={1} /></TableCell>
                    <TableCell><CellStatus value="Approved" /></TableCell>
                    <TableCell><TruncatedCell value="Concrete Foundation Work — Phase 1 Excavation and Forming" maxWidth={240} /></TableCell>
                    <TableCell><CellCurrency value={125000} /></TableCell>
                    <TableCell><CellPercent value={87.5} /></TableCell>
                    <TableCell><CellDate value="2026-03-15" /></TableCell>
                    <TableCell><TableAvatarUsers users={["john.doe@co.com", "sarah.k@co.com", "mike.p@co.com"]} maxVisible={3} /></TableCell>
                    <TableCell><TableTagBadge label="Change Order" /></TableCell>
                    <TableCell><TableRowActionsMenu items={[{ key: "edit", label: "Edit", onSelect: () => {} }, { key: "delete", label: "Delete", onSelect: () => {}, destructive: true }]} /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><CellNumber value={2} /></TableCell>
                    <TableCell><CellStatus value="Pending" /></TableCell>
                    <TableCell><TruncatedCell value="Electrical Rough-In Installation for North Wing Building Mechanical Room Level 3" maxWidth={240} /></TableCell>
                    <TableCell><CellCurrency value={48250.75} /></TableCell>
                    <TableCell><CellPercent value={52.0} /></TableCell>
                    <TableCell><CellDate value={null} /></TableCell>
                    <TableCell><TableAvatarUsers users={["alex.b@co.com"]} /></TableCell>
                    <TableCell><TableTagBadge label="Invoice" /></TableCell>
                    <TableCell><TableRowActionsMenu items={[{ key: "edit", label: "Edit", onSelect: () => {} }]} /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><CellNumber value={3} /></TableCell>
                    <TableCell><CellStatus value="Draft" /></TableCell>
                    <TableCell><TruncatedCell value="Site Preparation" maxWidth={240} /></TableCell>
                    <TableCell><CellCurrency value={null} /></TableCell>
                    <TableCell><CellPercent value={null} /></TableCell>
                    <TableCell><CellDate value="2026-02-28" /></TableCell>
                    <TableCell><TableAvatarUsers users={[]} /></TableCell>
                    <TableCell><TableTagBadge label="Budget" /></TableCell>
                    <TableCell><TableRowActionsMenu items={[{ key: "edit", label: "Edit", onSelect: () => {} }, { key: "delete", label: "Delete", onSelect: () => {}, destructive: true }]} /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><CellNumber value={4} /></TableCell>
                    <TableCell><CellStatus value="Rejected" /></TableCell>
                    <TableCell><TruncatedCell value="Misc Equipment" maxWidth={240} /></TableCell>
                    <TableCell><CellCurrency value={3400} /></TableCell>
                    <TableCell><CellPercent value={100.0} /></TableCell>
                    <TableCell><CellDate value="2026-04-01T14:30:00Z" showTime /></TableCell>
                    <TableCell><TableAvatarUsers users={["megan.h@co.com", "james.l@co.com"]} /></TableCell>
                    <TableCell><TableTagBadge label="Direct Cost" /></TableCell>
                    <TableCell><TableRowActionsMenu items={[{ key: "edit", label: "Edit", onSelect: () => {} }, { key: "delete", label: "Delete", onSelect: () => {}, destructive: true }]} /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Component Reference Cards */}
          <div className="space-y-10">

            {/* ── Status Cells ── */}
            <div>
              <h3 className="text-lg font-sans font-light text-neutral-900 mb-1">Status Cells</h3>
              <p className="text-xs text-neutral-500 mb-4">
                For status/state fields. <code className="bg-neutral-100 px-1 rounded font-mono">CellStatus</code> is the standard column wrapper — it uses <code className="bg-neutral-100 px-1 rounded font-mono">StatusBadge</code> internally.
              </p>

              <div className="border border-neutral-200 bg-background p-6 mb-4">
                <p className="text-xs text-neutral-500 mb-3 font-mono">CellStatus / StatusBadge — all automatic variants</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {["Approved", "Active", "Completed", "Paid", "Closed", "Executed"].map(s => <StatusBadge key={s} status={s} />)}
                  {["Pending", "In Progress", "Submitted", "Open", "Out for Bid", "Revise and Resubmit"].map(s => <StatusBadge key={s} status={s} />)}
                  {["Rejected", "Overdue", "Cancelled", "Void", "Terminated"].map(s => <StatusBadge key={s} status={s} />)}
                  {["Not Synced"].map(s => <StatusBadge key={s} status={s} />)}
                  {["Draft", "Inactive", "Archived"].map(s => <StatusBadge key={s} status={s} />)}
                </div>
                <code className="block text-xs bg-neutral-50 p-3 text-neutral-700 rounded font-mono">
                  {`render: (item) => <CellStatus value={item.status} />`}
                </code>
              </div>

              <div className="border border-neutral-200 bg-background p-6 mb-4">
                <p className="text-xs text-neutral-500 mb-3 font-mono">StatusDot — compact dot + label for dense tables</p>
                <div className="flex flex-wrap gap-6 mb-4">
                  {["Approved", "Pending", "Rejected", "Draft", "Not Synced"].map(s => <StatusDot key={s} status={s} />)}
                </div>
                <code className="block text-xs bg-neutral-50 p-3 text-neutral-700 rounded font-mono">
                  {`render: (item) => <StatusDot status={item.status} />`}
                </code>
              </div>

              <div className="border border-neutral-200 bg-background p-6">
                <p className="text-xs text-neutral-500 mb-3 font-mono">StatusText — plain muted text, no pill (use sparingly)</p>
                <div className="flex flex-wrap gap-6 mb-4">
                  {["Not synced", "Unknown", "Inactive"].map(s => <StatusText key={s} status={s} />)}
                </div>
                <code className="block text-xs bg-neutral-50 p-3 text-neutral-700 rounded font-mono">
                  {`render: (item) => <StatusText status={item.syncStatus} />`}
                </code>
              </div>
            </div>

            {/* ── Text Cells ── */}
            <div>
              <h3 className="text-lg font-sans font-light text-neutral-900 mb-1">Text Cells</h3>
              <p className="text-xs text-neutral-500 mb-4">For name, title, description, and other string fields.</p>

              <div className="border border-neutral-200 bg-background p-6 mb-4">
                <p className="text-xs text-neutral-500 mb-3 font-mono">CellText — plain text, handles null/empty gracefully</p>
                <div className="flex flex-col gap-2 mb-4">
                  <CellText value="Concrete Foundation Work" />
                  <CellText value="Supporting note or description" muted />
                  <CellText value={null} emptyLabel="No title set" />
                  <CellText value="" />
                </div>
                <code className="block text-xs bg-neutral-50 p-3 text-neutral-700 rounded font-mono whitespace-pre">
                  {`render: (item) => <CellText value={item.title} />\nrender: (item) => <CellText value={item.notes} muted />`}
                </code>
              </div>

              <div className="border border-neutral-200 bg-background p-6">
                <p className="text-xs text-neutral-500 mb-3 font-mono">TruncatedCell — truncates to one line, shows full text in tooltip on hover</p>
                <div className="flex flex-col gap-2 mb-4">
                  <TruncatedCell value="Electrical Rough-In Installation for North Wing Building Mechanical Room Level 3 East Side Panel" maxWidth={420} />
                  <TruncatedCell value="Short text" maxWidth={420} />
                  <TruncatedCell value={null} />
                </div>
                <code className="block text-xs bg-neutral-50 p-3 text-neutral-700 rounded font-mono">
                  {`render: (item) => <TruncatedCell value={item.description} maxWidth={320} />`}
                </code>
              </div>
            </div>

            {/* ── Numeric Cells ── */}
            <div>
              <h3 className="text-lg font-sans font-light text-neutral-900 mb-1">Numeric Cells</h3>
              <p className="text-xs text-neutral-500 mb-4">For money, counts, and percentages. All use tabular-nums automatically.</p>

              <div className="border border-neutral-200 bg-background p-6 mb-4">
                <p className="text-xs text-neutral-500 mb-3 font-mono">CellCurrency — USD currency with commas and $ symbol</p>
                <div className="flex flex-wrap gap-8 mb-4">
                  <CellCurrency value={1250000} />
                  <CellCurrency value={48250.75} />
                  <CellCurrency value={0} />
                  <CellCurrency value={null} />
                </div>
                <code className="block text-xs bg-neutral-50 p-3 text-neutral-700 rounded font-mono">
                  {`render: (item) => <CellCurrency value={item.amount} />`}
                </code>
              </div>

              <div className="border border-neutral-200 bg-background p-6 mb-4">
                <p className="text-xs text-neutral-500 mb-3 font-mono">CellNumber — plain number with optional decimal places</p>
                <div className="flex flex-wrap gap-8 mb-4">
                  <CellNumber value={1024} />
                  <CellNumber value={3.14159} decimals={2} />
                  <CellNumber value={0} />
                  <CellNumber value={null} />
                </div>
                <code className="block text-xs bg-neutral-50 p-3 text-neutral-700 rounded font-mono whitespace-pre">
                  {`render: (item) => <CellNumber value={item.count} />\nrender: (item) => <CellNumber value={item.rate} decimals={2} />`}
                </code>
              </div>

              <div className="border border-neutral-200 bg-background p-6">
                <p className="text-xs text-neutral-500 mb-3 font-mono">CellPercent — percentage with % suffix</p>
                <div className="flex flex-wrap gap-8 mb-4">
                  <CellPercent value={87.5} />
                  <CellPercent value={100} />
                  <CellPercent value={0} />
                  <CellPercent value={null} />
                </div>
                <code className="block text-xs bg-neutral-50 p-3 text-neutral-700 rounded font-mono">
                  {`render: (item) => <CellPercent value={item.percentComplete} />`}
                </code>
              </div>
            </div>

            {/* ── Date Cells ── */}
            <div>
              <h3 className="text-lg font-sans font-light text-neutral-900 mb-1">Date Cells</h3>
              <p className="text-xs text-neutral-500 mb-4">For date and datetime fields. Accepts ISO strings or Date objects.</p>

              <div className="border border-neutral-200 bg-background p-6">
                <p className="text-xs text-neutral-500 mb-3 font-mono">CellDate — formatted date, optional time display</p>
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex items-center gap-3 text-xs text-neutral-400"><span className="w-24">Date only:</span><CellDate value="2026-03-15" /></div>
                  <div className="flex items-center gap-3 text-xs text-neutral-400"><span className="w-24">With time:</span><CellDate value="2026-03-15T14:30:00Z" showTime /></div>
                  <div className="flex items-center gap-3 text-xs text-neutral-400"><span className="w-24">Empty:</span><CellDate value={null} /></div>
                </div>
                <code className="block text-xs bg-neutral-50 p-3 text-neutral-700 rounded font-mono whitespace-pre">
                  {`render: (item) => <CellDate value={item.dueDate} />\nrender: (item) => <CellDate value={item.updatedAt} showTime />`}
                </code>
              </div>
            </div>

            {/* ── Link / Email Cells ── */}
            <div>
              <h3 className="text-lg font-sans font-light text-neutral-900 mb-1">Link & Email Cells</h3>
              <p className="text-xs text-neutral-500 mb-4">For clickable entity names, linked records, and email addresses.</p>

              <div className="border border-neutral-200 bg-background p-6 mb-4">
                <p className="text-xs text-neutral-500 mb-3 font-mono">CellLink — internal nav link or external link</p>
                <div className="flex flex-col gap-2 mb-4">
                  <CellLink value="Prime Contract #001 — Concrete Foundation" href="/contracts/1" />
                  <CellLink value="External Procore Link" href="https://procore.com" external />
                  <CellLink value={null} href="/contracts/2" />
                </div>
                <code className="block text-xs bg-neutral-50 p-3 text-neutral-700 rounded font-mono">
                  {`render: (item) => <CellLink value={item.name} href={\`/\${projectId}/contracts/\${item.id}\`} />`}
                </code>
              </div>

              <div className="border border-neutral-200 bg-background p-6">
                <p className="text-xs text-neutral-500 mb-3 font-mono">CellEmail — mailto link</p>
                <div className="flex flex-col gap-2 mb-4">
                  <CellEmail value="john.doe@alleato.com" />
                  <CellEmail value={null} />
                </div>
                <code className="block text-xs bg-neutral-50 p-3 text-neutral-700 rounded font-mono">
                  {`render: (item) => <CellEmail value={item.email} />`}
                </code>
              </div>
            </div>

            {/* ── People / Avatar Cells ── */}
            <div>
              <h3 className="text-lg font-sans font-light text-neutral-900 mb-1">People & Avatar Cells</h3>
              <p className="text-xs text-neutral-500 mb-4">For user, team, assignee, and participant fields.</p>

              <div className="border border-neutral-200 bg-background p-6">
                <p className="text-xs text-neutral-500 mb-3 font-mono">TableAvatarUsers — stacked avatar initials with count + tooltip</p>
                <div className="flex flex-col gap-4 mb-4">
                  <div className="flex items-center gap-3 text-xs text-neutral-400"><span className="w-20">5 people:</span><TableAvatarUsers users={["john.doe@co.com", "sarah.kim@co.com", "mike.p@co.com", "alex.b@co.com", "lisa.n@co.com"]} maxVisible={3} /></div>
                  <div className="flex items-center gap-3 text-xs text-neutral-400"><span className="w-20">1 person:</span><TableAvatarUsers users={["single.user@co.com"]} /></div>
                  <div className="flex items-center gap-3 text-xs text-neutral-400"><span className="w-20">Empty:</span><span className="text-muted-foreground text-xs">—</span></div>
                </div>
                <code className="block text-xs bg-neutral-50 p-3 text-neutral-700 rounded font-mono">
                  {`render: (item) => <TableAvatarUsers users={item.assignees ?? []} maxVisible={3} />`}
                </code>
              </div>
            </div>

            {/* ── Tag / Category Cells ── */}
            <div>
              <h3 className="text-lg font-sans font-light text-neutral-900 mb-1">Tag & Category Cells</h3>
              <p className="text-xs text-neutral-500 mb-4">For type, category, and tag fields. Use <code className="bg-neutral-100 px-1 rounded font-mono">TableTagBadge</code> for generic categories, <code className="bg-neutral-100 px-1 rounded font-mono">CellBadge</code> when you need custom colors per value.</p>

              <div className="border border-neutral-200 bg-background p-6 mb-4">
                <p className="text-xs text-neutral-500 mb-3 font-mono">TableTagBadge — outline pill for type/category fields</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {["Change Order", "Invoice", "Budget", "Direct Cost", "Contract", "Commitment"].map(t => <TableTagBadge key={t} label={t} />)}
                  <TableTagBadge label={null} />
                </div>
                <code className="block text-xs bg-neutral-50 p-3 text-neutral-700 rounded font-mono">
                  {`render: (item) => <TableTagBadge label={item.type} />`}
                </code>
              </div>

              <div className="border border-neutral-200 bg-background p-6">
                <p className="text-xs text-neutral-500 mb-3 font-mono">CellBadge — colored pill with custom colorMap per value</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(["owner", "subcontractor", "vendor", "employee"] as const).map(role => (
                    <CellBadge
                      key={role}
                      value={role}
                      colorMap={{
                        owner: "bg-purple-50 text-purple-700",
                        subcontractor: "bg-blue-50 text-blue-700",
                        vendor: "bg-amber-50 text-amber-700",
                        employee: "bg-teal-50 text-teal-700",
                      }}
                    />
                  ))}
                  <CellBadge value={null} />
                </div>
                <code className="block text-xs bg-neutral-50 p-3 text-neutral-700 rounded font-mono whitespace-pre">
                  {`const roleColors = {\n  owner: "bg-purple-50 text-purple-700",\n  subcontractor: "bg-blue-50 text-blue-700",\n};\nrender: (item) => <CellBadge value={item.role} colorMap={roleColors} />`}
                </code>
              </div>
            </div>

            {/* ── Count / Misc ── */}
            <div>
              <h3 className="text-lg font-sans font-light text-neutral-900 mb-1">Count & Misc Cells</h3>
              <p className="text-xs text-neutral-500 mb-4">For numeric indicators and row actions.</p>

              <div className="border border-neutral-200 bg-background p-6 mb-4">
                <p className="text-xs text-neutral-500 mb-3 font-mono">TableCountIndicator — small count pill (e.g. attachments, comments)</p>
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex items-center gap-2 text-xs text-neutral-500">Attachments <TableCountIndicator count={3} /></div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">Comments <TableCountIndicator count={12} /></div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">None <TableCountIndicator count={0} /></div>
                </div>
                <code className="block text-xs bg-neutral-50 p-3 text-neutral-700 rounded font-mono">
                  {`render: (item) => <TableCountIndicator count={item.attachmentCount} />`}
                </code>
              </div>

              <div className="border border-neutral-200 bg-background p-6">
                <p className="text-xs text-neutral-500 mb-3 font-mono">TableRowActionsMenu — ⋯ button with dropdown (click to open)</p>
                <div className="flex items-center gap-3 mb-4">
                  <TableRowActionsMenu items={[
                    { key: "edit", label: "Edit", onSelect: () => {} },
                    { key: "view", label: "View Details", onSelect: () => {} },
                    { key: "delete", label: "Delete", onSelect: () => {}, destructive: true },
                  ]} />
                  <span className="text-xs text-neutral-400">Click the ⋯ button</span>
                </div>
                <code className="block text-xs bg-neutral-50 p-3 text-neutral-700 rounded font-mono whitespace-pre">
                  {`render: (item) => (\n  <TableRowActionsMenu items={[\n    { key: "edit", label: "Edit", onSelect: () => onEdit(item) },\n    { key: "delete", label: "Delete", onSelect: () => onDelete(item.id), destructive: true },\n  ]} />\n)`}
                </code>
              </div>
            </div>

            {/* ── Forbidden Patterns ── */}
            <div>
              <h3 className="text-lg font-sans font-light text-neutral-900 mb-1">
                Forbidden Patterns
              </h3>
              <p className="text-xs text-neutral-500 mb-4">Never use these in table column definitions.</p>
              <div className="border border-red-100 bg-red-50/50 p-6 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-red-700 mb-2">Raw strings / no null handling</p>
                  <code className="block text-xs bg-red-100/70 p-2 rounded font-mono text-red-700">{`render: (item) => item.status`}</code>
                  <code className="block text-xs bg-red-100/70 p-2 rounded font-mono text-red-700 mt-1">{`render: (item) => item.amount?.toFixed(2)`}</code>
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-700 mb-2">Hardcoded colors or ad-hoc styling</p>
                  <code className="block text-xs bg-red-100/70 p-2 rounded font-mono text-red-700">{`render: (item) => <span className="text-green-600">{item.status}</span>`}</code>
                  <code className="block text-xs bg-red-100/70 p-2 rounded font-mono text-red-700 mt-1">{`render: (item) => <div className="truncate max-w-[200px]">{item.title}</div>`}</code>
                </div>
                <div>
                  <p className="text-xs font-semibold text-green-700 mb-2">Correct</p>
                  <code className="block text-xs bg-green-50 p-2 rounded font-mono text-green-700">{`render: (item) => <CellStatus value={item.status} />`}</code>
                  <code className="block text-xs bg-green-50 p-2 rounded font-mono text-green-700 mt-1">{`render: (item) => <CellCurrency value={item.amount} />`}</code>
                  <code className="block text-xs bg-green-50 p-2 rounded font-mono text-green-700 mt-1">{`render: (item) => <TruncatedCell value={item.title} maxWidth={240} />`}</code>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Reference Implementation */}
        <section className="mb-20">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-sans font-light tracking-tight text-neutral-900 mb-2">
              Reference Implementation
            </h2>
            <p className="text-sm text-neutral-500">
              The canonical design lives in the meetings detail page
            </p>
          </div>

          <div className="border border-neutral-200 bg-background p-8">
            <p className="text-sm text-neutral-700 mb-4">
              All styling patterns are based on the meetings detail page, which
              serves as the visual reference for the entire application.
            </p>
            <Link
              href="/60/meetings/01KCF4KC2B5DD8BP8STFVTZ3TS"
              className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:text-brand-dark transition-colors"
            >
              View Reference Page
              <ArrowLeft className="h-4 w-4 rotate-180" />
            </Link>
          </div>
        </section>
      </PageContainer>
    </div>
  );
}
