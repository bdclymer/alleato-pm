"use client";

import { useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api-client";
import { BRIEF_STYLES } from "./brief-styles";

const SIGNAL_LABEL: Record<string, string> = {
  positive: "Accurate",
  negative: "Flagged",
  completed: "Done",
};

/**
 * Renders the bespoke "Daily Executive Brief" document.
 *
 * The body HTML is built server-side from the real executive-brief packet
 * (see build-brief.ts) and passed in as `bodyHtml`; every `.src` is already a
 * real link to its source. Client behavior is kept to three small, delegated
 * concerns so the body can stay a pure string:
 *   1. scroll-spy highlighting the active section in the index rail,
 *   2. the quiet per-item feedback menu (Accurate / Inaccurate / Done), and
 *   3. the action-list "check to resolve" boxes.
 * Both (2) and (3) POST to the shared AI learning loop.
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

    let current: HTMLAnchorElement | null = null;
    const observer =
      sections.length > 0
        ? new IntersectionObserver(
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
          )
        : null;
    sections.forEach((section) => observer?.observe(section));

    // ── feedback: submit one signal for a brief item ────────────────────────
    const submitFeedback = async (payload: {
      subjectId: string;
      signal: "positive" | "negative" | "completed";
      title: string | null;
      project: string | null;
    }) => {
      try {
        await apiFetch("/api/executive/daily-brief/feedback", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        return true;
      } catch (error) {
        console.error("[daily-brief] feedback failed", error);
        return false;
      }
    };

    const closeAllMenus = () => {
      root
        .querySelectorAll<HTMLElement>(".fb.is-open")
        .forEach((el) => el.classList.remove("is-open"));
    };

    const flagItem = (
      container: HTMLElement | null,
      signal: "positive" | "negative" | "completed",
    ) => {
      if (!container) return;
      container.classList.remove("fb--positive", "fb--negative", "fb--completed");
      container.classList.add("is-flagged", `fb--${signal}`);
      container.setAttribute("data-fb-label", SIGNAL_LABEL[signal] ?? "Noted");
    };

    // ── delegated click handling for the feedback menu ──────────────────────
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      const trigger = target.closest<HTMLElement>(".fb-trigger");
      if (trigger) {
        event.preventDefault();
        const wrap = trigger.closest<HTMLElement>(".fb");
        const isOpen = wrap?.classList.contains("is-open");
        closeAllMenus();
        if (wrap && !isOpen) {
          wrap.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
        }
        return;
      }

      const choice = target.closest<HTMLElement>(".fb-btn");
      if (choice) {
        event.preventDefault();
        const wrap = choice.closest<HTMLElement>(".fb");
        const signal = choice.getAttribute("data-signal") as
          | "positive"
          | "negative"
          | "completed"
          | null;
        if (!wrap || !signal) return;
        const subjectId = wrap.getAttribute("data-fb-id") ?? "";
        const triggerBtn = wrap.querySelector<HTMLElement>(".fb-trigger");
        triggerBtn?.classList.add("is-busy");
        closeAllMenus();
        void submitFeedback({
          subjectId,
          signal,
          title: wrap.getAttribute("data-fb-title"),
          project: wrap.getAttribute("data-fb-project"),
        }).then((ok) => {
          triggerBtn?.classList.remove("is-busy");
          if (ok) flagItem(wrap.closest<HTMLElement>("[data-fb-item]"), signal);
        });
        return;
      }

      // Any other click dismisses an open menu.
      if (!target.closest(".fb-menu")) closeAllMenus();
    };

    // ── action-list checkboxes = "completed" signal ─────────────────────────
    const onChange = (event: Event) => {
      const box = (event.target as HTMLElement).closest<HTMLInputElement>(
        ".action-check[data-fb-id]",
      );
      if (!box) return;
      const item = box.closest<HTMLElement>(".action-item");
      if (box.checked) {
        item?.classList.add("is-done");
        void submitFeedback({
          subjectId: box.getAttribute("data-fb-id") ?? "",
          signal: "completed",
          title: box.getAttribute("data-fb-title"),
          project: null,
        });
      } else {
        item?.classList.remove("is-done");
      }
    };

    root.addEventListener("click", onClick);
    root.addEventListener("change", onChange);

    return () => {
      observer?.disconnect();
      root.removeEventListener("click", onClick);
      root.removeEventListener("change", onChange);
    };
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
