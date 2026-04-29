import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Help Center",
    default: "Help Center",
  },
  description: "Controlled Alleato OS help documentation",
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
