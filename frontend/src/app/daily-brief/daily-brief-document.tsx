"use client";

import { useEffect, useRef } from "react";
import { BRIEF_STYLES } from "./brief-styles";

/**
 * Renders the bespoke "Daily Executive Brief" document.
 *
 * The body HTML is built server-side from the real executive-brief packet
 * (see build-brief.ts) and passed in as `bodyHtml`; every `.src` is already a
 * real link to its source. The only client-side behavior is the scroll-spy that
 * highlights the active section in the index rail.
 */
export function DailyBriefDocument({ bodyHtml }: { bodyHtml: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;

    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>(".rail a"));
    const linkByTarget = new Map<string, HTMLAnchorElement>();
    links.forEach((link) => {
      const target = link.getAttribute("data-target");
      if (target) linkByTarget.set(target, link);
    });
    const sections = links
      .map((link) => {
        const target = link.getAttribute("data-target");
        return target ? root.querySelector<HTMLElement>(`#${target}`) : null;
      })
      .filter((section): section is HTMLElement => Boolean(section));
    if (sections.length === 0) return;

    let current: HTMLAnchorElement | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (current) current.classList.remove("active");
            const link = linkByTarget.get(entry.target.id);
            if (link) {
              link.classList.add("active");
              current = link;
            }
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [bodyHtml]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: BRIEF_STYLES }} />
      <div
        ref={rootRef}
        className="daily-brief"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    </>
  );
}
