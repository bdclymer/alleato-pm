import * as React from "react";
import { cn } from "@/lib/utils";
import { Stack } from "./stack";
import { Inline } from "./inline";

/**
 * MobileCard component for consistent mobile list item styling.
 * Used in data tables and lists for mobile responsive views.
 *
 * @example
 * <MobileCard>
 *   <MobileCard.Header>
 *     <Stack gap="xs">
 *       <Link>Item #123</Link>
 *       <Text size="sm" tone="muted">Description</Text>
 *     </Stack>
 *     <StatusBadge status="active" />
 *   </MobileCard.Header>
 *   <MobileCard.Footer>
 *     <Text size="sm" tone="muted">Total</Text>
 *     <Text weight="medium">$1,234.56</Text>
 *   </MobileCard.Footer>
 * </MobileCard>
 */

export interface MobileCardProps {
  /** Additional CSS classes */
  className?: string;
  /** Card content */
  children: React.ReactNode;
}

export function MobileCard({ className, children }: MobileCardProps) {
  return (
    <Stack gap="sm" className={className}>
      {children}
    </Stack>
  );
}

interface MobileCardHeaderProps {
  /** Additional CSS classes */
  className?: string;
  /** Header content */
  children: React.ReactNode;
}

MobileCard.Header = function MobileCardHeader({
  className,
  children,
}: MobileCardHeaderProps) {
  return (
    <Inline justify="between" align="start" className={className}>
      {children}
    </Inline>
  );
};

interface MobileCardFooterProps {
  /** Additional CSS classes */
  className?: string;
  /** Footer content */
  children: React.ReactNode;
}

MobileCard.Footer = function MobileCardFooter({
  className,
  children,
}: MobileCardFooterProps) {
  return (
    <Inline justify="between" className={cn("pt-2 border-t", className)}>
      {children}
    </Inline>
  );
};
