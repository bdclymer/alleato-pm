import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/document-picker/linked?entityType=<type>&entityId=<id>
 *
 * Returns all document_metadata records linked to the given entity via
 * the Pattern C junction table, joined to document_metadata for title.
 */

// Hardcoded table + FK column per entity type
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

type LinkedRow = {
  document_metadata_id: string;
  document_type: string | null;
  attached_at: string;
};

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
  let rows: LinkedRow[] = [];

  if (entityType === 'commitment') {
    // 'commitment' resolves to subcontracts + purchase_orders — query both
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
    rows = [...(scRows ?? []), ...(poRows ?? [])] as LinkedRow[];
  } else {
    const config = JUNCTION_CONFIG[entityType];
    if (!config) {
      return NextResponse.json(
        { error: `Unsupported entity type: ${entityType}` },
        { status: 400 }
      );
    }

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

    const { data, error } = await supabase
      .from(config.table as SupportedTable)
      .select('document_metadata_id, document_type, attached_at')
      .eq(config.fkColumn, entityId)
      .order('attached_at', { ascending: false });

    if (error) {
      console.error('[document-picker/linked] supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch linked documents' }, { status: 500 });
    }
    rows = (data ?? []) as LinkedRow[];
  }

  if (!rows.length) {
    return NextResponse.json([]);
  }

  // Enrich with document_metadata titles
  const ids = rows.map((r) => r.document_metadata_id);
  const { data: metaRows } = await supabase
    .from('document_metadata')
    .select('id, title, file_name')
    .in('id', ids);

  const metaMap = new Map(
    (metaRows ?? []).map((m) => [m.id, m] as [string, typeof m])
  );

  const result = rows.map((r) => {
    const meta = metaMap.get(r.document_metadata_id);
    return {
      document_metadata_id: r.document_metadata_id,
      document_type: r.document_type,
      attached_at: r.attached_at,
      title: meta?.title ?? meta?.file_name ?? null,
    };
  });

  return NextResponse.json(result);
}
