"use client";

import { useEffect, useRef } from "react";
import { BRIEF_BODY, BRIEF_STYLES } from "./brief-markup";

/**
 * Renders the bespoke "Daily Executive Brief" document.
 *
 * The layout is deliberately outside the app design system (see brief-markup.ts),
 * so it is rendered as HTML and the two pieces of interactivity from the source
 * prototype are re-implemented here:
 *   1. Scroll-spy that highlights the active section in the index rail.
 *   2. A source-citation popover that shows what each `.src` claim traces back to.
 */
export function DailyBriefDocument() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const cleanups: Array<() => void> = [];

    // ── Scroll-spy ──────────────────────────────────────────────────────────
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

    if (typeof IntersectionObserver !== "undefined" && sections.length > 0) {
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
      cleanups.push(() => observer.disconnect());
    }

    // ── Source citation popover ─────────────────────────────────────────────
    const pop = document.createElement("div");
    pop.className = "daily-brief-src-pop";
    pop.setAttribute("role", "dialog");
    pop.hidden = true;
    document.body.appendChild(pop);
    let openBtn: HTMLElement | null = null;

    const close = () => {
      pop.hidden = true;
      openBtn = null;
    };

    const esc = (value: string | undefined) =>
      (value || "").replace(/[&<>"]/g, (character) => {
        const map: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
        };
        return map[character];
      });

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const btn = target?.closest<HTMLElement>(".src");
      if (btn && root.contains(btn)) {
        event.preventDefault();
        if (openBtn === btn) {
          close();
          return;
        }
        const data = btn.dataset;
        pop.innerHTML =
          '<div class="src-pop__type">' +
          esc(data.type || "Source") +
          "</div>" +
          '<div class="src-pop__title">' +
          esc(data.title || "") +
          "</div>" +
          '<div class="src-pop__meta">' +
          esc(data.date || "") +
          (data.loc ? " &middot; " + esc(data.loc) : "") +
          "</div>" +
          '<div class="src-pop__note">Opens the original in ' +
          esc(data.loc || "the source system") +
          " — link stubbed in this brief.</div>";
        pop.hidden = false;
        const rect = btn.getBoundingClientRect();
        const popWidth = pop.offsetWidth || 288;
        let left = rect.left + window.scrollX;
        const maxLeft =
          window.scrollX + document.documentElement.clientWidth - popWidth - 12;
        if (left > maxLeft) left = maxLeft;
        if (left < window.scrollX + 12) left = window.scrollX + 12;
        pop.style.top = `${rect.bottom + window.scrollY + 8}px`;
        pop.style.left = `${left}px`;
        openBtn = btn;
        return;
      }
      if (openBtn && !(target && target.closest(".daily-brief-src-pop"))) {
        close();
      }
    };

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onScroll = () => {
      if (openBtn) close();
    };

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeydown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", onScroll, { passive: true });

    cleanups.push(() => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeydown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", onScroll);
      pop.remove();
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: BRIEF_STYLES }} />
      <div
        ref={rootRef}
        className="daily-brief"
        dangerouslySetInnerHTML={{ __html: BRIEF_BODY }}
      />
    </>
  );
}
