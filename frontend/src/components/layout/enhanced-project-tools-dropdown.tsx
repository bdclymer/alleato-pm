"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  Star,
  Clock,
  FileText,
  DollarSign,
  Shield,
  Search,
  Home,
  Calendar,
  MessageCircle,
  FolderOpen,
  Camera,
  FileImage,
  Hammer,
  TrendingUp,
  Users,
  Settings,
  Grid,
  Mail,
  CheckCircle,
  Package,
  ClipboardList,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useFavorites } from "@/contexts/favorites-context";
import { toast } from "sonner";

interface Tool {
  name: string;
  path: string;
  icon?: React.ReactNode;
  requiresProject?: boolean;
  description?: string;
  badge?: string;
  isFavorite?: boolean;
}

interface ToolCategory {
  title: string;
  icon: React.ReactNode;
  tools: Tool[];
  color: string;
}

const toolCategories: ToolCategory[] = [
  {
    title: "Core Tools",
    icon: <Home className="h-4 w-4" />,
    color: "text-blue-600 dark:text-blue-400",
    tools: [
      {
        name: "Home",
        path: "home",
        icon: <Home className="h-4 w-4" />,
        requiresProject: true,
        description: "Project dashboard and overview"
      },
      {
        name: "360 Reporting",
        path: "reporting",
        icon: <TrendingUp className="h-4 w-4" />,
        requiresProject: true,
        description: "Comprehensive project analytics"
      },
      {
        name: "Documents",
        path: "documents",
        icon: <FileText className="h-4 w-4" />,
        requiresProject: true,
        description: "Manage project files and documents"
      },
      {
        name: "Directory",
        path: "directory",
        icon: <Users className="h-4 w-4" />,
        requiresProject: true,
        description: "Contact and company directory"
      },
      {
        name: "Schedule",
        path: "schedule",
        icon: <Calendar className="h-4 w-4" />,
        requiresProject: true,
        description: "Project timeline and milestones"
      },
      {
        name: "Settings",
        path: "settings/plugins",
        icon: <Settings className="h-4 w-4" />,
        requiresProject: false,
        description: "Configure project settings"
      },
    ],
  },
  {
    title: "Project Management",
    icon: <ClipboardList className="h-4 w-4" />,
    color: "text-purple-600 dark:text-purple-400",
    tools: [
      {
        name: "RFIs",
        path: "rfis",
        icon: <MessageCircle className="h-4 w-4" />,
        requiresProject: true,
        description: "Requests for Information",
        badge: "12 Open"
      },
      {
        name: "Submittals",
        path: "submittals",
        icon: <Package className="h-4 w-4" />,
        requiresProject: true,
        description: "Material and shop drawings approval"
      },
      {
        name: "Punch List",
        path: "punch-list",
        icon: <CheckCircle className="h-4 w-4" />,
        requiresProject: true,
        description: "Track completion items"
      },
      {
        name: "Daily Log",
        path: "daily-log",
        icon: <Clock className="h-4 w-4" />,
        requiresProject: true,
        description: "Daily progress tracking"
      },
      {
        name: "Photos",
        path: "photos",
        icon: <Camera className="h-4 w-4" />,
        requiresProject: true,
        description: "Project photo documentation"
      },
      {
        name: "Drawings",
        path: "drawings",
        icon: <FileImage className="h-4 w-4" />,
        requiresProject: true,
        description: "Blueprints and technical drawings"
      },
      {
        name: "Emails",
        path: "emails",
        icon: <Mail className="h-4 w-4" />,
        requiresProject: true,
        description: "Email correspondence"
      },
      {
        name: "Meetings",
        path: "meetings",
        icon: <Users className="h-4 w-4" />,
        requiresProject: true,
        description: "Meeting minutes and schedules"
      },
    ],
  },
  {
    title: "Financial Management",
    icon: <DollarSign className="h-4 w-4" />,
    color: "text-green-600 dark:text-green-400",
    tools: [
      {
        name: "Budget",
        path: "budget",
        icon: <TrendingUp className="h-4 w-4" />,
        requiresProject: true,
        description: "Project budget management",
        isFavorite: true
      },
      {
        name: "Prime Contracts",
        path: "prime-contracts",
        icon: <FileText className="h-4 w-4" />,
        requiresProject: true,
        description: "Main project contracts"
      },
      {
        name: "Commitments",
        path: "commitments",
        icon: <Hammer className="h-4 w-4" />,
        requiresProject: true,
        description: "Subcontracts and POs"
      },
      {
        name: "Change Orders",
        path: "change-orders",
        icon: <FileText className="h-4 w-4" />,
        requiresProject: true,
        description: "Contract modifications",
        badge: "3 Pending"
      },
      {
        name: "Change Events",
        path: "change-events",
        icon: <Clock className="h-4 w-4" />,
        requiresProject: true,
        description: "Potential change tracking"
      },
      {
        name: "Direct Costs",
        path: "direct-costs",
        icon: <DollarSign className="h-4 w-4" />,
        requiresProject: true,
        description: "Labor and material costs"
      },
      {
        name: "Invoicing",
        path: "invoices",
        icon: <FileText className="h-4 w-4" />,
        requiresProject: true,
        description: "Billing and payments"
      },
    ],
  },
  {
    title: "Admin Tools",
    icon: <Shield className="h-4 w-4" />,
    color: "text-orange-600 dark:text-orange-400",
    tools: [
      {
        name: "Admin Panel",
        path: "admin",
        icon: <Shield className="h-4 w-4" />,
        requiresProject: true,
        description: "Project administration"
      },
      {
        name: "Document Pipeline",
        path: "/admin/documents/pipeline",
        icon: <FolderOpen className="h-4 w-4" />,
        requiresProject: false,
        description: "Document workflow management"
      },
      {
        name: "Tables Directory",
        path: "tables-directory",
        icon: <Grid className="h-4 w-4" />,
        requiresProject: false,
        description: "Database table viewer"
      },
      {
        name: "Tasks",
        path: "tasks",
        icon: <CheckCircle className="h-4 w-4" />,
        requiresProject: true,
        description: "Task management"
      },
    ],
  },
];

