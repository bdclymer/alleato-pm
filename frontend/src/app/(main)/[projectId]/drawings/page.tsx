"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { nanoid } from "nanoid";
import Link from "next/link";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Download,
  Eye,
  FileUp,
  Filter,
  History,
  Layers,
  Mail,
  Plus,
  QrCode,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

type DrawingStatus = "Published" | "Draft";

interface DrawingArea {
  id: string;
  name: string;
  description: string;
}

interface Drawing {
  id: string;
  areaId: string;
  number: string;
  title: string;
  discipline: string;
  type: string;
  set: string;
  status: DrawingStatus;
  currentRevisionId: string;
}

interface DrawingRevision {
  id: string;
  drawingId: string;
  revision: string;
  drawingSet: string;
  drawingDate: string;
  receivedDate: string;
  status: DrawingStatus;
  fileName: string;
  fileSize: string;
  isCurrent: boolean;
  description: string;
}

interface DrawingSketch {
  id: string;
  revisionId: string;
  number: string;
  name: string;
  description: string;
  date: string;
  fileName: string;
  author: string;
}

interface DownloadLogEntry {
  id: string;
  revisionId: string;
  user: string;
  action: string;
  timestamp: string;
  device: string;
}

interface RelatedItem {
  id: string;
  drawingId: string;
  type: string;
  reference: string;
  status: string;
}

interface DrawingEmail {
  id: string;
  drawingId: string;
  to: string;
  cc?: string;
  subject: string;
  date: string;
  private: boolean;
}

interface ChangeHistoryEntry {
  id: string;
  drawingId: string;
  actor: string;
  action: string;
  timestamp: string;
}

interface EnrichedDrawing extends Drawing {
  currentRevision: DrawingRevision;
  revisionCount: number;
}

const drawingAreas: DrawingArea[] = [
  {
    id: "area-core",
    name: "Level 1 - Core",
    description: "Lobby, amenities, and core circulation",
  },
  {
    id: "area-amenity",
    name: "Amenity Deck",
    description: "Pool deck and terrace scopes",
  },
];

const drawings: Drawing[] = [
  {
    id: "drawing-a101",
    areaId: "area-core",
    number: "A101",
    title: "Level 1 Floor Plan",
    discipline: "Architectural",
    type: "Plan",
    set: "IFC Set",
    status: "Published",
    currentRevisionId: "rev-a101-b",
  },
  {
    id: "drawing-a213",
    areaId: "area-core",
    number: "A213",
    title: "Enlarged Lobby Plan",
    discipline: "Architectural",
    type: "Plan",
    set: "IFC Set",
    status: "Published",
    currentRevisionId: "rev-a213-a",
  },
  {
    id: "drawing-s201",
    areaId: "area-amenity",
    number: "S201",
    title: "Pool Deck Framing",
    discipline: "Structural",
    type: "Framing",
    set: "Issued for Coordination",
    status: "Draft",
    currentRevisionId: "rev-s201-a",
  },
  {
    id: "drawing-m301",
    areaId: "area-amenity",
    number: "M301",
    title: "Mechanical Roof Plan",
    discipline: "Mechanical",
    type: "HVAC",
    set: "IFC Set",
    status: "Published",
    currentRevisionId: "rev-m301-a",
  },
];

