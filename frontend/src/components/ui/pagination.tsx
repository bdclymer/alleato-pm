"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps, buttonVariants } from "@/components/ui/button";

// Simple Pagination Component (for basic use cases)
type SimplePaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const MAX_PAGES_SHOWN = 6;

export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
}: SimplePaginationProps) {
  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className="text-foreground"
    >
      <ul className="flex items-center justify-center flex-wrap gap-1 text-muted-foreground">
        <li>
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage === 1}
            aria-label="Previous page"
            onClick={() => onPageChange(currentPage - 1)}
            className="h-8 gap-1 text-xs font-medium text-muted-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </Button>
        </li>

        {Array.from({ length: totalPages }, (_, index) => {
          const isActive = currentPage === index + 1;

          if (totalPages > MAX_PAGES_SHOWN) {
            if (currentPage > 3) {
              if (index + 1 < currentPage) {
                return null;
              }

              if (index + 1 === currentPage + 3) {
                return (
                  <li key={index}>
                    <SimplePaginationEllipsis />
                  </li>
                );
              }

              if (index + 1 < currentPage + 3 || index + 1 > totalPages - 2) {
                return (
                  <li key={index}>
                    <SimplePaginationButton
                      page={index + 1}
                      isActive={isActive}
                      onPageChange={onPageChange}
                    />
                  </li>
                );
              }
            }

            if (index === 3) {
              return (
                <li key={index}>
                  <SimplePaginationEllipsis />
                </li>
              );
            }

            if (index > 2 && index < totalPages - 2) {
              return null;
            }
          }

          return (
            <li key={index}>
              <SimplePaginationButton
                page={index + 1}
                isActive={isActive}
                onPageChange={onPageChange}
              />
            </li>
          );
        })}

        <li>
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage === totalPages}
            aria-label="Next page"
            onClick={() => onPageChange(currentPage + 1)}
            className="h-8 gap-1 text-xs font-medium text-muted-foreground"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </li>
      </ul>
    </nav>
  );
}

function SimplePaginationButton({
  page,
  isActive,
  onPageChange,
}: {
  page: number;
  isActive: boolean;
  onPageChange: (page: number) => void;
}) {
  return (
    <Button
      variant={isActive ? "default" : "ghost"}
      size="sm"
      aria-label={`Go to page ${page}`}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "h-8 min-w-8 px-2 text-xs font-medium",
        !isActive && "text-muted-foreground",
      )}
      onClick={() => onPageChange(page)}
    >
      {page}
    </Button>
  );
}

function SimplePaginationEllipsis() {
  return (
    <span className="flex h-8 min-w-8 items-center justify-center text-xs text-muted-foreground">
      <MoreHorizontal className="h-4 w-4" />
    </span>
  );
}

// Composable Pagination Components (shadcn style)
const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
));
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">;

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size,
      }),
      className
    )}
    {...props}
  />
);
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = ({
  className,
  size: _size,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({
  className,
  size: _size,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
);
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
