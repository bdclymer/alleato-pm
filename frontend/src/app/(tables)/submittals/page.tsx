import { fetchSubmittals } from "./submittals-data";
import { SubmittalsClient } from "./submittals-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SubmittalsPage() {
  const submittals = await fetchSubmittals();

  return <SubmittalsClient submittals={submittals} />;
}
