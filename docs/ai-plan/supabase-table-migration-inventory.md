# Supabase Table Migration Inventory

Generated: 2026-05-14T18:19:46Z

Original project: `Original Supabase app DB (lgveqfnpkxvzbnnwuled)`

New RAG project: `New RAG Supabase DB (fqcvmfqldlewvbsuxdvz)`

This file is grouped by migration decision so it is easier to scan. `Routing verified` means the repo paths checked in this pass now use the RAG client for that moved table. Count evidence below was rechecked after rerunning the copy scripts on 2026-05-14.

## Move Now / Already Copied To RAG

| Original Table | Source Rows | Updated Configuration | Associated Project | RAG Target / Equivalent | Notes | Status |
|---|---:|---|---|---|---|---|
| `public.document_attribution_candidates` | 13,204 | Move to RAG DB | New RAG Supabase DB (fqcvmfqldlewvbsuxdvz) | public.document_attribution_candidates | App count equals RAG count after copy rerun. Backend compiler/email/Teams/backfill and admin review routes now use RAG client. | Migrated, count-verified, routing verified. |
| `public.document_chunks` | 103,955 app / 106,827 RAG | Move to RAG DB | New RAG Supabase DB (fqcvmfqldlewvbsuxdvz) | public.document_chunks | RAG is canonical and has more current chunks than the app DB. AI retrieval paths use RAG when `RAG_DATABASE_READS_ENABLED=true`; chunk writes already use RAG. | Migrated; RAG canonical; routing verified. |
| `public.fireflies_ingestion_jobs` | 27,241 | Move to RAG DB | New RAG Supabase DB (fqcvmfqldlewvbsuxdvz) | public.fireflies_ingestion_jobs | App count equals RAG count after copy rerun. Backend scheduler, pipeline/admin endpoints, and document trigger routes use RAG job client. | Migrated, count-verified, routing verified. |
| `public.ingestion_dead_letter` | 17 | Move to RAG DB | New RAG Supabase DB (fqcvmfqldlewvbsuxdvz) | public.ingestion_dead_letter | App count equals RAG count after copy rerun. No active writer found in checked repo paths. | Migrated and count-verified. |
| `public.ingestion_jobs` | 436 | Move to RAG DB | New RAG Supabase DB (fqcvmfqldlewvbsuxdvz) | public.ingestion_jobs | App count equals RAG count after copy rerun. `SupabaseRagStore` now writes ingestion job rows through the RAG client. | Migrated, count-verified, routing verified. |
| `public.packet_refresh_jobs` | 1,540 | Move to RAG DB | New RAG Supabase DB (fqcvmfqldlewvbsuxdvz) | public.packet_refresh_jobs | App count equals RAG count after copy rerun. Compiler enqueue/claim/mark/process paths and readiness fallback now use RAG client. | Migrated, count-verified, routing verified. |
| `public.rag_pipeline_state` | 1 | Move to RAG DB | New RAG Supabase DB (fqcvmfqldlewvbsuxdvz) | public.rag_pipeline_state | App count equals RAG count after copy rerun. No active writer found in checked repo paths. | Migrated and count-verified. |
| `public.source_intelligence_jobs` | 11,087 | Move to RAG DB | New RAG Supabase DB (fqcvmfqldlewvbsuxdvz) | public.source_intelligence_jobs | App count equals RAG count after copy rerun. Compiler enqueue/claim/mark/process paths and readiness fallback now use RAG client. | Migrated, count-verified, routing verified. |
| `public.source_signal_candidates` | 7,538 | Move to RAG DB | New RAG Supabase DB (fqcvmfqldlewvbsuxdvz) | public.source_signal_candidates | App count equals RAG count after copy rerun. Compiler, email compiler, Teams compiler, readiness counts, and admin views now use RAG client. | Migrated, count-verified, routing verified. |
| `public.source_sync_health_snapshots` | 330 | Move to RAG DB | New RAG Supabase DB (fqcvmfqldlewvbsuxdvz) | public.source_sync_health_snapshots | App count equals RAG count after copy rerun. Source sync health snapshot writes/readbacks now use RAG client. | Migrated, count-verified, routing verified. |
| `public.source_sync_runs` | 3,670 | Move to RAG DB | New RAG Supabase DB (fqcvmfqldlewvbsuxdvz) | public.source_sync_runs | App count equals RAG count after copy rerun. Source sync run writes, AI health, readiness, and assistant source summary ledger now use RAG client. | Migrated, count-verified, routing verified. |

