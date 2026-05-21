import type { ReactNode } from "react";

export function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`|\[([^\]]+)\]\(([^)]+)\))/g);
  const nodes: ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**")) {
      nodes.push(<strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>);
    } else if (part.startsWith("_") && part.endsWith("_")) {
      nodes.push(<em key={`${keyPrefix}-${i}`}>{part.slice(1, -1)}</em>);
    } else if (part.startsWith("`") && part.endsWith("`")) {
      nodes.push(
        <code
          key={`${keyPrefix}-${i}`}
          className="rounded bg-muted px-1 py-0.5 text-xs font-mono"
        >
          {part.slice(1, -1)}
        </code>,
      );
    } else if (part.startsWith("[")) {
      const linkText = parts[i + 1];
      const linkUrl = parts[i + 2];
      if (linkText && linkUrl) {
        nodes.push(
          <a
            key={`${keyPrefix}-${i}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:opacity-80 break-all"
          >
            {linkText}
          </a>,
        );
        i += 2;
      }
    } else {
      nodes.push(part);
    }
  }
  return nodes;
}

export function renderSimpleMarkdown(text: string): ReactNode {
  const lines = text.split("\n");
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre
          key={`code-${i}`}
          className="my-1.5 overflow-x-auto rounded bg-muted px-3 py-2 text-xs font-mono leading-relaxed whitespace-pre-wrap"
        >
          {codeLines.join("\n")}
        </pre>,
      );
      i++;
      continue;
    }

    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    if (h1) {
      nodes.push(
        <h1 key={`h1-${i}`} className="mt-2 mb-1 text-base font-semibold text-foreground">
          {h1[1]}
        </h1>,
      );
      i++;
      continue;
    }
    if (h2) {
      nodes.push(
        <h2 key={`h2-${i}`} className="mt-2 mb-1 text-sm font-semibold text-foreground">
          {h2[1]}
        </h2>,
      );
      i++;
      continue;
    }
    if (h3) {
      nodes.push(
        <h3 key={`h3-${i}`} className="mt-1.5 mb-0.5 text-xs font-semibold text-foreground">
          {h3[1]}
        </h3>,
      );
      i++;
      continue;
    }

    if (line.match(/^[-*] /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(lines[i].replace(/^[-*] /, ""));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="my-1 ml-4 list-disc space-y-0.5">
          {items.map((item, idx) => (
            <li key={`${i}-${idx}-${item.slice(0, 20)}`} className="text-sm">
              {renderInlineMarkdown(item, `ul-${i}-${idx}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (line.trim() === "") {
      nodes.push(<div key={`gap-${i}`} className="h-1.5" />);
      i++;
      continue;
    }

    nodes.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed">
        {renderInlineMarkdown(line, `p-${i}`)}
      </p>,
    );
    i++;
  }

  return <>{nodes}</>;
}
