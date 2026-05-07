import { PageShell } from "@/components/layout";
import { FeatureRequestList } from "@/components/feature-requests/FeatureRequestList";
import { listFeatureRequests } from "@/lib/feature-requests/server";

export const metadata = {
  title: "Feature Requests | Alleato",
  description: "AIS feature request packets and implementation handoffs",
};

export default async function FeatureRequestsPage() {
  const requests = await listFeatureRequests();

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <PageShell
        variant="table"
        title="Feature Requests"
        description="Durable AIS request packets, readiness state, and implementation handoffs."
      >
        <FeatureRequestList requests={requests} />
      </PageShell>
    </div>
  );
}
