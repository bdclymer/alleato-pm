import { Metadata } from "next";
import { DocsChat } from "@/components/procore-docs/docs-chat";

export const metadata: Metadata = {
  title: {
    template: "%s | Documentation",
    default: "Documentation",
  },
  description: "Browse Alleato-Procore documentation",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted dark:bg-background">
      {children}
      <DocsChat />
    </div>
  );
}
