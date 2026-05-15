import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

// Convenience union of all Pattern C junction table Insert types
type JunctionInsert =
  | Database['public']['Tables']['project_documents_v2']['Insert']
  | Database['public']['Tables']['subcontract_documents']['Insert']
  | Database['public']['Tables']['purchase_order_documents']['Insert']
  | Database['public']['Tables']['prime_contract_documents']['Insert']
  | Database['public']['Tables']['change_order_documents']['Insert']
  | Database['public']['Tables']['owner_invoice_documents']['Insert']
  | Database['public']['Tables']['submittal_doc_links']['Insert']
  | Database['public']['Tables']['rfi_documents']['Insert']
  | Database['public']['Tables']['company_documents']['Insert'];

export const dynamic = 'force-dynamic';

/**
 * POST /api/document-picker/attach
 *
 * Body: { entityType, entityId, documentMetadataId, documentType? }
 *
 * Inserts a row into the correct Pattern C junction table.
 * entityType → junction table mapping is hardcoded (never interpolated into SQL).
 *
 * 'commitment' entityType is resolved: we look up whether the entityId exists
 * in subcontracts or purchase_orders, then write to the correct junction.
 */

type EntityType =
  | 'project'
  | 'subcontract'
  | 'purchase_order'
  | 'commitment'
  | 'prime_contract'
  | 'change_order'
  | 'invoice'
  | 'submittal'
  | 'rfi'
  | 'drawing'
  | 'company';

type ResolvedEntityType = Exclude<EntityType, 'commitment'>;

interface AttachBody {
  entityType: EntityType;
  entityId: string;
  documentMetadataId: string;
  documentType?: string | null;
}

// Hardcoded map — entity type string is NEVER used as a SQL identifier
const JUNCTION_TABLE: Record<ResolvedEntityType, string> = {
  project:        'project_documents_v2',
  subcontract:    'subcontract_documents',
  purchase_order: 'purchase_order_documents',
  prime_contract: 'prime_contract_documents',
  change_order:   'change_order_documents',
  invoice:        'owner_invoice_documents',
  submittal:      'submittal_doc_links',
  rfi:            'rfi_documents',
  drawing:        'drawings',   // special — updates drawings.document_metadata_id directly
  company:        'company_documents',
};

// FK column per junction table
const FK_COLUMN: Record<string, string> = {
  project_documents_v2:       'project_id',
  subcontract_documents:      'subcontract_id',
  purchase_order_documents:   'purchase_order_id',
  prime_contract_documents:   'prime_contract_id',
  change_order_documents:     'change_order_id',
  owner_invoice_documents:    'owner_invoice_id',
  submittal_doc_links:        'submittal_id',
  rfi_documents:              'rfi_id',
  company_documents:          'company_id',
};

export async function POST(req: NextRequest) {
  let body: AttachBody;
  try {
    body = (await req.json()) as AttachBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { entityType, entityId, documentMetadataId, documentType } = body;

  if (!entityType || !entityId || !documentMetadataId) {
    return NextResponse.json(
      { error: 'Required fields: entityType, entityId, documentMetadataId' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Verify caller is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Resolve 'commitment' → subcontract or purchase_order
  let resolvedType: ResolvedEntityType = entityType as ResolvedEntityType;

  if (entityType === 'commitment') {
    const { data: sc } = await supabase
      .from('subcontracts')
      .select('id')
      .eq('id', entityId)
      .single();

    if (sc) {
      resolvedType = 'subcontract';
    } else {
      const { data: po } = await supabase
        .from('purchase_orders')
        .select('id')
        .eq('id', entityId)
        .single();

      if (po) {
        resolvedType = 'purchase_order';
      } else {
        return NextResponse.json(
          { error: 'Commitment not found in subcontracts or purchase_orders' },
          { status: 404 }
        );
      }
    }
  }

  // Drawings: update drawings.document_metadata_id directly (simpler for initial wiring)
  if (resolvedType === 'drawing') {
    const { error: updateError } = await supabase
      .from('drawings')
      .update({
        document_metadata_id: documentMetadataId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entityId);

    if (updateError) {
      console.error('[document-picker/attach] drawing update error:', updateError);
      return NextResponse.json({ error: 'Failed to link document to drawing' }, { status: 500 });
    }

    return NextResponse.json({ success: true, entityType: 'drawing', entityId, documentMetadataId });
  }

  // All other entity types — insert into junction table
  const tableName = JUNCTION_TABLE[resolvedType];
  const fkColumn = FK_COLUMN[tableName];

  if (!tableName || !fkColumn) {
    return NextResponse.json(
      { error: `Unsupported entity type: ${entityType}` },
      { status: 400 }
    );
  }

  const row: Record<string, unknown> = {
    [fkColumn]:             entityId,
    document_metadata_id:   documentMetadataId,
    attached_by:            user.id,
    attached_at:            new Date().toISOString(),
  };
  if (documentType) {
    row['document_type'] = documentType;
  }

  // TypeScript requires a literal table name — cast via `as` to satisfy the
  // Supabase generic while keeping the hardcoded-map safety guarantee.
  type JunctionTable =
    | 'project_documents_v2'
    | 'subcontract_documents'
    | 'purchase_order_documents'
    | 'prime_contract_documents'
    | 'change_order_documents'
    | 'owner_invoice_documents'
    | 'submittal_doc_links'
    | 'rfi_documents'
    | 'company_documents';

  const { error: insertError } = await supabase
    .from(tableName as JunctionTable)
    // Shape is validated by the hardcoded FK_COLUMN + JUNCTION_TABLE maps above.
    .insert(row as unknown as JunctionInsert);

  if (insertError) {
    // Conflict on PK = already linked — treat as success
    if (insertError.code === '23505') {
      return NextResponse.json({ success: true, alreadyLinked: true });
    }
    console.error('[document-picker/attach] insert error:', insertError);
    return NextResponse.json({ error: 'Failed to link document' }, { status: 500 });
  }

  return NextResponse.json({ success: true, entityType: resolvedType, entityId, documentMetadataId });
}
