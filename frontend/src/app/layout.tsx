import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { HeaderProvider } from "@/components/layout/header-context";
import { ProjectProvider } from "@/contexts/project-context";
import { FavoritesProvider } from "@/contexts/favorites-context";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./Providers";
import { RootClientWidgets } from "./root-client-widgets";
import { ChunkLoadErrorRecovery } from "@/components/providers/chunk-error-recovery";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} font-sans`}
      data-scroll-behavior="smooth"
    >
      <body
        className="font-sans antialiased text-foreground"
        suppressHydrationWarning
      >
        <ChunkLoadErrorRecovery>
        <NuqsAdapter>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Suspense fallback={null}>
              <Providers>
                <PostHogProvider>
                  <ProjectProvider>
                    <FavoritesProvider>
                      <HeaderProvider>
                        {children}
                      </HeaderProvider>
                    </FavoritesProvider>
                  </ProjectProvider>
                </PostHogProvider>
              </Providers>
            </Suspense>
            <Toaster />
            <RootClientWidgets />
            <SpeedInsights />
          </ThemeProvider>
        </QueryProvider>
        </NuqsAdapter>
        </ChunkLoadErrorRecovery>
      </body>
    </html>
  );
}
