"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Clock, Filter, ExternalLink, ImageIcon, FileText, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/layout/page-header-unified";
import { toast } from "sonner";

interface PageAudit {
  id?: string;
  page_path: string;
  page_name: string;
  page_type: string;
  header_component: string | null;
  auto_status: string;
  manual_status?: string | null;
  notes?: string | null;
  priority?: number;
  assigned_to?: string | null;
  procore_screenshot?: string | null;
  stage?: string | null;
  documentation?: string | null;
  layout_type?: string | null;
  action_buttons?: string | null;
  tabs?: string | null;
  last_scanned_at?: string;
}

interface AuditResponse {
  pages: PageAudit[];
  stats: {
    total: number;
    pass: number;
    fail: number;
    exempt: number;
    placeholder: number;
  };
  usingDatabase: boolean;
  scannedAt: string;
}

const STATUS_CONFIG = {
  pass: { label: "Pass", iconColor: "text-green-600", icon: CheckCircle },
  fail: { label: "Fail", iconColor: "text-red-600", icon: XCircle },
  exempt: { label: "Exempt", iconColor: "text-neutral-400", icon: AlertCircle },
  placeholder: { label: "Placeholder", iconColor: "text-amber-500", icon: Clock },
};

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  to_do: { label: "To Do", color: "bg-neutral-100 text-neutral-700" },
  crawling: { label: "Crawling", color: "bg-blue-100 text-blue-700" },
  planning: { label: "Planning", color: "bg-purple-100 text-purple-700" },
  implementing: { label: "Implementing", color: "bg-orange-100 text-orange-700" },
  testing: { label: "Testing", color: "bg-cyan-100 text-cyan-700" },
  verified: { label: "Verified", color: "bg-green-100 text-green-700" },
};

const LAYOUT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  table: { label: "Table", color: "bg-indigo-100 text-indigo-700" },
  form: { label: "Form", color: "bg-rose-100 text-rose-700" },
  detail: { label: "Detail", color: "bg-sky-100 text-sky-700" },
  list: { label: "List", color: "bg-teal-100 text-teal-700" },
  dashboard: { label: "Dashboard", color: "bg-amber-100 text-amber-700" },
  settings: { label: "Settings", color: "bg-slate-100 text-slate-700" },
  modal: { label: "Modal", color: "bg-fuchsia-100 text-fuchsia-700" },
  other: { label: "Other", color: "bg-neutral-100 text-neutral-600" },
  archive: { label: "Archive", color: "bg-red-100 text-red-700 line-through" },
};

type SortField = "page_name" | "page_path" | "page_type" | "layout_type" | "action_buttons" | "tabs" | "header_component" | "status" | "stage" | "priority" | "assigned_to";
type SortDirection = "asc" | "desc" | null;

const TYPE_COLORS: Record<string, string> = {
  project: "bg-blue-100 text-blue-700",
  table: "bg-purple-100 text-purple-700",
  global: "bg-orange-100 text-orange-700",
  directory: "bg-cyan-100 text-cyan-700",
  auth: "bg-neutral-100 text-neutral-600",
  chat: "bg-pink-100 text-pink-700",
  admin: "bg-slate-100 text-slate-700",
  dev: "bg-zinc-100 text-zinc-600",
  docs: "bg-emerald-100 text-emerald-700",
};

