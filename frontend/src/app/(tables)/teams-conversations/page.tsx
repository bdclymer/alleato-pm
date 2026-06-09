"use client";

import { DocumentsTablePage } from "@/features/documents/documents-table-page";
import { createDocumentsTableDefinition } from "@/features/documents/documents-table-definition";
import {
  buildTeamsConversationTableColumns,
  renderTeamsConversationCard,
  renderTeamsConversationList,
  teamsConversationColumns,
  teamsConversationDefaultVisibleColumns,
} from "@/features/documents/teams-conversations-table-config";

const teamsConversationsTableDefinition = createDocumentsTableDefinition({
  entityKey: "teams-conversations",
  defaultFilters: {
    type: "teams_dm_conversation",
  },
  searchPlaceholder: "Search Teams conversations...",
  defaultSortBy: "date",
  defaultSortDirection: "desc",
  columns: teamsConversationColumns,
  defaultVisibleColumns: teamsConversationDefaultVisibleColumns,
});

const teamsConversationTableColumns = buildTeamsConversationTableColumns();

export default function TeamsConversationsPage() {
  return (
    <DocumentsTablePage
      definition={teamsConversationsTableDefinition}
      title="Teams Conversations"
      description="Review compiled Microsoft Teams conversation threads, attribution, and project-linked source detail."
      uploadEnabled={false}
      inlineEditingEnabled={false}
      projectAssignmentEnabled
      deleteEnabled={false}
      exportFilePrefix="teams-conversations"
      emptyTitle="No Teams conversations found"
      emptyDescription="Compiled Teams conversation threads will appear here after Microsoft Graph sync and ingestion."
      emptyFilteredDescription="Try adjusting the search or filters to find a different thread."
      openPreference="internal-first"
      pageArea="teams-conversations-table"
      tableColumns={teamsConversationTableColumns}
      renderCard={renderTeamsConversationCard}
      renderList={renderTeamsConversationList}
    />
  );
}
