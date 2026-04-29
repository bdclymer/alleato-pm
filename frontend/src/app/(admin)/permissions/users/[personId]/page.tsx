import { redirect } from "next/navigation";

export default async function LegacyPermissionUserRedirectPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  redirect(`/user-management/users/${personId}`);
}
