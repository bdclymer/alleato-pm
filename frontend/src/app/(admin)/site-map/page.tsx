"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { getRoutesByCategory, searchRoutes, type SitemapRoute } from "@/lib/sitemap-utils";

function RouteRow({ route, showCategory }: { route: SitemapRoute; showCategory?: boolean }) {
  const isDynamic = route.url.includes("[");
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
      <td className="py-2 pr-6">
        {isDynamic ? (
          <span className="font-medium text-sm">{route.title}</span>
        ) : (
          <Link href={route.url} className="font-medium text-sm hover:text-primary">
            {route.title}
          </Link>
        )}
      </td>
      <td className="py-2 text-xs text-muted-foreground font-mono">{route.url}</td>
      {showCategory && (
        <td className="py-2 pl-6 text-xs text-muted-foreground text-right">{route.category}</td>
      )}
    </tr>
  );
}

export default function SitemapPage() {
  const [query, setQuery] = useState("");

  const categorizedRoutes = useMemo(() => getRoutesByCategory(), []);
  const searchResults = useMemo(
    () => (query.trim() ? searchRoutes(query) : null),
    [query],
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-xl font-semibold mb-6">Sitemap</h1>

      <Input
        placeholder="Search pages..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-8 max-w-sm"
        autoFocus
      />

      {searchResults ? (
        <table className="w-full text-sm">
          <tbody>
            {searchResults.length === 0 ? (
              <tr>
                <td className="py-2 text-muted-foreground">No results</td>
              </tr>
            ) : (
              searchResults.map((route) => (
                <RouteRow key={route.url} route={route} showCategory />
              ))
            )}
          </tbody>
        </table>
      ) : (
        Object.entries(categorizedRoutes).map(([category, routes]) => (
          <div key={category} className="mb-8">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              {category}
            </p>
            <table className="w-full text-sm">
              <tbody>
                {routes.map((route) => (
                  <RouteRow key={route.url} route={route} />
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
