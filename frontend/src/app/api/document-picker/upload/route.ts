import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/document-picker/upload
 *
 * Uploads a file to Supabase Storage, creates a document_metadata row,
 * and links it to the entity via the correct Pattern C junction table.
 *
 * FormData fields:
 *   file         — the file blob
 *   entityType   — one of the DocumentPickerEntityType values
 *   entityId     — the entity primary key (string)
 *   projectId    — the project integer id (for storage path + document_metadata)
 *   documentType — (optional) taxonomy type_key
 *
 * Returns: { documentMetadataId, title, fileName, fileSize, signedUrl }
 */

type ResolvedEntityType =
  | 'project'
  | 'subcontract'
  | 'purchase_order'
  | 'prime_contract'
  | 'change_order'
  | 'invoice'
  | 'submittal'
  | 'rfi'
  | 'company';

const JUNCTION_TABLE: Record<ResolvedEntityType, string> = {
  project:        'project_documents_v2',
  subcontract:    'subcontract_documents',
  purchase_order: 'purchase_order_documents',
  prime_contract: 'prime_contract_documents',
  change_order:   'change_order_documents',
  invoice:        'owner_invoice_documents',
  submittal:      'submittal_doc_links',
  rfi:            'rfi_documents',
  company:        'company_documents',
};

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

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const entityType = formData.get('entityType') as string | null;
  const entityId = formData.get('entityId') as string | null;
  const projectId = formData.get('projectId') as string | null;
  const documentType = formData.get('documentType') as string | null;

  if (!file || !entityType || !entityId || !projectId) {
    return NextResponse.json(
      { error: 'Required fields: file, entityType, entityId, projectId' },
      { status: 400 }
    );
  }

  // Resolve 'commitment' → subcontract or purchase_order
  let resolvedType = entityType as ResolvedEntityType;
  const resolvedEntityId = entityId;

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

  const tableName = JUNCTION_TABLE[resolvedType];
  const fkColumn = FK_COLUMN[tableName];

  if (!tableName || !fkColumn) {
    return NextResponse.json(
      { error: `Unsupported entity type: ${entityType}` },
      { status: 400 }
    );
  }

  // Build storage path
  const docId = crypto.randomUUID();
  const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${projectId}/${resolvedType}/${resolvedEntityId}/${Date.now()}_${docId.slice(0, 8)}${ext ? `.${ext}` : ''}`;

  // Upload to storage (service client bypasses RLS on storage)
  const fileBuffer = await file.arrayBuffer();
  const { error: uploadError } = await serviceClient.storage
    .from('project-files')
    .upload(storagePath, fileBuffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    console.error('[document-picker/upload] storage error:', uploadError);
    return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
  }

  // Create document_metadata row
  const today = new Date().toISOString().split('T')[0];
  const { error: metaError } = await supabase
    .from('document_metadata')
    .insert({
      id: docId,
      title: file.name,
      file_name: safeName,
      file_path: storagePath,
      storage_bucket: 'project-files',
      source: 'manual_upload',
      source_system: 'manual_upload',
      status: 'uploaded',
      project_id: parseInt(projectId, 10),
      type: 'document',
      category: 'document',
      source_size: file.size,
      date: today,
      document_type: documentType || null,
    });

  if (metaError) {
    console.error('[document-picker/upload] document_metadata error:', metaError);
    // Clean up storage
    await serviceClient.storage.from('project-files').remove([storagePath]);
    return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 });
  }

  // Insert junction row
  const row: Record<string, unknown> = {
    [fkColumn]:           resolvedEntityId,
    document_metadata_id: docId,
    attached_by:          user.id,
    attached_at:          new Date().toISOString(),
  };
  if (documentType) {
    row['document_type'] = documentType;
  }

  const { error: junctionError } = await supabase
    .from(tableName as JunctionTable)
    .insert(row as never);

  if (junctionError && junctionError.code !== '23505') {
    console.error('[document-picker/upload] junction error:', junctionError);
    // Don't roll back — the document_metadata row is still valid and can be relinked
  }

  // Generate a short-lived signed URL for immediate display
  const { data: signedData } = await serviceClient.storage
    .from('project-files')
    .createSignedUrl(storagePath, 3600);

  return NextResponse.json({
    documentMetadataId: docId,
    title: file.name,
    fileName: safeName,
    fileSize: file.size,
    signedUrl: signedData?.signedUrl ?? null,
  });
}
