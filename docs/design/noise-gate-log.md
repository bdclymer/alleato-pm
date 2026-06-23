# Noise Gate Log

A running catalog of every UI element Megan has flagged as **visual noise**, why it was noise, and the durable rule extracted from it. This is a learning system: each entry must become a rule that prevents the same class of noise from shipping again.

**Protocol (for any agent doing frontend work):**
1. **Read this log before adding any UI.** Treat every rule below as binding — the burden of proof is on addition.
2. **When Megan calls something "noise" / "visual noise" / "clutter" / "remove this," append a new row here in the same turn**, then apply the fix. Use the next sequential ID. Convert the specific complaint into a general rule.
3. Cross-link to the matching memory file so future sessions load the rule automatically.

This complements the Alleato product noise gate in `CLAUDE.md` and `.agents/skills/impeccable/reference/alleato-product-noise-gate.md`. The gate is the philosophy; this log is the case law.

---

## Log

| # | Date | What was flagged | Why it's noise | Durable rule |
|---|------|------------------|----------------|--------------|
| 1 | 2026-06-23 | "Add contact" rendered as a bordered text button on each company | Heavy chrome for a secondary action; competes with content | A secondary per-item add action is a **bare plus icon** (`<Plus className="h-4 w-4">`, ghost, no border, no label, `aria-label` only) — never a bordered/labeled button. |
| 2 | 2026-06-23 | Stacked secondary line under the company name ("Subcontractor · 3 contacts") | Two stacked text lines where one belongs; reads as clutter | **No stacked content.** Never stack a secondary text line under a primary label. Each attribute gets its own column or inline position on one line. |
| 3 | 2026-06-23 | Decorative icons: building glyph by company name, avatar circles on contact rows, leading row icons | Icons that encode nothing; pure decoration | **No decorative icons.** No leading/avatar/building icons next to labels. An icon must be the *only* affordance (e.g. the plus add button) to earn its place. |
| 4 | 2026-06-23 | Empty fields rendered a placeholder dash ("ALL MEP —", "—" in cells) | The dash is meaningless ink for absent data | **No placeholder dashes for empty values.** Render nothing (keep the grid cell empty to preserve column alignment). Applies to type labels, titles, emails, phones, any optional field. |
| 5 | 2026-06-23 | Section/company cards had a tonal background (`bg-muted/30`) | Background fills add weight that separation already provides | **Sections have no background color and no border.** Separate with spacing (and at most a thin divider). No `bg-card`/`bg-muted` panel wrappers around sections. |

---

## Standing rules, distilled

- Secondary add action → bare plus icon, never a labeled/bordered button.
- Never stack a subtitle under a label. One attribute, one place.
- No decorative icons. Icon only when it is the sole affordance.
- Empty field → render nothing, never a dash.
- Sections: spacing + optional thin divider only. No background fills, no borders, no card wrappers.
