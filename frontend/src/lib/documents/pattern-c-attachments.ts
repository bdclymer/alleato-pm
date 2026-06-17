import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { triggerDocumentPipeline } from "@/lib/documents/pipeline-trigger";

export type PatternCEntityType =
  | "project"
  | "subcontract"
  | "purchase_order"
  | "prime_contract"
  | "change_order"
  | "commitment_change_order"
  | "prime_contract_change_order"
  | "prime_contract_pco"
  | "change_event"
  | "invoice"
  | "subcontractor_invoice"
  | "submittal"
  | "rfi"
  | "company";

export type PatternCJunctionTable =
  | "project_documents_v2"
  | "subcontract_documents"
  | "purchase_order_documents"
  | "prime_contract_documents"
  | "change_order_documents"
  | "commitment_change_order_documents"
  | "prime_contract_change_order_documents"
  | "prime_contract_pco_documents"
  | "change_event_documents"
  | "owner_invoice_documents"
  | "subcontractor_invoice_documents"
  | "submittal_doc_links"
  | "rfi_documents"
  | "company_documents";

type PatternCConfig = {
  table: PatternCJunctionTable;
  fkColumn: string;
  storageFolder: string;
};

export const PATTERN_C_ENTITY_CONFIG: Record<PatternCEntityType, PatternCConfig> = {
  project: {
    table: "project_documents_v2",
    fkColumn: "project_id",
    storageFolder: "project",
  },
  subcontract: {
    table: "subcontract_documents",
    fkColumn: "subcontract_id",
    storageFolder: "subcontract",
  },
  purchase_order: {
    table: "purchase_order_documents",
    fkColumn: "purchase_order_id",
    storageFolder: "purchase-order",
  },
  prime_contract: {
    table: "prime_contract_documents",
    fkColumn: "prime_contract_id",
    storageFolder: "prime-contract",
  },
  change_order: {
    table: "change_order_documents",
    fkColumn: "change_order_id",
    storageFolder: "change-order",
  },
  commitment_change_order: {
    table: "commitment_change_order_documents",
    fkColumn: "commitment_change_order_id",
    storageFolder: "commitment-change-order",
  },
  prime_contract_change_order: {
    table: "prime_contract_change_order_documents",
    fkColumn: "prime_contract_change_order_id",
    storageFolder: "prime-contract-change-order",
  },
  prime_contract_pco: {
    table: "prime_contract_pco_documents",
    fkColumn: "pco_id",
    storageFolder: "prime-contract-pco",
  },
  change_event: {
    table: "change_event_documents",
    fkColumn: "change_event_id",
    storageFolder: "change-event",
  },
  invoice: {
    table: "owner_invoice_documents",
    fkColumn: "owner_invoice_id",
    storageFolder: "owner-invoice",
  },
  subcontractor_invoice: {
    table: "subcontractor_invoice_documents",
    fkColumn: "subcontractor_invoice_id",
    storageFolder: "subcontractor-invoice",
  },
  submittal: {
    table: "submittal_doc_links",
    fkColumn: "submittal_id",
    storageFolder: "submittal",
  },
  rfi: {
    table: "rfi_documents",
    fkColumn: "rfi_id",
    storageFolder: "rfi",
  },
  company: {
    table: "company_documents",
    fkColumn: "company_id",
    storageFolder: "company",
  },
};

export type LinkedPatternCDocument = {
  document_metadata_id: string;
  document_type: string | null;
  attached_at: string;
  title: string | null;
  file_name: string | null;
  file_path: string | null;
  source_size: number | null;
  mime_type: string | null;
  download_url: string | null;
};

export type UploadedPatternCDocument = {
  documentMetadataId: string;
  title: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  attachedAt: string;
  signedUrl: string | null;
  pipelineQueued: boolean;
  pipelineMessage: string | null;
};

type AppClient = SupabaseClient<Database>;

export function getPatternCConfig(entityType: PatternCEntityType): PatternCConfig {
  return PATTERN_C_ENTITY_CONFIG[entityType];
}

