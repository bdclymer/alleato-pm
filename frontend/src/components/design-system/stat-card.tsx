import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  onClick?: () => void;
  href?: string;
}

/**
 * Statistical card component for displaying metrics
 * Features brand color accents and hover effects
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  onClick,
  href,
}: StatCardProps) {
  const baseClasses =
    "border border-neutral-200 bg-background p-8 transition-all duration-300 hover:border-brand hover:shadow-sm";
  const interactiveClasses = onClick || href ? "cursor-pointer" : "";

  const content = (
    <>
      <div className="flex items-center justify-between mb-2">
        {Icon && <Icon className="h-4 w-4 text-brand" />}
        {trend && (
          <span
            className={`text-xs ${trend.positive ? "text-green-600" : "text-red-600"}`}
          >
            {trend.value}
          </span>
        )}
      </div>
      <div className="text-xl md:text-2xl font-light tabular-nums tracking-tight text-neutral-900 mb-1">
        {value}
      </div>
      <p className="text-2xs font-semibold tracking-[0.15em] uppercase text-neutral-500">
        {label}
      </p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} ${interactiveClasses} text-left w-full`}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}
