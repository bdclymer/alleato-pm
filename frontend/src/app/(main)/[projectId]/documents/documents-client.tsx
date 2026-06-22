"use client";

import { DocumentsTablePage } from "@/features/documents/documents-table-page";
import { createDocumentsTableDefinition } from "@/features/documents/documents-table-definition";
import { useOptionalProject } from "@/contexts/project-context";

type DocumentsClientProps = {
  projectId: string;
};

export function DocumentsClient({ projectId }: DocumentsClientProps) {
  const numericProjectId = Number.parseInt(projectId, 10);
  const projectName = useOptionalProject()?.selectedProject?.name ?? undefined;

  return (
    <DocumentsTablePage
      definition={createDocumentsTableDefinition({
        entityKey: "project-documents-unified",
        forcedProjectId: Number.isFinite(numericProjectId)
          ? numericProjectId
          : undefined,
      })}
      eyebrow={projectName}
      title="Documents"
      description="RAG document library and ingestion status"
      uploadEnabled
      uploadProjectId={Number.isFinite(numericProjectId) ? numericProjectId : null}
      inlineEditingEnabled
      projectAssignmentEnabled
      deleteEnabled
      exportFilePrefix="documents"
      emptyTitle="No documents found"
      emptyDescription="Upload your first document to start building your RAG library."
      emptyFilteredDescription="Try adjusting your search or filters."
      openPreference="external-first"
      pageArea="project-documents-table"
    />
  );
}
