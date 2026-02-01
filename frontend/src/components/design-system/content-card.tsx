import React from "react";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface ContentCardProps {
  title: string;
  description?: string;
  metadata?: Array<{
    icon: LucideIcon;
    label: string;
  }>;
  badge?: string;
  href?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

/**
 * Content card component for displaying items like meetings, documents, etc.
 * Follows executive design system with clean borders and refined typography
 */
export function ContentCard({
  title,
  description,
  metadata,
  badge,
  href,
  onClick,
  children,
}: ContentCardProps) {
  const baseClasses =
    "border border-neutral-200 bg-background p-6 md:p-8 transition-all duration-300 hover:border-brand hover:shadow-sm";

  const content = (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg md:text-xl font-sans font-light text-neutral-900 tracking-tight mb-2">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-neutral-600 leading-relaxed line-clamp-2">
                {description}
              </p>
            )}
          </div>

          {badge && (
            <span className="flex-shrink-0 px-3 py-1 text-2xs font-semibold tracking-[0.1em] uppercase bg-neutral-100 text-neutral-700 border border-neutral-200">
              {badge}
            </span>
          )}
        </div>

        {/* Metadata */}
        {metadata && metadata.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-neutral-100">
            {metadata.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 text-xs text-neutral-500"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Custom children content */}
        {children && (
          <div className="pt-3 border-t border-neutral-100">{children}</div>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`block ${baseClasses}`}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} w-full text-left`}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}
