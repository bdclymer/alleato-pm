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

// Slider
export { Slider } from "@/components/ui/slider";

// Spinner
export { Spinner } from "@/components/ui/spinner";

// Layout primitives
export { Separator } from "@/components/ui/separator";
export { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
