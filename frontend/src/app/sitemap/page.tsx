import fs from "fs";
import path from "path";
import Link from "next/link";
import type { ReactElement } from "react";

import { PageHeader } from "@/components/layout/page-header-unified";
import { PageContainer } from "@/components/layout/PageContainer";

interface RouteEntry {
  path: string;
  isDynamic: boolean;
}

const PAGE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mdx"];
const SKIP_DIRS = new Set(["api"]);

function hasPageFile(dir: string): boolean {
  return PAGE_EXTENSIONS.some((ext) => fs.existsSync(path.join(dir, `page${ext}`)));
}

function isSkippableDir(name: string): boolean {
  if (SKIP_DIRS.has(name)) return true;
  if (name.startsWith(".")) return true;
  if (name.startsWith("_")) return true;
  if (name.startsWith("@")) return true;
  return false;
}

function segmentToPath(name: string): { segment: string | null; dynamic: boolean } {
  if (name.startsWith("(") && name.endsWith(")")) {
    return { segment: null, dynamic: false };
  }
  if (name.startsWith("[[...")) {
    return { segment: `:${name.slice(5, -2)}*?`, dynamic: true };
  }
  if (name.startsWith("[...")) {
    return { segment: `:${name.slice(4, -1)}*`, dynamic: true };
  }
  if (name.startsWith("[")) {
    return { segment: `:${name.slice(1, -1)}`, dynamic: true };
  }
  return { segment: name, dynamic: false };
}

function collectRoutes(dir: string, segments: string[]): RouteEntry[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const routes: RouteEntry[] = [];

  if (hasPageFile(dir)) {
    const routePath = `/${segments.filter(Boolean).join("/")}` || "/";
    routes.push({
      path: routePath === "" ? "/" : routePath,
      isDynamic: segments.some((segment) => segment.includes(":")),
    });
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (isSkippableDir(entry.name)) continue;

    const { segment, dynamic } = segmentToPath(entry.name);
    const nextSegments = segment ? [...segments, segment] : [...segments];

    routes.push(
      ...collectRoutes(path.join(dir, entry.name), nextSegments).map((route) => ({
        ...route,
        isDynamic: route.isDynamic || dynamic,
      })),
    );
  }

  return routes;
}

function getRoutes(): RouteEntry[] {
  const cwd = process.cwd();
  const appDir = fs.existsSync(path.resolve(cwd, "frontend/src/app"))
    ? path.resolve(cwd, "frontend/src/app")
    : path.resolve(cwd, "src/app");
  const routes = collectRoutes(appDir, []);
  return routes
    .filter((route) => route.path !== "/sitemap")
    .sort((a, b) => a.path.localeCompare(b.path));
}

export default function SitemapPage(): ReactElement {
  const routes = getRoutes();

  return (
    <>
      <PageHeader
        title="Sitemap"
        description="User-navigable pages in Alleato Procore"
      />
      <PageContainer>
        <div className="space-y-3">
          {routes.map((route) => (
            <div key={route.path} className="flex items-center gap-2">
              <Link
                className="text-sm text-link hover:text-link-hover"
                href={route.path}
                target="_blank"
                rel="noreferrer"
              >
                {route.path === "/" ? "Home" : route.path}
              </Link>
              {route.isDynamic && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  Dynamic
                </span>
              )}
            </div>
          ))}
        </div>
      </PageContainer>
    </>
  );
}
