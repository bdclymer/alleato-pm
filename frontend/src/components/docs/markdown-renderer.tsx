"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import type { Components } from "react-markdown";
const markdownSyntaxHighlighterStyle = oneDark as Record<string, unknown>;

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  return (
    <div
      className={cn("prose prose-gray dark:prose-invert max-w-none", className)}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={
          {
            // Headings
            h1: ({ children, ...props }) => (
              <h1
                className="text-3xl font-semibold text-foreground dark:text-gray-200 mt-8 mb-4"
                {...props}
              >
                {children}
              </h1>
            ),
            h2: ({ children, ...props }) => (
              <h2
                className="text-2xl font-semibold text-foreground dark:text-gray-200 mt-6 mb-3"
                {...props}
              >
                {children}
              </h2>
            ),
            h3: ({ children, ...props }) => (
              <h3
                className="text-xl font-semibold text-foreground dark:text-gray-200 mt-4 mb-2"
                {...props}
              >
                {children}
              </h3>
            ),
            h4: ({ children, ...props }) => (
              <h4
                className="text-lg font-semibold text-foreground dark:text-gray-200 mt-3 mb-2"
                {...props}
              >
                {children}
              </h4>
            ),

            // Paragraphs
            p: ({ children, ...props }) => (
              <p
                className="text-foreground dark:text-gray-300 mb-4 leading-relaxed"
                {...props}
              >
                {children}
              </p>
            ),

            // Lists
            ul: ({ children, ...props }) => (
              <ul className="list-disc list-inside mb-4 space-y-1" {...props}>
                {children}
              </ul>
            ),
            ol: ({ children, ...props }) => (
              <ol
                className="list-decimal list-inside mb-4 space-y-1"
                {...props}
              >
                {children}
              </ol>
            ),
            li: ({ children, ...props }) => (
              <li className="text-foreground dark:text-gray-300 ml-4" {...props}>
                {children}
              </li>
            ),

            // Links
            a: ({ children, href, ...props }) => (
              <a
                href={href}
                className="text-blue-600 dark:text-blue-400 hover:underline"
                target={href?.startsWith("http") ? "_blank" : undefined}
                rel={
                  href?.startsWith("http") ? "noopener noreferrer" : undefined
                }
                {...props}
              >
                {children}
              </a>
            ),

            // Code blocks
            code: ({ className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || "");
              const inline = !match;

              return !inline && match ? (
                <SyntaxHighlighter
                  style={markdownSyntaxHighlighterStyle as any}
                  language={match[1]}
                  PreTag="div"
                  className="rounded-lg overflow-hidden mb-4"
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <code className="bg-muted dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-foreground dark:text-gray-200">
                  {children}
                </code>
              );
            },

            // Blockquotes
            blockquote: ({ children, ...props }) => (
              <blockquote
                className="border-l-4 border-border dark:border-gray-600 pl-4 italic text-foreground dark:text-gray-300 mb-4"
                {...props}
              >
                {children}
              </blockquote>
            ),

            // Tables
            table: ({ children, ...props }) => (
              <div className="overflow-x-auto mb-4">
                <table
                  className="min-w-full divide-y divide-gray-300 dark:divide-gray-700"
                  {...props}
                >
                  {children}
                </table>
              </div>
            ),
            thead: ({ children, ...props }) => (
              <thead className="bg-muted dark:bg-gray-800" {...props}>
                {children}
              </thead>
            ),
            tbody: ({ children, ...props }) => (
              <tbody
                className="bg-background dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800"
                {...props}
              >
                {children}
              </tbody>
            ),
            th: ({ children, ...props }) => (
              <th
                className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider"
                {...props}
              >
                {children}
              </th>
            ),
            td: ({ children, ...props }) => (
              <td
                className="px-6 py-4 whitespace-nowrap text-sm text-foreground dark:text-gray-300"
                {...props}
              >
                {children}
              </td>
            ),

            // Horizontal rule
            hr: (props) => (
              <hr
                className="my-8 border-border dark:border-gray-700"
                {...props}
              />
            ),

            // Images
            img: ({ src, alt, ...props }) => (
              <img
                src={src}
                alt={alt || ""}
                className="max-w-full h-auto rounded-lg shadow-lg mb-4"
                loading="lazy"
                {...props}
              />
            ),
          } as Partial<Components>
        }
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
