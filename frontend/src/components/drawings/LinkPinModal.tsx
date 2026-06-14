"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRfis, useCreateRfi } from "@/hooks/use-rfis";
import { usePunchItems, useCreatePunchItem } from "@/hooks/use-punch-items";
import { useDrawings } from "@/hooks/use-drawings";
import { usePhotos, useUploadPhotos } from "@/hooks/use-photos";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
} from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { DrawingMarkupPin, CreatePinInput } from "@/hooks/use-drawing-pins";
import { FileText, Wrench, AlertTriangle, CheckSquare, Link2, Image as ImageIcon } from "lucide-react";
import {
  RfiFormFields,
  getRfiFormDefaults,
} from "@/components/rfis/rfi-form-fields";
import {
  rfiDraftSchema,
  rfiOpenSchema,
  type RfiFormValues,
} from "@/lib/schemas/rfi-schema";
import {
  PunchItemFormFields,
  buildPunchItemDefaults,
  punchItemFormSchema,
  type PunchItemFormValues,
} from "@/components/domain/punch-items/punch-item-form-fields";

/** Map {x,y,page} position to CreatePinInput fields */
function posToPin(pos: { x: number; y: number; page: number }): Pick<CreatePinInput, "x_pct" | "y_pct" | "page"> {
  return { x_pct: pos.x, y_pct: pos.y, page: pos.page };
}

// ── Pin type config ─────────────────────────────────────────────────────────

export const PIN_TYPE_CONFIG: Record<
  DrawingMarkupPin["pin_type"],
  { label: string; color: string; icon: React.ReactNode }
> = {
  rfi: { label: "RFI", color: "#3b82f6", icon: <FileText className="h-4 w-4" /> },
  punch_item: { label: "Punch Item", color: "#f97316", icon: <Wrench className="h-4 w-4" /> },
  coordination_issue: { label: "Coordination Issue", color: "#ef4444", icon: <AlertTriangle className="h-4 w-4" /> },
  task: { label: "Task", color: "#8b5cf6", icon: <CheckSquare className="h-4 w-4" /> },
  drawing: { label: "Drawing Link", color: "#22c55e", icon: <Link2 className="h-4 w-4" /> },
  document: { label: "Document", color: "#64748b", icon: <FileText className="h-4 w-4" /> },
  photo: { label: "Photo", color: "#eab308", icon: <ImageIcon className="h-4 w-4" /> },
};

// ── Types ────────────────────────────────────────────────────────────────────

interface LinkPinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  pendingPosition: { x: number; y: number; page: number } | null;
  onConfirm: (input: CreatePinInput) => void;
}

// ── Main modal ───────────────────────────────────────────────────────────────

