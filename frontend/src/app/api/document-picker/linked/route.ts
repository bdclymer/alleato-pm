import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/document-picker/linked?entityType=<type>&entityId=<id>
 *
 * Returns all document_metadata records linked to the given entity via
 * the Pattern C junction table, with signed download URLs for file-backed docs.
 *
 * DELETE /api/document-picker/linked?entityType=<type>&entityId=<id>&documentMetadataId=<id>
 *
 * Removes the junction row. Does NOT delete document_metadata or the storage file.
 */

const JUNCTION_CONFIG: Record<string, { table: string; fkColumn: string }> = {
  project:        { table: 'project_documents_v2',     fkColumn: 'project_id' },
  subcontract:    { table: 'subcontract_documents',     fkColumn: 'subcontract_id' },
  purchase_order: { table: 'purchase_order_documents',  fkColumn: 'purchase_order_id' },
  prime_contract: { table: 'prime_contract_documents',  fkColumn: 'prime_contract_id' },
  change_order:   { table: 'change_order_documents',    fkColumn: 'change_order_id' },
  invoice:        { table: 'owner_invoice_documents',   fkColumn: 'owner_invoice_id' },
  submittal:      { table: 'submittal_doc_links',       fkColumn: 'submittal_id' },
  rfi:            { table: 'rfi_documents',             fkColumn: 'rfi_id' },
  company:        { table: 'company_documents',         fkColumn: 'company_id' },
};

type SupportedTable =
  | 'project_documents_v2'
  | 'subcontract_documents'
  | 'purchase_order_documents'
  | 'prime_contract_documents'
  | 'change_order_documents'
  | 'owner_invoice_documents'
  | 'submittal_doc_links'
  | 'rfi_documents'
  | 'company_documents';

type LinkedRow = {
  document_metadata_id: string;
  document_type: string | null;
  attached_at: string;
};

async function getRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entityType: string,
  entityId: string
): Promise<{ rows: LinkedRow[]; error: string | null }> {
  if (entityType === 'commitment') {
    const [{ data: scRows }, { data: poRows }] = await Promise.all([
      supabase
        .from('subcontract_documents')
        .select('document_metadata_id, document_type, attached_at')
        .eq('subcontract_id', entityId),
      supabase
        .from('purchase_order_documents')
        .select('document_metadata_id, document_type, attached_at')
        .eq('purchase_order_id', entityId),
    ]);
    return {
      rows: [...(scRows ?? []), ...(poRows ?? [])] as LinkedRow[],
      error: null,
    };
  }

  const config = JUNCTION_CONFIG[entityType];
  if (!config) return { rows: [], error: `Unsupported entity type: ${entityType}` };

  const { data, error } = await supabase
    .from(config.table as SupportedTable)
    .select('document_metadata_id, document_type, attached_at')
    .eq(config.fkColumn, entityId)
    .order('attached_at', { ascending: false });

  if (error) {
    console.error('[document-picker/linked] supabase error:', error);
    return { rows: [], error: 'Failed to fetch linked documents' };
  }
  return { rows: (data ?? []) as LinkedRow[], error: null };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('entityType');
  const entityId = searchParams.get('entityId');

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: 'Required query params: entityType, entityId' },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const { rows, error } = await getRows(supabase, entityType, entityId);
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (!rows.length) return NextResponse.json([]);

  // Enrich with document_metadata (title, file info)
  const ids = rows.map((r) => r.document_metadata_id);
  const { data: metaRows } = await supabase
    .from('document_metadata')
    .select('id, title, file_name, file_path, storage_bucket, source_size')
    .in('id', ids);

  const metaMap = new Map(
    (metaRows ?? []).map((m) => [m.id, m] as [string, typeof m])
  );

  // Generate signed URLs for file-backed documents
  const filePaths = (metaRows ?? [])
    .filter((m) => m.file_path && m.storage_bucket === 'project-files')
    .map((m) => m.file_path as string);

  const signedUrlMap = new Map<string, string>();
  if (filePaths.length > 0) {
    const { data: signed } = await serviceClient.storage
      .from('project-files')
      .createSignedUrls(filePaths, 3600);
    (signed ?? []).forEach((s) => {
      if (s.path && s.signedUrl) signedUrlMap.set(s.path, s.signedUrl);
    });
  }

  const result = rows.map((r) => {
    const meta = metaMap.get(r.document_metadata_id);
    const signedUrl = meta?.file_path ? signedUrlMap.get(meta.file_path) ?? null : null;
    return {
      document_metadata_id: r.document_metadata_id,
      document_type: r.document_type,
      attached_at: r.attached_at,
      title: meta?.title ?? meta?.file_name ?? null,
      file_name: meta?.file_name ?? null,
      file_path: meta?.file_path ?? null,
      source_size: meta?.source_size ?? null,
      download_url: signedUrl,
    };
  });

  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('entityType');
  const entityId = searchParams.get('entityId');
  const documentMetadataId = searchParams.get('documentMetadataId');

  if (!entityType || !entityId || !documentMetadataId) {
    return NextResponse.json(
      { error: 'Required query params: entityType, entityId, documentMetadataId' },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Resolve 'commitment' — try both junction tables
  if (entityType === 'commitment') {
    await Promise.all([
      supabase
        .from('subcontract_documents')
        .delete()
        .eq('subcontract_id', entityId)
        .eq('document_metadata_id', documentMetadataId),
      supabase
        .from('purchase_order_documents')
        .delete()
        .eq('purchase_order_id', entityId)
        .eq('document_metadata_id', documentMetadataId),
    ]);
    return NextResponse.json({ success: true });
  }

  const config = JUNCTION_CONFIG[entityType];
  if (!config) {
    return NextResponse.json(
      { error: `Unsupported entity type: ${entityType}` },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from(config.table as SupportedTable)
    .delete()
    .eq(config.fkColumn, entityId)
    .eq('document_metadata_id', documentMetadataId);

  if (error) {
    console.error('[document-picker/linked] delete error:', error);
    return NextResponse.json({ error: 'Failed to remove document link' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
