"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

const BRIEF_MARKDOWN_COMPONENTS: Partial<Components> = {
  p: ({ children }) => (
    <p className="text-sm leading-7 text-foreground">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-1 pl-5">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="pl-1 text-sm leading-7 text-foreground">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-primary underline underline-offset-4 hover:no-underline"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-xs text-muted-foreground">
      {children}
    </code>
  ),
  // Brief sections are split on `##`, so any residual `###`/`####` headings
  // land here. Render them as a styled subheading element (not a raw <h3>,
  // which the design-system lint bans) to keep visual consistency.
  h3: ({ children }) => (
    <div className="text-sm font-semibold text-foreground">{children}</div>
  ),
  h4: ({ children }) => (
    <div className="text-sm font-semibold text-foreground">{children}</div>
  ),
};

/**
 * Renders a Daily Brief section body as styled markdown — bold, inline code,
 * bullet/numbered lists, and links — matching the detail page's typography.
 * The brief content is authored as markdown, so raw text rendering leaked
 * literal `**` and backticks into the page.
 */
export function BriefMarkdown({ content }: { content: string }) {
  return (
    <div className="space-y-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={BRIEF_MARKDOWN_COMPONENTS}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