const drawingRevisions: DrawingRevision[] = [
  {
    id: "rev-a101-b",
    drawingId: "drawing-a101",
    revision: "B",
    drawingSet: "IFC Set",
    drawingDate: "2025-11-05",
    receivedDate: "2025-11-07",
    status: "Published",
    fileName: "A101-Level-1-RevB.pdf",
    fileSize: "4.2 MB",
    isCurrent: true,
    description: "Updated elevator lobby dimensions",
  },
  {
    id: "rev-a101-a",
    drawingId: "drawing-a101",
    revision: "A",
    drawingSet: "Issue for Review",
    drawingDate: "2025-10-12",
    receivedDate: "2025-10-14",
    status: "Draft",
    fileName: "A101-Level-1-RevA.pdf",
    fileSize: "3.8 MB",
    isCurrent: false,
    description: "Initial coordination set",
  },
  {
    id: "rev-a213-a",
    drawingId: "drawing-a213",
    revision: "A",
    drawingSet: "IFC Set",
    drawingDate: "2025-11-01",
    receivedDate: "2025-11-03",
    status: "Published",
    fileName: "A213-Lobby-Plan-RevA.pdf",
    fileSize: "2.6 MB",
    isCurrent: true,
    description: "Published lobby layout",
  },
  {
    id: "rev-s201-a",
    drawingId: "drawing-s201",
    revision: "A",
    drawingSet: "Issued for Coordination",
    drawingDate: "2025-10-28",
    receivedDate: "2025-10-30",
    status: "Draft",
    fileName: "S201-Pool-Deck-RevA.pdf",
    fileSize: "5.1 MB",
    isCurrent: true,
    description: "Pending engineer review",
  },
  {
    id: "rev-m301-a",
    drawingId: "drawing-m301",
    revision: "A",
    drawingSet: "IFC Set",
    drawingDate: "2025-09-19",
    receivedDate: "2025-09-20",
    status: "Published",
    fileName: "M301-Roof-Plan-RevA.pdf",
    fileSize: "3.2 MB",
    isCurrent: true,
    description: "Includes revised condenser locations",
  },
];

const initialSketches: DrawingSketch[] = [
  {
    id: "sketch-1",
    revisionId: "rev-a101-b",
    number: "SK-01",
    name: "Lobby soffit coordination",
    description: "Adjusted soffit height at lobby entrance to clear conduit",
    date: "2025-11-08",
    fileName: "SK-01-Lobby.pdf",
    author: "Alex Lee",
  },
  {
    id: "sketch-2",
    revisionId: "rev-a213-a",
    number: "SK-02",
    name: "Millwork change",
    description: "Updated reception desk dimensions",
    date: "2025-11-04",
    fileName: "SK-02-Millwork.pdf",
    author: "Jamie Rivera",
  },
];

const downloadLogs: DownloadLogEntry[] = [
  {
    id: "dl-1",
    revisionId: "rev-a101-b",
    user: "Erin Blake",
    action: "Downloaded PDF",
    timestamp: "2025-11-09T08:15:00Z",
    device: "Web",
  },
  {
    id: "dl-2",
    revisionId: "rev-a101-b",
    user: "Chris Young",
    action: "Viewed in mobile app",
    timestamp: "2025-11-09T10:22:00Z",
    device: "iOS",
  },
  {
    id: "dl-3",
    revisionId: "rev-s201-a",
    user: "Taylor Green",
    action: "Downloaded PDF",
    timestamp: "2025-10-31T12:40:00Z",
    device: "Web",
  },
];

const relatedItems: RelatedItem[] = [
  {
    id: "rel-1",
    drawingId: "drawing-a101",
    type: "RFI",
    reference: "RFI-014",
    status: "Open",
  },
  {
    id: "rel-2",
    drawingId: "drawing-s201",
    type: "Submittal",
    reference: "SUB-032",
    status: "Pending",
  },
];

const initialEmails: DrawingEmail[] = [
  {
    id: "email-1",
    drawingId: "drawing-a101",
    to: "field@site.com",
    cc: "architect@studio.com",
    subject: "Published Revision B for Level 1",
    date: "2025-11-07T15:00:00Z",
    private: false,
  },
  {
    id: "email-2",
    drawingId: "drawing-s201",
    to: "engineer@structural.com",
    subject: "Coordination question: pool deck",
    date: "2025-10-30T09:30:00Z",
    private: true,
  },
];

const changeHistory: ChangeHistoryEntry[] = [
  {
    id: "ch-1",
    drawingId: "drawing-a101",
    actor: "Alex Lee",
    action: "Published revision B",
    timestamp: "2025-11-07T14:45:00Z",
  },
  {
    id: "ch-2",
    drawingId: "drawing-a101",
    actor: "Erin Blake",
    action: "Uploaded lobby sketch",
    timestamp: "2025-11-08T09:10:00Z",
  },
  {
    id: "ch-3",
    drawingId: "drawing-s201",
    actor: "Taylor Green",
    action: "Requested structural review",
    timestamp: "2025-10-30T11:00:00Z",
  },
];

