# Issue #541 Success Criteria

## Scope

Verify that drawings uploaded on `/876/drawings` can still be edited afterward, specifically:

- Drawing number can be edited.
- Drawing title can be edited.
- Discipline can be edited to a valid project discipline.
- Type can be edited.
- Saved values persist in the DB and re-open correctly in the edit dialog.

## Field Inventory

| Field | Type | Editable in UI? | Source of truth | Expected DB value |
| --- | --- | --- | --- | --- |
| Drawing Number | User input | Yes | `drawings.drawing_number` | Updated to the value entered in the edit dialog |
| Title | User input | Yes | `drawings.title` | Updated to the value entered in the edit dialog |
| Discipline | User input | Yes | `drawings.discipline` | Updated to the selected discipline string |
| Type | User input | Yes | `drawings.drawing_type` | Updated to the selected type string |

## Flow 1: Edit an uploaded drawing

- **Action:** Open `/876/drawings`, pick an existing drawing from the row/card actions, choose Edit, change the drawing number, title, and discipline, then save.
- **Expected outcome:** The dialog closes, the drawings list updates, and the edited drawing shows the new number/title/discipline in the list or card surface without a refresh.
- **DB check:** Query the edited drawing row by `id` and verify `drawing_number`, `title`, `discipline`, `drawing_type`, and `updated_at` all reflect the submitted values.
- **Quality bar:** Pass only if the visible drawing identity changes immediately and the DB row matches the submitted values exactly, with no silent field loss.

```sql
SELECT id, project_id, drawing_number, title, discipline, drawing_type, updated_at
FROM drawings
WHERE id = $1;
```

## Flow 2: Re-open the edit dialog after save

- **Action:** Re-open the same drawing’s Edit dialog after the save completes.
- **Expected outcome:** The dialog pre-fills the saved drawing number, title, discipline, and type values.
- **DB check:** Same row as Flow 1; compare the pre-filled dialog values to the row values.
- **Quality bar:** Pass only if the edit form opens with the saved values selected/displayed instead of blank placeholders or stale values.

## Flow 3: Validation on required fields

- **Action:** Clear a required field in the edit dialog and attempt to save.
- **Expected outcome:** The form blocks submission and shows an inline or toast validation error; the drawing is not updated.
- **DB check:** The row remains unchanged.
- **Quality bar:** Pass only if no invalid write occurs and the user gets an explicit failure message.

## Notes

- Discipline options should come from the project’s drawing discipline list plus any discipline values already present in the current drawings data.
- Procore baseline: Procore’s Edit Drawings flow allows editing Number, Title, and Discipline from a single drawing detail/edit surface, and Discipline is chosen from the project’s default/custom disciplines.
