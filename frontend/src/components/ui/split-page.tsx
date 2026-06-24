'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';
type Orientation = 'horizontal' | 'vertical';

interface SplitPageContextValue {
  isOpen: boolean;
  isDesktop: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export interface SplitPageProps {
  /** Exactly two children: [left/top pane, right/bottom pane] */
  children: [ReactNode, ReactNode];
  /** Breakpoint above which both panes are always visible */
  breakpoint?: Breakpoint;
  /** Whether the first pane is open on mobile by default */
  defaultIsOpen?: boolean;
  /** Layout direction */
  orientation?: Orientation;
  className?: string;
}

// ─── Media query hook ─────────────────────────────────────────────────────────

const BREAKPOINT_QUERIES: Record<Breakpoint, string> = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
};

function useMediaQuery(query: string): boolean {
  // Always start false (matches SSR) — useEffect corrects to real value after hydration
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SplitPageContext = createContext<SplitPageContextValue | null>(null);

export function useSplitPage(): SplitPageContextValue {
  const ctx = useContext(SplitPageContext);
  if (!ctx) throw new Error('useSplitPage must be used inside <SplitPage>');
  return ctx;
}

// ─── SplitPage ────────────────────────────────────────────────────────────────

export function SplitPage({
  children,
  breakpoint = 'md',
  defaultIsOpen = true,
  orientation = 'horizontal',
  className,
}: SplitPageProps) {
  const [isOpen, setIsOpen] = useState(defaultIsOpen);
  const isDesktop = useMediaQuery(BREAKPOINT_QUERIES[breakpoint]);

  const [leftPane, rightPane] = children;
  const isHorizontal = orientation === 'horizontal';

  return (
    <SplitPageContext.Provider
      value={{
        isOpen,
        isDesktop,
        onOpen: () => setIsOpen(true),
        onClose: () => setIsOpen(false),
      }}
    >
      <div
        className={cn(
          'flex h-full w-full overflow-hidden',
          isHorizontal ? 'flex-row' : 'flex-col',
          className,
        )}
      >
        {/* First pane (left / top) */}
        <div
          className={cn(
            'shrink-0 overflow-hidden',
            isHorizontal ? 'h-full' : 'w-full',
            isDesktop
              ? 'block'
              : isOpen
                ? 'block w-full flex-none'
                : 'hidden',
          )}
        >
          {leftPane}
        </div>

        {/* Second pane (right / bottom) */}
        <div
          className={cn(
            'flex-1 min-w-0 overflow-auto',
            isDesktop ? 'block' : isOpen ? 'hidden' : 'block',
          )}
        >
          {rightPane}
        </div>
      </div>
    </SplitPageContext.Provider>
  );
}
