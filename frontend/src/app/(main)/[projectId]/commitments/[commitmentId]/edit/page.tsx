"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditCommitmentRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const commitmentId = params.commitmentId as string;

  useEffect(() => {
    if (!projectId || !commitmentId) return;
    router.replace(`/${projectId}/commitments/${commitmentId}?edit=1`);
  }, [router, projectId, commitmentId]);

  return null;
}
