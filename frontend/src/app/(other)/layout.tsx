"use client";

import type { ReactElement, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/header";
import Footer from "@/components/layout/Footer";

/**
 * Main layout with sidebar for all primary app routes.
 * Routes in (main)/ get the full app experience with sidebar, header, and footer.
 */
export default function MainLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const pathname = usePathname();
  const isFullBleed = pathname === "/team-chat" || pathname === "/command-center";

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        {!isFullBleed && <SiteHeader />}
        <main className={isFullBleed ? "flex-1 min-h-0 flex flex-col" : undefined}>
          {children}
        </main>
        {!isFullBleed && <Footer />}
      </SidebarInset>
    </SidebarProvider>
  );
}
