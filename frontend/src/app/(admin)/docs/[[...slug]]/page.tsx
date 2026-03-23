import React from "react";
import { notFound } from "next/navigation";
import fs from "fs/promises";
import path from "path";
import { Metadata } from "next";
import { MarkdownRenderer } from "@/components/docs/markdown-renderer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, FolderTree, ChevronRight, Home } from "lucide-react";

// Define the documentation root path
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
  const filePath = resolvedParams.slug ? resolvedParams.slug.join("/") : "index";
  const title = resolvedParams.slug
    ? resolvedParams.slug[resolvedParams.slug.length - 1].replace(/-/g, " ")
    : "Documentation";

  return {
    title: `${title} | Documentation`,
    description: `View ${title} documentation`,
  };
}

// Generate static paths for all markdown files
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
          const slug = [...basePath, file.replace(".md", "")];
          paths.push({ slug });
        }
      }
    } catch (error) {

      console.error("Failed to process documentation:", error);

    }
  }

  await walkDir(DOCS_ROOT);
  return paths;
}

async function getFileContent(
  filePath: string,
): Promise<{ content: string; exists: boolean }> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return { content, exists: true };
  } catch {
    return { content: "", exists: false };
  }
}

async function getDirectoryContents(
  dirPath: string,
): Promise<{ files: string[]; directories: string[] }> {
  try {
    const items = await fs.readdir(dirPath);
    const files: string[] = [];
    const directories: string[] = [];

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = await fs.stat(itemPath);

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
  const parts = slug || [];

  return (
    <nav className="flex items-center space-x-1 text-sm text-foreground dark:text-muted-foreground mb-6">
      <Link
        href="/docs"
        className="flex items-center hover:text-foreground dark:hover:text-muted-foreground"
      >
        <Home className="h-4 w-4" />
        <span className="ml-1">Docs</span>
      </Link>

      {parts.map((part, index) => {
        const href = `/docs/${parts.slice(0, index + 1).join("/")}`;
        const isLast = index === parts.length - 1;
        const displayName = part.replace(/-/g, " ").replace(".md", "");

        return (
          <React.Fragment key={part}>
            <ChevronRight className="h-4 w-4" />
            {isLast ? (
              <span className="font-medium text-foreground dark:text-muted-foreground">
                {displayName}
              </span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground dark:hover:text-muted-foreground"
              >
                {displayName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export default async function DocPage({ params }: DocPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug || [];
  const requestedPath = slug.join("/");

  // Build the full file system path
  const fullPath = path.join(DOCS_ROOT, requestedPath);

  // Check if it's a directory or file request
  let isDirectory = false;
  let filePath = fullPath;

  try {
    const stat = await fs.stat(fullPath);
    isDirectory = stat.isDirectory();

    if (isDirectory) {
      // Check for index.md in the directory
      const indexPath = path.join(fullPath, "index.md");
      const { exists } = await getFileContent(indexPath);

      if (exists) {
        filePath = indexPath;
        isDirectory = false;
      }
    }
  } catch {
    // If the path doesn't exist, try adding .md extension
    const mdPath = `${fullPath}.md`;
    const { exists } = await getFileContent(mdPath);

    if (exists) {
      filePath = mdPath;
    } else {
      notFound();
    }
  }

  // Handle directory listing
  if (isDirectory) {
    const { files, directories } = await getDirectoryContents(fullPath);

    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Breadcrumbs slug={slug} />

        <Card className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground dark:text-muted-foreground flex items-center">
              <FolderTree className="mr-2 h-6 w-6" />
              {slug.length > 0
                ? slug[slug.length - 1].replace(/-/g, " ")
                : "Documentation"}
            </h1>
            <p className="text-foreground dark:text-muted-foreground mt-2">
              Browse documentation files and folders
            </p>
          </div>

          {directories.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-medium text-foreground dark:text-muted-foreground mb-4">
                Folders
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {directories.map((dir) => (
                  <Link
                    key={dir}
                    href={`/docs/${requestedPath}${requestedPath ? "/" : ""}${dir}`}
                    className="flex items-center p-4 border rounded-lg hover:bg-muted dark:hover:bg-foreground/90 transition-colors"
                  >
                    <FolderTree className="h-5 w-5 text-muted-foreground mr-2" />
                    <span className="text-foreground dark:text-muted-foreground">
                      {dir.replace(/-/g, " ")}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-foreground dark:text-muted-foreground mb-4">
                Files
              </h2>
              <div className="space-y-2">
                {files.map((file) => (
                  <Link
                    key={file}
                    href={`/docs/${requestedPath}${requestedPath ? "/" : ""}${file.replace(".md", "")}`}
                    className="flex items-center p-4 border rounded-lg hover:bg-muted dark:hover:bg-foreground/90 transition-colors"
                  >
                    <FileText className="h-5 w-5 text-muted-foreground mr-2" />
                    <span className="text-foreground dark:text-muted-foreground">
                      {file.replace(".md", "").replace(/-/g, " ")}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {directories.length === 0 && files.length === 0 && (
            <p className="text-muted-foreground dark:text-muted-foreground text-center py-8">
              No documentation files found in this directory.
            </p>
          )}
        </Card>
      </div>
    );
  }

  // Handle file display
  const { content, exists } = await getFileContent(filePath);

  if (!exists) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Breadcrumbs slug={slug} />

      <Card className="p-6 md:p-8">
        <article className="markdown-content">
          <MarkdownRenderer content={content} />
        </article>
      </Card>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href="/docs">← Back to Docs</Link>
        </Button>
      </div>
    </div>
  );
}
