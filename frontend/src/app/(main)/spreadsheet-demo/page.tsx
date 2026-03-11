"use client";

import { TooltipProvider } from "@radix-ui/react-tooltip";
import cx from "classnames";
import { type CSSProperties, useMemo } from "react";
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
import {
  RoomProvider,
  useCanRedo,
  useCanUndo,
  useHistory,
  useSelf,
} from "@liveblocks/react";
import { useSpreadsheet } from "@/components/spreadsheet/spreadsheet/react";
import { createInitialStorage } from "@/components/spreadsheet/spreadsheet/utils";
import { appendUnit } from "@/components/spreadsheet/utils/appendUnit";
import "@/components/spreadsheet/styles/spreadsheet-vars.css";

const AVATARS_MAX = 3;

const initialStorage = createInitialStorage(
  { length: GRID_INITIAL_COLUMNS, width: COLUMN_INITIAL_WIDTH },
  { length: GRID_INITIAL_ROWS, height: ROW_INITIAL_HEIGHT },
  [
    ["🔢 Entries", "👀 Results", ""],
    ["3", "=A2*3", ""],
    ["1234", "=(A2*A3+A4)/2", ""],
    ["-8", "=B3%2", ""],
    ["", "", ""],
  ]
);

function SpreadsheetContent() {
  const spreadsheet = useSpreadsheet();
  const history = useHistory();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const self = useSelf();

  if (spreadsheet == null) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const { users, columns, rows, insertColumn, insertRow } = spreadsheet;

  return (
    <main
      className="relative flex overflow-hidden flex-col bg-muted rounded-lg border"
      style={
        {
          "--column-header-width": appendUnit(COLUMN_HEADER_WIDTH),
          "--column-width": appendUnit(COLUMN_INITIAL_WIDTH),
          "--row-height": appendUnit(ROW_INITIAL_HEIGHT),
          "--accent": (self?.info as Record<string, string> | undefined)?.color ?? "#3b82f6",
          maxHeight: "calc(100vh - 200px)",
        } as CSSProperties
      }
    >
      <div className="relative h-12 flex-none border-b">
        <div className="absolute flex p-2 inset-0 overflow-x-auto overflow-y-hidden">
          <div className="flex h-8 flex-none mr-2">
            <div className="flex" role="group">
              <button
                className="inline-flex items-center px-2 rounded text-muted-foreground text-sm hover:bg-muted disabled:opacity-40 disabled:cursor-default cursor-pointer"
                disabled={rows.length >= GRID_MAX_ROWS}
                onClick={() => insertRow(rows.length, ROW_INITIAL_HEIGHT)}
              >
                <AddRowAfterIcon />
                <span className="mr-0.5 ml-1">Add Row</span>
              </button>
              <button
                className="inline-flex items-center px-2 rounded text-muted-foreground text-sm hover:bg-muted disabled:opacity-40 disabled:cursor-default cursor-pointer"
                disabled={columns.length >= GRID_MAX_COLUMNS}
                onClick={() =>
                  insertColumn(columns.length, COLUMN_INITIAL_WIDTH)
                }
              >
                <AddColumnAfterIcon />
                <span className="mr-0.5 ml-1">Add Column</span>
              </button>
            </div>
            <div className="flex" role="group">
              <Tooltip content="Undo">
                <button
                  className="inline-flex items-center px-2 rounded text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-default cursor-pointer"
                  onClick={() => history.undo()}
                  disabled={!canUndo}
                >
                  <UndoIcon />
                </button>
              </Tooltip>
              <Tooltip content="Redo">
                <button
                  className="inline-flex items-center px-2 rounded text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-default cursor-pointer"
                  onClick={() => history.redo()}
                  disabled={!canRedo}
                >
                  <RedoIcon />
                </button>
              </Tooltip>
            </div>
          </div>
          <div className="flex flex-none flex-row-reverse ml-auto items-center">
            {self && (
              <Avatar
                color={(self.info as Record<string, string>).color ?? "#3b82f6"}
                key="you"
                name="You"
                src={(self.info as Record<string, string>).avatar}
                tooltipOffset={6}
              />
            )}
            {users.slice(0, AVATARS_MAX - 1).map(({ connectionId, info }) => {
              return (
                <Avatar
                  color={(info as Record<string, string>).color ?? "#3b82f6"}
                  key={connectionId}
                  name={info.name ?? "User"}
                  src={(info as Record<string, string>).avatar}
                  tooltipOffset={6}
                />
              );
            })}
            {users.length > AVATARS_MAX - 1 ? (
              <div className="w-7 h-7 flex items-center justify-center bg-muted rounded-full text-xs font-medium text-muted-foreground">
                +{users.length - AVATARS_MAX + 1}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <Sheet {...spreadsheet} />
    </main>
  );
}

export default function SpreadsheetDemoPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          Collaborative Spreadsheet
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time collaborative spreadsheet with formulas, drag-to-reorder, and multi-user presence.
        </p>
      </div>
      <div className="spreadsheet-scope">
        <RoomProvider
          id="alleato:spreadsheet:demo"
          initialPresence={{
            selectedCell: null,
          }}
          initialStorage={initialStorage}
        >
          <TooltipProvider>
            <SpreadsheetContent />
          </TooltipProvider>
        </RoomProvider>
      </div>
    </div>
  );
}
