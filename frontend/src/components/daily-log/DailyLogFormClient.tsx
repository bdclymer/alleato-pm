"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  CloudSun,
  ChevronsUpDown,
  Mail,
  PackageCheck,
  Plus,
  ShieldAlert,
  StickyNote,
  Timer,
  Trash2,
  Truck,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import {
  saveDailyLogWithCoreSections,
  updateDailyLogWithCoreSections,
  type DailyLogEquipmentInput,
  type DailyLogManpowerInput,
  type DailyLogNoteInput,
  type DailyLogStatus,
  type DailyLogWeatherInput,
} from "@/app/(main)/actions/daily-log-actions";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  InlineTable as Table,
  InlineTableBody as TableBody,
  InlineTableCell as TableCell,
  InlineTableHeader as TableHeader,
  InlineTableHeaderCell as TableHead,
  InlineTableRow as TableRow,
} from "@/components/ds/inline-table";
import { useProjectCompanies } from "@/hooks/use-project-companies";
import { cn } from "@/lib/utils";

type WeatherRow = DailyLogWeatherInput & { id: string };
type ManpowerRow = DailyLogManpowerInput & { id: string };
type EquipmentRow = DailyLogEquipmentInput & { id: string };
type NoteRow = DailyLogNoteInput & { id: string };

const pendingSections = [
  { label: "Timecards", icon: Timer },
  { label: "Visitors", icon: Users },
  { label: "Phone Calls", icon: Mail },
  { label: "Inspections", icon: ClipboardList },
  { label: "Deliveries", icon: Truck },
  { label: "Safety Violations", icon: ShieldAlert },
  { label: "Accidents", icon: AlertTriangle },
  { label: "Quantities", icon: PackageCheck },
  { label: "Productivity", icon: CheckCircle2 },
  { label: "Dumpster", icon: Truck },
  { label: "Waste", icon: Truck },
  { label: "Scheduled Work", icon: CalendarDays },
  { label: "Photos", icon: PackageCheck },
  { label: "Delays", icon: Timer },
  { label: "Emails", icon: Mail },
];

const QUICK_LOG_SECTIONS = ["Weather", "Manpower", "Notes"];

function newId() {
  return crypto.randomUUID();
}

function emptyWeather(): WeatherRow {
  return {
    id: newId(),
    area: "All Areas",
    timeObserved: "09:00",
    delay: false,
    location: "",
    sky: "",
    temperature: null,
    calamity: "",
    average: "",
    precipitation: "",
    wind: "",
    groundOrSea: "",
    comments: "",
  };
}

function emptyManpower(): ManpowerRow {
  return {
    id: newId(),
    area: "All Areas",
    trade: "",
    workersCount: 0,
    hoursWorked: 0,
    costCode: "",
    location: "",
    comments: "",
    issueFlag: false,
  };
}

function emptyEquipment(): EquipmentRow {
  return {
    id: newId(),
    area: "All Areas",
    equipmentName: "",
    hoursOperated: 0,
    hoursIdle: 0,
    costCode: "",
    location: "",
    inspected: false,
    inspectionTime: "",
    comments: "",
  };
}

function emptyNote(): NoteRow {
  return {
    id: newId(),
    area: "All Areas",
    category: "",
    location: "",
    description: "",
    issueFlag: false,
  };
}

