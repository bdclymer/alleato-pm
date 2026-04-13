import * as React from "react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ds";

const detailGridClassMap = {
  default:
    "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(340px,420px)] gap-x-12 gap-y-10",
  compact:
    "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,380px)] gap-x-10 gap-y-8",
} as const;

export interface ContentSectionStackProps {
  children: React.ReactNode;
  className?: string;
}

export function ContentSectionStack({
  children,
  className,
}: ContentSectionStackProps) {
  return <div className={cn("space-y-10", className)}>{children}</div>;
}

export interface DetailThreeColumnGridProps {
  children: React.ReactNode;
  className?: string;
  density?: keyof typeof detailGridClassMap;
}

export function DetailThreeColumnGrid({
  children,
  className,
  density = "default",
}: DetailThreeColumnGridProps) {
  return (
    <div className={cn(detailGridClassMap[density], className)}>{children}</div>
  );
}

export interface SectionRuleHeadingProps {
  label: string;
  className?: string;
}

export function SectionRuleHeading({
  label,
  className,
}: SectionRuleHeadingProps) {
  return (
    <div className={cn("flex items-center gap-3 pb-1", className)}>
      <Eyebrow>{label}</Eyebrow>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

export interface LabelValueRowProps {
  label: string;
  children?: React.ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  missing?: boolean;
}

export function LabelValueRow({
  label,
  children,
  className,
  labelClassName,
  valueClassName,
  missing,
}: LabelValueRowProps) {
  return (
    <div className={cn("flex items-start gap-4", className)}>
      <dt
        className={cn(
          "w-36 shrink-0 pt-0.5 text-xs text-muted-foreground",
          labelClassName,
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "min-w-0 flex-1 text-left text-sm",
          missing
            ? "italic text-muted-foreground/80"
            : "font-medium text-foreground",
          valueClassName,
        )}
      >
        {children ?? "—"}
      </dd>
    </div>
  );
}

export interface SummaryValueRowProps {
  label: string;
  value: string;
  className?: string;
  bold?: boolean;
  border?: boolean;
}

export function SummaryValueRow({
  label,
  value,
  className,
  bold,
  border,
}: SummaryValueRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        border && "border-t border-border/40 pt-3",
        className,
      )}
    >
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-right text-sm tabular-nums",
          bold ? "text-base font-semibold" : "font-semibold",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
