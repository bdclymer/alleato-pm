/* eslint-disable design-system/no-raw-heading */
"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { ExternalLink } from "lucide-react";

interface Props {
  markdown: string | null;
  slug: string;
}

export function TestScenariosTab({ markdown, slug }: Props) {
  if (!markdown) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <p>No test scenarios file found for <strong>{slug}</strong>.</p>
        <p className="text-xs">
          Create <code className="rounded bg-muted px-1 py-0.5">docs/testing/{slug}-scenarios.md</code> to populate this tab.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5 shrink-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Guided Test Scenarios
        </p>
        <a
          href="http://localhost:3000/testing"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Open Test Runner
        </a>
      </div>

      {/* Markdown content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="prose prose-sm dark:prose-invert max-w-none
          prose-headings:font-semibold prose-headings:text-foreground
          prose-h1:text-lg prose-h1:border-b prose-h1:border-border prose-h1:pb-2 prose-h1:mb-4
          prose-h2:text-base prose-h2:mt-8 prose-h2:mb-3
          prose-h3:text-sm prose-h3:mt-5 prose-h3:mb-2
          prose-p:text-sm prose-p:text-foreground/80 prose-p:leading-relaxed
          prose-strong:text-foreground prose-strong:font-semibold
          prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-foreground
          prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-md
          prose-ol:text-sm prose-ol:text-foreground/80
          prose-ul:text-sm prose-ul:text-foreground/80
          prose-li:my-0.5
          prose-table:text-xs prose-table:w-full
          prose-th:bg-muted prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:text-foreground
          prose-td:px-3 prose-td:py-1.5 prose-td:border-b prose-td:border-border/40
          prose-hr:border-border/40
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        ">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
              // Render checkboxes in table cells as visual badges
              td: ({ children, ...props }) => (
                <td {...props} className="px-3 py-1.5 border-b border-border/40 align-top">
                  {children}
                </td>
              ),
              th: ({ children, ...props }) => (
                <th {...props} className="bg-muted px-3 py-2 text-left text-xs font-semibold text-foreground">
                  {children}
                </th>
              ),
              // Callout-style blockquotes
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-primary/40 bg-muted/40 pl-4 pr-3 py-2 rounded-r-md text-sm text-muted-foreground not-italic">
                  {children}
                </blockquote>
              ),
              // Section headings with horizontal rule styling for h2
              h2: ({ children }) => (
                <h2 className="text-base font-semibold text-foreground mt-8 mb-3 pb-1.5 border-b border-border/50">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-semibold text-foreground mt-5 mb-2">
                  {children}
                </h3>
              ),
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
