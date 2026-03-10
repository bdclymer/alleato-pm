"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditChangeEventRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const changeEventId = params.changeEventId as string;

  useEffect(() => {
    if (!projectId || !changeEventId) return;
    router.replace(`/${projectId}/change-events/${changeEventId}?edit=1`);
  }, [router, projectId, changeEventId]);

  return null;
}
