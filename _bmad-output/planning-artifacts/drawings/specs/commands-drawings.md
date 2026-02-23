---
title: COMMANDS
description: COMMANDS documentation
---

# DRAWINGS — Domain Commands

This file lists all UI actions derived from Procore crawl data for the **drawings** module.

## Discovered Actions

Raw UI actions extracted from the Procore crawl. Review and promote to commands above.

| Action | Type | Source | Command Key |
|--------|------|--------|-------------|
| A142: 1ST FLOOR RESTROOM DETAILS | div | clickable | `a142_1st_floor_restroom_details` |
| Activity | div | clickable | `activity` |
| Add Drawing Area | button | clickable | `add_drawing_area` |
| All Sets and Revisions | div | dropdown | `all_sets_and_revisions` |
| Clear All Filters | button | clickable | `clear_all_filters` |
| Close | div | clickable | `close` |
| Create Locations | button | clickable | `create_locations` |
| CSV | div | dropdown | `csv` |
| Delete | div | dropdown | `delete` |
| Download | div | clickable | `download` |
| Edit | div | dropdown | `edit` |
| Export | button | clickable | `export` |
| Filter | div | clickable | `filter` |
| Filters | button | clickable | `filters` |
| Hide All | button | clickable | `hide_all` |
| Info | div | clickable | `info` |
| Markup | div | clickable | `markup` |
| Measurements | div | dropdown | `measurements` |
| PDF | div | dropdown | `pdf` |
| Reports | button | clickable | `reports` |
| Rev. 0  (01/10/25) - Permit Set 1-14-25 | div | clickable | `rev_0_011025_permit_set_11425` |
| Search | div | clickable | `search` |
| See All | button | clickable | `see_all` |
| Sketches | div | dropdown | `sketches` |
| Upload | button | clickable | `upload` |

## Navigation Tabs

| Tab | Source |
|-----|--------|
| QR Code | tab |

## Table Columns (from UI)

Column headers discovered in the Procore data table:

| Column Label | SQL Name | Inferred Type |
|-------------|----------|---------------|
| Discipline | discipline | text |
| Drawing Date | drawing_date | date |
| Drawing No. | drawing_no | text |
| Drawing Title | drawing_title | text |
| Received Date | received_date | date |
| Revision | revision | text |
| Set | set | text |
| Status | status | text |
