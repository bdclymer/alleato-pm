<!-- allow-outside-documentation -->

# Help Center

`/docs` is controlled by folder placement.

If a markdown file is inside one of these folders, it is displayed:

- `docs/help/project-tools/<category>/<file>.md`
- `docs/help/ai-features/<category>/<file>.md`

If a file is not inside one of those two roots, it does not appear in `/docs`.

## Rules

1. The first folder decides the tab:
   - `project-tools` -> Project tools
   - `ai-features` -> AI features
2. The second folder decides the sidebar/category label.
3. The file name decides the URL slug:
   - `docs/help/project-tools/reference/changelog.md` -> `/docs/changelog`
4. File names must be unique across both roots.

## Minimum Frontmatter

Only this metadata matters for display:

```md
---
title: What's New
description: Read recent release notes covering new features, improvements, and fixes.
order: 1200
featured: false
related_routes:
  - /updates
related_actions: []
---
```

## Notes

- Category labels come from the folder name.
- `order` defaults to `1000` if omitted.
- `featured` defaults to `false` if omitted.
- `related_routes` and `related_actions` default to empty arrays if omitted.
- Extra legacy frontmatter can stay in old files, but it no longer controls whether a doc is shown.
