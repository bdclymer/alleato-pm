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
      return;
    }
    setOpen(false);
    onClose?.();
  };


  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex items-center gap-2 px-3 h-9"
        >
          <span className="text-sm font-medium">
            {currentToolName}
          </span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-[500px] p-0"
      >
        {/* Search Header */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8"
              autoFocus
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="p-2 max-h-[400px] overflow-y-auto">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tools found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCategories.map((category) => (
                <div key={category.title}>
                  {/* Category Header */}
                  <div className="flex items-center gap-2 px-2 py-1 mb-1">
                    <div className={cn("rounded p-1", category.color, "bg-background")}>
                      {category.icon}
                    </div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {category.title}
                    </h3>
                  </div>

                  {/* Tools List */}
                  <div className="space-y-0.5 ml-1">
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
                            "flex items-center gap-2.5 rounded px-2 py-1.5 text-sm transition-colors",
                            isDisabled
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:bg-accent hover:text-accent-foreground",
                            isCurrentTool && "bg-accent text-accent-foreground"
                          )}
                        >
                          <div className="text-muted-foreground shrink-0">
                            {tool.icon || <FileText className="h-4 w-4" />}
                          </div>

                          <span className="flex-1 font-medium truncate">
                            {tool.name}
                          </span>

                          <div className="flex items-center gap-1">
                            {tool.badge && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-4">
                                {tool.badge}
                              </Badge>
                            )}

                            {toolIsFavorite && (
                              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            )}
                          </div>
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
        {!projectId && (
          <div className="px-3 py-2 border-t bg-muted/30">
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium text-center">
              Select a project to access all tools
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}