export function LinkPinModal({
  open,
  onOpenChange,
  projectId,
  pendingPosition,
  onConfirm,
}: LinkPinModalProps) {
  const [selectedType, setSelectedType] = useState<DrawingMarkupPin["pin_type"]>("rfi");

  const handleConfirm = (input: CreatePinInput) => {
    onConfirm(input);
    onOpenChange(false);
  };

  const config = PIN_TYPE_CONFIG[selectedType];

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      {/* eslint-disable-next-line design-system/no-arbitrary-spacing */}
      <ModalContent size="3xl" className="max-h-[85vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>Add Link to Drawing</ModalTitle>
        </ModalHeader>

        {/* Type selector */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Link type</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["rfi", "punch_item", "drawing", "photo", "coordination_issue", "task"] as const).map((type) => {
              const c = PIN_TYPE_CONFIG[type];
              return (
                <Button
                  key={type}
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2.5 rounded-lg text-xs font-medium h-auto",
                    selectedType === type
                      ? "border-primary bg-primary/5 text-primary"
                      : "text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center text-primary-foreground"
                    style={{ backgroundColor: c.color }}
                  >
                    {c.icon}
                  </div>
                  {c.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Type-specific content */}
        {selectedType === "rfi" && (
          <RfiContent
            projectId={projectId}
            position={pendingPosition}
            color={config.color}
            onConfirm={handleConfirm}
            onCancel={() => onOpenChange(false)}
          />
        )}
        {selectedType === "punch_item" && (
          <PunchItemContent
            projectId={projectId}
            position={pendingPosition}
            color={config.color}
            onConfirm={handleConfirm}
            onCancel={() => onOpenChange(false)}
          />
        )}
        {selectedType === "drawing" && (
          <DrawingLinkContent
            projectId={projectId}
            position={pendingPosition}
            color={config.color}
            onConfirm={handleConfirm}
            onCancel={() => onOpenChange(false)}
          />
        )}
        {selectedType === "photo" && (
          <PhotoLinkContent
            projectId={projectId}
            position={pendingPosition}
            color={config.color}
            onConfirm={handleConfirm}
            onCancel={() => onOpenChange(false)}
          />
        )}
        {selectedType === "coordination_issue" && (
          <CoordinationIssueContent
            position={pendingPosition}
            color={config.color}
            onConfirm={handleConfirm}
            onCancel={() => onOpenChange(false)}
          />
        )}
        {selectedType === "task" && (
          <TaskContent
            position={pendingPosition}
            color={config.color}
            onConfirm={handleConfirm}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </ModalContent>
    </Modal>
  );
}

// ── Drawing link panel ───────────────────────────────────────────────────────

function DrawingLinkContent({
  projectId,
  position,
  color,
  onConfirm,
  onCancel,
}: {
  projectId: string;
  position: { x: number; y: number; page: number } | null;
  color: string;
  onConfirm: (input: CreatePinInput) => void;
  onCancel: () => void;
}) {
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [selectedDrawingLabel, setSelectedDrawingLabel] = useState<string | null>(null);
  const [selectedDrawingNumber, setSelectedDrawingNumber] = useState<string | null>(null);
  const { data } = useDrawings(projectId, { page_size: 300 });
  const drawings = data?.drawings ?? [];

  const handleLink = () => {
    if (!position || !selectedDrawingId) return;
    onConfirm({
      ...posToPin(position),
      pin_type: "drawing",
      entity_id: selectedDrawingId,
      entity_label: selectedDrawingLabel ?? undefined,
      entity_number: selectedDrawingNumber ?? undefined,
      color,
    });
  };

  return (
    <div className="space-y-4">
      <Command className="border rounded-md">
        <CommandInput placeholder="Search drawings…" />
        <CommandList className="max-h-56">
          <CommandGroup>
            {drawings.map((drawing) => (
              <CommandItem
                key={drawing.id}
                value={`${drawing.drawingNumber ?? ""} ${drawing.title ?? ""}`}
                onSelect={() => {
                  setSelectedDrawingId(drawing.id);
                  setSelectedDrawingLabel(drawing.title ?? null);
                  setSelectedDrawingNumber(drawing.drawingNumber ?? null);
                }}
                className={cn(
                  "cursor-pointer",
                  selectedDrawingId === drawing.id && "bg-accent"
                )}
              >
                <Link2 className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  {drawing.drawingNumber ? (
                    <p className="text-[11px] text-muted-foreground leading-none mb-1">
                      {drawing.drawingNumber}
                    </p>
                  ) : null}
                  <p className="truncate">{drawing.title}</p>
                </div>
              </CommandItem>
            ))}
            {drawings.length === 0 && <CommandEmpty>No drawings found</CommandEmpty>}
          </CommandGroup>
        </CommandList>
      </Command>
      <ModalFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleLink} disabled={!selectedDrawingId}>Link Drawing</Button>
      </ModalFooter>
    </div>
  );
}

// ── Photo link panel ─────────────────────────────────────────────────────────

function PhotoLinkContent({
  projectId,
  position,
  color,
  onConfirm,
  onCancel,
}: {
  projectId: string;
  position: { x: number; y: number; page: number } | null;
  color: string;
  onConfirm: (input: CreatePinInput) => void;
  onCancel: () => void;
}) {
  const projectIdNum = Number(projectId);
  const { data: photos = [], isLoading } = usePhotos(projectIdNum);
  const uploadPhotos = useUploadPhotos(projectIdNum);
  const [mode, setMode] = useState<"link" | "upload">("link");
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [selectedPhotoLabel, setSelectedPhotoLabel] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const handleLink = () => {
    if (!position || !selectedPhotoId) return;
    onConfirm({
      ...posToPin(position),
      pin_type: "photo",
      entity_id: selectedPhotoId,
      entity_label: selectedPhotoLabel ?? undefined,
      entity_number: `Photo #${selectedPhotoId}`,
      color,
    });
  };

  const handleUploadAndLink = async () => {
    if (!position || !fileToUpload) return;
    const uploaded = await uploadPhotos.mutateAsync({ files: [fileToUpload] });
    const createdPhoto = uploaded[0];
    if (!createdPhoto) return;
    onConfirm({
      ...posToPin(position),
      pin_type: "photo",
      entity_id: String(createdPhoto.id),
      entity_label: createdPhoto.title || createdPhoto.file_name,
      entity_number: `Photo #${createdPhoto.id}`,
      color,
    });
  };

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "link" | "upload")}>
        <TabsList className="w-full">
          <TabsTrigger value="link" className="flex-1">Link Existing Photo</TabsTrigger>
          <TabsTrigger value="upload" className="flex-1">Upload & Link Photo</TabsTrigger>
        </TabsList>

        <TabsContent value="link" className="mt-3">
          <Command className="border rounded-md">
            <CommandInput placeholder="Search photos…" />
            <CommandList className="max-h-56">
              {isLoading ? (
                <CommandEmpty>Loading…</CommandEmpty>
              ) : (
                <CommandGroup>
                  {photos.map((photo) => (
                    <CommandItem
                      key={photo.id}
                      value={`${photo.title} ${photo.file_name}`}
                      onSelect={() => {
                        setSelectedPhotoId(String(photo.id));
                        setSelectedPhotoLabel(photo.title || photo.file_name);
                      }}
                      className={cn(
                        "cursor-pointer",
                        selectedPhotoId === String(photo.id) && "bg-accent"
                      )}
                    >
                      <ImageIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate">{photo.title || photo.file_name}</p>
                        <p className="text-[11px] text-muted-foreground leading-none mt-1">
                          Photo #{photo.id}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                  {!isLoading && photos.length === 0 && (
                    <CommandEmpty>No photos found</CommandEmpty>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
          <ModalFooter className="mt-4">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleLink} disabled={!selectedPhotoId}>Link Photo</Button>
          </ModalFooter>
        </TabsContent>

        <TabsContent value="upload" className="mt-3 space-y-3">
          <div>
            <Label htmlFor="drawing-photo-upload">Photo file *</Label>
            <Input
              id="drawing-photo-upload"
              type="file"
              accept="image/*"
              onChange={(event) => setFileToUpload(event.target.files?.[0] ?? null)}
              className="mt-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Uploads to Photos, then links it directly to this drawing pin.
          </p>
          <ModalFooter>
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button
              onClick={() => void handleUploadAndLink()}
              disabled={!fileToUpload || uploadPhotos.isPending}
            >
              {uploadPhotos.isPending ? "Uploading…" : "Upload & Link"}
            </Button>
          </ModalFooter>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── RFI panel ────────────────────────────────────────────────────────────────

function RfiContent({
  projectId,
  position,
  color,
  onConfirm,
  onCancel,
}: {
  projectId: string;
  position: { x: number; y: number; page: number } | null;
  color: string;
  onConfirm: (input: CreatePinInput) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"link" | "create">("link");
  const [selectedRfiId, setSelectedRfiId] = useState<string | null>(null);
  const [selectedRfiLabel, setSelectedRfiLabel] = useState<string | null>(null);
  const [selectedRfiNumber, setSelectedRfiNumber] = useState<string | null>(null);

  const projectIdNum = Number(projectId);
  const { data: rfis, isLoading } = useRfis(projectIdNum);
  const createRfi = useCreateRfi(projectIdNum);

  // Same form contract as `/[projectId]/rfis/new`. Reusing RfiFormFields keeps
  // the field set, validation rules, and dropdown sources in lockstep with the
  // canonical RFI create page.
  const form = useForm<RfiFormValues>({ defaultValues: getRfiFormDefaults() });

  const handleLink = () => {
    if (!position || !selectedRfiId) return;
    onConfirm({
      ...posToPin(position),
      pin_type: "rfi",
      entity_id: selectedRfiId,
      entity_label: selectedRfiLabel ?? undefined,
      entity_number: selectedRfiNumber ?? undefined,
      color,
    });
  };

  const submitRfi = async (status: "draft" | "open") => {
    if (!position) return;
    const data = form.getValues();
    const schema = status === "open" ? rfiOpenSchema : rfiDraftSchema;
    const result = schema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path[0] as keyof RfiFormValues;
        if (path) form.setError(path, { message: issue.message });
      }
      return;
    }

    const rfi = await createRfi.mutateAsync({ ...result.data, status });
    onConfirm({
      ...posToPin(position),
      pin_type: "rfi",
      entity_id: rfi.id,
      entity_label: rfi.subject,
      entity_number: rfi.number ? `RFI-${rfi.number}` : undefined,
      entity_status: status,
      color,
    });
  };

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "link" | "create")}>
        <TabsList className="w-full">
          <TabsTrigger value="link" className="flex-1">Link Existing RFI</TabsTrigger>
          <TabsTrigger value="create" className="flex-1">Create New RFI</TabsTrigger>
        </TabsList>

        <TabsContent value="link" className="mt-3">
          <Command className="border rounded-md">
            <CommandInput placeholder="Search RFIs…" />
            <CommandList className="max-h-48">
              {isLoading ? (
                <CommandEmpty>Loading…</CommandEmpty>
              ) : (
                <CommandGroup>
                  {(rfis ?? []).map((rfi) => (
                    <CommandItem
                      key={rfi.id}
                      value={`${rfi.number} ${rfi.subject}`}
                      onSelect={() => {
                        setSelectedRfiId(rfi.id);
                        setSelectedRfiLabel(rfi.subject);
                        setSelectedRfiNumber(rfi.number ? `RFI-${rfi.number}` : null);
                      }}
                      className={cn(
                        "cursor-pointer",
                        selectedRfiId === rfi.id && "bg-accent"
                      )}
                    >
                      <span className="text-muted-foreground text-xs mr-2">
                        #{rfi.number}
                      </span>
                      {rfi.subject}
                    </CommandItem>
                  ))}
                  {!isLoading && (rfis ?? []).length === 0 && (
                    <CommandEmpty>No RFIs found</CommandEmpty>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
          <ModalFooter className="mt-4">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleLink} disabled={!selectedRfiId}>Link RFI</Button>
          </ModalFooter>
        </TabsContent>

        <TabsContent value="create" className="mt-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitRfi("open");
            }}
            className="space-y-6"
          >
            <RfiFormFields form={form} projectId={projectIdNum} />

            <ModalFooter className="flex-col sm:flex-row sm:justify-between gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void submitRfi("draft")}
                disabled={createRfi.isPending}
              >
                {createRfi.isPending ? "Saving…" : "Save Draft & Link"}
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createRfi.isPending}>
                  {createRfi.isPending ? "Creating…" : "Create Open & Link"}
                </Button>
              </div>
            </ModalFooter>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Punch Item panel ──────────────────────────────────────────────────────────

function PunchItemContent({
  projectId,
  position,
  color,
  onConfirm,
  onCancel,
}: {
  projectId: string;
  position: { x: number; y: number; page: number } | null;
  color: string;
  onConfirm: (input: CreatePinInput) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"link" | "create">("link");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);

  const projectIdNum = Number(projectId);
  const { data: itemsRaw, isLoading } = usePunchItems(projectIdNum);
  const items = itemsRaw?.items ?? [];
  const createItem = useCreatePunchItem(projectIdNum);

  // Same form contract as PunchItemFormDialog. Reusing PunchItemFormFields
  // keeps the field set + validation in lockstep with the canonical create
  // dialog used by the punch list page.
  const form = useForm<PunchItemFormValues>({
    resolver: zodResolver(punchItemFormSchema),
    defaultValues: buildPunchItemDefaults(),
  });

  const handleLink = () => {
    if (!position || !selectedId) return;
    onConfirm({
      ...posToPin(position),
      pin_type: "punch_item",
      entity_id: selectedId,
      entity_label: selectedLabel ?? undefined,
      entity_number: selectedNumber ?? undefined,
      color,
    });
  };

  const handleCreate = form.handleSubmit(async (data) => {
    if (!position) return;
    const item = await createItem.mutateAsync(data);
    onConfirm({
      ...posToPin(position),
      pin_type: "punch_item",
      entity_id: item.id,
      entity_label: item.title,
      entity_number: item.number ? `#${item.number}` : undefined,
      entity_status: data.status,
      color,
    });
  });

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "link" | "create")}>
        <TabsList className="w-full">
          <TabsTrigger value="link" className="flex-1">Link Existing Item</TabsTrigger>
          <TabsTrigger value="create" className="flex-1">Create New Item</TabsTrigger>
        </TabsList>

        <TabsContent value="link" className="mt-3">
          <Command className="border rounded-md">
            <CommandInput placeholder="Search punch items…" />
            <CommandList className="max-h-48">
              {isLoading ? (
                <CommandEmpty>Loading…</CommandEmpty>
              ) : (
                <CommandGroup>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.number} ${item.title}`}
                      onSelect={() => {
                        setSelectedId(item.id);
                        setSelectedLabel(item.title);
                        setSelectedNumber(item.number ? `#${item.number}` : null);
                      }}
                      className={cn("cursor-pointer", selectedId === item.id && "bg-accent")}
                    >
                      <span className="text-muted-foreground text-xs mr-2">#{item.number}</span>
                      {item.title}
                    </CommandItem>
                  ))}
                  {!isLoading && items.length === 0 && (
                    <CommandEmpty>No punch items found</CommandEmpty>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
          <ModalFooter className="mt-4">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleLink} disabled={!selectedId}>Link Item</Button>
          </ModalFooter>
        </TabsContent>

        <TabsContent value="create" className="mt-3">
          <form
            onSubmit={handleCreate}
            className="space-y-4"
          >
            <PunchItemFormFields form={form} projectId={projectIdNum} />

            <ModalFooter>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={createItem.isPending}>
                {createItem.isPending ? "Creating…" : "Create & Link"}
              </Button>
            </ModalFooter>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Coordination Issue panel ──────────────────────────────────────────────────

function CoordinationIssueContent({
  position,
  color,
  onConfirm,
  onCancel,
}: {
  position: { x: number; y: number; page: number } | null;
  color: string;
  onConfirm: (input: CreatePinInput) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (!position || !title.trim()) return;
    // Coordination issues are stored as pin metadata only — no dedicated table exists yet.
    // The pin is persisted to drawing_markup_pins; the issue itself is NOT backed by a record.
    onConfirm({
      ...posToPin(position),
      pin_type: "coordination_issue",
      entity_label: title.trim(),
      entity_status: "draft",
      color,
    });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md bg-muted px-3 py-2">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Draft pin only.</strong> A Coordination Issues module is not yet available. The title and description are saved on the pin — no separate record is created.
        </p>
      </div>
      <div>
        <Label htmlFor="ci-title">Title *</Label>
        <Input
          id="ci-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Describe the coordination issue…"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="ci-desc">Description</Label>
        <Input
          id="ci-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional details…"
          className="mt-1"
        />
      </div>
      <ModalFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleCreate} disabled={!title.trim()}>Place Draft Pin</Button>
      </ModalFooter>
    </div>
  );
}

// ── Task panel ───────────────────────────────────────────────────────────────

function TaskContent({
  position,
  color,
  onConfirm,
  onCancel,
}: {
  position: { x: number; y: number; page: number } | null;
  color: string;
  onConfirm: (input: CreatePinInput) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");

  const handleCreate = () => {
    if (!position || !title.trim()) return;
    // Tasks created here are stored as pin metadata only — no task record is created in the
    // tasks table (which is reserved for AI-extracted tasks from communications).
    // The pin is persisted to drawing_markup_pins with the title as entity_label.
    onConfirm({
      ...posToPin(position),
      pin_type: "task",
      entity_label: title.trim(),
      entity_status: "draft",
      color,
    });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md bg-muted px-3 py-2">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Draft pin only.</strong> A drawing-linked task module is not yet available. The title is saved on the pin — no separate task record is created.
        </p>
      </div>
      <div>
        <Label htmlFor="task-title">Task Title *</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="mt-1"
        />
      </div>
      <ModalFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleCreate} disabled={!title.trim()}>Place Draft Pin</Button>
      </ModalFooter>
    </div>
  );
}
