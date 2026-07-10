import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PipelineHealthPage() {
  redirect("/admin/source-sync");
}
