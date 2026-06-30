import { requireAdminDashboardAccess } from "@/lib/auth/admin-dashboard";
import { AdminLayoutClient } from "./admin-layout-client";

/**
 * Layout for admin pages.
 * Includes the full app chrome (sidebar, header, footer) for consistency.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminDashboardAccess();

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
