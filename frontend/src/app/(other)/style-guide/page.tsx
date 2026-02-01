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
import {
  PageHeader,
  SectionHeader,
  StatCard,
  ContentCard,
  EmptyState,
} from "@/components/design-system";

export default function StyleGuidePage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-[1800px] mx-auto px-6 md:px-10 lg:px-12 py-12">
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
              <SectionHeader>Section Name</SectionHeader>
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
            <StatCard label="Total Meetings" value={42} icon={Calendar} />
            <StatCard
              label="Active Tasks"
              value={18}
              icon={FileText}
              trend={{ value: "+12%", positive: true }}
            />
            <StatCard label="With Recordings" value={35} icon={Video} />
            <StatCard label="Avg. Participants" value={8} icon={User} />
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
            <ContentCard
              title="Project Kickoff Meeting"
              description="Discussed project timeline, deliverables, and team responsibilities. Key decisions made regarding technology stack and architecture."
              metadata={[
                { icon: Calendar, label: "Dec 15, 2024" },
                { icon: User, label: "8 participants" },
                { icon: Clock, label: "45 minutes" },
              ]}
              badge="Complete"
            />
            <ContentCard
              title="Budget Review Session"
              description="Quarterly budget review with detailed analysis of spending patterns and forecast adjustments."
              metadata={[
                { icon: Calendar, label: "Dec 12, 2024" },
                { icon: User, label: "5 participants" },
              ]}
            />
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
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="h-4 w-4 text-brand" />
                <SectionHeader>Date</SectionHeader>
              </div>
              <p className="text-base font-light text-neutral-900">
                Friday, December 15, 2024
              </p>
            </div>

            <div className="border border-neutral-200 bg-background p-6">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="h-4 w-4 text-brand" />
                <SectionHeader>Duration</SectionHeader>
              </div>
              <p className="text-base font-light text-neutral-900">
                45 minutes
              </p>
            </div>

            <div className="border border-neutral-200 bg-background p-6">
              <div className="flex items-center gap-3 mb-3">
                <User className="h-4 w-4 text-brand" />
                <SectionHeader>Participants</SectionHeader>
              </div>
              <p className="text-base font-light text-neutral-900">8 people</p>
            </div>

            <div className="border border-neutral-200 bg-background p-6">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="h-4 w-4 text-brand" />
                <SectionHeader>Type</SectionHeader>
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
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-neutral-700 leading-relaxed">
                <span className="text-brand mt-0.5">•</span>
                <span>
                  Finalize project timeline and key milestones for Q1 delivery
                </span>
              </li>
              <li className="flex items-start gap-3 text-sm text-neutral-700 leading-relaxed">
                <span className="text-brand mt-0.5">•</span>
                <span>Review and approve technology stack selection</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-neutral-700 leading-relaxed">
                <span className="text-brand mt-0.5">•</span>
                <span>Assign team members to specific work packages</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-neutral-700 leading-relaxed">
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
              <div className="flex items-center gap-2 mb-3">
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
              <div className="flex items-center gap-2 mb-3">
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
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
                <h3 className="text-sm font-semibold text-amber-700">RISKS</h3>
              </div>
              <p className="text-sm text-neutral-700">
                Use amber color for risks and warnings
              </p>
            </div>

            <div className="border border-neutral-200 bg-background p-6">
              <div className="flex items-center gap-2 mb-3">
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
            icon={Calendar}
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
                  Small gap (gap-2, gap-3)
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
                <p className="text-xs text-neutral-500 mb-3">Section spacing</p>
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
                <code className="block bg-neutral-50 p-3 text-neutral-700 rounded">
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
                <code className="block bg-neutral-50 p-3 text-neutral-700 rounded">
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
                <code className="block bg-neutral-50 p-3 text-neutral-700 rounded">
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
      </div>
    </div>
  );
}
