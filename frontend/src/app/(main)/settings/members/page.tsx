"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  UserPlus,
  MoreHorizontal,
  Mail,
  Shield,
  UserX,
  RefreshCw,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RoleTier = 1 | 2 | 3 | 4;
type MemberStatus = "active" | "pending" | "inactive";
type RoleName = "Owner" | "Admin" | "Project Manager" | "Viewer";

interface Member {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  tier: RoleTier;
  status: MemberStatus;
  lastActive: string;
  projects: number;
  initials: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_MEMBERS: Member[] = [
  {
    id: "1",
    name: "Brian Clymer",
    email: "bclymer@alleatogroup.com",
    role: "Owner",
    tier: 4,
    status: "active",
    lastActive: "Today",
    projects: 12,
    initials: "BC",
  },
  {
    id: "2",
    name: "Megan Harrison",
    email: "mharrison@alleatogroup.com",
    role: "Admin",
    tier: 3,
    status: "active",
    lastActive: "2h ago",
    projects: 8,
    initials: "MH",
  },
  {
    id: "3",
    name: "Chris Wade",
    email: "cwade@alleatogroup.com",
    role: "Project Manager",
    tier: 2,
    status: "active",
    lastActive: "Yesterday",
    projects: 5,
    initials: "CW",
  },
  {
    id: "4",
    name: "Sarah Mitchell",
    email: "smitchell@alleatogroup.com",
    role: "Project Manager",
    tier: 2,
    status: "active",
    lastActive: "3 days ago",
    projects: 3,
    initials: "SM",
  },
  {
    id: "5",
    name: "Dave Torres",
    email: "dtorres@contractor.com",
    role: "Viewer",
    tier: 1,
    status: "active",
    lastActive: "1 week ago",
    projects: 2,
    initials: "DT",
  },
  {
    id: "6",
    name: "Amanda Reyes",
    email: "areyes@alleatogroup.com",
    role: "Admin",
    tier: 3,
    status: "pending",
    lastActive: "Invited",
    projects: 0,
    initials: "AR",
  },
  {
    id: "7",
    name: "Marcus Liu",
    email: "mliu@subcontractor.com",
    role: "Viewer",
    tier: 1,
    status: "pending",
    lastActive: "Invited",
    projects: 1,
    initials: "ML",
  },
];

const ROLE_DEFINITIONS: {
  name: RoleName;
  tier: RoleTier;
  description: string;
}[] = [
  {
    name: "Owner",
    tier: 4,
    description: "Full access including billing and account deletion",
  },
  {
    name: "Admin",
    tier: 3,
    description: "Manage members, settings, and integrations",
  },
  {
    name: "Project Manager",
    tier: 2,
    description: "Full access to assigned projects, no workspace settings",
  },
  {
    name: "Viewer",
    tier: 1,
    description: "Read-only access to assigned projects",
  },
];

// ---------------------------------------------------------------------------
// Permission tier pip indicator — the signature element
// ---------------------------------------------------------------------------

function RoleTierPips({ level }: { level: RoleTier }) {
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {([1, 2, 3, 4] as const).map((i) => (
        <div
          key={i}
          className={cn(
            "h-[5px] w-[5px] rounded-sm transition-colors",
            i <= level ? "bg-primary" : "bg-border"
          )}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Role badge
// ---------------------------------------------------------------------------

const roleBadgeStyles: Record<RoleName, string> = {
  Owner: "bg-primary/10 text-primary",
  Admin: "bg-blue-50 text-blue-600",
  "Project Manager": "bg-purple-50 text-purple-600",
  Viewer: "bg-muted text-muted-foreground",
};

function RoleBadge({ role, tier }: { role: RoleName; tier: RoleTier }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
          roleBadgeStyles[role]
        )}
      >
        {role}
      </span>
      <RoleTierPips level={tier} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status indicator
// ---------------------------------------------------------------------------

function MemberStatusIndicator({ status }: { status: MemberStatus }) {
  if (status === "active") {
    return (
      <div className="flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="h-3 w-3" />
        <span>Active</span>
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="flex items-center gap-1 text-xs text-yellow-600">
        <Clock className="h-3 w-3" />
        <span>Pending</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 inline-block" />
      <span>Inactive</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invite dialog
// ---------------------------------------------------------------------------

function InviteMemberDialog() {
  const [selectedRole, setSelectedRole] = React.useState<RoleName>("Project Manager");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <UserPlus className="h-3.5 w-3.5" />
          Invite member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@company.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Access level</Label>
            <div className="space-y-2">
              {ROLE_DEFINITIONS.map((roleDef) => (
                <button
                  key={roleDef.name}
                  type="button"
                  onClick={() => setSelectedRole(roleDef.name)}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-md border p-3 text-left transition-colors",
                    selectedRole === roleDef.name
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border/80 hover:bg-muted/40"
                  )}
                >
                  <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border">
                    {selectedRole === roleDef.name && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{roleDef.name}</span>
                      <RoleTierPips level={roleDef.tier} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {roleDef.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm">Cancel</Button>
          <Button size="sm">Send invite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------------------

type FilterTab = "all" | "admins" | "managers" | "viewers";

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "admins", label: "Admins" },
  { value: "managers", label: "Project Managers" },
  { value: "viewers", label: "Viewers" },
];

function filterMembers(members: Member[], tab: FilterTab): Member[] {
  if (tab === "all") return members;
  if (tab === "admins") return members.filter((m) => m.tier >= 3);
  if (tab === "managers") return members.filter((m) => m.role === "Project Manager");
  if (tab === "viewers") return members.filter((m) => m.role === "Viewer");
  return members;
}

// ---------------------------------------------------------------------------
// Member row
// ---------------------------------------------------------------------------

function MemberRow({ member }: { member: Member }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors group">
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
          {member.initials}
        </AvatarFallback>
      </Avatar>

      {/* Name + email */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {member.name}
          </span>
          {member.status === "pending" && (
            <span className="text-[10px] font-medium uppercase tracking-wide text-yellow-600 bg-yellow-50 rounded px-1.5 py-0.5">
              Invited
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <Mail className="h-2.5 w-2.5 shrink-0" />
          {member.email}
        </span>
      </div>

      {/* Role */}
      <div className="w-44 shrink-0 hidden sm:block">
        <RoleBadge role={member.role} tier={member.tier} />
      </div>

      {/* Projects */}
      <div className="w-20 shrink-0 hidden md:block">
        <span className="text-xs text-muted-foreground tabular-nums">
          {member.projects} {member.projects === 1 ? "project" : "projects"}
        </span>
      </div>

      {/* Last active */}
      <div className="w-28 shrink-0 hidden lg:block">
        <span className="text-xs text-muted-foreground">{member.lastActive}</span>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem>
            <Shield className="mr-2 h-3.5 w-3.5" />
            Change role
          </DropdownMenuItem>
          {member.status === "pending" && (
            <DropdownMenuItem>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Resend invite
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive">
            <UserX className="mr-2 h-3.5 w-3.5" />
            Remove member
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MembersSettingsPage() {
  const [activeFilter, setActiveFilter] = React.useState<FilterTab>("all");
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    let result = filterMembers(MOCK_MEMBERS, activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activeFilter, search]);

  const activeCount = MOCK_MEMBERS.filter((m) => m.status === "active").length;
  const pendingCount = MOCK_MEMBERS.filter((m) => m.status === "pending").length;
  const adminCount = MOCK_MEMBERS.filter((m) => m.tier >= 3).length;

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your team's access levels and workspace permissions.
          </p>
        </div>
        <InviteMemberDialog />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total members", value: MOCK_MEMBERS.length },
          { label: "Active", value: activeCount },
          { label: "Pending invites", value: pendingCount },
          { label: "Admins", value: adminCount },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-card px-4 py-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Permission tier legend */}
      <div className="flex flex-wrap items-center gap-4 mb-5 px-1">
        {ROLE_DEFINITIONS.map((r) => (
          <div key={r.name} className="flex items-center gap-1.5">
            <RoleTierPips level={r.tier} />
            <span className="text-xs text-muted-foreground">{r.name}</span>
          </div>
        ))}
      </div>

      {/* Filter + search bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveFilter(tab.value)}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium transition-colors",
                activeFilter === tab.value
                  ? "bg-background shadow-xs text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="sm:ml-auto">
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-52 text-sm"
          />
        </div>

        <Select defaultValue="name">
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort: Name</SelectItem>
            <SelectItem value="role">Sort: Role</SelectItem>
            <SelectItem value="active">Sort: Last active</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Members table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border bg-muted/30">
          <div className="w-8 shrink-0" />
          <div className="flex-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Member
          </div>
          <div className="w-44 shrink-0 hidden sm:block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Role
          </div>
          <div className="w-20 shrink-0 hidden md:block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Projects
          </div>
          <div className="w-28 shrink-0 hidden lg:block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Last active
          </div>
          <div className="w-7 shrink-0" />
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            No members found.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((member) => (
              <MemberRow key={member.id} member={member} />
            ))}
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Showing {filtered.length} of {MOCK_MEMBERS.length} members
      </p>
    </div>
  );
}
