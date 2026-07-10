"use client";

import * as React from "react";

/**
 * A presentational button for the bespoke Morning Brief surface. Rendered as a
 * `role="button"` span so the page keeps its hand-tuned pill / icon / ghost
 * styling (the shared `<Button>` primitive would impose its own height, radius,
 * and font). Keyboard-accessible: Enter / Space activate it.
 */
export interface MBButtonProps {
  onClick?: (event: React.SyntheticEvent) => void;
  className?: string;
  title?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  "aria-label"?: string;
}

export function MBButton({
  onClick,
  className,
  title,
  disabled,
  style,
  children,
  "aria-label": ariaLabel,
}: MBButtonProps) {
  return (
    <span
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel}
      title={title}
      className={className}
      style={style}
      onClick={(event) => {
        if (disabled) return;
        onClick?.(event);
      }}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.(event);
        }
      }}
    >
      {children}
    </span>
  );
}
