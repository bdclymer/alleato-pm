import Link from "next/link";

import { SectionRuleHeading } from "@/components/layout";
import { Button } from "@/components/ui/button";
import type { TrainingDocStep, TrainingDocWithAssets } from "@/lib/training-docs/types";
import { cn } from "@/lib/utils";

export function AppTrainingDocPage({
  backHref,
  backLabel,
  doc,
}: {
  backHref: string;
  backLabel: string;
  doc: TrainingDocWithAssets;
}) {
  const bodyMarkdown = doc.steps.length
    ? stripGeneratedManualSections(doc.body_markdown)
    : doc.body_markdown;
  const sortedSteps = doc.steps
    .slice()
    .sort((left, right) => left.step_order - right.step_order);
  const videoAsset = doc.assets
    .slice()
    .sort((left, right) => left.step_order - right.step_order)
    .find((asset) => asset.asset_type === "video" && asset.signed_url);

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-background text-foreground">
      <div className="mx-auto grid max-w-screen-2xl gap-10 px-6 pb-10 pt-8 lg:grid-cols-[18rem_minmax(0,56rem)_16rem] lg:px-10 xl:gap-14">
        <aside className="hidden lg:block">
          <nav aria-label="Training doc navigation" className="sticky top-6 space-y-5">
            <Button asChild variant="ghost" size="sm" className="justify-start px-0">
              <Link href={backHref}>{backLabel}</Link>
            </Button>
            <div className="space-y-2 text-sm">
              <a href="#overview" className="block font-medium text-primary">
                Overview
              </a>
              {bodyMarkdown.trim() ? (
                <a href="#details" className="block text-muted-foreground hover:text-primary">
                  Details
                </a>
              ) : null}
              {sortedSteps.length ? (
                <a href="#steps" className="block text-muted-foreground hover:text-primary">
                  Steps
                </a>
              ) : null}
              {videoAsset ? (
                <a href="#video" className="block text-muted-foreground hover:text-primary">
                  Video
                </a>
              ) : null}
            </div>
          </nav>
        </aside>

        <main className="min-w-0 space-y-10">
          <header id="overview" className="space-y-4">
            <Button asChild variant="ghost" size="sm" className="px-0 lg:hidden">
              <Link href={backHref}>{backLabel}</Link>
            </Button>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-primary">App Training</p>
              <h1 className="text-4xl font-semibold tracking-normal text-foreground">
                {doc.title}
              </h1>
              {doc.summary ? (
                <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
                  {doc.summary}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{doc.status.replace("_", " ")}</span>
              {doc.source_route ? <span>{doc.source_route}</span> : null}
              {doc.last_published_at ? (
                <span>
                  Published{" "}
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(doc.last_published_at))}
                </span>
              ) : null}
            </div>
          </header>

          {bodyMarkdown.trim() ? (
            <section id="details" className="space-y-5">
              <SectionRuleHeading label="Details" />
              <ManualMarkdown markdown={bodyMarkdown} />
            </section>
          ) : null}

          {videoAsset?.signed_url ? (
            <section id="video" className="space-y-5">
              <SectionRuleHeading label="Video" />
              <video
                controls
                preload="metadata"
                className="aspect-video w-full rounded-md border border-border bg-foreground"
              >
                <source src={videoAsset.signed_url} type={videoAsset.mime_type} />
              </video>
              {videoAsset.caption ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  {videoAsset.caption}
                </p>
              ) : null}
            </section>
          ) : null}

          {sortedSteps.length ? (
            <section id="steps" className="space-y-6">
              <SectionRuleHeading label="Steps" />
              <div className="space-y-10">
                {sortedSteps.map((step, index) => (
                  <TrainingDocStepBlock key={step.id} index={index} step={step} />
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function TrainingDocStepBlock({
  index,
  step,
}: {
  index: number;
  step: TrainingDocStep;
}) {
  return (
    <section className="space-y-4">
      <div className="max-w-3xl space-y-3">
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
            Step {index + 1}
          </div>
          <div className="text-base font-semibold text-foreground">{step.title}</div>
        </div>
        <StepInstruction step={step} />
        {step.expected_result ? (
          <p className="text-sm leading-6 text-muted-foreground">
            <span className="font-medium text-foreground">Expected result:</span>{" "}
            {step.expected_result}
          </p>
        ) : null}
      </div>

      {step.screenshot_asset?.signed_url ? (
        <figure className="space-y-2">
          <img
            src={step.screenshot_asset.signed_url}
            alt={step.screenshot_asset.alt_text ?? step.screenshot_asset.file_name}
            className="w-full rounded-md border border-border object-contain"
          />
          {step.screenshot_asset.caption ? (
            <figcaption className="text-sm text-muted-foreground">
              {step.screenshot_asset.caption}
            </figcaption>
          ) : null}
        </figure>
      ) : null}
    </section>
  );
}

function ManualMarkdown({ markdown }: { markdown: string }) {
  const sections = parseMarkdownSections(markdown);
  return (
    <div className="max-w-3xl space-y-5">
      {sections.map((section) => (
        <section key={section.heading || section.blocks.map((block) => block.kind).join("-")} className="space-y-2">
          {section.heading ? (
            <div className="text-base font-semibold text-foreground">
              {section.heading}
            </div>
          ) : null}
          <div className="space-y-2 text-sm leading-6 text-foreground">
            {section.blocks.map((block, index) =>
              block.kind === "list" ? (
                <ul
                  key={`${section.heading}-list-${index}`}
                  className="list-disc space-y-1 pl-5"
                >
                  {block.items.map((item) => (
                    <li key={item}>{formatInlineMarkdown(item)}</li>
                  ))}
                </ul>
              ) : (
                <p key={`${section.heading}-paragraph-${index}`}>
                  {formatInlineMarkdown(block.text)}
                </p>
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function StepInstruction({ step }: { step: TrainingDocStep }) {
  const generatedList = getGeneratedList(step);
  const instructionIntro = stripMarkdownList(step.instruction_markdown);

  return (
    <div className="space-y-3">
      {instructionIntro ? (
        <p className="text-sm leading-6 text-foreground">
          {formatInlineMarkdown(instructionIntro)}
        </p>
      ) : null}
      {generatedList.length ? (
        <ul className="grid list-disc gap-x-8 gap-y-1 pl-5 text-sm leading-6 text-foreground sm:grid-cols-2 lg:grid-cols-3">
          {generatedList.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function parseMarkdownSections(markdown: string): Array<{
  heading: string;
  blocks: Array<
    { kind: "paragraph"; text: string } | { kind: "list"; items: string[] }
  >;
}> {
  const sections: Array<{ heading: string; lines: string[] }> = [];
  let current = { heading: "", lines: [] as string[] };

  for (const line of markdown.split("\n")) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      if (current.heading || current.lines.some((item) => item.trim())) {
        sections.push(current);
      }
      current = { heading: heading[1].trim(), lines: [] };
      continue;
    }
    current.lines.push(line);
  }

  if (current.heading || current.lines.some((item) => item.trim())) {
    sections.push(current);
  }

  return sections.map((section) => ({
    heading: section.heading,
    blocks: parseMarkdownBlocks(section.lines),
  }));
}

function parseMarkdownBlocks(
  lines: string[],
): Array<
  { kind: "paragraph"; text: string } | { kind: "list"; items: string[] }
> {
  const blocks: Array<
    { kind: "paragraph"; text: string } | { kind: "list"; items: string[] }
  > = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  function flushParagraph() {
    const text = paragraph.join(" ").replace(/\s+/g, " ").trim();
    if (text) blocks.push({ kind: "paragraph", text });
    paragraph = [];
  }

  function flushList() {
    if (list.length) blocks.push({ kind: "list", items: list });
    list = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      list.push(trimmed.slice(2).trim());
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function getGeneratedList(step: TrainingDocStep): string[] {
  const metadata = step.action_metadata;
  const labels = metadata.labels;
  if (Array.isArray(labels)) {
    return labels.filter((item): item is string => typeof item === "string");
  }

  const buttons = metadata.buttons;
  if (Array.isArray(buttons)) {
    return buttons.filter((item): item is string => typeof item === "string");
  }

  return [];
}

function stripMarkdownList(markdown: string): string {
  return markdown
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("- "))
    .join("\n")
    .trim();
}

function stripGeneratedManualSections(markdown: string): string {
  return markdown
    .replace(/\n?## Steps\n[\s\S]*?(?=\n##\s|$)/, "\n")
    .replace(/\n?## Quality Check\n[\s\S]*?(?=\n##\s|$)/, "\n")
    .replace(/\n?## Common Issues\n[\s\S]*?(?=\n##\s|$)/, "\n")
    .trim();
}

function formatInlineMarkdown(value: string) {
  const parts = value.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className={cn("rounded bg-muted px-1 py-0.5 text-[0.9em] text-foreground")}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
