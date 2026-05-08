"use client";

import { TooltipProvider } from "@radix-ui/react-tooltip";
import { LiveList, LiveObject } from "@liveblocks/client";
import { type ComponentProps, type CSSProperties } from "react";
import {
  RoomProvider,
  useCanRedo,
  useCanUndo,
  useHistory,
  useSelf,
} from "@liveblocks/react";
import {
  PageShell,
} from "@/components/layout";
import { Avatar } from "@/components/spreadsheet/components/Avatar";
import { Sheet } from "@/components/spreadsheet/components/Sheet";
import { Tooltip } from "@/components/spreadsheet/components/Tooltip";
import {
  COLUMN_HEADER_WIDTH,
  COLUMN_INITIAL_WIDTH,
  GRID_INITIAL_COLUMNS,
  GRID_INITIAL_ROWS,
  GRID_MAX_COLUMNS,
  GRID_MAX_ROWS,
  ROW_INITIAL_HEIGHT,
} from "@/components/spreadsheet/constants";
import {
  AddColumnAfterIcon,
  AddRowAfterIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/spreadsheet/icons";
import { useSpreadsheet } from "@/components/spreadsheet/spreadsheet/react";
import { createInitialStorage } from "@/components/spreadsheet/spreadsheet/utils";
import { appendUnit } from "@/components/spreadsheet/utils/appendUnit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import "@/components/spreadsheet/styles/spreadsheet-vars.css";

const AVATARS_MAX = 4;
const ROOM_ID = "alleato:spreadsheet:demo";

const initialStorage = createInitialStorage(
  { length: GRID_INITIAL_COLUMNS, width: COLUMN_INITIAL_WIDTH },
  { length: GRID_INITIAL_ROWS, height: ROW_INITIAL_HEIGHT },
  [
    ["Cost code", "Forecast", "Variance"],
    ["03-200", "128500", "=B2-121000"],
    ["05-100", "486000", "=B3-492500"],
    ["09-900", "37650", "=B4-34000"],
    ["", "", ""],
  ]
);
type RoomInitialStorage = NonNullable<ComponentProps<typeof RoomProvider>["initialStorage"]>;
const spreadsheetInitialStorage = {
  meta: new LiveObject({ title: "Collaborative Spreadsheet" }),
  properties: new LiveObject({
    progress: "none" as const,
    priority: "none" as const,
    assignedTo: "",
  }),
  labels: new LiveList<string>([]),
  links: new LiveList<string>([]),
  spreadsheet: initialStorage.spreadsheet,
} satisfies RoomInitialStorage;

function SpreadsheetShell() {
  const spreadsheet = useSpreadsheet();
  const history = useHistory();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const self = useSelf();

  if (spreadsheet == null) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-border bg-background"
        style={{ minHeight: "32rem" }}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  const { users, columns, rows, insertColumn, insertRow } = spreadsheet;
  const selfInfo = self?.info;
  const activeCollaborators = users.length + (self ? 1 : 0);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Liveblocks room</Badge>
            <span className="text-xs text-muted-foreground">{ROOM_ID}</span>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Shared formulas, live selection presence, drag-to-reorder rows and
            columns, and undo/redo history are all synced in real time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <div className="flex items-center gap-1">
            <Button
              className="h-8 gap-1"
              disabled={rows.length >= GRID_MAX_ROWS}
              onClick={() => insertRow(rows.length, ROW_INITIAL_HEIGHT)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <AddRowAfterIcon />
              <span>Add row</span>
            </Button>
            <Button
              className="h-8 gap-1"
              disabled={columns.length >= GRID_MAX_COLUMNS}
              onClick={() => insertColumn(columns.length, COLUMN_INITIAL_WIDTH)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <AddColumnAfterIcon />
              <span>Add column</span>
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip content="Undo">
              <Button
                className="h-8 w-8"
                disabled={!canUndo}
                onClick={() => history.undo()}
                size="icon"
                type="button"
                variant="ghost"
              >
                <UndoIcon />
              </Button>
            </Tooltip>
            <Tooltip content="Redo">
              <Button
                className="h-8 w-8"
                disabled={!canRedo}
                onClick={() => history.redo()}
                size="icon"
                type="button"
                variant="ghost"
              >
                <RedoIcon />
              </Button>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {activeCollaborators} active
            </span>
            <div className="flex flex-row-reverse items-center">
              {self ? (
                <Avatar
                  className="-ml-2 h-8 w-8 bg-background"
                  color={selfInfo?.color ?? "#2563eb"}
                  key="self"
                  name={`${selfInfo?.name ?? "Unknown"} (You)`}
                  src={selfInfo?.avatar}
                  tooltipOffset={6}
                />
              ) : null}
              {users.slice(0, AVATARS_MAX - 1).map(({ connectionId, info }) => (
                <Avatar
                  className="-ml-2 h-8 w-8 bg-background"
                  color={info.color ?? "#2563eb"}
                  key={connectionId}
                  name={info.name ?? "Unknown"}
                  src={info.avatar}
                  tooltipOffset={6}
                />
              ))}
              {users.length > AVATARS_MAX - 1 ? (
                <div className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-medium text-muted-foreground">
                  +{users.length - (AVATARS_MAX - 1)}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <main
        className="relative flex flex-col overflow-hidden bg-muted/20"
        style={
          {
            "--accent": selfInfo?.color ?? "#2563eb",
            "--column-header-width": appendUnit(COLUMN_HEADER_WIDTH),
            "--column-width": appendUnit(COLUMN_INITIAL_WIDTH),
            "--row-height": appendUnit(ROW_INITIAL_HEIGHT),
            maxHeight: "calc(100vh - 16rem)",
            minHeight: "32rem",
          } as CSSProperties
        }
      >
        <Sheet {...spreadsheet} />
      </main>
    </section>
  );
}

export default function SpreadsheetDemoPage() {
  return (
    <PageShell
      variant="detailWide"
      title="Collaborative Spreadsheet"
      description="Liveblocks-backed shared grid for estimating, cost planning, and formula-driven team coordination."
    >
      <section className="flex flex-wrap gap-2">
        <Badge variant="outline">Real-time presence</Badge>
        <Badge variant="outline">Formula evaluation</Badge>
        <Badge variant="outline">Undo and redo history</Badge>
        <Badge variant="outline">Row and column reordering</Badge>
      </section>
      <div className="spreadsheet-scope">
        <RoomProvider
          id={ROOM_ID}
          initialPresence={{ cursor: null, selectedCell: null }}
          initialStorage={spreadsheetInitialStorage}
        >
          <TooltipProvider>
            <SpreadsheetShell />
          </TooltipProvider>
        </RoomProvider>
      </div>
    </PageShell>
  );
}
