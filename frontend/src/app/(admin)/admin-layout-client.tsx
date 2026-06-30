"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/header";
import { SiteFooter } from "@/components/layout/site-footer";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideFooter =
    pathname === "/outlook-draft-feedback" ||
    pathname === "/user-management" ||
    pathname?.startsWith("/user-management/");

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden">
        <div
          className="flex min-h-0 flex-1 flex-col overflow-auto scrollbar-hide transition-[padding] duration-200 ease-out"
          style={{ paddingRight: "var(--admin-feedback-sheet-offset, 0px)" }}
        >
          <SiteHeader />
          <main
            id="app-main-content"
            className="flex min-h-0 min-w-0 flex-1 flex-col"
          >
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          </main>
          {!hideFooter && <SiteFooter />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
