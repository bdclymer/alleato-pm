"use client";

import { Button } from "@/components/ui/button";
import { logout } from "@/lib/supabase/logout";
import { useState } from "react";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
      // Force a hard navigation to clear all state
      window.location.href = "/auth/login";
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoading(false);
      // Still redirect even if there's an error
      window.location.href = "/auth/login";
    }
  };

  return (
    <Button onClick={handleLogout} disabled={isLoading}>
      {isLoading ? "Logging out..." : "Logout"}
    </Button>
  );
}