## Split Now

| Original Table | Source Rows | Updated Configuration | Associated Project | RAG Target / Equivalent | Notes | Status |
|---|---:|---|---|---|---|---|
| `public.document_metadata` | 36,657 | Split | Split: app DB + new RAG DB | public.rag_document_metadata | Keep skinny catalog in app DB; full content/raw_text/summary_embedding copied to RAG metadata. | Migrated and count-verified: 36,657 / 36,657 copied to `rag_document_metadata`. Writer split still needs full-content app DB cleanup. |
| `public.graph_sync_state` | 0 | Split | Split: app DB + new RAG DB | TBD RAG payload/state table | Keep app workflow/reference state in app DB; move heavy payload/detail state to RAG DB. | Split planned / partially migrated; routing pending. |
| `public.outlook_email_intake` | 18 | Split | Split: app DB + new RAG DB | TBD RAG payload/state table | Keep app workflow/reference state in app DB; move heavy payload/detail state to RAG DB. | Split planned / partially migrated; routing pending. |
| `public.outlook_email_intake_attachments` | 21 | Split | Split: app DB + new RAG DB | TBD RAG payload/state table | Keep app workflow/reference state in app DB; move heavy payload/detail state to RAG DB. | Split planned / partially migrated; routing pending. |
| `public.teams_conversation_refs` | 0 | Split | Split: app DB + new RAG DB | TBD RAG payload/state table | Keep app workflow/reference state in app DB; move heavy payload/detail state to RAG DB. | Split planned / partially migrated; routing pending. |

## Review / Likely Split Later

