create or replace function public.search_document_chunks(
  query_embedding extensions.halfvec,
  filter_source_types text[] default null::text[],
  filter_project_id bigint default null::bigint,
  match_count integer default 10,
  match_threshold double precision default 0.25
)
returns table(
  chunk_id text,
  document_id text,
  chunk_index integer,
  chunk_text text,
  source_type text,
  similarity double precision,
  doc_title text,
  doc_category text,
  doc_source text,
  doc_date timestamp with time zone,
  doc_project_id bigint,
  doc_metadata jsonb,
  doc_created_at timestamp without time zone
)
language plpgsql
volatile
as $$
begin
  set local hnsw.ef_search = 100;
  set local ivfflat.probes = 10;

  return query
  select
    dc.chunk_id,
    dc.document_id,
    dc.chunk_index,
    dc.text as chunk_text,
    dc.source_type,
    (1 - (dc.embedding <=> query_embedding))::float as similarity,
    dc.metadata ->> 'title' as doc_title,
    coalesce(dc.metadata ->> 'category', dc.metadata ->> 'doc_type') as doc_category,
    dc.metadata ->> 'source' as doc_source,
    case
      when coalesce(dc.metadata ->> 'file_date', dc.metadata ->> 'date') ~ '^\d{4}-\d{2}-\d{2}'
        then (coalesce(dc.metadata ->> 'file_date', dc.metadata ->> 'date'))::timestamptz
      else null::timestamptz
    end as doc_date,
    nullif(dc.metadata ->> 'project_id', '')::bigint as doc_project_id,
    dc.metadata as doc_metadata,
    dc.created_at::timestamp as doc_created_at
  from public.document_chunks dc
  where
    dc.embedding is not null
    and (filter_source_types is null or dc.source_type = any(filter_source_types))
    and (
      filter_project_id is null
      or nullif(dc.metadata ->> 'project_id', '')::bigint = filter_project_id
    )
    and (1 - (dc.embedding <=> query_embedding)) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;

notify pgrst, 'reload schema';
