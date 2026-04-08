import fs from "node:fs/promises";
import path from "node:path";
import React from "react";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChevronRight, FileText, FolderOpen, Home } from "lucide-react";

import { MarkdownRenderer } from "@/components/docs/markdown-renderer";

const DOCS_ROOT = path.join(process.cwd(), "../docs");

interface DocPageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

export async function generateMetadata({
  params,
}: DocPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const title = resolvedParams.slug
    ? resolvedParams.slug[resolvedParams.slug.length - 1].replace(/-/g, " ")
    : "Documentation";
  return {
    title: `${title} | Documentation`,
    description: `View ${title} documentation`,
  };
}

export async function generateStaticParams() {
  const paths: { slug: string[] }[] = [];

  async function walkDir(dir: string, basePath: string[] = []) {
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
          await walkDir(filePath, [...basePath, file]);
        } else if (file.endsWith(".md")) {
          paths.push({ slug: [...basePath, file.replace(".md", "")] });
        }
      }
    } catch {
      // ignore
    }
  }

  await walkDir(DOCS_ROOT);
  return paths;
}

async function getFileContent(filePath: string) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return { content, exists: true };
  } catch {
    return { content: "", exists: false };
  }
}

async function getDirectoryContents(dirPath: string) {
  try {
    const items = await fs.readdir(dirPath);
    const files: string[] = [];
    const directories: string[] = [];
    for (const item of items) {
      const stat = await fs.stat(path.join(dirPath, item));
      if (stat.isDirectory()) {
        directories.push(item);
      } else if (item.endsWith(".md")) {
        files.push(item);
      }
    }
    return { files, directories };
  } catch {
    return { files: [], directories: [] };
  }
}

function Breadcrumbs({ slug }: { slug?: string[] }) {
  const parts = slug ?? [];
  return (
    <nav className="mb-8 flex items-center gap-1 text-sm text-muted-foreground">
      <Link href="/docs" className="flex items-center gap-1 hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
        <span>Docs</span>
      </Link>
      {parts.map((part, i) => {
        const href = `/docs/${parts.slice(0, i + 1).join("/")}`;
        const isLast = i === parts.length - 1;
        const label = part.replace(/-/g, " ").replace(".md", "");
        return (
          <React.Fragment key={part}>
            <ChevronRight className="h-3.5 w-3.5 text-border" />
            {isLast ? (
              <span className="font-medium text-foreground capitalize">{label}</span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors capitalize">{label}</Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export default async function DocPage({ params }: DocPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug ?? [];
  const requestedPath = slug.join("/");
  const fullPath = path.join(DOCS_ROOT, requestedPath);

  let isDirectory = false;
  let filePath = fullPath;

  try {
    const stat = await fs.stat(fullPath);
    isDirectory = stat.isDirectory();
    if (isDirectory) {
      const indexPath = path.join(fullPath, "index.md");
      const { exists } = await getFileContent(indexPath);
      if (exists) {
        filePath = indexPath;
        isDirectory = false;
      }
    }
  } catch {
    const mdPath = `${fullPath}.md`;
    const { exists } = await getFileContent(mdPath);
    if (exists) {
      filePath = mdPath;
    } else {
      notFound();
    }
  }

  if (isDirectory) {
    const { files, directories } = await getDirectoryContents(fullPath);
    const title = slug.length > 0
      ? slug[slug.length - 1].replace(/-/g, " ")
      : "Documentation";

    return (
      <div className="mx-auto max-w-4xl px-8 py-10">
        <Breadcrumbs slug={slug} />
        <h1 className="mb-1 text-2xl font-semibold capitalize text-foreground">{title}</h1>
        <p className="mb-8 text-sm text-muted-foreground">Browse documentation files and folders</p>

        {directories.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Folders</p>
            <div className="overflow-hidden rounded-lg border border-border divide-y divide-border">
              {directories.map((dir) => (
                <Link
                  key={dir}
                  href={`/docs/${requestedPath ? `${requestedPath}/` : ""}${dir}`}
                  className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
                >
                  <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="capitalize">{dir.replace(/-/g, " ")}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Files</p>
            <div className="overflow-hidden rounded-lg border border-border divide-y divide-border">
              {files.map((file) => (
                <Link
                  key={file}
                  href={`/docs/${requestedPath ? `${requestedPath}/` : ""}${file.replace(".md", "")}`}
                  className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="capitalize">{file.replace(".md", "").replace(/-/g, " ")}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {directories.length === 0 && files.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">No documentation files found.</p>
        )}
      </div>
    );
  }

  const { content, exists } = await getFileContent(filePath);
  if (!exists) notFound();

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Breadcrumbs slug={slug} />
      <article>
        <MarkdownRenderer content={content} />
      </article>
      <div className="mt-12 border-t border-border pt-6">
        <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Docs
        </Link>
      </div>
    </div>
  );
}
