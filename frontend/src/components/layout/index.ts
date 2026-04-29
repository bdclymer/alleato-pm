// ─────────────────────────────────────────────────────────────────────────────
// Layout Components — single import path
//
// The ONE component to use for new pages:
//   import { PageShell } from "@/components/layout"
//   <PageShell variant="dashboard" | "table" | "form" | "detail" | "content" />
//
// Lower-level primitives (used by PageShell internally, also available standalone):
//   PageContainer  — mx-auto wrapper with responsive padding
//   PageHeader / ProjectPageHeader — title + actions bar
//   ProjectFormPageLayout — constrained form layout (prefer PageShell variant="form")
//   PageLayout     — header + content in one container
//   FormContainer  — inner form width constraint
//   PageTabs       — tab bar for sub-navigation
//   AppHeader      — top navigation bar (shell-level, not page-level)
//   Footer         — shell footer
// ─────────────────────────────────────────────────────────────────────────────

// ── PRIMARY: Use this for all new pages ──────────────────────────────────────
export { PageShell } from "./page-shell";
export type { PageShellVariant, PageShellProps } from "./page-shell";

// ── Primitives (for incremental adoption and edge cases) ─────────────────────
export { PageContainer } from "./PageContainer";
export type { PageContainerProps } from "./PageContainer";

export { PageHeader } from "./page-header-unified";
export { PageHeader as ProjectPageHeader } from "./page-header-unified";

export { ProjectFormPageLayout } from "./ProjectFormPageLayout";
export { PageLayout } from "./PageLayout";
export { FormContainer } from "./FormContainer";

export { PageTabs } from "./PageTabs";
export { PageTabsV2 } from "./PageTabsV2";
export {
  ContentSectionStack,
  DetailPanel,
  DetailThreeColumnGrid,
  LabelValueRow,
  SectionRuleHeading,
  SummaryValueRow,
} from "./spacing";

// ── Layout Primitives ────────────────────────────────────────────────────────
export { Container } from "./container";
export type { ContainerProps } from "./container";

export { Stack } from "./stack";
export type { StackProps } from "./stack";

export { Inline } from "./inline";
export type { InlineProps } from "./inline";

// ── Shell-level components (not page-level, don't use inside pages) ───────────
export { AppHeader } from "./AppHeader";
export { default as Footer } from "./Footer";

// ── Shared error boundary UI ─────────────────────────────────────────────────
export { RouteErrorPage } from "./RouteErrorPage";

// ── Route loading skeletons (for loading.tsx files) ──────────────────────────
export {
  TablePageLoading,
  DetailPageLoading,
  FormPageLoading,
} from "./PageLoading";
