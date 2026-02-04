"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownSummaryProps {
  content: string;
}

/**
 * Renders the summary section markdown with custom styling.
 * Used for bullet-point summaries from meeting transcripts.
 * Preprocesses content to remove empty list items that create blank bullets.
 */
export function MarkdownSummary({ content }: MarkdownSummaryProps) {
  // Preprocess: remove empty list items (lines that are just "- " or "* " with nothing after)
  const cleanedContent = content
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      // Filter out empty list items: "- ", "* ", "-", "*"
      return trimmed !== "-" && trimmed !== "*" && trimmed !== "- " && trimmed !== "* ";
    })
    .join("\n");

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="text-sm text-neutral-700 leading-relaxed mb-4 last:mb-0">
            {children}
          </p>
        ),
        ul: ({ children }) => <ul className="space-y-3">{children}</ul>,
        li: ({ children }) => {
          // Skip rendering if children is empty/whitespace only
          const childArray = Array.isArray(children) ? children : [children];
          const hasContent = childArray.some((child) => {
            if (typeof child === "string") return child.trim().length > 0;
            return child != null;
          });
          if (!hasContent) return null;

          return (
            <li className="flex items-start gap-3 text-sm text-neutral-700 leading-relaxed">
              <span className="text-brand mt-0.5 shrink-0">•</span>
              <span>{children}</span>
            </li>
          );
        },
        strong: ({ children }) => (
          <strong className="font-semibold text-neutral-900">
            {children}
          </strong>
        ),
      }}
    >
      {cleanedContent}
    </ReactMarkdown>
  );
}
