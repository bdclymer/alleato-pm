"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconLogout, IconUserCircle } from "@tabler/icons-react";
import type { User } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getBestAvatarUrl } from "@/lib/gravatar";
import { logout } from "@/lib/supabase/logout";

interface HeaderUserMenuProps {
  user: User | null;
}

export function HeaderUserMenu({ user }: HeaderUserMenuProps) {
  const router = useRouter();

  // Generate avatar data from user
  const userEmail = user?.email || "";
  const avatarSrc = getBestAvatarUrl(user?.user_metadata?.avatar_url, userEmail);
  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";
  const fallbackInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : displayName.slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/auth/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to log out");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center rounded-full border-2 border-zinc-600 p-0.5 transition-all hover:border-zinc-400 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
          aria-label="Open user menu"
        >
          <Avatar className="h-7 w-7 sm:h-8 sm:w-8 rounded-full">
            <AvatarImage
              src={avatarSrc}
              alt="User avatar"
              className="rounded-full"
            />
            <AvatarFallback className="rounded-full bg-primary/10 font-medium text-xs sm:text-sm">
              {fallbackInitials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-48">
        <DropdownMenuLabel className="text-sm font-semibold">
          {displayName}
        </DropdownMenuLabel>
        {user?.email && (
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {user.email}
          </DropdownMenuLabel>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            <IconUserCircle className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={handleLogout}
        >
          <IconLogout className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
