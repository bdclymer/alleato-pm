"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  format,
  isToday,
  isTomorrow,
  isThisWeek,
  startOfDay,
  parseISO,
  differenceInDays,
  addDays,
} from "date-fns";
import Link from "next/link";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Icons
import {
  Calendar,
  Clock,
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Video,
  FileText,
  Folder,
  CalendarDays,
  ArrowRight,
  Play,
  ListFilter,
  LayoutGrid,
  LayoutList,
  Sun,
  Sunrise,
} from "lucide-react";

// Types
interface Meeting {
  id: string;
  title: string | null;
  date: string | null;
  duration_minutes: number | null;
  participants: string | null;
  participants_array: string[] | null;
  summary: string | null;
  project_id: string | null;
  project: string | null;
  status: string | null;
  fireflies_link: string | null;
  action_items: string | null;
  topics: string[] | null;
}

interface ProjectGroup {
  projectId: string | null;
  projectName: string;
  meetings: Meeting[];
}

// Utility functions
const formatDuration = (minutes: number | null): string => {
  if (!minutes) return "-";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const getRelativeDateLabel = (dateStr: string | null): string => {
  if (!dateStr) return "";
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  const daysDiff = differenceInDays(startOfDay(date), startOfDay(new Date()));
  if (daysDiff > 0 && daysDiff <= 7) return format(date, "EEEE");
  return format(date, "MMM d");
};

const getTimeFromDate = (dateStr: string | null): string => {
  if (!dateStr) return "";
  try {
    return format(parseISO(dateStr), "h:mm a");
  } catch {
    return "";
  }
};

// Meeting Card Component
function MeetingCard({
  meeting,
  showDate = false,
  compact = false,
}: {
  meeting: Meeting;
  showDate?: boolean;
  compact?: boolean;
}) {
  const participantCount =
    meeting.participants_array?.length || 0;

  return (
    <Link href={`/meetings/${meeting.id}`}>
      <Card
        className={`group hover:shadow-md hover:border-primary/20 transition-all cursor-pointer ${compact ? "p-4" : ""}`}
      >
        <CardHeader className={compact ? "p-0 pb-2" : "pb-4"}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle
                className={`${compact ? "text-sm" : "text-base"} line-clamp-2 group-hover:text-primary transition-colors`}
              >
                {meeting.title || "Untitled Meeting"}
              </CardTitle>
              {meeting.project && (
                <div className="flex items-center gap-2 mt-1">
                  <Folder className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {meeting.project}
                  </span>
                </div>
              )}
            </div>
            {meeting.fireflies_link && (
              <a
                href={meeting.fireflies_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Video className="h-4 w-4" />
              </a>
            )}
          </div>
        </CardHeader>
        <CardContent className={compact ? "p-0" : "pt-0"}>
          {meeting.summary && !compact && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {meeting.summary}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {showDate && meeting.date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>{format(parseISO(meeting.date), "MMM d")}</span>
              </div>
            )}
            {meeting.date && (
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <span>{getTimeFromDate(meeting.date)}</span>
              </div>
            )}
            {meeting.duration_minutes && (
              <div className="flex items-center gap-2">
                <Play className="h-3 w-3" />
                <span>{formatDuration(meeting.duration_minutes)}</span>
              </div>
            )}
            {participantCount > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3" />
                <span>{participantCount}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Today's Meetings Section
function TodaysMeetings({ meetings }: { meetings: Meeting[] }) {
  if (meetings.length === 0) {
    return (
      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <Sun className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No meetings today</h3>
          <p className="text-sm text-muted-foreground">
            Enjoy your meeting-free day! Check upcoming meetings below.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-amber-500/10 p-1.5">
            <Sun className="h-4 w-4 text-amber-500" />
          </div>
          <h2 className="font-semibold">Today</h2>
          <Badge variant="secondary" className="ml-1">
            {meetings.length}
          </Badge>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {meetings.map((meeting) => (
          <MeetingCard key={meeting.id} meeting={meeting} />
        ))}
      </div>
    </div>
  );
}

// Upcoming Meetings Section
function UpcomingMeetings({ meetings }: { meetings: Meeting[] }) {
  // Group by relative date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Meeting[]> = {};
    meetings.forEach((meeting) => {
      const label = getRelativeDateLabel(meeting.date);
      if (!groups[label]) groups[label] = [];
      groups[label].push(meeting);
    });
    return groups;
  }, [meetings]);

  if (meetings.length === 0) {
    return (
      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No upcoming meetings this week
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="rounded-full bg-blue-500/10 p-1.5">
          <Sunrise className="h-4 w-4 text-info" />
        </div>
        <h2 className="font-semibold">Upcoming This Week</h2>
        <Badge variant="secondary" className="ml-1">
          {meetings.length}
        </Badge>
      </div>
      <div className="space-y-4">
        {Object.entries(groupedByDate).map(([dateLabel, dateMeetings]) => (
          <div key={dateLabel}>
            <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              {dateLabel}
              <span className="text-xs">({dateMeetings.length})</span>
            </h3>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {dateMeetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} compact />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Project Grouped View
function ProjectGroupedView({ groups }: { groups: ProjectGroup[] }) {
  const [openProjects, setOpenProjects] = useState<Set<string>>(new Set());

  const toggleProject = (projectId: string) => {
    const newOpen = new Set(openProjects);
    if (newOpen.has(projectId)) {
      newOpen.delete(projectId);
    } else {
      newOpen.add(projectId);
    }
    setOpenProjects(newOpen);
  };

  // Sort by meeting count
  const sortedGroups = [...groups].sort(
    (a, b) => b.meetings.length - a.meetings.length,
  );

  return (
    <div className="space-y-2">
      {sortedGroups.map((group) => {
        const projectKey = group.projectId || "unassigned";
        const isOpen = openProjects.has(projectKey);
        const recentMeetings = group.meetings.slice(0, 3);
        const hasMore = group.meetings.length > 3;

        return (
          <Collapsible
            key={projectKey}
            open={isOpen}
            onOpenChange={() => toggleProject(projectKey)}
          >
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="py-4 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4 text-primary" />
                        <span className="font-medium">{group.projectName}</span>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {group.meetings.length} meeting
                        {group.meetings.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {group.meetings[0]?.date && (
                        <span>
                          Latest:{" "}
                          {format(parseISO(group.meetings[0].date), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4 px-4">
                  <div className="ml-7 space-y-2">
                    {(isOpen ? group.meetings : recentMeetings).map(
                      (meeting) => (
                        <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
                          <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors group">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                                {meeting.title || "Untitled Meeting"}
                              </p>
                              {meeting.summary && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                  {meeting.summary}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-4 ml-4 text-xs text-muted-foreground shrink-0">
                              {meeting.date && (
                                <span>
                                  {format(parseISO(meeting.date), "MMM d")}
                                </span>
                              )}
                              {meeting.duration_minutes && (
                                <span>
                                  {formatDuration(meeting.duration_minutes)}
                                </span>
                              )}
                              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </Link>
                      ),
                    )}
                    {!isOpen && hasMore && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                      >
                        Show {group.meetings.length - 3} more meetings
                      </Button>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}

// All Meetings Table View
function AllMeetingsTable({
  meetings,
  searchQuery,
}: {
  meetings: Meeting[];
  searchQuery: string;
}) {
  const filteredMeetings = useMemo(() => {
    if (!searchQuery) return meetings;
    const query = searchQuery.toLowerCase();
    return meetings.filter(
      (m) =>
        m.title?.toLowerCase().includes(query) ||
        m.project?.toLowerCase().includes(query) ||
        m.participants?.toLowerCase().includes(query) ||
        m.summary?.toLowerCase().includes(query),
    );
  }, [meetings, searchQuery]);

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Meeting</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Participants</TableHead>
            <TableHead>Project</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMeetings.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-8 text-muted-foreground"
              >
                {searchQuery
                  ? "No meetings match your search"
                  : "No meetings found"}
              </TableCell>
            </TableRow>
          ) : (
            filteredMeetings.map((meeting) => (
              <TableRow
                key={meeting.id}
                className="group cursor-pointer hover:bg-muted/50"
              >
                <TableCell>
                  <Link href={`/meetings/${meeting.id}`} className="block">
                    <div className="font-medium line-clamp-1 group-hover:text-primary transition-colors">
                      {meeting.title || "Untitled Meeting"}
                    </div>
                    {meeting.summary && (
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {meeting.summary}
                      </div>
                    )}
                  </Link>
                </TableCell>
                <TableCell>
                  {meeting.date ? (
                    <div className="text-sm">
                      <div>{format(parseISO(meeting.date), "MMM d, yyyy")}</div>
                      <div className="text-xs text-muted-foreground">
                        {getTimeFromDate(meeting.date)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {formatDuration(meeting.duration_minutes)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-sm line-clamp-1 max-w-[150px]">
                    {meeting.participants || "-"}
                  </div>
                </TableCell>
                <TableCell>
                  {meeting.project ? (
                    <Badge variant="outline" className="text-xs">
                      {meeting.project}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      Unassigned
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {meeting.fireflies_link && (
                    <a
                      href={meeting.fireflies_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Stats Cards
function MeetingStats({ meetings }: { meetings: Meeting[] }) {
  const stats = useMemo(() => {
    const today = meetings.filter(
      (m) => m.date && isToday(parseISO(m.date)),
    ).length;
    const thisWeek = meetings.filter(
      (m) => m.date && isThisWeek(parseISO(m.date)),
    ).length;
    const totalDuration = meetings.reduce(
      (sum, m) => sum + (m.duration_minutes || 0),
      0,
    );
    const uniqueProjects = new Set(
      meetings.map((m) => m.project).filter(Boolean),
    ).size;

    return {
      today,
      thisWeek,
      totalDuration,
      uniqueProjects,
      total: meetings.length,
    };
  }, [meetings]);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">Total Meetings</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">{stats.thisWeek}</div>
          <p className="text-xs text-muted-foreground">This Week</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">
            {formatDuration(stats.totalDuration)}
          </div>
          <p className="text-xs text-muted-foreground">Total Duration</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">{stats.uniqueProjects}</div>
          <p className="text-xs text-muted-foreground">Projects</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-48" />
      <Skeleton className="h-64" />
    </div>
  );
}

// Main Page Component
export default function MeetingsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const supabase = createClient();

  // Fetch meetings
  const {
    data: meetings = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_metadata")
        .select("*")
        .eq("type", "meeting")
        .order("date", { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data || []) as unknown as Meeting[];
    },
  });

  // Derived data
  const { todayMeetings, upcomingMeetings, projectGroups } = useMemo(() => {
    const today: Meeting[] = [];
    const upcoming: Meeting[] = [];
    const projectMap: Map<string | null, Meeting[]> = new Map();

    const now = new Date();
    const weekEnd = addDays(now, 7);

    meetings.forEach((meeting) => {
      // Group by project
      const key = meeting.project_id;
      if (!projectMap.has(key)) projectMap.set(key, []);
      projectMap.get(key)!.push(meeting);

      // Time-based grouping
      if (meeting.date) {
        const date = parseISO(meeting.date);
        if (isToday(date)) {
          today.push(meeting);
        } else if (date > now && date <= weekEnd) {
          upcoming.push(meeting);
        }
      }
    });

    // Sort upcoming by date
    upcoming.sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return parseISO(a.date).getTime() - parseISO(b.date).getTime();
    });

    // Create project groups
    const groups: ProjectGroup[] = [];
    projectMap.forEach((projectMeetings, projectId) => {
      groups.push({
        projectId,
        projectName: projectMeetings[0]?.project || "Unassigned",
        meetings: projectMeetings,
      });
    });

    return {
      todayMeetings: today,
      upcomingMeetings: upcoming,
      projectGroups: groups,
    };
  }, [meetings]);

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">
              Error Loading Meetings
            </CardTitle>
            <CardDescription>{(error as Error).message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-muted-foreground">
            Review and manage your meeting recordings and transcripts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search meetings..."
              className="pl-10 w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Stats */}
          <MeetingStats meetings={meetings} />

          {/* Main Content with Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="mb-4">
              <TabsTrigger value="overview" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="by-project" className="gap-2">
                <Folder className="h-4 w-4" />
                By Project
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2">
                <LayoutList className="h-4 w-4" />
                All Meetings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Today's Meetings */}
              <TodaysMeetings meetings={todayMeetings} />

              {/* Upcoming This Week */}
              <UpcomingMeetings meetings={upcomingMeetings} />

              {/* Recent by Project (preview) */}
              {projectGroups.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold flex items-center gap-2">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      Recent by Project
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab("by-project")}
                      className="text-xs"
                    >
                      View All Projects
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {projectGroups.slice(0, 6).map((group) => (
                      <Card
                        key={group.projectId || "unassigned"}
                        className="hover:shadow-sm transition-shadow"
                      >
                        <CardHeader className="py-4 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Folder className="h-4 w-4 text-primary" />
                              <CardTitle className="text-sm">
                                {group.projectName}
                              </CardTitle>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {group.meetings.length}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 pb-4 px-4">
                          <div className="space-y-1">
                            {group.meetings.slice(0, 2).map((meeting) => (
                              <Link
                                key={meeting.id}
                                href={`/meetings/${meeting.id}`}
                              >
                                <div className="text-xs text-muted-foreground hover:text-primary truncate">
                                  {meeting.title || "Untitled"}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="by-project">
              <ProjectGroupedView groups={projectGroups} />
            </TabsContent>

            <TabsContent value="all">
              <AllMeetingsTable meetings={meetings} searchQuery={searchQuery} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