| Original Table | Source Rows | Updated Configuration | Associated Project | RAG Target / Equivalent | Notes | Status |
|---|---:|---|---|---|---|---|
| `public.acumatica_sync_runs` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.acumatica_sync_state` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.ai_analysis_jobs` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.ai_insights` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.ai_models` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.block_embeddings` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.change_events_documents_links` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.chat_thread_attachment_files` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.chat_thread_attachments` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.chats` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.chunks` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.contract_documents` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.document_executive_summaries` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.document_group_access` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.document_insights` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.document_rows` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.document_user_access` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.documents` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.documents_rfis_links` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.documents_submittals_links` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.email_attachments` | 19 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.email_events` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.email_messages` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.erp_sync_log` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.fm_documents` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.fm_text_chunks` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.insights` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.marketing_intelligence_items` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.outlook_email_skip_audit` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.project_document_counts_matview` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.project_documents` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.project_emails` | 11 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.project_resources` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.projects_sync` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.search_documents` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.sources` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.subcontractor_documents` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.subcontractor_invoice_emails` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.submittal_documents` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.support_article_chunks` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.sync_status` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.team_chat_channels` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.team_chat_messages` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.teams_link_codes` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |
| `public.user_email_notifications` | 0 | Review / likely split later | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | AI-adjacent name but not in the urgent move set; assign writer/reader owner before moving. | Needs owner review. |

## Stay In Original Supabase

| Original Table | Source Rows | Updated Configuration | Associated Project | RAG Target / Equivalent | Notes | Status |
|---|---:|---|---|---|---|---|
| `auth.audit_log_entries` | 11 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.custom_oauth_providers` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.flow_state` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.identities` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.instances` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.mfa_amr_claims` | 9 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.mfa_challenges` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.mfa_factors` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.oauth_authorizations` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.oauth_client_states` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.oauth_clients` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.oauth_consents` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.one_time_tokens` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.refresh_tokens` | 10 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.saml_providers` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.saml_relay_states` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.schema_migrations` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.sessions` | 9 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.sso_domains` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.sso_providers` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.users` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.webauthn_challenges` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `auth.webauthn_credentials` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `cron.job` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `cron.job_run_details` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `drizzle.__drizzle_migrations` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `extensions.wrappers_fdw_stats` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `net._http_response` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `net.http_request_queue` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `next_auth.accounts` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `next_auth.sessions` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `next_auth.users` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `next_auth.verification_tokens` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `pgmq.meta` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `private.document_processing_queue` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `private.policy_backup` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.__drizzle_migrations` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public._prisma_migrations` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.acumatica_accounts` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.acumatica_ap_bill_lines` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.acumatica_ap_bills` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.acumatica_ar_invoice_lines` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.acumatica_ar_invoices` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.acumatica_change_orders` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.acumatica_checks` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.acumatica_customers` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.acumatica_outbound_audit_logs` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.acumatica_payment_applications` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.acumatica_payments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.acumatica_project_budgets` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.acumatica_project_tasks` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.acumatica_projects` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.acumatica_purchase_orders` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.acumatica_subcontracts` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.admin_feedback_comments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.admin_feedback_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.admin_view_backups` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.ai_feedback_events` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.ai_learning_promotions` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.ai_memories` | 165 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.ai_retrieval_feedback` | 154 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.ai_retrieval_weights` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.ai_review_feedback` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.ai_task_feedback` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.ai_tool_write_audits` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.app_crawl_sessions` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.app_error_events` | 2 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.app_error_groups` | 2 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.app_pages` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.app_parity_checks` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.app_roles` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.app_schedule_bulk_operations` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.app_schedule_task_hierarchy` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.app_system_actions` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.app_system_states` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.app_ui_components` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.app_ui_table_columns` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.app_ui_tables` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.asrs_blocks` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.asrs_configurations` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.asrs_decision_matrix` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.asrs_logic_cards` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.asrs_protection_rules` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.asrs_sections` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.attachments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.billing_invitations` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.billing_periods` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.bot_debug_log` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.bot_user_mappings` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.briefing_runs` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.budget_changes` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.budget_forecast_line_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.budget_line_forecasts` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.budget_line_history` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.budget_line_item_history` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.budget_lines` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.budget_mod_lines` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.budget_modification_lines` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.budget_modifications` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.budget_snapshots` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.budget_view_columns` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.budget_views` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.cco_attachments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.change_event_approvals` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.change_event_attachments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.change_event_history` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.change_event_line_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.change_event_pco_links` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.change_event_related_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.change_event_rfq_responses` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.change_event_rfqs` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.change_events` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.change_events_summary` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.change_orders` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.change_workflow_comments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.change_workflow_notifications` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.chat_history` | 98 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.chat_messages` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.chat_sessions` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.chat_thread_feedback` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.chat_thread_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.chat_threads` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.code_examples` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.collaboration_comments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.collaboration_notifications` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.commitment_audit_log` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.commitment_change_order_lines` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.commitment_payments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.commitment_pcos` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.commitment_related_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.companies` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.company_context` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.contract_billing_periods` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.contract_change_orders` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.contract_line_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.contract_payments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.contract_snapshots` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.contract_views` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.conversations` | 2 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.cost_code_division_updates_audit` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.cost_code_divisions` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.cost_code_types` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.cost_codes` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.cost_factors` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.cost_forecasts` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.daily_log_equipment` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.daily_log_manpower` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.daily_log_notes` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.daily_logs` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.daily_logs_project_photos_links` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.daily_recaps` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.database_tables_catalog` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.design_recommendations` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.design_violations` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.dev_annotations` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.dev_panel_comments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.direct_cost_line_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.direct_costs` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.discrepancies` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.distribution_group_members` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.distribution_groups` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.drawing_areas` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.drawing_change_history` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.drawing_downloads` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.drawing_markup_pins` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.drawing_related_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.drawing_revisions` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.drawing_sets` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.drawing_sketches` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.drawings` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.drawings_rfis_links` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.estimate_allowances` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.estimate_alternates` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.estimate_line_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.estimates` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.execution_handoffs` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.executive_briefing_follow_ups` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.feature_request_events` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.feature_request_linear_events` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.feature_request_linear_sub_issues` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.feature_requests` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.files` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.financial_contracts` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.fm_blocks` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.fm_cost_factors` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.fm_form_submissions` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.fm_global_figures` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.fm_global_tables` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.fm_optimization_rules` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.fm_optimization_suggestions` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.fm_sections` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.fm_sprinkler_configs` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.fm_table_vectors` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.forecasting` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.forecasting_curves` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.graph_subscriptions` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.group_members` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.groups` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.implementation_plans` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.initiative_cards` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.initiatives` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.insight_card_evidence` | 11 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.insight_card_targets` | 11 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.insight_cards` | 11 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.inspections` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.intelligence_packet_cards` | 2,201 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.intelligence_packets` | 1 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.intelligence_reviews` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.intelligence_targets` | 1 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.invoice_attachments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.invoice_payments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.invoicing_settings` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.issues` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.marketing_content_assets` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.marketing_content_calendar_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.marketing_performance_snapshots` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.meeting_preps` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.meeting_segments` | 4 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.memories` | 1 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.messages` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.nods_page` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.nods_page_section` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.notes` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.observation_comments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.observation_history` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.observation_photos` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.observation_types` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.observations` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.observations_project_photos_links` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.optimization_rules` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.organization_members` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.organizations` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.owner_invoice_line_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.owner_invoices` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.parts` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.payment_application_line_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.payment_transactions` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.pcco_attachments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.pcco_line_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.pco_change_events` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.pco_line_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.pco_versions` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.people` | 1,080 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.permission_audit_log` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.permission_templates` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.person_company_templates` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.photo_albums` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.photo_links` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.photos` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.pipeline_config` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.potential_change_orders` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.prime_contract_change_order_related_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.prime_contract_change_orders` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.prime_contract_payment_applications` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.prime_contract_payments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.prime_contract_pco_attachments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.prime_contract_pcos` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.prime_contract_project_settings` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.prime_contract_sovs` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.prime_contracts` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.processing_queue` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.procore_capture_sessions` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.procore_components` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.procore_feature_implementations` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.procore_features` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.procore_modules` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.procore_pages` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.procore_screenshots` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.procore_tools` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.project_attribution_rules` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.project_briefings` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.project_budget_codes` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.project_budget_settings` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.project_companies` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.project_contact_references` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.project_directory_memberships` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.project_insights` | 27 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Small app-facing AI/chat/product table; not the current database pressure source. | Stays in original project. |
| `public.project_notification_groups` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.project_photos` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.project_photos_punch_items_links` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.project_progress_report_photos` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.project_progress_reports` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.project_risk_snapshots` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.project_role_members` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.project_roles` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.project_transmittals` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.project_vendors` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.projects` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.projects_audit` | 9 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.prospects` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.psr_comments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.punch_item_comments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.punch_item_template_categories` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.punch_item_templates` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.punch_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.purchase_order_attachments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.purchase_order_sov_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.purchase_orders` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.qa_page_audit` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.qto_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.qtos` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.recurring_issue_evidence` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.recurring_issue_projects` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.recurring_issues` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.requests` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.review_comments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.reviews` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.rfi_assignees` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.rfis` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.rfis_submittals_links` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.roadmap_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.schedule_deadlines` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.schedule_dependencies` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.schedule_of_values` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.schedule_tasks` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.sov_line_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.specification_area_sections` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.specification_areas` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.specification_divisions` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.specification_section_revisions` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.specification_sections` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.specification_subscribers` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.specifications` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.sub_jobs` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.subcontract_attachments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.subcontract_sov_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.subcontractor_contacts` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.subcontractor_invoice_audit_log` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.subcontractor_invoice_line_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.subcontractor_invoice_related_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.subcontractor_invoices` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.subcontractor_projects` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.subcontractor_sov_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.subcontractor_sov_submissions` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.subcontractors` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.subcontracts` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.submittal_analytics_events` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.submittal_attachments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.submittal_distribution_recipients` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.submittal_distributions` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.submittal_history` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.submittal_linked_drawings` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.submittal_notifications` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.submittal_packages` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.submittal_performance_metrics` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.submittal_responses` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.submittal_types` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.submittal_workflow_steps` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.submittal_workflow_templates` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.submittals` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.support_articles` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.system_alerts` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.table_metadata` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.task_comments` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.tasks` | 812 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.telegram_link_codes` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.test_cases` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.test_results` | 19 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.test_runs` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.test_screenshots` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.test_suites` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.timeline_events` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.timesheets` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.todos` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.tool_features` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.tool_form_fields` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.transmittal_items` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.user_directory_permissions` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.user_granular_permission_overrides` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.user_module_permissions` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.user_profiles` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.user_project_preferences` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.user_project_roles` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.user_projects` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.user_schedule_notifications` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.users_auth` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.vendor_contacts` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Operational application data. | Stays in original project. |
| `public.vertical_markup` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `public.workspace_artifacts` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |
| `realtime.messages` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `realtime.messages_2026_05_11` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `realtime.messages_2026_05_12` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `realtime.messages_2026_05_13` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `realtime.messages_2026_05_14` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `realtime.messages_2026_05_15` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `realtime.messages_2026_05_16` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `realtime.messages_2026_05_17` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `realtime.schema_migrations` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `realtime.subscription` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `storage.buckets` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `storage.buckets_analytics` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `storage.buckets_vectors` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `storage.migrations` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `storage.objects` | 15 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `storage.s3_multipart_uploads` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `storage.s3_multipart_uploads_parts` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `storage.vector_indexes` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `supabase_functions.hooks` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `supabase_functions.migrations` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `supabase_migrations.schema_migrations` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `supabase_migrations.seed_files` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `vault.secrets` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | Supabase-managed platform table; do not move to RAG project. | Managed by Supabase; intentionally not migrated. |
| `vecs.mem0_memories` | 0 | Keep original | Original Supabase app DB (lgveqfnpkxvzbnnwuled) | N/A | No RAG ownership identified. | Stays in original project. |

## Immediate Blockers Before Cron Resume

1. Done: backend readers/writers for the migrated job/candidate/health tables now use RAG clients.
2. Done: frontend/admin/assistant health surfaces checked in this pass now use RAG clients for moved job/candidate/health tables.
3. Done: checked source-specific consumers no longer select `document_metadata.content` / `raw_text` from the app DB; full text hydrates from `rag_document_metadata`.
4. Done: source-specific RAG and assistant operational readiness guardrails pass against the current implementation boundary.
5. Done: live Render cron env vars now include RAG read/write flags and bounded Graph delta/user/folder caps for Graph, Teams channel, and Teams DM sync jobs.
6. Remaining: deploy the code-level Graph delta cap changes, then resume Render crons one at a time with a live DB check after each run.

## Latest Verification Evidence

2026-05-14T18:19:46Z:

- `copy-document-metadata-to-rag.mjs`: copied `36,657 / 36,657`.
- `copy-ai-source-tables-to-rag.mjs`: copied `document_attribution_candidates=13,204`, `fireflies_ingestion_jobs=27,241`, `ingestion_dead_letter=17`, `ingestion_jobs=436`, `packet_refresh_jobs=1,540`, `rag_pipeline_state=1`, `source_intelligence_jobs=11,087`, `source_signal_candidates=7,538`, `source_sync_health_snapshots=330`, `source_sync_runs=3,670`.
- Independent count check: all copied app/RAG pairs above have `delta=0`.
- `document_chunks`: app DB has `103,955`; RAG DB has `106,827`. RAG is canonical for chunks and intentionally has more current rows than the app DB.
- Verification delegated to subagent: Python compile passed; `cd frontend && npm run typecheck -- --pretty false` passed; raw `npx tsc --noEmit --pretty false` failed only due Node heap OOM, not TypeScript diagnostics.
- Follow-up verification in this pass: broad `document_metadata.select("*")` reads were removed from checked pipeline/helper paths; Python compile and `cd frontend && npm run typecheck -- --pretty false` passed.
- Guardrail added and passing: `npm run rag:verify:metadata-boundary`.

2026-05-14T18:44:17Z:

- `npm run verify:live-db-incident`: PASS. App DB, pooler, and REST are `ACTIVE_HEALTHY`; high-risk Render crons remain suspended; connection count was 31.
- `npm run rag:verify:source-specific`: PASS after updating the verifier to follow the current `chat-handler.ts` / retrieval module boundary.
- `npm run rag:verify:assistant-operational-readiness`: PASS in delegated verification, 53/53 checks.
- `cd frontend && npm run typecheck -- --pretty false`: PASS in delegated verification.
- `node -r dotenv/config scripts/verify/verify-render-web-scheduler-disabled.mjs`: PASS after live Render env caps were added through the Render API.