function formatDate(value: string) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProjectDrawingsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [selectedArea, setSelectedArea] = useState<string>(drawingAreas[0].id);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string>(
    drawings.find((item) => item.areaId === drawingAreas[0].id)?.id || "",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [setFilter, setSetFilter] = useState<string>("all");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [sketchDialogOpen, setSketchDialogOpen] = useState(false);
  const [sketches, setSketches] = useState<DrawingSketch[]>(initialSketches);
  const [emails, setEmails] = useState<DrawingEmail[]>(initialEmails);
  const [viewerRevisionId, setViewerRevisionId] = useState<string | null>(null);
  const [sketchForm, setSketchForm] = useState({
    number: "",
    name: "",
    date: "",
    description: "",
    fileName: "",
  });
  const [sketchError, setSketchError] = useState<string | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    to: "",
    cc: "",
    subject: "",
    message: "",
    isPrivate: false,
  });
  const [emailError, setEmailError] = useState<string | null>(null);

  const enrichedDrawings = useMemo<EnrichedDrawing[]>(() => {
    const query = searchTerm.trim().toLowerCase();

    return drawings
      .filter((drawing) => drawing.areaId === selectedArea)
      .filter(
        (drawing) =>
          disciplineFilter === "all" || drawing.discipline === disciplineFilter,
      )
      .filter(
        (drawing) => statusFilter === "all" || drawing.status === statusFilter,
      )
      .filter((drawing) => setFilter === "all" || drawing.set === setFilter)
      .filter((drawing) => {
        if (!query) return true;
        return (
          drawing.number.toLowerCase().includes(query) ||
          drawing.title.toLowerCase().includes(query)
        );
      })
      .map((drawing) => {
        const revisions = drawingRevisions.filter(
          (revision) => revision.drawingId === drawing.id,
        );
        const currentRevision =
          revisions.find((revision) => revision.id === drawing.currentRevisionId) ||
          revisions[0];

        return {
          ...drawing,
          currentRevision,
          revisionCount: revisions.length,
        } satisfies EnrichedDrawing;
      });
  }, [disciplineFilter, searchTerm, selectedArea, setFilter, statusFilter]);

  useEffect(() => {
    const nextDrawing =
      enrichedDrawings.find((drawing) => drawing.id === selectedDrawingId) ||
      enrichedDrawings[0];

    if (nextDrawing && nextDrawing.id !== selectedDrawingId) {
      setSelectedDrawingId(nextDrawing.id);
    }

    if (!nextDrawing && selectedDrawingId) {
      setSelectedDrawingId("");
    }
  }, [enrichedDrawings, selectedDrawingId]);

  const selectedDrawing = enrichedDrawings.find(
    (drawing) => drawing.id === selectedDrawingId,
  );

  const currentRevision = selectedDrawing?.currentRevision;
  const revisionOptions = drawingRevisions.filter(
    (revision) => revision.drawingId === selectedDrawing?.id,
  );
  const activeRevision =
    revisionOptions.find((revision) => revision.id === viewerRevisionId) ||
    currentRevision;

  const selectedSketches = sketches.filter(
    (sketch) => sketch.revisionId === currentRevision?.id,
  );
  const selectedDownloadLog = downloadLogs.filter(
    (log) => log.revisionId === currentRevision?.id,
  );
  const selectedRelatedItems = relatedItems.filter(
    (item) => item.drawingId === selectedDrawing?.id,
  );
  const selectedEmails = emails.filter(
    (email) => email.drawingId === selectedDrawing?.id,
  );
  const selectedChanges = changeHistory
    .filter((item) => item.drawingId === selectedDrawing?.id)
    .sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));

  const uniqueDisciplines = Array.from(
    new Set(drawings.map((drawing) => drawing.discipline)),
  );
  const uniqueSets = Array.from(new Set(drawings.map((drawing) => drawing.set)));

  const handleClearFilters = () => {
    setSearchTerm("");
    setDisciplineFilter("all");
    setStatusFilter("all");
    setSetFilter("all");
  };

  const handleCreateSketch = () => {
    if (!currentRevision) return;

    if (!sketchForm.number || !sketchForm.name || !sketchForm.date || !sketchForm.fileName) {
      setSketchError("Number, name, date, and file name are required.");
      return;
    }

    const newSketch: DrawingSketch = {
      id: nanoid(),
      revisionId: currentRevision.id,
      number: sketchForm.number,
      name: sketchForm.name,
      description: sketchForm.description,
      date: sketchForm.date,
      fileName: sketchForm.fileName,
      author: "Project User",
    };

    setSketches((prev) => [...prev, newSketch]);
    setSketchForm({ number: "", name: "", date: "", description: "", fileName: "" });
    setSketchError(null);
    setSketchDialogOpen(false);
    toast.success("Sketch created and attached to revision.");
  };

  const handleSendEmail = () => {
    if (!selectedDrawing) return;

    if (!emailForm.to || !emailForm.subject) {
      setEmailError("Recipient and subject are required.");
      return;
    }

    const newEmail: DrawingEmail = {
      id: nanoid(),
      drawingId: selectedDrawing.id,
      to: emailForm.to,
      cc: emailForm.cc,
      subject: emailForm.subject,
      date: new Date().toISOString(),
      private: emailForm.isPrivate,
    };

    setEmails((prev) => [newEmail, ...prev]);
    setEmailForm({ to: "", cc: "", subject: "", message: "", isPrivate: false });
    setEmailError(null);
    setEmailDialogOpen(false);
    toast.success("Drawing email prepared.");
  };

  const viewerTitle = selectedDrawing
    ? `${selectedDrawing.number} · ${selectedDrawing.title}`
    : "Drawing viewer";

  return (
    <>
      <ProjectPageHeader
        title="Drawings"
        description={`Project drawings and blueprints for project ${projectId}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <FileUp className="h-4 w-4" />
              Upload Drawings
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href={`/projects/${projectId}/drawings/board`}>
                <Layers className="h-4 w-4" />
                View board
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Reports
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Reports</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Drawing Log</DropdownMenuItem>
                <DropdownMenuItem>Download Log</DropdownMenuItem>
                <DropdownMenuItem>Open Items</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Export PDF</DropdownMenuItem>
                <DropdownMenuItem>Export CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
      <PageContainer>
      <div className="space-y-3">
        <div className="grid gap-4 lg:grid-cols-[220px,1fr]" data-testid="drawing-layout">
          <div className="space-y-1.5" data-testid="drawing-areas">
            <div className="flex items-center justify-between px-1 pb-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Drawing Areas</h3>
            </div>
            {drawingAreas.map((area) => {
              const count = drawings.filter(
                (drawing) => drawing.areaId === area.id,
              ).length;
              const isActive = selectedArea === area.id;
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setSelectedArea(area.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition hover:border-primary ${
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background"
                  }`}
                  aria-pressed={isActive}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{area.name}</span>
                    <Badge variant={isActive ? "default" : "outline"} className="text-xs ml-2 shrink-0">
                      {count}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {area.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border bg-card">
              <div className="flex flex-col gap-2 p-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative w-full lg:max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search drawings"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="pl-9 h-9"
                      aria-label="Search drawings"
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    Clear
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={disciplineFilter}
                    onValueChange={setDisciplineFilter}
                  >
                    <SelectTrigger
                      className="w-[160px] h-9"
                      aria-label="Discipline filter"
                    >
                      <SelectValue placeholder="Discipline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All disciplines</SelectItem>
                      {uniqueDisciplines.map((discipline) => (
                        <SelectItem key={discipline} value={discipline}>
                          {discipline}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger
                      className="w-[140px] h-9"
                      aria-label="Status filter"
                    >
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="Published">Published</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={setFilter} onValueChange={setSetFilter}>
                    <SelectTrigger className="w-[170px] h-9" aria-label="Set filter">
                      <SelectValue placeholder="Drawing set" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sets</SelectItem>
                      {uniqueSets.map((setName) => (
                        <SelectItem key={setName} value={setName}>
                          {setName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="overflow-x-auto" data-testid="drawing-table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Drawing No</TableHead>
                      <TableHead>Drawing Title</TableHead>
                      <TableHead>Revision</TableHead>
                      <TableHead>Drawing Date</TableHead>
                      <TableHead>Received Date</TableHead>
                      <TableHead>Set</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrichedDrawings.map((drawing) => (
                      <TableRow
                        key={drawing.id}
                        className="cursor-pointer"
                        data-testid={`drawing-row-${drawing.id}`}
                        onClick={() => setSelectedDrawingId(drawing.id)}
                      >
                        <TableCell className="font-semibold">
                          {drawing.number}
                        </TableCell>
                        <TableCell>{drawing.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Rev {drawing.currentRevision.revision}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {drawing.revisionCount} total
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(drawing.currentRevision.drawingDate)}</TableCell>
                        <TableCell>{formatDate(drawing.currentRevision.receivedDate)}</TableCell>
                        <TableCell>{drawing.currentRevision.drawingSet}</TableCell>
                        <TableCell>
                          <Badge
                            variant={drawing.status === "Published" ? "default" : "secondary"}
                          >
                            {drawing.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedDrawingId(drawing.id);
                                setViewerRevisionId(drawing.currentRevision.id);
                                setViewerOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Viewer
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="More actions">
                                  <Sparkles className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setSelectedDrawingId(drawing.id);
                                    setViewerRevisionId(drawing.currentRevision.id);
                                    setQrOpen(true);
                                  }}
                                >
                                  <QrCode className="h-4 w-4 mr-2" />
                                  QR Code
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => setSelectedDrawingId(drawing.id)}
                                >
                                  <History className="h-4 w-4 mr-2" />
                                  View details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {selectedDrawing && currentRevision ? (
              <Card data-testid="drawing-detail">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-xl">
                        {selectedDrawing.number} — {selectedDrawing.title}
                      </CardTitle>
                      <CardDescription>
                        {selectedDrawing.discipline} · {selectedDrawing.type} · Set: {currentRevision.drawingSet}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setViewerRevisionId(currentRevision.id);
                          setViewerOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Open viewer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setViewerRevisionId(currentRevision.id);
                          setQrOpen(true);
                        }}
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        QR Code
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <Separator />
                <Tabs defaultValue="general" className="p-4">
                  <TabsList className="grid w-full grid-cols-6" aria-label="Drawing detail tabs">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="sketches">Sketches</TabsTrigger>
                    <TabsTrigger value="downloads">Download Log</TabsTrigger>
                    <TabsTrigger value="related">Related Items</TabsTrigger>
                    <TabsTrigger value="emails">Emails</TabsTrigger>
                    <TabsTrigger value="history">Change History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Revision Info</CardTitle>
                          <CardDescription>Current published revision details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Revision</span>
                            <Badge variant="outline">Rev {currentRevision.revision}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Drawing date</span>
                            <span>{formatDate(currentRevision.drawingDate)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Received</span>
                            <span>{formatDate(currentRevision.receivedDate)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">File</span>
                            <span>{currentRevision.fileName}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Status</span>
                            <Badge variant={currentRevision.status === "Published" ? "default" : "secondary"}>
                              {currentRevision.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Actions</CardTitle>
                          <CardDescription>Quick actions for this drawing</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setViewerRevisionId(currentRevision.id);
                              setViewerOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Open drawing
                          </Button>
                          <Button variant="outline" onClick={() => setQrOpen(true)}>
                            <QrCode className="h-4 w-4 mr-2" />
                            Print QR Code
                          </Button>
                          <Button variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </Button>
                          <Button variant="outline" onClick={() => setEmailDialogOpen(true)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Forward drawing
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="sketches" className="space-y-4" data-testid="sketches-tab">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Sketches ({selectedSketches.length})</h3>
                        <p className="text-sm text-muted-foreground">
                          Attachments tied to this revision
                        </p>
                      </div>
                      <Button onClick={() => setSketchDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add sketch
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {selectedSketches.map((sketch) => (
                        <Card key={sketch.id}>
                          <CardContent className="flex items-center justify-between py-3">
                            <div>
                              <div className="font-semibold">
                                {sketch.number} — {sketch.name}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(sketch.date)} · {sketch.author}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {sketch.description}
                              </p>
                            </div>
                            <Badge variant="outline">{sketch.fileName}</Badge>
                          </CardContent>
                        </Card>
                      ))}
                      {selectedSketches.length === 0 ? (
                        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                          No sketches added yet for this revision.
                        </div>
                      ) : null}
                    </div>
                  </TabsContent>

                  <TabsContent value="downloads" className="space-y-3">
                    <h3 className="font-semibold">Download Log</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Device</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedDownloadLog.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>{log.user}</TableCell>
                            <TableCell>{log.action}</TableCell>
                            <TableCell>{log.device}</TableCell>
                            <TableCell>
                              {new Date(log.timestamp).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        {selectedDownloadLog.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                              No downloads logged yet.
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="related" className="space-y-3">
                    <h3 className="font-semibold">Related Items</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRelatedItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.type}</TableCell>
                            <TableCell>{item.reference}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {selectedRelatedItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                              No related items linked.
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="emails" className="space-y-3" data-testid="emails-tab">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Emails ({selectedEmails.length})</h3>
                        <p className="text-sm text-muted-foreground">
                          Forward drawings to teammates with attachments
                        </p>
                      </div>
                      <Button onClick={() => setEmailDialogOpen(true)}>
                        <Mail className="h-4 w-4 mr-2" />
                        Forward drawing
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {selectedEmails.map((email) => (
                        <Card key={email.id}>
                          <CardContent className="flex items-center justify-between py-3">
                            <div>
                              <div className="font-semibold">{email.subject}</div>
                              <p className="text-sm text-muted-foreground">
                                To: {email.to}
                                {email.cc ? ` · CC: ${email.cc}` : ""}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(email.date).toLocaleString()}
                              </p>
                            </div>
                            <Badge variant={email.private ? "secondary" : "outline"}>
                              {email.private ? "Private" : "Shared"}
                            </Badge>
                          </CardContent>
                        </Card>
                      ))}
                      {selectedEmails.length === 0 ? (
                        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                          No emails sent for this drawing yet.
                        </div>
                      ) : null}
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-3">
                    <h3 className="font-semibold">Change History</h3>
                    <div className="space-y-2">
                      {selectedChanges.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-md border bg-card p-3 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{item.action}</span>
                            <span className="text-muted-foreground">
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-muted-foreground">by {item.actor}</p>
                        </div>
                      ))}
                      {selectedChanges.length === 0 ? (
                        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                          No change history recorded yet.
                        </div>
                      ) : null}
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-5xl" data-testid="drawing-viewer">
          <DialogHeader>
            <DialogTitle>{viewerTitle}</DialogTitle>
            <DialogDescription>
              Review drawing files, switch revisions, and share with the team.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={activeRevision?.id}
                onValueChange={(value) => setViewerRevisionId(value)}
              >
                <SelectTrigger className="w-[200px]" aria-label="Revision selector">
                  <SelectValue placeholder="Revision" />
                </SelectTrigger>
                <SelectContent>
                  {revisionOptions.map((revision) => (
                    <SelectItem key={revision.id} value={revision.id}>
                      Rev {revision.revision} — {revision.drawingSet}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
                <QrCode className="h-4 w-4 mr-2" />
                QR Code
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
            <div className="overflow-hidden rounded-md border bg-muted/40">
              <Image
                src="/drawings/viewer-sample.png"
                alt="Drawing viewer preview"
                width={1400}
                height={900}
                className="h-[460px] w-full object-cover"
                priority
              />
            </div>
            {activeRevision ? (
              <div className="grid gap-3 md:grid-cols-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Revision</div>
                  <div className="font-medium">Rev {activeRevision.revision}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Drawing Date</div>
                  <div className="font-medium">{formatDate(activeRevision.drawingDate)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <Badge variant={activeRevision.status === "Published" ? "default" : "secondary"}>
                    {activeRevision.status}
                  </Badge>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-md" data-testid="qr-modal">
          <DialogHeader>
            <DialogTitle>Drawing QR Code</DialogTitle>
            <DialogDescription>
              Scan to open the latest published drawing on mobile.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="flex h-40 w-40 items-center justify-center rounded-lg border bg-muted">
              <QrCode className="h-28 w-28" />
            </div>
            {selectedDrawing ? (
              <div className="text-center text-sm text-muted-foreground">
                {selectedDrawing.number} — {selectedDrawing.title}
              </div>
            ) : null}
            <Button className="w-full" variant="outline">
              Print QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={sketchDialogOpen} onOpenChange={setSketchDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="sketch-dialog">
          <DialogHeader>
            <DialogTitle>Add Sketch</DialogTitle>
            <DialogDescription>
              Attach a sketch to the current drawing revision.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="sketch-number">Sketch Number</Label>
              <Input
                id="sketch-number"
                value={sketchForm.number}
                onChange={(event) =>
                  setSketchForm((prev) => ({ ...prev, number: event.target.value }))
                }
                placeholder="SK-03"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sketch-name">Name</Label>
              <Input
                id="sketch-name"
                value={sketchForm.name}
                onChange={(event) =>
                  setSketchForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Detail description"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sketch-date">Date</Label>
              <Input
                id="sketch-date"
                type="date"
                value={sketchForm.date}
                onChange={(event) =>
                  setSketchForm((prev) => ({ ...prev, date: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sketch-description">Description</Label>
              <Textarea
                id="sketch-description"
                value={sketchForm.description}
                onChange={(event) =>
                  setSketchForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Add context for this sketch"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sketch-file">File name</Label>
              <Input
                id="sketch-file"
                value={sketchForm.fileName}
                onChange={(event) =>
                  setSketchForm((prev) => ({ ...prev, fileName: event.target.value }))
                }
                placeholder="sketch.pdf"
              />
            </div>
            {sketchError ? (
              <p className="text-sm text-destructive" role="alert">
                {sketchError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSketchDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSketch}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="email-dialog">
          <DialogHeader>
            <DialogTitle>Forward Drawing</DialogTitle>
            <DialogDescription>
              Send the latest revision with a quick note.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="email-to">To</Label>
              <Input
                id="email-to"
                value={emailForm.to}
                onChange={(event) =>
                  setEmailForm((prev) => ({ ...prev, to: event.target.value }))
                }
                placeholder="name@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email-cc">CC</Label>
              <Input
                id="email-cc"
                value={emailForm.cc}
                onChange={(event) =>
                  setEmailForm((prev) => ({ ...prev, cc: event.target.value }))
                }
                placeholder="optional"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailForm.subject}
                onChange={(event) =>
                  setEmailForm((prev) => ({ ...prev, subject: event.target.value }))
                }
                placeholder="Drawing update"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email-message">Message</Label>
              <Textarea
                id="email-message"
                value={emailForm.message}
                onChange={(event) =>
                  setEmailForm((prev) => ({ ...prev, message: event.target.value }))
                }
                placeholder="Include notes or requests"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="font-medium">Private</div>
                <p className="text-sm text-muted-foreground">
                  Hide this email from all except recipients.
                </p>
              </div>
              <Switch
                checked={emailForm.isPrivate}
                onCheckedChange={(checked) =>
                  setEmailForm((prev) => ({ ...prev, isPrivate: checked }))
                }
                aria-label="Private email toggle"
              />
            </div>
            {emailError ? (
              <p className="text-sm text-destructive" role="alert">
                {emailError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </PageContainer>
    </>
  );
}
