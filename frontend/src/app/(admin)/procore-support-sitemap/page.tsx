import { ProcoreSupportSitemapClient, type ProcoreSupportSitemapEntry } from "./procore-support-sitemap-client";

const PROCORE_SUPPORT_SITEMAP_URL = "https://v2.support.procore.com/sitemap.xml";
const URL_BLOCK_REGEX = /<url>([\s\S]*?)<\/url>/g;
const LOC_REGEX = /<loc>(.*?)<\/loc>/;
const LASTMOD_REGEX = /<lastmod>(.*?)<\/lastmod>/;

function toTitleCase(value: string) {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getSectionLabel(pathname: string) {
  const trimmedPath = pathname.replace(/^\/+|\/+$/g, "");

  if (!trimmedPath) {
    return "Home";
  }

  const [firstSegment] = trimmedPath.split("/");

  if (firstSegment === "product-manuals") {
    return "Product Manuals";
  }

  if (firstSegment === "process-guides") {
    return "Process Guides";
  }

  if (firstSegment.startsWith("faq-")) {
    return "FAQs";
  }

  if (firstSegment.startsWith("reference-")) {
    return "Reference";
  }

  return toTitleCase(firstSegment);
}

function getTitleFromPath(pathname: string) {
  const trimmedPath = pathname.replace(/^\/+|\/+$/g, "");

  if (!trimmedPath) {
    return "Procore Support Home";
  }

  const segments = trimmedPath.split("/");
  const slug = segments[segments.length - 1];

  return toTitleCase(slug);
}

function parseSitemapEntries(xml: string): ProcoreSupportSitemapEntry[] {
  const entries: ProcoreSupportSitemapEntry[] = [];

  for (const match of xml.matchAll(URL_BLOCK_REGEX)) {
    const block = match[1];
    const loc = block.match(LOC_REGEX)?.[1]?.trim();

    if (!loc) {
      continue;
    }

    const pathname = new URL(loc).pathname;

    entries.push({
      url: loc,
      pathname,
      title: getTitleFromPath(pathname),
      section: getSectionLabel(pathname),
      lastModified: block.match(LASTMOD_REGEX)?.[1]?.trim() ?? null,
    });
  }

  return entries.sort((left, right) => {
    const sectionComparison = left.section.localeCompare(right.section);

    if (sectionComparison !== 0) {
      return sectionComparison;
    }

    return left.title.localeCompare(right.title);
  });
}

async function getProcoreSupportSitemapEntries() {
  const response = await fetch(PROCORE_SUPPORT_SITEMAP_URL, {
    next: { revalidate: 60 * 60 * 12 },
    headers: {
      Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sitemap: ${response.status}`);
  }

  const xml = await response.text();

  return parseSitemapEntries(xml);
}

export default async function ProcoreSupportSitemapPage() {
  let entries: ProcoreSupportSitemapEntry[] = [];
  let errorMessage: string | null = null;

  try {
    entries = await getProcoreSupportSitemapEntries();
  } catch (error) {
    errorMessage = error instanceof Error
      ? error.message
      : "Unable to load the Procore support sitemap.";
  }

  return (
    <ProcoreSupportSitemapClient
      entries={entries}
      errorMessage={errorMessage}
      sitemapUrl={PROCORE_SUPPORT_SITEMAP_URL}
    />
  );
}
