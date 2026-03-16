"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useThreads } from "@liveblocks/react/suspense";
import type { ThreadData } from "@liveblocks/client";

type OpenCell = { rowId: string; columnId: string } | null;

interface CellThreadContextValue {
  threads: ThreadData[];
  openCell: OpenCell;
  setOpenCell: (cell: OpenCell) => void;
}

const CellThreadContext = createContext<CellThreadContextValue | null>(null);

export function CellThreadProvider({ children }: { children: ReactNode }) {
  const { threads } = useThreads();
  const [openCell, setOpenCell] = useState<OpenCell>(null);

  return (
    <CellThreadContext.Provider value={{ threads, openCell, setOpenCell }}>
      {children}
    </CellThreadContext.Provider>
  );
}

export function useCellThread(): CellThreadContextValue | null {
  return useContext(CellThreadContext);
}
