"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Meetings", icon: MeetingsIcon },
  { href: "/action-items", label: "Action Items", icon: TasksIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-20 hidden h-screen w-[248px] flex-col border-r border-line bg-ink-900/70 backdrop-blur-xl lg:flex">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-7">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gold text-gold-ink">
          <span className="absolute inset-0 animate-pulse rounded-lg bg-gold/40 blur-md" aria-hidden />
          <span className="relative font-display text-lg font-600">A</span>
        </span>
        <div className="leading-tight">
          <div className="font-display text-[15px] tracking-tight text-text">Alleato</div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-gold">Meetings</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="mt-2 flex flex-col gap-1 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" || pathname.startsWith("/meetings") : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-gold-soft text-text"
                  : "text-muted hover:bg-ink-800 hover:text-text"
              }`}
            >
              <Icon className={active ? "text-gold" : "text-faint group-hover:text-muted"} />
              <span className="font-500">{label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" />}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-6 py-6">
        <div className="flex items-center gap-2 text-[11px] text-faint">
          <span className="h-1.5 w-1.5 rounded-full bg-good" />
          Teams-native capture
        </div>
      </div>
    </aside>
  );
}

function MeetingsIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="5" width="13" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 9l5-3v12l-5-3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function TasksIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 7l2 2 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17l2 2 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 7h7M13 17h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
