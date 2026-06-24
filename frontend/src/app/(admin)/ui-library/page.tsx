'use client';

/**
 * UI component library showcase.
 *
 * Temporarily stubbed: the previous version imported ~19 UI components that do
 * not exist on disk (light-rays, orbiting-circles, world-map, charts, tour,
 * filters, etc.), producing module-not-found errors that broke every
 * production build. Stubbed to unblock production deploys. Restore the gallery
 * once the referenced components are actually committed.
 */
export default function UiLibraryPage() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="text-lg font-semibold text-foreground">UI Library</p>
      <p className="max-w-md text-sm text-muted-foreground">
        This component gallery is temporarily unavailable while its components
        are being rebuilt.
      </p>
    </div>
  );
}
