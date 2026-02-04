"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SectionHeader } from "@/components/ui/section-header";

interface FormattedTranscriptProps {
  content: string;
}

/**
 * Renders markdown-formatted transcript content with proper styling
 * Expects to receive only the transcript portion (not the full document)
 *
 * CRITICAL FIX: This component now preprocesses transcript text to add proper paragraph breaks
 * before speaker labels to prevent the transcript from displaying as one jumbled block of text.
 */
export function FormattedTranscript({ content }: FormattedTranscriptProps) {
  // Preprocess the transcript to ensure proper paragraph breaks
  // This handles transcripts that might not have proper markdown formatting
  const formattedContent = content
    // Add double line breaks before speaker timestamps (e.g., **0:15:30**)
    .replace(/(\*\*\d+:\d+:\d+\*\*)/g, "\n\n$1\n")
    // Add double line breaks before speaker names followed by colon (e.g., **John Smith:**)
    .replace(/(\*\*[^*]+:\*\*)/g, "\n\n$1 ")
    // Ensure there's spacing after paragraphs
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return (
    <div className="border border-neutral-200 bg-background p-8 rounded-md">
      <SectionHeader className="mb-6">Full Transcript</SectionHeader>

      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-sans font-light tracking-tight text-neutral-900 mb-4 mt-8 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-sans font-light tracking-tight text-neutral-900 mb-3 mt-6 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium text-neutral-900 mb-3 mt-6 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-medium text-neutral-900 mb-2 mt-4">
              {children}
            </h4>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="text-sm text-neutral-700 leading-relaxed mb-4">
              {children}
            </p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="text-sm text-neutral-700 leading-relaxed mb-4 space-y-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-sm text-neutral-700 leading-relaxed mb-4 space-y-2">
              {children}
            </ol>
          ),
          li: ({ children }) => {
            // Skip empty list items
            const childArray = Array.isArray(children) ? children : [children];
            const hasContent = childArray.some((child) => {
              if (typeof child === "string") return child.trim().length > 0;
              return child != null;
            });
            if (!hasContent) return null;

            return (
              <li className="flex items-start gap-3 ml-1">
                <span className="text-brand mt-0.5 shrink-0">•</span>
                <span>{children}</span>
              </li>
            );
          },

          // Emphasis
          strong: ({ children }) => (
            <strong className="font-semibold text-neutral-900">
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,

          // Code
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

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-brand pl-4 py-2 mb-4 text-neutral-600 italic">
              {children}
            </blockquote>
          ),

          // Horizontal rule
          hr: () => <hr className="border-neutral-200 my-6" />,

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-brand hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-neutral-200">
                {children}
              </table>
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