function numericValue(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

interface TradeOption {
  id: string;
  name: string;
}

function TradeCombobox({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: TradeOption[];
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(
    () =>
      search
        ? options.filter((opt) => opt.name.toLowerCase().includes(search.toLowerCase()))
        : options,
    [options, search],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && search.trim() && search.trim() !== value) {
      onChange(search.trim());
    }
    if (!nextOpen) setSearch("");
    setOpen(nextOpen);
  };

  const handleSelect = (companyName: string) => {
    onChange(companyName);
    setSearch("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className={cn(
            "h-8 w-full min-w-[140px] justify-between text-sm font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <span className="truncate">{value || "Select or type..."}</span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search project directory..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filtered.length === 0 ? (
              <CommandEmpty>
                {search.trim() ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => handleSelect(search.trim())}
                  >
                    Use &quot;{search.trim()}&quot;
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">No companies found.</span>
                )}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filtered.map((opt) => (
                  <CommandItem
                    key={opt.id}
                    value={opt.name}
                    onSelect={() => handleSelect(opt.name)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3.5 w-3.5",
                        value === opt.name ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {opt.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  meta,
  action,
}: {
  icon: typeof CloudSun;
  title: string;
  meta?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          {meta ? <div className="text-xs text-muted-foreground">{meta}</div> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function CollapsibleSectionShell({
  id,
  icon: Icon,
  title,
  meta,
  action,
  defaultOpen = false,
  children,
}: {
  id: string;
  icon: typeof CloudSun;
  title: string;
  meta?: string;
  action?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b border-border/70 pb-1">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 rounded-md px-1 py-3 text-left hover:bg-muted/50 -mx-1">
        <div id={id} className="flex min-w-0 items-center gap-3">
          <Icon className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">{title}</div>
            {meta ? <div className="text-xs text-muted-foreground">{meta}</div> : null}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-4 pb-5 pt-2">
          {action && <div className="flex justify-end">{action}</div>}
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export type DailyLogInitialData = {
  dailyLogId: string;
  logDate: string;
  status: DailyLogStatus;
  generalNotes: string;
  weather: WeatherRow[];
  manpower: ManpowerRow[];
  equipment: EquipmentRow[];
  notes: NoteRow[];
};

interface DailyLogFormClientProps {
  projectId: number;
  mode: "create" | "edit";
  initialData?: DailyLogInitialData;
}

export function DailyLogFormClient({ projectId, mode, initialData }: DailyLogFormClientProps) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const { companies } = useProjectCompanies(String(projectId), { per_page: 500 });
  const tradeOptions: TradeOption[] = React.useMemo(
    () =>
      companies
        .filter((c) => c.company?.name)
        .map((c) => ({ id: c.company_id, name: c.company!.name })),
    [companies],
  );

  const [logDate, setLogDate] = React.useState(initialData?.logDate ?? today);
  const [status, setStatus] = React.useState<DailyLogStatus>(initialData?.status ?? "draft");
  const [generalNotes, setGeneralNotes] = React.useState(initialData?.generalNotes ?? "");
  const [weatherRows, setWeatherRows] = React.useState<WeatherRow[]>(
    initialData?.weather && initialData.weather.length > 0 ? initialData.weather : [emptyWeather()],
  );
  const [manpowerRows, setManpowerRows] = React.useState<ManpowerRow[]>(
    initialData?.manpower && initialData.manpower.length > 0 ? initialData.manpower : [emptyManpower()],
  );
  const [equipmentRows, setEquipmentRows] = React.useState<EquipmentRow[]>(
    initialData?.equipment && initialData.equipment.length > 0 ? initialData.equipment : [emptyEquipment()],
  );
  const [noteRows, setNoteRows] = React.useState<NoteRow[]>(
    initialData?.notes && initialData.notes.length > 0 ? initialData.notes : [emptyNote()],
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [quickLog, setQuickLog] = React.useState(false);

  const manpowerTotals = React.useMemo(() => {
    return manpowerRows.reduce(
      (totals, row) => {
        const workers = row.workersCount || 0;
        const hours = row.hoursWorked || 0;
        return {
          workers: totals.workers + workers,
          hours: totals.hours + workers * hours,
        };
      },
      { workers: 0, hours: 0 },
    );
  }, [manpowerRows]);

  const updateRow = <T extends { id: string }>(
    rows: T[],
    setRows: React.Dispatch<React.SetStateAction<T[]>>,
    id: string,
    patch: Partial<T>,
  ) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeRow = <T extends { id: string }>(
    rows: T[],
    setRows: React.Dispatch<React.SetStateAction<T[]>>,
    id: string,
  ) => {
    if (rows.length === 1) return;
    setRows(rows.filter((row) => row.id !== id));
  };

  const submit = async () => {
    if (!logDate) {
      toast.error("Daily log date is required.");
      return;
    }

    const weather = weatherRows.filter((row) =>
      Boolean(row.sky || row.temperature || row.precipitation || row.wind || row.comments),
    );
    const manpower = manpowerRows.filter((row) => row.workersCount > 0);
    const equipment = equipmentRows.filter((row) => row.equipmentName.trim());
    const notes = noteRows.filter((row) => row.description.trim());

    setIsSubmitting(true);

    let result: { error?: string };

    if (mode === "edit" && initialData?.dailyLogId) {
      result = await updateDailyLogWithCoreSections(initialData.dailyLogId, {
        projectId,
        logDate,
        status,
        generalNotes,
        weather,
        manpower,
        equipment,
        notes,
      });
    } else {
      result = await saveDailyLogWithCoreSections({
        projectId,
        logDate,
        status,
        generalNotes,
        weather,
        manpower,
        equipment,
        notes,
      });
    }

    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(mode === "edit" ? "Daily log updated" : "Daily log saved");
    router.push(`/${projectId}/daily-log`);
  };

  const backPath = `/${projectId}/daily-log`;
  const title = mode === "edit" ? "Edit Daily Log" : "Daily Log";
  const saveLabel = mode === "edit" ? "Save Changes" : "Save Log";

  const navSections = quickLog
    ? QUICK_LOG_SECTIONS
    : ["Weather", "Manpower", "Notes", "Equipment", ...pendingSections.map((s) => s.label)];

  return (
    <PageShell
      variant="detailXWide"
      title={title}
      description="Daily field record by date"
      onBack={() => router.push(backPath)}
      backLabel="Back to Daily Log"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setQuickLog((v) => !v)}
          >
            {quickLog ? (
              <>
                <LayoutList className="mr-1 h-3.5 w-3.5" />
                Full Log
              </>
            ) : (
              <>
                <Zap className="mr-1 h-3.5 w-3.5" />
                Quick Log
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" type="button" onClick={() => router.push(backPath)}>
            Cancel
          </Button>
          <Button size="sm" type="button" onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : saveLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {quickLog && (
          <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            <Zap className="h-3.5 w-3.5 shrink-0" />
            Quick Log — showing Weather, Manpower, and Notes only. Switch to Full Log to access all
            sections.
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-[180px_180px_1fr]">
          <Field label="Date">
            <Input type="date" value={logDate} onChange={(event) => setLogDate(event.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={status} onValueChange={(value) => setStatus(value as DailyLogStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="General Notes">
            <Input
              value={generalNotes}
              onChange={(event) => setGeneralNotes(event.target.value)}
              placeholder="Overall daily summary"
            />
          </Field>
        </section>

        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <nav className="sticky top-20 space-y-1 border-r border-border/70 pr-4">
              {navSections.map((label) => (
                <a
                  key={label}
                  href={`#${label.toLowerCase().replaceAll(" ", "-")}`}
                  className="block rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 space-y-2">
            <CollapsibleSectionShell
              id="weather"
              icon={CloudSun}
              title="Observed Weather Conditions"
              defaultOpen
              action={
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setWeatherRows([...weatherRows, emptyWeather()])}
                >
                  <Plus />
                  Add
                </Button>
              }
            >
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Area</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Delay</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="min-w-32">Sky</TableHead>
                      <TableHead>Temp</TableHead>
                      <TableHead>Precipitation</TableHead>
                      <TableHead>Wind</TableHead>
                      <TableHead>Comments</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weatherRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Input
                            value={row.area ?? ""}
                            onChange={(event) =>
                              updateRow(weatherRows, setWeatherRows, row.id, {
                                area: event.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            value={row.timeObserved ?? ""}
                            onChange={(event) =>
                              updateRow(weatherRows, setWeatherRows, row.id, {
                                timeObserved: event.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={Boolean(row.delay)}
                            onCheckedChange={(checked) =>
                              updateRow(weatherRows, setWeatherRows, row.id, {
                                delay: checked === true,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.location ?? ""}
                            onChange={(event) =>
                              updateRow(weatherRows, setWeatherRows, row.id, {
                                location: event.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.sky ?? ""}
                            onChange={(event) =>
                              updateRow(weatherRows, setWeatherRows, row.id, {
                                sky: event.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={row.temperature ?? ""}
                            onChange={(event) =>
                              updateRow(weatherRows, setWeatherRows, row.id, {
                                temperature: numericValue(event.target.value),
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.precipitation ?? ""}
                            onChange={(event) =>
                              updateRow(weatherRows, setWeatherRows, row.id, {
                                precipitation: event.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.wind ?? ""}
                            onChange={(event) =>
                              updateRow(weatherRows, setWeatherRows, row.id, {
                                wind: event.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.comments ?? ""}
                            onChange={(event) =>
                              updateRow(weatherRows, setWeatherRows, row.id, {
                                comments: event.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => removeRow(weatherRows, setWeatherRows, row.id)}
                          >
                            <Trash2 />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CollapsibleSectionShell>

            <CollapsibleSectionShell
              id="manpower"
              icon={Users}
              title="Manpower"
              meta={`${manpowerTotals.workers} workers / ${manpowerTotals.hours} total hours`}
              defaultOpen
              action={
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setManpowerRows([...manpowerRows, emptyManpower()])}
                >
                  <Plus />
                  Add
                </Button>
              }
            >
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Area</TableHead>
                      <TableHead>Company / Trade</TableHead>
                      <TableHead>Workers</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Cost Code</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Comments</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manpowerRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell><Input value={row.area ?? ""} onChange={(event) => updateRow(manpowerRows, setManpowerRows, row.id, { area: event.target.value })} /></TableCell>
                        <TableCell>
                          <TradeCombobox
                            value={row.trade ?? ""}
                            onChange={(val) => updateRow(manpowerRows, setManpowerRows, row.id, { trade: val })}
                            options={tradeOptions}
                          />
                        </TableCell>
                        <TableCell><Input type="number" min={0} value={row.workersCount || ""} onChange={(event) => updateRow(manpowerRows, setManpowerRows, row.id, { workersCount: numericValue(event.target.value) ?? 0 })} /></TableCell>
                        <TableCell><Input type="number" min={0} step="0.25" value={row.hoursWorked ?? ""} onChange={(event) => updateRow(manpowerRows, setManpowerRows, row.id, { hoursWorked: numericValue(event.target.value) })} /></TableCell>
                        <TableCell>{(row.workersCount || 0) * (row.hoursWorked || 0)}</TableCell>
                        <TableCell>
                          <Input
                            value={row.costCode ?? ""}
                            onChange={(event) =>
                              updateRow(manpowerRows, setManpowerRows, row.id, {
                                costCode: event.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.location ?? ""}
                            onChange={(event) =>
                              updateRow(manpowerRows, setManpowerRows, row.id, {
                                location: event.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.comments ?? ""}
                            onChange={(event) =>
                              updateRow(manpowerRows, setManpowerRows, row.id, {
                                comments: event.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={Boolean(row.issueFlag)}
                            onCheckedChange={(checked) =>
                              updateRow(manpowerRows, setManpowerRows, row.id, {
                                issueFlag: checked === true,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => removeRow(manpowerRows, setManpowerRows, row.id)}
                          >
                            <Trash2 />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CollapsibleSectionShell>

            <CollapsibleSectionShell
              id="notes"
              icon={StickyNote}
              title="Notes"
              defaultOpen
              action={
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setNoteRows([...noteRows, emptyNote()])}
                >
                  <Plus />
                  Add
                </Button>
              }
            >
              <div className="grid gap-3">
                {noteRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid gap-3 border-b border-border/70 pb-3 md:grid-cols-[120px_160px_1fr_80px_40px]"
                  >
                    <Input
                      value={row.area ?? ""}
                      onChange={(event) =>
                        updateRow(noteRows, setNoteRows, row.id, { area: event.target.value })
                      }
                    />
                    <Input
                      value={row.category ?? ""}
                      placeholder="Category"
                      onChange={(event) =>
                        updateRow(noteRows, setNoteRows, row.id, { category: event.target.value })
                      }
                    />
                    <Textarea
                      value={row.description}
                      placeholder="Comment"
                      onChange={(event) =>
                        updateRow(noteRows, setNoteRows, row.id, {
                          description: event.target.value,
                        })
                      }
                      rows={2}
                    />
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={Boolean(row.issueFlag)}
                        onCheckedChange={(checked) =>
                          updateRow(noteRows, setNoteRows, row.id, { issueFlag: checked === true })
                        }
                      />
                      Issue
                    </label>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => removeRow(noteRows, setNoteRows, row.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            </CollapsibleSectionShell>

            {!quickLog && (
              <>
                <CollapsibleSectionShell
                  id="equipment"
                  icon={Wrench}
                  title="Equipment"
                  defaultOpen={false}
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => setEquipmentRows([...equipmentRows, emptyEquipment()])}
                    >
                      <Plus />
                      Add
                    </Button>
                  }
                >
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Area</TableHead>
                          <TableHead>Equipment</TableHead>
                          <TableHead>Operating</TableHead>
                          <TableHead>Idle</TableHead>
                          <TableHead>Cost Code</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Inspected</TableHead>
                          <TableHead>Comments</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {equipmentRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              <Input
                                value={row.area ?? ""}
                                onChange={(event) =>
                                  updateRow(equipmentRows, setEquipmentRows, row.id, {
                                    area: event.target.value,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={row.equipmentName}
                                onChange={(event) =>
                                  updateRow(equipmentRows, setEquipmentRows, row.id, {
                                    equipmentName: event.target.value,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                step="0.25"
                                value={row.hoursOperated ?? ""}
                                onChange={(event) =>
                                  updateRow(equipmentRows, setEquipmentRows, row.id, {
                                    hoursOperated: numericValue(event.target.value),
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                step="0.25"
                                value={row.hoursIdle ?? ""}
                                onChange={(event) =>
                                  updateRow(equipmentRows, setEquipmentRows, row.id, {
                                    hoursIdle: numericValue(event.target.value),
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={row.costCode ?? ""}
                                onChange={(event) =>
                                  updateRow(equipmentRows, setEquipmentRows, row.id, {
                                    costCode: event.target.value,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={row.location ?? ""}
                                onChange={(event) =>
                                  updateRow(equipmentRows, setEquipmentRows, row.id, {
                                    location: event.target.value,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={Boolean(row.inspected)}
                                onCheckedChange={(checked) =>
                                  updateRow(equipmentRows, setEquipmentRows, row.id, {
                                    inspected: checked === true,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={row.comments ?? ""}
                                onChange={(event) =>
                                  updateRow(equipmentRows, setEquipmentRows, row.id, {
                                    comments: event.target.value,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                onClick={() =>
                                  removeRow(equipmentRows, setEquipmentRows, row.id)
                                }
                              >
                                <Trash2 />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleSectionShell>

                <CollapsibleSectionShell
                  id="additional-sections"
                  icon={ClipboardList}
                  title="Additional Sections"
                  meta={`${pendingSections.length} sections available`}
                  defaultOpen={false}
                >
                  <div className="divide-y divide-border/70">
                    {pendingSections.map(({ label, icon: Icon }) => (
                      <div
                        key={label}
                        id={label.toLowerCase().replaceAll(" ", "-")}
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{label}</span>
                        </div>
                        <span className="text-xs text-destructive">Coming soon</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleSectionShell>
              </>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
