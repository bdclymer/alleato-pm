"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SectionHeader } from "@/components/ui/section-header";

interface FormattedTranscriptProps {
  content: string;
  /** Ordered list of participant emails — index 0 = speaker "0", index 1 = speaker "1", etc. */
  participants?: string[];
}

function formatParticipantName(email: string): string {
  const localPart = email.split("@")[0];
  if (!localPart) return email;
  const parts = localPart.split(/[._-]/);
  if (parts.length >= 2) {
    const firstName =
      parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    const lastName =
      parts[parts.length - 1].charAt(0).toUpperCase() +
      parts[parts.length - 1].slice(1).toLowerCase();
    return `${firstName} ${lastName}`;
  }
  return localPart.charAt(0).toUpperCase() + localPart.slice(1).toLowerCase();
}

/**
 * Renders markdown-formatted transcript content with proper styling.
 * Maps numbered speaker labels (e.g. **0:**) to actual participant names
 * when a participants array is provided.
 */
export function FormattedTranscript({
  content,
  participants = [],
}: FormattedTranscriptProps) {
  const formattedContent = content
    // Replace **0:**, **1:** etc. with actual participant names (or "Speaker N" fallback)
    .replace(/\*\*(\d+):\*\*/g, (_, n) => {
      const idx = parseInt(n, 10);
      if (participants[idx]) {
        return `**${formatParticipantName(participants[idx])}:**`;
      }
      return `**Speaker ${idx + 1}:**`;
    })
    // Add double line breaks before speaker timestamps (e.g., **0:15:30**)
    .replace(/(\*\*\d+:\d+:\d+\*\*)/g, "\n\n$1\n")
    // Add double line breaks before speaker name labels
    .replace(/(\*\*[^*]+:\*\*)/g, "\n\n$1 ")
    // Normalise excessive blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return (
    <div className="space-y-2">
      <SectionHeader className="mb-1">Full Transcript</SectionHeader>

      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-sans font-light tracking-tight text-neutral-900 mb-4 mt-8 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-sans font-light tracking-tight text-neutral-900 mb-4 mt-6 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium text-neutral-900 mb-4 mt-6 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-medium text-neutral-900 mb-2 mt-4">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-sm text-neutral-700 leading-relaxed mb-2">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="text-sm text-neutral-700 leading-relaxed mb-2 space-y-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-sm text-neutral-700 leading-relaxed mb-4 space-y-2">
              {children}
            </ol>
          ),
          li: ({ children }) => {
            const childArray = Array.isArray(children) ? children : [children];
            const hasContent = childArray.some((child) => {
              if (typeof child === "string") return child.trim().length > 0;
              return child != null;
            });
            if (!hasContent) return null;
            return (
              <li className="flex items-start gap-2.5 ml-1">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0 flex-none" />
                <span>{children}</span>
              </li>
            );
          },
          strong: ({ children }) => (
            <strong className="font-semibold text-neutral-900">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 bg-neutral-100 text-neutral-800 rounded text-xs font-mono">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-neutral-50 border border-neutral-200 rounded p-4 overflow-x-auto mb-4">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/30 pl-4 py-2 mb-4 text-neutral-600 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-neutral-200 my-6" />,
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-border">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-neutral-50">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-neutral-200">{children}</tbody>
          ),
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider border-b border-neutral-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-sm text-neutral-700">{children}</td>
          ),
        }}
      >
        {formattedContent}
      </ReactMarkdown>
    </div>
  );
}
