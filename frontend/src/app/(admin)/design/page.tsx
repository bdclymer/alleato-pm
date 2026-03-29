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
  ChevronsUpDown,
  Calculator,
  Smile,
  CalendarIcon,
  Bold,
  Italic,
  Underline,
  User,
  CreditCard,
} from "lucide-react";

// DS barrel — all components from one path
import {
  // Layout
  PageShell,
  PageTabs,
  Separator,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  ScrollArea,
  ScrollBar,
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
  Progress,
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
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
  Slider,
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
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
  Badge,
} from "@/components/ds";

import { PageTabsV2 } from "@/components/layout";
import { SimplePagination } from "@/components/ui/pagination";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar } from "@/components/ui/calendar";
import { NumberInput } from "@/components/ui/number-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

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
  const [paginationPage, setPaginationPage] = useState(1);
  const [collapsibleOpen, setCollapsibleOpen] = useState(false);
  const [sliderValue, setSliderValue] = useState([33]);
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date());
  const [numberInputValue, setNumberInputValue] = useState("");

  return (
    <PageShell variant="content" title="Design System">
      <p className="text-sm text-muted-foreground">
        Living inventory of every design token and component in the Alleato design system. Import
        from <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">@/components/ds</code> or{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">@/components/layout</code>.
      </p>

      {/* ================================================================== */}
      {/* TABLE OF CONTENTS                                                    */}
      {/* ================================================================== */}
      <nav className="sticky top-0 z-10 -mx-1 rounded-lg border border-border bg-card/95 px-4 py-3 backdrop-blur-sm shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jump to</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
          {[
            { href: "#tokens-colors", label: "Colors" },
            { href: "#tokens-typography", label: "Typography" },
            { href: "#tokens-spacing", label: "Spacing" },
            { href: "#tokens-radius", label: "Radius" },
            { href: "#tokens-shadows", label: "Shadows" },
            { href: "#tokens-motion", label: "Motion" },
            { href: "#section-layout", label: "1. Layout" },
            { href: "#section-status", label: "2. Status" },
            { href: "#section-data", label: "3. Data Display" },
            { href: "#section-feedback", label: "4. Feedback" },
            { href: "#section-forms", label: "5. Forms" },
            { href: "#section-overlays", label: "6. Overlays" },
            { href: "#section-navigation", label: "7. Navigation" },
            { href: "#section-cards", label: "8. Cards" },
            { href: "#section-cells", label: "9. Cell Primitives" },
            { href: "#section-missing", label: "10. Missing" },
          ].map(({ href, label }) => (
            <a key={href} href={href} className="text-muted-foreground transition-colors hover:text-primary">
              {label}
            </a>
          ))}
        </div>
      </nav>

      {/* ================================================================== */}
      {/* SECTION 0: DESIGN TOKENS                                            */}
      {/* ================================================================== */}

      {/* ── COLORS ────────────────────────────────────────────────────────── */}
      <div id="tokens-colors" className="scroll-mt-20 space-y-6">
        <SectionHeader title="Colors" />

        {/* Background tokens */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Backgrounds</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {[
              { token: "bg-background", label: "background", desc: "Page bg" },
              { token: "bg-card", label: "card", desc: "Card / elevated surface" },
              { token: "bg-muted", label: "muted", desc: "Subtle / hover" },
              { token: "bg-accent", label: "accent", desc: "Active / selected" },
              { token: "bg-popover", label: "popover", desc: "Dropdowns / modals" },
              { token: "bg-primary", label: "primary", desc: "Primary action" },
              { token: "bg-secondary", label: "secondary", desc: "Secondary action" },
              { token: "bg-destructive", label: "destructive", desc: "Delete / danger" },
            ].map(({ token, label, desc }) => (
              <div key={token} className="overflow-hidden rounded-md border border-border">
                <div className={`${token} h-12 w-full`} />
                <div className="bg-card p-2">
                  <code className="block text-xs font-mono text-foreground">{token}</code>
                  <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Text tokens */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Text</h3>
          <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
            {[
              { token: "text-foreground", sample: "Primary text — headings & body" },
              { token: "text-muted-foreground", sample: "Secondary text — descriptions & labels" },
              { token: "text-primary", sample: "Brand accent — links & active nav" },
              { token: "text-destructive", sample: "Error text — destructive actions" },
              { token: "text-card-foreground", sample: "Text on card surfaces" },
            ].map(({ token, sample }) => (
              <div key={token} className="flex items-center justify-between bg-card px-4 py-2.5">
                <span className={`${token} text-sm`}>{sample}</span>
                <code className="ml-4 shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">{token}</code>
              </div>
            ))}
          </div>
        </div>

        {/* Border tokens */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Borders</h3>
          <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
            {[
              { token: "border-border", desc: "Default borders (use sparingly)" },
              { token: "border-input", desc: "Form input borders" },
              { token: "border-ring", desc: "Focus ring color" },
            ].map(({ token, desc }) => (
              <div key={token} className="flex items-center gap-4 bg-card px-4 py-2.5">
                <div className={`h-6 w-16 rounded border-2 ${token} shrink-0`} />
                <div className="flex-1">
                  <code className="text-xs font-mono text-foreground">{token}</code>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart colors */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Chart Colors</h3>
          <div className="flex gap-3 flex-wrap">
            {[
              { cls: "bg-[hsl(var(--chart-1))]", label: "chart-1" },
              { cls: "bg-[hsl(var(--chart-2))]", label: "chart-2" },
              { cls: "bg-[hsl(var(--chart-3))]", label: "chart-3" },
              { cls: "bg-[hsl(var(--chart-4))]", label: "chart-4" },
              { cls: "bg-[hsl(var(--chart-5))]", label: "chart-5" },
            ].map(({ cls, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`${cls} h-6 w-6 rounded-full border border-border`} />
                <code className="text-xs font-mono text-muted-foreground">--{label}</code>
              </div>
            ))}
          </div>
        </div>

        {/* Status colors */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Status Colors</h3>
          <p className="text-xs text-muted-foreground">Always use <code className="rounded bg-muted px-1 font-mono">StatusBadge</code> — never map these manually.</p>
          <div className="flex flex-wrap gap-2">
            {["Draft", "Pending", "Approved", "Active", "Rejected", "Overdue", "Closed", "In Progress", "Complete", "Submitted", "Cancelled", "Open"].map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
        </div>

        {/* CSS variable reference */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">CSS Variable Reference</h3>
          <p className="text-xs text-muted-foreground">Defined in <code className="font-mono">globals.css</code>. Never use raw values — always use Tailwind tokens.</p>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Token</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">CSS Var</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Light</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Dark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { token: "primary", var: "--primary", light: "260 37% 59%", dark: "245 58% 62%" },
                  { token: "background", var: "--background", light: "0 0% 100%", dark: "240 6% 9%" },
                  { token: "card", var: "--card", light: "0 0% 100%", dark: "240 5% 13%" },
                  { token: "muted", var: "--muted", light: "216 100% 99%", dark: "240 5% 16%" },
                  { token: "accent", var: "--accent", light: "260 30% 95%", dark: "260 30% 20%" },
                  { token: "foreground", var: "--foreground", light: "240 6% 12%", dark: "0 0% 92%" },
                  { token: "muted-foreground", var: "--muted-foreground", light: "240 4% 46%", dark: "0 0% 65%" },
                  { token: "destructive", var: "--destructive", light: "0 72% 51%", dark: "0 72% 51%" },
                  { token: "border", var: "--border", light: "0 0% 90%", dark: "240 5% 19%" },
                  { token: "ring", var: "--ring", light: "260 37% 59%", dark: "245 58% 62%" },
                ].map(({ token, var: cssVar, light, dark }) => (
                  <tr key={token} className="bg-card">
                    <td className="px-3 py-2 font-mono text-foreground">{token}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{cssVar}</td>
                    <td className="px-3 py-2 text-muted-foreground">{light}</td>
                    <td className="px-3 py-2 text-muted-foreground">{dark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Separator />

      {/* ── TYPOGRAPHY ────────────────────────────────────────────────────── */}
      <div id="tokens-typography" className="scroll-mt-20 space-y-6">
        <SectionHeader title="Typography" />

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Font Stack</h3>
          <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
            <div className="bg-card px-4 py-3">
              <p className="font-sans text-base text-foreground">The quick brown fox jumps — Inter (sans)</p>
              <code className="text-xs text-muted-foreground font-mono">font-sans · Inter Variable</code>
            </div>
            <div className="bg-card px-4 py-3">
              <p className="font-mono text-base text-foreground">const value = 42; // JetBrains Mono</p>
              <code className="text-xs text-muted-foreground font-mono">font-mono · JetBrains Mono</code>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Font Sizes</h3>
          <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
            {[
              { cls: "text-2xl font-semibold tracking-tight", token: "text-2xl", desc: "24px · Page titles (rare)" },
              { cls: "text-xl font-semibold tracking-tight", token: "text-xl", desc: "20px · Page sub-headings" },
              { cls: "text-lg font-semibold", token: "text-lg", desc: "18px · Section headings (h2)" },
              { cls: "text-base", token: "text-base", desc: "16px · Body text, form inputs" },
              { cls: "text-sm", token: "text-sm", desc: "14px · Secondary text, table cells" },
              { cls: "text-xs", token: "text-xs", desc: "12px · Metadata, timestamps, fine print" },
            ].map(({ cls, token, desc }) => (
              <div key={token} className="flex items-center justify-between bg-card px-4 py-2.5">
                <span className={`${cls} text-foreground`}>The quick brown fox</span>
                <div className="ml-4 shrink-0 text-right">
                  <code className="block text-xs font-mono text-muted-foreground">{token}</code>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Font Weights</h3>
          <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
            {[
              { cls: "font-light", token: "font-light", desc: "Large numbers, KPI values" },
              { cls: "font-normal", token: "font-normal", desc: "Body text, descriptions" },
              { cls: "font-medium", token: "font-medium", desc: "Labels, table headers, nav" },
              { cls: "font-semibold", token: "font-semibold", desc: "Section headings, emphasis" },
            ].map(({ cls, token, desc }) => (
              <div key={token} className="flex items-center justify-between bg-card px-4 py-2.5">
                <span className={`${cls} text-base text-foreground`}>The quick brown fox</span>
                <div className="ml-4 shrink-0 text-right">
                  <code className="block text-xs font-mono text-muted-foreground">{token}</code>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Letter Spacing</h3>
          <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
            {[
              { cls: "tracking-tight", token: "tracking-tight", desc: "−0.025em · Default headings" },
              { cls: "tracking-normal", token: "tracking-normal", desc: "0 · Body text" },
              { cls: "tracking-wider", token: "tracking-wider", desc: "0.05em · Eyebrow labels" },
              { cls: "tracking-widest", token: "tracking-widest", desc: "0.1em · Uppercase micro labels" },
            ].map(({ cls, token, desc }) => (
              <div key={token} className="flex items-center justify-between bg-card px-4 py-2.5">
                <span className={`${cls} text-sm font-medium text-foreground`}>ALLEATO DESIGN SYSTEM</span>
                <div className="ml-4 shrink-0 text-right">
                  <code className="block text-xs font-mono text-muted-foreground">{token}</code>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* ── SPACING ───────────────────────────────────────────────────────── */}
      <div id="tokens-spacing" className="scroll-mt-20 space-y-6">
        <SectionHeader title="Spacing" />
        <p className="text-sm text-muted-foreground">8px grid system. Every value is a multiple of 8px (4px for tight situations).</p>

        <div className="space-y-2">
          {[
            { token: "gap-1 / p-1", px: "4px", name: "micro", use: "Icon-to-text gap", width: "w-1" },
            { token: "gap-2 / p-2", px: "8px", name: "tight", use: "Badge + text, label + input", width: "w-2" },
            { token: "gap-3 / p-3", px: "12px", name: "compact", use: "Compact list items", width: "w-3" },
            { token: "gap-4 / p-4", px: "16px", name: "base", use: "Default item spacing within a section", width: "w-4" },
            { token: "gap-6 / p-6", px: "24px", name: "comfortable", use: "Form field spacing", width: "w-6" },
            { token: "gap-8 / p-8", px: "32px", name: "section", use: "Between page sections", width: "w-8" },
            { token: "gap-12 / p-12", px: "48px", name: "break", use: "Major visual breaks", width: "w-12" },
          ].map(({ token, px, name, use, width }) => (
            <div key={token} className="flex items-center gap-4">
              <div className="flex h-5 shrink-0 items-center" style={{ width: "3rem" }}>
                <div className={`${width} h-4 rounded-sm bg-primary/30`} />
              </div>
              <div className="w-16 shrink-0">
                <span className="text-xs font-medium text-foreground">{px}</span>
                <span className="ml-1 text-xs text-muted-foreground">({name})</span>
              </div>
              <code className="w-32 shrink-0 text-xs font-mono text-muted-foreground">{token}</code>
              <span className="text-xs text-muted-foreground">{use}</span>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* ── BORDER RADIUS ─────────────────────────────────────────────────── */}
      <div id="tokens-radius" className="scroll-mt-20 space-y-6">
        <SectionHeader title="Border Radius" />
        <div className="flex flex-wrap gap-4">
          {[
            { token: "rounded-sm", cls: "rounded-sm", label: "rounded-sm", use: "Tight UI, tags" },
            { token: "rounded-md", cls: "rounded-md", label: "rounded-md", use: "Inputs, buttons (default)" },
            { token: "rounded-lg", cls: "rounded-lg", label: "rounded-lg", use: "Cards, modals" },
            { token: "rounded-xl", cls: "rounded-xl", label: "rounded-xl", use: "Large panels" },
            { token: "rounded-full", cls: "rounded-full", label: "rounded-full", use: "Avatars, badges, pills" },
          ].map(({ token, cls, label, use }) => (
            <div key={token} className="flex flex-col items-center gap-2">
              <div className={`${cls} h-16 w-16 border-2 border-primary/50 bg-primary/10`} />
              <code className="text-xs font-mono text-muted-foreground">{label}</code>
              <span className="text-xs text-muted-foreground">{use}</span>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* ── SHADOWS ───────────────────────────────────────────────────────── */}
      <div id="tokens-shadows" className="scroll-mt-20 space-y-6">
        <SectionHeader title="Shadows" />
        <p className="text-sm text-muted-foreground">Only two shadow levels. Most elements have NO shadow — tonal elevation replaces them.</p>
        <div className="flex flex-wrap gap-6">
          {[
            { token: "shadow-none", cls: "shadow-none", label: "(none)", use: "Most elements" },
            { token: "shadow-xs", cls: "shadow-xs", label: "shadow-xs", use: "Form inputs, select triggers" },
            { token: "shadow-sm", cls: "shadow-sm", label: "shadow-sm", use: "Cards (on hover), dropdowns" },
          ].map(({ token, cls, label, use }) => (
            <div key={token} className="flex flex-col items-center gap-2">
              <div className={`${cls} h-16 w-24 rounded-lg border border-border bg-card`} />
              <code className="text-xs font-mono text-muted-foreground">{label}</code>
              <span className="max-w-24 text-center text-xs text-muted-foreground">{use}</span>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* ── MOTION ────────────────────────────────────────────────────────── */}
      <div id="tokens-motion" className="scroll-mt-20 space-y-6">
        <SectionHeader title="Motion / Animation" />
        <div className="space-y-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Transition Durations</h3>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Token</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">CSS Var</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Value</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Usage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { token: "duration-0", var: "--transition-instant", value: "0ms", use: "Instant (keyboard nav highlight)" },
                    { token: "duration-100", var: "--transition-fast", value: "100ms", use: "Fast — hover states, micro-interactions" },
                    { token: "duration-150", var: "--transition-normal", value: "150ms", use: "Normal — most transitions" },
                    { token: "duration-200", var: "--transition-spring", value: "200ms", use: "Spring — command palette, modals" },
                  ].map((row) => (
                    <tr key={row.token} className="bg-card">
                      <td className="px-3 py-2 font-mono text-foreground">{row.token}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{row.var}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.value}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Easing Functions</h3>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">CSS Var</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Curve</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Usage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { name: "ease-out-expo", var: "--ease-out-expo", curve: "cubic-bezier(0.19, 1, 0.22, 1)", use: "Smooth deceleration — panels, menus" },
                    { name: "ease-spring", var: "--ease-spring", curve: "cubic-bezier(0.34, 1.56, 0.64, 1)", use: "Slight overshoot — command palette, toasts" },
                    { name: "ease-premium", var: "--ease-premium", curve: "cubic-bezier(0.16, 1, 0.3, 1)", use: "Premium feel — most Framer Motion" },
                  ].map((row) => (
                    <tr key={row.name} className="bg-card">
                      <td className="px-3 py-2 font-mono text-foreground">{row.name}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{row.var}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{row.curve}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SECTION 1: Layout Components */}
      {/* ================================================================== */}
      <Separator />
      <div id="section-layout" className="scroll-mt-20">
        <SectionHeader title="1. Layout Components" />
      </div>

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
            { variant: "content", maxWidth: "max-w-4xl", useCase: "Settings / docs / read-heavy pages", example: "/design" },
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
              <Button
                key={key}
                type="button"
                variant="ghost"
                onClick={() => setActiveTabV2(key)}
                className={`inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md border px-4 py-1 text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-background text-foreground shadow-sm border-border"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </Button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Alternative pill-style variant. Imported from <code className="rounded bg-muted px-1 py-0.5 font-mono">@/components/layout</code>.
        </p>
      </div>

      {/* Separator */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Separator</h3>
        <p className="text-sm text-muted-foreground">
          Visual divider for content sections. Supports horizontal (default) and vertical orientations.
        </p>
        <div className="space-y-4">
          <Eyebrow>Horizontal (default)</Eyebrow>
          <div className="rounded-md bg-muted/30 p-4">
            <p className="text-sm text-foreground">Content above</p>
            <Separator className="my-3" />
            <p className="text-sm text-foreground">Content below</p>
          </div>
          <Eyebrow>Vertical</Eyebrow>
          <div className="flex h-8 items-center gap-4 rounded-md bg-muted/30 px-4">
            <span className="text-sm text-foreground">Left</span>
            <Separator orientation="vertical" />
            <span className="text-sm text-foreground">Center</span>
            <Separator orientation="vertical" />
            <span className="text-sm text-foreground">Right</span>
          </div>
        </div>
      </div>

      {/* Accordion */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Accordion</h3>
        <p className="text-sm text-muted-foreground">
          Collapsible content sections. Supports single and multiple mode. Import from{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">@/components/ds</code>.
        </p>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>What is the design system?</AccordionTrigger>
            <AccordionContent>
              The design system is a collection of reusable components, tokens, and patterns that ensure consistency across the Alleato platform.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>How do I import components?</AccordionTrigger>
            <AccordionContent>
              Import everything from <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">@/components/ds</code>. This barrel re-exports all approved shadcn/ui primitives and custom DS components.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Can I use hardcoded colors?</AccordionTrigger>
            <AccordionContent>
              No. Always use semantic tokens like <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">bg-background</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">text-foreground</code>, and{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">border-border</code>. ESLint will block hardcoded colors.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Collapsible */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Collapsible</h3>
        <p className="text-sm text-muted-foreground">
          Toggle content visibility with a trigger. More manual than Accordion — use when you need custom trigger UI.
        </p>
        <Collapsible open={collapsibleOpen} onOpenChange={setCollapsibleOpen} className="w-full space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">3 tagged items</h4>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <ChevronsUpDown className="h-4 w-4" />
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          <div className="rounded-md bg-muted/30 px-4 py-2 text-sm text-foreground">
            Always visible item
          </div>
          <CollapsibleContent className="space-y-2">
            <div className="rounded-md bg-muted/30 px-4 py-2 text-sm text-foreground">
              Hidden item 1
            </div>
            <div className="rounded-md bg-muted/30 px-4 py-2 text-sm text-foreground">
              Hidden item 2
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* ScrollArea */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">ScrollArea</h3>
        <p className="text-sm text-muted-foreground">
          Custom scrollbar container. Use for constrained-height lists, code blocks, and side panels.
        </p>
        <ScrollArea className="h-48 w-full rounded-md border border-border">
          <div className="p-4">
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} className="border-b border-border py-2 text-sm text-foreground last:border-b-0">
                Item {i + 1} — Scrollable content row
              </div>
            ))}
          </div>
        </ScrollArea>
        <p className="text-xs text-muted-foreground">
          Horizontal scrolling: use <code className="rounded bg-muted px-1 py-0.5 font-mono">ScrollBar orientation=&quot;horizontal&quot;</code>.
        </p>
      </div>

      {/* ================================================================== */}
      {/* SECTION 2: Status Components */}
      {/* ================================================================== */}
      <Separator />
      <div id="section-status" className="scroll-mt-20">
        <SectionHeader title="2. Status Components" />
      </div>

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
      <div id="section-data" className="scroll-mt-20">
        <SectionHeader title="3. Data Display" />
      </div>

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

      {/* Avatar + AvatarGroup */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Avatar &amp; AvatarGroup (shadcn)</h3>
        <p className="text-sm text-muted-foreground">
          Base avatar primitives from shadcn. Use for individual avatars or composable groups with overflow count.
        </p>
        <Eyebrow>Single Avatars</Eyebrow>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" alt="User" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>MH</AvatarFallback>
          </Avatar>
        </div>
        <Eyebrow>AvatarGroup with overflow</Eyebrow>
        <AvatarGroup>
          <Avatar>
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>MH</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>BC</AvatarFallback>
          </Avatar>
          <AvatarGroupCount>+5</AvatarGroupCount>
        </AvatarGroup>
      </div>

      {/* Progress */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Progress</h3>
        <p className="text-sm text-muted-foreground">
          Linear progress indicator. Pass a <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">value</code> between 0 and 100.
        </p>
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Empty (0%)</span>
              <span>0%</span>
            </div>
            <Progress value={0} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Quarter (25%)</span>
              <span>25%</span>
            </div>
            <Progress value={25} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Half (50%)</span>
              <span>50%</span>
            </div>
            <Progress value={50} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Almost (75%)</span>
              <span>75%</span>
            </div>
            <Progress value={75} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Complete (100%)</span>
              <span>100%</span>
            </div>
            <Progress value={100} />
          </div>
        </div>
      </div>

      {/* HoverCard */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">HoverCard</h3>
        <p className="text-sm text-muted-foreground">
          Content card that appears on hover. Use for user profiles, link previews, or contextual details.
        </p>
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button variant="link" className="p-0 h-auto text-primary">
              @alleato-team
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="flex gap-4">
              <Avatar>
                <AvatarFallback>AT</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">Alleato Team</h4>
                <p className="text-sm text-muted-foreground">
                  Construction project management platform. Building smarter tools for GCs.
                </p>
                <div className="flex items-center pt-2">
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Founded January 2025
                  </span>
                </div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>

      {/* ================================================================== */}
      {/* SECTION 4: Feedback & States */}
      {/* ================================================================== */}
      <Separator />
      <div id="section-feedback" className="scroll-mt-20">
        <SectionHeader title="4. Feedback & States" />
      </div>

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
      <div id="section-forms" className="scroll-mt-20">
        <SectionHeader title="5. Form Components" />
      </div>

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

      {/* Slider */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Slider</h3>
        <p className="text-sm text-muted-foreground">
          Draggable value slider. Supports single value and range mode.
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Value</span>
              <span>{sliderValue[0]}%</span>
            </div>
            <Slider
              value={sliderValue}
              onValueChange={setSliderValue}
              max={100}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <Eyebrow>Disabled</Eyebrow>
            <Slider defaultValue={[50]} max={100} step={1} disabled />
          </div>
        </div>
      </div>

      {/* ToggleGroup */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">ToggleGroup</h3>
        <p className="text-sm text-muted-foreground">
          Mutually exclusive toggle buttons. Use for view modes, alignment, and formatting options.
        </p>
        <div className="space-y-4">
          <Eyebrow>Single selection (outline)</Eyebrow>
          <ToggleGroup type="single" variant="outline" defaultValue="bold">
            <ToggleGroupItem value="bold" aria-label="Toggle bold">
              <Bold className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="italic" aria-label="Toggle italic">
              <Italic className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="underline" aria-label="Toggle underline">
              <Underline className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Eyebrow>Single selection (default variant)</Eyebrow>
          <ToggleGroup type="single" defaultValue="list">
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <LayoutDashboard className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Calendar */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Calendar</h3>
        <p className="text-sm text-muted-foreground">
          Month calendar built on react-day-picker. Use inside a Popover to create a DatePicker.
        </p>
        <div className="flex justify-start">
          <Calendar
            mode="single"
            selected={calendarDate}
            onSelect={setCalendarDate}
            className="rounded-md border border-border"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Selected: {calendarDate?.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) ?? "none"}
        </p>
      </div>

      {/* NumberInput */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">NumberInput</h3>
        <p className="text-sm text-muted-foreground">
          Enhanced number input for budget/financial data entry. Auto-selects on focus, formats currency on blur.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="demo-number">Standard Number</Label>
            <NumberInput
              id="demo-number"
              placeholder="Enter amount"
              value={numberInputValue}
              onChange={(e) => setNumberInputValue(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-currency">Currency Mode</Label>
            <NumberInput
              id="demo-currency"
              placeholder="$0.00"
              currency
              value="245000"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Props: <code className="rounded bg-muted px-1 py-0.5 font-mono">currency</code> enables format-on-blur,{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">autoSelectOnFocus</code> selects all text on click.
        </p>
      </div>

      {/* ================================================================== */}
      {/* SECTION 6: Overlays */}
      {/* ================================================================== */}
      <Separator />
      <div id="section-overlays" className="scroll-mt-20">
        <SectionHeader title="6. Overlays" />
      </div>

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

        {/* AlertDialog */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete Item</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this item and remove its data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Drawer */}
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline">Open Drawer</Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Drawer Title</DrawerTitle>
              <DrawerDescription>
                Drawers slide up from the bottom on mobile. Use for action sheets and mobile-first overlays.
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4">
              <p className="text-sm text-muted-foreground">
                Drawer content goes here. On desktop, this behaves like a bottom sheet.
              </p>
            </div>
            <DrawerFooter>
              <Button>Submit</Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>

      <p className="text-xs text-muted-foreground">
        <strong>When to use which:</strong> Dialog = confirmations &amp; small forms. Sheet = detail panels &amp; large forms.
        AlertDialog = destructive confirmations (user must choose). Drawer = mobile action sheets. Popover = non-modal contextual content.
        Tooltip = hover hint text.
      </p>

      {/* ================================================================== */}
      {/* SECTION 7: Navigation */}
      {/* ================================================================== */}
      <Separator />
      <div id="section-navigation" className="scroll-mt-20">
        <SectionHeader title="7. Navigation" />
      </div>

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

      {/* Pagination */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Pagination</h3>
        <p className="text-sm text-muted-foreground">
          Page navigation with prev/next buttons and page numbers. Automatically collapses with ellipsis for many pages.
        </p>
        <SimplePagination
          currentPage={paginationPage}
          totalPages={10}
          onPageChange={setPaginationPage}
        />
        <p className="text-xs text-muted-foreground">
          Current page: {paginationPage} / 10. Import{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">SimplePagination</code> from{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">@/components/ui/pagination</code>.
        </p>
      </div>

      {/* Command Palette */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Command Palette</h3>
        <p className="text-sm text-muted-foreground">
          Searchable command list (cmdk). Use standalone or inside a Dialog for a spotlight-style search.
        </p>
        <Command className="rounded-md border border-border">
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Suggestions">
              <CommandItem>
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span>Calendar</span>
              </CommandItem>
              <CommandItem>
                <Smile className="mr-2 h-4 w-4" />
                <span>Search Emoji</span>
              </CommandItem>
              <CommandItem>
                <Calculator className="mr-2 h-4 w-4" />
                <span>Calculator</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Settings">
              <CommandItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </CommandItem>
              <CommandItem>
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Billing</span>
              </CommandItem>
              <CommandItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </div>

      {/* ================================================================== */}
      {/* SECTION 8: Cards */}
      {/* ================================================================== */}
      <Separator />
      <div id="section-cards" className="scroll-mt-20">
        <SectionHeader title="8. Cards" />
      </div>

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
      <div id="section-cells" className="scroll-mt-20">
        <SectionHeader title="9. Table Cell Primitives" />
      </div>

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
      <div id="section-missing" className="scroll-mt-20">
        <SectionHeader title="10. Missing Components (Not Yet Built)" />
      </div>

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
