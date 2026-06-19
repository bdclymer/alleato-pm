import { notFound } from "next/navigation";
import { FileTextIcon } from "lucide-react";
import { PageShell } from "@/components/layout";
import { FeatureRequestDetail } from "@/components/feature-requests/FeatureRequestDetail";
import { getFeatureRequestDetail } from "@/lib/feature-requests/server";

export const metadata = {
  title: "Feature Request Packet | Alleato",
};

export default async function FeatureRequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const detail = await getFeatureRequestDetail(requestId);
  if (!detail) notFound();

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <PageShell
        variant="detailWide"
        title={detail.request.title}
        titleContent={
          <div className="space-y-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <FileTextIcon className="h-4 w-4" aria-hidden="true" />
            </div>
            <h1 className="max-w-5xl text-2xl font-semibold leading-tight text-foreground md:text-[1.625rem]">
              {detail.request.title}
            </h1>
          </div>
        }
        breadcrumbs={[
          { label: "AI Assistant", href: "/ai-assistant" },
          { label: "Feature Requests", href: "/ai-assistant/feature-requests" },
        ]}
      >
        <FeatureRequestDetail detail={detail} />
      </PageShell>
    </div>
  );
}
