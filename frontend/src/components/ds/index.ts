/**
 * ALLEATO DESIGN SYSTEM — Single Import Path
 * ============================================
 *
 * Import EVERYTHING from here:
 *   import { Button, StatusBadge, KpiBlock, DataTable } from "@/components/ds"
 *
 * This barrel re-exports:
 * 1. Approved shadcn/ui primitives (from @/components/ui/)
 * 2. Custom DS components (status, kpi, tables, etc.)
 * 3. Layout components (from @/components/layout/)
 *
 * DO NOT import from @/components/ui/ directly in pages.
 * DO NOT create custom styled elements — use these components.
 */

// ---------------------------------------------------------------------------
// Custom Design System Components
// ---------------------------------------------------------------------------

export { StatusBadge, StatusDot, StatusText } from "./status-badge";
export type { StatusVariant } from "./status-badge";

export { KpiBlock, KpiRow } from "./kpi";
export type { KpiBlockProps } from "./kpi";

export { SectionHeader } from "./section-header";
export { AvatarStack } from "./avatar-stack";
export { DateAvatar } from "./date-avatar";
export { DataTable } from "./data-table";
export type { TableColumn, DataTableProps } from "./data-table";
export { EmptyState } from "./empty-state";
export { Eyebrow } from "./eyebrow";

// ---------------------------------------------------------------------------
// Approved shadcn/ui Primitives (re-exported for single import path)
// ---------------------------------------------------------------------------

// Buttons & Actions
export { Button, buttonVariants } from "@/components/ui/button";

// Badges (base — prefer StatusBadge for status display)
export { Badge, badgeVariants } from "@/components/ui/badge";

// Form Inputs
export { Input } from "@/components/ui/input";
export { Textarea } from "@/components/ui/textarea";
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export { Checkbox } from "@/components/ui/checkbox";
export { Switch } from "@/components/ui/switch";
export { Label } from "@/components/ui/label";
export { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Form (react-hook-form integration)
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Cards
export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Table primitives (use DataTable for full tables, these for custom layouts)
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Tabs
export {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Feedback
export { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
export { Skeleton } from "@/components/ui/skeleton";
export { Progress } from "@/components/ui/progress";

// Overlays
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
export { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Navigation & Menus
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

// Avatars
export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";

// Breadcrumb
export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb";

// Alert Dialog
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

// Slider
export { Slider } from "@/components/ui/slider";

// Spinner
export { Spinner } from "@/components/ui/spinner";

// Toggle
export { Toggle, toggleVariants } from "@/components/ui/toggle";

// Toggle Group
export { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Layout primitives
export { Separator } from "@/components/ui/separator";
export { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

// Buttons & Actions (additional)
export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
} from "@/components/ui/button-group";

// Calendar
export { Calendar, CalendarDayButton } from "@/components/ui/calendar";

// Carousel
export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

// Charts
export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
} from "@/components/ui/chart";
export type { ChartConfig } from "@/components/ui/chart";

// Container
export { Container } from "@/components/ui/container";
export type { ContainerProps } from "@/components/ui/container";

// Drawer
export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

// Heading
export { Heading } from "@/components/ui/heading";
export type { HeadingProps } from "@/components/ui/heading";

// Hover Card
export {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";

// Inline
export { Inline } from "@/components/ui/inline";
export type { InlineProps } from "@/components/ui/inline";

// Input Group
export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
} from "@/components/ui/input-group";

// Metric Card
export { MetricCard, MetricGrid, MetricSummary } from "@/components/ui/metric-card";

// Number Input
export { NumberInput } from "@/components/ui/number-input";
export type { NumberInputProps } from "@/components/ui/number-input";

// Pagination
export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  SimplePagination,
} from "@/components/ui/pagination";

// Section Card
export { SectionCard } from "@/components/ui/section-card";
export type {
  SectionCardProps,
  SectionCardEmptyProps,
  SectionCardItemProps,
  SectionCardBadgeProps,
} from "@/components/ui/section-card";

// Stack
export { Stack } from "@/components/ui/stack";
export type { StackProps } from "@/components/ui/stack";

// Summary Card Grid
export {
  SummaryCardGrid,
  formatCurrencyValue,
  formatNumberValue,
} from "@/components/ui/summary-card-grid";
export type { SummaryCard } from "@/components/ui/summary-card-grid";

// Text
export { Text } from "@/components/ui/text";
export type { TextProps } from "@/components/ui/text";

// Transition Panel
export { TransitionPanel } from "@/components/ui/transition-panel";
export type { TransitionPanelProps } from "@/components/ui/transition-panel";

// Unified Modal (Radix-based, sized variants)
export {
  Modal,
  ModalPortal,
  ModalOverlay,
  ModalClose,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
} from "@/components/ui/unified-modal";
export type { ModalContentProps } from "@/components/ui/unified-modal";

// Unified Slideover (Radix-based, sized slide panel)
export {
  Slideover,
  SlideoverPortal,
  SlideoverOverlay,
  SlideoverClose,
  SlideoverTrigger,
  SlideoverContent,
  SlideoverHeader,
  SlideoverFooter,
  SlideoverBody,
  SlideoverTitle,
  SlideoverDescription,
} from "@/components/ui/unified-slideover";
export type { SlideoverContentProps } from "@/components/ui/unified-slideover";

// ---------------------------------------------------------------------------
// Table Cell Primitives (use ONLY these in column render functions)
// ---------------------------------------------------------------------------

export {
  // Text
  CellText,
  TruncatedCell,
  // Links
  CellLink,
  CellEmail,
  // Numeric
  CellCurrency,
  CellNumber,
  CellPercent,
  // Date
  CellDate,
  TableDateValue,
  // Status
  CellStatus,
  TableStatusDot,
  // Tags / Categories
  TableTagBadge,
  CellBadge,
  // People
  TableAvatarUsers,
  // Misc
  TableCountIndicator,
  TableRowActionsMenu,
} from "@/components/tables/unified/table-primitives";
export type { CellColorMap, TableBadgeVariant, TableRowActionItem } from "@/components/tables/unified/table-primitives";

// ---------------------------------------------------------------------------
// Layout Components (re-exported for convenience)
// ---------------------------------------------------------------------------

export {
  PageShell,
  PageContainer,
  ProjectPageHeader,
  FormContainer,
  PageTabs,
} from "@/components/layout";
export type { PageShellVariant } from "@/components/layout";
