import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Documentation",
    default: "Documentation",
  },
  description: "Controlled Alleato OS application documentation",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
