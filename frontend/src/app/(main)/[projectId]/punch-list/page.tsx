import { PunchListClient } from "./punch-list-client";

export default async function PunchListPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const numericProjectId = parseInt(projectId, 10);

  return <PunchListClient projectId={numericProjectId} />;
}