export default function QAAuditPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterLayoutType, setFilterLayoutType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPage, setSelectedPage] = useState<PageAudit | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    if (sortDirection === "asc") return <ArrowUp className="h-3 w-3 ml-1" />;
    if (sortDirection === "desc") return <ArrowDown className="h-3 w-3 ml-1" />;
    return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
  };

  const fetchData = useCallback(async () => {
    try {
      setScanning(true);
      const response = await fetch("/api/qa/pages");
      if (!response.ok) throw new Error("Failed to fetch");
      const result = await response.json();
      setData(result);
    } catch (error) {
      toast.error("Failed to load page audit data");
      } finally {
      setLoading(false);
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdate = async (
    id: string,
    field: string,
    value: string | number | null
  ) => {
    if (!data?.usingDatabase) {
      toast.error("Database not connected - changes won't persist");
      return;
    }

    try {
      const response = await fetch(`/api/qa/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) throw new Error("Failed to update");

      toast.success("Updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update");
      }
  };

  const getEffectiveStatus = (page: PageAudit): string => {
    return page.manual_status || page.auto_status;
  };

  const openSidebar = (page: PageAudit) => {
    setSelectedPage(page);
    setSidebarOpen(true);
  };

  const getPageUrl = (path: string): string => {
    // Convert page path to URL
    const urlPath = path
      .replace("/page.tsx", "")
      .replace("page.tsx", "")
      .replace(/\[([^\]]+)\]/g, "1"); // Replace dynamic params with "1"
    return `/${urlPath}`;
  };

  const filteredAndSortedPages = useMemo(() => {
    // Filter first
    let pages = data?.pages.filter((page) => {
      const matchesType = filterType === "all" || page.page_type === filterType;
      const matchesStatus =
        filterStatus === "all" || getEffectiveStatus(page) === filterStatus;
      const matchesLayoutType =
        filterLayoutType === "all" ||
        (filterLayoutType === "none" ? !page.layout_type : page.layout_type === filterLayoutType);
      const matchesSearch =
        searchTerm === "" ||
        page.page_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.page_path.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesStatus && matchesLayoutType && matchesSearch;
    }) || [];

    // Then sort
    if (sortField && sortDirection) {
      pages = [...pages].sort((a, b) => {
        let aVal: string | number | null = null;
        let bVal: string | number | null = null;

        switch (sortField) {
          case "page_name":
            aVal = a.page_name;
            bVal = b.page_name;
            break;
          case "page_path":
            aVal = a.page_path;
            bVal = b.page_path;
            break;
          case "page_type":
            aVal = a.page_type;
            bVal = b.page_type;
            break;
          case "layout_type":
            aVal = a.layout_type || "";
            bVal = b.layout_type || "";
            break;
          case "action_buttons":
            aVal = a.action_buttons || "";
            bVal = b.action_buttons || "";
            break;
          case "tabs":
            aVal = a.tabs || "";
            bVal = b.tabs || "";
            break;
          case "header_component":
            aVal = a.header_component || "";
            bVal = b.header_component || "";
            break;
          case "status":
            aVal = getEffectiveStatus(a);
            bVal = getEffectiveStatus(b);
            break;
          case "stage":
            aVal = a.stage || "to_do";
            bVal = b.stage || "to_do";
            break;
          case "priority":
            aVal = a.priority || 3;
            bVal = b.priority || 3;
            break;
          case "assigned_to":
            aVal = a.assigned_to || "";
            bVal = b.assigned_to || "";
            break;
        }

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        if (sortDirection === "asc") {
          return aStr.localeCompare(bStr);
        }
        return bStr.localeCompare(aStr);
      });
    }

    return pages;
  }, [data?.pages, filterType, filterStatus, filterLayoutType, searchTerm, sortField, sortDirection]);

  if (loading) {
    return (
      <>
        <PageHeader title="QA Page Audit" description="Design system compliance" />
        <PageContainer>
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </PageContainer>
      </>
    );
  }

  const stats = data?.stats;
  const passRate = stats ? Math.round((stats.pass / stats.total) * 100) : 0;

  return (
    <>
      <PageHeader
        title="QA Page Audit"
        description="Design system compliance"
        actions={
          <Button onClick={fetchData} disabled={scanning} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
            Rescan
          </Button>
        }
      />

      <PageContainer>
        {/* Stats Bar + Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 py-2 px-4 bg-muted/30 rounded-lg mb-2">
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">Total:</span>
              <span className="font-semibold">{stats?.total || 0}</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <button
              type="button"
              onClick={() => setFilterStatus(filterStatus === "pass" ? "all" : "pass")}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                filterStatus === "pass" ? "bg-green-100" : "hover:bg-muted"
              }`}
            >
              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
              <span className="text-green-700 font-medium">{stats?.pass || 0}</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus(filterStatus === "fail" ? "all" : "fail")}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                filterStatus === "fail" ? "bg-red-100" : "hover:bg-muted"
              }`}
            >
              <XCircle className="h-3.5 w-3.5 text-red-600" />
              <span className="text-red-700 font-medium">{stats?.fail || 0}</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus(filterStatus === "exempt" ? "all" : "exempt")}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                filterStatus === "exempt" ? "bg-neutral-200" : "hover:bg-muted"
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5 text-neutral-400" />
              <span className="text-neutral-600 font-medium">{stats?.exempt || 0}</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus(filterStatus === "placeholder" ? "all" : "placeholder")}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                filterStatus === "placeholder" ? "bg-amber-100" : "hover:bg-muted"
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-amber-700 font-medium">{stats?.placeholder || 0}</span>
            </button>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1 text-xs">
              <span className={`font-semibold ${passRate >= 80 ? "text-green-600" : passRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                {passRate}%
              </span>
              <span className="text-muted-foreground">pass</span>
            </div>
          </div>

          {/* Search + Filters */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-7 w-40 text-xs"
            />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-7 w-24 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="table">Table</SelectItem>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="directory">Directory</SelectItem>
                <SelectItem value="auth">Auth</SelectItem>
                <SelectItem value="chat">Chat</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="dev">Dev</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterLayoutType} onValueChange={setFilterLayoutType}>
              <SelectTrigger className="h-7 w-24 text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="none">Unset</SelectItem>
                {Object.entries(LAYOUT_TYPE_CONFIG)
                  .filter(([key]) => key && key !== "")
                  .map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {(filterStatus !== "all" || filterLayoutType !== "all" || filterType !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterStatus("all");
                  setFilterLayoutType("all");
                  setFilterType("all");
                }}
                className="h-7 text-xs px-2"
              >
                Clear
              </Button>
            )}
            <span className="text-2xs text-muted-foreground">
              {filteredAndSortedPages?.length}/{stats?.total}
            </span>
          </div>
        </div>

        {/* Database Warning */}
        {!data?.usingDatabase && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5 mb-2">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Database not connected. Run migration to enable edits.</span>
          </div>
        )}

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead
                  className="w-[120px] text-xs font-semibold cursor-pointer hover:bg-muted/80"
                  onClick={() => handleSort("page_name")}
                >
                  <div className="flex items-center">Page{getSortIcon("page_name")}</div>
                </TableHead>
                <TableHead
                  className="w-[180px] text-xs font-semibold cursor-pointer hover:bg-muted/80"
                  onClick={() => handleSort("page_path")}
                >
                  <div className="flex items-center">Path{getSortIcon("page_path")}</div>
                </TableHead>
                <TableHead
                  className="w-[60px] text-xs font-semibold cursor-pointer hover:bg-muted/80"
                  onClick={() => handleSort("page_type")}
                >
                  <div className="flex items-center">Category{getSortIcon("page_type")}</div>
                </TableHead>
                <TableHead
                  className="w-[70px] text-xs font-semibold cursor-pointer hover:bg-muted/80"
                  onClick={() => handleSort("layout_type")}
                >
                  <div className="flex items-center">Type{getSortIcon("layout_type")}</div>
                </TableHead>
                <TableHead
                  className="w-[100px] text-xs font-semibold cursor-pointer hover:bg-muted/80"
                  onClick={() => handleSort("action_buttons")}
                >
                  <div className="flex items-center">Actions{getSortIcon("action_buttons")}</div>
                </TableHead>
                <TableHead
                  className="w-[100px] text-xs font-semibold cursor-pointer hover:bg-muted/80"
                  onClick={() => handleSort("tabs")}
                >
                  <div className="flex items-center">Tabs{getSortIcon("tabs")}</div>
                </TableHead>
                <TableHead
                  className="w-[100px] text-xs font-semibold cursor-pointer hover:bg-muted/80"
                  onClick={() => handleSort("header_component")}
                >
                  <div className="flex items-center">Header{getSortIcon("header_component")}</div>
                </TableHead>
                <TableHead
                  className="w-[40px] text-xs font-semibold cursor-pointer hover:bg-muted/80"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center">Status{getSortIcon("status")}</div>
                </TableHead>
                <TableHead
                  className="w-[90px] text-xs font-semibold cursor-pointer hover:bg-muted/80"
                  onClick={() => handleSort("stage")}
                >
                  <div className="flex items-center">Stage{getSortIcon("stage")}</div>
                </TableHead>
                <TableHead className="w-[40px] text-xs font-semibold">Img</TableHead>
                <TableHead
                  className="w-[40px] text-xs font-semibold cursor-pointer hover:bg-muted/80"
                  onClick={() => handleSort("priority")}
                >
                  <div className="flex items-center">Pri{getSortIcon("priority")}</div>
                </TableHead>
                <TableHead
                  className="w-[80px] text-xs font-semibold cursor-pointer hover:bg-muted/80"
                  onClick={() => handleSort("assigned_to")}
                >
                  <div className="flex items-center">Assigned{getSortIcon("assigned_to")}</div>
                </TableHead>
                <TableHead className="text-xs font-semibold">Notes</TableHead>
                <TableHead className="w-[30px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedPages?.map((page) => {
                const status = getEffectiveStatus(page);
                const StatusIcon = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.icon || AlertCircle;
                const stageConfig = STAGE_CONFIG[page.stage || "to_do"] || STAGE_CONFIG.to_do;

                return (
                  <TableRow
                    key={page.page_path}
                    className={`cursor-pointer hover:bg-muted/50 ${status === "fail" ? "bg-red-50/30" : ""}`}
                    onClick={() => openSidebar(page)}
                  >
                    <TableCell className="py-1.5">
                      <span className="font-medium text-sm">{page.page_name}</span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <code className="text-2xs text-muted-foreground font-mono truncate block max-w-[170px]">
                        {page.page_path}
                      </code>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant="secondary" className={`text-2xs px-1.5 py-0 ${TYPE_COLORS[page.page_type] || ""}`}>
                        {page.page_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5" onClick={(e) => e.stopPropagation()}>
                      {data?.usingDatabase && page.id ? (
                        <Select
                          value={page.layout_type && page.layout_type !== "" ? page.layout_type : "none"}
                          onValueChange={(value) => handleUpdate(page.id!, "layout_type", value === "none" ? null : value)}
                        >
                          <SelectTrigger className={`h-5 w-[60px] text-2xs px-1.5 border-0 ${page.layout_type ? LAYOUT_TYPE_CONFIG[page.layout_type]?.color || "" : "text-muted-foreground"}`}>
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-xs text-muted-foreground">None</SelectItem>
                            {Object.entries(LAYOUT_TYPE_CONFIG)
                              .filter(([key]) => key && key !== "")
                              .map(([key, { label }]) => (
                                <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-2xs text-muted-foreground">
                          {page.layout_type ? LAYOUT_TYPE_CONFIG[page.layout_type]?.label : "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5" onClick={(e) => e.stopPropagation()}>
                      {data?.usingDatabase && page.id ? (
                        <Input
                          className="h-5 text-2xs px-1.5 py-0 border-0 bg-transparent hover:bg-muted/50 focus:bg-muted truncate"
                          placeholder="—"
                          value={page.action_buttons || ""}
                          onChange={(e) => {
                            const updated = filteredAndSortedPages?.map(p =>
                              p.page_path === page.page_path ? { ...p, action_buttons: e.target.value || null } : p
                            );
                            if (updated && data) {
                              setData({ ...data, pages: data.pages.map(p =>
                                p.page_path === page.page_path ? { ...p, action_buttons: e.target.value || null } : p
                              )});
                            }
                          }}
                          onBlur={(e) => handleUpdate(page.id!, "action_buttons", e.target.value || null)}
                        />
                      ) : (
                        <span className="text-2xs text-muted-foreground truncate block max-w-[90px]">
                          {page.action_buttons || "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5" onClick={(e) => e.stopPropagation()}>
                      {data?.usingDatabase && page.id ? (
                        <Input
                          className="h-5 text-2xs px-1.5 py-0 border-0 bg-transparent hover:bg-muted/50 focus:bg-muted truncate"
                          placeholder="—"
                          value={page.tabs || ""}
                          onChange={(e) => {
                            const updated = filteredAndSortedPages?.map(p =>
                              p.page_path === page.page_path ? { ...p, tabs: e.target.value || null } : p
                            );
                            if (updated && data) {
                              setData({ ...data, pages: data.pages.map(p =>
                                p.page_path === page.page_path ? { ...p, tabs: e.target.value || null } : p
                              )});
                            }
                          }}
                          onBlur={(e) => handleUpdate(page.id!, "tabs", e.target.value || null)}
                        />
                      ) : (
                        <span className="text-2xs text-muted-foreground truncate block max-w-[90px]">
                          {page.tabs || "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <code className="text-2xs bg-muted px-1 py-0.5 rounded truncate block max-w-[90px]">
                        {page.header_component || "NONE"}
                      </code>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <StatusIcon className={`h-4 w-4 ${STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.iconColor}`} />
                    </TableCell>
                    <TableCell className="py-1.5" onClick={(e) => e.stopPropagation()}>
                      {data?.usingDatabase && page.id ? (
                        <Select
                          value={page.stage && page.stage !== "" ? page.stage : "to_do"}
                          onValueChange={(value) => handleUpdate(page.id!, "stage", value)}
                        >
                          <SelectTrigger className={`h-5 w-[80px] text-2xs px-1.5 border-0 ${stageConfig.color}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STAGE_CONFIG)
                              .filter(([key]) => key && key !== "")
                              .map(([key, { label }]) => (
                                <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={`text-2xs px-1.5 py-0 ${stageConfig.color}`}>
                          {stageConfig.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5">
                      {page.procore_screenshot ? (
                        <ImageIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-neutral-300" />
                      )}
                    </TableCell>
                    <TableCell className="py-1.5" onClick={(e) => e.stopPropagation()}>
                      {data?.usingDatabase && page.id ? (
                        <Select
                          value={String(page.priority || 3)}
                          onValueChange={(value) => handleUpdate(page.id!, "priority", parseInt(value))}
                        >
                          <SelectTrigger className="h-5 w-10 text-2xs px-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1" className="text-xs">P1</SelectItem>
                            <SelectItem value="2" className="text-xs">P2</SelectItem>
                            <SelectItem value="3" className="text-xs">P3</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-2xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5" onClick={(e) => e.stopPropagation()}>
                      {data?.usingDatabase && page.id ? (
                        <Input
                          className="h-5 text-2xs px-1.5 w-[70px]"
                          placeholder="—"
                          defaultValue={page.assigned_to || ""}
                          onBlur={(e) => handleUpdate(page.id!, "assigned_to", e.target.value || null)}
                        />
                      ) : (
                        <span className="text-2xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-2xs text-muted-foreground truncate block max-w-[120px]">
                        {page.notes || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={getPageUrl(page.page_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-2 text-2xs text-muted-foreground">
          <span>Last scanned: {data?.scannedAt ? new Date(data.scannedAt).toLocaleString() : "Never"}</span>
          <span>{data?.usingDatabase ? "Connected to database" : "Live scan only"}</span>
        </div>
      </PageContainer>

      {/* Detail Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent className="!w-[700px] !max-w-[700px] p-0 flex flex-col bg-white dark:bg-slate-950 border-l shadow-xl">
          {selectedPage && (
            <>
              {/* Sticky Header */}
              <div className="sticky top-0 z-10 bg-white dark:bg-slate-950 border-b px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <SheetTitle className="text-xl font-semibold">{selectedPage.page_name}</SheetTitle>
                  <div className="flex items-center gap-2">
                    <a
                      href={getPageUrl(selectedPage.page_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Open</span>
                    </a>
                  </div>
                </div>
                <code className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                  {selectedPage.page_path}
                </code>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="space-y-8">
                  {/* Status Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground border-b pb-2">Status & Tracking</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-2">Status</label>
                        {data?.usingDatabase && selectedPage.id ? (
                          <Select
                            value={selectedPage.manual_status && selectedPage.manual_status !== "" ? selectedPage.manual_status : "auto"}
                            onValueChange={(value) => {
                              handleUpdate(selectedPage.id!, "manual_status", value === "auto" ? null : value);
                              setSelectedPage({ ...selectedPage, manual_status: value === "auto" ? null : value });
                            }}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto">Auto ({selectedPage.auto_status || "unknown"})</SelectItem>
                              <SelectItem value="pass">Pass</SelectItem>
                              <SelectItem value="fail">Fail</SelectItem>
                              <SelectItem value="exempt">Exempt</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge>{getEffectiveStatus(selectedPage)}</Badge>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-2">Stage</label>
                        {data?.usingDatabase && selectedPage.id ? (
                          <Select
                            value={selectedPage.stage && selectedPage.stage !== "" ? selectedPage.stage : "to_do"}
                            onValueChange={(value) => {
                              handleUpdate(selectedPage.id!, "stage", value);
                              setSelectedPage({ ...selectedPage, stage: value });
                            }}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STAGE_CONFIG)
                                .filter(([key]) => key && key !== "")
                                .map(([key, { label }]) => (
                                  <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge>{STAGE_CONFIG[selectedPage.stage || "to_do"]?.label || "To Do"}</Badge>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-2">Priority</label>
                        {data?.usingDatabase && selectedPage.id ? (
                          <Select
                            value={String(selectedPage.priority || 3)}
                            onValueChange={(value) => {
                              handleUpdate(selectedPage.id!, "priority", parseInt(value));
                              setSelectedPage({ ...selectedPage, priority: parseInt(value) });
                            }}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">P1 - High</SelectItem>
                              <SelectItem value="2">P2 - Medium</SelectItem>
                              <SelectItem value="3">P3 - Low</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span>P{selectedPage.priority || 3}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Classification Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground border-b pb-2">Classification</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-2">Category</label>
                        <Badge variant="secondary" className={`${TYPE_COLORS[selectedPage.page_type] || ""}`}>
                          {selectedPage.page_type}
                        </Badge>
                        <p className="text-2xs text-muted-foreground mt-1">Auto-detected</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-2">Type</label>
                        {data?.usingDatabase && selectedPage.id ? (
                          <Select
                            value={selectedPage.layout_type && selectedPage.layout_type !== "" ? selectedPage.layout_type : "none"}
                            onValueChange={(value) => {
                              const newValue = value === "none" ? null : value;
                              handleUpdate(selectedPage.id!, "layout_type", newValue);
                              setSelectedPage({ ...selectedPage, layout_type: newValue });
                            }}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {Object.entries(LAYOUT_TYPE_CONFIG)
                                .filter(([key]) => key && key !== "")
                                .map(([key, { label }]) => (
                                  <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span>{selectedPage.layout_type ? LAYOUT_TYPE_CONFIG[selectedPage.layout_type]?.label : "—"}</span>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-2">Header Component</label>
                        <code className="text-sm bg-muted px-2 py-1.5 rounded block">
                          {selectedPage.header_component || "NONE"}
                        </code>
                        <p className="text-2xs text-muted-foreground mt-1">Auto-detected</p>
                      </div>
                    </div>
                  </div>

                  {/* Page UI Elements Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground border-b pb-2">Page UI Elements</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-2">Action Buttons</label>
                        {data?.usingDatabase && selectedPage.id ? (
                          <Input
                            className="h-9"
                            placeholder="e.g., Add, Edit, Delete, Export..."
                            value={selectedPage.action_buttons || ""}
                            onChange={(e) => setSelectedPage({ ...selectedPage, action_buttons: e.target.value || null })}
                            onBlur={(e) => handleUpdate(selectedPage.id!, "action_buttons", e.target.value || null)}
                          />
                        ) : (
                          <span className="text-sm">{selectedPage.action_buttons || "—"}</span>
                        )}
                        <p className="text-2xs text-muted-foreground mt-1">Buttons shown on this page</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-2">Tabs</label>
                        {data?.usingDatabase && selectedPage.id ? (
                          <Input
                            className="h-9"
                            placeholder="e.g., General, Details, History..."
                            value={selectedPage.tabs || ""}
                            onChange={(e) => setSelectedPage({ ...selectedPage, tabs: e.target.value || null })}
                            onBlur={(e) => handleUpdate(selectedPage.id!, "tabs", e.target.value || null)}
                          />
                        ) : (
                          <span className="text-sm">{selectedPage.tabs || "—"}</span>
                        )}
                        <p className="text-2xs text-muted-foreground mt-1">Tab navigation on this page</p>
                      </div>
                    </div>
                  </div>

                  {/* Assignment Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground border-b pb-2">Assignment</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-2">Assigned To</label>
                        {data?.usingDatabase && selectedPage.id ? (
                          <Input
                            className="h-9"
                            placeholder="Enter name..."
                            value={selectedPage.assigned_to || ""}
                            onChange={(e) => setSelectedPage({ ...selectedPage, assigned_to: e.target.value || null })}
                            onBlur={(e) => handleUpdate(selectedPage.id!, "assigned_to", e.target.value || null)}
                          />
                        ) : (
                          <span>{selectedPage.assigned_to || "—"}</span>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-2">Procore Screenshot URL</label>
                        {data?.usingDatabase && selectedPage.id ? (
                          <div className="flex gap-2">
                            <Input
                              className="h-9 flex-1"
                              placeholder="https://..."
                              value={selectedPage.procore_screenshot || ""}
                              onChange={(e) => setSelectedPage({ ...selectedPage, procore_screenshot: e.target.value || null })}
                              onBlur={(e) => handleUpdate(selectedPage.id!, "procore_screenshot", e.target.value || null)}
                            />
                            {selectedPage.procore_screenshot && (
                              <a
                                href={selectedPage.procore_screenshot}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center h-9 px-3 text-xs bg-muted rounded hover:bg-muted/80"
                              >
                                View
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm">{selectedPage.procore_screenshot || "—"}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground border-b pb-2">Notes</h3>
                    {data?.usingDatabase && selectedPage.id ? (
                      <Textarea
                        className="min-h-[100px] resize-y"
                        placeholder="Add notes about this page..."
                        value={selectedPage.notes || ""}
                        onChange={(e) => setSelectedPage({ ...selectedPage, notes: e.target.value || null })}
                        onBlur={(e) => handleUpdate(selectedPage.id!, "notes", e.target.value || null)}
                      />
                    ) : (
                      <span className="text-sm">{selectedPage.notes || "—"}</span>
                    )}
                  </div>

                  {/* Documentation Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground border-b pb-2">
                      <FileText className="h-4 w-4 inline mr-2" />
                      Documentation
                    </h3>
                    {data?.usingDatabase && selectedPage.id ? (
                      <Textarea
                        className="min-h-[200px] font-mono text-sm resize-y"
                        placeholder="Add detailed documentation, implementation notes, references, or markdown content..."
                        value={selectedPage.documentation || ""}
                        onChange={(e) => setSelectedPage({ ...selectedPage, documentation: e.target.value || null })}
                        onBlur={(e) => handleUpdate(selectedPage.id!, "documentation", e.target.value || null)}
                      />
                    ) : (
                      <span className="text-sm">{selectedPage.documentation || "—"}</span>
                    )}
                  </div>

                  {/* Meta Info */}
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>Auto Status: <span className="font-medium">{selectedPage.auto_status}</span></div>
                      <div>Category: <span className="font-medium">{selectedPage.page_type}</span></div>
                      {selectedPage.last_scanned_at && (
                        <div className="col-span-2">
                          Last scanned: <span className="font-medium">{new Date(selectedPage.last_scanned_at).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-0 z-10 bg-white dark:bg-slate-950 border-t px-6 py-4 flex justify-between items-center">
                <p className="text-xs text-muted-foreground">Changes save automatically</p>
                <Button onClick={() => setSidebarOpen(false)}>
                  Done
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