interface EnhancedProjectToolsDropdownProps {
  projectId: number | null;
  currentToolName: string;
  breadcrumbs: Array<{ label: string; href: string }>;
  onClose?: () => void;
}

export function EnhancedProjectToolsDropdown({
  projectId,
  currentToolName,
  breadcrumbs,
  onClose,
}: EnhancedProjectToolsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();

  // Filter tools based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return toolCategories;

    return toolCategories
      .map(category => ({
        ...category,
        tools: category.tools.filter(tool =>
          tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter(category => category.tools.length > 0);
  }, [searchQuery]);

  const buildToolUrl = (toolPath: string, requiresProject: boolean = true) => {
    if (requiresProject && projectId) {
      return `/${projectId}/${toolPath}`;
    }
    return `/${toolPath}`;
  };

  const handleToolClick = (tool: Tool, e: React.MouseEvent) => {
    const isDisabled = tool.requiresProject && !projectId;
    if (isDisabled) {
      e.preventDefault();
      toast.error("Please select a project first");
      return;
    }
    setOpen(false);
    onClose?.();
  };

  const toggleFavorite = (tool: Tool, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const url = buildToolUrl(tool.path, tool.requiresProject);
    if (isFavorite(url)) {
      removeFavorite(url);
      toast.success(`Removed "${tool.name}" from favorites`);
    } else {
      addFavorite(tool.name, url);
      toast.success(`Added "${tool.name}" to favorites`);
    }
  };

  // Get recently used tools (mock data - in real app, track from user activity)
  const recentTools = useMemo(() => {
    const allTools = toolCategories.flatMap(cat => cat.tools);
    return allTools.slice(0, 4); // Just show first 4 for demo
  }, []);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex items-center gap-2 px-3 h-9 hover:bg-accent/50 transition-all"
        >
          <span className="text-xs text-muted-foreground">Project Tools:</span>
          <div className="flex items-center gap-1.5 text-sm">
            {breadcrumbs.slice(1).map((crumb, index) => (
              <span key={index} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight className="h-3 w-3 opacity-50" />}
                <span className={cn(
                  "max-w-[150px] truncate",
                  index === breadcrumbs.slice(1).length - 1 ? "font-medium" : ""
                )}>
                  {crumb.label}
                </span>
              </span>
            ))}
            {breadcrumbs.length <= 1 && (
              <span className="font-medium">Select Tool</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 ml-1 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        alignOffset={-4}
        sideOffset={8}
        className="w-[900px] p-0 rounded-lg shadow-xl border"
      >
        {/* Search Header */}
        <div className="p-4 border-b bg-background/50 backdrop-blur-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 h-9 bg-background"
              autoFocus
            />
          </div>
        </div>

        {/* Quick Access Bar */}
        {!searchQuery && (
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Quick Access:</span>
              <div className="flex items-center gap-1">
                {recentTools.map((tool) => {
                  const href = buildToolUrl(tool.path, tool.requiresProject);
                  const isDisabled = tool.requiresProject && !projectId;

                  return (
                    <Link
                      key={tool.name}
                      href={href}
                      onClick={(e) => handleToolClick(tool, e)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                        isDisabled
                          ? "opacity-50 cursor-not-allowed bg-muted/50"
                          : "hover:bg-accent hover:text-accent-foreground bg-background"
                      )}
                    >
                      {tool.icon}
                      <span>{tool.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="p-4 max-h-[500px] overflow-y-auto">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tools found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {filteredCategories.map((category) => (
                <div
                  key={category.title}
                  className="space-y-2"
                  onMouseEnter={() => setHoveredCategory(category.title)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  {/* Category Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn("p-1.5 rounded-md bg-background", category.color)}>
                      {category.icon}
                    </div>
                    <h3 className="text-sm font-semibold">{category.title}</h3>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {category.tools.length}
                    </Badge>
                  </div>

                  {/* Tools List */}
                  <div className="space-y-0.5">
                    {category.tools.map((tool) => {
                      const href = buildToolUrl(tool.path, tool.requiresProject);
                      const isDisabled = tool.requiresProject && !projectId;
                      const isCurrentTool = tool.name === currentToolName;
                      const toolIsFavorite = isFavorite(href);

                      return (
                        <Link
                          key={tool.name}
                          href={href}
                          onClick={(e) => handleToolClick(tool, e)}
                          className={cn(
                            "group flex items-start gap-3 rounded-md px-2.5 py-2 text-sm transition-all",
                            isDisabled
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:bg-accent/50",
                            isCurrentTool && "bg-accent",
                            hoveredCategory === category.title && !isDisabled && "hover:translate-x-0.5"
                          )}
                        >
                          <div className="mt-0.5 text-muted-foreground">
                            {tool.icon || <FileText className="h-4 w-4" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "font-medium",
                                isCurrentTool && "text-accent-foreground"
                              )}>
                                {tool.name}
                              </span>

                              {tool.badge && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                  {tool.badge}
                                </Badge>
                              )}

                              {toolIsFavorite && (
                                <Star className="h-3 w-3 fill-current text-yellow-500" />
                              )}
                            </div>

                            {tool.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {tool.description}
                              </p>
                            )}
                          </div>

                          {/* Favorite Toggle */}
                          {!isDisabled && (
                            <button
                              onClick={(e) => toggleFavorite(tool, e)}
                              className={cn(
                                "opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-background",
                                toolIsFavorite && "opacity-100"
                              )}
                              aria-label={toolIsFavorite ? "Remove from favorites" : "Add to favorites"}
                            >
                              <Star className={cn(
                                "h-3.5 w-3.5",
                                toolIsFavorite
                                  ? "fill-yellow-500 text-yellow-500"
                                  : "text-muted-foreground"
                              )} />
                            </button>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 rounded border bg-background font-mono">⌘K</kbd>
            <span>to open search</span>
          </div>

          {!projectId && (
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
              Select a project to access all tools
            </p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}