import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { HeaderProvider } from "@/components/layout/header-context";
import { ProjectProvider } from "@/contexts/project-context";
import { FavoritesProvider } from "@/contexts/favorites-context";
import { Toaster } from "@/components/ui/sonner";
import { DevAutoFillForms } from "@/components/dev/DevAutoFillForms";
import { AgentationThemeSync } from "@/components/dev/AgentationThemeSync";
import { DevAnnotationOverlay } from "@/components/dev/dev-annotation-overlay";
import { DesignViolationOverlay } from "@/components/dev/design-violation-overlay";
import { Providers } from "./Providers";
import { Agentation } from "agentation";
import "./globals.css";
import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-ui/styles/dark/media-query.css";
import "swagger-ui-dist/swagger-ui.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Alleato AI - Project Management",
  description: "Modern construction management platform powered by AI.",
  icons: {
    icon: "/Alleato Favicon.png",
    shortcut: "/Alleato Favicon.png",
    apple: "/Alleato Favicon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="font-sans">
      <body
        className="font-sans antialiased text-foreground"
        suppressHydrationWarning
      >
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Suspense fallback={null}>
              <Providers>
                <ProjectProvider>
                  <FavoritesProvider>
                    <HeaderProvider>
                      {children}
                      <DevAutoFillForms />
                    </HeaderProvider>
                  </FavoritesProvider>
                </ProjectProvider>
              </Providers>
            </Suspense>
          </ThemeProvider>
        </QueryProvider>
        <Toaster />
        {process.env.NODE_ENV === "development" && (
          <>
            <AgentationThemeSync />
            <Agentation />
            <DesignViolationOverlay />
            {/* DevAnnotationOverlay disabled — Agentation MCP already handles this workflow */}
            {/* <DevAnnotationOverlay /> */}
          </>
        )}
      </body>
    </html>
  );
}