export function isPatternCEntityType(value: string): value is PatternCEntityType {
  return value in PATTERN_C_ENTITY_CONFIG;
}

function entityForeignKeyValue(fkColumn: string, entityId: string): string | number {
  return fkColumn.endsWith("_id") && /^\d+$/.test(entityId) ? Number(entityId) : entityId;
}

export async function resolvePatternCEntity(
  supabase: AppClient,
  entityType: string,
  entityId: string,
): Promise<{ entityType: PatternCEntityType; entityId: string } | { error: string; status: number }> {
  if (entityType === "commitment") {
    const [{ data: subcontract }, { data: purchaseOrder }] = await Promise.all([
      supabase.from("subcontracts").select("id").eq("id", entityId).maybeSingle(),
      supabase.from("purchase_orders").select("id").eq("id", entityId).maybeSingle(),
    ]);

    if (subcontract) {
      return { entityType: "subcontract", entityId };
    }
    if (purchaseOrder) {
      return { entityType: "purchase_order", entityId };
    }
    return { error: "Commitment not found in subcontracts or purchase_orders", status: 404 };
  }

  if (!isPatternCEntityType(entityType)) {
    return { error: `Unsupported entity type: ${entityType}`, status: 400 };
  }

  return { entityType, entityId };
}

export async function listLinkedPatternCDocuments({
  supabase,
  serviceClient,
  entityType,
  entityId,
}: {
  supabase: AppClient;
  serviceClient: AppClient;
  entityType: PatternCEntityType;
  entityId: string;
}): Promise<LinkedPatternCDocument[]> {
  const config = getPatternCConfig(entityType);
  const { data: rows, error } = await supabase
    .from(config.table)
    .select("document_metadata_id, document_type, attached_at")
    .eq(config.fkColumn, entityId)
    .order("attached_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch linked documents: ${error.message}`);
  }

  const linkedRows = rows ?? [];
  if (!linkedRows.length) return [];

  const ids = linkedRows.map((row) => row.document_metadata_id);
  const { data: metaRows, error: metaError } = await supabase
    .from("document_metadata")
    .select("id, title, file_name, file_path, storage_bucket, source_size, type")
    .in("id", ids);

  if (metaError) {
    throw new Error(`Failed to fetch document metadata: ${metaError.message}`);
  }

  const metaMap = new Map((metaRows ?? []).map((row) => [row.id, row]));
  const fileRows = (metaRows ?? []).filter((row) => row.file_path && row.storage_bucket === "project-files");
  const signedUrlMap = new Map<string, string>();

  if (fileRows.length) {
    const { data: signedRows, error: signError } = await serviceClient.storage
      .from("project-files")
      .createSignedUrls(fileRows.map((row) => row.file_path as string), 60 * 60);

    if (signError) {
      throw new Error(`Failed to sign document URLs: ${signError.message}`);
    }

    for (const signed of signedRows ?? []) {
      if (signed.path && signed.signedUrl) {
        signedUrlMap.set(signed.path, signed.signedUrl);
      }
    }
  }

  return linkedRows.map((row) => {
    const meta = metaMap.get(row.document_metadata_id);
    const filePath = meta?.file_path ?? null;
    return {
      document_metadata_id: row.document_metadata_id,
      document_type: row.document_type,
      attached_at: row.attached_at,
      title: meta?.title ?? meta?.file_name ?? null,
      file_name: meta?.file_name ?? null,
      file_path: filePath,
      source_size: meta?.source_size ?? null,
      mime_type: meta?.type ?? null,
      download_url: filePath ? signedUrlMap.get(filePath) ?? null : null,
    };
  });
}

