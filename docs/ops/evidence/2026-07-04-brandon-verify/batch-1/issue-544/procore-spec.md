# Procore Spec Snapshot: RFIs Attachments

## Relevant baseline
- RFIs include a detail record with an `Attachments` section.
- Additional files are represented as linked documents, not as a free-text note.
- The attachment area is an upload surface, not only a list of existing files.

## Field and behavior baseline
- **RFI detail fields visible in this repo:** subject, question, due date, manager, assignees, received from, responsible contractor, distribution list, location, specification, cost code, stage, schedule impact, cost impact, reference, drawing number, private, attachments.
- **Attachment behavior:** a user should be able to add files from the RFI detail surface and then see them listed on the same record.
- **Persistence expectation:** the attachment becomes a linked record plus file metadata.

## Comparison notes
- **Match:** This repo exposes an RFI `Attachments` section on the detail page and uses a shared attachment upload primitive.
- **Match:** The upload surface supports drag and drop.
- **Custom / repo-specific:** The implementation uses the shared Pattern C document-link model and a unified document metadata layer.

