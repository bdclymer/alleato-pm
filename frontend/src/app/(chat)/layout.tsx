/**
 * Layout for chat-related routes
 * Full-bleed shell for immersive chat experiences.
 */
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex h-svh min-h-0 bg-background">{children}</div>;
}
