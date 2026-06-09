"use client";

import { DocumentsTablePage } from "@/features/documents/documents-table-page";
import { documentsTableDefinition } from "@/features/documents/documents-table-definition";

export default function DocumentsPage() {
  return (
    <DocumentsTablePage
      definition={documentsTableDefinition}
      title="Documents"
      description="RAG document library and ingestion status"
      uploadEnabled
      inlineEditingEnabled
      projectAssignmentEnabled
      deleteEnabled
      exportFilePrefix="documents"
      emptyTitle="No documents found"
      emptyDescription="Upload your first document to start building your RAG library."
      emptyFilteredDescription="Try adjusting your search or filters."
      openPreference="external-first"
      pageArea="documents-table"
    />
  );
}
