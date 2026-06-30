"use client";

import ReactMarkdown from "react-markdown";
import { BookOpen, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { useTrainingDocs } from "@/hooks/use-training-docs";

export function TrainingDocPreviewClient({ docId }: { docId: string }) {
  const router = useRouter();
  const { data: docs = [], isLoading } = useTrainingDocs();
  const doc = docs.find((item) => item.id === docId);

  if (isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading training page...
      </div>
    );
  }

  if (!doc) {
    return (
      <EmptyState
        icon={<BookOpen className="h-5 w-5" />}
        title="Training page not found"
        description="Return to the table and open an existing training doc."
        action={
          <Button onClick={() => router.push("/training-docs")}>
            Back to Training Docs
          </Button>
        }
      />
    );
  }

  const bodyMarkdown = doc.steps.length
    ? stripLegacyStepsSection(doc.body_markdown)
    : doc.body_markdown;

  return (
    <article className="max-w-4xl space-y-8">
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-normal text-foreground">
            {doc.title}
          </h1>
          {doc.summary ? (
            <p className="text-base leading-7 text-muted-foreground">
              {doc.summary}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
        <section className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-p:leading-7 prose-li:my-1">
          <ReactMarkdown>{bodyMarkdown}</ReactMarkdown>
        </section>
      ) : null}

      {doc.steps.length ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Steps</h2>
          <div className="divide-y">
            {doc.steps
              .slice()
              .sort((left, right) => left.step_order - right.step_order)
              .map((step, index) => (
                <section key={step.id} className="space-y-4 py-6 first:pt-0">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      Step {index + 1}: {step.title}
                    </h3>
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-7 prose-li:my-1">
                      <ReactMarkdown>{step.instruction_markdown}</ReactMarkdown>
                    </div>
                    {step.expected_result ? (
                      <p className="text-sm leading-6 text-muted-foreground">
                        Expected result: {step.expected_result}
                      </p>
                    ) : null}
                  </div>

                  {step.screenshot_asset?.signed_url ? (
                    <figure className="space-y-2">
                      <img
                        src={step.screenshot_asset.signed_url}
                        alt={
                          step.screenshot_asset.alt_text ??
                          step.screenshot_asset.file_name
                        }
                        className="w-full rounded-md border object-contain"
                      />
                      {step.screenshot_asset.caption ? (
                        <figcaption className="text-sm text-muted-foreground">
                          {step.screenshot_asset.caption}
                        </figcaption>
                      ) : null}
                    </figure>
                  ) : null}
                </section>
              ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

function stripLegacyStepsSection(markdown: string): string {
  return markdown.replace(/\n?## Steps\n[\s\S]*?(?=\n##\s|$)/, "\n").trim();
}
