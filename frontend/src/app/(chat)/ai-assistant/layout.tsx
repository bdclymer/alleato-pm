/**
 * Layout for AI Assistant page.
 * Inherits SidebarLayout from the (chat) parent layout.
 * Removes default padding for full-height chat experience.
 */
export default function AIAssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 w-full flex-1 overflow-hidden">
      {children}
    </div>
  );
}