export async function uploadAndLinkPatternCDocument({
  supabase,
  serviceClient,
  file,
  projectId,
  entityType,
  entityId,
  userId,
  documentType,
}: {
  supabase: AppClient;
  serviceClient: AppClient;
  file: File;
  projectId: number;
  entityType: PatternCEntityType;
  entityId: string;
  userId: string;
  documentType?: string | null;
}): Promise<UploadedPatternCDocument> {
  const config = getPatternCConfig(entityType);
  const docId = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = safeName.includes(".") ? safeName.split(".").pop() : "";
  const storagePath = `${projectId}/${config.storageFolder}/${entityId}/${Date.now()}_${docId.slice(0, 8)}${ext ? `.${ext}` : ""}`;
  const contentType = file.type?.trim() || "application/octet-stream";

  const fileBuffer = await file.arrayBuffer();
  const { error: uploadError } = await serviceClient.storage
    .from("project-files")
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  const attachedAt = new Date().toISOString();
  const today = attachedAt.split("T")[0];

  const { error: metaError } = await supabase
    .from("document_metadata")
    .insert({
      id: docId,
      title: file.name,
      file_name: safeName,
      file_path: storagePath,
      storage_bucket: "project-files",
      source: "manual_upload",
      source_system: "manual_upload",
      status: "uploaded",
      project_id: projectId,
      type: contentType,
      category: "attachment",
      source_size: file.size,
      date: today,
      document_type: documentType || null,
      source_metadata: {
        uploaded_by: userId,
        uploaded_for_entity_type: entityType,
        uploaded_for_entity_id: entityId,
      },
    });

  if (metaError) {
    await serviceClient.storage.from("project-files").remove([storagePath]);
    throw new Error(`Failed to create document record: ${metaError.message}`);
  }

  const row: Record<string, unknown> = {
    [config.fkColumn]: entityForeignKeyValue(config.fkColumn, entityId),
    document_metadata_id: docId,
    attached_by: userId,
    attached_at: attachedAt,
  };
  if (documentType) {
    row.document_type = documentType;
  }

  const { error: junctionError } = await supabase
    .from(config.table)
    .insert(row as never);

  if (junctionError) {
    await supabase.from("document_metadata").delete().eq("id", docId);
    await serviceClient.storage.from("project-files").remove([storagePath]);
    throw new Error(`Failed to link document: ${junctionError.message}`);
  }

  const { data: signedData, error: signError } = await serviceClient.storage
    .from("project-files")
    .createSignedUrl(storagePath, 60 * 60);

  if (signError) {
    throw new Error(`Failed to sign uploaded document URL: ${signError.message}`);
  }

  const pipeline = await triggerDocumentPipeline(docId);

  return {
    documentMetadataId: docId,
    title: file.name,
    fileName: safeName,
    filePath: storagePath,
    fileSize: file.size,
    mimeType: contentType,
    attachedAt,
    signedUrl: signedData?.signedUrl ?? null,
    pipelineQueued: pipeline.queued,
    pipelineMessage: pipeline.message,
  };
}

export async function deletePatternCDocumentLink({
  supabase,
  entityType,
  entityId,
  documentMetadataId,
}: {
  supabase: AppClient;
  entityType: PatternCEntityType;
  entityId: string;
  documentMetadataId: string;
}): Promise<void> {
  const config = getPatternCConfig(entityType);
  const { error } = await supabase
    .from(config.table)
    .delete()
    .eq(config.fkColumn, entityForeignKeyValue(config.fkColumn, entityId))
    .eq("document_metadata_id", documentMetadataId);

  if (error) {
    throw new Error(`Failed to remove document link: ${error.message}`);
  }
}

export async function updatePatternCDocumentType({
  supabase,
  entityType,
  entityId,
  documentMetadataId,
  documentType,
}: {
  supabase: AppClient;
  entityType: PatternCEntityType;
  entityId: string;
  documentMetadataId: string;
  documentType: string | null;
}): Promise<void> {
  const config = getPatternCConfig(entityType);
  const { error: linkError } = await supabase
    .from(config.table)
    .update({ document_type: documentType } as never)
    .eq(config.fkColumn, entityForeignKeyValue(config.fkColumn, entityId))
    .eq("document_metadata_id", documentMetadataId);

  if (linkError) {
    throw new Error(`Failed to update linked document type: ${linkError.message}`);
  }

  const { error: metaError } = await supabase
    .from("document_metadata")
    .update({ document_type: documentType })
    .eq("id", documentMetadataId);

  if (metaError) {
    throw new Error(`Failed to update document metadata type: ${metaError.message}`);
  }
}
