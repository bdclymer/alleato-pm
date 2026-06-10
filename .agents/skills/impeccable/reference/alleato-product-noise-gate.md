# Alleato Product Noise Gate

Alleato is operational construction software. Design serves project execution, executive comprehension, financial accuracy, scheduling clarity, and source-backed decision-making.

For Alleato product surfaces, Impeccable must default to quiet, task-serving UI. Do not optimize for visual impressiveness. Optimize for comprehension, confidence, speed, and fewer mistakes.

## Non-Negotiable Principle

User attention is the most expensive resource in the product.

Every visible element spends attention. The burden of proof is on addition. A new element must improve at least one of these:

- Comprehension
- Decision quality
- Task completion speed
- Error prevention
- Source confidence
- Recovery from failure

If it does not, remove it.

## Required Attention Brief

Before implementing or approving any Alleato product UI, write this compact brief in working context:

```text
Primary user:
Primary job:
Primary decision:
Tier 1:
Tier 2:
Tier 3:
Hide until requested:
Remove:
Primary action:
Failure-loudly behavior:
```

Tiers mean:

- Tier 1: Mission critical. The user must notice this immediately.
- Tier 2: Important. Needed to decide or act in the current session.
- Tier 3: Useful. Helps confirm, compare, or inspect.
- Tier 4: Supporting. Useful after the main task is understood.
- Tier 5: Rarely needed. Metadata, history, secondary controls, and advanced settings.

Tier 3 through Tier 5 content must not compete visually with Tier 1 content.

## Pixel Economics

For every visible element, ask:

1. What user problem does this solve?
2. What decision does this support?
3. What action does this enable?
4. What information would be lost if removed?

If the answer is weak, remove or hide the element.

Decorative elements are guilty until proven useful.

## Default Alleato Page Shape

Normal project pages should use the established app shell and shared layout primitives:

```tsx
<>
  <ProjectPageHeader title="..." description="..." actions={...} />
  <PageContainer className="space-y-8">
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">Section title</h2>
      </div>
      {/* table, form, list, timeline, or workflow */}
    </section>
  </PageContainer>
</>
```

Page sections should usually be open on the canvas. Use typography, spacing, alignment, muted text, row dividers, and tables before cards, borders, shadows, backgrounds, badges, icons, or motion.

## Progressive Disclosure Default

Show only what users need now.

Reveal what users may need next.

Hide everything else.

Do not expose advanced filters, metadata, historical detail, helper panels, duplicate summaries, or secondary actions unless they directly improve the current task.

## Visual Silence Rules

Prefer hierarchy tools in this order:

1. Content order
2. Typography
3. Spacing
4. Alignment
5. Muted text
6. Dividers
7. Subtle tonal surfaces
8. Borders
9. Icons
10. Accent color
11. Shadows
12. Motion

Use the lowest sufficient tool. Do not jump to containers or decoration.

## Hard Bans For Alleato Product UI

- No nested cards.
- No decorative wrapper cards around whole page sections.
- No page-level bordered shells around normal content.
- No unsolicited helper panels, finder widgets, banners, insight strips, or secondary summaries.
- No decorative icons.
- No badges when plain text, order, or grouping is clearer.
- No gradient backgrounds for operational software screens.
- No heavy shadows, glows, glassmorphism, or bokeh/orb backgrounds.
- No mixed accent palettes.
- No emojis in production UI.
- No duplicate primary CTAs.
- No dashboards unless monitoring many simultaneous variables is the actual task.
- No motion unless it clarifies state, continuity, reveal, or feedback.
- No one-off visual overrides when a shared primitive owns the problem.

## Cards

Cards are allowed only when semantically necessary:

- KPI or metric tiles where comparison is the job.
- Distinct repeated records in mobile list views.
- Localized modules such as attachments, comments, or activity feed.
- Modal or popover surfaces.

If a section can be expressed as open content with headings, rows, dividers, or a table, do not use a card.

## Tables, Forms, And Line Items

- Lead with columns that support selection and action.
- Hide low-value metadata behind details or secondary views.
- Use row density, typography, alignment, and dividers before cards.
- Search and filters must serve a real retrieval task.
- Forms group fields by user decision, not database shape.
- Show required or common fields first. Put rare fields behind disclosure.
- Errors identify cause and recovery.
- Editable line-item UIs must follow `frontend/src/components/direct-costs/LineItemsManager.tsx` unless the shared pattern itself is being improved.

## Executive And Project Intelligence Surfaces

Run the 15-second executive test:

```text
If Brandon looked at this for 15 seconds, what one thing would he remember?
```

The answer must be specific. If the answer is "the dashboard" or a list of many things, simplify.

For source-backed intelligence, the design should prioritize:

- The claim or decision.
- Why it matters now.
- The linked source evidence.
- The recommended action.

Do not bury evidence under decorative summaries.

## Reduction Pass

After the first implementation:

1. Remove 30 percent of visual elements.
2. Re-evaluate task completion.
3. Remove another 10 percent if usability is unchanged or improved.

Elements include borders, icons, badges, helper text, panels, labels, shadows, fills, dividers, repeated CTAs, charts, and decorative copy.

## Final Gate

Before presenting product UI as complete, return:

```text
Noise gate: pass / needs revision
Top noise sources:
Removed or simplified:
Remaining risk:
Regression guardrail:
```

If the gate fails, fix the UI before reporting completion unless the user explicitly requested audit-only feedback.
