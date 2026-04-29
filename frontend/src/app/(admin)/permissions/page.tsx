import { redirect } from "next/navigation";

export default function LegacyPermissionsRedirectPage() {
  redirect("/user-management");
}
