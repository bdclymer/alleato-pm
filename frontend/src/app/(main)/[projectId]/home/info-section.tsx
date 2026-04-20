"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { Eyebrow } from "@/components/ds";

interface InfoSectionItem {
  id: string | number;
  title: string;
  subtitle?: string;
  href?: string;
}

interface InfoSectionProps {
  title: string;
  icon: LucideIcon;
  items: InfoSectionItem[];
  viewAllHref?: string;
  emptyMessage?: string;
  maxItems?: number;
}

export function InfoSection({
  title,
  icon: Icon,
  items,
  viewAllHref,
  emptyMessage = "No items",
  maxItems = 3,
}: InfoSectionProps) {
  const displayItems = items.slice(0, maxItems);

  return (
    <div className="rounded-md border border-neutral-200 bg-background p-8 mb-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-brand" />
          <Eyebrow>{title}</Eyebrow>
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-xs text-neutral-500 font-medium hover:underline"
          >
            View All
          </Link>
        )}
      </div>
      <div className="space-y-4">
        {displayItems.length > 0 ? (
          displayItems.map((item) => {
            const content = (
              <>
                <div className="text-sm font-medium text-neutral-900 group-hover:text-brand truncate transition-colors">
                  {item.title}
                </div>
                {item.subtitle && (
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {item.subtitle}
                  </div>
                )}
              </>
            );

            if (item.href) {
              return (
                <Link key={item.id} href={item.href} className="block group">
                  {content}
                </Link>
              );
            }

            return <div key={item.id}>{content}</div>;
          })
        ) : (
          <p className="text-sm text-neutral-400">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}
