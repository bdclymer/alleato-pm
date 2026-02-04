-- Fix: FOR UPDATE is not allowed with aggregate functions (MAX)
-- Root cause: The original create_specification_revision function used
-- FOR UPDATE OF specification_section_revisions on a query with MAX() aggregate.
-- PostgreSQL forbids FOR UPDATE with aggregate functions.
-- Solution: Lock the parent section row first, then aggregate safely.

CREATE OR REPLACE FUNCTION create_specification_revision(
    p_section_id BIGINT,
    p_file_url TEXT,
    p_file_name VARCHAR(255),
    p_file_size BIGINT,
    p_file_type VARCHAR(100),
    p_uploaded_by UUID,
    p_notes TEXT DEFAULT NULL,
    p_content TEXT DEFAULT NULL
) RETURNS specification_section_revisions AS $$
DECLARE
    v_next_revision_number INTEGER;
    v_new_revision specification_section_revisions;
BEGIN
    -- Lock the parent section row to prevent concurrent revision creation
    PERFORM 1 FROM specification_sections WHERE id = p_section_id FOR UPDATE;

    -- Now safely get next revision number (no FOR UPDATE on aggregate)
    SELECT COALESCE(MAX(revision_number), 0) + 1
    INTO v_next_revision_number
    FROM specification_section_revisions
    WHERE section_id = p_section_id;

    -- Insert new revision
    INSERT INTO specification_section_revisions (
        section_id,
        revision_number,
        file_url,
        file_name,
        file_size,
        file_type,
        uploaded_by,
        notes,
        content
    )
    VALUES (
        p_section_id,
        v_next_revision_number,
        p_file_url,
        p_file_name,
        p_file_size,
        p_file_type,
        p_uploaded_by,
        p_notes,
        p_content
    )
    RETURNING * INTO v_new_revision;

    -- Update section's current_revision_id to point to new revision
    UPDATE specification_sections
    SET
        current_revision_id = v_new_revision.id,
        updated_at = NOW()
    WHERE id = p_section_id;

    RETURN v_new_revision;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
