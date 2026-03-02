---
title: MUTATIONS
description: MUTATIONS documentation
---

# Scheduling – Mutation Specs

## edit_task

### Purpose

Update one or more editable properties of an existing scheduling task while maintaining scheduling integrity.

---

### Inputs

- task_id (uuid, required)
- patch (object, required)

Patch may include:

- name (string)
- start_date (date)
- finish_date (date)
- duration_days (integer)
- percent_complete (0–100)
- status (not_started | in_progress | complete)
- constraint_type (none | start_no_earlier_than | finish_no_later_than)
- constraint_date (date)

Optional context:

- source (grid | modal | gantt | bulk)
- pin_successors (boolean, default false)

---

### Validation Rules

- Task must exist
- start_date ≤ finish_date
- duration_days ≥ 0
- Milestones must have duration = 0
- percent_complete must be 0–100
- If percent_complete = 100 → status = complete
- If constraint_type ≠ none → constraint_date required
- No circular dependencies allowed

---

### State Changes

Update task record:

- name
- start_date
- finish_date
- duration_days
- percent_complete
- status
- constraints

---

### Dependency Handling

If dates or duration change:

- Recalculate successor dates
- Apply lag/lead rules
- Respect dependency types:
  - Finish-to-Start
  - Start-to-Start
  - Finish-to-Finish
  - Start-to-Finish

If pin_successors = true:

- Do NOT move successors
- Apply constraint to edited task instead

---

### Hierarchy Rules

If task has children:

- Parent start_date = earliest child start_date
- Parent finish_date = latest child finish_date
- Parent percent_complete = weighted average

---

### Deadlines

If task has a deadline:

- Recalculate deadline variance
- Mark task late if finish_date > deadline

---

### Output

Return:

- task_id
- updated_fields
- derived_changes
- dependency_effects
- warnings (if any)

---

### Failure Conditions

Hard fail:

- Task not found
- Invalid date logic
- Constraint violation

Soft warnings:

- Successors shifted
- Deadline slipped
