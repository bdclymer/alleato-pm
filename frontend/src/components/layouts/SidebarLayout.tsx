"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/header";
import Footer from "@/components/layout/Footer";

/**
 * SidebarLayout - Shared layout component for routes that need the app sidebar
 *
 * Use this in route group layout.tsx files:
 * ```tsx
 * import { SidebarLayout } from "@/components/layouts/SidebarLayout";
 *
 * export default function Layout({ children }) {
 *   return <SidebarLayout>{children}</SidebarLayout>;
 * }
 * ```
 */
export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          <SiteHeader />
          <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
            {children}
          </main>
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
