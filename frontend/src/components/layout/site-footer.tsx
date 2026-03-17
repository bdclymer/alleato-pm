import Link from "next/link";

const currentYear = new Date().getFullYear();

const footerLinks = [
  { label: "Projects", href: "/" },
  { label: "Settings", href: "/settings/plugins" },
  { label: "Docs", href: "/docs" },
  { label: "Sitemap", href: "/site-map" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-muted/30">
      <div className="flex flex-col items-center gap-3 px-4 py-6 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-muted-foreground">
          &copy; {currentYear} Alleato Group. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
