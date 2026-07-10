# Procore Spec - Drawings Edit Flow

Source baseline:

- `Edit Drawings` support article
- `Upload Drawings`
- `Manage Drawing Log`
- `Configure Advanced Settings: Drawings`

## Relevant behavior

- A single drawing can be edited after upload.
- The editable fields include drawing number, title, discipline, obsolete flag, revision number, drawing set, drawing date, and received date.
- Procore says drawing number must be unique within the project.
- Discipline can be chosen from default and custom project disciplines.
- Procore does not let the user change drawing status from the single-drawing edit page; publish state is controlled elsewhere.

## Comparison to this implementation

| Behavior | Procore | Alleato | Verdict |
| --- | --- | --- | --- |
| Edit number after upload | Supported | Supported | Match |
| Edit title after upload | Supported | Supported | Match |
| Edit discipline after upload | Supported | Supported | Match |
| Choose from default/custom disciplines | Supported | Supported via merged standard + project values | Match |
| Edit type | Not explicitly called out in the Procore article baseline used here | Supported | Custom addition / not a bug |
| Change drawing status from edit dialog | Not supported on edit page | Not exposed in edit dialog | Match |

## Notes

- For this audit, the only user claim being verified is that uploaded drawings remain editable for name and discipline.
- The implementation’s edit dialog also exposes drawing type; that is extra surface beyond the reported issue and should be treated as an additive field, not a defect.
