"use client";

import { useState } from "react";
import {
  FileText,
  FolderOpen,
  Info,
  LayoutDashboard,
  List,
  PenLine,
  Search,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

// DS barrel — all components from one path
import {
  // Layout
  PageShell,
  PageTabs,
  // Status
  StatusBadge,
  StatusDot,
  StatusText,
  // Data display
  KpiRow,
  DataTable,
  SectionHeader,
  Eyebrow,
  DateAvatar,
  AvatarStack,
  // Feedback & states
  EmptyState,
  Skeleton,
  Alert,
  AlertTitle,
  AlertDescription,
  Spinner,
  // Form components
  Button,
  Input,
  Textarea,
  Label,
  Checkbox,
  Switch,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  // Overlays
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  // Navigation
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  // Cards
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  // Table cell primitives
  CellText,
  CellLink,
  CellEmail,
  CellCurrency,
  CellNumber,
  CellPercent,
  CellDate,
  CellStatus,
  CellBadge,
  TableTagBadge,
  TableAvatarUsers,
  TableCountIndicator,
  TruncatedCell,
  // Misc
  Separator,
  Badge,
} from "@/components/ds";

import { PageTabsV2 } from "@/components/layout";

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const STATUSES = [
  "Draft",
  "Pending",
  "Approved",
  "Active",
  "Rejected",
  "Overdue",
  "Closed",
  "Archived",
  "In Progress",
  "Complete",
  "Not synced",
  "Submitted",
  "Cancelled",
  "Open",
] as const;

interface DemoRow {
  id: string;
  name: string;
  status: string;
  amount: number;
  date: string;
}

const TABLE_ROWS: DemoRow[] = [
  { id: "1", name: "Foundation Work", status: "Approved", amount: 245000, date: "2026-03-15" },
  { id: "2", name: "Steel Framing", status: "In Progress", amount: 182000, date: "2026-04-01" },
  { id: "3", name: "Electrical Rough-In", status: "Pending", amount: 67500, date: "2026-04-20" },
  { id: "4", name: "HVAC Installation", status: "Draft", amount: 134000, date: "2026-05-10" },
  { id: "5", name: "Concrete Pour", status: "Complete", amount: 89000, date: "2026-02-28" },
];

const TABLE_COLUMNS = [
  {
    key: "name",
    header: "Name",
    primary: true,
    render: (row: DemoRow) => row.name,
  },
  {
    key: "status",
    header: "Status",
    render: (row: DemoRow) => <StatusBadge status={row.status} />,
  },
  {
    key: "amount",
    header: "Amount",
    align: "right" as const,
    render: (row: DemoRow) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(row.amount),
  },
  {
    key: "date",
    header: "Date",
    render: (row: DemoRow) => row.date,
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function DesignSystemComponentsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [activeTabV2, setActiveTabV2] = useState("tab1");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [switchChecked, setSwitchChecked] = useState(true);
  const [checkboxChecked, setCheckboxChecked] = useState(true);

  return (
    <PageShell variant="content" title="Design System Components">
      <p className="text-sm text-muted-foreground">
        Living inventory of every component in the Alleato design system. Import
        from <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">@/components/ds</code> or{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">@/components/layout</code>.
      </p>

      {/* ================================================================== */}
      {/* SECTION 1: Layout Components */}
      {/* ================================================================== */}
      <Separator />
      <SectionHeader title="1. Layout Components" />

      {/* PageShell */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-foreground">PageShell</h3>
        <p className="text-sm text-muted-foreground">
          The one entry point for all page layouts. Every new page must use one of these variants.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {([
            { variant: "dashboard", maxWidth: "full-width", useCase: "Home / overview pages with KPI cards + charts", example: "/760/home" },
            { variant: "table", maxWidth: "full-width", useCase: "Data table pages (UnifiedTablePage inside)", example: "/760/direct-costs" },
            { variant: "form", maxWidth: "max-w-5xl", useCase: "Create / edit forms with optional back button", example: "/760/commitments/new" },
            { variant: "detail", maxWidth: "max-w-6xl", useCase: "Record detail pages with tabs, line items", example: "/760/commitments/686736b1-b1c8-4589-aded-369686c9d05c" },
            { variant: "content", maxWidth: "max-w-4xl", useCase: "Settings / docs / read-heavy pages", example: "/components" },
          ] as const).map((item) => (
            <div
              key={item.variant}
              className="rounded-md bg-muted/50 p-4"
            >
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-xs">
                  {item.variant}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {item.maxWidth}
              </p>
              <p className="mt-1 text-sm text-foreground">{item.useCase}</p>
              <a href={item.example} className="mt-2 inline-block text-xs text-primary hover:underline">
                View example &rarr;
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* PageContainer */}
      <div className="space-y-2">
        <h3 className="text-base font-semibold text-foreground">PageContainer</h3>
        <p className="text-sm text-muted-foreground">
          Low-level mx-auto wrapper with responsive padding:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">px-3 sm:px-5 lg:px-7</code>.
          Used internally by PageShell. Rarely needed directly.
        </p>
      </div>

      {/* PageHeader */}
      <div className="space-y-2">
        <h3 className="text-base font-semibold text-foreground">PageHeader / ProjectPageHeader</h3>
        <p className="text-sm text-muted-foreground">
          Unified header with title, description, optional actions and status badge. Shown here inside PageShell above.
        </p>
      </div>

      {/* PageTabs */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">PageTabs (border-bottom style)</h3>
        <PageTabs
          variant="inline"
          tabs={[
            { label: "Overview", href: "overview", count: 3, isActive: activeTab === "overview" },
            { label: "Details", href: "details", isActive: activeTab === "details" },
            { label: "History", href: "history", count: 12, isActive: activeTab === "history" },
            { label: "Settings", href: "settings", isActive: activeTab === "settings" },
          ]}
          onTabClick={(href) => setActiveTab(href)}
        />
        <p className="text-xs text-muted-foreground">
          Site standard. Uses <code className="rounded bg-muted px-1 py-0.5 font-mono">onTabClick</code> for local state or router.push for real navigation.
        </p>
      </div>

      {/* PageTabsV2 */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">PageTabsV2 (pill style)</h3>
        <div className="inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted/50 p-[3px]">
          {["Tab 1", "Tab 2", "Tab 3"].map((label, i) => {
            const key = `tab${i + 1}`;
            const isActive = activeTabV2 === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTabV2(key)}
                className={`inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md border px-4 py-1 text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-background text-foreground shadow-sm border-border"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Alternative pill-style variant. Imported from <code className="rounded bg-muted px-1 py-0.5 font-mono">@/components/layout</code>.
        </p>
      </div>

      {/* ================================================================== */}
      {/* SECTION 2: Status Components */}
      {/* ================================================================== */}
      <Separator />
      <SectionHeader title="2. Status Components" />

      {/* StatusBadge */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">StatusBadge</h3>
        <p className="text-sm text-muted-foreground">
          Pass a raw status string — colors are resolved automatically via STATUS_TO_VARIANT map.
        </p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </div>

      {/* StatusDot */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">StatusDot</h3>
        <p className="text-sm text-muted-foreground">
          Minimal inline dot + label for tables and compact views.
        </p>
        <div className="flex flex-wrap gap-4">
          {STATUSES.map((s) => (
            <StatusDot key={s} status={s} />
          ))}
        </div>
      </div>

      {/* StatusText */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">StatusText</h3>
        <p className="text-sm text-muted-foreground">
          Plain muted text for non-emphasized statuses.
        </p>
        <div className="flex flex-wrap gap-4">
          {STATUSES.map((s) => (
            <StatusText key={s} status={s} />
          ))}
        </div>
      </div>

      {/* ================================================================== */}
      {/* SECTION 3: Data Display */}
      {/* ================================================================== */}
      <Separator />
      <SectionHeader title="3. Data Display" />

      {/* KpiRow */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">KpiBlock &amp; KpiRow</h3>
        <KpiRow
          metrics={[
            { label: "Total Budget", value: "$2.4M", delta: { value: "3.2%", positive: true }, context: "vs. last quarter" },
            { label: "Committed", value: "$1.8M", context: "75% of budget" },
            { label: "Pending", value: "$340K", delta: { value: "12%", positive: false }, context: "2 pending COs" },
            { label: "Remaining", value: "$260K", context: "10.8% available" },
          ]}
        />
      </div>

      {/* DataTable */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">DataTable</h3>
        <DataTable columns={TABLE_COLUMNS} rows={TABLE_ROWS} />
      </div>

      {/* SectionHeader */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">SectionHeader</h3>
        <div className="rounded-md bg-muted/30 p-4">
          <SectionHeader
            title="Line Items"
            count={12}
            action={{ label: "View all", onClick: () => {} }}
          />
          <p className="text-sm text-muted-foreground">
            Content beneath the section header goes here.
          </p>
        </div>
      </div>

      {/* Eyebrow */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Eyebrow</h3>
        <Eyebrow>SECTION LABEL</Eyebrow>
        <p className="text-sm text-muted-foreground">
          11px uppercase tracking-wider. Tier 1 text hierarchy.
        </p>
      </div>

      {/* DateAvatar */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">DateAvatar</h3>
        <div className="flex items-center gap-6">
          <DateAvatar date="2026-03-26" size="md" />
          <DateAvatar date="2026-12-25" size="sm" />
        </div>
      </div>

      {/* AvatarStack */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">AvatarStack</h3>
        <div className="flex items-center gap-6">
          <AvatarStack avatars={["JD", "MH", "BC", "TS"]} max={4} size="md" />
          <AvatarStack avatars={["JD", "MH", "BC", "TS"]} max={3} size="sm" />
        </div>
        <p className="text-sm text-muted-foreground">
          Overlapping avatar initials. Props: avatars (string[]), max, size (sm | md).
        </p>
      </div>

      {/* ================================================================== */}
      {/* SECTION 4: Feedback & States */}
      {/* ================================================================== */}
      <Separator />
      <SectionHeader title="4. Feedback & States" />

      {/* EmptyState */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">EmptyState</h3>
        <EmptyState
          icon={<FolderOpen />}
          title="No contracts yet"
          description="Create your first contract to start tracking commitments and change orders."
          action={{ label: "New Contract", onClick: () => {} }}
        />
      </div>

      {/* Skeleton */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Skeleton</h3>
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>

      {/* Alert */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Alert — All Variants</h3>
        <div className="grid gap-3">
          <Alert>
            <Info />
            <AlertTitle>Default</AlertTitle>
            <AlertDescription>
              Standard informational alert with neutral styling.
            </AlertDescription>
          </Alert>
          <Alert variant="info">
            <Info />
            <AlertTitle>Info</AlertTitle>
            <AlertDescription>
              Contextual information the user should be aware of.
            </AlertDescription>
          </Alert>
          <Alert variant="success">
            <CheckCircle />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              Operation completed successfully.
            </AlertDescription>
          </Alert>
          <Alert variant="warning">
            <AlertTriangle />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Something needs attention but is not critical.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <XCircle />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Something went wrong. Please try again.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Spinner */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Spinner</h3>
        <div className="flex items-center gap-4">
          <Spinner className="size-4" />
          <Spinner className="size-6" />
          <Spinner className="size-8" />
          <span className="text-sm text-muted-foreground">Sizes: 16px, 24px, 32px</span>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SECTION 5: Form Components */}
      {/* ================================================================== */}
      <Separator />
      <SectionHeader title="5. Form Components" />

      {/* Buttons */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-foreground">Button — All Variants &amp; Sizes</h3>

        {/* Variant grid */}
        <div className="space-y-3">
          <Eyebrow>Variants (default size)</Eyebrow>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <Button variant="default">Default</Button>
              <span className="text-[10px] text-muted-foreground">default</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button variant="outline">Outline</Button>
              <span className="text-[10px] text-muted-foreground">outline</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button variant="ghost">Ghost</Button>
              <span className="text-[10px] text-muted-foreground">ghost</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button variant="destructive">Destructive</Button>
              <span className="text-[10px] text-muted-foreground">destructive</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button variant="secondary">Secondary</Button>
              <span className="text-[10px] text-muted-foreground">secondary</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button variant="link">Link</Button>
              <span className="text-[10px] text-muted-foreground">link</span>
            </div>
          </div>
        </div>

        {/* Size grid */}
        <div className="space-y-3">
          <Eyebrow>Text Button Sizes</Eyebrow>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col items-center gap-1">
              <Button size="xs">Extra Small</Button>
              <span className="text-[10px] text-muted-foreground">xs (28px)</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button size="sm">Small</Button>
              <span className="text-[10px] text-muted-foreground">sm (32px)</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button>Default</Button>
              <span className="text-[10px] text-muted-foreground">default (36px)</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button size="lg">Large</Button>
              <span className="text-[10px] text-muted-foreground">lg (40px)</span>
            </div>
          </div>
        </div>

        {/* Icon button sizes */}
        <div className="space-y-3">
          <Eyebrow>Icon Button Sizes</Eyebrow>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col items-center gap-1">
              <Button variant="outline" size="icon-xs"><Search /></Button>
              <span className="text-[10px] text-muted-foreground">icon-xs (28px)</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button variant="outline" size="icon-sm"><Search /></Button>
              <span className="text-[10px] text-muted-foreground">icon-sm (32px)</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button variant="outline" size="icon"><Search /></Button>
              <span className="text-[10px] text-muted-foreground">icon (36px)</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button variant="outline" size="icon-lg"><Search /></Button>
              <span className="text-[10px] text-muted-foreground">icon-lg (40px)</span>
            </div>
          </div>
        </div>

        {/* Matched pairs */}
        <div className="space-y-3">
          <Eyebrow>Matched Pairs (same height)</Eyebrow>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-md bg-muted/30 px-3 py-2">
              <Button size="sm">Small Text</Button>
              <Button variant="outline" size="icon-sm"><Search /></Button>
              <span className="ml-2 text-[10px] text-muted-foreground">both 32px</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-muted/30 px-3 py-2">
              <Button>Default Text</Button>
              <Button variant="outline" size="icon"><Search /></Button>
              <span className="ml-2 text-[10px] text-muted-foreground">both 36px</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-foreground">Form Fields</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="demo-input">Input</Label>
            <Input id="demo-input" placeholder="Enter text..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-select">Select</Label>
            <Select>
              <SelectTrigger id="demo-select">
                <SelectValue placeholder="Choose option..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a">Option A</SelectItem>
                <SelectItem value="b">Option B</SelectItem>
                <SelectItem value="c">Option C</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="demo-textarea">Textarea</Label>
            <Textarea id="demo-textarea" placeholder="Enter description..." rows={3} />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="demo-checkbox"
                checked={checkboxChecked}
                onCheckedChange={(v) => setCheckboxChecked(v === true)}
              />
              <Label htmlFor="demo-checkbox">Checkbox</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="demo-switch"
                checked={switchChecked}
                onCheckedChange={setSwitchChecked}
              />
              <Label htmlFor="demo-switch">Switch</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>RadioGroup</Label>
            <RadioGroup defaultValue="option1">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="option1" id="r1" />
                <Label htmlFor="r1">Option 1</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="option2" id="r2" />
                <Label htmlFor="r2">Option 2</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SECTION 6: Overlays */}
      {/* ================================================================== */}
      <Separator />
      <SectionHeader title="6. Overlays" />

      <div className="flex flex-wrap gap-3">
        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog Title</DialogTitle>
              <DialogDescription>
                This is a demo dialog. Dialogs are modal overlays for confirmations, forms, and details.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline">Open Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Sheet Title</SheetTitle>
              <SheetDescription>
                Sheets slide in from the edge. Use for detail panels, filters, and secondary forms.
              </SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>

        {/* Tooltip */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Hover for Tooltip</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>This is a tooltip</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Open Popover</Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Popover Content</h4>
              <p className="text-sm text-muted-foreground">
                Popovers are for non-modal content like filters, settings pickers, and contextual info.
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* ================================================================== */}
      {/* SECTION 7: Navigation */}
      {/* ================================================================== */}
      <Separator />
      <SectionHeader title="7. Navigation" />

      {/* Tabs (shadcn) */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Tabs (shadcn pill-style)</h3>
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="pt-4">
            <p className="text-sm text-muted-foreground">General settings content.</p>
          </TabsContent>
          <TabsContent value="notifications" className="pt-4">
            <p className="text-sm text-muted-foreground">Notification preferences content.</p>
          </TabsContent>
          <TabsContent value="security" className="pt-4">
            <p className="text-sm text-muted-foreground">Security settings content.</p>
          </TabsContent>
        </Tabs>
      </div>

      {/* DropdownMenu */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">DropdownMenu</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <PenLine />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileText />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Breadcrumb */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Breadcrumb</h3>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Projects</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Vermillion Rise</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Budget</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* ================================================================== */}
      {/* SECTION 8: Cards */}
      {/* ================================================================== */}
      <Separator />
      <SectionHeader title="8. Cards" />

      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>
            Cards use bg-card with border-border. Only shadow-xs or shadow-sm allowed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">
            Card content goes here. Use Card for grouping related information.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" size="sm">Cancel</Button>
          <Button size="sm">Save</Button>
        </CardFooter>
      </Card>

      {/* ================================================================== */}
      {/* SECTION 9: Table Cell Primitives */}
      {/* ================================================================== */}
      <Separator />
      <SectionHeader title="9. Table Cell Primitives" />

      <p className="text-sm text-muted-foreground">
        Use these in column <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">render</code> functions.
        Import from <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">@/components/ds</code>.
      </p>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b border-border">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Component
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Live Example
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr className="hover:bg-muted/50">
              <td className="px-4 py-2.5 font-medium text-foreground">CellText</td>
              <td className="px-4 py-2.5"><CellText value="Plain text value" /></td>
            </tr>
            <tr className="hover:bg-muted/50">
              <td className="px-4 py-2.5 font-medium text-foreground">CellText (empty)</td>
              <td className="px-4 py-2.5"><CellText value={null} /></td>
            </tr>
            <tr className="hover:bg-muted/50">
              <td className="px-4 py-2.5 font-medium text-foreground">TruncatedCell</td>
              <td className="px-4 py-2.5"><TruncatedCell value="This is a very long text that will be truncated with an ellipsis and show a tooltip on hover" maxWidth={200} /></td>
            </tr>
            <tr className="hover:bg-muted/50">
              <td className="px-4 py-2.5 font-medium text-foreground">CellLink</td>
              <td className="px-4 py-2.5"><CellLink value="Acme Corp" href="#" /></td>
            </tr>
            <tr className="hover:bg-muted/50">
              <td className="px-4 py-2.5 font-medium text-foreground">CellEmail</td>
              <td className="px-4 py-2.5"><CellEmail value="john@example.com" /></td>
            </tr>
            <tr className="hover:bg-muted/50">
              <td className="px-4 py-2.5 font-medium text-foreground">CellCurrency</td>
              <td className="px-4 py-2.5"><CellCurrency value={245000} /></td>
            </tr>
            <tr className="hover:bg-muted/50">
              <td className="px-4 py-2.5 font-medium text-foreground">CellNumber</td>
              <td className="px-4 py-2.5"><CellNumber value={1234} /></td>
            </tr>
            <tr className="hover:bg-muted/50">
              <td className="px-4 py-2.5 font-medium text-foreground">CellPercent</td>
              <td className="px-4 py-2.5"><CellPercent value={87.5} /></td>
            </tr>
            <tr className="hover:bg-muted/50">
              <td className="px-4 py-2.5 font-medium text-foreground">CellDate</td>
              <td className="px-4 py-2.5"><CellDate value="2026-03-26" /></td>
            </tr>
            <tr className="hover:bg-muted/50">
              <td className="px-4 py-2.5 font-medium text-foreground">CellStatus</td>
              <td className="px-4 py-2.5"><CellStatus value="Approved" /></td>
            </tr>
            <tr className="hover:bg-muted/50">
              <td className="px-4 py-2.5 font-medium text-foreground">CellBadge</td>
              <td className="px-4 py-2.5">
                <CellBadge
                  value="contractor"
                  colorMap={{ contractor: "bg-blue-50 text-blue-600", vendor: "bg-purple-50 text-purple-600" }}
                />
              </td>
            </tr>
            <tr className="hover:bg-muted/50">
              <td className="px-4 py-2.5 font-medium text-foreground">TableTagBadge</td>
              <td className="px-4 py-2.5"><TableTagBadge label="Structural" variant="outline" /></td>
            </tr>
            <tr className="hover:bg-muted/50">
              <td className="px-4 py-2.5 font-medium text-foreground">TableAvatarUsers</td>
              <td className="px-4 py-2.5"><TableAvatarUsers users={["john@acme.com", "mary@acme.com", "bob@acme.com"]} /></td>
            </tr>
            <tr className="hover:bg-muted/50">
              <td className="px-4 py-2.5 font-medium text-foreground">TableCountIndicator</td>
              <td className="px-4 py-2.5"><TableCountIndicator count={7} /></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ================================================================== */}
      {/* SECTION 10: Missing Components */}
      {/* ================================================================== */}
      <Separator />
      <SectionHeader title="10. Missing Components (Not Yet Built)" />

      <div className="rounded-md bg-destructive/5 p-6">
        <div className="mb-4 flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm font-semibold">Components that need to be created</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              name: "DetailActions",
              desc: "Standardized action icons (edit, delete, share) for detail page headers",
              gap: "Each detail page hand-rolls its own action buttons",
            },
            {
              name: "FormActions",
              desc: "Standardized cancel/save button row for form footers",
              gap: "Every form reimplements the same cancel + save pattern",
            },
            {
              name: "EditModeActions",
              desc: "View/edit toggle pattern with save/cancel states",
              gap: "Inline editing UX is inconsistent across detail pages",
            },
            {
              name: "SplitButton",
              desc: "Primary action + dropdown of secondary actions in one button",
              gap: "No cohesive multi-action button exists",
            },
            {
              name: "DetailField",
              desc: "Label + value pair for read-only detail views",
              gap: "Detail pages use ad-hoc label/value markup",
            },
            {
              name: "DetailFieldGrid",
              desc: "Responsive grid layout for DetailField groups",
              gap: "Detail field grids are hand-rolled with inconsistent column counts",
            },
            {
              name: "ConfirmDeleteDialog",
              desc: "Pre-built destructive confirmation dialog with standard copy",
              gap: "Delete confirmations are reimplemented per feature",
            },
            {
              name: "BackButton",
              desc: "Standardized back navigation with consistent icon and label",
              gap: "Back buttons vary in style and placement",
            },
            {
              name: "PageShell tabs integration",
              desc: "A tabs prop on PageShell for built-in tab bar below header",
              gap: "Tabs are manually placed between header and content",
            },
            {
              name: "InfoAlert",
              desc: "Lightweight info message without Alert overhead",
              gap: "Informational messages use inconsistent markup",
            },
          ].map((item) => (
            <div key={item.name} className="rounded-md bg-card p-3">
              <p className="text-sm font-semibold text-foreground">{item.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
              <p className="mt-1 text-xs text-destructive/80">Gap: {item.gap}</p>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
