import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@jest/globals";

import {
  publishTrainingDocToDocsSite,
  renderTrainingDocMdx,
  resolveDocsSiteRoot,
} from "../docs-site";

test("renderTrainingDocMdx includes screenshots and review notes", () => {
  const mdx = renderTrainingDocMdx({
    title: "Create Change Request",
    slug: "create-change-request",
    summary: "How to create a change request with screenshots.",
    audience: "internal",
    status: "approved",
    sourceRoute: "/[projectId]/change-events",
    reviewNotes: "Revenue explanation still needs product clarification.",
    bodyMarkdown: "## Steps\n\n1. Open the tool.",
    assets: [
      {
        fileName: "step-1.png",
        caption: "Step one",
        altText: "Change request form",
        stepOrder: 0,
        bytes: new TextEncoder().encode("png"),
      },
    ],
  });

  expect(mdx).toMatch(/title: Create Change Request/);
  expect(mdx).toMatch(/category: Training Docs/);
  expect(mdx).toMatch(/## Screenshots/);
  expect(mdx).toMatch(
    /!\[Change request form\]\(\/images\/training-docs\/create-change-request\/step-1\.png\)/,
  );
  expect(mdx).toMatch(/## Review Notes/);
});

test("publishTrainingDocToDocsSite writes the page, index, assets, and docs nav entry", async () => {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "training-docs-"));
  const docsRoot = path.join(tmpRoot, "apps", "docs");
  await mkdir(
    path.join(docsRoot, "project-management-tools", "training-docs"),
    {
      recursive: true,
    },
  );
  await mkdir(path.join(docsRoot, "images"), { recursive: true });
  await writeFile(
    path.join(docsRoot, "docs.json"),
    JSON.stringify(
      {
        navigation: {
          tabs: [
            {
              tab: "Product",
              groups: [
                {
                  group: "Product",
                  pages: [
                    {
                      group: "Help Articles",
                      expanded: false,
                      pages: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  const result = await publishTrainingDocToDocsSite(
    docsRoot,
    {
      title: "Create Change Request",
      slug: "create-change-request",
      summary: "How to create a change request with screenshots.",
      audience: "internal",
      status: "approved",
      sourceRoute: "/[projectId]/change-events",
      reviewNotes: null,
      bodyMarkdown: "## Steps\n\n1. Open the tool.",
      targetCollection: "project-management-tools/training-docs",
      assets: [
        {
          fileName: "step-1.png",
          caption: "Step one",
          altText: "Change request form",
          stepOrder: 0,
          bytes: new TextEncoder().encode("png"),
        },
      ],
    },
    [
      {
        title: "Create Change Request",
        slug: "create-change-request",
        summary: "How to create a change request with screenshots.",
        audience: "internal",
        status: "published",
        sourceRoute: "/[projectId]/change-events",
        publishedDocPath:
          "project-management-tools/training-docs/create-change-request.mdx",
        lastPublishedAt: "2026-06-26T00:00:00.000Z",
      },
    ],
  );

  expect(result.publishedDocPath).toBe(
    "project-management-tools/training-docs/create-change-request.mdx",
  );

  const page = await readFile(
    path.join(
      docsRoot,
      "project-management-tools",
      "training-docs",
      "create-change-request.mdx",
    ),
    "utf8",
  );
  const index = await readFile(
    path.join(
      docsRoot,
      "project-management-tools",
      "training-docs",
      "index.mdx",
    ),
    "utf8",
  );
  const docsJson = JSON.parse(
    await readFile(path.join(docsRoot, "docs.json"), "utf8"),
  );

  expect(page).toMatch(/# Create Change Request/);
  expect(index).toMatch(
    /\[Create Change Request\]\(\/project-management-tools\/training-docs\/create-change-request\)/,
  );
  expect(JSON.stringify(docsJson)).toMatch(
    /project-management-tools\/training-docs\/index/,
  );
});

test("publishTrainingDocToDocsSite rejects paths outside the docs site", async () => {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "training-docs-path-"));
  const docsRoot = path.join(tmpRoot, "apps", "docs");
  await mkdir(
    path.join(docsRoot, "project-management-tools", "training-docs"),
    {
      recursive: true,
    },
  );
  await writeFile(
    path.join(docsRoot, "docs.json"),
    JSON.stringify({
      navigation: {
        tabs: [
          {
            tab: "Product",
            groups: [
              {
                group: "Product",
                pages: [{ group: "Help Articles", expanded: false, pages: [] }],
              },
            ],
          },
        ],
      },
    }),
    "utf8",
  );

  await expect(() =>
    publishTrainingDocToDocsSite(
      docsRoot,
      {
        title: "Unsafe",
        slug: "unsafe",
        summary: null,
        audience: "internal",
        status: "approved",
        sourceRoute: null,
        reviewNotes: null,
        bodyMarkdown: "## Steps",
        targetCollection: "../../outside",
        assets: [],
      },
      [],
    ),
  ).rejects.toThrow(
    /target collection must be a relative path inside the docs site/i,
  );
});

test("resolveDocsSiteRoot skips partial local folders that do not include docs.json", async () => {
  const cwd = process.cwd();
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "training-docs-root-"));
  const fakeRepoRoot = path.join(tmpRoot, "alleato-pm");
  const partialDocsRoot = path.join(fakeRepoRoot, "docs", "alleato-os-docs");
  const fallbackDocsRoot = path.join(
    os.homedir(),
    "Documents",
    "github",
    "alleato-os",
    "apps",
    "docs",
  );
  const fallbackDocsJsonPath = path.join(fallbackDocsRoot, "docs.json");
  let createdFallbackDocsJson = false;

  await mkdir(partialDocsRoot, { recursive: true });
  await mkdir(fallbackDocsRoot, { recursive: true });
  try {
    await readFile(fallbackDocsJsonPath, "utf8");
  } catch {
    await writeFile(
      fallbackDocsJsonPath,
      '{\n  "navigation": {"tabs": []}\n}\n',
      "utf8",
    );
    createdFallbackDocsJson = true;
  }

  process.chdir(fakeRepoRoot);

  try {
    const resolvedRoot = resolveDocsSiteRoot();
    expect(resolvedRoot).not.toBe(partialDocsRoot);
    expect(resolvedRoot).toMatch(/alleato-os-docs|apps\/docs/);
    await readFile(path.join(resolvedRoot, "docs.json"), "utf8");
  } finally {
    process.chdir(cwd);
    if (createdFallbackDocsJson) {
      await rm(fallbackDocsJsonPath, { force: true });
    }
  }
});
