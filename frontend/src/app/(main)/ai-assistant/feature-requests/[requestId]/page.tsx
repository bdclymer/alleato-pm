import { notFound } from "next/navigation";
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
        variant="detail"
        title={detail.request.title}
        description="Stakeholder request packet, readiness gate, implementation plan, and Claude Code handoff."
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
