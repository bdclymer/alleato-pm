"use client";
import { Menu } from "@/components/admin-panel/menu";
import { SidebarToggle } from "@/components/admin-panel/sidebar-toggle";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

interface SidebarProps {
  projectId?: string;
}

export function Sidebar({ projectId }: SidebarProps) {
  const sidebar = useStore(useSidebar, (x) => x);

  // Default values for SSR/hydration
  const isOpen = sidebar?.isOpen ?? false;
  const toggleOpen = sidebar?.toggleOpen ?? (() => {});
  const getOpenState = sidebar?.getOpenState ?? (() => false);
  const setIsHover = sidebar?.setIsHover ?? (() => {});
  const isDisabled = sidebar?.settings?.disabled ?? false;
  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-20 h-screen -translate-x-full lg:translate-x-0 transition-[width] ease-in-out duration-300 bg-background border-r",
        !getOpenState() ? "w-[72px]" : "w-64",
        isDisabled && "hidden"
      )}
    >
      <SidebarToggle isOpen={isOpen} setIsOpen={toggleOpen} />
      <div
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        className="relative h-full flex flex-col px-2 pt-4 pb-2 overflow-y-auto"
      >
        <Link href="/" className={cn("flex items-center mb-2", getOpenState() ? "justify-start px-4" : "justify-center") }>
          {getOpenState() ? (
            <Image
              src="/Alleato-Group-Logo_Dark.png"
              alt="Alleato Group"
              width={140}
              height={40}
              priority
              className="object-contain shrink-0 dark:hidden w-[140px] h-10"
            />
          ) : (
            <Image
              src="/Alleato Favicon.png"
              alt="Alleato"
              width={24}
              height={24}
              priority
              className="object-contain shrink-0 w-6 h-6"
            />
          )}
          {getOpenState() && (
            <Image
              src="/Alleato-Group-Logo_Light.png"
              alt="Alleato Group"
              width={140}
              height={40}
              priority
              className="object-contain shrink-0 hidden dark:block w-[140px] h-10"
            />
          )}
        </Link>
        <Menu isOpen={getOpenState()} projectId={projectId} />
      </div>
    </aside>
  );
}
