-- Migration: Create change_order_attachments table
-- Purpose: Enable file attachments for change orders
-- References: Follows same pattern as change_event_attachments

CREATE TABLE IF NOT EXISTS public.change_order_attachments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    change_order_id bigint NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,
    file_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    file_size bigint NOT NULL,
    mime_type character varying(100) NOT NULL,
    uploaded_by uuid REFERENCES auth.users(id),
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 52428800) -- Max 50MB
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_change_order_attachments_change_order_id
    ON public.change_order_attachments(change_order_id);
CREATE INDEX IF NOT EXISTS idx_change_order_attachments_uploaded_by
    ON public.change_order_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_change_order_attachments_uploaded_at
    ON public.change_order_attachments(uploaded_at DESC);

-- Add Row Level Security (RLS) policies
ALTER TABLE public.change_order_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view attachments for change orders in their projects
CREATE POLICY "Users can view change order attachments in their projects"
    ON public.change_order_attachments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM change_orders co
            INNER JOIN project_access pa ON pa.project_id = co.project_id
            WHERE co.id = change_order_attachments.change_order_id
            AND pa.user_id = auth.uid()
        )
    );

-- Policy: Users can upload attachments to change orders in their projects
CREATE POLICY "Users can upload change order attachments in their projects"
    ON public.change_order_attachments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM change_orders co
            INNER JOIN project_access pa ON pa.project_id = co.project_id
            WHERE co.id = change_order_attachments.change_order_id
            AND pa.user_id = auth.uid()
        )
    );

-- Policy: Users can delete attachments they uploaded or if they have project access
CREATE POLICY "Users can delete their own change order attachments or with project access"
    ON public.change_order_attachments
    FOR DELETE
    USING (
        uploaded_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM change_orders co
            INNER JOIN project_access pa ON pa.project_id = co.project_id
            WHERE co.id = change_order_attachments.change_order_id
            AND pa.user_id = auth.uid()
            AND pa.role IN ('owner', 'admin', 'manager')
        )
    );

-- Add comment
COMMENT ON TABLE public.change_order_attachments IS 'File attachments for change orders (PDFs, images, documents, etc.)';
