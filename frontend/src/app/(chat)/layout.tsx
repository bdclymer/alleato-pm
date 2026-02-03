import { SidebarLayout } from "@/components/layouts/SidebarLayout";

/**
 * Layout for chat-related routes
 * Includes sidebar, header, and footer
 */
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
