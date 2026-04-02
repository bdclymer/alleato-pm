"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text } from "@/components/ui/text";
import { PageShell } from "@/components/layout";
import { usePCO, useSubmitPCO } from "@/hooks/use-pcos";
import { useProjectTitle } from "@/hooks/useProjectTitle";
import { PCORecordHeader } from "@/components/domain/pcos/PCORecordHeader";
import { StageProgressBar } from "@/components/domain/pcos/StageProgressBar";
import { PCOTimeline } from "@/components/domain/pcos/PCOTimeline";
import { PCOSidebar } from "@/components/domain/pcos/PCOSidebar";

export default function PCODetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const pcoId = params.pcoId as string;

  const { data: pco, isLoading, error } = usePCO(projectId, pcoId);
  const submitMutation = useSubmitPCO(projectId, pcoId);

  useProjectTitle(
    pco ? `PCO #${pco.number} - ${pco.title}` : "Loading..."
  );

  const handleBack = () => {
    router.push(`/${projectId}/pcos`);
  };

  const handleEdit = () => {
    toast.info("Edit mode coming soon");
  };

  const handleSubmit = () => {
    submitMutation.mutate();
  };

  const handleConvert = () => {
    toast.info("Convert to Change Order coming soon");
  };

  /* Loading */
  if (isLoading) {
    return (
      <PageShell variant="dashboard" title="Loading...">
        <div className="space-y-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-6 w-full" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-60 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  /* Error */
  if (error || !pco) {
    return (
      <PageShell variant="dashboard" title="Error" onBack={handleBack}>
        <Text tone="destructive">
          {error instanceof Error ? error.message : "PCO not found"}
        </Text>
      </PageShell>
    );
  }

  /* Version tabs */
  const versions = pco.versions ?? [];
  const hasVersions = versions.length > 1;

  return (
    <PageShell
      variant="dashboard"
      title={`PCO #${pco.number}: ${pco.title}`}
      onBack={handleBack}
    >
      {/* Record header — status badges + action buttons */}
      <PCORecordHeader
        pco={pco}
        onEdit={handleEdit}
        onSubmit={handleSubmit}
        onConvert={handleConvert}
      />

      {/* Stage progress */}
      <StageProgressBar pco={pco} />

      {/* Version tabs */}
      {hasVersions && (
        <Tabs defaultValue={`v${pco.current_version}`}>
          <TabsList variant="line">
            {versions
              .sort((a, b) => a.version - b.version)
              .map((ver) => {
                const date = new Date(ver.submitted_at).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric" }
                );
                const isCurrent = ver.version === pco.current_version;
                const label = isCurrent
                  ? `v${ver.version} — ${date} (Current)`
                  : `v${ver.version} — ${date} (${ver.client_decision === "revision_requested" ? "Revised" : "Submitted"})`;
                return (
                  <TabsTrigger key={ver.id} value={`v${ver.version}`}>
                    {label}
                  </TabsTrigger>
                );
              })}
          </TabsList>
          {versions.map((ver) => (
            <TabsContent key={ver.id} value={`v${ver.version}`}>
              {ver.version === pco.current_version ? (
                <MainContent pco={pco} projectId={projectId} />
              ) : (
                <div className="rounded-lg bg-muted/50 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Snapshot of version {ver.version} submitted on{" "}
                    {new Date(ver.submitted_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  {ver.client_decision_note && (
                    <p className="mt-2 text-sm text-muted-foreground italic">
                      Client note: &ldquo;{ver.client_decision_note}&rdquo;
                    </p>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* If no version tabs, show main content directly */}
      {!hasVersions && <MainContent pco={pco} projectId={projectId} />}
    </PageShell>
  );
}

/* Two-column layout for main content */
function MainContent({
  pco,
  projectId,
}: {
  pco: NonNullable<ReturnType<typeof usePCO>["data"]>;
  projectId: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Main column */}
      <div className="lg:col-span-2">
        <PCOTimeline pco={pco} projectId={projectId} />
      </div>

      {/* Sidebar */}
      <div>
        <PCOSidebar pco={pco} />
      </div>
    </div>
  );
}
