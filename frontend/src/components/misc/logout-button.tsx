"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/supabase/logout";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  return <Button onClick={handleLogout}>Logout</Button>;
}
