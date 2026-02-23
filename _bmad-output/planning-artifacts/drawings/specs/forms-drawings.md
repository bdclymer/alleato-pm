---
title: FORMS
description: FORMS documentation
---

# DRAWINGS — UI Forms

This document defines UI forms required to implement the drawings module.
Forms are derived from create/edit actions discovered in the Procore crawl.

## Create Forms

### Add Drawing Area

**Command:** `add_drawing_area`
**Trigger:** button (clickable)

| Field | Label | Type | Required | Source Table | Notes |
|------|-------|------|----------|--------------|-------|
| discipline | Discipline | text | | app_drawings | |
| drawing_date | Drawing Date | date | | app_drawings | |
| drawing_no | Drawing No. | text | | app_drawings | |
| drawing_title | Drawing Title | text | | app_drawings | |
| received_date | Received Date | date | | app_drawings | |
| revision | Revision | text | | app_drawings | |
| set | Set | text | | app_drawings | |
| status | Status | text | | app_drawings | |

### Create Locations

**Command:** `create_locations`
**Trigger:** button (clickable)

| Field | Label | Type | Required | Source Table | Notes |
|------|-------|------|----------|--------------|-------|
| discipline | Discipline | text | | app_drawings | |
| drawing_date | Drawing Date | date | | app_drawings | |
| drawing_no | Drawing No. | text | | app_drawings | |
| drawing_title | Drawing Title | text | | app_drawings | |
| received_date | Received Date | date | | app_drawings | |
| revision | Revision | text | | app_drawings | |
| set | Set | text | | app_drawings | |
| status | Status | text | | app_drawings | |

### Upload

**Command:** `upload`
**Trigger:** button (clickable)

| Field | Label | Type | Required | Source Table | Notes |
|------|-------|------|----------|--------------|-------|
| discipline | Discipline | text | | app_drawings | |
| drawing_date | Drawing Date | date | | app_drawings | |
| drawing_no | Drawing No. | text | | app_drawings | |
| drawing_title | Drawing Title | text | | app_drawings | |
| received_date | Received Date | date | | app_drawings | |
| revision | Revision | text | | app_drawings | |
| set | Set | text | | app_drawings | |
| status | Status | text | | app_drawings | |

## Edit Forms

### Edit

**Command:** `edit`
**Trigger:** div (dropdown)

| Field | Label | Type | Required | Source Table | Notes |
|------|-------|------|----------|--------------|-------|
| discipline | Discipline | text | | app_drawings | |
| drawing_date | Drawing Date | date | | app_drawings | |
| drawing_no | Drawing No. | text | | app_drawings | |
| drawing_title | Drawing Title | text | | app_drawings | |
| received_date | Received Date | date | | app_drawings | |
| revision | Revision | text | | app_drawings | |
| set | Set | text | | app_drawings | |
| status | Status | text | | app_drawings | |

## Other Action Forms

### A142: 1ST FLOOR RESTROOM DETAILS

**Command:** `a142_1st_floor_restroom_details`
**Trigger:** div (clickable)

| Field | Label | Type | Required | Source Table | Notes |
|------|-------|------|----------|--------------|-------|
| | | | | | |

### Activity

**Command:** `activity`
**Trigger:** div (clickable)

| Field | Label | Type | Required | Source Table | Notes |
|------|-------|------|----------|--------------|-------|
| | | | | | |

### All Sets and Revisions

**Command:** `all_sets_and_revisions`
**Trigger:** div (dropdown)

| Field | Label | Type | Required | Source Table | Notes |
|------|-------|------|----------|--------------|-------|
| | | | | | |

### CSV

**Command:** `csv`
**Trigger:** div (dropdown)

| Field | Label | Type | Required | Source Table | Notes |
|------|-------|------|----------|--------------|-------|
| | | | | | |

### Download

**Command:** `download`
**Trigger:** div (clickable)

| Field | Label | Type | Required | Source Table | Notes |
|------|-------|------|----------|--------------|-------|
| | | | | | |

### Info

**Command:** `info`
**Trigger:** div (clickable)

| Field | Label | Type | Required | Source Table | Notes |
|------|-------|------|----------|--------------|-------|
| | | | | | |

### Markup

**Command:** `markup`
**Trigger:** div (clickable)

| Field | Label | Type | Required | Source Table | Notes |
|------|-------|------|----------|--------------|-------|
| | | | | | |

### Measurements

**Command:** `measurements`
**Trigger:** div (dropdown)

| Field | Label | Type | Required | Source Table | Notes |
|------|-------|------|----------|--------------|-------|
| | | | | | |

### PDF

**Command:** `pdf`
**Trigger:** div (dropdown)

| Field | Label | Type | Required | Source Table | Notes |
|------|-------|------|----------|--------------|-------|
| | | | | | |

### Reports

**Command:** `reports`
**Trigger:** button (clickable)

| Field | Label | Type | Required | Source Table | Notes |
|------|-------|------|----------|--------------|-------|
| | | | | | |

### Rev. 0  (01/10/25) - Permit Set 1-14-25

**Command:** `rev_0_011025_permit_set_11425`
**Trigger:** div (clickable)

| Field | Label | Type | Required | Source Table | Notes |
|------|-------|------|----------|--------------|-------|
| | | | | | |

### Sketches

**Command:** `sketches`
**Trigger:** div (dropdown)

| Field | Label | Type | Required | Source Table | Notes |
|------|-------|------|----------|--------------|-------|
| | | | | | |
