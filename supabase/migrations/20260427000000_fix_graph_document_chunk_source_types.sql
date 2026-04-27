-- Repair Microsoft Graph chunk source_type drift.
--
-- Graph documents were sometimes embedded through paths that left
-- document_chunks.source_type as generic "document" or meeting-derived values.
-- Source-specific RAG depends on source_type matching the Graph category.

create index if not exists idx_document_metadata_graph_category_id
  on public.document_metadata(source, category, id)
  where source = 'microsoft_graph';

create index if not exists idx_document_chunks_document_source_type
  on public.document_chunks(document_id, source_type);

update public.document_chunks dc
set source_type = case
  when dm.category = 'teams_message' then 'teams_message'
  when dm.category = 'email' then 'email'
  when dm.category = 'document' then 'onedrive_document'
  else 'microsoft_graph'
end
from public.document_metadata dm
where dc.document_id = dm.id
  and dm.source = 'microsoft_graph'
  and dc.source_type is distinct from case
    when dm.category = 'teams_message' then 'teams_message'
    when dm.category = 'email' then 'email'
    when dm.category = 'document' then 'onedrive_document'
    else 'microsoft_graph'
  end;

create index if not exists idx_document_chunks_graph_source_type
  on public.document_chunks(source_type, document_id)
  where source_type in ('teams_message', 'email', 'onedrive_document');
