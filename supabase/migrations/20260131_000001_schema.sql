--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- CREATE SCHEMA public; -- Schema already exists


--
-- Name: billing_period_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.billing_period_status AS ENUM (
    'open',
    'closed',
    'approved'
);


--
-- Name: budget_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.budget_status AS ENUM (
    'locked',
    'unlocked'
);


--
-- Name: calculation_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.calculation_method AS ENUM (
    'unit_price',
    'lump_sum',
    'percentage'
);


--
-- Name: change_event_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.change_event_status AS ENUM (
    'open',
    'closed'
);


--
-- Name: change_order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.change_order_status AS ENUM (
    'draft',
    'pending',
    'approved',
    'void'
);


--
-- Name: commitment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.commitment_type AS ENUM (
    'subcontract',
    'purchase_order',
    'service_order'
);


--
-- Name: company_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.company_type AS ENUM (
    'vendor',
    'subcontractor',
    'owner',
    'architect',
    'other'
);


--
-- Name: contract_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.contract_status AS ENUM (
    'draft',
    'pending',
    'executed',
    'closed',
    'terminated'
);


--
-- Name: contract_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.contract_type AS ENUM (
    'prime_contract',
    'commitment'
);


--
-- Name: erp_sync_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.erp_sync_status AS ENUM (
    'pending',
    'synced',
    'failed',
    'resyncing'
);


--
-- Name: invoice_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoice_status AS ENUM (
    'draft',
    'pending',
    'approved',
    'paid',
    'void'
);


--
-- Name: issue_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.issue_category AS ENUM (
    'Design',
    'Submittal',
    'Scheduling',
    'Procurement',
    'Installation',
    'Safety',
    'Change Order',
    'Other'
);


--
-- Name: issue_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.issue_severity AS ENUM (
    'Low',
    'Medium',
    'High',
    'Critical'
);


--
-- Name: issue_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.issue_status AS ENUM (
    'Open',
    'In Progress',
    'Resolved',
    'Pending Verification'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'received',
    'void'
);


--
-- Name: prime_contract_co_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.prime_contract_co_status AS ENUM (
    'draft',
    'pending',
    'approved',
    'rejected',
    'void'
);


--
-- Name: prime_contract_sov_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.prime_contract_sov_status AS ENUM (
    'draft',
    'approved',
    'locked'
);


--
-- Name: prime_contract_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.prime_contract_status AS ENUM (
    'draft',
    'approved',
    'complete',
    'void',
    'closed',
    'not_ready'
);


--
-- Name: prime_contract_status_v2; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.prime_contract_status_v2 AS ENUM (
    'draft',
    'out_for_bid',
    'out_for_signature',
    'approved',
    'complete',
    'terminated'
);


--
-- Name: project_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_status AS ENUM (
    'active',
    'inactive',
    'complete'
);


--
-- Name: task_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_status AS ENUM (
    'todo',
    'doing',
    'review',
    'done'
);


--
-- Name: _ai_insights_counts_trigger_fn(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._ai_insights_counts_trigger_fn() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.documents SET ai_insights_count = ai_insights_count + 1 WHERE id = NEW.document_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.documents SET ai_insights_count = GREATEST(ai_insights_count - 1, 0) WHERE id = OLD.document_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.document_id IS DISTINCT FROM OLD.document_id THEN
      UPDATE public.documents SET ai_insights_count = GREATEST(ai_insights_count - 1, 0) WHERE id = OLD.document_id;
      UPDATE public.documents SET ai_insights_count = ai_insights_count + 1 WHERE id = NEW.document_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: add_meeting_participants_to_contacts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_meeting_participants_to_contacts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    participant TEXT;
    first_name TEXT;
    last_name TEXT;
    processed_emails TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Exit early if no participants
    IF NEW.participants IS NULL OR array_length(NEW.participants, 1) = 0 THEN
        RETURN NEW;
    END IF;

    -- Iterate through each participant
    FOREACH participant IN ARRAY NEW.participants
    LOOP
        -- Skip if email already processed
        IF participant = ANY(processed_emails) THEN
            CONTINUE;
        END IF;

        -- Extract first and last names from email
        SELECT ex.first_name, ex.last_name 
        INTO first_name, last_name 
        FROM email_to_names(participant) ex;

        -- Insert contact if not exists, ignoring duplicates
        INSERT INTO contacts (first_name, last_name, email)
        VALUES (first_name, last_name, participant)
        ON CONFLICT (email) DO NOTHING;

        -- Track processed emails
        processed_emails := array_append(processed_emails, participant);
    END LOOP;

    RETURN NEW;
END;
$$;


--
-- Name: ai_insights_exact_quotes_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ai_insights_exact_quotes_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN NEW.exact_quotes_text := public.normalize_exact_quotes(NEW.exact_quotes::jsonb); RETURN NEW; END; $$;


--
-- Name: archive_task(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.archive_task(task_id_param uuid, archived_by_param text DEFAULT 'system'::text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    task_exists BOOLEAN;
BEGIN
    -- Check if task exists and is not already archived
    SELECT EXISTS(
        SELECT 1 FROM archon_tasks
        WHERE id = task_id_param AND archived = FALSE
    ) INTO task_exists;

    IF NOT task_exists THEN
        RETURN FALSE;
    END IF;

    -- Archive the task
    UPDATE archon_tasks
    SET
        archived = TRUE,
        archived_at = NOW(),
        archived_by = archived_by_param,
        updated_at = NOW()
    WHERE id = task_id_param;

    -- Also archive all subtasks
    UPDATE archon_tasks
    SET
        archived = TRUE,
        archived_at = NOW(),
        archived_by = archived_by_param,
        updated_at = NOW()
    WHERE parent_task_id = task_id_param AND archived = FALSE;

    RETURN TRUE;
END;
$$;


--
-- Name: assign_meeting_project_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_meeting_project_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Check for different keywords in the title and assign appropriate project_id
  IF NEW.title ILIKE '%Niemann%' THEN
    NEW.project_id := 38;
  ELSIF NEW.title ILIKE '%Uniqlo%' THEN
    NEW.project_id := 31;
  ELSIF NEW.title ILIKE '%Goodwill Bloomington%' THEN
    NEW.project_id := 47;
  ELSIF NEW.title ILIKE '%Westfield%' THEN
    NEW.project_id := 43;
  -- Add more conditions as needed
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: auto_archive_old_chats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_archive_old_chats() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    UPDATE chats
    SET is_archived = TRUE
    WHERE NOT is_archived
    AND last_message_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$;


--
-- Name: backfill_meeting_participants_to_contacts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.backfill_meeting_participants_to_contacts() RETURNS TABLE(total_contacts_added integer, unique_emails text[])
    LANGUAGE plpgsql
    AS $$
DECLARE
    participant TEXT;
    first_name TEXT;
    last_name TEXT;
    processed_emails TEXT[] := ARRAY[]::TEXT[];
    total_added INTEGER := 0;
    meeting_rec RECORD;
BEGIN
    -- Loop through all existing meetings with participants
    FOR meeting_rec IN 
        SELECT id, participants 
        FROM meetings 
        WHERE participants IS NOT NULL AND array_length(participants, 1) > 0
    LOOP
        -- Iterate through each participant in the meeting
        FOREACH participant IN ARRAY meeting_rec.participants
        LOOP
            -- Skip if email already processed
            IF participant = ANY(processed_emails) THEN
                CONTINUE;
            END IF;

            -- Extract first and last names from email
            SELECT ex.first_name, ex.last_name 
            INTO first_name, last_name 
            FROM email_to_names(participant) ex;

            -- Insert contact if not exists, ignoring duplicates
            INSERT INTO contacts (first_name, last_name, email)
            VALUES (first_name, last_name, participant)
            ON CONFLICT (email) DO NOTHING;

            -- Track processed emails and increment counter
            processed_emails := array_append(processed_emails, participant);
            total_added := total_added + 1;
        END LOOP;
    END LOOP;

    RETURN QUERY SELECT total_added, processed_emails;
END;
$$;


--
-- Name: batch_update_project_assignments(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.batch_update_project_assignments(p_assignments jsonb) RETURNS TABLE(document_id text, success boolean, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  assignment JSONB;
  doc_id TEXT;
  proj_id BIGINT;
  confidence_val NUMERIC;
  reasoning_val TEXT;
  update_success BOOLEAN;
BEGIN
  -- Process each assignment
  FOR assignment IN SELECT jsonb_array_elements(p_assignments)
  LOOP
    BEGIN
      -- Extract values from JSON
      doc_id := (assignment->>'document_id')::TEXT;
      proj_id := (assignment->>'project_id')::BIGINT;
      confidence_val := (assignment->>'confidence')::NUMERIC;
      reasoning_val := assignment->>'reasoning';
      
      -- Attempt the update
      SELECT update_document_project_assignment(
        doc_id, 
        proj_id, 
        confidence_val, 
        reasoning_val
      ) INTO update_success;
      
      RETURN QUERY SELECT doc_id, update_success, NULL::TEXT;
      
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT doc_id, FALSE, SQLERRM;
    END;
  END LOOP;
END;
$$;


--
-- Name: clone_budget_view(uuid, character varying, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clone_budget_view(source_view_id uuid, new_name character varying, new_description text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_new_view_id UUID;
  v_project_id INTEGER;
BEGIN
  -- Get the project ID from the source view
  SELECT project_id INTO v_project_id
  FROM budget_views
  WHERE id = source_view_id;

  -- Create the new view
  INSERT INTO budget_views (project_id, name, description, is_default, is_system)
  SELECT project_id, new_name, COALESCE(new_description, description), FALSE, FALSE
  FROM budget_views
  WHERE id = source_view_id
  RETURNING id INTO v_new_view_id;

  -- Clone all columns
  INSERT INTO budget_view_columns (view_id, column_key, display_name, display_order, width, is_visible, is_locked)
  SELECT v_new_view_id, column_key, display_name, display_order, width, is_visible, is_locked
  FROM budget_view_columns
  WHERE view_id = source_view_id;

  RETURN v_new_view_id;
END;
$$;


--
-- Name: compare_budget_snapshots(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compare_budget_snapshots(p_snapshot_id_1 uuid, p_snapshot_id_2 uuid) RETURNS TABLE(budget_code_id uuid, cost_code_id text, cost_code_description text, original_budget_1 numeric, revised_budget_1 numeric, projected_costs_1 numeric, projected_over_under_1 numeric, original_budget_2 numeric, revised_budget_2 numeric, projected_costs_2 numeric, projected_over_under_2 numeric, delta_original_budget numeric, delta_revised_budget numeric, delta_projected_costs numeric, delta_projected_over_under numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH
    snapshot1_items AS (
        SELECT
            (item->>'budget_code_id')::UUID as budget_code_id,
            item->>'cost_code_id' as cost_code_id,
            item->>'cost_code_description' as cost_code_description,
            (item->>'original_budget_amount')::NUMERIC(15,2) as original_budget,
            (item->>'revised_budget')::NUMERIC(15,2) as revised_budget,
            (item->>'projected_costs')::NUMERIC(15,2) as projected_costs,
            (item->>'projected_over_under')::NUMERIC(15,2) as projected_over_under
        FROM budget_snapshots bs,
             jsonb_array_elements(bs.line_items) as item
        WHERE bs.id = p_snapshot_id_1
    ),
    snapshot2_items AS (
        SELECT
            (item->>'budget_code_id')::UUID as budget_code_id,
            item->>'cost_code_id' as cost_code_id,
            item->>'cost_code_description' as cost_code_description,
            (item->>'original_budget_amount')::NUMERIC(15,2) as original_budget,
            (item->>'revised_budget')::NUMERIC(15,2) as revised_budget,
            (item->>'projected_costs')::NUMERIC(15,2) as projected_costs,
            (item->>'projected_over_under')::NUMERIC(15,2) as projected_over_under
        FROM budget_snapshots bs,
             jsonb_array_elements(bs.line_items) as item
        WHERE bs.id = p_snapshot_id_2
    )
    SELECT
        COALESCE(s1.budget_code_id, s2.budget_code_id) as budget_code_id,
        COALESCE(s1.cost_code_id, s2.cost_code_id) as cost_code_id,
        COALESCE(s1.cost_code_description, s2.cost_code_description) as cost_code_description,

        COALESCE(s1.original_budget, 0) as original_budget_1,
        COALESCE(s1.revised_budget, 0) as revised_budget_1,
        COALESCE(s1.projected_costs, 0) as projected_costs_1,
        COALESCE(s1.projected_over_under, 0) as projected_over_under_1,

        COALESCE(s2.original_budget, 0) as original_budget_2,
        COALESCE(s2.revised_budget, 0) as revised_budget_2,
        COALESCE(s2.projected_costs, 0) as projected_costs_2,
        COALESCE(s2.projected_over_under, 0) as projected_over_under_2,

        COALESCE(s2.original_budget, 0) - COALESCE(s1.original_budget, 0) as delta_original_budget,
        COALESCE(s2.revised_budget, 0) - COALESCE(s1.revised_budget, 0) as delta_revised_budget,
        COALESCE(s2.projected_costs, 0) - COALESCE(s1.projected_costs, 0) as delta_projected_costs,
        COALESCE(s2.projected_over_under, 0) - COALESCE(s1.projected_over_under, 0) as delta_projected_over_under
    FROM snapshot1_items s1
    FULL OUTER JOIN snapshot2_items s2 ON s1.budget_code_id = s2.budget_code_id;
END;
$$;


--
-- Name: convert_embeddings_to_vector(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.convert_embeddings_to_vector() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT id, embedding FROM meeting_embeddings WHERE embedding_vector IS NULL
    LOOP
        -- This assumes embeddings are stored as JSON arrays in string format
        -- Adjust based on your actual format
        BEGIN
            UPDATE meeting_embeddings 
            SET embedding_vector = embedding::vector(1536)
            WHERE id = rec.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to convert embedding for id %: %', rec.id, SQLERRM;
        END;
    END LOOP;
END;
$$;


--
-- Name: create_budget_snapshot(bigint, character varying, character varying, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_budget_snapshot(p_project_id bigint, p_snapshot_name character varying, p_snapshot_type character varying DEFAULT 'manual'::character varying, p_description text DEFAULT NULL::text, p_is_baseline boolean DEFAULT false) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_snapshot_id UUID;
    v_line_items JSONB;
    v_grand_totals JSONB;
    v_project_metadata JSONB;
    v_user_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();

    -- Refresh materialized view first to ensure accuracy
    PERFORM refresh_budget_rollup(p_project_id);

    -- Get line items from view
    SELECT jsonb_agg(row_to_json(br)::jsonb)
    INTO v_line_items
    FROM v_budget_rollup br
    WHERE br.project_id = p_project_id;

    -- Get grand totals from view
    SELECT row_to_json(gt)::jsonb
    INTO v_grand_totals
    FROM v_budget_grand_totals gt
    WHERE gt.project_id = p_project_id;

    -- Get project metadata
    SELECT jsonb_build_object(
        'name', p.name,
        'code', p.code,
        'status', p.status,
        'start_date', p.start_date,
        'end_date', p.end_date
    )
    INTO v_project_metadata
    FROM projects p
    WHERE p.id = p_project_id;

    -- Insert snapshot
    INSERT INTO budget_snapshots (
        project_id,
        snapshot_name,
        snapshot_type,
        description,
        line_items,
        grand_totals,
        project_metadata,
        is_baseline,
        created_by
    ) VALUES (
        p_project_id,
        p_snapshot_name,
        p_snapshot_type,
        p_description,
        v_line_items,
        v_grand_totals,
        v_project_metadata,
        p_is_baseline,
        v_user_id
    )
    RETURNING id INTO v_snapshot_id;

    RETURN v_snapshot_id;
END;
$$;


--
-- Name: create_conversation_with_message(text, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_conversation_with_message(p_title text, p_agent_type text, p_role text, p_content text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_conversation_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Create the conversation
  INSERT INTO conversations (title, agent_type, user_id, metadata)
  VALUES (p_title, p_agent_type, v_user_id, p_metadata)
  RETURNING id INTO v_conversation_id;
  
  -- Add the initial message
  INSERT INTO conversation_history (conversation_id, role, content, user_id, metadata)
  VALUES (v_conversation_id, p_role, p_content, v_user_id, p_metadata);
  
  RETURN v_conversation_id;
END;
$$;


--
-- Name: create_default_project_roles(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_project_roles() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO project_roles (project_id, role_name, display_order)
  VALUES
    (NEW.id, 'Architect', 1),
    (NEW.id, 'Project Manager', 2),
    (NEW.id, 'Superintendent', 3)
  ON CONFLICT (project_id, role_name) DO NOTHING;

  RETURN NEW;
END;
$$;


--
-- Name: document_metadata_set_category(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.document_metadata_set_category() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- default to leaving category NULL
    NEW.category := NULL;

    IF NEW.title IS NOT NULL THEN
      -- case-insensitive checks
      IF NEW.title ILIKE '%executive weekly meeting%' THEN
        NEW.category := 'Weekly Exec';
      ELSIF NEW.title ILIKE '%weekly ops%' THEN
        NEW.category := 'Weekly Ops';
      ELSIF NEW.title ILIKE '%weekly update%' THEN
        NEW.category := 'Ops Update';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: email_to_names(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.email_to_names(email text) RETURNS TABLE(first_name text, last_name text)
    LANGUAGE plpgsql
    AS $_$
DECLARE
    username TEXT;
    name_parts TEXT[];
BEGIN
    -- Extract username part of email (before @)
    username := split_part(email, '@', 1);
    
    -- Special handling for common email formats
    name_parts := 
        CASE 
            WHEN username ~ '^[a-z][a-z]+[0-9]*$' THEN 
                ARRAY[username]
            WHEN username ~ '^[a-z][\._-][a-z]+$' THEN 
                regexp_split_to_array(username, '[._-]')
            ELSE 
                ARRAY[username]
        END;
    
    -- Handling different name parsing scenarios
    RETURN QUERY 
    SELECT 
        CASE 
            WHEN array_length(name_parts, 1) = 1 THEN initcap(name_parts[1])
            ELSE initcap(name_parts[1]) 
        END AS first_name,
        CASE 
            WHEN array_length(name_parts, 1) > 1 THEN initcap(name_parts[array_length(name_parts, 1)])
            ELSE NULL 
        END AS last_name;
END;
$_$;


--
-- Name: enhanced_match_chunks(public.vector, integer, integer, timestamp without time zone, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enhanced_match_chunks(query_embedding public.vector, match_count integer DEFAULT 10, project_filter integer DEFAULT NULL::integer, date_after timestamp without time zone DEFAULT NULL::timestamp without time zone, doc_type_filter text DEFAULT NULL::text) RETURNS TABLE(chunk_id uuid, document_id uuid, content text, similarity double precision, metadata jsonb, document_title text, document_source text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id AS chunk_id,
        c.document_id,
        c.content,
        1 - (c.embedding <=> query_embedding) AS similarity,
        c.metadata,
        d.title AS document_title,
        d.source AS document_source,
        d.created_at
    FROM chunks c
    JOIN documents d ON c.document_id = d.id
    WHERE c.embedding IS NOT NULL
        AND (project_filter IS NULL OR d.project_id = project_filter)
        AND (date_after IS NULL OR d.created_at >= date_after)
        AND (doc_type_filter IS NULL OR d.document_type = doc_type_filter)
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


--
-- Name: ensure_single_default_view(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_single_default_view() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    -- Unset other default views for this project
    UPDATE budget_views
    SET is_default = FALSE
    WHERE project_id = NEW.project_id
      AND id != NEW.id
      AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: execute_custom_sql(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.execute_custom_sql(sql_query text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  result JSONB;
BEGIN
  -- Execute the SQL and capture the result
  EXECUTE 'SELECT jsonb_agg(t) FROM (' || sql_query || ') t' INTO result;
  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;


--
-- Name: extract_names(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.extract_names(participant text) RETURNS TABLE(first_name text, last_name text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    name_parts TEXT[];
BEGIN
    -- Split the participant name into parts
    name_parts := string_to_array(participant, ' ');
    
    -- If only one name is provided, use it as first name
    IF array_length(name_parts, 1) = 1 THEN
        RETURN QUERY SELECT participant, NULL::TEXT;
    -- If two names, first is first name, second is last name
    ELSIF array_length(name_parts, 1) = 2 THEN
        RETURN QUERY SELECT name_parts[1], name_parts[2];
    -- If more than two names, first is first name, last is last name
    ELSE
        RETURN QUERY SELECT name_parts[1], name_parts[array_length(name_parts, 1)];
    END IF;
END;
$$;


--
-- Name: find_duplicate_insights(numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_duplicate_insights(p_similarity_threshold numeric DEFAULT 0.8) RETURNS TABLE(insight1_id bigint, insight2_id bigint, title1 text, title2 text, similarity_score numeric, same_project boolean, same_document boolean)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  WITH insight_pairs AS (
    SELECT 
      ai1.id as id1,
      ai2.id as id2,
      ai1.title as title1,
      ai2.title as title2,
      ai1.project_id as project1,
      ai2.project_id as project2,
      ai1.document_id as doc1,
      ai2.document_id as doc2,
      -- Simple similarity based on title and description overlap
      (
        (CASE WHEN ai1.title = ai2.title THEN 0.5 ELSE 0 END) +
        (CASE WHEN ai1.description = ai2.description THEN 0.4 ELSE 0 END) +
        (CASE WHEN ai1.insight_type = ai2.insight_type THEN 0.1 ELSE 0 END)
      ) as similarity
    FROM ai_insights ai1
    CROSS JOIN ai_insights ai2
    WHERE ai1.id < ai2.id  -- Avoid duplicate pairs
      AND ai1.created_at >= NOW() - INTERVAL '30 days'
      AND ai2.created_at >= NOW() - INTERVAL '30 days'
  )
  SELECT 
    ip.id1,
    ip.id2,
    ip.title1,
    ip.title2,
    ip.similarity,
    (ip.project1 = ip.project2),
    (ip.doc1 = ip.doc2)
  FROM insight_pairs ip
  WHERE ip.similarity >= p_similarity_threshold
  ORDER BY ip.similarity DESC, ip.id1, ip.id2;
END;
$$;


--
-- Name: find_sprinkler_requirements(text, text, numeric, text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_sprinkler_requirements(p_asrs_type text DEFAULT NULL::text, p_system_type text DEFAULT NULL::text, p_ceiling_height_ft numeric DEFAULT NULL::numeric, p_commodity_class text DEFAULT NULL::text, p_tolerance_ft numeric DEFAULT 5) RETURNS TABLE(table_id text, table_number integer, title text, sprinkler_count integer, k_factor numeric, pressure_psi numeric, special_conditions text[], height_match_type text)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    fmt.table_id,
    fmt.table_number,
    fmt.title,
    fsc.sprinkler_count,
    fsc.k_factor,
    fsc.pressure_psi,
    fsc.special_conditions,
    CASE 
      WHEN ABS(fsc.ceiling_height_ft - p_ceiling_height_ft) <= p_tolerance_ft THEN 'exact'
      ELSE 'interpolated'
    END as height_match_type
  FROM fm_global_tables fmt
  JOIN fm_sprinkler_configs fsc ON fmt.table_id = fsc.table_id
  WHERE 
    (p_asrs_type IS NULL OR fmt.asrs_type = p_asrs_type)
    AND (p_system_type IS NULL OR fmt.system_type = p_system_type OR fmt.system_type = 'both')
    AND (p_ceiling_height_ft IS NULL OR 
         (fsc.ceiling_height_ft BETWEEN p_ceiling_height_ft - p_tolerance_ft 
                                   AND p_ceiling_height_ft + p_tolerance_ft))
    AND (p_commodity_class IS NULL OR p_commodity_class = ANY(fmt.commodity_types))
  ORDER BY 
    ABS(fsc.ceiling_height_ft - COALESCE(p_ceiling_height_ft, fsc.ceiling_height_ft)),
    fmt.table_number;
END;
$$;


--
-- Name: find_sprinkler_requirements(character varying, character varying, integer, character varying, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_sprinkler_requirements(p_asrs_type character varying DEFAULT NULL::character varying, p_system_type character varying DEFAULT NULL::character varying, p_ceiling_height_ft integer DEFAULT NULL::integer, p_commodity_class character varying DEFAULT NULL::character varying, p_k_factor numeric DEFAULT NULL::numeric) RETURNS TABLE(table_id character varying, table_number integer, title text, ceiling_height_ft integer, k_factor numeric, k_type character varying, sprinkler_count integer, pressure_psi numeric, pressure_bar numeric, sprinkler_orientation character varying, sprinkler_response character varying, special_conditions text[])
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_id,
        t.table_number,
        t.title,
        t.ceiling_height_ft,
        t.k_factor,
        t.k_type,
        t.sprinkler_count,
        t.pressure_psi,
        t.pressure_bar,
        t.sprinkler_orientation,
        t.sprinkler_response,
        t.special_conditions
    FROM fm_global_tables t
    WHERE 
        (p_asrs_type IS NULL OR t.asrs_type = p_asrs_type)
        AND (p_system_type IS NULL OR t.system_type = p_system_type)
        AND (p_ceiling_height_ft IS NULL OR t.ceiling_height_ft = p_ceiling_height_ft)
        AND (p_commodity_class IS NULL OR p_commodity_class = ANY(t.commodity_classes))
        AND (p_k_factor IS NULL OR t.k_factor = p_k_factor)
        AND t.sprinkler_count IS NOT NULL
    ORDER BY t.table_number, t.ceiling_height_ft, t.k_factor;
END;
$$;


--
-- Name: fn_log_projects_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_log_projects_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_changed_cols text[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_changed_cols = array(SELECT jsonb_object_keys(to_jsonb(NEW))::text);
    INSERT INTO public.projects_audit(project_id, operation, changed_by, changed_at, changed_columns, old_data, new_data, metadata)
    VALUES (NEW.id, 'INSERT', NULL, now(), v_changed_cols, NULL, to_jsonb(NEW), jsonb_build_object('tg_table', TG_TABLE_NAME));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- determine changed columns by comparing OLD and NEW
    SELECT array_agg(key) INTO v_changed_cols
    FROM (
      SELECT key
      FROM jsonb_each_text(to_jsonb(NEW))
      WHERE (to_jsonb(OLD) ->> key) IS DISTINCT FROM (to_jsonb(NEW) ->> key)
      ) s(key);

    INSERT INTO public.projects_audit(project_id, operation, changed_by, changed_at, changed_columns, old_data, new_data, metadata)
    VALUES (COALESCE(NEW.id, OLD.id), 'UPDATE', NULL, now(), v_changed_cols, to_jsonb(OLD), to_jsonb(NEW), jsonb_build_object('tg_table', TG_TABLE_NAME));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_changed_cols = array(SELECT jsonb_object_keys(to_jsonb(OLD))::text);
    INSERT INTO public.projects_audit(project_id, operation, changed_by, changed_at, changed_columns, old_data, new_data, metadata)
    VALUES (OLD.id, 'DELETE', NULL, now(), v_changed_cols, to_jsonb(OLD), NULL, jsonb_build_object('tg_table', TG_TABLE_NAME));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: fn_propagate_division_title_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_propagate_division_title_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_old text;
  v_new text;
  v_updated int;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_old := OLD.title;
    v_new := NEW.title;
    IF v_old IS DISTINCT FROM v_new THEN
      UPDATE public.cost_codes
      SET division_title = v_new
      WHERE division_id = NEW.id;

      GET DIAGNOSTICS v_updated = ROW_COUNT;

      INSERT INTO public.cost_code_division_updates_audit(division_id, new_title, updated_count)
      VALUES (NEW.id, v_new, v_updated);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: fn_sync_cost_code_division_title(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_sync_cost_code_division_title() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_title text;
BEGIN
  -- If no division_id, clear the division_title
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.division_id IS NULL THEN
      NEW.division_title := NULL;
      RETURN NEW;
    END IF;

    SELECT title INTO v_title FROM public.cost_code_divisions WHERE id = NEW.division_id;
    NEW.division_title := v_title;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: full_text_search_meetings(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.full_text_search_meetings(search_query text, match_count integer DEFAULT 5) RETURNS TABLE(id text, title text, content text, participants text, date timestamp without time zone, category text, rank real)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dm.id,
    dm.title,
    dm.content,
    dm.participants,
    dm.date,
    dm.category,
    ts_rank(to_tsvector('english', COALESCE(dm.content, '') || ' ' || COALESCE(dm.title, '')), 
            plainto_tsquery('english', search_query)) as rank
  FROM document_metadata dm
  WHERE type = 'meeting_transcript'
    AND (to_tsvector('english', COALESCE(dm.content, '') || ' ' || COALESCE(dm.title, '')) 
         @@ plainto_tsquery('english', search_query))
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;


--
-- Name: generate_contract_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_contract_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    -- Get next number for this project
    SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM '\d+') AS INTEGER)), 0) + 1
    INTO NEW.contract_number
    FROM public.subcontracts
    WHERE project_id = NEW.project_id
      AND contract_number ~ '^SC-\d+$';

    NEW.contract_number := 'SC-' || LPAD(NEW.contract_number::TEXT, 3, '0');
  END IF;

  RETURN NEW;
END;
$_$;


--
-- Name: generate_optimization_recommendations(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_optimization_recommendations(project_data jsonb) RETURNS TABLE(recommendation text, savings_potential numeric, priority character varying, implementation_effort character varying, technical_details jsonb)
    LANGUAGE plpgsql
    AS $$
DECLARE
    storage_height DECIMAL;
    container_type TEXT;
    asrs_type TEXT;
    system_type TEXT;
    rack_row_depth DECIMAL;
    commodity_class TEXT;
BEGIN
    -- Extract key parameters from project_data
    storage_height := COALESCE((project_data->>'storage_height_ft')::DECIMAL, 0);
    container_type := project_data->>'container_type';
    asrs_type := project_data->>'asrs_type';
    system_type := project_data->>'system_type';
    rack_row_depth := COALESCE((project_data->>'rack_row_depth_ft')::DECIMAL, 0);
    commodity_class := project_data->>'commodity_class';
    
    -- Rule 1: Critical Height Threshold (20 ft)
    IF storage_height > 20 THEN
        RETURN QUERY SELECT 
            'CRITICAL: Reduce storage height to ≤20 ft to avoid enhanced protection requirements. This eliminates need for higher pressure sprinklers and additional in-rack protection.'::TEXT,
            125000.00::DECIMAL,
            'Critical'::VARCHAR,
            'Moderate'::VARCHAR,
            jsonb_build_object(
                'current_height', storage_height,
                'recommended_height', 20,
                'protection_reduction', 'Enhanced ceiling protection avoided',
                'table_reference', 'Multiple tables have 20ft thresholds'
            );
    END IF;
    
    -- Rule 2: Container Type Optimization (Biggest Impact)
    IF container_type = 'open_top_combustible' AND asrs_type = 'mini-load' THEN
        RETURN QUERY SELECT
            'MAJOR SAVINGS: Switch to closed-top containers to eliminate all in-rack sprinkler requirements. This is typically the highest impact change.'::TEXT,
            200000.00::DECIMAL,
            'Critical'::VARCHAR,
            'Minimal'::VARCHAR,
            jsonb_build_object(
                'current_protection', 'Ceiling + In-rack sprinklers required',
                'new_protection', 'Ceiling-only protection sufficient',
                'table_reference', 'Tables 38-42 show in-rack requirements eliminated'
            );
    END IF;
    
    -- Rule 3: Rack Row Depth Optimization 
    IF rack_row_depth > 6 AND asrs_type = 'mini-load' THEN
        RETURN QUERY SELECT
            'Reduce rack row depth to ≤6 ft to lower sprinkler pressure requirements and improve water penetration.'::TEXT,
            45000.00::DECIMAL,
            'High'::VARCHAR,
            'Significant'::VARCHAR,
            jsonb_build_object(
                'current_depth', rack_row_depth,
                'recommended_depth', 6,
                'impact', 'Reduced sprinkler pressures and densities'
            );
    END IF;
    
    -- Rule 4: System Type Optimization
    IF system_type = 'dry' AND (project_data->>'building_heated')::BOOLEAN = true THEN
        RETURN QUERY SELECT
            'Switch to wet system to reduce sprinkler count requirements (typically 15-25% fewer sprinklers needed).'::TEXT,
            60000.00::DECIMAL,
            'Medium'::VARCHAR,
            'Moderate'::VARCHAR,
            jsonb_build_object(
                'reasoning', 'Heated building allows wet system',
                'benefit', 'Lower sprinkler densities in wet system tables',
                'water_delivery_improvement', 'Faster response time'
            );
    END IF;
    
    -- Rule 5: Commodity Classification Benefits
    IF commodity_class IN ('class_4', 'cartoned_unexpanded_plastic') AND storage_height <= 15 THEN
        RETURN QUERY SELECT
            'Consider reclassifying commodity or improving packaging to Class 1-3 for significant protection reductions.'::TEXT,
            85000.00::DECIMAL,
            'Medium'::VARCHAR,
            'Minimal'::VARCHAR,
            jsonb_build_object(
                'current_class', commodity_class,
                'benefit', 'Class 1-3 commodities have much lower protection requirements',
                'table_comparison', 'Compare Tables 4-5 vs Tables 6-7'
            );
    END IF;
    
    RETURN;
END;
$$;


--
-- Name: generate_optimizations(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_optimizations(p_user_input jsonb) RETURNS TABLE(optimization_type text, title text, description text, estimated_savings numeric, implementation_effort text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  ceiling_height numeric;
  container_type text;
BEGIN
  -- Extract key parameters
  ceiling_height := (p_user_input->>'ceiling_height')::numeric;
  container_type := p_user_input->>'container_type';
  
  -- Height-based optimizations
  IF ceiling_height > 30 THEN
    RETURN QUERY
    SELECT 
      'cost_reduction'::text,
      'Ceiling Height Optimization'::text,
      format('Reducing ceiling height from %s ft to 30 ft could eliminate enhanced protection requirements', ceiling_height),
      CASE 
        WHEN ceiling_height > 40 THEN 75000::numeric
        WHEN ceiling_height > 35 THEN 45000::numeric
        ELSE 25000::numeric
      END,
      'moderate'::text;
  END IF;
  
  -- Container-based optimizations
  IF container_type LIKE '%open%' OR container_type LIKE '%combustible%' THEN
    RETURN QUERY
    SELECT 
      'alternative_design'::text,
      'Container Configuration Change'::text,
      'Consider closed-top metal containers to eliminate in-rack sprinkler requirements'::text,
      150000::numeric,
      'significant'::text;
  END IF;
  
  RETURN;
END;
$$;


--
-- Name: generate_po_contract_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_po_contract_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
  next_num INTEGER;
  prefix TEXT := 'PO-';
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    SELECT COALESCE(MAX(
      CASE
        WHEN contract_number ~ '^PO-[0-9]+$'
        THEN CAST(SUBSTRING(contract_number FROM 4) AS INTEGER)
        ELSE 0
      END
    ), 0) + 1
    INTO next_num
    FROM purchase_orders
    WHERE project_id = NEW.project_id;

    NEW.contract_number := prefix || LPAD(next_num::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$_$;


--
-- Name: get_all_project_documents(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_project_documents(in_project_id bigint) RETURNS TABLE(id text, project_id bigint, date timestamp with time zone, title text, content text, participants text, duration_minutes integer, url text, summary text)
    LANGUAGE sql STABLE
    AS $$
  SELECT id, project_id, date, title, content, participants, duration_minutes, url, summary
  FROM public.document_metadata
  WHERE in_project_id IS NULL OR project_id = in_project_id
  ORDER BY date ASC, id;
$$;


--
-- Name: get_asrs_figure_options(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_asrs_figure_options() RETURNS TABLE(asrs_types text[], container_types text[], orientation_types text[], rack_depths text[], spacings text[])
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ARRAY(SELECT DISTINCT asrs_type FROM asrs_figures WHERE asrs_type IS NOT NULL ORDER BY asrs_type),
        ARRAY(SELECT DISTINCT container_type FROM asrs_figures WHERE container_type IS NOT NULL ORDER BY container_type),
        ARRAY(SELECT DISTINCT orientation_type FROM asrs_figures WHERE orientation_type IS NOT NULL ORDER BY orientation_type),
        ARRAY(SELECT DISTINCT rack_row_depth FROM asrs_figures WHERE rack_row_depth IS NOT NULL ORDER BY rack_row_depth),
        ARRAY(SELECT DISTINCT max_horizontal_spacing FROM asrs_figures WHERE max_horizontal_spacing IS NOT NULL ORDER BY max_horizontal_spacing);
END;
$$;


--
-- Name: get_conversation_with_history(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_conversation_with_history(p_conversation_id uuid) RETURNS TABLE(conversation_id uuid, title text, agent_type text, conversation_created_at timestamp with time zone, message_id uuid, role text, content text, message_created_at timestamp with time zone, message_metadata jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS conversation_id,
    c.title,
    c.agent_type,
    c.created_at AS conversation_created_at,
    ch.id AS message_id,
    ch.role,
    ch.content,
    ch.created_at AS message_created_at,
    ch.metadata AS message_metadata
  FROM conversations c
  LEFT JOIN conversation_history ch ON c.id = ch.conversation_id
  WHERE c.id = p_conversation_id
    AND c.user_id = auth.uid()
  ORDER BY ch.created_at ASC;
END;
$$;


--
-- Name: get_distribution_group_member_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_distribution_group_member_count(p_group_id uuid) RETURNS integer
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM distribution_group_members
    WHERE group_id = p_group_id
  );
END;
$$;


--
-- Name: get_document_chunks(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_document_chunks(doc_id uuid) RETURNS TABLE(chunk_id uuid, content text, chunk_index integer, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id AS chunk_id,
        chunks.content,
        chunks.chunk_index,
        chunks.metadata
    FROM chunks
    WHERE document_id = doc_id
    ORDER BY chunk_index;
END;
$$;


--
-- Name: get_document_insights_page(integer, text, text, text, timestamp with time zone, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_document_insights_page(in_page_size integer, in_search text, in_sort_by text, in_sort_dir text, in_cursor_created_at timestamp with time zone, in_cursor_id uuid) RETURNS TABLE(total_count bigint, insight_id uuid, insight_title text, insight_description text, insight_type text, confidence_score numeric, insight_created_at timestamp with time zone, document_id uuid, document_title text, document_url text, document_date date, document_summary text, project_id uuid, project_name text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  WITH params AS (
    SELECT
      in_page_size AS page_size,
      coalesce(NULLIF(in_search, ''), '') AS search,
      CASE WHEN in_sort_by = 'confidence_score' THEN 'confidence_score' ELSE 'created_at' END AS sort_by,
      CASE WHEN lower(coalesce(in_sort_dir, 'desc')) = 'asc' THEN 'asc' ELSE 'desc' END AS sort_dir,
      in_cursor_created_at AS cursor_created_at,
      in_cursor_id AS cursor_id
  ),
  filtered AS (
    SELECT
      di.id                 AS insight_id,
      di.title              AS insight_title,
      di.description        AS insight_description,
      di.insight_type,
      di.confidence_score,
      di.created_at         AS insight_created_at,
      dm.id                 AS document_id,
      dm.title              AS document_title,
      dm.url                AS document_url,
      dm.date               AS document_date,
      dm.summary            AS document_summary,
      dm.project_id,
      dm.project            AS project_name,
      (coalesce(di.title,'') || ' ' || coalesce(di.description,'') || ' ' || coalesce(dm.title,'') || ' ' || coalesce(dm.summary,'')) AS search_text
    FROM document_insights di
    JOIN document_metadata dm ON di.document_id = dm.id
  ),
  search_filtered AS (
    SELECT f.*
    FROM filtered f, params p
    WHERE
      (
        p.search = '' OR
        to_tsvector('english', f.search_text) @@ plainto_tsquery('english', p.search)
      )
  ),
  paged AS (
    SELECT sf.*
    FROM search_filtered sf, params p
    WHERE
      (
        p.cursor_created_at IS NULL
        OR
        (p.sort_by = 'created_at' AND (
           (p.sort_dir = 'desc' AND (sf.insight_created_at < p.cursor_created_at
             OR (sf.insight_created_at = p.cursor_created_at AND sf.insight_id < p.cursor_id)))
        OR
           (p.sort_dir = 'asc'  AND (sf.insight_created_at > p.cursor_created_at
             OR (sf.insight_created_at = p.cursor_created_at AND sf.insight_id > p.cursor_id)))
        ))
        OR
        (p.sort_by = 'confidence_score' AND p.cursor_id IS NULL)
        OR
        (p.sort_by = 'confidence_score' AND p.cursor_id IS NOT NULL AND (
           (p.sort_dir = 'desc' AND (sf.confidence_score < (SELECT confidence_score FROM document_insights WHERE id = p.cursor_id) 
             OR (sf.confidence_score = (SELECT confidence_score FROM document_insights WHERE id = p.cursor_id) AND sf.insight_id < p.cursor_id)))
        OR
           (p.sort_dir = 'asc'  AND (sf.confidence_score > (SELECT confidence_score FROM document_insights WHERE id = p.cursor_id)
             OR (sf.confidence_score = (SELECT confidence_score FROM document_insights WHERE id = p.cursor_id) AND sf.insight_id > p.cursor_id)))
        ))
      )
  ),
  ordered AS (
    SELECT p.*
    FROM paged p, params
    ORDER BY p.insight_created_at DESC, p.insight_id
    LIMIT (SELECT page_size FROM params)
  ),
  total_count AS (
    SELECT COUNT(*) AS cnt FROM search_filtered
  )
  SELECT (SELECT cnt FROM total_count) AS total_count,
         o.insight_id, o.insight_title, o.insight_description, o.insight_type, o.confidence_score, o.insight_created_at,
         o.document_id, o.document_title, o.document_url, o.document_date, o.document_summary, o.project_id, o.project_name
  FROM ordered o;
END;
$$;


--
-- Name: get_figures_by_config(character varying, character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_figures_by_config(p_asrs_type character varying, p_container_type character varying, p_orientation_type character varying DEFAULT 'Horizontal'::character varying) RETURNS TABLE(figure_number character varying, name text, rack_row_depth character varying, max_horizontal_spacing character varying, order_number integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.figure_number,
        f.name,
        f.rack_row_depth,
        f.max_horizontal_spacing,
        f.order_number
    FROM asrs_figures f
    WHERE 
        f.asrs_type = p_asrs_type
        AND f.container_type = p_container_type
        AND (f.orientation_type = p_orientation_type OR f.orientation_type IS NULL)
    ORDER BY f.order_number;
END;
$$;


--
-- Name: get_fm_global_references_by_topic(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_fm_global_references_by_topic(topic text, limit_count integer DEFAULT 20) RETURNS TABLE(reference_type text, reference_number text, title text, section text, asrs_relevance text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    (
        -- Get tables
        SELECT 
            'table'::text as reference_type,
            t.table_id as reference_number,
            t.title,
            t.asrs_type as section,
            'High'::text as asrs_relevance
        FROM fm_global_tables t
        WHERE t.title ILIKE '%' || topic || '%' 
           OR t.protection_scheme ILIKE '%' || topic || '%'
           OR t.asrs_type ILIKE '%' || topic || '%'
        LIMIT limit_count / 2
    )
    UNION ALL
    (
        -- Get figures
        SELECT 
            'figure'::text as reference_type,
            'Figure ' || f.figure_number::text as reference_number,
            f.title,
            f.figure_type as section,
            'High'::text as asrs_relevance
        FROM fm_global_figures f
        WHERE f.title ILIKE '%' || topic || '%'
           OR f.clean_caption ILIKE '%' || topic || '%'
           OR f.figure_type ILIKE '%' || topic || '%'
        LIMIT limit_count / 2
    );
END;
$$;


--
-- Name: get_insights_processing_stats(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_insights_processing_stats(p_days_back integer DEFAULT 30) RETURNS TABLE(total_documents bigint, processed_documents bigint, total_insights bigint, avg_insights_per_document numeric, processing_rate numeric, top_categories jsonb, recent_activity jsonb)
    LANGUAGE plpgsql
    AS $$
DECLARE
  date_threshold TIMESTAMPTZ := NOW() - (p_days_back || ' days')::INTERVAL;
BEGIN
  RETURN QUERY
  WITH doc_stats AS (
    SELECT 
      COUNT(*) as total_docs,
      COUNT(CASE WHEN ai.document_id IS NOT NULL THEN 1 END) as processed_docs
    FROM document_metadata dm
    LEFT JOIN (SELECT DISTINCT document_id FROM ai_insights) ai ON ai.document_id = dm.id
    WHERE dm.created_at >= date_threshold
      AND dm.content IS NOT NULL 
      AND LENGTH(TRIM(dm.content)) > 200
  ),
  insight_stats AS (
    SELECT 
      COUNT(*) as total_insights,
      COUNT(DISTINCT document_id) as docs_with_insights
    FROM ai_insights ai
    WHERE ai.created_at >= date_threshold::TEXT
  ),
  category_stats AS (
    SELECT jsonb_object_agg(category, doc_count) as categories
    FROM (
      SELECT 
        COALESCE(dm.category, 'uncategorized') as category,
        COUNT(*) as doc_count
      FROM document_metadata dm
      INNER JOIN ai_insights ai ON ai.document_id = dm.id
      WHERE ai.created_at >= date_threshold::TEXT
      GROUP BY dm.category
      ORDER BY doc_count DESC
      LIMIT 10
    ) cat_data
  ),
  activity_stats AS (
    SELECT jsonb_object_agg(date_bucket, insight_count) as activity
    FROM (
      SELECT 
        DATE(ai.created_at::TIMESTAMPTZ) as date_bucket,
        COUNT(*) as insight_count
      FROM ai_insights ai
      WHERE ai.created_at >= date_threshold::TEXT
      GROUP BY DATE(ai.created_at::TIMESTAMPTZ)
      ORDER BY date_bucket DESC
      LIMIT 14
    ) activity_data
  )
  SELECT
    ds.total_docs::BIGINT,
    ds.processed_docs::BIGINT,
    COALESCE(ist.total_insights, 0)::BIGINT,
    CASE 
      WHEN ist.docs_with_insights > 0 
      THEN ROUND(ist.total_insights::NUMERIC / ist.docs_with_insights, 2)
      ELSE 0
    END,
    CASE 
      WHEN ds.total_docs > 0 
      THEN ROUND((ds.processed_docs::NUMERIC / ds.total_docs) * 100, 2)
      ELSE 0
    END,
    COALESCE(cs.categories, '{}'::jsonb),
    COALESCE(act.activity, '{}'::jsonb)
  FROM doc_stats ds
  CROSS JOIN insight_stats ist
  CROSS JOIN category_stats cs
  CROSS JOIN activity_stats act;
END;
$$;


--
-- Name: get_meeting_analytics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_meeting_analytics() RETURNS TABLE(total_meetings bigint, meetings_by_category jsonb, recent_meetings_count bigint, avg_duration_minutes numeric, top_participants jsonb)
    LANGUAGE plpgsql
    AS $$
DECLARE
  category_stats jsonb;
  participant_stats jsonb;
BEGIN
  -- Get category distribution
  SELECT jsonb_object_agg(category, count)
  INTO category_stats
  FROM (
    SELECT category, COUNT(*) as count
    FROM document_metadata
    WHERE type = 'meeting_transcript'
    GROUP BY category
    ORDER BY count DESC
  ) category_counts;

  -- Get top participants
  SELECT jsonb_object_agg(participant, count)
  INTO participant_stats
  FROM (
    SELECT 
      unnest(string_to_array(participants, ',')) as participant,
      COUNT(*) as count
    FROM document_metadata
    WHERE type = 'meeting_transcript' AND participants IS NOT NULL
    GROUP BY participant
    ORDER BY count DESC
    LIMIT 10
  ) participant_counts;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM document_metadata WHERE type = 'meeting_transcript'),
    COALESCE(category_stats, '{}'::jsonb),
    (SELECT COUNT(*) FROM document_metadata 
     WHERE type = 'meeting_transcript' 
     AND date >= CURRENT_DATE - INTERVAL '7 days'),
    (SELECT AVG(duration_minutes) FROM document_metadata 
     WHERE type = 'meeting_transcript' AND duration_minutes IS NOT NULL),
    COALESCE(participant_stats, '{}'::jsonb);
END;
$$;


--
-- Name: get_meeting_frequency_stats(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_meeting_frequency_stats(p_days_back integer DEFAULT 30) RETURNS TABLE(period_date date, meeting_count bigint, total_duration_minutes bigint, unique_participants bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(m.meeting_date) as period_date,
    COUNT(*) as meeting_count,
    SUM(m.duration_minutes)::BIGINT as total_duration_minutes,
    COUNT(DISTINCT unnest_participants.participant)::BIGINT as unique_participants
  FROM meetings m
  LEFT JOIN LATERAL unnest(m.participants) as unnest_participants(participant) ON true
  WHERE m.meeting_date >= NOW() - (p_days_back || ' days')::INTERVAL
  GROUP BY DATE(m.meeting_date)
  ORDER BY period_date DESC;
END;
$$;


--
-- Name: get_meeting_statistics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_meeting_statistics() RETURNS TABLE(total_meetings bigint, meetings_this_week bigint, pending_actions bigint, open_risks bigint, total_participants bigint, avg_duration_minutes numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT m.id) as total_meetings,
    COUNT(DISTINCT m.id) FILTER (
      WHERE m.meeting_date >= NOW() - INTERVAL '7 days'
    ) as meetings_this_week,
    COUNT(DISTINCT mi.id) FILTER (
      WHERE mi.insight_type = 'action_item' 
      AND mi.status IN ('pending', 'in_progress')
    ) as pending_actions,
    COUNT(DISTINCT mi.id) FILTER (
      WHERE mi.insight_type = 'risk' 
      AND mi.status = 'pending'
    ) as open_risks,
    COUNT(DISTINCT unnest_participants.participant) as total_participants,
    AVG(m.duration_minutes)::NUMERIC(10,1) as avg_duration_minutes
  FROM meetings m
  LEFT JOIN meeting_insights mi ON mi.meeting_id = m.id
  LEFT JOIN LATERAL unnest(m.participants) as unnest_participants(participant) ON true;
END;
$$;


--
-- Name: get_next_change_event_number(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_change_event_number(p_project_id bigint) RETURNS character varying
    LANGUAGE plpgsql
    AS $_$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(number AS INTEGER)), 0) + 1
    INTO next_num
    FROM change_events
    WHERE project_id = p_project_id
      AND deleted_at IS NULL
      AND number ~ '^[0-9]+$'; -- Only numeric numbers

    RETURN LPAD(next_num::TEXT, 3, '0');
END;
$_$;


--
-- Name: get_next_change_event_number(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_change_event_number(p_project_id uuid) RETURNS character varying
    LANGUAGE plpgsql
    AS $_$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(number AS INTEGER)), 0) + 1
    INTO next_num
    FROM change_events
    WHERE project_id = p_project_id
      AND deleted_at IS NULL
      AND number ~ '^[0-9]+$'; -- Only numeric numbers

    RETURN LPAD(next_num::TEXT, 3, '0');
END;
$_$;


--
-- Name: get_page_parents(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_page_parents(page_id bigint) RETURNS TABLE(id bigint, parent_page_id bigint, path text, meta jsonb)
    LANGUAGE sql
    AS $$
  with recursive chain as (
    select *
    from nods_page
    where id = page_id

    union all

    select child.*
      from nods_page as child
      join chain on chain.parent_page_id = child.id
  )
  select id, parent_page_id, path, meta
  from chain;
$$;


--
-- Name: get_pending_documents(integer, bigint, timestamp with time zone, timestamp with time zone, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pending_documents(p_limit integer DEFAULT 10, p_project_id bigint DEFAULT NULL::bigint, p_date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_date_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_category text DEFAULT NULL::text, p_exclude_processed boolean DEFAULT true) RETURNS TABLE(id text, title text, content text, participants text, category text, date timestamp with time zone, duration_minutes integer, project_id bigint, project text, outline text, bullet_points text, action_items text, entities jsonb, content_length integer, has_existing_insights boolean)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dm.id,
    dm.title,
    dm.content,
    dm.participants,
    dm.category,
    dm.date,
    dm.duration_minutes,
    dm.project_id,
    dm.project,
    dm.outline,
    dm.bullet_points,
    dm.action_items,
    dm.entities,
    LENGTH(COALESCE(dm.content, '')) as content_length,
    CASE 
      WHEN ai.document_id IS NOT NULL THEN TRUE 
      ELSE FALSE 
    END as has_existing_insights
  FROM document_metadata dm
  LEFT JOIN (
    SELECT DISTINCT document_id 
    FROM ai_insights 
    WHERE document_id IS NOT NULL
  ) ai ON ai.document_id = dm.id
  WHERE
    -- Must have content to process
    dm.content IS NOT NULL 
    AND LENGTH(TRIM(dm.content)) > 200
    
    -- Filter by project if specified
    AND (p_project_id IS NULL OR dm.project_id = p_project_id)
    
    -- Filter by date range if specified
    AND (p_date_from IS NULL OR dm.date >= p_date_from)
    AND (p_date_to IS NULL OR dm.date <= p_date_to)
    
    -- Filter by category if specified
    AND (p_category IS NULL OR dm.category = p_category)
    
    -- Exclude already processed if requested
    AND (p_exclude_processed = FALSE OR ai.document_id IS NULL)
    
    -- Prefer meeting-type documents
    AND (dm.type IS NULL OR dm.type IN ('meeting', 'transcript', 'call'))
    
  ORDER BY
    -- Prioritize recent documents
    dm.date DESC NULLS LAST,
    -- Then by creation date
    dm.created_at DESC NULLS LAST
    
  LIMIT p_limit;
END;
$$;


--
-- Name: get_priority_insights(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_priority_insights(p_project_id integer DEFAULT NULL::integer, p_limit integer DEFAULT 10) RETURNS TABLE(id uuid, document_id text, project_id integer, insight_type text, title text, description text, severity text, assignee text, due_date date, confidence_score numeric, days_until_due integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    di.id,
    di.document_id,
    di.project_id,
    di.insight_type,
    di.title,
    di.description,
    di.severity,
    di.assignee,
    di.due_date,
    di.confidence_score,
    CASE
      WHEN di.due_date IS NOT NULL
      THEN EXTRACT(DAY FROM di.due_date - CURRENT_DATE)::INTEGER
      ELSE NULL
    END as days_until_due
  FROM document_insights di
  WHERE
    di.resolved = FALSE
    AND (p_project_id IS NULL OR di.project_id = p_project_id)
    AND di.severity IN ('critical', 'high')
  ORDER BY
    CASE di.severity
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
    END,
    di.due_date ASC NULLS LAST,
    di.confidence_score DESC
  LIMIT p_limit;
END;
$$;


--
-- Name: get_project_company_user_count(integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_project_company_user_count(p_project_id integer, p_company_id uuid) RETURNS integer
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM people p
    JOIN project_directory_memberships pdm ON pdm.person_id = p.id
    WHERE p.company_id = p_company_id
    AND pdm.project_id = p_project_id
    AND pdm.status = 'active'
  );
END;
$$;


--
-- Name: get_project_documents_page(integer, text, text, text, timestamp with time zone, text, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_project_documents_page(in_page_size integer, in_search text, in_sort_by text, in_sort_dir text, in_cursor_date timestamp with time zone, in_cursor_id text, in_project_id bigint) RETURNS TABLE(total_count bigint, id text, project_id bigint, date timestamp with time zone, title text, content text, participants text, duration_minutes integer, url text, summary text, next_cursor_date timestamp with time zone, next_cursor_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  WITH params AS (
    SELECT
      GREATEST(1, COALESCE(in_page_size, 25))::int AS page_size,
      coalesce(NULLIF(in_search, ''), '') AS search,
      CASE WHEN in_sort_by = 'title' THEN 'title' ELSE 'date' END AS sort_by,
      CASE WHEN lower(coalesce(in_sort_dir, 'desc')) = 'asc' THEN 'asc' ELSE 'desc' END AS sort_dir,
      in_cursor_date AS cursor_date,
      coalesce(in_cursor_id, '')::text AS cursor_id,
      in_project_id AS project_id
  ),
  base AS (
    SELECT
      dm.id,
      dm.project_id,
      dm.date,
      dm.title,
      dm.content,
      dm.participants,
      dm.duration_minutes,
      dm.url,
      dm.summary,
      (coalesce(dm.title,'') || ' ' || coalesce(dm.summary,'') || ' ' || coalesce(dm.content,'')) AS search_text
    FROM public.document_metadata dm
    JOIN params p ON true
    WHERE
      (p.project_id IS NULL OR dm.project_id = p.project_id)
  ),
  search_filtered AS (
    SELECT b.*
    FROM base b, params p
    WHERE
      (p.search = '' OR to_tsvector('english', b.search_text) @@ plainto_tsquery('english', p.search))
  ),
  paged AS (
    SELECT sf.*
    FROM search_filtered sf, params p
    WHERE
      (
        p.cursor_date IS NULL
        OR
        (
          p.sort_by = 'date'
          AND (
            (p.sort_dir = 'desc' AND (sf.date < p.cursor_date OR (sf.date = p.cursor_date AND sf.id < NULLIF(p.cursor_id,'')::text)))
         OR (p.sort_dir = 'asc'  AND (sf.date > p.cursor_date OR (sf.date = p.cursor_date AND sf.id > NULLIF(p.cursor_id,'')::text)))
          )
        )
        OR
        (
          p.sort_by = 'title'
          AND (
            (p.sort_dir = 'desc' AND (sf.title < (SELECT title FROM document_metadata WHERE id = NULLIF(p.cursor_id,'')::text) OR (sf.title = (SELECT title FROM document_metadata WHERE id = NULLIF(p.cursor_id,'')::text) AND sf.id < NULLIF(p.cursor_id,'')::text)))
         OR (p.sort_dir = 'asc'  AND (sf.title > (SELECT title FROM document_metadata WHERE id = NULLIF(p.cursor_id,'')::text) OR (sf.title = (SELECT title FROM document_metadata WHERE id = NULLIF(p.cursor_id,'')::text) AND sf.id > NULLIF(p.cursor_id,'')::text)))
          )
        )
      )
  ),
  ordered AS (
    SELECT p.*
    FROM paged p, params
    ORDER BY
      CASE WHEN params.sort_by = 'date' AND params.sort_dir = 'desc' THEN p.date END DESC,
      CASE WHEN params.sort_by = 'date' AND params.sort_dir = 'asc'  THEN p.date END ASC,
      CASE WHEN params.sort_by = 'title' AND params.sort_dir = 'desc' THEN p.title END DESC,
      CASE WHEN params.sort_by = 'title' AND params.sort_dir = 'asc'  THEN p.title END ASC,
      p.id
    LIMIT (SELECT page_size FROM params)
  ),
  total_count AS (
    SELECT COUNT(*) AS cnt FROM search_filtered
  ),
  last_row AS (
    SELECT date AS cursor_date, id AS cursor_id FROM ordered ORDER BY date DESC, id DESC LIMIT 1
  )
  SELECT (SELECT cnt FROM total_count) AS total_count,
         o.id, o.project_id, o.date, o.title, o.content, o.participants, o.duration_minutes, o.url, o.summary,
         lr.cursor_date AS next_cursor_date, lr.cursor_id AS next_cursor_id
  FROM ordered o
  LEFT JOIN last_row lr ON true;
END;
$$;


--
-- Name: get_project_matching_context(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_project_matching_context() RETURNS TABLE(id bigint, name text, description text, team_members text[], stakeholders text[], keywords text[], phase text, category text, aliases text[], active_keywords text[])
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  WITH recent_document_keywords AS (
    SELECT 
      dm.project_id,
      array_agg(DISTINCT word) as doc_keywords
    FROM document_metadata dm
    CROSS JOIN LATERAL (
      SELECT regexp_split_to_table(
        lower(regexp_replace(COALESCE(dm.title, '') || ' ' || COALESCE(dm.content, ''), '[^\w\s]', ' ', 'g')),
        '\s+'
      ) as word
    ) words
    WHERE dm.project_id IS NOT NULL
      AND dm.created_at >= NOW() - INTERVAL '90 days'
      AND LENGTH(word) > 3
      AND word NOT IN ('this', 'that', 'with', 'from', 'they', 'were', 'been', 'have', 'will', 'would', 'could', 'should')
    GROUP BY dm.project_id
  )
  SELECT 
    p.id,
    p.name,
    p.description,
    p.team_members,
    p.stakeholders,
    p.keywords,
    p.phase,
    p.category,
    p.aliases,
    COALESCE(rdk.doc_keywords[1:20], '{}') as active_keywords  -- Top 20 recent keywords
  FROM projects p
  LEFT JOIN recent_document_keywords rdk ON rdk.project_id = p.id
  WHERE p.name IS NOT NULL
  ORDER BY p.id;
END;
$$;


--
-- Name: get_project_team(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_project_team(p_project_id integer) RETURNS TABLE(id uuid, role character varying, person_id uuid, first_name character varying, last_name character varying, full_name text, email character varying, company_name character varying, phone_office character varying, phone_mobile character varying)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    prm.id,
    pr.role_name as role,
    p.id as person_id,
    p.first_name,
    p.last_name,
    CONCAT(p.first_name, ' ', p.last_name) as full_name,
    p.email,
    c.name as company_name,
    p.phone_business as phone_office,
    p.phone_mobile
  FROM project_roles pr
  JOIN project_role_members prm ON prm.project_role_id = pr.id
  JOIN people p ON p.id = prm.person_id
  LEFT JOIN companies c ON c.id = p.company_id
  WHERE pr.project_id = p_project_id
  ORDER BY pr.display_order, p.last_name, p.first_name;
END;
$$;


--
-- Name: get_projects_needing_summary_update(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_projects_needing_summary_update(hours_threshold integer DEFAULT 24) RETURNS TABLE(project_id integer, project_name text, last_update timestamp with time zone, hours_since_update numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as project_id,
        p.name as project_name,
        p.summary_updated_at as last_update,
        EXTRACT(EPOCH FROM (NOW() - COALESCE(p.summary_updated_at, '2000-01-01'::timestamp with time zone))) / 3600 as hours_since_update
    FROM projects p
    WHERE p.name IS NOT NULL
    AND (
        p.summary_updated_at IS NULL 
        OR p.summary_updated_at < NOW() - (hours_threshold || ' hours')::INTERVAL
    )
    ORDER BY p.summary_updated_at ASC NULLS FIRST;
END;
$$;


--
-- Name: get_recent_project_insights(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_recent_project_insights(p_project_id uuid, p_days_back integer DEFAULT 30, p_limit integer DEFAULT 20) RETURNS TABLE(insight_id uuid, insight_type text, content text, priority text, status text, assigned_to text, due_date date, meeting_id uuid, meeting_title text, meeting_date timestamp with time zone, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mi.id as insight_id,
    mi.insight_type,
    mi.content,
    mi.priority,
    mi.status,
    mi.assigned_to,
    mi.due_date,
    m.id as meeting_id,
    m.title as meeting_title,
    m.meeting_date,
    mi.created_at
  FROM meeting_insights mi
  JOIN meetings m ON m.id = mi.meeting_id
  WHERE m.project_id = p_project_id
    AND mi.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
  ORDER BY 
    CASE mi.priority 
      WHEN 'high' THEN 1 
      WHEN 'medium' THEN 2 
      WHEN 'low' THEN 3 
      ELSE 4 
    END,
    mi.created_at DESC
  LIMIT p_limit;
END;
$$;


--
-- Name: get_related_content(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_related_content(chunk_id uuid, max_results integer DEFAULT 5) RETURNS TABLE(content_type text, title text, summary text, page_number integer, relevance_score double precision)
    LANGUAGE plpgsql
    AS $$
DECLARE
  chunk_embedding VECTOR(1536);
  chunk_figures INTEGER[];
  chunk_tables TEXT[];
BEGIN
  -- Get the chunk's embedding and related content
  SELECT tc.embedding, tc.related_figures, tc.related_tables
  INTO chunk_embedding, chunk_figures, chunk_tables
  FROM fm_text_chunks tc WHERE tc.id = chunk_id;
  
  -- Return related figures
  RETURN QUERY
  SELECT 
    'figure'::TEXT as content_type,
    fg.title,
    fg.normalized_summary as summary,
    fg.page_number,
    0.9::FLOAT as relevance_score
  FROM fm_global_figures fg
  WHERE fg.figure_number = ANY(chunk_figures)
  
  UNION ALL
  
  -- Return related tables
  SELECT 
    'table'::TEXT as content_type,
    ft.title,
    COALESCE(ft.title, 'Table data') as summary,
    COALESCE(ft.estimated_page_number::INTEGER, 0) as page_number,
    0.8::FLOAT as relevance_score
  FROM fm_global_tables ft
  WHERE ft.table_id = ANY(chunk_tables)
  
  UNION ALL
  
  -- Return semantically similar chunks
  SELECT 
    'text'::TEXT as content_type,
    COALESCE(tc.chunk_summary, LEFT(tc.raw_text, 100) || '...') as title,
    tc.chunk_summary as summary,
    tc.page_number,
    (1 - (tc.embedding <=> chunk_embedding))::FLOAT as relevance_score
  FROM fm_text_chunks tc
  WHERE tc.id != chunk_id
    AND tc.embedding IS NOT NULL
    AND (tc.embedding <=> chunk_embedding) < 0.3
  
  ORDER BY relevance_score DESC
  LIMIT max_results;
END;
$$;


--
-- Name: get_user_chat_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_chat_stats(p_user_id uuid) RETURNS TABLE(total_chats integer, total_messages integer, total_tokens_used bigint, active_chats integer, archived_chats integer, starred_chats integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT c.id)::INTEGER as total_chats,
        COUNT(DISTINCT m.id)::INTEGER as total_messages,
        COALESCE(SUM(m.total_tokens), 0)::BIGINT as total_tokens_used,
        COUNT(DISTINCT c.id) FILTER (WHERE NOT c.is_archived)::INTEGER as active_chats,
        COUNT(DISTINCT c.id) FILTER (WHERE c.is_archived)::INTEGER as archived_chats,
        COUNT(DISTINCT c.id) FILTER (WHERE c.is_starred)::INTEGER as starred_chats
    FROM chats c
    LEFT JOIN messages m ON c.id = m.chat_id
    WHERE c.user_id = p_user_id;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email)
    VALUES (new.id, new.email)
    ON CONFLICT (id) DO NOTHING; -- Prevent errors if profile already exists
    RETURN new;
END;
$$;


--
-- Name: hybrid_search(public.vector, integer, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hybrid_search(query_embedding public.vector, match_count integer DEFAULT 5, filter_project_id bigint DEFAULT NULL::bigint) RETURNS TABLE(source_type text, id uuid, description text, metadata_id uuid, project_id bigint, similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  
  -- Decisions
  SELECT 
    'decision'::text AS source_type,
    d.id,
    d.description,
    d.metadata_id,
    d.project_id,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.decisions d
  WHERE d.embedding IS NOT NULL
    AND (filter_project_id IS NULL OR d.project_id = filter_project_id)
  
  UNION ALL
  
  -- Risks
  SELECT 
    'risk'::text AS source_type,
    r.id,
    r.description,
    r.metadata_id,
    r.project_id,
    1 - (r.embedding <=> query_embedding) AS similarity
  FROM public.risks r
  WHERE r.embedding IS NOT NULL
    AND (filter_project_id IS NULL OR r.project_id = filter_project_id)
  
  UNION ALL
  
  -- Tasks
  SELECT 
    'task'::text AS source_type,
    t.id,
    t.description,
    t.metadata_id,
    t.project_id,
    1 - (t.embedding <=> query_embedding) AS similarity
  FROM public.tasks t
  WHERE t.embedding IS NOT NULL
    AND (filter_project_id IS NULL OR t.project_id = filter_project_id)
  
  UNION ALL
  
  -- Opportunities
  SELECT 
    'opportunity'::text AS source_type,
    o.id,
    o.description,
    o.metadata_id,
    o.project_id,
    1 - (o.embedding <=> query_embedding) AS similarity
  FROM public.opportunities o
  WHERE o.embedding IS NOT NULL
    AND (filter_project_id IS NULL OR o.project_id = filter_project_id)
  
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;


--
-- Name: hybrid_search(public.vector, text, integer, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hybrid_search(query_embedding public.vector, query_text text, match_count integer DEFAULT 10, text_weight double precision DEFAULT 0.3) RETURNS TABLE(chunk_id uuid, document_id uuid, content text, combined_score double precision, vector_similarity double precision, text_similarity double precision, metadata jsonb, document_title text, document_source text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH vector_results AS (
        SELECT 
            c.id AS chunk_id,
            c.document_id,
            c.content,
            1 - (c.embedding <=> query_embedding) AS vector_sim,
            c.metadata,
            d.title AS doc_title,
            d.source AS doc_source
        FROM chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE c.embedding IS NOT NULL
    ),
    text_results AS (
        SELECT 
            c.id AS chunk_id,
            c.document_id,
            c.content,
            ts_rank_cd(to_tsvector('english', c.content), plainto_tsquery('english', query_text)) AS text_sim,
            c.metadata,
            d.title AS doc_title,
            d.source AS doc_source
        FROM chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE to_tsvector('english', c.content) @@ plainto_tsquery('english', query_text)
    )
    SELECT 
        COALESCE(v.chunk_id, t.chunk_id) AS chunk_id,
        COALESCE(v.document_id, t.document_id) AS document_id,
        COALESCE(v.content, t.content) AS content,
        (COALESCE(v.vector_sim, 0) * (1 - text_weight) + COALESCE(t.text_sim, 0) * text_weight)::float8 AS combined_score,
        COALESCE(v.vector_sim, 0)::float8 AS vector_similarity,
        COALESCE(t.text_sim, 0)::float8 AS text_similarity,
        COALESCE(v.metadata, t.metadata) AS metadata,
        COALESCE(v.doc_title, t.doc_title) AS document_title,
        COALESCE(v.doc_source, t.doc_source) AS document_source
    FROM vector_results v
    FULL OUTER JOIN text_results t ON v.chunk_id = t.chunk_id
    ORDER BY combined_score DESC
    LIMIT match_count;
END;
$$;


--
-- Name: hybrid_search_fm_global(public.vector, text, integer, double precision, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hybrid_search_fm_global(query_embedding public.vector, query_text text, match_count integer DEFAULT 10, text_weight double precision DEFAULT 0.3, filter_asrs_type text DEFAULT NULL::text) RETURNS TABLE(vector_id uuid, source_id uuid, source_type text, content text, combined_score double precision, vector_similarity double precision, text_similarity double precision, asrs_topic text, regulation_section text, design_parameter text, metadata jsonb, table_number text, figure_number text, reference_title text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH vector_results AS (
        SELECT 
            v.id,
            v.content_id,
            v.content_type,
            v.content,
            1 - (v.embedding <=> query_embedding) as vector_score,
            v.metadata,
            CASE 
                WHEN v.content_type = 'table' THEN t.asrs_type
                WHEN v.content_type = 'figure' THEN f.asrs_type
                ELSE NULL
            END as asrs_type_val,
            CASE 
                WHEN v.content_type = 'table' THEN t.table_id
                WHEN v.content_type = 'figure' THEN 'Figure ' || f.figure_number::text
                ELSE NULL
            END as reference_number,
            CASE 
                WHEN v.content_type = 'table' THEN t.title
                WHEN v.content_type = 'figure' THEN f.title
                ELSE NULL
            END as reference_title
        FROM fm_global_vectors v
        LEFT JOIN fm_global_tables t ON v.content_id = t.id AND v.content_type = 'table'
        LEFT JOIN fm_global_figures f ON v.content_id = f.id AND v.content_type = 'figure'
        WHERE 
            (filter_asrs_type IS NULL OR 
             (v.content_type = 'table' AND t.asrs_type = filter_asrs_type) OR
             (v.content_type = 'figure' AND f.asrs_type = filter_asrs_type))
        ORDER BY v.embedding <=> query_embedding
        LIMIT match_count * 2
    ),
    text_results AS (
        SELECT 
            v.id,
            v.content_id,
            v.content_type,
            v.content,
            ts_rank(to_tsvector('english', v.content), plainto_tsquery('english', query_text)) as text_score,
            v.metadata,
            CASE 
                WHEN v.content_type = 'table' THEN t.asrs_type
                WHEN v.content_type = 'figure' THEN f.asrs_type
                ELSE NULL
            END as asrs_type_val,
            CASE 
                WHEN v.content_type = 'table' THEN t.table_id
                WHEN v.content_type = 'figure' THEN 'Figure ' || f.figure_number::text
                ELSE NULL
            END as reference_number,
            CASE 
                WHEN v.content_type = 'table' THEN t.title
                WHEN v.content_type = 'figure' THEN f.title
                ELSE NULL
            END as reference_title
        FROM fm_global_vectors v
        LEFT JOIN fm_global_tables t ON v.content_id = t.id AND v.content_type = 'table'
        LEFT JOIN fm_global_figures f ON v.content_id = f.id AND v.content_type = 'figure'
        WHERE 
            to_tsvector('english', v.content) @@ plainto_tsquery('english', query_text)
            AND (filter_asrs_type IS NULL OR 
                 (v.content_type = 'table' AND t.asrs_type = filter_asrs_type) OR
                 (v.content_type = 'figure' AND f.asrs_type = filter_asrs_type))
        LIMIT match_count * 2
    ),
    combined AS (
        SELECT 
            COALESCE(v.id, t.id) as vector_id,
            COALESCE(v.content_id, t.content_id) as source_id,
            COALESCE(v.content_type, t.content_type) as source_type,
            COALESCE(v.content, t.content) as content,
            COALESCE(v.vector_score, 0) * (1 - text_weight) + COALESCE(t.text_score, 0) * text_weight as score,
            COALESCE(v.vector_score, 0) as vector_similarity,
            COALESCE(t.text_score, 0) as text_similarity,
            COALESCE(v.metadata, t.metadata) as metadata,
            COALESCE(v.asrs_type_val, t.asrs_type_val) as asrs_topic,
            COALESCE(v.reference_number, t.reference_number) as reference_number,
            COALESCE(v.reference_title, t.reference_title) as reference_title,
            COALESCE(v.content_type, t.content_type) as content_type_final
        FROM vector_results v
        FULL OUTER JOIN text_results t ON v.id = t.id
    )
    SELECT 
        c.vector_id,
        c.source_id,
        c.source_type,
        c.content,
        c.score as combined_score,
        c.vector_similarity,
        c.text_similarity,
        c.asrs_topic,
        NULL::text as regulation_section,
        NULL::text as design_parameter,
        c.metadata,
        CASE WHEN c.content_type_final = 'table' THEN c.reference_number ELSE NULL END as table_number,
        CASE WHEN c.content_type_final = 'figure' THEN c.reference_number ELSE NULL END as figure_number,
        c.reference_title
    FROM combined c
    ORDER BY c.score DESC
    LIMIT match_count;
END;
$$;


--
-- Name: increment_session_tokens(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_session_tokens(session_id uuid, tokens_to_add integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE ai_chat_sessions
  SET total_tokens_used = total_tokens_used + tokens_to_add
  WHERE id = session_id;
END;
$$;


--
-- Name: interpolate_sprinkler_requirements(character varying, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.interpolate_sprinkler_requirements(p_table_id character varying, p_target_height_ft integer) RETURNS TABLE(table_id character varying, interpolated_height_ft integer, k_factor numeric, k_type character varying, interpolated_count numeric, interpolated_pressure numeric, lower_height_ft integer, upper_height_ft integer, note text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_lower RECORD;
    v_upper RECORD;
BEGIN
    -- Find the lower bound
    SELECT * INTO v_lower
    FROM fm_global_tables
    WHERE table_id = p_table_id
        AND ceiling_height_ft <= p_target_height_ft
        AND sprinkler_count IS NOT NULL
    ORDER BY ceiling_height_ft DESC
    LIMIT 1;
    
    -- Find the upper bound
    SELECT * INTO v_upper
    FROM fm_global_tables
    WHERE table_id = p_table_id
        AND ceiling_height_ft >= p_target_height_ft
        AND sprinkler_count IS NOT NULL
    ORDER BY ceiling_height_ft ASC
    LIMIT 1;
    
    -- If exact match found
    IF v_lower.ceiling_height_ft = p_target_height_ft THEN
        RETURN QUERY
        SELECT 
            v_lower.table_id,
            p_target_height_ft,
            v_lower.k_factor,
            v_lower.k_type,
            v_lower.sprinkler_count::DECIMAL,
            v_lower.pressure_psi,
            v_lower.ceiling_height_ft,
            v_lower.ceiling_height_ft,
            'Exact match found'::TEXT;
    -- If we have both bounds, interpolate
    ELSIF v_lower.ceiling_height_ft IS NOT NULL AND v_upper.ceiling_height_ft IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            v_lower.table_id,
            p_target_height_ft,
            v_lower.k_factor,
            v_lower.k_type,
            -- Linear interpolation for sprinkler count
            v_lower.sprinkler_count + 
                (v_upper.sprinkler_count - v_lower.sprinkler_count) * 
                (p_target_height_ft - v_lower.ceiling_height_ft)::DECIMAL / 
                (v_upper.ceiling_height_ft - v_lower.ceiling_height_ft)::DECIMAL,
            -- Linear interpolation for pressure
            v_lower.pressure_psi + 
                (v_upper.pressure_psi - v_lower.pressure_psi) * 
                (p_target_height_ft - v_lower.ceiling_height_ft)::DECIMAL / 
                (v_upper.ceiling_height_ft - v_lower.ceiling_height_ft)::DECIMAL,
            v_lower.ceiling_height_ft,
            v_upper.ceiling_height_ft,
            FORMAT('Interpolated between %s ft and %s ft', 
                   v_lower.ceiling_height_ft, v_upper.ceiling_height_ft)::TEXT;
    END IF;
END;
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  is_admin_user BOOLEAN;
BEGIN
  SELECT COALESCE(up.is_admin, FALSE) INTO is_admin_user
  FROM user_profiles up
  WHERE up.id = auth.uid();
  
  RETURN is_admin_user;
END;
$$;


--
-- Name: log_change_event_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_change_event_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO change_event_history (
            change_event_id,
            field_name,
            old_value,
            new_value,
            changed_by,
            change_type
        ) VALUES (
            NEW.id,
            'status',
            NULL,
            NEW.status,
            NEW.created_by,
            'create'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log status changes
        IF OLD.status != NEW.status THEN
            INSERT INTO change_event_history (
                change_event_id,
                field_name,
                old_value,
                new_value,
                changed_by,
                change_type
            ) VALUES (
                NEW.id,
                'status',
                OLD.status,
                NEW.status,
                NEW.updated_by,
                'status_change'
            );
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: mark_document_processed(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_document_processed(p_document_id text, p_insights_count integer DEFAULT 0, p_projects_assigned integer DEFAULT 0) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update document_metadata with processing info
  UPDATE document_metadata 
  SET entities = COALESCE(entities, '{}'::jsonb) || jsonb_build_object(
    'insights_processing', jsonb_build_object(
      'processed_at', NOW(),
      'insights_generated', p_insights_count,
      'projects_assigned', p_projects_assigned
    )
  )
  WHERE id = p_document_id;
  
  RETURN FOUND;
END;
$$;


--
-- Name: match_archon_code_examples(public.vector, integer, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_archon_code_examples(query_embedding public.vector, match_count integer DEFAULT 10, filter jsonb DEFAULT '{}'::jsonb, source_filter text DEFAULT NULL::text) RETURNS TABLE(id bigint, url character varying, chunk_number integer, content text, summary text, metadata jsonb, source_id text, similarity double precision)
    LANGUAGE plpgsql
    AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    id,
    url,
    chunk_number,
    content,
    summary,
    metadata,
    source_id,
    1 - (archon_code_examples.embedding <=> query_embedding) AS similarity
  FROM archon_code_examples
  WHERE metadata @> filter
    AND (source_filter IS NULL OR source_id = source_filter)
  ORDER BY archon_code_examples.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: match_archon_crawled_pages(public.vector, integer, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_archon_crawled_pages(query_embedding public.vector, match_count integer DEFAULT 10, filter jsonb DEFAULT '{}'::jsonb, source_filter text DEFAULT NULL::text) RETURNS TABLE(id bigint, url character varying, chunk_number integer, content text, metadata jsonb, source_id text, similarity double precision)
    LANGUAGE plpgsql
    AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    id,
    url,
    chunk_number,
    content,
    metadata,
    source_id,
    1 - (archon_crawled_pages.embedding <=> query_embedding) AS similarity
  FROM archon_crawled_pages
  WHERE metadata @> filter
    AND (source_filter IS NULL OR source_id = source_filter)
  ORDER BY archon_crawled_pages.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: match_chunks(public.vector, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_chunks(query_embedding public.vector, match_count integer DEFAULT 10) RETURNS TABLE(chunk_id uuid, document_id uuid, content text, similarity double precision, metadata jsonb, document_title text, document_source text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id AS chunk_id,
        c.document_id,
        c.content,
        1 - (c.embedding <=> query_embedding) AS similarity,
        c.metadata,
        d.title AS document_title,
        d.source AS document_source
    FROM chunks c
    JOIN documents d ON c.document_id = d.id
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


--
-- Name: match_code_examples(public.vector, integer, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_code_examples(query_embedding public.vector, match_count integer DEFAULT 10, filter jsonb DEFAULT '{}'::jsonb, source_filter text DEFAULT NULL::text) RETURNS TABLE(id bigint, url character varying, chunk_number integer, content text, summary text, metadata jsonb, source_id text, similarity double precision)
    LANGUAGE plpgsql
    AS $$
#variable_conflict use_column
begin
  return query
  select
    id,
    url,
    chunk_number,
    content,
    summary,
    metadata,
    source_id,
    1 - (code_examples.embedding <=> query_embedding) as similarity
  from code_examples
  where metadata @> filter
    AND (source_filter IS NULL OR source_id = source_filter)
  order by code_examples.embedding <=> query_embedding
  limit match_count;
end;
$$;


--
-- Name: match_crawled_pages(public.vector, integer, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_crawled_pages(query_embedding public.vector, match_count integer DEFAULT 10, filter jsonb DEFAULT '{}'::jsonb, source_filter text DEFAULT NULL::text) RETURNS TABLE(id bigint, url character varying, chunk_number integer, content text, metadata jsonb, source_id text, similarity double precision)
    LANGUAGE plpgsql
    AS $$
#variable_conflict use_column
begin
  return query
  select
    id,
    url,
    chunk_number,
    content,
    metadata,
    source_id,
    1 - (crawled_pages.embedding <=> query_embedding) as similarity
  from crawled_pages
  where metadata @> filter
    AND (source_filter IS NULL OR source_id = source_filter)
  order by crawled_pages.embedding <=> query_embedding
  limit match_count;
end;
$$;


--
-- Name: match_decisions(public.vector, integer, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_decisions(query_embedding public.vector, match_count integer DEFAULT 10, match_threshold double precision DEFAULT 0.5) RETURNS TABLE(id uuid, metadata_id text, segment_id uuid, description text, rationale text, owner_name text, project_id integer, project_ids integer[], effective_date date, impact text, status text, created_at timestamp with time zone, similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.metadata_id,
        d.segment_id,
        d.description,
        d.rationale,
        d.owner_name,
        d.project_id,
        d.project_ids,
        d.effective_date,
        d.impact,
        d.status,
        d.created_at,
        1 - (d.embedding <=> query_embedding) AS similarity
    FROM decisions d
    WHERE d.embedding IS NOT NULL
      AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


--
-- Name: match_decisions_by_project(public.vector, integer[], integer, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_decisions_by_project(query_embedding public.vector, filter_project_ids integer[], match_count integer DEFAULT 10, match_threshold double precision DEFAULT 0.3) RETURNS TABLE(id uuid, metadata_id text, segment_id uuid, description text, rationale text, owner_name text, project_id integer, project_ids integer[], effective_date date, impact text, status text, created_at timestamp with time zone, similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.metadata_id,
        d.segment_id,
        d.description,
        d.rationale,
        d.owner_name,
        d.project_id,
        d.project_ids,
        d.effective_date,
        d.impact,
        d.status,
        d.created_at,
        1 - (d.embedding <=> query_embedding) AS similarity
    FROM decisions d
    WHERE d.embedding IS NOT NULL
      AND (d.project_ids && filter_project_ids OR d.project_id = ANY(filter_project_ids))
      AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


--
-- Name: match_document_chunks(public.vector, double precision, integer, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_document_chunks(query_embedding public.vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 10, filter_document_ids uuid[] DEFAULT NULL::uuid[]) RETURNS TABLE(chunk_id text, document_id text, chunk_index integer, text text, metadata jsonb, created_at timestamp with time zone, similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.chunk_id,
        dc.document_id,
        dc.chunk_index,
        dc.text,
        dc.metadata,
        dc.created_at,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    WHERE 
        (filter_document_ids IS NULL OR dc.document_id = ANY(filter_document_ids::TEXT[]))
        AND dc.embedding IS NOT NULL
        AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


--
-- Name: match_documents(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_documents(query_embedding public.vector, match_count integer DEFAULT 10, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id uuid, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
#variable_conflict use_column
begin
  return query
  select
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from documents d
  where d.embedding is not null
    and d.metadata @> filter
  order by d.embedding <=> query_embedding
  limit match_count;
end;
$$;


--
-- Name: match_documents(public.vector, integer, double precision, text, bigint, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_documents(query_embedding public.vector, match_count integer DEFAULT 10, match_threshold double precision DEFAULT 0.5, filter_doc_type text DEFAULT NULL::text, filter_project_id bigint DEFAULT NULL::bigint, filter_metadata_ids uuid[] DEFAULT NULL::uuid[]) RETURNS TABLE(id uuid, metadata_id uuid, segment_id uuid, doc_type text, chunk_index integer, content text, meeting_date date, project_id bigint, tags text[], similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.metadata_id,
    d.segment_id,
    d.doc_type,
    d.chunk_index,
    d.content,
    d.meeting_date,
    d.project_id,
    d.tags,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.documents d
  WHERE 
    d.embedding IS NOT NULL
    AND (1 - (d.embedding <=> query_embedding)) > match_threshold
    AND (filter_doc_type IS NULL OR d.doc_type = filter_doc_type)
    AND (filter_project_id IS NULL OR d.project_id = filter_project_id)
    AND (filter_metadata_ids IS NULL OR d.metadata_id = ANY(filter_metadata_ids))
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: match_documents_enhanced(public.vector, integer, text, integer, text, timestamp without time zone, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_documents_enhanced(query_embedding public.vector, match_count integer DEFAULT 5, category_filter text DEFAULT NULL::text, year_filter integer DEFAULT NULL::integer, project_filter text DEFAULT NULL::text, date_after_filter timestamp without time zone DEFAULT NULL::timestamp without time zone, participants_filter text DEFAULT NULL::text) RETURNS TABLE(id text, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  FROM documents d
  LEFT JOIN document_metadata dm ON dm.id = (d.metadata->>'file_id')
  WHERE 1=1
    -- Category filter
    AND (category_filter IS NULL OR dm.category = category_filter)
    -- Year filter
    AND (year_filter IS NULL OR EXTRACT(YEAR FROM dm.date) = year_filter)
    -- Project filter
    AND (project_filter IS NULL OR dm.project ILIKE '%' || project_filter || '%')
    -- Date after filter
    AND (date_after_filter IS NULL OR dm.date >= date_after_filter)
    -- Participants filter
    AND (participants_filter IS NULL OR dm.participants ILIKE '%' || participants_filter || '%')
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: match_documents_full(public.vector, integer, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_documents_full(query_embedding public.vector, match_count integer DEFAULT 10, match_threshold double precision DEFAULT 0.5) RETURNS TABLE(id bigint, file_id text, title text, content text, source text, project_id integer, project_ids integer[], file_date date, metadata jsonb, created_at timestamp with time zone, similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        doc.id,
        doc.file_id,
        doc.title,
        doc.content,
        doc.source,
        doc.project_id,
        doc.project_ids,
        doc.file_date,
        doc.metadata,
        doc.created_at,
        1 - (doc.embedding <=> query_embedding) AS similarity
    FROM documents doc
    WHERE doc.embedding IS NOT NULL
      AND 1 - (doc.embedding <=> query_embedding) > match_threshold
    ORDER BY doc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


--
-- Name: match_files(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_files(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
#variable_conflict use_column
begin
  return query
  select
    id,
    content,
    metadata,
    1 - (files.embedding <=> query_embedding) as similarity
  from files
  where metadata @> filter
  order by files.embedding <=> query_embedding
  limit match_count;
end;
$$;


--
-- Name: match_fm_documents(public.vector, double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_fm_documents(query_embedding public.vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 10) RETURNS TABLE(id uuid, title text, content text, metadata jsonb, similarity double precision)
    LANGUAGE sql STABLE
    AS $$
    SELECT
        fm_documents.id,
        fm_documents.title,
        fm_documents.content,
        fm_documents.metadata,
        1 - (fm_documents.embedding <=> query_embedding) AS similarity
    FROM fm_documents
    WHERE 1 - (fm_documents.embedding <=> query_embedding) > match_threshold
    ORDER BY fm_documents.embedding <=> query_embedding
    LIMIT match_count;
$$;


--
-- Name: match_fm_global_vectors(public.vector, integer, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_fm_global_vectors(query_embedding public.vector, match_count integer DEFAULT 10, filter_asrs_type text DEFAULT NULL::text, filter_source_type text DEFAULT NULL::text) RETURNS TABLE(vector_id uuid, source_id uuid, source_type text, content text, similarity double precision, asrs_topic text, regulation_section text, design_parameter text, metadata jsonb, table_number text, figure_number text, reference_title text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH vector_search AS (
        SELECT 
            v.id as vector_id,
            v.content_id as source_id,
            v.content_type as source_type,
            v.content,
            1 - (v.embedding <=> query_embedding) as similarity,
            v.metadata,
            CASE 
                WHEN v.content_type = 'table' THEN t.asrs_type
                WHEN v.content_type = 'figure' THEN f.asrs_type
                ELSE NULL
            END as asrs_topic,
            CASE 
                WHEN v.content_type = 'table' THEN t.table_id
                WHEN v.content_type = 'figure' THEN 'Figure ' || f.figure_number::text
                ELSE NULL
            END as reference_number,
            CASE 
                WHEN v.content_type = 'table' THEN t.title
                WHEN v.content_type = 'figure' THEN f.title
                ELSE NULL
            END as reference_title
        FROM fm_global_vectors v
        LEFT JOIN fm_global_tables t ON v.content_id = t.id AND v.content_type = 'table'
        LEFT JOIN fm_global_figures f ON v.content_id = f.id AND v.content_type = 'figure'
        WHERE 
            (filter_source_type IS NULL OR v.content_type = filter_source_type)
            AND (filter_asrs_type IS NULL OR 
                 (v.content_type = 'table' AND t.asrs_type = filter_asrs_type) OR
                 (v.content_type = 'figure' AND f.asrs_type = filter_asrs_type))
        ORDER BY v.embedding <=> query_embedding
        LIMIT match_count
    )
    SELECT 
        vs.vector_id,
        vs.source_id,
        vs.source_type,
        vs.content,
        vs.similarity,
        vs.asrs_topic,
        NULL::text as regulation_section,
        NULL::text as design_parameter,
        vs.metadata,
        CASE WHEN vs.source_type = 'table' THEN vs.reference_number ELSE NULL END as table_number,
        CASE WHEN vs.source_type = 'figure' THEN vs.reference_number ELSE NULL END as figure_number,
        vs.reference_title
    FROM vector_search vs;
END;
$$;


--
-- Name: match_fm_tables(public.vector, double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_fm_tables(query_embedding public.vector, match_threshold double precision DEFAULT 0.5, match_count integer DEFAULT 10) RETURNS TABLE(table_id text, content_text text, content_type text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ftv.table_id,
    ftv.content_text,
    ftv.content_type,
    ftv.metadata,
    1 - (ftv.embedding <=> query_embedding) as similarity
  FROM fm_table_vectors ftv
  WHERE 1 - (ftv.embedding <=> query_embedding) > match_threshold
  ORDER BY ftv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: match_fm_tables(public.vector, integer, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_fm_tables(query_embedding public.vector, match_count integer DEFAULT 5, match_threshold double precision DEFAULT 0.7) RETURNS TABLE(table_id text, title text, asrs_type text, system_type text, similarity double precision, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ftv.table_id,
    fmt.title,
    fmt.asrs_type,
    fmt.system_type,
    1 - (ftv.embedding <=> query_embedding) AS similarity,
    ftv.metadata
  FROM fm_table_vectors ftv
  JOIN fm_global_tables fmt ON ftv.table_id = fmt.table_id
  WHERE 1 - (ftv.embedding <=> query_embedding) > match_threshold
  ORDER BY ftv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: match_meeting_chunks(public.vector, integer, double precision, integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_meeting_chunks(query_embedding public.vector, match_count integer DEFAULT 6, match_threshold double precision DEFAULT 0.52, p_project_id integer DEFAULT NULL::integer, p_meeting_id uuid DEFAULT NULL::uuid) RETURNS TABLE(id uuid, project_id integer, meeting_id uuid, chunk_index integer, content text, start_timestamp integer, end_timestamp integer, speaker_info jsonb, similarity double precision)
    LANGUAGE sql STABLE
    AS $$
  /*
    We assume:
      - public.meeting_chunks (
          id uuid, project_id int, meeting_id uuid,
          chunk_index int, content text,
          start_timestamp int, end_timestamp int,
          speaker_info jsonb, embedding vector, ...
        )
      - embedding uses cosine distance ops
  */
  select
    mc.id,
    mc.project_id,
    mc.meeting_id,
    mc.chunk_index,
    mc.content,
    mc.start_timestamp,
    mc.end_timestamp,
    mc.speaker_info,
    1 - (mc.embedding <=> query_embedding) as similarity
  from public.meeting_chunks mc
  where (p_project_id is null or mc.project_id = p_project_id)
    and (p_meeting_id is null or mc.meeting_id = p_meeting_id)
    and 1 - (mc.embedding <=> query_embedding) >= match_threshold
  order by mc.embedding <=> query_embedding asc
  limit match_count;
$$;


--
-- Name: match_meeting_chunks_with_project(public.vector, integer, integer, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_meeting_chunks_with_project(query_embedding public.vector, p_project_id integer DEFAULT NULL::integer, match_count integer DEFAULT 10, match_threshold double precision DEFAULT 0.7) RETURNS TABLE(id uuid, meeting_id uuid, content text, similarity double precision, speaker_info jsonb, start_timestamp integer, project_id integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mc.id,
    mc.meeting_id,
    mc.content,
    1 - (mc.embedding <=> query_embedding) AS similarity,
    mc.speaker_info,
    mc.start_timestamp,
    m.project_id
  FROM meeting_chunks mc
  JOIN meetings m ON m.id = mc.meeting_id
  WHERE 
    1 - (mc.embedding <=> query_embedding) > match_threshold
    AND (p_project_id IS NULL OR m.project_id = p_project_id)
  ORDER BY mc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: match_meeting_segments(public.vector, integer, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_meeting_segments(query_embedding public.vector, match_count integer DEFAULT 10, match_threshold double precision DEFAULT 0.5) RETURNS TABLE(id uuid, metadata_id text, segment_index integer, title text, summary text, decisions jsonb, risks jsonb, tasks jsonb, project_ids integer[], created_at timestamp with time zone, similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        ms.id,
        ms.metadata_id,
        ms.segment_index,
        ms.title,
        ms.summary,
        ms.decisions,
        ms.risks,
        ms.tasks,
        ms.project_ids,
        ms.created_at,
        1 - (ms.summary_embedding <=> query_embedding) AS similarity
    FROM meeting_segments ms
    WHERE ms.summary_embedding IS NOT NULL
      AND 1 - (ms.summary_embedding <=> query_embedding) > match_threshold
    ORDER BY ms.summary_embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


--
-- Name: match_meeting_segments_by_project(public.vector, integer[], integer, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_meeting_segments_by_project(query_embedding public.vector, filter_project_ids integer[], match_count integer DEFAULT 10, match_threshold double precision DEFAULT 0.3) RETURNS TABLE(id uuid, metadata_id text, segment_index integer, title text, summary text, decisions jsonb, risks jsonb, tasks jsonb, project_ids integer[], created_at timestamp with time zone, similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        ms.id,
        ms.metadata_id,
        ms.segment_index,
        ms.title,
        ms.summary,
        ms.decisions,
        ms.risks,
        ms.tasks,
        ms.project_ids,
        ms.created_at,
        1 - (ms.summary_embedding <=> query_embedding) AS similarity
    FROM meeting_segments ms
    WHERE ms.summary_embedding IS NOT NULL
      AND ms.project_ids && filter_project_ids  -- Array overlap operator
      AND 1 - (ms.summary_embedding <=> query_embedding) > match_threshold
    ORDER BY ms.summary_embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


--
-- Name: match_meetings(public.vector, integer, double precision, bigint, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_meetings(query_embedding public.vector, match_count integer DEFAULT 20, match_threshold double precision DEFAULT 0.4, filter_project_id bigint DEFAULT NULL::bigint, after_date timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE(id uuid, fireflies_id text, title text, started_at timestamp with time zone, project_id bigint, themes text[], similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    dm.id,
    dm.fireflies_id,
    dm.title,
    dm.started_at,
    dm.project_id,
    dm.themes,
    1 - (dm.summary_embedding <=> query_embedding) AS similarity
  FROM public.document_metadata dm
  WHERE 
    dm.summary_embedding IS NOT NULL
    AND (1 - (dm.summary_embedding <=> query_embedding)) > match_threshold
    AND (filter_project_id IS NULL OR dm.project_id = filter_project_id)
    AND (after_date IS NULL OR dm.started_at >= after_date)
  ORDER BY dm.summary_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: match_memories(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_memories(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
#variable_conflict use_column
begin
  return query
  select
    id,
    content,
    metadata,
    1 - (memories.embedding <=> query_embedding) as similarity
  from memories
  where metadata @> filter
  order by memories.embedding <=> query_embedding
  limit match_count;
end;
$$;


--
-- Name: match_opportunities(public.vector, integer, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_opportunities(query_embedding public.vector, match_count integer DEFAULT 10, match_threshold double precision DEFAULT 0.5) RETURNS TABLE(id uuid, metadata_id text, segment_id uuid, description text, type text, owner_name text, project_id integer, project_ids integer[], next_step text, status text, created_at timestamp with time zone, similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.metadata_id,
        o.segment_id,
        o.description,
        o.type,
        o.owner_name,
        o.project_id,
        o.project_ids,
        o.next_step,
        o.status,
        o.created_at,
        1 - (o.embedding <=> query_embedding) AS similarity
    FROM opportunities o
    WHERE o.embedding IS NOT NULL
      AND 1 - (o.embedding <=> query_embedding) > match_threshold
    ORDER BY o.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


--
-- Name: match_page_sections(public.vector, double precision, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_page_sections(embedding public.vector, match_threshold double precision, match_count integer, min_content_length integer) RETURNS TABLE(id bigint, page_id bigint, slug text, heading text, content text, similarity double precision)
    LANGUAGE plpgsql
    AS $$
#variable_conflict use_variable
begin
  return query
  select
    nods_page_section.id,
    nods_page_section.page_id,
    nods_page_section.slug,
    nods_page_section.heading,
    nods_page_section.content,
    (nods_page_section.embedding <#> embedding) * -1 as similarity
  from nods_page_section

  -- We only care about sections that have a useful amount of content
  where length(nods_page_section.content) >= min_content_length

  -- The dot product is negative because of a Postgres limitation, so we negate it
  and (nods_page_section.embedding <#> embedding) * -1 > match_threshold

  -- OpenAI embeddings are normalized to length 1, so
  -- cosine similarity and dot product will produce the same results.
  -- Using dot product which can be computed slightly faster.
  --
  -- For the different syntaxes, see https://github.com/pgvector/pgvector
  order by nods_page_section.embedding <#> embedding

  limit match_count;
end;
$$;


--
-- Name: match_recent_documents(public.vector, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_recent_documents(query_embedding public.vector, match_count integer DEFAULT 6, days_back integer DEFAULT 7) RETURNS TABLE(id text, content text, metadata jsonb, similarity double precision, document_date timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity,
    dm.date as document_date
  FROM documents d
  LEFT JOIN document_metadata dm ON dm.id = (d.metadata->>'file_id')
  WHERE dm.date >= (CURRENT_DATE - INTERVAL '1 day' * days_back)
  ORDER BY 
    dm.date DESC,
    d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: match_risks(public.vector, integer, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_risks(query_embedding public.vector, match_count integer DEFAULT 10, match_threshold double precision DEFAULT 0.5) RETURNS TABLE(id uuid, metadata_id text, segment_id uuid, description text, category text, likelihood text, impact text, owner_name text, project_id bigint, project_ids bigint[], mitigation_plan text, status text, created_at timestamp with time zone, similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.metadata_id,
        r.segment_id,
        r.description,
        r.category,
        r.likelihood,
        r.impact,
        r.owner_name,
        r.project_id,
        r.project_ids,
        r.mitigation_plan,
        r.status,
        r.created_at,
        1 - (r.embedding <=> query_embedding) AS similarity
    FROM risks r
    WHERE r.embedding IS NOT NULL
      AND 1 - (r.embedding <=> query_embedding) > match_threshold
    ORDER BY r.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


--
-- Name: match_risks_by_project(public.vector, bigint[], integer, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_risks_by_project(query_embedding public.vector, filter_project_ids bigint[], match_count integer DEFAULT 10, match_threshold double precision DEFAULT 0.3) RETURNS TABLE(id uuid, metadata_id text, segment_id uuid, description text, category text, likelihood text, impact text, owner_name text, project_id bigint, project_ids bigint[], mitigation_plan text, status text, created_at timestamp with time zone, similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.metadata_id,
        r.segment_id,
        r.description,
        r.category,
        r.likelihood,
        r.impact,
        r.owner_name,
        r.project_id,
        r.project_ids,
        r.mitigation_plan,
        r.status,
        r.created_at,
        1 - (r.embedding <=> query_embedding) AS similarity
    FROM risks r
    WHERE r.embedding IS NOT NULL
      AND (r.project_ids && filter_project_ids OR r.project_id = ANY(filter_project_ids))
      AND 1 - (r.embedding <=> query_embedding) > match_threshold
    ORDER BY r.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;


--
-- Name: match_segments(public.vector, integer, double precision, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_segments(query_embedding public.vector, match_count integer DEFAULT 30, match_threshold double precision DEFAULT 0.45, filter_metadata_ids uuid[] DEFAULT NULL::uuid[]) RETURNS TABLE(id uuid, metadata_id uuid, segment_index integer, title text, summary text, similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.id,
    ms.metadata_id,
    ms.segment_index,
    ms.title,
    ms.summary,
    1 - (ms.summary_embedding <=> query_embedding) AS similarity
  FROM public.meeting_segments ms
  WHERE 
    ms.summary_embedding IS NOT NULL
    AND (1 - (ms.summary_embedding <=> query_embedding)) > match_threshold
    AND (filter_metadata_ids IS NULL OR ms.metadata_id = ANY(filter_metadata_ids))
  ORDER BY ms.summary_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: match_tasks(public.vector, integer, double precision, bigint, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_tasks(query_embedding public.vector, match_count integer DEFAULT 10, match_threshold double precision DEFAULT 0.5, filter_project_id bigint DEFAULT NULL::bigint, filter_status text DEFAULT NULL::text, filter_assignee text DEFAULT NULL::text) RETURNS TABLE(id uuid, metadata_id uuid, description text, assignee_name text, due_date date, priority text, project_id bigint, status text, created_at timestamp with time zone, similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.metadata_id,
    t.description,
    t.assignee_name,
    t.due_date,
    t.priority,
    t.project_id,
    t.status,
    t.created_at,
    1 - (t.embedding <=> query_embedding) AS similarity
  FROM public.tasks t
  WHERE 
    t.embedding IS NOT NULL
    AND (1 - (t.embedding <=> query_embedding)) > match_threshold
    AND (filter_project_id IS NULL OR t.project_id = filter_project_id)
    AND (filter_status IS NULL OR t.status = filter_status)
    AND (filter_assignee IS NULL OR t.assignee_email = filter_assignee)
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: normalize_exact_quotes(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_exact_quotes(in_json jsonb) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT
    CASE
      WHEN in_json IS NULL THEN ''
      WHEN jsonb_typeof(in_json) = 'array' THEN array_to_string(ARRAY(SELECT jsonb_array_elements_text(in_json)), ' ')
      ELSE coalesce(in_json::text, '')
    END;
$$;


--
-- Name: populate_insight_names(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.populate_insight_names() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Get meeting name
    IF NEW.meeting_id IS NOT NULL THEN
        SELECT title INTO NEW.meeting_name
        FROM meetings
        WHERE id = NEW.meeting_id;
    END IF;
    
    -- Get project name
    IF NEW.project_id IS NOT NULL THEN
        SELECT name INTO NEW.project_name
        FROM projects
        WHERE id = NEW.project_id;
    END IF;
    
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: qa_page_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qa_page_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_path text NOT NULL,
    page_name text NOT NULL,
    page_type text DEFAULT 'unknown'::text NOT NULL,
    header_component text,
    auto_status text DEFAULT 'pending'::text NOT NULL,
    manual_status text,
    notes text,
    priority integer DEFAULT 3,
    assigned_to text,
    last_scanned_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    procore_screenshot text,
    stage text DEFAULT 'to_do'::text,
    documentation text,
    layout_type text,
    action_buttons text,
    tabs text
);


--
-- Name: qa_effective_status(public.qa_page_audit); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.qa_effective_status(page public.qa_page_audit) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  RETURN COALESCE(page.manual_status, page.auto_status);
END;
$$;


--
-- Name: refresh_budget_rollup(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_budget_rollup(p_project_id bigint DEFAULT NULL::bigint) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- For now, always do full refresh with CONCURRENTLY
    -- This allows queries to continue during refresh
    -- Future optimization: could do partial refresh for specific project
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_budget_rollup;
END;
$$;


--
-- Name: refresh_change_events_summary(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_change_events_summary() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW change_events_summary;
    RETURN NULL;
END;
$$;


--
-- Name: refresh_contract_financial_summary(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_contract_financial_summary() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.contract_financial_summary_mv;
END;
$$;


--
-- Name: refresh_contract_financial_summary_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_contract_financial_summary_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM public.refresh_contract_financial_summary();
  RETURN NULL;  -- statement-level trigger, row return value not needed
END;
$$;


--
-- Name: refresh_search_vectors(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_search_vectors() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE fm_blocks
    SET    search_vector = to_tsvector('english', source_text)
    WHERE  search_vector IS NULL;
END;
$$;


--
-- Name: search_all_knowledge(public.vector, integer, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_all_knowledge(query_embedding public.vector, match_count integer DEFAULT 20, match_threshold double precision DEFAULT 0.4) RETURNS TABLE(source_table text, record_id uuid, content text, metadata jsonb, project_ids integer[], created_at timestamp with time zone, similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    (
        -- Decisions
        SELECT
            'decisions'::text AS source_table,
            d.id AS record_id,
            d.description AS content,
            jsonb_build_object(
                'rationale', d.rationale,
                'owner', d.owner_name,
                'impact', d.impact,
                'status', d.status
            ) AS metadata,
            d.project_ids,
            d.created_at,
            1 - (d.embedding <=> query_embedding) AS similarity
        FROM decisions d
        WHERE d.embedding IS NOT NULL
          AND 1 - (d.embedding <=> query_embedding) > match_threshold
    )
    UNION ALL
    (
        -- Risks
        SELECT
            'risks'::text AS source_table,
            r.id AS record_id,
            r.description AS content,
            jsonb_build_object(
                'category', r.category,
                'likelihood', r.likelihood,
                'impact', r.impact,
                'owner', r.owner_name,
                'mitigation', r.mitigation_plan,
                'status', r.status
            ) AS metadata,
            r.project_ids,
            r.created_at,
            1 - (r.embedding <=> query_embedding) AS similarity
        FROM risks r
        WHERE r.embedding IS NOT NULL
          AND 1 - (r.embedding <=> query_embedding) > match_threshold
    )
    UNION ALL
    (
        -- Opportunities
        SELECT
            'opportunities'::text AS source_table,
            o.id AS record_id,
            o.description AS content,
            jsonb_build_object(
                'type', o.type,
                'owner', o.owner_name,
                'next_step', o.next_step,
                'status', o.status
            ) AS metadata,
            o.project_ids,
            o.created_at,
            1 - (o.embedding <=> query_embedding) AS similarity
        FROM opportunities o
        WHERE o.embedding IS NOT NULL
          AND 1 - (o.embedding <=> query_embedding) > match_threshold
    )
    UNION ALL
    (
        -- Meeting Segments
        SELECT
            'meeting_segments'::text AS source_table,
            ms.id AS record_id,
            COALESCE(ms.title, '') || ': ' || COALESCE(ms.summary, '') AS content,
            jsonb_build_object(
                'segment_index', ms.segment_index,
                'decisions_count', jsonb_array_length(ms.decisions),
                'risks_count', jsonb_array_length(ms.risks),
                'tasks_count', jsonb_array_length(ms.tasks)
            ) AS metadata,
            ms.project_ids,
            ms.created_at,
            1 - (ms.summary_embedding <=> query_embedding) AS similarity
        FROM meeting_segments ms
        WHERE ms.summary_embedding IS NOT NULL
          AND 1 - (ms.summary_embedding <=> query_embedding) > match_threshold
    )
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;


--
-- Name: search_asrs_figures(text, character varying, character varying, character varying, character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_asrs_figures(p_search_text text DEFAULT NULL::text, p_asrs_type character varying DEFAULT NULL::character varying, p_container_type character varying DEFAULT NULL::character varying, p_orientation_type character varying DEFAULT NULL::character varying, p_rack_depth character varying DEFAULT NULL::character varying, p_spacing character varying DEFAULT NULL::character varying) RETURNS TABLE(id uuid, order_number integer, figure_number character varying, name text, orientation_type character varying, asrs_type character varying, container_type character varying, rack_row_depth character varying, max_horizontal_spacing character varying, relevance_score real)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.order_number,
        f.figure_number,
        f.name,
        f.orientation_type,
        f.asrs_type,
        f.container_type,
        f.rack_row_depth,
        f.max_horizontal_spacing,
        CASE 
            WHEN p_search_text IS NOT NULL THEN 
                ts_rank(f.search_vector, plainto_tsquery('english', p_search_text))
            ELSE 1.0
        END as relevance_score
    FROM asrs_figures f
    WHERE 
        (p_search_text IS NULL OR f.search_vector @@ plainto_tsquery('english', p_search_text))
        AND (p_asrs_type IS NULL OR f.asrs_type = p_asrs_type)
        AND (p_container_type IS NULL OR f.container_type = p_container_type)
        AND (p_orientation_type IS NULL OR f.orientation_type = p_orientation_type)
        AND (p_rack_depth IS NULL OR f.rack_row_depth = p_rack_depth)
        AND (p_spacing IS NULL OR f.max_horizontal_spacing = p_spacing)
    ORDER BY 
        CASE 
            WHEN p_search_text IS NOT NULL THEN 
                ts_rank(f.search_vector, plainto_tsquery('english', p_search_text))
            ELSE f.order_number
        END DESC;
END;
$$;


--
-- Name: search_by_category(public.vector, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_by_category(query_embedding public.vector, category text, match_count integer DEFAULT 5) RETURNS TABLE(id text, content text, metadata jsonb, similarity double precision, meeting_category text)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity,
    dm.category as meeting_category
  FROM documents d
  LEFT JOIN document_metadata dm ON dm.id = (d.metadata->>'file_id')
  WHERE dm.category = category
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: search_by_participants(public.vector, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_by_participants(query_embedding public.vector, participant_name text, match_count integer DEFAULT 5) RETURNS TABLE(id text, content text, metadata jsonb, similarity double precision, participants text)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity,
    dm.participants
  FROM documents d
  LEFT JOIN document_metadata dm ON dm.id = (d.metadata->>'file_id')
  WHERE dm.participants ILIKE '%' || participant_name || '%'
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: search_documentation(text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_documentation(query_text text, section_filter text DEFAULT NULL::text, limit_count integer DEFAULT 20) RETURNS TABLE(section_id character varying, section_title character varying, section_slug character varying, block_content text, page_reference integer, rank real)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.section_id,
        s.title        AS section_title,
        s.slug         AS section_slug,
        b.source_text  AS block_content,
        b.page_reference,
        ts_rank(b.search_vector, plainto_tsquery(query_text)) AS rank
    FROM fm_blocks b
    JOIN fm_sections s ON b.section_id = s.id
    WHERE b.search_vector @@ plainto_tsquery(query_text)
      AND (section_filter IS NULL OR s.section_type = section_filter)
      AND s.is_visible = true
    ORDER BY rank DESC
    LIMIT limit_count;
END;
$$;


--
-- Name: search_fm_global_all(public.vector, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_fm_global_all(query_embedding public.vector, query_text text, match_count integer DEFAULT 10) RETURNS TABLE(source_id text, source_type text, source_table text, content text, similarity double precision, title text, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH 
    -- Search fm_text_chunks (document chunks with embeddings)
    chunk_results AS (
        SELECT 
            c.id::text as source_id,
            c.content_type as source_type,
            'fm_text_chunks'::text as source_table,
            c.raw_text as content,
            1 - (c.embedding <=> query_embedding) as similarity,
            COALESCE(c.chunk_summary, CONCAT('Chunk from ', c.doc_id)) as title,
            jsonb_build_object(
                'doc_id', c.doc_id,
                'page_number', c.page_number,
                'section_path', c.section_path,
                'related_tables', c.related_tables,
                'related_figures', c.related_figures,
                'topics', c.topics
            ) as metadata
        FROM fm_text_chunks c
        WHERE c.embedding IS NOT NULL
    ),
    
    -- Search fm_table_vectors (table embeddings)
    table_results AS (
        SELECT 
            tv.id::text as source_id,
            tv.content_type as source_type,
            'fm_table_vectors'::text as source_table,
            tv.content_text as content,
            1 - (tv.embedding <=> query_embedding) as similarity,
            CONCAT('Table ', tv.table_id) as title,
            tv.metadata
        FROM fm_table_vectors tv
        WHERE tv.embedding IS NOT NULL
    ),
    
    -- Search fm_global_vectors (if it has data)
    vector_results AS (
        SELECT 
            v.id::text as source_id,
            v.content_type as source_type,
            'fm_global_vectors'::text as source_table,
            v.content,
            1 - (v.embedding <=> query_embedding) as similarity,
            'FM Global Vector' as title,
            v.metadata
        FROM fm_global_vectors v
        WHERE v.embedding IS NOT NULL
    ),
    
    -- Combine all results
    all_results AS (
        SELECT * FROM chunk_results
        UNION ALL
        SELECT * FROM table_results
        UNION ALL
        SELECT * FROM vector_results
    )
    
    SELECT * FROM all_results
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;


--
-- Name: search_meeting_chunks(public.vector, double precision, integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_meeting_chunks(query_embedding public.vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 5, project_filter uuid DEFAULT NULL::uuid) RETURNS TABLE(id uuid, meeting_id uuid, project_id uuid, chunk_text text, chunk_index integer, chunk_start_time integer, chunk_end_time integer, speaker_info jsonb, similarity double precision, meeting_title text, meeting_date timestamp with time zone, project_title text)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mc.id,
    mc.meeting_id,
    m.project_id,  -- Get project_id from meetings table
    mc.content AS chunk_text,
    mc.chunk_index,
    mc.start_timestamp AS chunk_start_time,
    mc.end_timestamp AS chunk_end_time,
    mc.speaker_info,
    1 - (mc.embedding <=> query_embedding) AS similarity,
    m.title AS meeting_title,
    m.date AS meeting_date,
    p.title AS project_title
  FROM meeting_chunks mc
  JOIN meetings m ON mc.meeting_id = m.id
  LEFT JOIN projects p ON m.project_id = p.id
  WHERE 
    (project_filter IS NULL OR m.project_id = project_filter)
    AND mc.embedding IS NOT NULL
    AND (1 - (mc.embedding <=> query_embedding)) > match_threshold
  ORDER BY mc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: search_meeting_chunks(public.vector, double precision, integer, bigint, timestamp with time zone, timestamp with time zone, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_meeting_chunks(query_embedding public.vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 10, project_filter bigint DEFAULT NULL::bigint, date_from timestamp with time zone DEFAULT NULL::timestamp with time zone, date_to timestamp with time zone DEFAULT NULL::timestamp with time zone, chunk_types text[] DEFAULT NULL::text[]) RETURNS TABLE(chunk_id uuid, meeting_id uuid, project_id bigint, chunk_text text, chunk_type text, chunk_index integer, similarity double precision, meeting_title text, meeting_date timestamp with time zone, speakers jsonb, metadata jsonb, rank_score double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  WITH ranked_chunks AS (
    SELECT 
      mc.id AS chunk_id,
      mc.meeting_id,
      m.project_id,
      mc.content AS chunk_text,
      COALESCE(mc.chunk_type, 'transcript') AS chunk_type,
      mc.chunk_index,
      CASE 
        WHEN mc.embedding IS NOT NULL THEN 1 - (mc.embedding <=> query_embedding)
        ELSE 0
      END AS similarity,
      m.title AS meeting_title,
      m.date AS meeting_date,
      mc.speaker_info AS speakers,
      mc.metadata,
      -- Combine similarity with recency and importance
      CASE 
        WHEN mc.embedding IS NOT NULL THEN
          (1 - (mc.embedding <=> query_embedding)) * 
          (1 + 0.1 * COALESCE((mc.metadata->>'importance_score')::FLOAT, 0)) *
          (CASE 
            WHEN m.date > NOW() - INTERVAL '7 days' THEN 1.2
            WHEN m.date > NOW() - INTERVAL '30 days' THEN 1.1
            ELSE 1.0
          END)
        ELSE 0
      END AS rank_score
    FROM meeting_chunks mc
    JOIN meetings m ON mc.meeting_id = m.id
    WHERE 
      -- Vector similarity threshold (only if embedding exists)
      (mc.embedding IS NULL OR (1 - (mc.embedding <=> query_embedding)) > match_threshold)
      -- Optional filters
      AND (project_filter IS NULL OR m.project_id = project_filter)
      AND (date_from IS NULL OR m.date >= date_from)
      AND (date_to IS NULL OR m.date <= date_to)
      AND (chunk_types IS NULL OR COALESCE(mc.chunk_type, 'transcript') = ANY(chunk_types))
  )
  SELECT * FROM ranked_chunks
  WHERE rank_score > 0
  ORDER BY rank_score DESC
  LIMIT match_count;
END;
$$;


--
-- Name: search_meeting_chunks_semantic(public.vector, double precision, integer, uuid, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_meeting_chunks_semantic(query_embedding public.vector, match_threshold double precision DEFAULT 0.5, match_count integer DEFAULT 10, filter_meeting_id uuid DEFAULT NULL::uuid, filter_project_id bigint DEFAULT NULL::bigint) RETURNS TABLE(chunk_id uuid, meeting_id uuid, meeting_title text, chunk_content text, chunk_index integer, speaker_info jsonb, similarity double precision, project_id bigint, meeting_date timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mc.id AS chunk_id,
        mc.meeting_id,
        m.title AS meeting_title,
        mc.content AS chunk_content,
        mc.chunk_index,
        mc.speaker_info,
        1 - (mc.embedding <=> query_embedding) AS similarity,
        m.project_id,
        m.date AS meeting_date
    FROM 
        public.meeting_chunks mc
        INNER JOIN public.meetings m ON mc.meeting_id = m.id
    WHERE 
        mc.embedding IS NOT NULL
        AND (1 - (mc.embedding <=> query_embedding)) > match_threshold
        AND (filter_meeting_id IS NULL OR mc.meeting_id = filter_meeting_id)
        AND (filter_project_id IS NULL OR m.project_id = filter_project_id)
    ORDER BY 
        mc.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;


--
-- Name: search_meeting_embeddings(public.vector, double precision, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_meeting_embeddings(query_embedding public.vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 10, project_filter integer DEFAULT NULL::integer) RETURNS TABLE(meeting_id uuid, chunk_index integer, similarity double precision, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        me.meeting_id::UUID,
        me.chunk_index,
        1 - (me.embedding_vector <=> query_embedding) AS similarity,
        me.metadata
    FROM meeting_embeddings me
    JOIN meetings m ON me.meeting_id = m.id::TEXT
    WHERE 
        (project_filter IS NULL OR m.project_id = project_filter)
        AND (1 - (me.embedding_vector <=> query_embedding)) > match_threshold
    ORDER BY me.embedding_vector <=> query_embedding
    LIMIT match_count;
END;
$$;


--
-- Name: search_text_chunks(text, public.vector, integer, text, text, double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_text_chunks(search_query text, embedding_vector public.vector DEFAULT NULL::public.vector, page_filter integer DEFAULT NULL::integer, compliance_filter text DEFAULT NULL::text, cost_impact_filter text DEFAULT NULL::text, match_threshold double precision DEFAULT 0.8, max_results integer DEFAULT 10) RETURNS TABLE(id uuid, raw_text text, chunk_summary text, page_number integer, clause_id text, topics text[], similarity double precision, cost_impact text, savings_opportunities text[])
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.id,
    tc.raw_text,
    tc.chunk_summary,
    tc.page_number,
    tc.clause_id,
    tc.topics,
    CASE 
      WHEN embedding_vector IS NOT NULL THEN 1 - (tc.embedding <=> embedding_vector)
      ELSE 0.0
    END as similarity,
    tc.cost_impact,
    tc.savings_opportunities
  FROM fm_text_chunks tc
  WHERE 
    -- Keyword search if no embedding provided
    (embedding_vector IS NULL AND (
      tc.raw_text ILIKE '%' || search_query || '%' OR
      tc.chunk_summary ILIKE '%' || search_query || '%' OR
      tc.search_keywords && string_to_array(lower(search_query), ' ')
    ))
    -- Semantic search if embedding provided
    OR (embedding_vector IS NOT NULL AND (tc.embedding <=> embedding_vector) < (1 - match_threshold))
    -- Apply filters
    AND (page_filter IS NULL OR tc.page_number = page_filter)
    AND (compliance_filter IS NULL OR tc.compliance_type = compliance_filter)
    AND (cost_impact_filter IS NULL OR tc.cost_impact = cost_impact_filter)
  ORDER BY 
    CASE 
      WHEN embedding_vector IS NOT NULL THEN (tc.embedding <=> embedding_vector)
      ELSE 0
    END ASC,
    tc.page_number ASC
  LIMIT max_results;
END;
$$;


--
-- Name: set_budget_line_from_project_budget_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_budget_line_from_project_budget_code() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    pbc_record project_budget_codes%ROWTYPE;
BEGIN
    -- If project_budget_code_id is provided, fetch and populate fields
    IF NEW.project_budget_code_id IS NOT NULL THEN
        SELECT * INTO pbc_record
        FROM project_budget_codes
        WHERE id = NEW.project_budget_code_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'project_budget_code_id % does not exist', NEW.project_budget_code_id;
        END IF;

        -- Verify project_id matches
        IF pbc_record.project_id != NEW.project_id THEN
            RAISE EXCEPTION 'project_budget_code project_id does not match budget_line project_id';
        END IF;

        -- Auto-populate fields from project_budget_code
        NEW.sub_job_id := pbc_record.sub_job_id;
        NEW.cost_code_id := pbc_record.cost_code_id;
        NEW.cost_type_id := pbc_record.cost_type_id;

        -- Use project_budget_code description if budget_line description is null
        IF NEW.description IS NULL OR NEW.description = '' THEN
            NEW.description := pbc_record.description;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: set_chunk_doc_title(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_chunk_doc_title() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- When a chunk is inserted or its meeting reference changes,
    -- fetch the meeting’s date & title and store the combined string.
    SELECT to_char(m.date, 'YYYY-MM-DD') || ' ' || m.title
    INTO   NEW.doc_title
    FROM   public.meetings AS m
    WHERE  m.id = NEW.document_id;   -- adjust column name if needed

    RETURN NEW;
END;
$$;


--
-- Name: set_default_severity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_default_severity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.severity IS NULL THEN
    CASE NEW.insight_type
      WHEN 'action_item' THEN
        NEW.severity := 'high';
      WHEN 'risk' THEN
        NEW.severity := 'high';
      WHEN 'timeline_change' THEN
        NEW.severity := 'critical';
      WHEN 'financial_decision' THEN
        NEW.severity := 'high';
      WHEN 'personnel_issue' THEN
        NEW.severity := 'medium';
      ELSE
        NEW.severity := 'medium';
    END CASE;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_document_insight_doc_title(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_document_insight_doc_title() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  v_title text;
begin
  -- Safely handle null or empty document_id
  if new.document_id is null then
    return new;
  end if;

  select title into v_title
  from public.document_metadata d
  where d.id = new.document_id
  limit 1;

  if v_title is not null then
    if new.doc_title is distinct from v_title then
      new.doc_title := v_title;
    end if;
  end if;

  return new;
end;
$$;


--
-- Name: set_project_id_by_title(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_project_id_by_title() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only act on INSERT, or UPDATE when the title actually changed
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND (OLD.title IS DISTINCT FROM NEW.title)) THEN
    IF NEW.title IS NOT NULL THEN
      -- Priority: first match wins
      IF NEW.title ILIKE '%Nieman%' THEN
        NEW.project_id := 38;
      ELSIF NEW.title ILIKE '%Uniqlo%' THEN
        NEW.project_id := 31;
      ELSIF NEW.title ILIKE '%Bloomington%' THEN
        NEW.project_id := 47;
      ELSIF NEW.title ILIKE '%Westfield%' THEN
        NEW.project_id := 43;
      ELSIF NEW.title ILIKE '%Paradise%' THEN
        NEW.project_id := 58;
      ELSIF NEW.title ILIKE '%Accounting%' THEN
        NEW.project_id := 60;
      ELSIF NEW.title ILIKE '%Vermillian%' THEN
        NEW.project_id := 67;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: set_project_id_from_title(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_project_id_from_title() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF (NEW.title IS NOT NULL) THEN
    -- Only assign when project_id is NULL to avoid overwriting explicit values
    IF NEW.project_id IS NULL THEN
      -- Use IF/ELSIF for clearer control flow
      IF lower(NEW.title) LIKE '%bloomington%' THEN
        NEW.project_id := 47;
      ELSIF lower(NEW.title) LIKE '%accounting%' THEN
        NEW.project_id := 60;
      ELSIF lower(NEW.title) LIKE '%uniqlo%' THEN
        NEW.project_id := 31;
      ELSIF lower(NEW.title) LIKE '%seminole%' THEN
        NEW.project_id := 33;
      ELSIF lower(NEW.title) LIKE '%vermillion%' THEN
        NEW.project_id := 67;
      ELSIF lower(NEW.title) LIKE '%niemann%' THEN
        NEW.project_id := 38;
      ELSIF lower(NEW.title) LIKE '%westfield%' THEN
        NEW.project_id := 43;
      ELSIF lower(NEW.title) LIKE '%paradise%' THEN
        NEW.project_id := 58;
      ELSIF lower(NEW.title) LIKE '%port%' THEN
        NEW.project_id := 34;
      ELSIF lower(NEW.title) LIKE '%crate%' THEN
        NEW.project_id := 53;
      ELSIF lower(NEW.title) LIKE '%ulta%' THEN
        NEW.project_id := 55;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_supervisor_name(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_supervisor_name() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF (NEW.supervisor IS NOT NULL AND (NEW.supervisor_name IS NULL OR trim(NEW.supervisor_name) = '')) THEN
      SELECT CONCAT(first_name, ' ', last_name) INTO NEW.supervisor_name FROM public.employees WHERE id = NEW.supervisor;
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF (OLD.supervisor IS DISTINCT FROM NEW.supervisor) THEN
      IF (NEW.supervisor IS NOT NULL) THEN
        SELECT CONCAT(first_name, ' ', last_name) INTO NEW.supervisor_name FROM public.employees WHERE id = NEW.supervisor;
      ELSE
        NEW.supervisor_name := NULL;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end $$;


--
-- Name: suggest_project_assignments(text, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.suggest_project_assignments(p_document_content text, p_document_title text DEFAULT NULL::text, p_participants text DEFAULT NULL::text, p_top_matches integer DEFAULT 5) RETURNS TABLE(project_id bigint, project_name text, match_score numeric, match_reasons text[])
    LANGUAGE plpgsql
    AS $$
DECLARE
  content_words TEXT[];
  title_words TEXT[];
  participant_words TEXT[];
BEGIN
  -- Extract and clean words from inputs
  SELECT array_agg(DISTINCT lower(word)) INTO content_words
  FROM regexp_split_to_table(
    regexp_replace(COALESCE(p_document_content, ''), '[^\w\s]', ' ', 'g'),
    '\s+'
  ) as word
  WHERE LENGTH(word) > 2;
  
  SELECT array_agg(DISTINCT lower(word)) INTO title_words
  FROM regexp_split_to_table(
    regexp_replace(COALESCE(p_document_title, ''), '[^\w\s]', ' ', 'g'),
    '\s+'
  ) as word
  WHERE LENGTH(word) > 2;
  
  SELECT array_agg(DISTINCT lower(word)) INTO participant_words
  FROM regexp_split_to_table(
    regexp_replace(COALESCE(p_participants, ''), '[^\w\s]', ' ', 'g'),
    '\s+'
  ) as word
  WHERE LENGTH(word) > 2;
  
  RETURN QUERY
  WITH project_matches AS (
    SELECT 
      p.id,
      p.name,
      -- Calculate match scores
      (
        -- Exact name match in title (high weight)
        CASE WHEN p.name ILIKE '%' || COALESCE(p_document_title, '') || '%' 
             OR COALESCE(p_document_title, '') ILIKE '%' || p.name || '%'
        THEN 5.0 ELSE 0.0 END +
        
        -- Name match in content (medium weight)
        CASE WHEN p.name ILIKE '%' || COALESCE(p_document_content, '') || '%'
             OR COALESCE(p_document_content, '') ILIKE '%' || p.name || '%'
        THEN 3.0 ELSE 0.0 END +
        
        -- Keyword matches (variable weight)
        COALESCE(
          (SELECT COUNT(*) * 0.5
           FROM unnest(COALESCE(p.keywords, '{}')) kw
           WHERE COALESCE(p_document_content, '') ILIKE '%' || kw || '%'
           OR COALESCE(p_document_title, '') ILIKE '%' || kw || '%'
          ), 0
        ) +
        
        -- Team member matches (high weight)
        COALESCE(
          (SELECT COUNT(*) * 2.0
           FROM unnest(COALESCE(p.team_members, '{}')) tm
           WHERE COALESCE(p_participants, '') ILIKE '%' || tm || '%'
           OR COALESCE(p_document_content, '') ILIKE '%' || tm || '%'
          ), 0
        ) +
        
        -- Stakeholder matches (medium weight)
        COALESCE(
          (SELECT COUNT(*) * 1.0
           FROM unnest(COALESCE(p.stakeholders, '{}')) sh
           WHERE COALESCE(p_participants, '') ILIKE '%' || sh || '%'
           OR COALESCE(p_document_content, '') ILIKE '%' || sh || '%'
          ), 0
        ) +
        
        -- Alias matches (medium weight)
        COALESCE(
          (SELECT COUNT(*) * 1.5
           FROM unnest(COALESCE(p.aliases, '{}')) alias
           WHERE COALESCE(p_document_content, '') ILIKE '%' || alias || '%'
           OR COALESCE(p_document_title, '') ILIKE '%' || alias || '%'
          ), 0
        )
      ) as score,
      
      -- Collect match reasons
      array_remove(ARRAY[
        CASE WHEN p.name ILIKE '%' || COALESCE(p_document_title, '') || '%' 
             OR COALESCE(p_document_title, '') ILIKE '%' || p.name || '%'
        THEN 'Project name in title' END,
        
        CASE WHEN p.name ILIKE '%' || COALESCE(p_document_content, '') || '%'
             OR COALESCE(p_document_content, '') ILIKE '%' || p.name || '%'
        THEN 'Project name in content' END,
        
        CASE WHEN EXISTS(
          SELECT 1 FROM unnest(COALESCE(p.keywords, '{}')) kw
          WHERE COALESCE(p_document_content, '') ILIKE '%' || kw || '%'
          OR COALESCE(p_document_title, '') ILIKE '%' || kw || '%'
        ) THEN 'Keyword match' END,
        
        CASE WHEN EXISTS(
          SELECT 1 FROM unnest(COALESCE(p.team_members, '{}')) tm
          WHERE COALESCE(p_participants, '') ILIKE '%' || tm || '%'
          OR COALESCE(p_document_content, '') ILIKE '%' || tm || '%'
        ) THEN 'Team member match' END,
        
        CASE WHEN EXISTS(
          SELECT 1 FROM unnest(COALESCE(p.stakeholders, '{}')) sh
          WHERE COALESCE(p_participants, '') ILIKE '%' || sh || '%'
          OR COALESCE(p_document_content, '') ILIKE '%' || sh || '%'
        ) THEN 'Stakeholder match' END,
        
        CASE WHEN EXISTS(
          SELECT 1 FROM unnest(COALESCE(p.aliases, '{}')) alias
          WHERE COALESCE(p_document_content, '') ILIKE '%' || alias || '%'
          OR COALESCE(p_document_title, '') ILIKE '%' || alias || '%'
        ) THEN 'Alias match' END
      ], NULL) as reasons
      
    FROM projects p
    WHERE p.name IS NOT NULL
  )
  SELECT 
    pm.id,
    pm.name,
    ROUND(pm.score, 2),
    pm.reasons
  FROM project_matches pm
  WHERE pm.score > 0
  ORDER BY pm.score DESC, pm.name
  LIMIT p_top_matches;
END;
$$;


--
-- Name: sync_ai_insights_meeting_name(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_ai_insights_meeting_name() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    SELECT to_char(m.date, 'YYYY-MM-DD') || ' ' || m.title
    INTO   NEW.meeting_name
    FROM   public.meetings AS m
    WHERE  m.id = NEW.meeting_id;

    RETURN NEW;
END;
$$;


--
-- Name: sync_client(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_client() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Fetch the title from the related client
  SELECT name
  INTO NEW.client
  FROM public.clients
  WHERE id = NEW.client_id;

  RETURN NEW;
END;
$$;


--
-- Name: sync_contacts_company_name(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_contacts_company_name() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    SELECT name INTO NEW.company_name FROM public.companies WHERE id = NEW.company_id;
  ELSE
    NEW.company_name := NULL;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: sync_cost_codes_division_title(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_cost_codes_division_title() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.division_id IS NOT NULL THEN
    SELECT title INTO NEW.division_title FROM public.cost_code_divisions WHERE id = NEW.division_id;
  ELSE
    NEW.division_title := NULL;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: sync_doc_title(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_doc_title() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Fetch the title from the related meeting
  SELECT title
  INTO NEW.doc_title
  FROM public.meetings
  WHERE id = NEW.meeting_id;

  RETURN NEW;
END;
$$;


--
-- Name: sync_document_insights_project(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_document_insights_project() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.document_id IS NULL THEN
    NEW.project_id := NULL;
    NEW.project_name := NULL;
    RETURN NEW;
  END IF;

  SELECT dm.project_id, dm.project
    INTO NEW.project_id, NEW.project_name
  FROM public.document_metadata dm
  WHERE dm.id = NEW.document_id
  LIMIT 1;

  IF NOT FOUND THEN
    NEW.project_id := NULL;
    NEW.project_name := NULL;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: sync_document_metadata_on_project_name_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_document_metadata_on_project_name_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  -- only act when the name actually changed
  IF (NEW.name IS DISTINCT FROM OLD.name) THEN
    UPDATE public.document_metadata
    SET project = NEW.name
    WHERE project_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: sync_document_metadata_project_from_project_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_document_metadata_project_from_project_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  IF (NEW.project_id IS NULL) THEN
    RETURN NEW;
  END IF;

  UPDATE public.document_metadata
  SET project = p.name
  FROM public.projects p
  WHERE public.document_metadata.id = NEW.id
    AND p.id = NEW.project_id;

  RETURN NEW;
END;
$$;


--
-- Name: sync_document_project_name(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_document_project_name() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.project_id IS NULL THEN
    NEW.project := NULL;
    RETURN NEW;
  END IF;

  SELECT name INTO NEW.project FROM public.projects WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$;


--
-- Name: sync_insight_project_from_document(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_insight_project_from_document() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.document_id IS NULL THEN
    NEW.project_id := NULL;
    NEW.project_name := NULL;
    RETURN NEW;
  END IF;

  -- Fetch project_id and project name from document_metadata
  SELECT dm.project_id, dm.project
    INTO NEW.project_id, NEW.project_name
  FROM public.document_metadata dm
  WHERE dm.id = NEW.document_id
  LIMIT 1;

  -- If no match, ensure fields are null
  IF NOT FOUND THEN
    NEW.project_id := NULL;
    NEW.project_name := NULL;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: sync_meeting_title(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_meeting_title() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Fetch the title from the related meeting
  SELECT title
  INTO NEW.meeting_title
  FROM public.meetings
  WHERE id = NEW.meeting_id;

  RETURN NEW;
END;
$$;


--
-- Name: sync_project(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_project() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Fetch the title from the related project
  SELECT name
  INTO NEW.project
  FROM public.projects
  WHERE id = NEW.project_id;

  RETURN NEW;
END;
$$;


--
-- Name: sync_project_title(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_project_title() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Fetch the title from the related project
  SELECT name
  INTO NEW.project_title
  FROM public.projects
  WHERE id = NEW.project_id;

  RETURN NEW;
END;
$$;


--
-- Name: text_search_chunks(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.text_search_chunks(search_query text, match_count integer DEFAULT 10) RETURNS TABLE(chunk_id uuid, doc_id text, content text, chunk_summary text, page_number integer, section_path text[], related_tables text[], related_figures text[])
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as chunk_id,
        c.doc_id,
        c.raw_text as content,
        c.chunk_summary,
        c.page_number,
        c.section_path,
        c.related_tables,
        c.related_figures
    FROM fm_text_chunks c
    WHERE 
        c.raw_text ILIKE '%' || search_query || '%'
        OR c.chunk_summary ILIKE '%' || search_query || '%'
        OR search_query = ANY(c.search_keywords)
        OR search_query = ANY(c.topics)
    ORDER BY 
        CASE 
            WHEN c.chunk_summary ILIKE '%' || search_query || '%' THEN 1
            WHEN c.raw_text ILIKE '%' || search_query || '%' THEN 2
            ELSE 3
        END
    LIMIT match_count;
END;
$$;


--
-- Name: track_budget_line_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_budget_line_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- On INSERT (create)
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO budget_line_history (
      budget_line_id, project_id, field_name, old_value, new_value,
      changed_by, change_type
    ) VALUES
      (NEW.id, NEW.project_id, 'quantity', NULL, NEW.quantity::TEXT, COALESCE(NEW.created_by, auth.uid()), 'create'),
      (NEW.id, NEW.project_id, 'unit_cost', NULL, NEW.unit_cost::TEXT, COALESCE(NEW.created_by, auth.uid()), 'create'),
      (NEW.id, NEW.project_id, 'description', NULL, COALESCE(NEW.description, ''), COALESCE(NEW.created_by, auth.uid()), 'create');
    RETURN NEW;
  END IF;

  -- On UPDATE
  IF (TG_OP = 'UPDATE') THEN
    -- Track quantity changes
    IF (OLD.quantity IS DISTINCT FROM NEW.quantity) THEN
      INSERT INTO budget_line_history (budget_line_id, project_id, field_name, old_value, new_value, changed_by, change_type)
      VALUES (NEW.id, NEW.project_id, 'quantity', OLD.quantity::TEXT, NEW.quantity::TEXT, COALESCE(NEW.updated_by, auth.uid()), 'update');
    END IF;

    -- Track unit_cost changes
    IF (OLD.unit_cost IS DISTINCT FROM NEW.unit_cost) THEN
      INSERT INTO budget_line_history (budget_line_id, project_id, field_name, old_value, new_value, changed_by, change_type)
      VALUES (NEW.id, NEW.project_id, 'unit_cost', OLD.unit_cost::TEXT, NEW.unit_cost::TEXT, COALESCE(NEW.updated_by, auth.uid()), 'update');
    END IF;

    -- Track description changes
    IF (OLD.description IS DISTINCT FROM NEW.description) THEN
      INSERT INTO budget_line_history (budget_line_id, project_id, field_name, old_value, new_value, changed_by, change_type)
      VALUES (NEW.id, NEW.project_id, 'description', COALESCE(OLD.description, ''), COALESCE(NEW.description, ''), COALESCE(NEW.updated_by, auth.uid()), 'update');
    END IF;

    -- Update updated_at timestamp
    NEW.updated_at = NOW();

    RETURN NEW;
  END IF;

  -- On DELETE
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO budget_line_history (budget_line_id, project_id, field_name, old_value, new_value, changed_by, change_type)
    VALUES (OLD.id, OLD.project_id, 'deleted', 'active', 'deleted', auth.uid(), 'delete');
    RETURN OLD;
  END IF;
END;
$$;


--
-- Name: track_budget_line_changes_before(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_budget_line_changes_before() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO budget_line_history (
      budget_line_id, project_id, field_name, old_value, new_value,
      changed_by, change_type
    ) VALUES
      (NEW.id, NEW.project_id, 'quantity', NULL, NEW.quantity::TEXT, COALESCE(NEW.created_by, auth.uid()), 'create'),
      (NEW.id, NEW.project_id, 'unit_cost', NULL, NEW.unit_cost::TEXT, COALESCE(NEW.created_by, auth.uid()), 'create'),
      (NEW.id, NEW.project_id, 'description', NULL, COALESCE(NEW.description, ''), COALESCE(NEW.created_by, auth.uid()), 'create');
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.quantity IS DISTINCT FROM NEW.quantity) THEN
      INSERT INTO budget_line_history (budget_line_id, project_id, field_name, old_value, new_value, changed_by, change_type)
      VALUES (NEW.id, NEW.project_id, 'quantity', OLD.quantity::TEXT, NEW.quantity::TEXT, COALESCE(NEW.updated_by, auth.uid()), 'update');
    END IF;

    IF (OLD.unit_cost IS DISTINCT FROM NEW.unit_cost) THEN
      INSERT INTO budget_line_history (budget_line_id, project_id, field_name, old_value, new_value, changed_by, change_type)
      VALUES (NEW.id, NEW.project_id, 'unit_cost', OLD.unit_cost::TEXT, NEW.unit_cost::TEXT, COALESCE(NEW.updated_by, auth.uid()), 'update');
    END IF;

    IF (OLD.description IS DISTINCT FROM NEW.description) THEN
      INSERT INTO budget_line_history (budget_line_id, project_id, field_name, old_value, new_value, changed_by, change_type)
      VALUES (NEW.id, NEW.project_id, 'description', COALESCE(OLD.description, ''), COALESCE(NEW.description, ''), COALESCE(NEW.updated_by, auth.uid()), 'update');
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    -- Use OLD values while parent row still exists
    INSERT INTO budget_line_history (budget_line_id, project_id, field_name, old_value, new_value, changed_by, change_type)
    VALUES (OLD.id, OLD.project_id, 'deleted', 'active', 'deleted', auth.uid(), 'delete');
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;


--
-- Name: track_submittal_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_submittal_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO submittal_history (
            submittal_id, 
            action, 
            description, 
            previous_status, 
            new_status,
            changes
        ) VALUES (
            NEW.id,
            'status_changed',
            'Status changed from ' || OLD.status || ' to ' || NEW.status,
            OLD.status,
            NEW.status,
            jsonb_build_object('field', 'status', 'old_value', OLD.status, 'new_value', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: update_app_users_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_app_users_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_billing_periods_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_billing_periods_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_budget_details_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_budget_details_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_budget_line_forecasts_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_budget_line_forecasts_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;


--
-- Name: update_budget_views_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_budget_views_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_change_events_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_change_events_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_change_orders_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_change_orders_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_chat_last_message_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_chat_last_message_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE chats
    SET last_message_at = NOW()
    WHERE id = NEW.chat_id;
    RETURN NEW;
END;
$$;


--
-- Name: update_contract_documents_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_contract_documents_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_contract_line_items_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_contract_line_items_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_contract_views_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_contract_views_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_document_project_assignment(text, bigint, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_document_project_assignment(p_document_id text, p_project_id bigint, p_confidence numeric DEFAULT NULL::numeric, p_reasoning text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  project_name TEXT;
BEGIN
  -- Get project name for reference
  SELECT name INTO project_name 
  FROM projects 
  WHERE id = p_project_id;
  
  -- Update document_metadata with project assignment
  UPDATE document_metadata 
  SET 
    project_id = p_project_id,
    project = project_name,
    entities = COALESCE(entities, '{}'::jsonb) || jsonb_build_object(
      'project_assignment', jsonb_build_object(
        'assigned_at', NOW(),
        'confidence', p_confidence,
        'reasoning', p_reasoning,
        'method', 'ai_worker'
      )
    )
  WHERE id = p_document_id;
  
  RETURN FOUND;
END;
$$;


--
-- Name: update_forecasting_curves_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_forecasting_curves_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;


--
-- Name: update_initiatives_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_initiatives_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_insight_names(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_insight_names() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update meeting name if meeting_id changed
    IF NEW.meeting_id IS DISTINCT FROM OLD.meeting_id THEN
        IF NEW.meeting_id IS NOT NULL THEN
            SELECT title INTO NEW.meeting_name
            FROM meetings
            WHERE id = NEW.meeting_id;
        ELSE
            NEW.meeting_name := NULL;
        END IF;
    END IF;
    
    -- Update project name if project_id changed
    IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
        IF NEW.project_id IS NOT NULL THEN
            SELECT name INTO NEW.project_name
            FROM projects
            WHERE id = NEW.project_id;
        ELSE
            NEW.project_name := NULL;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: update_meeting_chunks_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_meeting_chunks_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_payments_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_payments_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_prime_contracts_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_prime_contracts_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_qa_page_audit_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_qa_page_audit_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_rag_pipeline_state_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_rag_pipeline_state_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_schedule_task_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_schedule_task_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_search_vector(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_search_vector() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.search_vector = to_tsvector('english', NEW.source_text);
    RETURN NEW;
END;
$$;


--
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_vendors_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_vendors_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: validate_project_assignment(text, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_project_assignment(p_document_id text, p_project_id bigint) RETURNS TABLE(is_valid boolean, confidence numeric, validation_notes text[])
    LANGUAGE plpgsql
    AS $$
DECLARE
  doc_record RECORD;
  proj_record RECORD;
  notes TEXT[] := '{}';
  conf_score NUMERIC := 0;
BEGIN
  -- Get document data
  SELECT * INTO doc_record
  FROM document_metadata 
  WHERE id = p_document_id;
  
  -- Get project data
  SELECT * INTO proj_record
  FROM projects 
  WHERE id = p_project_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, ARRAY['Project not found'];
    RETURN;
  END IF;
  
  IF doc_record IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, ARRAY['Document not found'];
    RETURN;
  END IF;
  
  -- Validation checks
  
  -- Check for explicit project name mention
  IF doc_record.title ILIKE '%' || proj_record.name || '%' 
     OR doc_record.content ILIKE '%' || proj_record.name || '%' THEN
    conf_score := conf_score + 0.4;
    notes := notes || 'Project name explicitly mentioned';
  END IF;
  
  -- Check team member overlap
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(proj_record.team_members, '{}')) tm
    WHERE doc_record.participants ILIKE '%' || tm || '%'
  ) THEN
    conf_score := conf_score + 0.3;
    notes := notes || 'Team member participation confirmed';
  END IF;
  
  -- Check keyword relevance
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(proj_record.keywords, '{}')) kw
    WHERE doc_record.content ILIKE '%' || kw || '%'
  ) THEN
    conf_score := conf_score + 0.2;
    notes := notes || 'Relevant keywords found';
  END IF;
  
  -- Check if document already has different project assignment
  IF doc_record.project_id IS NOT NULL AND doc_record.project_id != p_project_id THEN
    conf_score := conf_score - 0.2;
    notes := notes || 'Conflicts with existing assignment';
  END IF;
  
  -- Determine validity
  RETURN QUERY SELECT 
    (conf_score >= 0.3),
    GREATEST(conf_score, 0),
    notes;
END;
$$;


--
-- Name: vector_search(public.vector, integer, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.vector_search(query_embedding public.vector, match_count integer DEFAULT 10, match_threshold double precision DEFAULT 0.7) RETURNS TABLE(id uuid, content text, meeting_id uuid, similarity double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mc.id,
    mc.content,
    mc.meeting_id,
    1 - (mc.embedding <=> query_embedding) as similarity
  FROM meeting_chunks mc
  WHERE mc.embedding IS NOT NULL
    AND 1 - (mc.embedding <=> query_embedding) > match_threshold
  ORDER BY mc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: Prospects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Prospects" (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    title text,
    contact bigint,
    status text
);


--
-- Name: Prospects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."Prospects" ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."Prospects_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: __drizzle_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.__drizzle_migrations (
    hash text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: document_insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id text NOT NULL,
    project_id integer,
    insight_type text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    confidence_score numeric(3,2) DEFAULT 0.0,
    generated_by text DEFAULT 'llama-3.1-8b'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    doc_title text,
    severity character varying(20),
    business_impact text,
    assignee text,
    due_date date,
    financial_impact numeric(12,2),
    urgency_indicators text[],
    resolved boolean DEFAULT false,
    source_meetings text[],
    dependencies text[],
    stakeholders_affected text[],
    exact_quotes text[],
    numerical_data jsonb,
    critical_path_impact boolean DEFAULT false,
    cross_project_impact integer[],
    document_date date,
    project_name text,
    CONSTRAINT document_insights_confidence_score_check CHECK (((confidence_score >= 0.0) AND (confidence_score <= 1.0))),
    CONSTRAINT document_insights_severity_check CHECK (((severity)::text = ANY ((ARRAY['critical'::character varying, 'high'::character varying, 'medium'::character varying, 'low'::character varying])::text[])))
);


--
-- Name: document_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_metadata (
    id text NOT NULL,
    title text,
    url text,
    created_at timestamp without time zone DEFAULT now(),
    type text,
    source text,
    content text,
    summary text,
    participants text,
    tags text,
    category text,
    fireflies_id text,
    fireflies_link text,
    project_id bigint,
    project text,
    date timestamp with time zone,
    duration_minutes integer,
    bullet_points text,
    action_items text,
    file_id integer,
    overview text,
    description text,
    status text,
    access_level text DEFAULT 'team'::text,
    captured_at timestamp with time zone,
    content_hash text,
    participants_array text[],
    phase text DEFAULT 'Current'::text NOT NULL,
    audio text,
    video text
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text,
    "job number" text,
    "start date" date,
    "est completion" date,
    "est revenue" numeric,
    "est profit" numeric,
    address text,
    onedrive text,
    phase text,
    state text,
    client_id bigint,
    category text,
    aliases text[] DEFAULT '{}'::text[],
    team_members text[] DEFAULT '{}'::text[],
    current_phase character varying(100),
    completion_percentage integer DEFAULT 0,
    budget numeric(12,2),
    budget_used numeric(12,2) DEFAULT 0,
    client text,
    summary text,
    summary_metadata jsonb DEFAULT '{}'::jsonb,
    summary_updated_at timestamp with time zone,
    health_score numeric(5,2),
    health_status text,
    access text,
    archived boolean DEFAULT false NOT NULL,
    archived_by uuid,
    archived_at timestamp with time zone,
    erp_system text,
    erp_last_job_cost_sync timestamp with time zone,
    erp_last_direct_cost_sync timestamp with time zone,
    erp_sync_status text,
    project_manager bigint,
    project_number character varying(50),
    stakeholders jsonb DEFAULT '[]'::jsonb,
    budget_locked boolean DEFAULT false,
    budget_locked_at timestamp with time zone,
    budget_locked_by uuid,
    work_scope text,
    project_sector text,
    delivery_method text,
    name_code text,
    type text,
    CONSTRAINT projects_delivery_method_check CHECK (((delivery_method IS NULL) OR (delivery_method = ANY (ARRAY['Design-Bid-Build'::text, 'Design-Build'::text, 'Construction Management at Risk'::text, 'Integrated Project Delivery'::text])))),
    CONSTRAINT projects_health_status_check CHECK ((health_status = ANY (ARRAY['Healthy'::text, 'At Risk'::text, 'Needs Attention'::text, 'Critical'::text]))),
    CONSTRAINT projects_project_sector_check CHECK (((project_sector IS NULL) OR (project_sector = ANY (ARRAY['Commercial'::text, 'Industrial'::text, 'Infrastructure'::text, 'Healthcare'::text, 'Institutional'::text, 'Residential'::text])))),
    CONSTRAINT projects_work_scope_check CHECK (((work_scope IS NULL) OR (work_scope = ANY (ARRAY['Ground-Up Construction'::text, 'Renovation'::text, 'Tenant Improvement'::text, 'Interior Build-Out'::text, 'Maintenance'::text]))))
);


--
-- Name: actionable_insights; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.actionable_insights AS
 SELECT di.id,
    di.document_id,
    di.project_id,
    di.insight_type,
    di.title,
    di.description,
    di.confidence_score,
    di.generated_by,
    di.created_at,
    di.metadata,
    di.doc_title,
    di.severity,
    di.business_impact,
    di.assignee,
    di.due_date,
    di.financial_impact,
    di.urgency_indicators,
    di.resolved,
    di.source_meetings,
    di.dependencies,
    di.stakeholders_affected,
    di.exact_quotes,
    di.numerical_data,
    di.critical_path_impact,
    di.cross_project_impact,
    dm.title AS document_title,
    dm.type AS document_type,
    dm.date AS meeting_date,
    p.name AS project_name
   FROM ((public.document_insights di
     LEFT JOIN public.document_metadata dm ON ((di.document_id = dm.id)))
     LEFT JOIN public.projects p ON ((di.project_id = p.id)))
  WHERE ((di.resolved = false) AND ((di.severity)::text = ANY ((ARRAY['critical'::character varying, 'high'::character varying])::text[])))
  ORDER BY
        CASE di.severity
            WHEN 'critical'::text THEN 1
            WHEN 'high'::text THEN 2
            WHEN 'medium'::text THEN 3
            WHEN 'low'::text THEN 4
            ELSE NULL::integer
        END, di.due_date, di.confidence_score DESC;


--
-- Name: ai_analysis_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_analysis_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submittal_id uuid NOT NULL,
    job_type character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'queued'::character varying,
    model_version character varying(50),
    config jsonb,
    input_data jsonb,
    results jsonb,
    confidence_metrics jsonb,
    processing_time_ms integer,
    error_message text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ai_analysis_jobs_status_check CHECK (((status)::text = ANY ((ARRAY['queued'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: ai_insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_insights (
    id bigint NOT NULL,
    project_id bigint,
    insight_type text,
    severity text,
    title text NOT NULL,
    description text NOT NULL,
    source_meetings text,
    confidence_score real,
    resolved integer DEFAULT 0,
    created_at text DEFAULT CURRENT_TIMESTAMP,
    meeting_id uuid,
    meeting_name text,
    project_name text,
    document_id uuid,
    status text DEFAULT 'open'::text,
    assigned_to text,
    due_date date,
    metadata jsonb DEFAULT '{}'::jsonb,
    resolved_at timestamp with time zone,
    business_impact text,
    assignee text,
    dependencies jsonb DEFAULT '[]'::jsonb,
    financial_impact numeric,
    timeline_impact_days integer,
    stakeholders_affected text[],
    exact_quotes jsonb DEFAULT '[]'::jsonb,
    numerical_data jsonb DEFAULT '[]'::jsonb,
    urgency_indicators text[],
    cross_project_impact integer[],
    chunks_id uuid,
    meeting_date timestamp with time zone,
    exact_quotes_text text,
    CONSTRAINT ai_insights_flexible_parent_check CHECK (((document_id IS NOT NULL) OR (meeting_id IS NOT NULL) OR ((document_id IS NULL) AND (meeting_id IS NULL)))),
    CONSTRAINT ai_insights_insight_type_check CHECK ((insight_type = ANY (ARRAY['action_item'::text, 'decision'::text, 'risk'::text, 'milestone'::text, 'fact'::text, 'blocker'::text, 'dependency'::text, 'budget_update'::text, 'timeline_change'::text, 'stakeholder_feedback'::text, 'technical_debt'::text]))),
    CONSTRAINT ai_insights_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT ai_insights_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: ai_insights_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_insights_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_insights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_insights_id_seq OWNED BY public.ai_insights.id;


--
-- Name: ai_insights_id_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.ai_insights ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.ai_insights_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: ai_insights_today; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ai_insights_today WITH (security_invoker='on') AS
 SELECT id,
    project_id,
    insight_type,
    severity,
    title,
    description,
    source_meetings,
    confidence_score,
    resolved,
    created_at,
    meeting_id,
    meeting_name,
    project_name,
    document_id,
    status,
    assigned_to,
    due_date,
    metadata,
    resolved_at,
    business_impact,
    assignee,
    dependencies,
    financial_impact,
    timeline_impact_days,
    stakeholders_affected,
    exact_quotes,
    numerical_data,
    urgency_indicators,
    cross_project_impact
   FROM public.ai_insights
  WHERE (((created_at)::timestamp with time zone >= date_trunc('day'::text, now())) AND ((created_at)::timestamp with time zone < (date_trunc('day'::text, now()) + '1 day'::interval)));


--
-- Name: ai_insights_with_project; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ai_insights_with_project AS
 SELECT ai.id,
    ai.project_id,
    ai.insight_type,
    ai.severity,
    ai.title,
    ai.description,
    ai.source_meetings,
    ai.confidence_score,
    ai.resolved,
    ai.created_at,
    ai.meeting_id,
    p.name AS project_name
   FROM (public.ai_insights ai
     LEFT JOIN public.projects p ON ((ai.project_id = p.id)));


--
-- Name: ai_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    version character varying(50) NOT NULL,
    model_type character varying(100) NOT NULL,
    description text,
    config jsonb,
    performance_metrics jsonb,
    is_active boolean DEFAULT true,
    deployment_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id integer,
    source_document_id text,
    title text NOT NULL,
    description text,
    assignee text,
    status text DEFAULT 'open'::text NOT NULL,
    due_date date,
    created_by text DEFAULT 'ai'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_capability_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_capability_actions (
    capability_id uuid NOT NULL,
    action_id uuid NOT NULL
);


--
-- Name: app_commands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_commands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module text NOT NULL,
    command_key text NOT NULL,
    label text,
    description text,
    source_action_ids uuid[],
    created_at timestamp with time zone DEFAULT now(),
    confidence_score numeric DEFAULT 1.0
);


--
-- Name: app_crawl_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_crawl_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_app text NOT NULL,
    module text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    crawler_version text,
    notes text
);


--
-- Name: app_functional_capabilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_functional_capabilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    domain text NOT NULL,
    name text NOT NULL,
    description text
);


--
-- Name: app_page_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_page_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_page uuid,
    to_url text,
    link_text text
);


--
-- Name: app_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    crawl_session_id uuid,
    name text NOT NULL,
    url text NOT NULL,
    page_id text NOT NULL,
    category text,
    title text,
    h1 text,
    screenshot_path text,
    dom_path text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: app_parity_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_parity_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    crawl_session_id uuid,
    compared_app text,
    module text,
    parity_score numeric,
    missing_features jsonb,
    missing_actions jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: app_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL
);


--
-- Name: app_schedule_bulk_operations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_schedule_bulk_operations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    command_key text NOT NULL,
    task_ids uuid[] NOT NULL,
    payload jsonb,
    executed_at timestamp with time zone DEFAULT now()
);


--
-- Name: app_schedule_task_hierarchy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_schedule_task_hierarchy (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_task_id uuid,
    child_task_id uuid,
    sort_order integer NOT NULL
);


--
-- Name: app_state_transitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_state_transitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_state text,
    to_state text,
    triggered_by_action uuid,
    conditions text
);


--
-- Name: app_system_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_system_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_id uuid,
    label text,
    action_type text,
    trigger_type text,
    http_method text,
    endpoint text,
    payload_schema jsonb,
    response_schema jsonb,
    affects_resource text,
    created_at timestamp with time zone DEFAULT now(),
    permission_scope text,
    source text
);


--
-- Name: app_system_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_system_states (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource text NOT NULL,
    state text NOT NULL,
    description text
);


--
-- Name: app_ui_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_ui_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_id uuid,
    component_type text NOT NULL,
    selector text,
    text_content text,
    html_tag text,
    classes text,
    role text,
    index_on_page integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: app_ui_table_columns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_ui_table_columns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ui_table_id uuid,
    name text NOT NULL,
    inferred_type text,
    editable boolean,
    computed boolean,
    required boolean,
    "position" integer
);


--
-- Name: app_ui_tables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_ui_tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_id uuid,
    table_index integer,
    name text,
    css_classes text,
    html_id text,
    row_count integer
);


--
-- Name: asrs_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asrs_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    ordinal integer NOT NULL,
    block_type text NOT NULL,
    source_text text,
    html text,
    meta jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT asrs_blocks_block_type_check CHECK ((block_type = ANY (ARRAY['paragraph'::text, 'note'::text, 'table'::text, 'figure'::text, 'equation'::text, 'heading'::text])))
);


--
-- Name: asrs_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asrs_configurations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_name character varying(100) NOT NULL,
    asrs_type character varying(50) NOT NULL,
    max_height_ft numeric(5,2),
    container_types text[],
    typical_applications text[],
    cost_multiplier numeric(4,2) DEFAULT 1.0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: asrs_decision_matrix; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asrs_decision_matrix (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asrs_type text NOT NULL,
    container_type text NOT NULL,
    max_depth_ft double precision NOT NULL,
    max_spacing_ft double precision NOT NULL,
    figure_number integer NOT NULL,
    sprinkler_count integer NOT NULL,
    sprinkler_numbering text,
    page_number integer NOT NULL,
    title text,
    requires_flue_spaces boolean DEFAULT false,
    requires_vertical_barriers boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: asrs_logic_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asrs_logic_cards (
    id bigint NOT NULL,
    doc text DEFAULT 'FMDS0834'::text NOT NULL,
    version text DEFAULT '2024-07'::text NOT NULL,
    clause_id text,
    page integer,
    purpose text NOT NULL,
    preconditions jsonb NOT NULL,
    inputs jsonb NOT NULL,
    decision jsonb NOT NULL,
    citations jsonb NOT NULL,
    related_table_ids text[],
    related_figure_ids text[],
    inserted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    section_id uuid
);


--
-- Name: asrs_logic_cards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.asrs_logic_cards ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.asrs_logic_cards_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: asrs_protection_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asrs_protection_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    asrs_type text,
    container_wall text,
    container_material text,
    container_top text,
    commodity_class text,
    ceiling_height_min numeric,
    ceiling_height_max numeric,
    sprinkler_scheme text,
    k_factor numeric,
    density_gpm_ft2 numeric,
    area_ft2 numeric,
    pressure_psi numeric,
    notes text
);


--
-- Name: asrs_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asrs_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    number text NOT NULL,
    title text NOT NULL,
    parent_id uuid,
    slug text NOT NULL,
    sort_key integer NOT NULL
);


--
-- Name: attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id bigint,
    attached_to_table text,
    attached_to_id text,
    file_name text,
    url text,
    uploaded_by uuid DEFAULT auth.uid(),
    uploaded_at timestamp with time zone DEFAULT now()
);


--
-- Name: billing_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_periods (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    project_id bigint,
    period_number integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_closed boolean DEFAULT false,
    closed_date timestamp with time zone,
    closed_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: block_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.block_embeddings (
    block_id uuid NOT NULL,
    embedding public.vector(1536)
);


--
-- Name: briefing_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.briefing_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    briefing_id uuid,
    project_id bigint,
    started_at timestamp with time zone DEFAULT now(),
    finished_at timestamp with time zone,
    status text,
    token_usage jsonb,
    input_doc_ids text[],
    error text
);


--
-- Name: budget_line_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_line_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    budget_line_id uuid NOT NULL,
    project_id bigint NOT NULL,
    field_name text NOT NULL,
    old_value text,
    new_value text,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    change_type text NOT NULL,
    notes text,
    CONSTRAINT budget_line_history_change_type_check CHECK ((change_type = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text])))
);


--
-- Name: budget_line_item_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_line_item_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id bigint NOT NULL,
    budget_line_item_id uuid NOT NULL,
    budget_code text NOT NULL,
    description text NOT NULL,
    event_type text NOT NULL,
    changed_field text,
    from_value text,
    to_value text,
    performed_by uuid,
    performed_by_name text,
    performed_at timestamp with time zone DEFAULT now() NOT NULL,
    source text DEFAULT 'app'::text NOT NULL,
    notes text,
    CONSTRAINT budget_line_item_history_event_type_check CHECK ((event_type = ANY (ARRAY['BUDGET_LINE_ITEM_CREATED'::text, 'BUDGET_LINE_ITEM_UPDATED'::text, 'BUDGET_LINE_ITEM_DELETED'::text, 'BUDGET_FORECAST_CREATED'::text])))
);


--
-- Name: budget_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id bigint NOT NULL,
    sub_job_id uuid,
    cost_code_id text NOT NULL,
    cost_type_id uuid NOT NULL,
    description text,
    original_amount numeric(15,2) DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sub_job_key uuid GENERATED ALWAYS AS (COALESCE(sub_job_id, '00000000-0000-0000-0000-000000000000'::uuid)) STORED,
    project_budget_code_id uuid,
    updated_by uuid,
    quantity numeric(15,4),
    unit_of_measure text,
    unit_cost numeric(15,4),
    default_ftc_method character varying(50) DEFAULT 'automatic'::character varying,
    default_curve_id uuid,
    forecasting_enabled boolean DEFAULT true NOT NULL,
    CONSTRAINT budget_lines_default_ftc_method_check CHECK (((default_ftc_method)::text = ANY ((ARRAY['manual'::character varying, 'automatic'::character varying, 'lump_sum'::character varying, 'monitored_resources'::character varying])::text[])))
);


--
-- Name: budget_mod_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_mod_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    budget_modification_id uuid NOT NULL,
    project_id bigint NOT NULL,
    sub_job_id uuid,
    cost_code_id text NOT NULL,
    cost_type_id uuid NOT NULL,
    amount numeric(15,2) DEFAULT 0 NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: budget_modification_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_modification_lines (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    budget_modification_id uuid NOT NULL,
    budget_line_id uuid NOT NULL,
    amount numeric(15,2) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: budget_modifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_modifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id bigint NOT NULL,
    number text NOT NULL,
    title text NOT NULL,
    reason text,
    status text DEFAULT 'draft'::text NOT NULL,
    effective_date date,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT budget_modifications_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'approved'::text, 'void'::text])))
);


--
-- Name: budget_view_columns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_view_columns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    view_id uuid NOT NULL,
    column_key character varying(100) NOT NULL,
    display_name character varying(255),
    display_order integer DEFAULT 0 NOT NULL,
    width integer,
    is_visible boolean DEFAULT true,
    is_locked boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: budget_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    is_default boolean DEFAULT false,
    is_system boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: change_event_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_event_approvals (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    change_event_id uuid NOT NULL,
    approver_id uuid NOT NULL,
    approval_status character varying(50) DEFAULT 'Pending'::character varying NOT NULL,
    comments text,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT change_event_approvals_status_check CHECK (((approval_status)::text = ANY ((ARRAY['Pending'::character varying, 'Approved'::character varying, 'Rejected'::character varying])::text[])))
);


--
-- Name: change_event_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_event_attachments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    change_event_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    file_size bigint NOT NULL,
    mime_type character varying(100) NOT NULL,
    uploaded_by uuid,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: change_event_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_event_history (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    change_event_id uuid NOT NULL,
    field_name character varying(100) NOT NULL,
    old_value text,
    new_value text,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    change_type character varying(50) NOT NULL,
    CONSTRAINT change_event_history_type_check CHECK (((change_type)::text = ANY ((ARRAY['create'::character varying, 'update'::character varying, 'delete'::character varying, 'status_change'::character varying])::text[])))
);


--
-- Name: change_event_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_event_line_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    change_event_id uuid NOT NULL,
    budget_code_id uuid,
    description text,
    vendor_id uuid,
    contract_id bigint,
    unit_of_measure character varying(50),
    quantity numeric(15,4),
    unit_cost numeric(15,2),
    revenue_rom numeric(15,2),
    cost_rom numeric(15,2),
    non_committed_cost numeric(15,2),
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: change_event_rfq_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_event_rfq_attachments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    rfq_id uuid,
    rfq_response_id uuid,
    file_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    file_size bigint NOT NULL,
    mime_type character varying(100) NOT NULL,
    uploaded_by uuid NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT change_event_rfq_attachments_parent_check CHECK (((rfq_id IS NOT NULL) OR (rfq_response_id IS NOT NULL)))
);


--
-- Name: change_event_rfq_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_event_rfq_responses (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    rfq_id uuid NOT NULL,
    line_item_id uuid,
    responder_company_id uuid,
    responder_contact_id uuid,
    unit_price numeric(15,2) DEFAULT 0 NOT NULL,
    extended_amount numeric(15,2) DEFAULT 0 NOT NULL,
    notes text,
    status character varying(50) DEFAULT 'Draft'::character varying NOT NULL,
    submitted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT change_event_rfq_responses_status_check CHECK (((status)::text = ANY ((ARRAY['Draft'::character varying, 'Submitted'::character varying, 'Accepted'::character varying, 'Rejected'::character varying])::text[])))
);


--
-- Name: change_event_rfqs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_event_rfqs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    project_id bigint NOT NULL,
    change_event_id uuid NOT NULL,
    rfq_number character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'Draft'::character varying NOT NULL,
    assigned_company_id uuid,
    assigned_contact_id uuid,
    include_attachments boolean DEFAULT true NOT NULL,
    due_date date DEFAULT (now() + '7 days'::interval) NOT NULL,
    sent_at timestamp with time zone,
    response_received_at timestamp with time zone,
    estimated_total_amount numeric(15,2) DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    CONSTRAINT change_event_rfqs_status_check CHECK (((status)::text = ANY ((ARRAY['Draft'::character varying, 'Sent'::character varying, 'Awaiting Response'::character varying, 'Response Received'::character varying, 'Closed'::character varying, 'Cancelled'::character varying])::text[])))
);


--
-- Name: change_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_events (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    project_id bigint NOT NULL,
    number character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    reason character varying(100),
    scope character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'Open'::character varying NOT NULL,
    origin character varying(100),
    expecting_revenue boolean DEFAULT true NOT NULL,
    line_item_revenue_source character varying(100),
    prime_contract_id bigint,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp with time zone,
    CONSTRAINT change_events_scope_check CHECK (((scope)::text = ANY ((ARRAY['TBD'::character varying, 'In Scope'::character varying, 'Out of Scope'::character varying, 'Allowance'::character varying])::text[]))),
    CONSTRAINT change_events_status_check CHECK (((status)::text = ANY ((ARRAY['Open'::character varying, 'Pending Approval'::character varying, 'Approved'::character varying, 'Rejected'::character varying, 'Closed'::character varying, 'Converted'::character varying])::text[]))),
    CONSTRAINT change_events_type_check CHECK (((type)::text = ANY ((ARRAY['Owner Change'::character varying, 'Design Change'::character varying, 'Allowance'::character varying, 'Scope Gap'::character varying, 'Unforeseen Condition'::character varying, 'Value Engineering'::character varying, 'Owner Requested'::character varying, 'Constructability Issue'::character varying])::text[])))
);


--
-- Name: change_order_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_order_approvals (
    id bigint NOT NULL,
    change_order_id bigint NOT NULL,
    approver uuid,
    role text,
    decision text,
    comment text,
    decided_at timestamp with time zone DEFAULT now()
);


--
-- Name: change_order_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.change_order_approvals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: change_order_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.change_order_approvals_id_seq OWNED BY public.change_order_approvals.id;


--
-- Name: change_order_costs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_order_costs (
    id bigint NOT NULL,
    change_order_id bigint NOT NULL,
    labor numeric DEFAULT 0,
    materials numeric DEFAULT 0,
    subcontractor numeric DEFAULT 0,
    overhead numeric DEFAULT 0,
    contingency numeric DEFAULT 0,
    total_cost numeric GENERATED ALWAYS AS (((((labor + materials) + subcontractor) + overhead) + contingency)) STORED,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: change_order_costs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.change_order_costs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: change_order_costs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.change_order_costs_id_seq OWNED BY public.change_order_costs.id;


--
-- Name: change_order_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_order_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    change_order_id bigint NOT NULL,
    project_id bigint NOT NULL,
    sub_job_id uuid,
    cost_code_id text NOT NULL,
    cost_type_id uuid NOT NULL,
    amount numeric(15,2) DEFAULT 0 NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: change_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_orders (
    id bigint NOT NULL,
    project_id bigint NOT NULL,
    co_number text,
    title text,
    description text,
    status text DEFAULT 'proposed'::text,
    submitted_by uuid DEFAULT auth.uid(),
    submitted_at timestamp with time zone,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    apply_vertical_markup boolean DEFAULT true
);


--
-- Name: change_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.change_orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: change_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.change_orders_id_seq OWNED BY public.change_orders.id;


--
-- Name: chat_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid,
    role text NOT NULL,
    content text NOT NULL,
    sources jsonb DEFAULT '[]'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chat_history_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    role text NOT NULL,
    content text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);


--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    title text,
    context jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: chat_thread_attachment_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_thread_attachment_files (
    attachment_id text NOT NULL,
    storage_path text NOT NULL,
    thread_id text,
    filename text,
    mime_type text,
    size_bytes bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_thread_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_thread_attachments (
    id text NOT NULL,
    thread_id text,
    filename text,
    mime_type text,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_thread_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_thread_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id text NOT NULL,
    item_ids text[] NOT NULL,
    feedback text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_thread_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_thread_items (
    id text NOT NULL,
    thread_id text NOT NULL,
    item_type text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_threads (
    id text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chats (
    id character varying NOT NULL
);


--
-- Name: chunks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chunks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    document_id uuid NOT NULL,
    content text NOT NULL,
    embedding public.vector(1536),
    chunk_index integer NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    token_count integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    document_title text
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text,
    company_id uuid,
    status text,
    code text
);


--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.clients ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.clients_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: code_examples; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.code_examples (
    id bigint NOT NULL,
    url character varying NOT NULL,
    chunk_number integer NOT NULL,
    content text NOT NULL,
    summary text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_id text NOT NULL,
    embedding public.vector(1536),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: code_examples_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.code_examples_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: code_examples_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.code_examples_id_seq OWNED BY public.code_examples.id;


--
-- Name: commitment_change_order_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commitment_change_order_lines (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    commitment_change_order_id uuid NOT NULL,
    budget_line_id uuid,
    cost_code_id text,
    cost_type_id uuid,
    description text,
    amount numeric(15,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id integer NOT NULL,
    contract_number text NOT NULL,
    contract_company_id uuid,
    title text,
    status text DEFAULT 'Draft'::text NOT NULL,
    executed boolean DEFAULT false NOT NULL,
    default_retainage_percent numeric(5,2),
    assigned_to uuid,
    bill_to text,
    payment_terms text,
    ship_to text,
    ship_via text,
    description text,
    accounting_method text DEFAULT 'unit-quantity'::text,
    contract_date date,
    delivery_date date,
    signed_po_received_date date,
    issued_on_date date,
    is_private boolean DEFAULT true,
    non_admin_user_ids uuid[] DEFAULT '{}'::uuid[],
    allow_non_admin_view_sov_items boolean DEFAULT false,
    invoice_contact_ids uuid[] DEFAULT '{}'::uuid[],
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: subcontracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subcontracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_number text NOT NULL,
    contract_company_id uuid,
    title text,
    status text DEFAULT 'Draft'::text NOT NULL,
    executed boolean DEFAULT false NOT NULL,
    default_retainage_percent numeric(5,2),
    description text,
    inclusions text,
    exclusions text,
    start_date text,
    estimated_completion_date text,
    actual_completion_date text,
    contract_date text,
    signed_contract_received_date text,
    issued_on_date text,
    is_private boolean DEFAULT true,
    non_admin_user_ids uuid[] DEFAULT '{}'::uuid[],
    allow_non_admin_view_sov_items boolean DEFAULT false,
    invoice_contact_ids uuid[] DEFAULT '{}'::uuid[],
    project_id integer NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT subcontracts_default_retainage_percent_check CHECK (((default_retainage_percent >= (0)::numeric) AND (default_retainage_percent <= (100)::numeric))),
    CONSTRAINT subcontracts_status_check CHECK ((status = ANY (ARRAY['Draft'::text, 'Sent'::text, 'Pending'::text, 'Approved'::text, 'Executed'::text, 'Closed'::text, 'Void'::text])))
);


--
-- Name: commitments_unified; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.commitments_unified AS
 SELECT 'subcontract'::text AS commitment_type,
    subcontracts.id,
    subcontracts.project_id,
    subcontracts.contract_number,
    subcontracts.title,
    subcontracts.description,
    subcontracts.status,
    subcontracts.executed,
    subcontracts.contract_date,
    subcontracts.contract_company_id,
    subcontracts.created_at,
    subcontracts.updated_at,
    subcontracts.deleted_at,
    subcontracts.created_by,
    subcontracts.is_private,
    subcontracts.allow_non_admin_view_sov_items,
    subcontracts.non_admin_user_ids,
    subcontracts.invoice_contact_ids,
    subcontracts.issued_on_date,
    subcontracts.default_retainage_percent
   FROM public.subcontracts
UNION ALL
 SELECT 'purchase_order'::text AS commitment_type,
    purchase_orders.id,
    purchase_orders.project_id,
    purchase_orders.contract_number,
    purchase_orders.title,
    purchase_orders.description,
    purchase_orders.status,
    purchase_orders.executed,
    (purchase_orders.contract_date)::text AS contract_date,
    purchase_orders.contract_company_id,
    purchase_orders.created_at,
    purchase_orders.updated_at,
    purchase_orders.deleted_at,
    purchase_orders.created_by,
    purchase_orders.is_private,
    purchase_orders.allow_non_admin_view_sov_items,
    purchase_orders.non_admin_user_ids,
    purchase_orders.invoice_contact_ids,
    (purchase_orders.issued_on_date)::text AS issued_on_date,
    purchase_orders.default_retainage_percent
   FROM public.purchase_orders;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    website text,
    address text,
    state text,
    city text,
    title text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    currency_symbol character varying(10) DEFAULT '$'::character varying,
    currency_code character varying(3) DEFAULT 'USD'::character varying,
    type text,
    logo_url text,
    status text DEFAULT 'active'::text,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: company_context; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_context (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    goals jsonb DEFAULT '[]'::jsonb,
    strategic_initiatives jsonb DEFAULT '[]'::jsonb,
    okrs jsonb DEFAULT '[]'::jsonb,
    resource_constraints jsonb DEFAULT '[]'::jsonb,
    policies jsonb DEFAULT '[]'::jsonb,
    org_structure jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: contract_billing_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_billing_periods (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    contract_id uuid NOT NULL,
    period_number integer NOT NULL,
    billing_date date NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    work_completed numeric(15,2) DEFAULT 0 NOT NULL,
    stored_materials numeric(15,2) DEFAULT 0 NOT NULL,
    current_payment_due numeric(15,2) GENERATED ALWAYS AS ((work_completed + stored_materials)) STORED,
    retention_percentage numeric(5,2) DEFAULT 0 NOT NULL,
    retention_amount numeric(15,2) DEFAULT 0 NOT NULL,
    net_payment_due numeric(15,2) GENERATED ALWAYS AS (((work_completed + stored_materials) - retention_amount)) STORED,
    status text DEFAULT 'draft'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contract_billing_periods_retention_amount_check CHECK ((retention_amount >= (0)::numeric)),
    CONSTRAINT contract_billing_periods_retention_percentage_check CHECK (((retention_percentage >= (0)::numeric) AND (retention_percentage <= (100)::numeric))),
    CONSTRAINT contract_billing_periods_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'paid'::text]))),
    CONSTRAINT contract_billing_periods_stored_materials_check CHECK ((stored_materials >= (0)::numeric)),
    CONSTRAINT contract_billing_periods_work_completed_check CHECK ((work_completed >= (0)::numeric)),
    CONSTRAINT valid_billing_date CHECK ((billing_date >= start_date)),
    CONSTRAINT valid_date_range CHECK ((start_date <= end_date))
);


--
-- Name: contract_change_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_change_orders (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    contract_id uuid NOT NULL,
    change_order_number text NOT NULL,
    description text NOT NULL,
    amount numeric(15,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    requested_by uuid,
    requested_date date DEFAULT CURRENT_DATE NOT NULL,
    approved_by uuid,
    approved_date date,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contract_change_orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT valid_approval_date CHECK ((((status = 'approved'::text) AND (approved_date IS NOT NULL) AND (approved_by IS NOT NULL)) OR ((status = 'rejected'::text) AND (approved_date IS NOT NULL) AND (approved_by IS NOT NULL) AND (rejection_reason IS NOT NULL)) OR (status = 'pending'::text)))
);


--
-- Name: contract_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_documents (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    contract_id uuid NOT NULL,
    document_name text NOT NULL,
    document_type text NOT NULL,
    file_path text NOT NULL,
    file_size bigint,
    mime_type text,
    uploaded_by uuid,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    is_current_version boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contract_documents_document_type_check CHECK ((document_type = ANY (ARRAY['contract'::text, 'amendment'::text, 'insurance'::text, 'bond'::text, 'lien_waiver'::text, 'change_order'::text, 'invoice'::text, 'other'::text])))
);


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contracts (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    project_id bigint NOT NULL,
    client_id bigint NOT NULL,
    contract_number text,
    title text NOT NULL,
    status text,
    erp_status text,
    executed boolean DEFAULT false,
    original_contract_amount numeric(14,2) DEFAULT 0,
    approved_change_orders numeric(14,2) DEFAULT 0,
    revised_contract_amount numeric(14,2) DEFAULT 0,
    pending_change_orders numeric(14,2) DEFAULT 0,
    draft_change_orders numeric(14,2) DEFAULT 0,
    invoiced_amount numeric(14,2) DEFAULT 0,
    payments_received numeric(14,2) DEFAULT 0,
    percent_paid numeric(6,2) GENERATED ALWAYS AS (
CASE
    WHEN (revised_contract_amount > (0)::numeric) THEN ((payments_received / revised_contract_amount) * (100)::numeric)
    ELSE (0)::numeric
END) STORED,
    remaining_balance numeric(14,2) DEFAULT 0,
    private boolean DEFAULT false,
    attachment_count integer DEFAULT 0,
    notes text,
    retention_percentage numeric(5,2) DEFAULT 0,
    apply_vertical_markup boolean DEFAULT true,
    owner_client_id integer,
    contractor_id integer,
    architect_engineer_id integer,
    description text,
    start_date date,
    estimated_completion_date date,
    substantial_completion_date date,
    actual_completion_date date,
    signed_contract_received_date date,
    contract_termination_date date,
    inclusions text,
    exclusions text,
    default_retainage numeric(5,2) DEFAULT 10,
    CONSTRAINT contracts_default_retainage_check CHECK (((default_retainage >= (0)::numeric) AND (default_retainage <= (100)::numeric))),
    CONSTRAINT contracts_retention_percentage_check CHECK (((retention_percentage >= (0)::numeric) AND (retention_percentage <= (100)::numeric)))
);


--
-- Name: owner_invoice_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.owner_invoice_line_items (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    invoice_id bigint NOT NULL,
    description text,
    category text,
    approved_amount numeric(14,2),
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: owner_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.owner_invoices (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    contract_id bigint NOT NULL,
    invoice_number text,
    period_start date,
    period_end date,
    status text,
    submitted_at timestamp with time zone,
    approved_at timestamp with time zone,
    billing_period_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_transactions (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    contract_id bigint NOT NULL,
    invoice_id bigint,
    payment_date date NOT NULL,
    amount numeric(14,2) NOT NULL,
    method text,
    reference_number text
);


--
-- Name: pcco_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pcco_line_items (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    pcco_id bigint NOT NULL,
    pco_id bigint,
    cost_code text,
    description text,
    quantity numeric(14,2),
    uom text,
    unit_cost numeric(14,2),
    line_amount numeric(14,2) GENERATED ALWAYS AS ((quantity * unit_cost)) STORED
);


--
-- Name: pco_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pco_line_items (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    pco_id bigint NOT NULL,
    change_event_line_item_id bigint,
    cost_code text,
    description text,
    quantity numeric(14,2),
    uom text,
    unit_cost numeric(14,2),
    line_amount numeric(14,2) GENERATED ALWAYS AS ((quantity * unit_cost)) STORED
);


--
-- Name: prime_contract_change_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prime_contract_change_orders (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    contract_id bigint NOT NULL,
    pcco_number text,
    title text NOT NULL,
    status text,
    executed boolean DEFAULT false,
    submitted_at timestamp with time zone,
    approved_at timestamp with time zone,
    total_amount numeric(14,2)
);


--
-- Name: prime_contract_sovs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prime_contract_sovs (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    contract_id bigint NOT NULL,
    cost_code text,
    description text,
    quantity numeric(14,2) DEFAULT 1,
    uom text,
    unit_cost numeric(14,2) DEFAULT 0,
    line_amount numeric(14,2) GENERATED ALWAYS AS ((quantity * unit_cost)) STORED,
    sort_order integer DEFAULT 0
);


--
-- Name: prime_potential_change_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prime_potential_change_orders (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    project_id bigint NOT NULL,
    contract_id bigint NOT NULL,
    change_event_id bigint,
    pco_number text,
    title text NOT NULL,
    status text,
    reason text,
    scope text,
    submitted_at timestamp with time zone,
    approved_at timestamp with time zone,
    notes text
);


--
-- Name: contract_financial_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.contract_financial_summary AS
 WITH original_sov AS (
         SELECT prime_contract_sovs.contract_id,
            COALESCE(sum(prime_contract_sovs.line_amount), (0)::numeric) AS original_contract_amount
           FROM public.prime_contract_sovs
          GROUP BY prime_contract_sovs.contract_id
        ), approved_pccos AS (
         SELECT prime_contract_change_orders.contract_id,
            COALESCE(sum(pcco_line_items.line_amount), (0)::numeric) AS approved_change_orders
           FROM (public.prime_contract_change_orders
             JOIN public.pcco_line_items ON ((pcco_line_items.pcco_id = prime_contract_change_orders.id)))
          WHERE (prime_contract_change_orders.status = 'Approved'::text)
          GROUP BY prime_contract_change_orders.contract_id
        ), pending_pcos AS (
         SELECT prime_potential_change_orders.contract_id,
            COALESCE(sum(pco_line_items.line_amount), (0)::numeric) AS pending_change_orders
           FROM (public.prime_potential_change_orders
             JOIN public.pco_line_items ON ((pco_line_items.pco_id = prime_potential_change_orders.id)))
          WHERE (prime_potential_change_orders.status = 'Pending'::text)
          GROUP BY prime_potential_change_orders.contract_id
        ), draft_pcos AS (
         SELECT prime_potential_change_orders.contract_id,
            COALESCE(sum(pco_line_items.line_amount), (0)::numeric) AS draft_change_orders
           FROM (public.prime_potential_change_orders
             JOIN public.pco_line_items ON ((pco_line_items.pco_id = prime_potential_change_orders.id)))
          WHERE (prime_potential_change_orders.status = 'Draft'::text)
          GROUP BY prime_potential_change_orders.contract_id
        ), invoiced AS (
         SELECT owner_invoices.contract_id,
            COALESCE(sum(owner_invoice_line_items.approved_amount), (0)::numeric) AS invoiced_amount
           FROM (public.owner_invoices
             JOIN public.owner_invoice_line_items ON ((owner_invoice_line_items.invoice_id = owner_invoices.id)))
          WHERE (owner_invoices.status = 'Approved'::text)
          GROUP BY owner_invoices.contract_id
        ), payments AS (
         SELECT payment_transactions.contract_id,
            COALESCE(sum(payment_transactions.amount), (0)::numeric) AS payments_received
           FROM public.payment_transactions
          GROUP BY payment_transactions.contract_id
        )
 SELECT c.id AS contract_id,
    c.contract_number,
    c.client_id,
    c.title,
    c.status,
    c.erp_status,
    c.executed,
    c.private,
    os.original_contract_amount,
    ap.approved_change_orders,
    (os.original_contract_amount + ap.approved_change_orders) AS revised_contract_amount,
    pp.pending_change_orders,
    dp.draft_change_orders,
    inv.invoiced_amount,
    pay.payments_received,
        CASE
            WHEN ((os.original_contract_amount + ap.approved_change_orders) > (0)::numeric) THEN round(((pay.payments_received / (os.original_contract_amount + ap.approved_change_orders)) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS percent_paid,
    ((os.original_contract_amount + ap.approved_change_orders) - pay.payments_received) AS remaining_balance
   FROM ((((((public.contracts c
     LEFT JOIN original_sov os ON ((os.contract_id = c.id)))
     LEFT JOIN approved_pccos ap ON ((ap.contract_id = c.id)))
     LEFT JOIN pending_pcos pp ON ((pp.contract_id = c.id)))
     LEFT JOIN draft_pcos dp ON ((dp.contract_id = c.id)))
     LEFT JOIN invoiced inv ON ((inv.contract_id = c.id)))
     LEFT JOIN payments pay ON ((pay.contract_id = c.id)));


--
-- Name: contract_financial_summary_mv; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.contract_financial_summary_mv AS
 WITH original_sov AS (
         SELECT prime_contract_sovs.contract_id,
            COALESCE(sum(prime_contract_sovs.line_amount), (0)::numeric) AS original_contract_amount
           FROM public.prime_contract_sovs
          GROUP BY prime_contract_sovs.contract_id
        ), approved_pccos AS (
         SELECT prime_contract_change_orders.contract_id,
            COALESCE(sum(pcco_line_items.line_amount), (0)::numeric) AS approved_change_orders
           FROM (public.prime_contract_change_orders
             JOIN public.pcco_line_items ON ((pcco_line_items.pcco_id = prime_contract_change_orders.id)))
          WHERE (prime_contract_change_orders.status = 'Approved'::text)
          GROUP BY prime_contract_change_orders.contract_id
        ), pending_pcos AS (
         SELECT prime_potential_change_orders.contract_id,
            COALESCE(sum(pco_line_items.line_amount), (0)::numeric) AS pending_change_orders
           FROM (public.prime_potential_change_orders
             JOIN public.pco_line_items ON ((pco_line_items.pco_id = prime_potential_change_orders.id)))
          WHERE (prime_potential_change_orders.status = 'Pending'::text)
          GROUP BY prime_potential_change_orders.contract_id
        ), draft_pcos AS (
         SELECT prime_potential_change_orders.contract_id,
            COALESCE(sum(pco_line_items.line_amount), (0)::numeric) AS draft_change_orders
           FROM (public.prime_potential_change_orders
             JOIN public.pco_line_items ON ((pco_line_items.pco_id = prime_potential_change_orders.id)))
          WHERE (prime_potential_change_orders.status = 'Draft'::text)
          GROUP BY prime_potential_change_orders.contract_id
        ), invoiced AS (
         SELECT owner_invoices.contract_id,
            COALESCE(sum(owner_invoice_line_items.approved_amount), (0)::numeric) AS invoiced_amount
           FROM (public.owner_invoices
             JOIN public.owner_invoice_line_items ON ((owner_invoice_line_items.invoice_id = owner_invoices.id)))
          WHERE (owner_invoices.status = 'Approved'::text)
          GROUP BY owner_invoices.contract_id
        ), payments AS (
         SELECT payment_transactions.contract_id,
            COALESCE(sum(payment_transactions.amount), (0)::numeric) AS payments_received
           FROM public.payment_transactions
          GROUP BY payment_transactions.contract_id
        )
 SELECT c.id AS contract_id,
    c.contract_number,
    c.client_id,
    c.project_id,
    c.title,
    c.status,
    c.erp_status,
    c.executed,
    c.private,
    COALESCE(os.original_contract_amount, (0)::numeric) AS original_contract_amount,
    COALESCE(ap.approved_change_orders, (0)::numeric) AS approved_change_orders,
    (COALESCE(os.original_contract_amount, (0)::numeric) + COALESCE(ap.approved_change_orders, (0)::numeric)) AS revised_contract_amount,
    COALESCE(pp.pending_change_orders, (0)::numeric) AS pending_change_orders,
    COALESCE(dp.draft_change_orders, (0)::numeric) AS draft_change_orders,
    COALESCE(inv.invoiced_amount, (0)::numeric) AS invoiced_amount,
    COALESCE(pay.payments_received, (0)::numeric) AS payments_received,
        CASE
            WHEN ((COALESCE(os.original_contract_amount, (0)::numeric) + COALESCE(ap.approved_change_orders, (0)::numeric)) > (0)::numeric) THEN round(((COALESCE(pay.payments_received, (0)::numeric) / (COALESCE(os.original_contract_amount, (0)::numeric) + COALESCE(ap.approved_change_orders, (0)::numeric))) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS percent_paid,
    ((COALESCE(os.original_contract_amount, (0)::numeric) + COALESCE(ap.approved_change_orders, (0)::numeric)) - COALESCE(pay.payments_received, (0)::numeric)) AS remaining_balance
   FROM ((((((public.contracts c
     LEFT JOIN original_sov os ON ((os.contract_id = c.id)))
     LEFT JOIN approved_pccos ap ON ((ap.contract_id = c.id)))
     LEFT JOIN pending_pcos pp ON ((pp.contract_id = c.id)))
     LEFT JOIN draft_pcos dp ON ((dp.contract_id = c.id)))
     LEFT JOIN invoiced inv ON ((inv.contract_id = c.id)))
     LEFT JOIN payments pay ON ((pay.contract_id = c.id)))
  WITH NO DATA;


--
-- Name: contract_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_line_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    contract_id uuid NOT NULL,
    line_number integer NOT NULL,
    description text NOT NULL,
    cost_code_id bigint,
    quantity numeric(15,4) DEFAULT 0,
    unit_of_measure text,
    unit_cost numeric(15,2) DEFAULT 0,
    total_cost numeric(15,2) GENERATED ALWAYS AS ((quantity * unit_cost)) STORED,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contract_line_items_quantity_check CHECK ((quantity >= (0)::numeric)),
    CONSTRAINT contract_line_items_unit_cost_check CHECK ((unit_cost >= (0)::numeric))
);


--
-- Name: contract_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_payments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    contract_id uuid NOT NULL,
    billing_period_id uuid,
    payment_number text NOT NULL,
    payment_date date NOT NULL,
    amount numeric(15,2) NOT NULL,
    payment_type text DEFAULT 'progress'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    check_number text,
    reference_number text,
    approved_by uuid,
    approved_date date,
    paid_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contract_payments_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT contract_payments_payment_type_check CHECK ((payment_type = ANY (ARRAY['progress'::text, 'retention'::text, 'final'::text, 'advance'::text]))),
    CONSTRAINT contract_payments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'paid'::text, 'cancelled'::text]))),
    CONSTRAINT valid_approval_date CHECK ((((status = ANY (ARRAY['approved'::text, 'paid'::text])) AND (approved_date IS NOT NULL) AND (approved_by IS NOT NULL)) OR (status = ANY (ARRAY['pending'::text, 'cancelled'::text])))),
    CONSTRAINT valid_paid_date CHECK ((((status = 'paid'::text) AND (paid_date IS NOT NULL)) OR (status = ANY (ARRAY['pending'::text, 'approved'::text, 'cancelled'::text]))))
);


--
-- Name: contract_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_snapshots (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    contract_id uuid NOT NULL,
    snapshot_date timestamp with time zone DEFAULT now() NOT NULL,
    snapshot_data jsonb NOT NULL,
    created_by uuid,
    reason text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contract_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_views (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    company_id uuid NOT NULL,
    view_name text NOT NULL,
    description text,
    filters jsonb,
    columns jsonb,
    sort_order jsonb,
    is_default boolean DEFAULT false NOT NULL,
    is_shared boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.contracts ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.contracts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    session_id character varying NOT NULL,
    user_id uuid NOT NULL,
    title character varying,
    created_at timestamp with time zone DEFAULT now(),
    last_message_at timestamp with time zone DEFAULT now(),
    is_archived boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issues (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    project_id bigint NOT NULL,
    title text NOT NULL,
    description text,
    category public.issue_category NOT NULL,
    severity public.issue_severity DEFAULT 'Medium'::public.issue_severity,
    status public.issue_status DEFAULT 'Open'::public.issue_status,
    reported_by text,
    date_reported date DEFAULT CURRENT_DATE,
    date_resolved date,
    direct_cost numeric(12,2) DEFAULT 0,
    indirect_cost numeric(12,2) DEFAULT 0,
    total_cost numeric(12,2) GENERATED ALWAYS AS ((direct_cost + indirect_cost)) STORED,
    notes text
);


--
-- Name: cost_by_category; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.cost_by_category AS
 SELECT category,
    count(*) AS issue_count,
    sum(total_cost) AS total_cost,
    round(avg(total_cost), 2) AS avg_cost
   FROM public.issues
  GROUP BY category
  ORDER BY (sum(total_cost)) DESC NULLS LAST;


--
-- Name: cost_code_division_updates_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cost_code_division_updates_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    division_id uuid NOT NULL,
    new_title text,
    updated_count integer,
    changed_at timestamp with time zone DEFAULT now(),
    changed_by text
);


--
-- Name: cost_code_divisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cost_code_divisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    title text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cost_code_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cost_code_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    category text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: cost_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cost_codes (
    id text NOT NULL,
    division_id uuid NOT NULL,
    division_title text,
    title text,
    status text DEFAULT 'True'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: cost_codes_with_division_title; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.cost_codes_with_division_title AS
 SELECT c.id,
    c.division_id,
    c.division_title,
    c.title,
    c.status,
    c.created_at,
    c.updated_at,
    d.title AS division_title_current
   FROM (public.cost_codes c
     LEFT JOIN public.cost_code_divisions d ON ((c.division_id = d.id)));


--
-- Name: cost_factors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cost_factors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    factor_name character varying(100) NOT NULL,
    factor_type character varying(50) NOT NULL,
    base_cost_per_unit numeric(10,2),
    unit_type character varying(50),
    complexity_multiplier numeric(4,2) DEFAULT 1.0,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: cost_forecasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cost_forecasts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    budget_item_id uuid,
    forecast_date date NOT NULL,
    forecast_to_complete numeric(15,2) NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: crawled_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crawled_pages (
    id bigint NOT NULL,
    url character varying NOT NULL,
    chunk_number integer NOT NULL,
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_id text NOT NULL,
    embedding public.vector(1536),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    category text
);


--
-- Name: crawled_pages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crawled_pages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crawled_pages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crawled_pages_id_seq OWNED BY public.crawled_pages.id;


--
-- Name: daily_log_equipment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_log_equipment (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    daily_log_id uuid,
    equipment_name character varying(255) NOT NULL,
    hours_operated numeric(5,2),
    hours_idle numeric(5,2),
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: daily_log_manpower; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_log_manpower (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    daily_log_id uuid,
    company_id uuid,
    trade character varying(100),
    workers_count integer NOT NULL,
    hours_worked numeric(5,2),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: daily_log_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_log_notes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    daily_log_id uuid,
    category character varying(100),
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: daily_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    project_id bigint,
    log_date date NOT NULL,
    weather_conditions jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: daily_recaps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_recaps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    recap_date date NOT NULL,
    date_range_start date NOT NULL,
    date_range_end date NOT NULL,
    recap_text text NOT NULL,
    recap_html text,
    meeting_count integer,
    project_count integer,
    meetings_analyzed jsonb,
    risks jsonb,
    decisions jsonb,
    blockers jsonb,
    commitments jsonb,
    wins jsonb,
    sent_email boolean DEFAULT false,
    sent_teams boolean DEFAULT false,
    sent_at timestamp with time zone,
    recipients jsonb,
    generation_time_seconds double precision,
    model_used character varying(50) DEFAULT 'gpt-4o'::character varying
);


--
-- Name: database_tables_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.database_tables_catalog (
    schema_name text NOT NULL,
    table_name text NOT NULL,
    row_count bigint,
    rls_enabled boolean,
    primary_keys text,
    table_comment text,
    created_at timestamp with time zone DEFAULT now(),
    category text
);


--
-- Name: decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.decisions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    metadata_id text NOT NULL,
    segment_id uuid,
    source_chunk_id uuid,
    description text NOT NULL,
    rationale text,
    owner_name text,
    owner_email text,
    project_id bigint,
    client_id bigint,
    effective_date date,
    impact text,
    status text DEFAULT 'active'::text NOT NULL,
    embedding public.vector(1536),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    project_ids integer[] DEFAULT '{}'::integer[],
    CONSTRAINT decisions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'superseded'::text, 'reversed'::text])))
);


--
-- Name: design_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.design_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    recommendation_type character varying(100) NOT NULL,
    description text NOT NULL,
    potential_savings numeric(12,2),
    priority_level character varying(20) NOT NULL,
    implementation_effort character varying(20),
    technical_details jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: direct_cost_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.direct_cost_line_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    direct_cost_id uuid NOT NULL,
    budget_code_id uuid NOT NULL,
    description text,
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    uom character varying(50) DEFAULT 'LOT'::character varying,
    unit_cost numeric(15,2) NOT NULL,
    line_total numeric(15,2) GENERATED ALWAYS AS ((quantity * unit_cost)) STORED,
    line_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: direct_costs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.direct_costs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id bigint NOT NULL,
    cost_type text NOT NULL,
    date date NOT NULL,
    vendor_id uuid,
    employee_id bigint,
    invoice_number character varying(255),
    status text DEFAULT 'Draft'::text NOT NULL,
    description text,
    terms character varying(255),
    received_date date,
    paid_date date,
    total_amount numeric(15,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by_user_id uuid NOT NULL,
    updated_by_user_id uuid NOT NULL,
    is_deleted boolean DEFAULT false,
    CONSTRAINT direct_costs_cost_type_check CHECK ((cost_type = ANY (ARRAY['Expense'::text, 'Invoice'::text, 'Subcontractor Invoice'::text]))),
    CONSTRAINT direct_costs_status_check CHECK ((status = ANY (ARRAY['Draft'::text, 'Approved'::text, 'Rejected'::text, 'Paid'::text])))
);


--
-- Name: discrepancies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discrepancies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submittal_id uuid NOT NULL,
    specification_id uuid,
    document_id uuid,
    discrepancy_type character varying(100) NOT NULL,
    severity character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    spec_requirement text,
    submittal_content text,
    suggested_resolution text,
    confidence_score numeric(3,2),
    location_in_doc jsonb,
    status character varying(50) DEFAULT 'open'::character varying,
    identified_by character varying(50) DEFAULT 'ai'::character varying,
    ai_model_version character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT discrepancies_severity_check CHECK (((severity)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))),
    CONSTRAINT discrepancies_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'acknowledged'::character varying, 'resolved'::character varying, 'waived'::character varying, 'disputed'::character varying])::text[])))
);


--
-- Name: distribution_group_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.distribution_group_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    person_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: distribution_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.distribution_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id integer NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT distribution_groups_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


--
-- Name: document_chunks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_chunks (
    chunk_id text NOT NULL,
    document_id text NOT NULL,
    chunk_index integer NOT NULL,
    text text NOT NULL,
    metadata jsonb,
    content_hash text,
    embedding public.vector(1536),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: document_executive_summaries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_executive_summaries (
    id integer NOT NULL,
    document_id uuid NOT NULL,
    project_id integer,
    executive_summary text NOT NULL,
    critical_path_items integer DEFAULT 0,
    total_insights integer DEFAULT 0,
    confidence_average numeric(3,2) DEFAULT 0.0,
    budget_discussions jsonb DEFAULT '[]'::jsonb,
    cost_implications numeric,
    revenue_impact numeric,
    financial_decisions_count integer DEFAULT 0,
    delay_risks jsonb DEFAULT '[]'::jsonb,
    critical_deadlines jsonb DEFAULT '[]'::jsonb,
    timeline_concerns_count integer DEFAULT 0,
    relationship_changes jsonb DEFAULT '[]'::jsonb,
    performance_issues jsonb DEFAULT '[]'::jsonb,
    stakeholder_feedback_count integer DEFAULT 0,
    decisions_made jsonb DEFAULT '[]'::jsonb,
    competitive_intel jsonb DEFAULT '[]'::jsonb,
    strategic_pivots jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: document_executive_summaries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_executive_summaries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_executive_summaries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_executive_summaries_id_seq OWNED BY public.document_executive_summaries.id;


--
-- Name: document_group_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_group_access (
    document_id text NOT NULL,
    group_id uuid NOT NULL,
    access_level text DEFAULT 'viewer'::text NOT NULL
);


--
-- Name: document_metadata_manual_only; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.document_metadata_manual_only AS
 SELECT id,
    title,
    url,
    created_at,
    type,
    source,
    content,
    summary,
    participants,
    tags,
    category,
    fireflies_id,
    fireflies_link,
    project_id,
    project,
    date,
    duration_minutes,
    bullet_points,
    action_items,
    file_id,
    overview,
    description,
    status,
    access_level,
    captured_at,
    content_hash,
    participants_array,
    phase,
    audio,
    video
   FROM public.document_metadata
  WHERE (fireflies_id ~~* '%MANUAL%'::text);


--
-- Name: document_metadata_view_no_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.document_metadata_view_no_summary WITH (security_invoker='on') AS
 SELECT title,
    date,
    project_id,
    project,
    fireflies_id,
    fireflies_link
   FROM public.document_metadata;


--
-- Name: document_rows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_rows (
    id integer NOT NULL,
    dataset_id text,
    row_data jsonb
);


--
-- Name: document_rows_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_rows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_rows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_rows_id_seq OWNED BY public.document_rows.id;


--
-- Name: document_user_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_user_access (
    document_id text NOT NULL,
    user_id uuid NOT NULL,
    access_level text DEFAULT 'viewer'::text NOT NULL
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    title text,
    source text,
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    file_id text NOT NULL,
    fireflies_id text,
    processing_status character varying(20) DEFAULT 'pending'::character varying,
    project_id bigint,
    project text,
    file_date timestamp with time zone,
    embedding public.vector,
    url text,
    storage_object_id uuid,
    project_ids integer[] DEFAULT '{}'::integer[]
);


--
-- Name: documents_ordered_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.documents_ordered_view WITH (security_invoker='on') AS
 SELECT id,
    title,
    file_date AS date,
    project_id,
    project,
    fireflies_id,
    created_at,
    updated_at
   FROM public.documents;


--
-- Name: erp_sync_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.erp_sync_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id bigint NOT NULL,
    erp_system text,
    last_job_cost_sync timestamp with time zone,
    last_direct_cost_sync timestamp with time zone,
    sync_status text,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fm_global_figures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fm_global_figures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    figure_number integer NOT NULL,
    title text NOT NULL,
    clean_caption text NOT NULL,
    normalized_summary text NOT NULL,
    figure_type text NOT NULL,
    asrs_type text NOT NULL,
    container_type text,
    max_depth_ft numeric,
    max_depth_m numeric,
    max_spacing_ft numeric,
    max_spacing_m numeric,
    ceiling_height_ft numeric,
    aisle_width_ft numeric,
    related_tables integer[],
    applicable_commodities text[],
    system_requirements jsonb,
    special_conditions text[],
    machine_readable_claims jsonb,
    callouts_labels text[],
    axis_titles text[],
    axis_units text[],
    embedded_tables jsonb,
    footnotes text[],
    page_number integer,
    section_reference text,
    embedding public.vector(1536),
    search_keywords text[],
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    section_references text[],
    image text,
    CONSTRAINT fm_global_figures_asrs_type_check CHECK ((asrs_type = ANY (ARRAY['All'::text, 'Shuttle'::text, 'Mini-Load'::text, 'Top-Loading'::text, 'Vertically-Enclosed'::text]))),
    CONSTRAINT fm_global_figures_container_type_check CHECK ((container_type = ANY (ARRAY['Closed-Top'::text, 'Open-Top'::text, 'Noncombustible'::text, 'Plastic'::text, 'Mixed'::text]))),
    CONSTRAINT fm_global_figures_figure_type_check CHECK ((figure_type = ANY (ARRAY['Navigation/Decision Tree'::text, 'System Diagram'::text, 'Sprinkler Layout'::text, 'Protection Scheme'::text, 'Configuration'::text, 'Installation Detail'::text, 'Special Arrangement'::text])))
);


--
-- Name: figure_statistics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.figure_statistics AS
 SELECT 'Total Figures'::text AS metric,
    (count(*))::text AS value
   FROM public.fm_global_figures
UNION ALL
 SELECT 'Shuttle ASRS Figures'::text AS metric,
    (count(*))::text AS value
   FROM public.fm_global_figures
  WHERE (fm_global_figures.asrs_type = 'Shuttle'::text)
UNION ALL
 SELECT 'Mini-Load ASRS Figures'::text AS metric,
    (count(*))::text AS value
   FROM public.fm_global_figures
  WHERE (fm_global_figures.asrs_type = 'Mini-Load'::text)
UNION ALL
 SELECT 'Sprinkler Layout Figures'::text AS metric,
    (count(*))::text AS value
   FROM public.fm_global_figures
  WHERE (fm_global_figures.figure_type = 'Sprinkler Layout'::text)
UNION ALL
 SELECT 'Open-Top Container Figures'::text AS metric,
    (count(*))::text AS value
   FROM public.fm_global_figures
  WHERE (fm_global_figures.container_type = 'Open-Top'::text)
UNION ALL
 SELECT 'Closed-Top Container Figures'::text AS metric,
    (count(*))::text AS value
   FROM public.fm_global_figures
  WHERE (fm_global_figures.container_type = 'Closed-Top'::text);


--
-- Name: figure_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.figure_summary AS
 SELECT figure_number,
    title,
    normalized_summary,
    figure_type,
    asrs_type,
    container_type,
        CASE
            WHEN (max_depth_ft IS NOT NULL) THEN (max_depth_ft || ' ft'::text)
            ELSE 'Variable'::text
        END AS max_depth,
        CASE
            WHEN (max_spacing_ft IS NOT NULL) THEN (max_spacing_ft || ' ft'::text)
            ELSE 'Variable'::text
        END AS max_spacing,
    related_tables,
    page_number,
    array_to_string(search_keywords, ', '::text) AS keywords,
    array_length(search_keywords, 1) AS keyword_count
   FROM public.fm_global_figures
  ORDER BY figure_number;


--
-- Name: files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.files (
    id character varying(191) NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    metadata jsonb,
    embedding public.vector,
    url text,
    status text,
    project_id integer,
    title text,
    category text
);


--
-- Name: financial_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_number character varying(50) NOT NULL,
    contract_type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    company_id uuid,
    subcontractor_id uuid,
    project_id bigint,
    status character varying(50) DEFAULT 'draft'::character varying,
    contract_amount numeric(15,2) DEFAULT 0,
    change_order_amount numeric(15,2) DEFAULT 0,
    revised_amount numeric(15,2) GENERATED ALWAYS AS ((contract_amount + change_order_amount)) STORED,
    start_date date,
    end_date date,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: fireflies_ingestion_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fireflies_ingestion_jobs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    fireflies_id text NOT NULL,
    metadata_id text,
    stage text DEFAULT 'pending'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_attempt_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fireflies_ingestion_jobs_stage_check CHECK ((stage = ANY (ARRAY['pending'::text, 'raw_ingested'::text, 'segmented'::text, 'chunked'::text, 'embedded'::text, 'structured_extracted'::text, 'done'::text, 'error'::text])))
);


--
-- Name: fm_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fm_blocks (
    id character varying NOT NULL,
    section_id character varying NOT NULL,
    block_type character varying NOT NULL,
    ordinal integer NOT NULL,
    source_text text NOT NULL,
    html text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb,
    page_reference integer,
    inline_figures integer[],
    inline_tables text[],
    search_vector tsvector,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: fm_cost_factors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fm_cost_factors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    component_type text NOT NULL,
    factor_name text NOT NULL,
    base_cost_per_unit numeric,
    unit_type text,
    complexity_multiplier numeric DEFAULT 1.0,
    region_adjustments jsonb DEFAULT '{}'::jsonb,
    last_updated timestamp without time zone DEFAULT now()
);


--
-- Name: fm_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fm_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    filename text,
    content text,
    document_type text,
    embedding public.vector(1536),
    related_table_ids text[],
    source text,
    processing_status text DEFAULT 'pending'::text,
    processing_notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: fm_form_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fm_form_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text,
    user_input jsonb NOT NULL,
    parsed_requirements jsonb,
    matched_table_ids text[],
    similarity_scores numeric[],
    selected_configuration jsonb,
    contact_info jsonb,
    project_details jsonb,
    lead_score integer,
    lead_status text DEFAULT 'new'::text,
    cost_analysis jsonb,
    recommendations jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT chk_lead_score CHECK (((lead_score >= 0) AND (lead_score <= 100))),
    CONSTRAINT chk_lead_status CHECK ((lead_status = ANY (ARRAY['new'::text, 'qualified'::text, 'contacted'::text, 'converted'::text, 'lost'::text])))
);


--
-- Name: fm_global_tables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fm_global_tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_number integer NOT NULL,
    table_id text NOT NULL,
    title text NOT NULL,
    asrs_type text NOT NULL,
    system_type text NOT NULL,
    protection_scheme text NOT NULL,
    commodity_types text[] DEFAULT '{}'::text[],
    ceiling_height_min_ft numeric,
    ceiling_height_max_ft numeric,
    storage_height_max_ft numeric,
    aisle_width_requirements text,
    rack_configuration jsonb,
    sprinkler_specifications jsonb,
    design_parameters jsonb,
    special_conditions text[],
    applicable_figures integer[],
    estimated_page_number integer,
    extraction_status text DEFAULT 'pending'::text,
    raw_data jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    section_references text[],
    container_type text,
    figures uuid,
    image text,
    CONSTRAINT chk_extraction_status CHECK ((extraction_status = ANY (ARRAY['pending'::text, 'extracted'::text, 'vectorized'::text, 'verified'::text])))
);


--
-- Name: fm_optimization_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fm_optimization_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_name text NOT NULL,
    description text,
    trigger_conditions jsonb,
    suggested_changes jsonb,
    estimated_savings_min numeric,
    estimated_savings_max numeric,
    implementation_difficulty text,
    is_active boolean DEFAULT true,
    priority_level integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: fm_optimization_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fm_optimization_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    form_submission_id uuid,
    suggestion_type text NOT NULL,
    title text NOT NULL,
    description text,
    original_config jsonb,
    suggested_config jsonb,
    estimated_savings numeric,
    implementation_effort text,
    risk_level text,
    technical_justification text,
    applicable_codes text[],
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: fm_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fm_sections (
    id character varying NOT NULL,
    number character varying NOT NULL,
    title character varying NOT NULL,
    slug character varying NOT NULL,
    sort_key integer NOT NULL,
    parent_id character varying,
    page_start integer NOT NULL,
    page_end integer NOT NULL,
    section_path text[],
    breadcrumb_display text[],
    is_visible boolean DEFAULT true,
    section_type character varying DEFAULT 'section'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: fm_sprinkler_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fm_sprinkler_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_id text NOT NULL,
    ceiling_height_ft numeric NOT NULL,
    storage_height_ft numeric,
    aisle_width_ft numeric,
    sprinkler_count integer,
    k_factor numeric,
    k_factor_type text,
    pressure_psi numeric,
    pressure_bar numeric,
    orientation text,
    response_type text,
    temperature_rating integer,
    design_area_sqft numeric,
    spacing_ft numeric,
    coverage_type text,
    special_conditions text[],
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: fm_table_vectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fm_table_vectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_id text NOT NULL,
    embedding public.vector(1536) NOT NULL,
    content_text text NOT NULL,
    content_type text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: fm_text_chunks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fm_text_chunks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doc_id text DEFAULT 'FMDS0834'::text NOT NULL,
    doc_version text DEFAULT '2024-07'::text NOT NULL,
    page_number integer,
    clause_id text,
    section_path text[],
    content_type text DEFAULT 'text'::text NOT NULL,
    raw_text text NOT NULL,
    chunk_summary text,
    chunk_size integer GENERATED ALWAYS AS (length(raw_text)) STORED,
    search_keywords text[],
    topics text[],
    extracted_requirements text[],
    compliance_type text,
    related_figures integer[],
    related_tables text[],
    related_sections text[],
    embedding public.vector(1536),
    cost_impact text,
    savings_opportunities text[],
    complexity_score integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT fm_text_chunks_complexity_score_check CHECK (((complexity_score >= 1) AND (complexity_score <= 10))),
    CONSTRAINT fm_text_chunks_cost_impact_check CHECK ((cost_impact = ANY (ARRAY['HIGH'::text, 'MEDIUM'::text, 'LOW'::text])))
);


--
-- Name: forecasting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forecasting (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    budget_item_id uuid NOT NULL,
    forecast_to_complete numeric(14,2),
    projected_costs numeric(14,2),
    estimated_completion_cost numeric(14,2),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: forecasting_curves; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forecasting_curves (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    curve_type character varying(50) NOT NULL,
    description text,
    curve_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT forecasting_curves_curve_type_check CHECK (((curve_type)::text = ANY ((ARRAY['linear'::character varying, 's_curve'::character varying, 'custom'::character varying])::text[])))
);


--
-- Name: group_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_members (
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text
);


--
-- Name: groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ingestion_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingestion_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fireflies_id text,
    document_id text,
    status text DEFAULT 'pending'::text NOT NULL,
    error text,
    content_hash text,
    started_at timestamp with time zone DEFAULT now(),
    finished_at timestamp with time zone
);


--
-- Name: initiatives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.initiatives (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    status text DEFAULT 'active'::text,
    priority text DEFAULT 'medium'::text,
    completion_percentage integer DEFAULT 0,
    owner text,
    team_members text[],
    stakeholders text[],
    start_date date,
    target_completion date,
    actual_completion date,
    keywords text[],
    aliases text[],
    budget numeric,
    budget_used numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    notes text,
    documentation_links text[],
    related_project_ids integer[],
    CONSTRAINT initiatives_category_check CHECK ((category = ANY (ARRAY['hiring'::text, 'operations'::text, 'process_improvement'::text, 'training'::text, 'technology'::text, 'compliance'::text, 'marketing'::text, 'finance'::text, 'other'::text]))),
    CONSTRAINT initiatives_completion_percentage_check CHECK (((completion_percentage >= 0) AND (completion_percentage <= 100))),
    CONSTRAINT initiatives_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT initiatives_status_check CHECK ((status = ANY (ARRAY['active'::text, 'on_hold'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: initiatives_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.initiatives_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: initiatives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.initiatives_id_seq OWNED BY public.initiatives.id;


--
-- Name: issues_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.issues_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: issues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.issues_id_seq OWNED BY public.issues.id;


--
-- Name: meeting_segments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_segments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    metadata_id text NOT NULL,
    segment_index integer NOT NULL,
    title text,
    start_index integer NOT NULL,
    end_index integer NOT NULL,
    summary text,
    decisions jsonb DEFAULT '[]'::jsonb NOT NULL,
    risks jsonb DEFAULT '[]'::jsonb NOT NULL,
    tasks jsonb DEFAULT '[]'::jsonb NOT NULL,
    summary_embedding public.vector(1536),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    project_ids integer[] DEFAULT '{}'::integer[]
);


--
-- Name: memories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.memories (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536)
);


--
-- Name: memories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.memories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: memories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.memories_id_seq OWNED BY public.memories.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    computed_session_user_id uuid GENERATED ALWAYS AS ((split_part((session_id)::text, '~'::text, 1))::uuid) STORED,
    session_id character varying NOT NULL,
    message jsonb NOT NULL,
    message_data text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.messages ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: nods_page; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nods_page (
    id bigint NOT NULL,
    parent_page_id bigint,
    path text NOT NULL,
    checksum text,
    meta jsonb,
    type text,
    source text
);


--
-- Name: nods_page_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nods_page_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nods_page_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nods_page_id_seq OWNED BY public.nods_page.id;


--
-- Name: nods_page_section; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nods_page_section (
    id bigint NOT NULL,
    page_id bigint NOT NULL,
    content text,
    token_count integer,
    embedding public.vector(1536),
    slug text,
    heading text
);


--
-- Name: nods_page_section_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nods_page_section_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nods_page_section_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nods_page_section_id_seq OWNED BY public.nods_page_section.id;


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id bigint NOT NULL,
    project_id bigint NOT NULL,
    title text,
    body text,
    created_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    archived boolean DEFAULT false
);


--
-- Name: notes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.notes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.notes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: open_tasks_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.open_tasks_view AS
 SELECT t.id,
    t.project_id,
    t.source_document_id,
    t.title,
    t.description,
    t.assignee,
    t.status,
    t.due_date,
    t.created_by,
    t.metadata,
    t.created_at,
    t.updated_at,
    p.name AS project_name,
    dm.title AS source_document_title
   FROM ((public.ai_tasks t
     LEFT JOIN public.projects p ON ((p.id = t.project_id)))
     LEFT JOIN public.document_metadata dm ON ((dm.id = t.source_document_id)))
  WHERE (t.status = ANY (ARRAY['open'::text, 'in_progress'::text]));


--
-- Name: opportunities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunities (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    metadata_id text NOT NULL,
    segment_id uuid,
    source_chunk_id uuid,
    description text NOT NULL,
    type text,
    owner_name text,
    owner_email text,
    project_id bigint,
    client_id bigint,
    next_step text,
    status text DEFAULT 'open'::text NOT NULL,
    embedding public.vector(1536),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    project_ids integer[] DEFAULT '{}'::integer[],
    CONSTRAINT opportunities_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_review'::text, 'approved'::text, 'rejected'::text, 'implemented'::text])))
);


--
-- Name: optimization_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.optimization_rules (
    id integer NOT NULL,
    condition_from jsonb,
    condition_to jsonb,
    cost_impact numeric,
    description text,
    embedding public.vector(1536)
);


--
-- Name: optimization_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.optimization_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: optimization_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.optimization_rules_id_seq OWNED BY public.optimization_rules.id;


--
-- Name: owner_invoice_line_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.owner_invoice_line_items ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.owner_invoice_line_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: owner_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.owner_invoices ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.owner_invoices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parts (
    id character varying NOT NULL,
    "messageId" character varying NOT NULL,
    type character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    text_text text,
    reasoning_text text,
    "file_mediaType" character varying,
    file_filename character varying,
    file_url character varying,
    "source_url_sourceId" character varying,
    source_url_url character varying,
    source_url_title character varying,
    "source_document_sourceId" character varying,
    "source_document_mediaType" character varying,
    source_document_title character varying,
    source_document_filename character varying,
    "tool_toolCallId" character varying,
    tool_state character varying,
    "tool_errorText" character varying,
    "tool_getWeatherInformation_input" jsonb,
    "tool_getWeatherInformation_output" jsonb,
    "tool_getLocation_input" jsonb,
    "tool_getLocation_output" jsonb,
    data_weather_id character varying,
    data_weather_location character varying,
    data_weather_weather character varying,
    data_weather_temperature real,
    "providerMetadata" jsonb,
    CONSTRAINT data_weather_fields_required CHECK (
CASE
    WHEN ((type)::text = 'data-weather'::text) THEN ((data_weather_location IS NOT NULL) AND (data_weather_weather IS NOT NULL) AND (data_weather_temperature IS NOT NULL))
    ELSE true
END),
    CONSTRAINT file_fields_required_if_type_is_file CHECK (
CASE
    WHEN ((type)::text = 'file'::text) THEN (("file_mediaType" IS NOT NULL) AND (file_url IS NOT NULL))
    ELSE true
END),
    CONSTRAINT reasoning_text_required_if_type_is_reasoning CHECK (
CASE
    WHEN ((type)::text = 'reasoning'::text) THEN (reasoning_text IS NOT NULL)
    ELSE true
END),
    CONSTRAINT source_document_fields_required_if_type_is_source_document CHECK (
CASE
    WHEN ((type)::text = 'source_document'::text) THEN (("source_document_sourceId" IS NOT NULL) AND ("source_document_mediaType" IS NOT NULL) AND (source_document_title IS NOT NULL))
    ELSE true
END),
    CONSTRAINT source_url_fields_required_if_type_is_source_url CHECK (
CASE
    WHEN ((type)::text = 'source_url'::text) THEN (("source_url_sourceId" IS NOT NULL) AND (source_url_url IS NOT NULL))
    ELSE true
END),
    CONSTRAINT text_text_required_if_type_is_text CHECK (
CASE
    WHEN ((type)::text = 'text'::text) THEN (text_text IS NOT NULL)
    ELSE true
END),
    CONSTRAINT "tool_getLocation_fields_required" CHECK (
CASE
    WHEN ((type)::text = 'tool-getLocation'::text) THEN (("tool_toolCallId" IS NOT NULL) AND (tool_state IS NOT NULL))
    ELSE true
END),
    CONSTRAINT "tool_getWeatherInformation_fields_required" CHECK (
CASE
    WHEN ((type)::text = 'tool-getWeatherInformation'::text) THEN (("tool_toolCallId" IS NOT NULL) AND (tool_state IS NOT NULL))
    ELSE true
END)
);


--
-- Name: payment_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.payment_transactions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.payment_transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pcco_line_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pcco_line_items ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pcco_line_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pco_line_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pco_line_items ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pco_line_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: people; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.people (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone_mobile text,
    phone_business text,
    job_title text,
    company_id uuid,
    person_type text NOT NULL,
    status text DEFAULT 'active'::text,
    address_line1 text,
    address_line2 text,
    city text,
    state text,
    zip text,
    country text DEFAULT 'US'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    profile_photo_url text,
    business_unit text,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT people_person_type_check CHECK ((person_type = ANY (ARRAY['user'::text, 'contact'::text]))),
    CONSTRAINT people_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


--
-- Name: permission_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permission_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    scope text DEFAULT 'project'::text,
    rules_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT permission_templates_scope_check CHECK ((scope = ANY (ARRAY['project'::text, 'company'::text, 'global'::text])))
);


--
-- Name: prime_contract_change_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.prime_contract_change_orders ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.prime_contract_change_orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: prime_contract_sovs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.prime_contract_sovs ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.prime_contract_sovs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: prime_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prime_contracts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    project_id bigint NOT NULL,
    contract_number text NOT NULL,
    title text NOT NULL,
    vendor_id uuid,
    description text,
    status public.prime_contract_status_v2 DEFAULT 'draft'::public.prime_contract_status_v2 NOT NULL,
    original_contract_value numeric(15,2) DEFAULT 0 NOT NULL,
    revised_contract_value numeric(15,2) DEFAULT 0 NOT NULL,
    start_date date,
    end_date date,
    retention_percentage numeric(5,2) DEFAULT 0,
    payment_terms text,
    billing_schedule text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    client_id bigint,
    executed_at timestamp with time zone,
    contractor_id uuid,
    architect_engineer_id uuid,
    contract_company_id uuid,
    substantial_completion_date date,
    actual_completion_date date,
    signed_contract_received_date date,
    contract_termination_date date,
    is_private boolean DEFAULT false NOT NULL,
    inclusions text,
    exclusions text,
    executed boolean DEFAULT false NOT NULL,
    CONSTRAINT prime_contracts_original_contract_value_check CHECK ((original_contract_value >= (0)::numeric)),
    CONSTRAINT prime_contracts_retention_percentage_check CHECK (((retention_percentage >= (0)::numeric) AND (retention_percentage <= (100)::numeric))),
    CONSTRAINT prime_contracts_revised_contract_value_check CHECK ((revised_contract_value >= (0)::numeric)),
    CONSTRAINT valid_date_range CHECK (((end_date IS NULL) OR (start_date IS NULL) OR (end_date >= start_date)))
);


--
-- Name: prime_potential_change_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.prime_potential_change_orders ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.prime_potential_change_orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: processing_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processing_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    job_type text NOT NULL,
    status text DEFAULT 'queued'::text,
    priority integer DEFAULT 5,
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    error_message text,
    config jsonb DEFAULT '{}'::jsonb,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT processing_queue_job_type_check CHECK ((job_type = ANY (ARRAY['chunk'::text, 'embed'::text, 'index'::text]))),
    CONSTRAINT processing_queue_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'processing'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: procore_capture_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procore_capture_sessions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    capture_type text NOT NULL,
    status text DEFAULT 'in_progress'::text NOT NULL,
    total_screenshots integer DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT procore_capture_sessions_capture_type_check CHECK ((capture_type = ANY (ARRAY['public_docs'::text, 'authenticated_app'::text, 'manual'::text]))),
    CONSTRAINT procore_capture_sessions_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: procore_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procore_modules (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    category text NOT NULL,
    app_path text,
    docs_url text,
    complexity text,
    priority text,
    estimated_build_weeks integer,
    key_features jsonb DEFAULT '[]'::jsonb,
    dependencies jsonb DEFAULT '[]'::jsonb,
    notes text,
    rebuild_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text,
    CONSTRAINT procore_modules_complexity_check CHECK ((complexity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'very_high'::text]))),
    CONSTRAINT procore_modules_priority_check CHECK ((priority = ANY (ARRAY['must_have'::text, 'nice_to_have'::text, 'skip'::text])))
);


--
-- Name: procore_screenshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procore_screenshots (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    session_id uuid,
    name text NOT NULL,
    category text NOT NULL,
    subcategory text,
    source_url text,
    page_title text,
    fullpage_path text,
    viewport_path text,
    fullpage_storage_path text,
    viewport_storage_path text,
    viewport_width integer,
    viewport_height integer,
    fullpage_height integer,
    file_size_bytes integer,
    description text,
    detected_components jsonb DEFAULT '[]'::jsonb,
    color_palette jsonb DEFAULT '[]'::jsonb,
    ai_analysis jsonb,
    captured_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    new_url text
);


--
-- Name: procore_capture_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.procore_capture_summary WITH (security_invoker='on') AS
 SELECT m.category,
    m.name AS module_name,
    m.display_name,
    m.priority,
    m.complexity,
    count(DISTINCT s.id) AS screenshot_count,
    max(s.captured_at) AS last_captured
   FROM (public.procore_modules m
     LEFT JOIN public.procore_screenshots s ON ((s.name ~~ (('%'::text || m.name) || '%'::text))))
  GROUP BY m.category, m.name, m.display_name, m.priority, m.complexity
  ORDER BY m.category, m.priority;


--
-- Name: procore_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procore_components (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    screenshot_id uuid,
    component_type text NOT NULL,
    component_name text,
    x integer,
    y integer,
    width integer,
    height integer,
    local_path text,
    storage_path text,
    styles jsonb,
    content text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: procore_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procore_features (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    module_id uuid,
    name text NOT NULL,
    description text,
    include_in_rebuild boolean DEFAULT true,
    complexity text,
    estimated_hours integer,
    ai_enhancement_possible boolean DEFAULT false,
    ai_enhancement_notes text,
    screenshot_ids uuid[] DEFAULT '{}'::uuid[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    slug text,
    procore_tool_url text,
    priority text,
    status text DEFAULT 'not_started'::text,
    match_score numeric,
    page_count integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now(),
    category text,
    tabs text,
    CONSTRAINT procore_features_complexity_check CHECK ((complexity = ANY (ARRAY['trivial'::text, 'easy'::text, 'medium'::text, 'hard'::text, 'very_hard'::text])))
);


--
-- Name: procore_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procore_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feature_id uuid,
    name text NOT NULL,
    slug text NOT NULL,
    page_type text,
    procore_url text,
    screenshot_path text,
    dom_path text,
    metadata_path text,
    alleato_route text,
    alleato_url text,
    status text DEFAULT 'not_started'::text,
    implementation_notes text,
    button_count integer,
    form_field_count integer,
    table_column_count integer,
    linear_issue_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: procore_rebuild_estimate; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.procore_rebuild_estimate AS
 SELECT category,
    count(*) AS module_count,
    sum(
        CASE
            WHEN (priority = 'must_have'::text) THEN estimated_build_weeks
            ELSE 0
        END) AS must_have_weeks,
    sum(
        CASE
            WHEN (priority = 'nice_to_have'::text) THEN estimated_build_weeks
            ELSE 0
        END) AS nice_to_have_weeks,
    sum(estimated_build_weeks) AS total_weeks
   FROM public.procore_modules
  WHERE (priority <> 'skip'::text)
  GROUP BY category
  ORDER BY category;


--
-- Name: project; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text,
    job_number text,
    start_date date,
    est_completion date,
    est_revenue numeric,
    est_profit numeric,
    address text,
    onedrive text,
    phase text,
    state text,
    client_id bigint,
    category text,
    team_members text[] DEFAULT '{}'::text[],
    completion_percentage integer DEFAULT 0,
    budget numeric(12,2),
    budget_used numeric(12,2) DEFAULT 0,
    client text,
    summary text,
    summary_metadata jsonb DEFAULT '{}'::jsonb,
    summary_updated_at timestamp with time zone,
    health_score numeric(5,2),
    health_status text,
    access text,
    archived boolean DEFAULT false NOT NULL,
    archived_by uuid,
    archived_at timestamp with time zone,
    erp_system text,
    erp_last_job_cost_sync timestamp with time zone,
    erp_last_direct_cost_sync timestamp with time zone,
    erp_sync_status text,
    project_manager bigint,
    type text,
    project_number character varying(50),
    stakeholders jsonb DEFAULT '[]'::jsonb,
    keywords text[],
    budget_locked boolean DEFAULT false,
    budget_locked_at timestamp with time zone,
    budget_locked_by uuid,
    work_scope text,
    project_sector text,
    delivery_method text,
    name_code text,
    CONSTRAINT projects_delivery_method_check CHECK (((delivery_method IS NULL) OR (delivery_method = ANY (ARRAY['Design-Bid-Build'::text, 'Design-Build'::text, 'Construction Management at Risk'::text, 'Integrated Project Delivery'::text])))),
    CONSTRAINT projects_health_status_check CHECK ((health_status = ANY (ARRAY['Healthy'::text, 'At Risk'::text, 'Needs Attention'::text, 'Critical'::text]))),
    CONSTRAINT projects_project_sector_check CHECK (((project_sector IS NULL) OR (project_sector = ANY (ARRAY['Commercial'::text, 'Industrial'::text, 'Infrastructure'::text, 'Healthcare'::text, 'Institutional'::text, 'Residential'::text])))),
    CONSTRAINT projects_work_scope_check CHECK (((work_scope IS NULL) OR (work_scope = ANY (ARRAY['Ground-Up Construction'::text, 'Renovation'::text, 'Tenant Improvement'::text, 'Interior Build-Out'::text, 'Maintenance'::text]))))
);


--
-- Name: project_activity_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.project_activity_view AS
 SELECT p.id AS project_id,
    p.name,
    COALESCE(count(DISTINCT dm.id), (0)::bigint) AS meeting_count,
    COALESCE(count(DISTINCT
        CASE
            WHEN (t.status = ANY (ARRAY['open'::text, 'in_progress'::text])) THEN t.id
            ELSE NULL::uuid
        END), (0)::bigint) AS open_tasks,
    max(dm.captured_at) AS last_meeting_at,
    max(t.updated_at) AS last_task_update
   FROM ((public.projects p
     LEFT JOIN public.document_metadata dm ON ((dm.project_id = p.id)))
     LEFT JOIN public.ai_tasks t ON ((t.project_id = p.id)))
  GROUP BY p.id, p.name;


--
-- Name: project_briefings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_briefings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    project_id bigint NOT NULL,
    briefing_content text NOT NULL,
    briefing_type character varying(50) DEFAULT 'executive_summary'::character varying,
    source_documents text[] NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    generated_by character varying(100),
    token_count integer,
    version integer DEFAULT 1
);


--
-- Name: project_budget_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_budget_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id bigint NOT NULL,
    sub_job_id uuid,
    cost_code_id text NOT NULL,
    cost_type_id uuid NOT NULL,
    description text NOT NULL,
    description_mode text DEFAULT 'concatenated'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sub_job_key uuid GENERATED ALWAYS AS (COALESCE(sub_job_id, '00000000-0000-0000-0000-000000000000'::uuid)) STORED,
    CONSTRAINT project_budget_codes_description_mode_check CHECK ((description_mode = ANY (ARRAY['concatenated'::text, 'custom'::text])))
);


--
-- Name: project_companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id integer NOT NULL,
    company_id uuid NOT NULL,
    business_phone character varying(30),
    email_address character varying(255),
    primary_contact_id uuid,
    erp_vendor_id character varying(100),
    company_type character varying(50) DEFAULT 'VENDOR'::character varying,
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    logo_url character varying(500),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT project_companies_company_type_check CHECK (((company_type)::text = ANY ((ARRAY['YOUR_COMPANY'::character varying, 'VENDOR'::character varying, 'SUBCONTRACTOR'::character varying, 'SUPPLIER'::character varying, 'CONNECTED_COMPANY'::character varying])::text[]))),
    CONSTRAINT project_companies_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'INACTIVE'::character varying])::text[])))
);


--
-- Name: project_cost_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_cost_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id bigint NOT NULL,
    cost_code_id text NOT NULL,
    cost_type_id uuid DEFAULT 'f3f04b56-0bd1-5c8e-a57b-7c46c5b45b18'::uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: project_directory_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_directory_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id integer NOT NULL,
    person_id uuid NOT NULL,
    permission_template_id uuid,
    role text,
    invited_at timestamp with time zone,
    last_invited_at timestamp with time zone,
    invite_status text DEFAULT 'not_invited'::text,
    invite_token text,
    invite_expires_at timestamp with time zone,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_employee_of_company boolean DEFAULT false,
    is_insurance_manager boolean DEFAULT false,
    employee_id character varying(100),
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT project_directory_memberships_invite_status_check CHECK ((invite_status = ANY (ARRAY['not_invited'::text, 'invited'::text, 'accepted'::text, 'expired'::text]))),
    CONSTRAINT project_directory_memberships_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


--
-- Name: project_health_dashboard; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.project_health_dashboard AS
 SELECT id,
    name,
    current_phase,
    completion_percentage,
    health_score,
    health_status,
    summary,
    summary_updated_at,
        CASE
            WHEN ((budget IS NOT NULL) AND (budget > (0)::numeric) AND (budget_used IS NOT NULL)) THEN (((budget_used)::numeric / (budget)::numeric) * (100)::numeric)
            ELSE (0)::numeric
        END AS budget_utilization,
    "est completion",
    ( SELECT count(*) AS count
           FROM public.ai_insights ai
          WHERE (ai.project_id = p.id)) AS total_insights_count,
    ( SELECT count(*) AS count
           FROM public.ai_insights ai
          WHERE ((ai.project_id = p.id) AND (ai.severity = 'critical'::text) AND ((ai.resolved = 0) OR (ai.resolved IS NULL)))) AS open_critical_items,
    ( SELECT count(*) AS count
           FROM public.documents d
          WHERE ((d.project_id = p.id) AND (d.created_at > (now() - '30 days'::interval)))) AS recent_documents_count,
    ( SELECT max((d.created_at)::date) AS max
           FROM public.documents d
          WHERE (d.project_id = p.id)) AS last_document_date
   FROM public.projects p
  WHERE (name IS NOT NULL)
  ORDER BY
        CASE
            WHEN (health_score IS NULL) THEN (999)::numeric
            ELSE health_score
        END;


--
-- Name: project_health_dashboard_no_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.project_health_dashboard_no_summary WITH (security_invoker='on') AS
 SELECT id,
    name,
    current_phase,
    completion_percentage,
    health_score,
    health_status,
    summary_updated_at,
        CASE
            WHEN ((budget IS NOT NULL) AND (budget > (0)::numeric) AND (budget_used IS NOT NULL)) THEN (((budget_used)::numeric / (budget)::numeric) * (100)::numeric)
            ELSE (0)::numeric
        END AS budget_utilization,
    "est completion",
    ( SELECT count(*) AS count
           FROM public.ai_insights ai
          WHERE (ai.project_id = p.id)) AS total_insights_count,
    ( SELECT count(*) AS count
           FROM public.ai_insights ai
          WHERE ((ai.project_id = p.id) AND (ai.severity = 'critical'::text) AND ((ai.resolved = 0) OR (ai.resolved IS NULL)))) AS open_critical_items,
    ( SELECT count(*) AS count
           FROM public.documents d
          WHERE ((d.project_id = p.id) AND (d.created_at > (now() - '30 days'::interval)))) AS recent_documents_count,
    ( SELECT max((d.created_at)::date) AS max
           FROM public.documents d
          WHERE (d.project_id = p.id)) AS last_document_date
   FROM public.projects p
  WHERE (name IS NOT NULL)
  ORDER BY
        CASE
            WHEN (health_score IS NULL) THEN (999)::numeric
            ELSE health_score
        END;


--
-- Name: project_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.project ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.project_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: project_insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id integer NOT NULL,
    summary text NOT NULL,
    detail jsonb DEFAULT '{}'::jsonb NOT NULL,
    severity text,
    captured_at timestamp with time zone DEFAULT now() NOT NULL,
    source_document_ids text[] DEFAULT ARRAY[]::text[],
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_issue_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.project_issue_summary AS
 SELECT p.id AS project_id,
    p.name AS project_name,
    count(i.id) AS total_issues,
    sum(i.total_cost) AS total_cost,
    round(avg(i.total_cost), 2) AS avg_cost_per_issue
   FROM (public.projects p
     LEFT JOIN public.issues i ON ((p.id = i.project_id)))
  GROUP BY p.id, p.name
  ORDER BY (sum(i.total_cost)) DESC NULLS LAST;


--
-- Name: project_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_resources (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    title text,
    description text,
    type text,
    project_id bigint
);


--
-- Name: project_resources_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.project_resources ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.project_resources_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: project_role_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_role_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_role_id uuid NOT NULL,
    person_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now(),
    assigned_by uuid
);


--
-- Name: project_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id integer NOT NULL,
    role_name character varying(100) NOT NULL,
    role_type character varying(50) DEFAULT 'Person'::character varying,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: project_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id bigint,
    task_description text NOT NULL,
    assigned_to text,
    due_date date,
    priority text,
    status text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT project_tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT project_tasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: projects_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id bigint,
    operation text NOT NULL,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_columns text[],
    old_data jsonb,
    new_data jsonb,
    metadata jsonb
);


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.projects ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.projects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: prospects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prospects (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    company_name text NOT NULL,
    contact_name text,
    contact_title text,
    contact_email text,
    contact_phone text,
    lead_source text,
    referral_contact text,
    industry text,
    project_type text,
    estimated_project_value numeric(14,2),
    estimated_start_date date,
    status text DEFAULT 'New'::text,
    probability integer DEFAULT 0,
    next_follow_up date,
    last_contacted timestamp with time zone,
    assigned_to text,
    notes text,
    tags text[],
    client_id bigint,
    project_id bigint,
    ai_summary text,
    ai_score numeric(5,2),
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT prospects_probability_check CHECK (((probability >= 0) AND (probability <= 100)))
);


--
-- Name: prospects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prospects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prospects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prospects_id_seq OWNED BY public.prospects.id;


--
-- Name: purchase_order_sov_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_sov_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid NOT NULL,
    line_number integer NOT NULL,
    change_event_line_item text,
    budget_code text,
    description text,
    quantity numeric(14,4),
    uom text,
    unit_cost numeric(14,4),
    amount numeric(14,2) DEFAULT 0 NOT NULL,
    billed_to_date numeric(14,2) DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: purchase_orders_with_totals; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.purchase_orders_with_totals AS
 SELECT po.id,
    po.project_id,
    po.contract_number,
    po.contract_company_id,
    po.title,
    po.status,
    po.executed,
    po.default_retainage_percent,
    po.assigned_to,
    po.bill_to,
    po.payment_terms,
    po.ship_to,
    po.ship_via,
    po.description,
    po.accounting_method,
    po.contract_date,
    po.delivery_date,
    po.signed_po_received_date,
    po.issued_on_date,
    po.is_private,
    po.non_admin_user_ids,
    po.allow_non_admin_view_sov_items,
    po.invoice_contact_ids,
    po.created_by,
    po.created_at,
    po.updated_at,
    COALESCE(sov.total_sov_amount, (0)::numeric) AS total_sov_amount,
    COALESCE(sov.total_billed_to_date, (0)::numeric) AS total_billed_to_date,
    (COALESCE(sov.total_sov_amount, (0)::numeric) - COALESCE(sov.total_billed_to_date, (0)::numeric)) AS total_amount_remaining,
    COALESCE(sov.sov_line_count, (0)::bigint) AS sov_line_count,
    c.name AS company_name,
    c.type AS company_type
   FROM ((public.purchase_orders po
     LEFT JOIN ( SELECT purchase_order_sov_items.purchase_order_id,
            sum(purchase_order_sov_items.amount) AS total_sov_amount,
            sum(purchase_order_sov_items.billed_to_date) AS total_billed_to_date,
            count(*) AS sov_line_count
           FROM public.purchase_order_sov_items
          GROUP BY purchase_order_sov_items.purchase_order_id) sov ON ((sov.purchase_order_id = po.id)))
     LEFT JOIN public.companies c ON ((c.id = po.contract_company_id)));


--
-- Name: qto_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qto_items (
    id bigint NOT NULL,
    qto_id bigint NOT NULL,
    project_id bigint NOT NULL,
    cost_code text,
    division text,
    item_code text,
    description text,
    unit text,
    quantity numeric DEFAULT 0,
    unit_cost numeric DEFAULT 0,
    extended_cost numeric GENERATED ALWAYS AS ((quantity * unit_cost)) STORED,
    source_reference text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: qto_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.qto_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: qto_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.qto_items_id_seq OWNED BY public.qto_items.id;


--
-- Name: qtos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qtos (
    id bigint NOT NULL,
    project_id bigint NOT NULL,
    title text,
    version integer DEFAULT 1,
    created_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now(),
    notes text,
    status text DEFAULT 'draft'::text
);


--
-- Name: qtos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.qtos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: qtos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.qtos_id_seq OWNED BY public.qtos.id;


--
-- Name: rag_pipeline_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rag_pipeline_state (
    pipeline_id text NOT NULL,
    pipeline_type text NOT NULL,
    last_check_time timestamp without time zone,
    known_files jsonb,
    last_run timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requests (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_query text NOT NULL
);


--
-- Name: review_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    review_id uuid NOT NULL,
    document_id uuid,
    discrepancy_id uuid,
    comment_type character varying(50) DEFAULT 'general'::character varying,
    comment text NOT NULL,
    location_in_doc jsonb,
    priority character varying(50) DEFAULT 'normal'::character varying,
    status character varying(50) DEFAULT 'open'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid NOT NULL,
    CONSTRAINT review_comments_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying])::text[]))),
    CONSTRAINT review_comments_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'addressed'::character varying, 'resolved'::character varying])::text[])))
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submittal_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    review_type character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    decision character varying(50),
    comments text,
    review_criteria_met jsonb,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reviews_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'skipped'::character varying])::text[])))
);


--
-- Name: rfi_assignees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfi_assignees (
    rfi_id uuid NOT NULL,
    employee_id bigint NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rfis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rfis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id bigint NOT NULL,
    number integer NOT NULL,
    subject text NOT NULL,
    question text NOT NULL,
    status text DEFAULT 'Open'::text NOT NULL,
    due_date date,
    date_initiated date,
    closed_date date,
    rfi_manager text,
    received_from text,
    assignees text[],
    distribution_list text[],
    ball_in_court text,
    responsible_contractor text,
    specification text,
    location text,
    sub_job text,
    cost_code text,
    rfi_stage text,
    schedule_impact text,
    cost_impact text,
    reference text,
    is_private boolean DEFAULT false NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rfi_manager_employee_id bigint,
    ball_in_court_employee_id bigint,
    created_by_employee_id bigint
);


--
-- Name: risks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    metadata_id text NOT NULL,
    segment_id uuid,
    source_chunk_id uuid,
    description text NOT NULL,
    category text,
    likelihood text,
    impact text,
    owner_name text,
    owner_email text,
    project_id bigint,
    client_id bigint,
    mitigation_plan text,
    status text DEFAULT 'open'::text NOT NULL,
    embedding public.vector(1536),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    project_ids integer[] DEFAULT '{}'::integer[],
    CONSTRAINT risks_impact_check CHECK ((impact = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT risks_likelihood_check CHECK ((likelihood = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT risks_status_check CHECK ((status = ANY (ARRAY['open'::text, 'mitigated'::text, 'closed'::text, 'occurred'::text])))
);


--
-- Name: schedule_deadlines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_deadlines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    deadline_date date NOT NULL,
    deadline_type text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: schedule_dependencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_dependencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    predecessor_task_id uuid NOT NULL,
    task_id uuid NOT NULL,
    dependency_type text DEFAULT 'finish_to_start'::text NOT NULL,
    lag_days integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_no_self_dependency CHECK ((predecessor_task_id <> task_id)),
    CONSTRAINT schedule_dependencies_dependency_type_check CHECK ((dependency_type = ANY (ARRAY['finish_to_start'::text, 'start_to_start'::text, 'finish_to_finish'::text, 'start_to_finish'::text])))
);


--
-- Name: schedule_of_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_of_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id bigint,
    commitment_id uuid,
    status text DEFAULT 'draft'::text,
    total_amount numeric(15,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone,
    approved_by uuid,
    CONSTRAINT either_contract_or_commitment CHECK ((((contract_id IS NOT NULL) AND (commitment_id IS NULL)) OR ((contract_id IS NULL) AND (commitment_id IS NOT NULL)))),
    CONSTRAINT schedule_of_values_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'approved'::text, 'revised'::text])))
);


--
-- Name: schedule_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id integer NOT NULL,
    parent_task_id uuid,
    name text NOT NULL,
    start_date date,
    finish_date date,
    duration_days integer,
    percent_complete integer DEFAULT 0,
    status text DEFAULT 'not_started'::text,
    is_milestone boolean DEFAULT false,
    constraint_type text,
    constraint_date date,
    wbs_code text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT schedule_tasks_constraint_type_check CHECK ((constraint_type = ANY (ARRAY['none'::text, 'start_no_earlier_than'::text, 'finish_no_later_than'::text, 'must_start_on'::text, 'must_finish_on'::text]))),
    CONSTRAINT schedule_tasks_percent_complete_check CHECK (((percent_complete >= 0) AND (percent_complete <= 100))),
    CONSTRAINT schedule_tasks_status_check CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'complete'::text])))
);


--
-- Name: sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sources (
    source_id text NOT NULL,
    summary text,
    total_word_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    category text
);


--
-- Name: sov_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sov_line_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sov_id uuid,
    line_number integer NOT NULL,
    description text NOT NULL,
    cost_code_id text,
    scheduled_value numeric(15,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sov_line_items_with_percentage; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.sov_line_items_with_percentage AS
 SELECT sli.id,
    sli.sov_id,
    sli.line_number,
    sli.description,
    sli.cost_code_id,
    sli.scheduled_value,
    sli.created_at,
    sli.updated_at,
        CASE
            WHEN (sov.total_amount > (0)::numeric) THEN round(((sli.scheduled_value / sov.total_amount) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS percentage
   FROM (public.sov_line_items sli
     JOIN public.schedule_of_values sov ON ((sov.id = sli.sov_id)));


--
-- Name: specifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.specifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id integer NOT NULL,
    section_number character varying(50) NOT NULL,
    section_title character varying(255) NOT NULL,
    division character varying(50),
    specification_type character varying(50) DEFAULT 'csi'::character varying,
    document_url text,
    content text,
    requirements jsonb,
    keywords text[],
    ai_summary text,
    version character varying(50) DEFAULT '1.0'::character varying,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT specifications_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'superseded'::character varying, 'archived'::character varying])::text[])))
);


--
-- Name: sub_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sub_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id bigint NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: subcontract_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subcontract_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subcontract_id uuid NOT NULL,
    file_name text NOT NULL,
    file_size bigint,
    file_type text,
    storage_path text NOT NULL,
    uploaded_by uuid,
    uploaded_at timestamp with time zone DEFAULT now()
);


--
-- Name: subcontract_sov_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subcontract_sov_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subcontract_id uuid NOT NULL,
    line_number integer,
    change_event_line_item text,
    budget_code text,
    description text,
    amount numeric(15,2) DEFAULT 0,
    billed_to_date numeric(15,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sort_order integer,
    CONSTRAINT subcontract_sov_items_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT subcontract_sov_items_billed_to_date_check CHECK ((billed_to_date >= (0)::numeric))
);


--
-- Name: subcontractor_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subcontractor_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subcontractor_id uuid,
    name text NOT NULL,
    title text,
    email text,
    phone text,
    mobile_phone text,
    contact_type text,
    is_primary boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT subcontractor_contacts_contact_type_check CHECK ((contact_type = ANY (ARRAY['primary'::text, 'secondary'::text, 'project_manager'::text, 'estimator'::text, 'safety'::text, 'billing'::text])))
);


--
-- Name: subcontractor_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subcontractor_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subcontractor_id uuid,
    document_type text NOT NULL,
    document_name text NOT NULL,
    file_url text,
    expiration_date date,
    is_current boolean DEFAULT true,
    uploaded_at timestamp with time zone DEFAULT now(),
    uploaded_by uuid,
    CONSTRAINT subcontractor_documents_document_type_check CHECK ((document_type = ANY (ARRAY['insurance_certificate'::text, 'license'::text, 'w9'::text, 'master_agreement'::text, 'safety_manual'::text, 'quality_certificate'::text, 'reference_letter'::text, 'other'::text])))
);


--
-- Name: subcontractor_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subcontractor_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subcontractor_id uuid,
    project_name text NOT NULL,
    project_value numeric(12,2),
    start_date date,
    completion_date date,
    project_rating numeric(3,2),
    on_time boolean,
    on_budget boolean,
    safety_incidents integer DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT subcontractor_projects_project_rating_check CHECK (((project_rating >= (0)::numeric) AND (project_rating <= (5)::numeric)))
);


--
-- Name: subcontractors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subcontractors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name text NOT NULL,
    legal_business_name text,
    dba_name text,
    company_type text,
    tax_id text,
    primary_contact_name text NOT NULL,
    primary_contact_title text,
    primary_contact_email text,
    primary_contact_phone text,
    secondary_contact_name text,
    secondary_contact_email text,
    secondary_contact_phone text,
    address_line_1 text,
    address_line_2 text,
    city text,
    state_province text,
    postal_code text,
    country text DEFAULT 'United States'::text,
    specialties text[],
    service_areas text[],
    years_in_business integer,
    employee_count integer,
    annual_revenue_range text,
    asrs_experience_years integer,
    fm_global_certified boolean DEFAULT false,
    nfpa_certifications text[],
    sprinkler_contractor_license text,
    license_expiration_date date,
    max_project_size text,
    concurrent_projects_capacity integer,
    preferred_project_types text[],
    insurance_general_liability numeric(12,2),
    insurance_professional_liability numeric(12,2),
    insurance_workers_comp boolean DEFAULT false,
    bonding_capacity numeric(12,2),
    credit_rating text,
    alleato_projects_completed integer DEFAULT 0,
    avg_project_rating numeric(3,2),
    on_time_completion_rate numeric(5,2),
    safety_incident_rate numeric(5,2),
    preferred_payment_terms text,
    markup_percentage numeric(5,2),
    hourly_rates_range text,
    travel_radius_miles integer,
    project_management_software text[],
    cad_software_proficiency text[],
    bim_capabilities boolean DEFAULT false,
    digital_collaboration_tools text[],
    osha_training_current boolean DEFAULT false,
    drug_testing_program boolean DEFAULT false,
    background_check_policy boolean DEFAULT false,
    quality_certifications text[],
    status text DEFAULT 'active'::text,
    tier_level text,
    preferred_vendor boolean DEFAULT false,
    master_agreement_signed boolean DEFAULT false,
    master_agreement_date date,
    internal_notes text,
    strengths text[],
    weaknesses text[],
    special_requirements text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    emergency_contact_name text,
    emergency_contact_phone text,
    emergency_contact_relationship text,
    CONSTRAINT subcontractors_annual_revenue_range_check CHECK ((annual_revenue_range = ANY (ARRAY['under_1m'::text, '1m_5m'::text, '5m_10m'::text, '10m_25m'::text, '25m_plus'::text]))),
    CONSTRAINT subcontractors_avg_project_rating_check CHECK (((avg_project_rating >= (0)::numeric) AND (avg_project_rating <= (5)::numeric))),
    CONSTRAINT subcontractors_company_type_check CHECK ((company_type = ANY (ARRAY['corporation'::text, 'llc'::text, 'partnership'::text, 'sole_proprietorship'::text, 'other'::text]))),
    CONSTRAINT subcontractors_credit_rating_check CHECK ((credit_rating = ANY (ARRAY['excellent'::text, 'good'::text, 'fair'::text, 'poor'::text, 'unknown'::text]))),
    CONSTRAINT subcontractors_max_project_size_check CHECK ((max_project_size = ANY (ARRAY['under_100k'::text, '100k_500k'::text, '500k_1m'::text, '1m_5m'::text, '5m_plus'::text]))),
    CONSTRAINT subcontractors_on_time_completion_rate_check CHECK (((on_time_completion_rate >= (0)::numeric) AND (on_time_completion_rate <= (100)::numeric))),
    CONSTRAINT subcontractors_preferred_payment_terms_check CHECK ((preferred_payment_terms = ANY (ARRAY['net_15'::text, 'net_30'::text, 'net_45'::text, 'net_60'::text, 'progress_billing'::text]))),
    CONSTRAINT subcontractors_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending_approval'::text, 'blacklisted'::text]))),
    CONSTRAINT subcontractors_tier_level_check CHECK ((tier_level = ANY (ARRAY['platinum'::text, 'gold'::text, 'silver'::text, 'bronze'::text, 'unrated'::text])))
);


--
-- Name: subcontractors_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.subcontractors_summary AS
 SELECT s.id,
    s.company_name,
    s.primary_contact_name,
    s.primary_contact_email,
    s.specialties,
    s.service_areas,
    s.fm_global_certified,
    s.asrs_experience_years,
    s.status,
    s.tier_level,
    count(sp.id) AS total_projects,
    avg(sp.project_rating) AS avg_rating,
    (((sum(
        CASE
            WHEN sp.on_time THEN 1
            ELSE 0
        END))::numeric / (count(sp.id))::numeric) * (100)::numeric) AS on_time_percentage
   FROM (public.subcontractors s
     LEFT JOIN public.subcontractor_projects sp ON ((s.id = sp.subcontractor_id)))
  GROUP BY s.id, s.company_name, s.primary_contact_name, s.primary_contact_email, s.specialties, s.service_areas, s.fm_global_certified, s.asrs_experience_years, s.status, s.tier_level;


--
-- Name: subcontracts_with_totals; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.subcontracts_with_totals AS
 SELECT s.id,
    s.contract_number,
    s.contract_company_id,
    s.title,
    s.status,
    s.executed,
    s.default_retainage_percent,
    s.description,
    s.inclusions,
    s.exclusions,
    s.start_date,
    s.estimated_completion_date,
    s.actual_completion_date,
    s.contract_date,
    s.signed_contract_received_date,
    s.issued_on_date,
    s.is_private,
    s.non_admin_user_ids,
    s.allow_non_admin_view_sov_items,
    s.invoice_contact_ids,
    s.project_id,
    s.created_by,
    s.created_at,
    s.updated_at,
    COALESCE(sov_totals.total_amount, (0)::numeric) AS total_sov_amount,
    COALESCE(sov_totals.total_billed, (0)::numeric) AS total_billed_to_date,
    (COALESCE(sov_totals.total_amount, (0)::numeric) - COALESCE(sov_totals.total_billed, (0)::numeric)) AS total_amount_remaining,
    COALESCE(sov_totals.line_item_count, (0)::bigint) AS sov_line_count,
    COALESCE(att_count.count, (0)::bigint) AS attachment_count,
    c.name AS company_name,
    c.type AS company_type
   FROM (((public.subcontracts s
     LEFT JOIN ( SELECT subcontract_sov_items.subcontract_id,
            sum(subcontract_sov_items.amount) AS total_amount,
            sum(subcontract_sov_items.billed_to_date) AS total_billed,
            count(*) AS line_item_count
           FROM public.subcontract_sov_items
          GROUP BY subcontract_sov_items.subcontract_id) sov_totals ON ((s.id = sov_totals.subcontract_id)))
     LEFT JOIN ( SELECT subcontract_attachments.subcontract_id,
            count(*) AS count
           FROM public.subcontract_attachments
          GROUP BY subcontract_attachments.subcontract_id) att_count ON ((s.id = att_count.subcontract_id)))
     LEFT JOIN public.companies c ON ((s.contract_company_id = c.id)));


--
-- Name: submittal_analytics_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submittal_analytics_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type character varying(100) NOT NULL,
    project_id integer,
    submittal_id uuid,
    user_id uuid,
    event_data jsonb,
    session_id character varying(255),
    ip_address inet,
    user_agent text,
    occurred_at timestamp with time zone DEFAULT now()
);


--
-- Name: submittal_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submittal_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submittal_id uuid NOT NULL,
    document_name character varying(255) NOT NULL,
    document_type character varying(100),
    file_url text NOT NULL,
    file_size_bytes bigint,
    mime_type character varying(100),
    page_count integer,
    extracted_text text,
    ai_analysis jsonb,
    version integer DEFAULT 1,
    uploaded_at timestamp with time zone DEFAULT now(),
    uploaded_by uuid NOT NULL
);


--
-- Name: submittal_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submittal_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submittal_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    actor_id uuid,
    actor_type character varying(50) DEFAULT 'user'::character varying,
    description text,
    previous_status character varying(50),
    new_status character varying(50),
    changes jsonb,
    metadata jsonb,
    occurred_at timestamp with time zone DEFAULT now()
);


--
-- Name: submittal_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submittal_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    project_id integer,
    submittal_id uuid,
    notification_type character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    message text,
    priority character varying(50) DEFAULT 'normal'::character varying,
    is_read boolean DEFAULT false,
    delivery_methods text[] DEFAULT ARRAY['in_app'::text],
    scheduled_for timestamp with time zone DEFAULT now(),
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT submittal_notifications_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'urgent'::character varying])::text[])))
);


--
-- Name: submittal_performance_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submittal_performance_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id integer,
    metric_type character varying(100) NOT NULL,
    metric_name character varying(255) NOT NULL,
    value numeric(10,4),
    unit character varying(50),
    period_start timestamp with time zone,
    period_end timestamp with time zone,
    metadata jsonb,
    calculated_at timestamp with time zone DEFAULT now()
);


--
-- Name: submittals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submittals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id integer NOT NULL,
    specification_id uuid,
    submittal_type_id uuid NOT NULL,
    submittal_number character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    submitted_by uuid NOT NULL,
    submitter_company character varying(255),
    submission_date timestamp with time zone DEFAULT now(),
    required_approval_date date,
    priority character varying(50) DEFAULT 'normal'::character varying,
    status character varying(50) DEFAULT 'submitted'::character varying,
    current_version integer DEFAULT 1,
    total_versions integer DEFAULT 1,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT submittals_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))),
    CONSTRAINT submittals_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'submitted'::character varying, 'under_review'::character varying, 'requires_revision'::character varying, 'approved'::character varying, 'rejected'::character varying, 'superseded'::character varying])::text[])))
);


--
-- Name: submittal_project_dashboard; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.submittal_project_dashboard AS
 SELECT p.id,
    p.name,
    p.state AS status,
    count(s.id) AS total_submittals,
    count(
        CASE
            WHEN ((s.status)::text = 'submitted'::text) THEN 1
            ELSE NULL::integer
        END) AS pending_submittals,
    count(
        CASE
            WHEN ((s.status)::text = 'under_review'::text) THEN 1
            ELSE NULL::integer
        END) AS under_review,
    count(
        CASE
            WHEN ((s.status)::text = 'approved'::text) THEN 1
            ELSE NULL::integer
        END) AS approved_submittals,
    count(
        CASE
            WHEN ((s.status)::text = 'requires_revision'::text) THEN 1
            ELSE NULL::integer
        END) AS needs_revision,
    count(d.id) AS total_discrepancies,
    count(
        CASE
            WHEN ((d.severity)::text = 'critical'::text) THEN 1
            ELSE NULL::integer
        END) AS critical_discrepancies,
    avg(EXTRACT(days FROM (COALESCE(r.completed_at, now()) - s.submission_date))) AS avg_review_time_days
   FROM (((public.projects p
     LEFT JOIN public.submittals s ON ((p.id = s.project_id)))
     LEFT JOIN public.discrepancies d ON (((s.id = d.submittal_id) AND ((d.status)::text = 'open'::text))))
     LEFT JOIN public.reviews r ON (((s.id = r.submittal_id) AND ((r.review_type)::text = 'final'::text))))
  GROUP BY p.id, p.name, p.state;


--
-- Name: submittal_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submittal_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100) NOT NULL,
    description text,
    required_documents text[],
    review_criteria jsonb,
    ai_analysis_config jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sync_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_status (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    sync_type text DEFAULT 'fireflies'::text NOT NULL,
    last_sync_at timestamp with time zone,
    last_successful_sync_at timestamp with time zone,
    status text DEFAULT 'idle'::text,
    error_message text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sync_status_status_check CHECK ((status = ANY (ARRAY['idle'::text, 'running'::text, 'failed'::text, 'completed'::text])))
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    metadata_id text NOT NULL,
    segment_id uuid,
    source_chunk_id uuid,
    description text NOT NULL,
    assignee_name text,
    assignee_email text,
    project_id bigint,
    client_id bigint,
    due_date date,
    priority text,
    status text DEFAULT 'open'::text NOT NULL,
    source_system text DEFAULT 'fireflies'::text NOT NULL,
    embedding public.vector(1536),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    project_ids integer[] DEFAULT '{}'::integer[],
    CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'blocked'::text, 'done'::text, 'cancelled'::text])))
);


--
-- Name: todos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.todos (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    task text,
    is_complete boolean DEFAULT false,
    inserted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT todos_task_check CHECK ((char_length(task) > 3))
);


--
-- Name: todos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.todos ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.todos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: user_directory_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_directory_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id integer NOT NULL,
    person_id uuid NOT NULL,
    permission_level character varying(20) DEFAULT 'none'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_directory_permissions_permission_level_check CHECK (((permission_level)::text = ANY ((ARRAY['none'::character varying, 'read_only'::character varying, 'standard'::character varying, 'admin'::character varying])::text[])))
);


--
-- Name: user_email_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_email_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    person_id uuid NOT NULL,
    project_id integer NOT NULL,
    emails_default boolean DEFAULT false,
    rfis_default boolean DEFAULT false,
    submittals_default boolean DEFAULT false,
    punchlist_items_default boolean DEFAULT false,
    weather_delay_email boolean DEFAULT false,
    weather_delay_phone boolean DEFAULT false,
    daily_log_default boolean DEFAULT false,
    delay_log_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    is_admin boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role text DEFAULT 'team'::text
);


--
-- Name: user_project_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_project_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    project_id integer NOT NULL,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_project_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_project_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    membership_id uuid NOT NULL,
    role_name character varying(100) NOT NULL,
    assigned_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_email character varying(255),
    project_name text,
    company_name text,
    contact_phone character varying(50),
    project_data jsonb NOT NULL,
    lead_score integer DEFAULT 0,
    status character varying(50) DEFAULT 'new'::character varying,
    estimated_value numeric(12,2),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_schedule_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_schedule_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    person_id uuid NOT NULL,
    project_id integer NOT NULL,
    all_project_tasks_weekly boolean DEFAULT false,
    resource_tasks_assigned_to_id uuid,
    upon_schedule_changes boolean DEFAULT false,
    upon_schedule_change_requests boolean DEFAULT false,
    project_schedule_lookahead_weekly boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: users_auth; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users_auth (
    person_id uuid NOT NULL,
    auth_user_id uuid NOT NULL,
    last_login_at timestamp with time zone
);


--
-- Name: v_budget_lines; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_budget_lines AS
 SELECT id,
    project_id,
    sub_job_id,
    cost_code_id,
    cost_type_id,
    description,
    original_amount,
    created_by,
    created_at,
    updated_at,
    COALESCE(( SELECT sum(bml.amount) AS sum
           FROM (public.budget_mod_lines bml
             JOIN public.budget_modifications bm ON ((bml.budget_modification_id = bm.id)))
          WHERE ((bm.status = 'approved'::text) AND (bml.project_id = bl.project_id) AND (COALESCE(bml.sub_job_id, '00000000-0000-0000-0000-000000000000'::uuid) = bl.sub_job_key) AND (bml.cost_code_id = bl.cost_code_id) AND (bml.cost_type_id = bl.cost_type_id))), (0)::numeric) AS budget_mod_total,
    COALESCE(( SELECT sum(col.amount) AS sum
           FROM (public.change_order_lines col
             JOIN public.change_orders co ON ((col.change_order_id = co.id)))
          WHERE ((co.status = 'approved'::text) AND (col.project_id = bl.project_id) AND (COALESCE(col.sub_job_id, '00000000-0000-0000-0000-000000000000'::uuid) = bl.sub_job_key) AND (col.cost_code_id = bl.cost_code_id) AND (col.cost_type_id = bl.cost_type_id))), (0)::numeric) AS approved_co_total,
    ((original_amount + COALESCE(( SELECT sum(bml.amount) AS sum
           FROM (public.budget_mod_lines bml
             JOIN public.budget_modifications bm ON ((bml.budget_modification_id = bm.id)))
          WHERE ((bm.status = 'approved'::text) AND (bml.project_id = bl.project_id) AND (COALESCE(bml.sub_job_id, '00000000-0000-0000-0000-000000000000'::uuid) = bl.sub_job_key) AND (bml.cost_code_id = bl.cost_code_id) AND (bml.cost_type_id = bl.cost_type_id))), (0)::numeric)) + COALESCE(( SELECT sum(col.amount) AS sum
           FROM (public.change_order_lines col
             JOIN public.change_orders co ON ((col.change_order_id = co.id)))
          WHERE ((co.status = 'approved'::text) AND (col.project_id = bl.project_id) AND (COALESCE(col.sub_job_id, '00000000-0000-0000-0000-000000000000'::uuid) = bl.sub_job_key) AND (col.cost_code_id = bl.cost_code_id) AND (col.cost_type_id = bl.cost_type_id))), (0)::numeric)) AS revised_budget
   FROM public.budget_lines bl;


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    contact_name text,
    contact_email text,
    contact_phone text,
    address text,
    city text,
    state text,
    zip_code text,
    country text DEFAULT 'US'::text,
    tax_id text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vertical_markup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vertical_markup (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id bigint,
    markup_type text NOT NULL,
    percentage numeric(5,2) NOT NULL,
    calculation_order integer NOT NULL,
    compound boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vertical_markup_markup_type_check CHECK ((markup_type = ANY (ARRAY['insurance'::text, 'bond'::text, 'fee'::text, 'overhead'::text, 'custom'::text]))),
    CONSTRAINT vertical_markup_percentage_check CHECK (((percentage >= (0)::numeric) AND (percentage <= (100)::numeric)))
);


--
-- Name: change_order_approvals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_order_approvals ALTER COLUMN id SET DEFAULT nextval('public.change_order_approvals_id_seq'::regclass);


--
-- Name: change_order_costs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_order_costs ALTER COLUMN id SET DEFAULT nextval('public.change_order_costs_id_seq'::regclass);


--
-- Name: change_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_orders ALTER COLUMN id SET DEFAULT nextval('public.change_orders_id_seq'::regclass);


--
-- Name: code_examples id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_examples ALTER COLUMN id SET DEFAULT nextval('public.code_examples_id_seq'::regclass);


--
-- Name: crawled_pages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crawled_pages ALTER COLUMN id SET DEFAULT nextval('public.crawled_pages_id_seq'::regclass);


--
-- Name: document_executive_summaries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_executive_summaries ALTER COLUMN id SET DEFAULT nextval('public.document_executive_summaries_id_seq'::regclass);


--
-- Name: document_rows id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_rows ALTER COLUMN id SET DEFAULT nextval('public.document_rows_id_seq'::regclass);


--
-- Name: initiatives id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.initiatives ALTER COLUMN id SET DEFAULT nextval('public.initiatives_id_seq'::regclass);


--
-- Name: issues id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issues ALTER COLUMN id SET DEFAULT nextval('public.issues_id_seq'::regclass);


--
-- Name: memories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memories ALTER COLUMN id SET DEFAULT nextval('public.memories_id_seq'::regclass);


--
-- Name: nods_page id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nods_page ALTER COLUMN id SET DEFAULT nextval('public.nods_page_id_seq'::regclass);


--
-- Name: nods_page_section id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nods_page_section ALTER COLUMN id SET DEFAULT nextval('public.nods_page_section_id_seq'::regclass);


--
-- Name: optimization_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_rules ALTER COLUMN id SET DEFAULT nextval('public.optimization_rules_id_seq'::regclass);


--
-- Name: prospects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prospects ALTER COLUMN id SET DEFAULT nextval('public.prospects_id_seq'::regclass);


--
-- Name: qto_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qto_items ALTER COLUMN id SET DEFAULT nextval('public.qto_items_id_seq'::regclass);


--
-- Name: qtos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qtos ALTER COLUMN id SET DEFAULT nextval('public.qtos_id_seq'::regclass);


--
-- Name: change_events change_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_events
    ADD CONSTRAINT change_events_pkey PRIMARY KEY (id);


--
-- Name: change_events_summary; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.change_events_summary AS
 SELECT ce.id,
    ce.project_id,
    ce.number,
    ce.title,
    ce.type,
    ce.status,
    ce.origin,
    ce.expecting_revenue,
    COALESCE(sum(cel.revenue_rom), (0)::numeric) AS total_revenue_rom,
    COALESCE(sum(cel.cost_rom), (0)::numeric) AS total_cost_rom,
    COALESCE(sum(cel.non_committed_cost), (0)::numeric) AS total_non_committed_cost,
    count(DISTINCT cel.id) AS line_item_count,
    count(DISTINCT cea.id) AS attachment_count,
    count(DISTINCT cer.id) AS rfq_count,
    COALESCE(sum(cer.estimated_total_amount), (0)::numeric) AS total_rfq_amount,
    ce.created_at,
    ce.created_by
   FROM (((public.change_events ce
     LEFT JOIN public.change_event_line_items cel ON ((ce.id = cel.change_event_id)))
     LEFT JOIN public.change_event_attachments cea ON ((ce.id = cea.change_event_id)))
     LEFT JOIN public.change_event_rfqs cer ON ((ce.id = cer.change_event_id)))
  WHERE (ce.deleted_at IS NULL)
  GROUP BY ce.id
  WITH NO DATA;


--
-- Name: Prospects Prospects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Prospects"
    ADD CONSTRAINT "Prospects_pkey" PRIMARY KEY (id);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (hash);


--
-- Name: ai_analysis_jobs ai_analysis_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_analysis_jobs
    ADD CONSTRAINT ai_analysis_jobs_pkey PRIMARY KEY (id);


--
-- Name: ai_insights ai_insights_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_id_key UNIQUE (id);


--
-- Name: ai_insights ai_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_pkey PRIMARY KEY (id);


--
-- Name: ai_models ai_models_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_models
    ADD CONSTRAINT ai_models_name_key UNIQUE (name);


--
-- Name: ai_models ai_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_models
    ADD CONSTRAINT ai_models_pkey PRIMARY KEY (id);


--
-- Name: ai_tasks ai_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_tasks
    ADD CONSTRAINT ai_tasks_pkey PRIMARY KEY (id);


--
-- Name: app_capability_actions app_capability_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_capability_actions
    ADD CONSTRAINT app_capability_actions_pkey PRIMARY KEY (capability_id, action_id);


--
-- Name: app_commands app_commands_module_command_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_commands
    ADD CONSTRAINT app_commands_module_command_key_unique UNIQUE (module, command_key);


--
-- Name: app_commands app_commands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_commands
    ADD CONSTRAINT app_commands_pkey PRIMARY KEY (id);


--
-- Name: app_crawl_sessions app_crawl_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_crawl_sessions
    ADD CONSTRAINT app_crawl_sessions_pkey PRIMARY KEY (id);


--
-- Name: app_functional_capabilities app_functional_capabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_functional_capabilities
    ADD CONSTRAINT app_functional_capabilities_pkey PRIMARY KEY (id);


--
-- Name: app_page_links app_page_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_page_links
    ADD CONSTRAINT app_page_links_pkey PRIMARY KEY (id);


--
-- Name: app_pages app_pages_crawl_session_page_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_pages
    ADD CONSTRAINT app_pages_crawl_session_page_id_unique UNIQUE (crawl_session_id, page_id);


--
-- Name: app_pages app_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_pages
    ADD CONSTRAINT app_pages_pkey PRIMARY KEY (id);


--
-- Name: app_parity_checks app_parity_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_parity_checks
    ADD CONSTRAINT app_parity_checks_pkey PRIMARY KEY (id);


--
-- Name: app_roles app_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_roles
    ADD CONSTRAINT app_roles_pkey PRIMARY KEY (id);


--
-- Name: app_schedule_bulk_operations app_schedule_bulk_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_schedule_bulk_operations
    ADD CONSTRAINT app_schedule_bulk_operations_pkey PRIMARY KEY (id);


--
-- Name: app_schedule_task_hierarchy app_schedule_task_hierarchy_parent_task_id_child_task_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_schedule_task_hierarchy
    ADD CONSTRAINT app_schedule_task_hierarchy_parent_task_id_child_task_id_key UNIQUE (parent_task_id, child_task_id);


--
-- Name: app_schedule_task_hierarchy app_schedule_task_hierarchy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_schedule_task_hierarchy
    ADD CONSTRAINT app_schedule_task_hierarchy_pkey PRIMARY KEY (id);


--
-- Name: app_state_transitions app_state_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_state_transitions
    ADD CONSTRAINT app_state_transitions_pkey PRIMARY KEY (id);


--
-- Name: app_system_actions app_system_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_system_actions
    ADD CONSTRAINT app_system_actions_pkey PRIMARY KEY (id);


--
-- Name: app_system_states app_system_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_system_states
    ADD CONSTRAINT app_system_states_pkey PRIMARY KEY (id);


--
-- Name: app_ui_components app_ui_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_ui_components
    ADD CONSTRAINT app_ui_components_pkey PRIMARY KEY (id);


--
-- Name: app_ui_table_columns app_ui_table_columns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_ui_table_columns
    ADD CONSTRAINT app_ui_table_columns_pkey PRIMARY KEY (id);


--
-- Name: app_ui_tables app_ui_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_ui_tables
    ADD CONSTRAINT app_ui_tables_pkey PRIMARY KEY (id);


--
-- Name: asrs_blocks asrs_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asrs_blocks
    ADD CONSTRAINT asrs_blocks_pkey PRIMARY KEY (id);


--
-- Name: asrs_configurations asrs_configurations_config_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asrs_configurations
    ADD CONSTRAINT asrs_configurations_config_name_key UNIQUE (config_name);


--
-- Name: asrs_configurations asrs_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asrs_configurations
    ADD CONSTRAINT asrs_configurations_pkey PRIMARY KEY (id);


--
-- Name: asrs_decision_matrix asrs_decision_matrix_asrs_type_container_type_max_depth_ft__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asrs_decision_matrix
    ADD CONSTRAINT asrs_decision_matrix_asrs_type_container_type_max_depth_ft__key UNIQUE (asrs_type, container_type, max_depth_ft, max_spacing_ft);


--
-- Name: asrs_decision_matrix asrs_decision_matrix_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asrs_decision_matrix
    ADD CONSTRAINT asrs_decision_matrix_pkey PRIMARY KEY (id);


--
-- Name: asrs_logic_cards asrs_logic_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asrs_logic_cards
    ADD CONSTRAINT asrs_logic_cards_pkey PRIMARY KEY (id);


--
-- Name: asrs_protection_rules asrs_protection_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asrs_protection_rules
    ADD CONSTRAINT asrs_protection_rules_pkey PRIMARY KEY (id);


--
-- Name: asrs_sections asrs_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asrs_sections
    ADD CONSTRAINT asrs_sections_pkey PRIMARY KEY (id);


--
-- Name: asrs_sections asrs_sections_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asrs_sections
    ADD CONSTRAINT asrs_sections_slug_key UNIQUE (slug);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: billing_periods billing_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_periods
    ADD CONSTRAINT billing_periods_pkey PRIMARY KEY (id);


--
-- Name: billing_periods billing_periods_project_id_period_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_periods
    ADD CONSTRAINT billing_periods_project_id_period_number_key UNIQUE (project_id, period_number);


--
-- Name: block_embeddings block_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_embeddings
    ADD CONSTRAINT block_embeddings_pkey PRIMARY KEY (block_id);


--
-- Name: briefing_runs briefing_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.briefing_runs
    ADD CONSTRAINT briefing_runs_pkey PRIMARY KEY (id);


--
-- Name: budget_line_history budget_line_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_line_history
    ADD CONSTRAINT budget_line_history_pkey PRIMARY KEY (id);


--
-- Name: budget_line_item_history budget_line_item_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_line_item_history
    ADD CONSTRAINT budget_line_item_history_pkey PRIMARY KEY (id);


--
-- Name: budget_lines budget_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_lines
    ADD CONSTRAINT budget_lines_pkey PRIMARY KEY (id);


--
-- Name: budget_mod_lines budget_mod_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_mod_lines
    ADD CONSTRAINT budget_mod_lines_pkey PRIMARY KEY (id);


--
-- Name: budget_modification_lines budget_modification_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_modification_lines
    ADD CONSTRAINT budget_modification_lines_pkey PRIMARY KEY (id);


--
-- Name: budget_modifications budget_modifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_modifications
    ADD CONSTRAINT budget_modifications_pkey PRIMARY KEY (id);


--
-- Name: budget_view_columns budget_view_columns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_view_columns
    ADD CONSTRAINT budget_view_columns_pkey PRIMARY KEY (id);


--
-- Name: budget_view_columns budget_view_columns_view_id_column_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_view_columns
    ADD CONSTRAINT budget_view_columns_view_id_column_key_key UNIQUE (view_id, column_key);


--
-- Name: budget_views budget_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_views
    ADD CONSTRAINT budget_views_pkey PRIMARY KEY (id);


--
-- Name: budget_views budget_views_project_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_views
    ADD CONSTRAINT budget_views_project_id_name_key UNIQUE (project_id, name);


--
-- Name: change_event_approvals change_event_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_approvals
    ADD CONSTRAINT change_event_approvals_pkey PRIMARY KEY (id);


--
-- Name: change_event_attachments change_event_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_attachments
    ADD CONSTRAINT change_event_attachments_pkey PRIMARY KEY (id);


--
-- Name: change_event_history change_event_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_history
    ADD CONSTRAINT change_event_history_pkey PRIMARY KEY (id);


--
-- Name: change_event_line_items change_event_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_line_items
    ADD CONSTRAINT change_event_line_items_pkey PRIMARY KEY (id);


--
-- Name: change_event_rfq_attachments change_event_rfq_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_rfq_attachments
    ADD CONSTRAINT change_event_rfq_attachments_pkey PRIMARY KEY (id);


--
-- Name: change_event_rfq_responses change_event_rfq_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_rfq_responses
    ADD CONSTRAINT change_event_rfq_responses_pkey PRIMARY KEY (id);


--
-- Name: change_event_rfq_responses change_event_rfq_responses_unique_submission; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_rfq_responses
    ADD CONSTRAINT change_event_rfq_responses_unique_submission UNIQUE (rfq_id, line_item_id, responder_company_id, responder_contact_id);


--
-- Name: change_event_rfqs change_event_rfqs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_rfqs
    ADD CONSTRAINT change_event_rfqs_pkey PRIMARY KEY (id);


--
-- Name: change_event_rfqs change_event_rfqs_unique_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_rfqs
    ADD CONSTRAINT change_event_rfqs_unique_number UNIQUE (project_id, rfq_number);


--
-- Name: change_events change_events_number_project_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_events
    ADD CONSTRAINT change_events_number_project_unique UNIQUE (project_id, number);


--
-- Name: change_order_approvals change_order_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_order_approvals
    ADD CONSTRAINT change_order_approvals_pkey PRIMARY KEY (id);


--
-- Name: change_order_costs change_order_costs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_order_costs
    ADD CONSTRAINT change_order_costs_pkey PRIMARY KEY (id);


--
-- Name: change_order_lines change_order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_order_lines
    ADD CONSTRAINT change_order_lines_pkey PRIMARY KEY (id);


--
-- Name: change_orders change_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_orders
    ADD CONSTRAINT change_orders_pkey PRIMARY KEY (id);


--
-- Name: chat_history chat_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_history
    ADD CONSTRAINT chat_history_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: chat_thread_attachment_files chat_thread_attachment_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_thread_attachment_files
    ADD CONSTRAINT chat_thread_attachment_files_pkey PRIMARY KEY (attachment_id);


--
-- Name: chat_thread_attachments chat_thread_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_thread_attachments
    ADD CONSTRAINT chat_thread_attachments_pkey PRIMARY KEY (id);


--
-- Name: chat_thread_feedback chat_thread_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_thread_feedback
    ADD CONSTRAINT chat_thread_feedback_pkey PRIMARY KEY (id);


--
-- Name: chat_thread_items chat_thread_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_thread_items
    ADD CONSTRAINT chat_thread_items_pkey PRIMARY KEY (id);


--
-- Name: chat_threads chat_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_threads
    ADD CONSTRAINT chat_threads_pkey PRIMARY KEY (id);


--
-- Name: chats chats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chats
    ADD CONSTRAINT chats_pkey PRIMARY KEY (id);


--
-- Name: chunks chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chunks
    ADD CONSTRAINT chunks_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: code_examples code_examples_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_examples
    ADD CONSTRAINT code_examples_pkey PRIMARY KEY (id);


--
-- Name: code_examples code_examples_url_chunk_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_examples
    ADD CONSTRAINT code_examples_url_chunk_number_key UNIQUE (url, chunk_number);


--
-- Name: commitment_change_order_lines commitment_change_order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commitment_change_order_lines
    ADD CONSTRAINT commitment_change_order_lines_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_context company_context_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_context
    ADD CONSTRAINT company_context_pkey PRIMARY KEY (id);


--
-- Name: contract_billing_periods contract_billing_periods_contract_id_period_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_billing_periods
    ADD CONSTRAINT contract_billing_periods_contract_id_period_number_key UNIQUE (contract_id, period_number);


--
-- Name: contract_billing_periods contract_billing_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_billing_periods
    ADD CONSTRAINT contract_billing_periods_pkey PRIMARY KEY (id);


--
-- Name: contract_change_orders contract_change_orders_contract_id_change_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_change_orders
    ADD CONSTRAINT contract_change_orders_contract_id_change_order_number_key UNIQUE (contract_id, change_order_number);


--
-- Name: contract_change_orders contract_change_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_change_orders
    ADD CONSTRAINT contract_change_orders_pkey PRIMARY KEY (id);


--
-- Name: contract_documents contract_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_documents
    ADD CONSTRAINT contract_documents_pkey PRIMARY KEY (id);


--
-- Name: contract_line_items contract_line_items_contract_id_line_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_line_items
    ADD CONSTRAINT contract_line_items_contract_id_line_number_key UNIQUE (contract_id, line_number);


--
-- Name: contract_line_items contract_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_line_items
    ADD CONSTRAINT contract_line_items_pkey PRIMARY KEY (id);


--
-- Name: subcontracts contract_number_project_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontracts
    ADD CONSTRAINT contract_number_project_unique UNIQUE (contract_number, project_id);


--
-- Name: contract_payments contract_payments_contract_id_payment_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_payments
    ADD CONSTRAINT contract_payments_contract_id_payment_number_key UNIQUE (contract_id, payment_number);


--
-- Name: contract_payments contract_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_payments
    ADD CONSTRAINT contract_payments_pkey PRIMARY KEY (id);


--
-- Name: contract_snapshots contract_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_snapshots
    ADD CONSTRAINT contract_snapshots_pkey PRIMARY KEY (id);


--
-- Name: contract_views contract_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_views
    ADD CONSTRAINT contract_views_pkey PRIMARY KEY (id);


--
-- Name: contract_views contract_views_user_id_view_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_views
    ADD CONSTRAINT contract_views_user_id_view_name_key UNIQUE (user_id, view_name);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (session_id);


--
-- Name: cost_code_division_updates_audit cost_code_division_updates_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_code_division_updates_audit
    ADD CONSTRAINT cost_code_division_updates_audit_pkey PRIMARY KEY (id);


--
-- Name: cost_code_types cost_code_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_code_types
    ADD CONSTRAINT cost_code_types_code_key UNIQUE (code);


--
-- Name: cost_code_types cost_code_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_code_types
    ADD CONSTRAINT cost_code_types_pkey PRIMARY KEY (id);


--
-- Name: cost_codes cost_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_codes
    ADD CONSTRAINT cost_codes_pkey PRIMARY KEY (id);


--
-- Name: cost_factors cost_factors_factor_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_factors
    ADD CONSTRAINT cost_factors_factor_name_key UNIQUE (factor_name);


--
-- Name: cost_factors cost_factors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_factors
    ADD CONSTRAINT cost_factors_pkey PRIMARY KEY (id);


--
-- Name: cost_forecasts cost_forecasts_budget_item_id_forecast_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_forecasts
    ADD CONSTRAINT cost_forecasts_budget_item_id_forecast_date_key UNIQUE (budget_item_id, forecast_date);


--
-- Name: cost_forecasts cost_forecasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_forecasts
    ADD CONSTRAINT cost_forecasts_pkey PRIMARY KEY (id);


--
-- Name: crawled_pages crawled_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crawled_pages
    ADD CONSTRAINT crawled_pages_pkey PRIMARY KEY (id);


--
-- Name: crawled_pages crawled_pages_url_chunk_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crawled_pages
    ADD CONSTRAINT crawled_pages_url_chunk_number_key UNIQUE (url, chunk_number);


--
-- Name: daily_log_equipment daily_log_equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_log_equipment
    ADD CONSTRAINT daily_log_equipment_pkey PRIMARY KEY (id);


--
-- Name: daily_log_manpower daily_log_manpower_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_log_manpower
    ADD CONSTRAINT daily_log_manpower_pkey PRIMARY KEY (id);


--
-- Name: daily_log_notes daily_log_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_log_notes
    ADD CONSTRAINT daily_log_notes_pkey PRIMARY KEY (id);


--
-- Name: daily_logs daily_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_pkey PRIMARY KEY (id);


--
-- Name: daily_logs daily_logs_project_id_log_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_project_id_log_date_key UNIQUE (project_id, log_date);


--
-- Name: daily_recaps daily_recaps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_recaps
    ADD CONSTRAINT daily_recaps_pkey PRIMARY KEY (id);


--
-- Name: database_tables_catalog database_tables_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.database_tables_catalog
    ADD CONSTRAINT database_tables_catalog_pkey PRIMARY KEY (schema_name, table_name);


--
-- Name: decisions decisions_metadata_id_description_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decisions
    ADD CONSTRAINT decisions_metadata_id_description_key UNIQUE (metadata_id, description);


--
-- Name: decisions decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decisions
    ADD CONSTRAINT decisions_pkey PRIMARY KEY (id);


--
-- Name: design_recommendations design_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.design_recommendations
    ADD CONSTRAINT design_recommendations_pkey PRIMARY KEY (id);


--
-- Name: direct_cost_line_items direct_cost_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_cost_line_items
    ADD CONSTRAINT direct_cost_line_items_pkey PRIMARY KEY (id);


--
-- Name: direct_costs direct_costs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_costs
    ADD CONSTRAINT direct_costs_pkey PRIMARY KEY (id);


--
-- Name: discrepancies discrepancies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discrepancies
    ADD CONSTRAINT discrepancies_pkey PRIMARY KEY (id);


--
-- Name: distribution_group_members distribution_group_members_group_id_person_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_group_members
    ADD CONSTRAINT distribution_group_members_group_id_person_id_key UNIQUE (group_id, person_id);


--
-- Name: distribution_group_members distribution_group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_group_members
    ADD CONSTRAINT distribution_group_members_pkey PRIMARY KEY (id);


--
-- Name: distribution_groups distribution_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_groups
    ADD CONSTRAINT distribution_groups_pkey PRIMARY KEY (id);


--
-- Name: distribution_groups distribution_groups_project_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_groups
    ADD CONSTRAINT distribution_groups_project_id_name_key UNIQUE (project_id, name);


--
-- Name: cost_code_divisions divisions_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_code_divisions
    ADD CONSTRAINT divisions_code_unique UNIQUE (code);


--
-- Name: cost_code_divisions divisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_code_divisions
    ADD CONSTRAINT divisions_pkey PRIMARY KEY (id);


--
-- Name: document_chunks document_chunks_document_id_chunk_index_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_chunks
    ADD CONSTRAINT document_chunks_document_id_chunk_index_key UNIQUE (document_id, chunk_index);


--
-- Name: document_chunks document_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_chunks
    ADD CONSTRAINT document_chunks_pkey PRIMARY KEY (chunk_id);


--
-- Name: document_executive_summaries document_executive_summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_executive_summaries
    ADD CONSTRAINT document_executive_summaries_pkey PRIMARY KEY (id);


--
-- Name: document_group_access document_group_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_group_access
    ADD CONSTRAINT document_group_access_pkey PRIMARY KEY (document_id, group_id);


--
-- Name: document_insights document_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_insights
    ADD CONSTRAINT document_insights_pkey PRIMARY KEY (id);


--
-- Name: document_metadata document_metadata_file_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_metadata
    ADD CONSTRAINT document_metadata_file_id_key UNIQUE (file_id);


--
-- Name: document_metadata document_metadata_fireflies_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_metadata
    ADD CONSTRAINT document_metadata_fireflies_id_unique UNIQUE (fireflies_id);


--
-- Name: document_metadata document_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_metadata
    ADD CONSTRAINT document_metadata_pkey PRIMARY KEY (id);


--
-- Name: document_rows document_rows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_rows
    ADD CONSTRAINT document_rows_pkey PRIMARY KEY (id);


--
-- Name: document_user_access document_user_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_user_access
    ADD CONSTRAINT document_user_access_pkey PRIMARY KEY (document_id, user_id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: erp_sync_log erp_sync_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_sync_log
    ADD CONSTRAINT erp_sync_log_pkey PRIMARY KEY (id);


--
-- Name: financial_contracts financial_contracts_contract_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_contracts
    ADD CONSTRAINT financial_contracts_contract_number_key UNIQUE (contract_number);


--
-- Name: financial_contracts financial_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_contracts
    ADD CONSTRAINT financial_contracts_pkey PRIMARY KEY (id);


--
-- Name: fireflies_ingestion_jobs fireflies_ingestion_jobs_fireflies_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fireflies_ingestion_jobs
    ADD CONSTRAINT fireflies_ingestion_jobs_fireflies_id_key UNIQUE (fireflies_id);


--
-- Name: fireflies_ingestion_jobs fireflies_ingestion_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fireflies_ingestion_jobs
    ADD CONSTRAINT fireflies_ingestion_jobs_pkey PRIMARY KEY (id);


--
-- Name: fm_blocks fm_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_blocks
    ADD CONSTRAINT fm_blocks_pkey PRIMARY KEY (id);


--
-- Name: fm_cost_factors fm_cost_factors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_cost_factors
    ADD CONSTRAINT fm_cost_factors_pkey PRIMARY KEY (id);


--
-- Name: fm_documents fm_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_documents
    ADD CONSTRAINT fm_documents_pkey PRIMARY KEY (id);


--
-- Name: fm_form_submissions fm_form_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_form_submissions
    ADD CONSTRAINT fm_form_submissions_pkey PRIMARY KEY (id);


--
-- Name: fm_global_figures fm_global_figures_figure_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_global_figures
    ADD CONSTRAINT fm_global_figures_figure_number_key UNIQUE (figure_number);


--
-- Name: fm_global_figures fm_global_figures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_global_figures
    ADD CONSTRAINT fm_global_figures_pkey PRIMARY KEY (id);


--
-- Name: fm_global_tables fm_global_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_global_tables
    ADD CONSTRAINT fm_global_tables_pkey PRIMARY KEY (id);


--
-- Name: fm_global_tables fm_global_tables_table_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_global_tables
    ADD CONSTRAINT fm_global_tables_table_id_key UNIQUE (table_id);


--
-- Name: fm_optimization_rules fm_optimization_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_optimization_rules
    ADD CONSTRAINT fm_optimization_rules_pkey PRIMARY KEY (id);


--
-- Name: fm_optimization_suggestions fm_optimization_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_optimization_suggestions
    ADD CONSTRAINT fm_optimization_suggestions_pkey PRIMARY KEY (id);


--
-- Name: fm_sections fm_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_sections
    ADD CONSTRAINT fm_sections_pkey PRIMARY KEY (id);


--
-- Name: fm_sections fm_sections_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_sections
    ADD CONSTRAINT fm_sections_slug_key UNIQUE (slug);


--
-- Name: fm_sprinkler_configs fm_sprinkler_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_sprinkler_configs
    ADD CONSTRAINT fm_sprinkler_configs_pkey PRIMARY KEY (id);


--
-- Name: fm_table_vectors fm_table_vectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_table_vectors
    ADD CONSTRAINT fm_table_vectors_pkey PRIMARY KEY (id);


--
-- Name: fm_text_chunks fm_text_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_text_chunks
    ADD CONSTRAINT fm_text_chunks_pkey PRIMARY KEY (id);


--
-- Name: forecasting_curves forecasting_curves_company_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecasting_curves
    ADD CONSTRAINT forecasting_curves_company_name_unique UNIQUE (company_id, name);


--
-- Name: forecasting_curves forecasting_curves_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecasting_curves
    ADD CONSTRAINT forecasting_curves_pkey PRIMARY KEY (id);


--
-- Name: forecasting forecasting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecasting
    ADD CONSTRAINT forecasting_pkey PRIMARY KEY (id);


--
-- Name: group_members group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_pkey PRIMARY KEY (group_id, user_id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: ingestion_jobs ingestion_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingestion_jobs
    ADD CONSTRAINT ingestion_jobs_pkey PRIMARY KEY (id);


--
-- Name: initiatives initiatives_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.initiatives
    ADD CONSTRAINT initiatives_name_key UNIQUE (name);


--
-- Name: initiatives initiatives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.initiatives
    ADD CONSTRAINT initiatives_pkey PRIMARY KEY (id);


--
-- Name: issues issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_pkey PRIMARY KEY (id);


--
-- Name: meeting_segments meeting_segments_metadata_id_segment_index_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_segments
    ADD CONSTRAINT meeting_segments_metadata_id_segment_index_key UNIQUE (metadata_id, segment_index);


--
-- Name: meeting_segments meeting_segments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_segments
    ADD CONSTRAINT meeting_segments_pkey PRIMARY KEY (id);


--
-- Name: memories memories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.memories
    ADD CONSTRAINT memories_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: nods_page nods_page_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nods_page
    ADD CONSTRAINT nods_page_path_key UNIQUE (path);


--
-- Name: nods_page nods_page_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nods_page
    ADD CONSTRAINT nods_page_pkey PRIMARY KEY (id);


--
-- Name: nods_page_section nods_page_section_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nods_page_section
    ADD CONSTRAINT nods_page_section_pkey PRIMARY KEY (id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: opportunities opportunities_metadata_id_description_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_metadata_id_description_key UNIQUE (metadata_id, description);


--
-- Name: opportunities opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_pkey PRIMARY KEY (id);


--
-- Name: optimization_rules optimization_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_rules
    ADD CONSTRAINT optimization_rules_pkey PRIMARY KEY (id);


--
-- Name: owner_invoice_line_items owner_invoice_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owner_invoice_line_items
    ADD CONSTRAINT owner_invoice_line_items_pkey PRIMARY KEY (id);


--
-- Name: owner_invoices owner_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owner_invoices
    ADD CONSTRAINT owner_invoices_pkey PRIMARY KEY (id);


--
-- Name: parts parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parts
    ADD CONSTRAINT parts_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: pcco_line_items pcco_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pcco_line_items
    ADD CONSTRAINT pcco_line_items_pkey PRIMARY KEY (id);


--
-- Name: pco_line_items pco_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pco_line_items
    ADD CONSTRAINT pco_line_items_pkey PRIMARY KEY (id);


--
-- Name: people people_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_pkey PRIMARY KEY (id);


--
-- Name: permission_templates permission_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_templates
    ADD CONSTRAINT permission_templates_pkey PRIMARY KEY (id);


--
-- Name: prime_contract_change_orders prime_contract_change_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prime_contract_change_orders
    ADD CONSTRAINT prime_contract_change_orders_pkey PRIMARY KEY (id);


--
-- Name: prime_contract_sovs prime_contract_sovs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prime_contract_sovs
    ADD CONSTRAINT prime_contract_sovs_pkey PRIMARY KEY (id);


--
-- Name: prime_contracts prime_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prime_contracts
    ADD CONSTRAINT prime_contracts_pkey PRIMARY KEY (id);


--
-- Name: prime_contracts prime_contracts_project_id_contract_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prime_contracts
    ADD CONSTRAINT prime_contracts_project_id_contract_number_key UNIQUE (project_id, contract_number);


--
-- Name: prime_potential_change_orders prime_potential_change_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prime_potential_change_orders
    ADD CONSTRAINT prime_potential_change_orders_pkey PRIMARY KEY (id);


--
-- Name: processing_queue processing_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_queue
    ADD CONSTRAINT processing_queue_pkey PRIMARY KEY (id);


--
-- Name: procore_capture_sessions procore_capture_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procore_capture_sessions
    ADD CONSTRAINT procore_capture_sessions_pkey PRIMARY KEY (id);


--
-- Name: procore_components procore_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procore_components
    ADD CONSTRAINT procore_components_pkey PRIMARY KEY (id);


--
-- Name: procore_features procore_features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procore_features
    ADD CONSTRAINT procore_features_pkey PRIMARY KEY (id);


--
-- Name: procore_modules procore_modules_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procore_modules
    ADD CONSTRAINT procore_modules_name_key UNIQUE (name);


--
-- Name: procore_modules procore_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procore_modules
    ADD CONSTRAINT procore_modules_pkey PRIMARY KEY (id);


--
-- Name: procore_pages procore_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procore_pages
    ADD CONSTRAINT procore_pages_pkey PRIMARY KEY (id);


--
-- Name: procore_screenshots procore_screenshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procore_screenshots
    ADD CONSTRAINT procore_screenshots_pkey PRIMARY KEY (id);


--
-- Name: project_briefings project_briefings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_briefings
    ADD CONSTRAINT project_briefings_pkey PRIMARY KEY (id);


--
-- Name: project_budget_codes project_budget_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budget_codes
    ADD CONSTRAINT project_budget_codes_pkey PRIMARY KEY (id);


--
-- Name: project_companies project_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_companies
    ADD CONSTRAINT project_companies_pkey PRIMARY KEY (id);


--
-- Name: project_companies project_companies_project_id_company_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_companies
    ADD CONSTRAINT project_companies_project_id_company_id_key UNIQUE (project_id, company_id);


--
-- Name: project_companies project_companies_project_id_erp_vendor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_companies
    ADD CONSTRAINT project_companies_project_id_erp_vendor_id_key UNIQUE (project_id, erp_vendor_id);


--
-- Name: project_cost_codes project_cost_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_cost_codes
    ADD CONSTRAINT project_cost_codes_pkey PRIMARY KEY (id);


--
-- Name: project_directory_memberships project_directory_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_directory_memberships
    ADD CONSTRAINT project_directory_memberships_pkey PRIMARY KEY (id);


--
-- Name: project_directory_memberships project_directory_memberships_project_id_person_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_directory_memberships
    ADD CONSTRAINT project_directory_memberships_project_id_person_id_key UNIQUE (project_id, person_id);


--
-- Name: project_insights project_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_insights
    ADD CONSTRAINT project_insights_pkey PRIMARY KEY (id);


--
-- Name: project_resources project_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_resources
    ADD CONSTRAINT project_resources_pkey PRIMARY KEY (id);


--
-- Name: project_role_members project_role_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_role_members
    ADD CONSTRAINT project_role_members_pkey PRIMARY KEY (id);


--
-- Name: project_role_members project_role_members_project_role_id_person_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_role_members
    ADD CONSTRAINT project_role_members_project_role_id_person_id_key UNIQUE (project_role_id, person_id);


--
-- Name: project_roles project_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_roles
    ADD CONSTRAINT project_roles_pkey PRIMARY KEY (id);


--
-- Name: project_roles project_roles_project_id_role_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_roles
    ADD CONSTRAINT project_roles_project_id_role_name_key UNIQUE (project_id, role_name);


--
-- Name: project_tasks project_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_pkey PRIMARY KEY (id);


--
-- Name: projects_audit projects_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects_audit
    ADD CONSTRAINT projects_audit_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: prospects prospects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_sov_items purchase_order_sov_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_sov_items
    ADD CONSTRAINT purchase_order_sov_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_project_id_contract_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_project_id_contract_number_key UNIQUE (project_id, contract_number);


--
-- Name: qa_page_audit qa_page_audit_page_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_page_audit
    ADD CONSTRAINT qa_page_audit_page_path_key UNIQUE (page_path);


--
-- Name: qa_page_audit qa_page_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qa_page_audit
    ADD CONSTRAINT qa_page_audit_pkey PRIMARY KEY (id);


--
-- Name: qto_items qto_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qto_items
    ADD CONSTRAINT qto_items_pkey PRIMARY KEY (id);


--
-- Name: qtos qtos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qtos
    ADD CONSTRAINT qtos_pkey PRIMARY KEY (id);


--
-- Name: rag_pipeline_state rag_pipeline_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_pipeline_state
    ADD CONSTRAINT rag_pipeline_state_pkey PRIMARY KEY (pipeline_id);


--
-- Name: requests requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_pkey PRIMARY KEY (id);


--
-- Name: files resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: review_comments review_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: rfi_assignees rfi_assignees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfi_assignees
    ADD CONSTRAINT rfi_assignees_pkey PRIMARY KEY (rfi_id, employee_id);


--
-- Name: rfis rfis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfis
    ADD CONSTRAINT rfis_pkey PRIMARY KEY (id);


--
-- Name: risks risks_metadata_id_description_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_metadata_id_description_key UNIQUE (metadata_id, description);


--
-- Name: risks risks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_pkey PRIMARY KEY (id);


--
-- Name: schedule_deadlines schedule_deadlines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_deadlines
    ADD CONSTRAINT schedule_deadlines_pkey PRIMARY KEY (id);


--
-- Name: schedule_dependencies schedule_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_dependencies
    ADD CONSTRAINT schedule_dependencies_pkey PRIMARY KEY (id);


--
-- Name: schedule_of_values schedule_of_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_of_values
    ADD CONSTRAINT schedule_of_values_pkey PRIMARY KEY (id);


--
-- Name: schedule_tasks schedule_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_tasks
    ADD CONSTRAINT schedule_tasks_pkey PRIMARY KEY (id);


--
-- Name: sources sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_pkey PRIMARY KEY (source_id);


--
-- Name: sov_line_items sov_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sov_line_items
    ADD CONSTRAINT sov_line_items_pkey PRIMARY KEY (id);


--
-- Name: subcontract_sov_items sov_line_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontract_sov_items
    ADD CONSTRAINT sov_line_number_unique UNIQUE (subcontract_id, line_number);


--
-- Name: specifications specifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specifications
    ADD CONSTRAINT specifications_pkey PRIMARY KEY (id);


--
-- Name: sub_jobs sub_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_jobs
    ADD CONSTRAINT sub_jobs_pkey PRIMARY KEY (id);


--
-- Name: subcontract_attachments subcontract_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontract_attachments
    ADD CONSTRAINT subcontract_attachments_pkey PRIMARY KEY (id);


--
-- Name: subcontract_sov_items subcontract_sov_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontract_sov_items
    ADD CONSTRAINT subcontract_sov_items_pkey PRIMARY KEY (id);


--
-- Name: subcontractor_contacts subcontractor_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontractor_contacts
    ADD CONSTRAINT subcontractor_contacts_pkey PRIMARY KEY (id);


--
-- Name: subcontractor_documents subcontractor_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontractor_documents
    ADD CONSTRAINT subcontractor_documents_pkey PRIMARY KEY (id);


--
-- Name: subcontractor_projects subcontractor_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontractor_projects
    ADD CONSTRAINT subcontractor_projects_pkey PRIMARY KEY (id);


--
-- Name: subcontractors subcontractors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontractors
    ADD CONSTRAINT subcontractors_pkey PRIMARY KEY (id);


--
-- Name: subcontracts subcontracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontracts
    ADD CONSTRAINT subcontracts_pkey PRIMARY KEY (id);


--
-- Name: submittal_analytics_events submittal_analytics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submittal_analytics_events
    ADD CONSTRAINT submittal_analytics_events_pkey PRIMARY KEY (id);


--
-- Name: submittal_documents submittal_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submittal_documents
    ADD CONSTRAINT submittal_documents_pkey PRIMARY KEY (id);


--
-- Name: submittal_history submittal_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submittal_history
    ADD CONSTRAINT submittal_history_pkey PRIMARY KEY (id);


--
-- Name: submittal_notifications submittal_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submittal_notifications
    ADD CONSTRAINT submittal_notifications_pkey PRIMARY KEY (id);


--
-- Name: submittal_performance_metrics submittal_performance_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submittal_performance_metrics
    ADD CONSTRAINT submittal_performance_metrics_pkey PRIMARY KEY (id);


--
-- Name: submittal_types submittal_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submittal_types
    ADD CONSTRAINT submittal_types_name_key UNIQUE (name);


--
-- Name: submittal_types submittal_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submittal_types
    ADD CONSTRAINT submittal_types_pkey PRIMARY KEY (id);


--
-- Name: submittals submittals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submittals
    ADD CONSTRAINT submittals_pkey PRIMARY KEY (id);


--
-- Name: submittals submittals_project_id_submittal_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submittals
    ADD CONSTRAINT submittals_project_id_submittal_number_key UNIQUE (project_id, submittal_number);


--
-- Name: sync_status sync_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_status
    ADD CONSTRAINT sync_status_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_metadata_id_description_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_metadata_id_description_key UNIQUE (metadata_id, description);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: todos todos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_pkey PRIMARY KEY (id);


--
-- Name: project_briefings unique_latest_briefing; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_briefings
    ADD CONSTRAINT unique_latest_briefing UNIQUE (project_id, version);


--
-- Name: budget_lines uq_budget_line; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_lines
    ADD CONSTRAINT uq_budget_line UNIQUE (project_id, sub_job_key, cost_code_id, cost_type_id);


--
-- Name: budget_modifications uq_budget_mod_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_modifications
    ADD CONSTRAINT uq_budget_mod_number UNIQUE (project_id, number);


--
-- Name: schedule_dependencies uq_dependency; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_dependencies
    ADD CONSTRAINT uq_dependency UNIQUE (predecessor_task_id, task_id);


--
-- Name: project_directory_memberships uq_pdm_project_person; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_directory_memberships
    ADD CONSTRAINT uq_pdm_project_person UNIQUE (project_id, person_id);


--
-- Name: project_budget_codes uq_project_budget_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budget_codes
    ADD CONSTRAINT uq_project_budget_code UNIQUE (project_id, sub_job_key, cost_code_id, cost_type_id);


--
-- Name: sub_jobs uq_subjob_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_jobs
    ADD CONSTRAINT uq_subjob_code UNIQUE (project_id, code);


--
-- Name: schedule_deadlines uq_task_deadline; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_deadlines
    ADD CONSTRAINT uq_task_deadline UNIQUE (task_id);


--
-- Name: user_directory_permissions user_directory_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_directory_permissions
    ADD CONSTRAINT user_directory_permissions_pkey PRIMARY KEY (id);


--
-- Name: user_directory_permissions user_directory_permissions_project_id_person_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_directory_permissions
    ADD CONSTRAINT user_directory_permissions_project_id_person_id_key UNIQUE (project_id, person_id);


--
-- Name: user_email_notifications user_email_notifications_person_id_project_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_email_notifications
    ADD CONSTRAINT user_email_notifications_person_id_project_id_key UNIQUE (person_id, project_id);


--
-- Name: user_email_notifications user_email_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_email_notifications
    ADD CONSTRAINT user_email_notifications_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_project_preferences user_project_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_project_preferences
    ADD CONSTRAINT user_project_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_project_preferences user_project_preferences_user_id_project_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_project_preferences
    ADD CONSTRAINT user_project_preferences_user_id_project_id_key UNIQUE (user_id, project_id);


--
-- Name: user_project_roles user_project_roles_membership_id_role_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_project_roles
    ADD CONSTRAINT user_project_roles_membership_id_role_name_key UNIQUE (membership_id, role_name);


--
-- Name: user_project_roles user_project_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_project_roles
    ADD CONSTRAINT user_project_roles_pkey PRIMARY KEY (id);


--
-- Name: user_projects user_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_projects
    ADD CONSTRAINT user_projects_pkey PRIMARY KEY (id);


--
-- Name: user_schedule_notifications user_schedule_notifications_person_id_project_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_schedule_notifications
    ADD CONSTRAINT user_schedule_notifications_person_id_project_id_key UNIQUE (person_id, project_id);


--
-- Name: user_schedule_notifications user_schedule_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_schedule_notifications
    ADD CONSTRAINT user_schedule_notifications_pkey PRIMARY KEY (id);


--
-- Name: users_auth users_auth_auth_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_auth
    ADD CONSTRAINT users_auth_auth_user_id_key UNIQUE (auth_user_id);


--
-- Name: users_auth users_auth_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_auth
    ADD CONSTRAINT users_auth_pkey PRIMARY KEY (person_id);


--
-- Name: vendors vendors_company_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_company_id_name_key UNIQUE (company_id, name);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: vertical_markup vertical_markup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vertical_markup
    ADD CONSTRAINT vertical_markup_pkey PRIMARY KEY (id);


--
-- Name: vertical_markup vertical_markup_project_id_markup_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vertical_markup
    ADD CONSTRAINT vertical_markup_project_id_markup_type_key UNIQUE (project_id, markup_type);


--
-- Name: asrs_blocks_meta_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX asrs_blocks_meta_gin ON public.asrs_blocks USING gin (meta);


--
-- Name: asrs_blocks_section_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX asrs_blocks_section_idx ON public.asrs_blocks USING btree (section_id);


--
-- Name: asrs_sections_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX asrs_sections_number_idx ON public.asrs_sections USING btree (number);


--
-- Name: block_embeddings_source_text_fts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX block_embeddings_source_text_fts ON public.asrs_blocks USING gin (to_tsvector('english'::regconfig, source_text));


--
-- Name: budget_line_item_history_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX budget_line_item_history_date_idx ON public.budget_line_item_history USING btree (performed_at DESC);


--
-- Name: budget_line_item_history_event_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX budget_line_item_history_event_idx ON public.budget_line_item_history USING btree (event_type);


--
-- Name: budget_line_item_history_item_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX budget_line_item_history_item_idx ON public.budget_line_item_history USING btree (budget_line_item_id);


--
-- Name: budget_line_item_history_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX budget_line_item_history_project_idx ON public.budget_line_item_history USING btree (project_id);


--
-- Name: chat_messages_session_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chat_messages_session_id_idx ON public.chat_messages USING btree (session_id);


--
-- Name: chat_sessions_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chat_sessions_user_id_idx ON public.chat_sessions USING btree (user_id);


--
-- Name: code_examples_embedding_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX code_examples_embedding_idx ON public.code_examples USING ivfflat (embedding public.vector_cosine_ops);


--
-- Name: contract_financial_summary_mv_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contract_financial_summary_mv_client_id ON public.contract_financial_summary_mv USING btree (client_id);


--
-- Name: contract_financial_summary_mv_contract_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contract_financial_summary_mv_contract_id ON public.contract_financial_summary_mv USING btree (contract_id);


--
-- Name: contract_financial_summary_mv_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contract_financial_summary_mv_project_id ON public.contract_financial_summary_mv USING btree (project_id);


--
-- Name: crawled_pages_embedding_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX crawled_pages_embedding_idx ON public.crawled_pages USING ivfflat (embedding public.vector_cosine_ops);


--
-- Name: decisions_embedding_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX decisions_embedding_idx ON public.decisions USING hnsw (embedding public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: decisions_project_ids_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX decisions_project_ids_gin_idx ON public.decisions USING gin (project_ids);


--
-- Name: document_chunks_embedding_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_chunks_embedding_idx ON public.document_chunks USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: documents_project_ids_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documents_project_ids_gin_idx ON public.documents USING gin (project_ids);


--
-- Name: fireflies_ingestion_jobs_metadata_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fireflies_ingestion_jobs_metadata_idx ON public.fireflies_ingestion_jobs USING btree (metadata_id);


--
-- Name: fireflies_ingestion_jobs_stage_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fireflies_ingestion_jobs_stage_idx ON public.fireflies_ingestion_jobs USING btree (stage);


--
-- Name: fm_documents_embedding_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fm_documents_embedding_idx ON public.fm_documents USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='50');


--
-- Name: fm_global_figures_claims_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fm_global_figures_claims_gin ON public.fm_global_figures USING gin (machine_readable_claims);


--
-- Name: fm_global_figures_num_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fm_global_figures_num_idx ON public.fm_global_figures USING btree (figure_number);


--
-- Name: fm_global_tables_specs_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fm_global_tables_specs_gin ON public.fm_global_tables USING gin (sprinkler_specifications);


--
-- Name: fm_global_tables_tableid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fm_global_tables_tableid_idx ON public.fm_global_tables USING btree (table_id);


--
-- Name: fm_table_vectors_embedding_cosine_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fm_table_vectors_embedding_cosine_idx ON public.fm_table_vectors USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: fm_table_vectors_embedding_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fm_table_vectors_embedding_idx ON public.fm_table_vectors USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: fm_table_vectors_embedding_l2_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fm_table_vectors_embedding_l2_idx ON public.fm_table_vectors USING ivfflat (embedding) WITH (lists='100');


--
-- Name: idx_ai_analysis_results; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_analysis_results ON public.ai_analysis_jobs USING gin (results);


--
-- Name: idx_ai_insights_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_assigned_to ON public.ai_insights USING btree (assigned_to) WHERE (assigned_to IS NOT NULL);


--
-- Name: idx_ai_insights_chunks_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_chunks_id ON public.ai_insights USING btree (chunks_id);


--
-- Name: idx_ai_insights_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_created_at ON public.ai_insights USING btree (created_at DESC);


--
-- Name: idx_ai_insights_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_document_id ON public.ai_insights USING btree (document_id);


--
-- Name: idx_ai_insights_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_due_date ON public.ai_insights USING btree (due_date) WHERE (due_date IS NOT NULL);


--
-- Name: idx_ai_insights_exact_quotes_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_exact_quotes_search ON public.ai_insights USING gin (to_tsvector('english'::regconfig, COALESCE((exact_quotes)::text, ''::text))) WHERE (exact_quotes IS NOT NULL);


--
-- Name: idx_ai_insights_exact_quotes_tsv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_exact_quotes_tsv ON public.ai_insights USING gin (to_tsvector('english'::regconfig, COALESCE(exact_quotes_text, ''::text))) WHERE (exact_quotes_text IS NOT NULL);


--
-- Name: idx_ai_insights_meeting_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_meeting_name ON public.ai_insights USING btree (meeting_name);


--
-- Name: idx_ai_insights_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_project ON public.ai_insights USING btree (project_id);


--
-- Name: idx_ai_insights_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_project_id ON public.ai_insights USING btree (project_id);


--
-- Name: idx_ai_insights_project_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_project_name ON public.ai_insights USING btree (project_name);


--
-- Name: idx_ai_insights_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_status ON public.ai_insights USING btree (status);


--
-- Name: idx_ai_insights_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_type ON public.ai_insights USING btree (insight_type);


--
-- Name: idx_ai_tasks_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_tasks_due_date ON public.ai_tasks USING btree (status, due_date);


--
-- Name: idx_ai_tasks_project_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_tasks_project_status ON public.ai_tasks USING btree (project_id, status);


--
-- Name: idx_asrs_blocks_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asrs_blocks_section ON public.asrs_blocks USING btree (section_id, ordinal);


--
-- Name: idx_asrs_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asrs_lookup ON public.asrs_decision_matrix USING btree (asrs_type, container_type, max_depth_ft, max_spacing_ft);


--
-- Name: idx_asrs_sections_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asrs_sections_slug ON public.asrs_sections USING btree (slug);


--
-- Name: idx_asrs_sections_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asrs_sections_sort ON public.asrs_sections USING btree (sort_key);


--
-- Name: idx_attachments_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attachments_project_id ON public.attachments USING btree (project_id);


--
-- Name: idx_attachments_subcontract_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attachments_subcontract_id ON public.subcontract_attachments USING btree (subcontract_id);


--
-- Name: idx_billing_periods_billing_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_periods_billing_date ON public.contract_billing_periods USING btree (billing_date);


--
-- Name: idx_billing_periods_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_periods_contract ON public.contract_billing_periods USING btree (contract_id);


--
-- Name: idx_billing_periods_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_periods_created_at ON public.contract_billing_periods USING btree (created_at);


--
-- Name: idx_billing_periods_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_periods_project ON public.billing_periods USING btree (project_id);


--
-- Name: idx_billing_periods_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_periods_status ON public.contract_billing_periods USING btree (status);


--
-- Name: idx_briefings_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_briefings_date ON public.project_briefings USING btree (generated_at DESC);


--
-- Name: idx_briefings_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_briefings_project ON public.project_briefings USING btree (project_id);


--
-- Name: idx_budget_line_history_budget_line_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_line_history_budget_line_id ON public.budget_line_history USING btree (budget_line_id);


--
-- Name: idx_budget_line_history_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_line_history_changed_at ON public.budget_line_history USING btree (changed_at DESC);


--
-- Name: idx_budget_line_history_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_line_history_project_id ON public.budget_line_history USING btree (project_id);


--
-- Name: idx_budget_lines_cost_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_lines_cost_code ON public.budget_lines USING btree (cost_code_id);


--
-- Name: idx_budget_lines_cost_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_lines_cost_type ON public.budget_lines USING btree (cost_type_id);


--
-- Name: idx_budget_lines_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_lines_project ON public.budget_lines USING btree (project_id);


--
-- Name: idx_budget_lines_project_budget_code_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_lines_project_budget_code_id ON public.budget_lines USING btree (project_budget_code_id);


--
-- Name: idx_budget_lines_sub_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_lines_sub_job ON public.budget_lines USING btree (sub_job_id) WHERE (sub_job_id IS NOT NULL);


--
-- Name: idx_budget_lines_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_lines_updated_at ON public.budget_lines USING btree (updated_at DESC);


--
-- Name: idx_budget_mod_lines_cost_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_mod_lines_cost_code ON public.budget_mod_lines USING btree (cost_code_id);


--
-- Name: idx_budget_mod_lines_cost_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_mod_lines_cost_type ON public.budget_mod_lines USING btree (cost_type_id);


--
-- Name: idx_budget_mod_lines_mod; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_mod_lines_mod ON public.budget_mod_lines USING btree (budget_modification_id);


--
-- Name: idx_budget_mod_lines_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_mod_lines_project ON public.budget_mod_lines USING btree (project_id);


--
-- Name: idx_budget_modification_lines_budget_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_modification_lines_budget_line ON public.budget_modification_lines USING btree (budget_line_id);


--
-- Name: idx_budget_modification_lines_modification; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_modification_lines_modification ON public.budget_modification_lines USING btree (budget_modification_id);


--
-- Name: idx_budget_modifications_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_modifications_project ON public.budget_modifications USING btree (project_id);


--
-- Name: idx_budget_modifications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_modifications_status ON public.budget_modifications USING btree (status);


--
-- Name: idx_budget_mods_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_mods_project ON public.budget_modifications USING btree (project_id);


--
-- Name: idx_budget_mods_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_mods_status ON public.budget_modifications USING btree (status);


--
-- Name: idx_budget_view_columns_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_view_columns_order ON public.budget_view_columns USING btree (view_id, display_order);


--
-- Name: idx_budget_view_columns_view; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_view_columns_view ON public.budget_view_columns USING btree (view_id);


--
-- Name: idx_budget_views_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_views_default ON public.budget_views USING btree (project_id, is_default) WHERE (is_default = true);


--
-- Name: idx_budget_views_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_views_project ON public.budget_views USING btree (project_id);


--
-- Name: idx_ce_approvals_approver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ce_approvals_approver ON public.change_event_approvals USING btree (approver_id);


--
-- Name: idx_ce_approvals_change_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ce_approvals_change_event ON public.change_event_approvals USING btree (change_event_id);


--
-- Name: idx_ce_approvals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ce_approvals_status ON public.change_event_approvals USING btree (approval_status);


--
-- Name: idx_ce_attachments_change_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ce_attachments_change_event ON public.change_event_attachments USING btree (change_event_id);


--
-- Name: idx_ce_attachments_uploaded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ce_attachments_uploaded_at ON public.change_event_attachments USING btree (uploaded_at DESC);


--
-- Name: idx_ce_history_change_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ce_history_change_event ON public.change_event_history USING btree (change_event_id);


--
-- Name: idx_ce_history_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ce_history_changed_at ON public.change_event_history USING btree (changed_at DESC);


--
-- Name: idx_ce_history_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ce_history_changed_by ON public.change_event_history USING btree (changed_by);


--
-- Name: idx_ce_line_items_budget_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ce_line_items_budget_code ON public.change_event_line_items USING btree (budget_code_id);


--
-- Name: idx_ce_line_items_change_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ce_line_items_change_event ON public.change_event_line_items USING btree (change_event_id);


--
-- Name: idx_ce_line_items_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ce_line_items_contract ON public.change_event_line_items USING btree (contract_id);


--
-- Name: idx_ce_line_items_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ce_line_items_sort ON public.change_event_line_items USING btree (change_event_id, sort_order);


--
-- Name: idx_ce_line_items_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ce_line_items_vendor ON public.change_event_line_items USING btree (vendor_id);


--
-- Name: idx_change_event_rfq_attachments_response; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_event_rfq_attachments_response ON public.change_event_rfq_attachments USING btree (rfq_response_id);


--
-- Name: idx_change_event_rfq_attachments_rfq; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_event_rfq_attachments_rfq ON public.change_event_rfq_attachments USING btree (rfq_id);


--
-- Name: idx_change_event_rfq_responses_rfq; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_event_rfq_responses_rfq ON public.change_event_rfq_responses USING btree (rfq_id);


--
-- Name: idx_change_event_rfq_responses_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_event_rfq_responses_status ON public.change_event_rfq_responses USING btree (status);


--
-- Name: idx_change_event_rfqs_change_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_event_rfqs_change_event ON public.change_event_rfqs USING btree (change_event_id);


--
-- Name: idx_change_event_rfqs_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_event_rfqs_due_date ON public.change_event_rfqs USING btree (due_date);


--
-- Name: idx_change_event_rfqs_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_event_rfqs_project ON public.change_event_rfqs USING btree (project_id);


--
-- Name: idx_change_event_rfqs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_event_rfqs_status ON public.change_event_rfqs USING btree (status);


--
-- Name: idx_change_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_events_created_at ON public.change_events USING btree (created_at DESC);


--
-- Name: idx_change_events_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_events_created_by ON public.change_events USING btree (created_by);


--
-- Name: idx_change_events_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_events_deleted_at ON public.change_events USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_change_events_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_events_number ON public.change_events USING btree (project_id, number);


--
-- Name: idx_change_events_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_events_project_id ON public.change_events USING btree (project_id);


--
-- Name: idx_change_events_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_events_status ON public.change_events USING btree (status);


--
-- Name: idx_change_events_summary_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_events_summary_project ON public.change_events_summary USING btree (project_id);


--
-- Name: idx_change_events_summary_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_events_summary_status ON public.change_events_summary USING btree (status);


--
-- Name: idx_change_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_events_type ON public.change_events USING btree (type);


--
-- Name: idx_change_orders_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_orders_approved_by ON public.contract_change_orders USING btree (approved_by);


--
-- Name: idx_change_orders_co_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_orders_co_number ON public.change_orders USING btree (co_number);


--
-- Name: idx_change_orders_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_orders_contract ON public.contract_change_orders USING btree (contract_id);


--
-- Name: idx_change_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_orders_created_at ON public.contract_change_orders USING btree (created_at);


--
-- Name: idx_change_orders_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_orders_project_id ON public.change_orders USING btree (project_id);


--
-- Name: idx_change_orders_requested_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_orders_requested_by ON public.contract_change_orders USING btree (requested_by);


--
-- Name: idx_change_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_orders_status ON public.contract_change_orders USING btree (status);


--
-- Name: idx_chat_history_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_history_session_id ON public.chat_history USING btree (session_id);


--
-- Name: idx_chat_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_history_user_id ON public.chat_history USING btree (user_id);


--
-- Name: idx_chat_thread_items_thread_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_thread_items_thread_created ON public.chat_thread_items USING btree (thread_id, created_at DESC);


--
-- Name: idx_chat_threads_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_threads_created_at ON public.chat_threads USING btree (created_at DESC);


--
-- Name: idx_chunks_chunk_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chunks_chunk_index ON public.chunks USING btree (document_id, chunk_index);


--
-- Name: idx_chunks_content_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chunks_content_trgm ON public.chunks USING gin (content public.gin_trgm_ops);


--
-- Name: idx_chunks_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chunks_document_id ON public.chunks USING btree (document_id);


--
-- Name: idx_chunks_document_id_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chunks_document_id_title ON public.chunks USING btree (document_id, document_title);


--
-- Name: idx_chunks_embedding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chunks_embedding ON public.chunks USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='1');


--
-- Name: idx_co_approvals_co_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_co_approvals_co_id ON public.change_order_approvals USING btree (change_order_id);


--
-- Name: idx_co_costs_change_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_co_costs_change_order_id ON public.change_order_costs USING btree (change_order_id);


--
-- Name: idx_co_lines_change_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_co_lines_change_order ON public.change_order_lines USING btree (change_order_id);


--
-- Name: idx_co_lines_cost_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_co_lines_cost_code ON public.change_order_lines USING btree (cost_code_id);


--
-- Name: idx_co_lines_cost_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_co_lines_cost_type ON public.change_order_lines USING btree (cost_type_id);


--
-- Name: idx_co_lines_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_co_lines_project ON public.change_order_lines USING btree (project_id);


--
-- Name: idx_code_examples_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_code_examples_metadata ON public.code_examples USING gin (metadata);


--
-- Name: idx_code_examples_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_code_examples_source_id ON public.code_examples USING btree (source_id);


--
-- Name: idx_commitment_co_lines_budget_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commitment_co_lines_budget_line ON public.commitment_change_order_lines USING btree (budget_line_id);


--
-- Name: idx_commitment_co_lines_co; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commitment_co_lines_co ON public.commitment_change_order_lines USING btree (commitment_change_order_id);


--
-- Name: idx_companies_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_companies_name ON public.companies USING btree (name);


--
-- Name: idx_companies_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_companies_search ON public.companies USING gin (to_tsvector('english'::regconfig, ((COALESCE(name, ''::text) || ' '::text) || COALESCE(notes, ''::text))));


--
-- Name: idx_companies_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_companies_status ON public.companies USING btree (status);


--
-- Name: idx_companies_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_companies_type ON public.companies USING btree (type);


--
-- Name: idx_components_screenshot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_components_screenshot ON public.procore_components USING btree (screenshot_id);


--
-- Name: idx_components_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_components_type ON public.procore_components USING btree (component_type);


--
-- Name: idx_contract_documents_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_documents_contract ON public.contract_documents USING btree (contract_id);


--
-- Name: idx_contract_documents_is_current; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_documents_is_current ON public.contract_documents USING btree (is_current_version);


--
-- Name: idx_contract_documents_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_documents_type ON public.contract_documents USING btree (document_type);


--
-- Name: idx_contract_documents_uploaded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_documents_uploaded_at ON public.contract_documents USING btree (uploaded_at);


--
-- Name: idx_contract_documents_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_documents_uploaded_by ON public.contract_documents USING btree (uploaded_by);


--
-- Name: idx_contract_line_items_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_line_items_contract ON public.contract_line_items USING btree (contract_id);


--
-- Name: idx_contract_line_items_cost_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_line_items_cost_code ON public.contract_line_items USING btree (cost_code_id);


--
-- Name: idx_contract_line_items_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_line_items_created_at ON public.contract_line_items USING btree (created_at);


--
-- Name: idx_contract_snapshots_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_snapshots_contract ON public.contract_snapshots USING btree (contract_id);


--
-- Name: idx_contract_snapshots_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_snapshots_created_by ON public.contract_snapshots USING btree (created_by);


--
-- Name: idx_contract_snapshots_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_snapshots_date ON public.contract_snapshots USING btree (snapshot_date);


--
-- Name: idx_contract_views_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_views_company ON public.contract_views USING btree (company_id);


--
-- Name: idx_contract_views_is_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_views_is_default ON public.contract_views USING btree (is_default);


--
-- Name: idx_contract_views_is_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_views_is_shared ON public.contract_views USING btree (is_shared);


--
-- Name: idx_contract_views_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_views_user ON public.contract_views USING btree (user_id);


--
-- Name: idx_contracts_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_client_id ON public.contracts USING btree (client_id);


--
-- Name: idx_contracts_erp_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_erp_status ON public.contracts USING btree (erp_status);


--
-- Name: idx_contracts_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_project_id ON public.contracts USING btree (project_id);


--
-- Name: idx_contracts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_status ON public.contracts USING btree (status);


--
-- Name: idx_conversations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_user ON public.conversations USING btree (user_id);


--
-- Name: idx_crawled_pages_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crawled_pages_metadata ON public.crawled_pages USING gin (metadata);


--
-- Name: idx_crawled_pages_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crawled_pages_source_id ON public.crawled_pages USING btree (source_id);


--
-- Name: idx_daily_recaps_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_recaps_date ON public.daily_recaps USING btree (recap_date DESC);


--
-- Name: idx_dgm_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dgm_group_id ON public.distribution_group_members USING btree (group_id);


--
-- Name: idx_dgm_person_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dgm_person_id ON public.distribution_group_members USING btree (person_id);


--
-- Name: idx_dgm_unique_membership; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_dgm_unique_membership ON public.distribution_group_members USING btree (group_id, person_id);


--
-- Name: idx_direct_cost_line_items_budget_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_cost_line_items_budget_code ON public.direct_cost_line_items USING btree (budget_code_id);


--
-- Name: idx_direct_cost_line_items_direct_cost; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_cost_line_items_direct_cost ON public.direct_cost_line_items USING btree (direct_cost_id);


--
-- Name: idx_direct_cost_line_items_unique_order; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_direct_cost_line_items_unique_order ON public.direct_cost_line_items USING btree (direct_cost_id, line_order);


--
-- Name: idx_direct_costs_cost_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_costs_cost_type ON public.direct_costs USING btree (cost_type);


--
-- Name: idx_direct_costs_not_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_costs_not_deleted ON public.direct_costs USING btree (is_deleted) WHERE (is_deleted = false);


--
-- Name: idx_direct_costs_project_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_costs_project_date ON public.direct_costs USING btree (project_id, date);


--
-- Name: idx_direct_costs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_costs_status ON public.direct_costs USING btree (status);


--
-- Name: idx_direct_costs_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_direct_costs_vendor ON public.direct_costs USING btree (vendor_id);


--
-- Name: idx_discrepancies_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discrepancies_location ON public.discrepancies USING gin (location_in_doc);


--
-- Name: idx_discrepancies_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discrepancies_search ON public.discrepancies USING gin (to_tsvector('english'::regconfig, (((title)::text || ' '::text) || description)));


--
-- Name: idx_discrepancies_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discrepancies_severity ON public.discrepancies USING btree (severity);


--
-- Name: idx_discrepancies_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discrepancies_status ON public.discrepancies USING btree (status);


--
-- Name: idx_discrepancies_submittal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discrepancies_submittal_id ON public.discrepancies USING btree (submittal_id);


--
-- Name: idx_discrepancies_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discrepancies_type ON public.discrepancies USING btree (discrepancy_type);


--
-- Name: idx_distribution_group_members_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distribution_group_members_group ON public.distribution_group_members USING btree (group_id);


--
-- Name: idx_distribution_group_members_person; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distribution_group_members_person ON public.distribution_group_members USING btree (person_id);


--
-- Name: idx_distribution_groups_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distribution_groups_project ON public.distribution_groups USING btree (project_id);


--
-- Name: idx_distribution_groups_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distribution_groups_project_id ON public.distribution_groups USING btree (project_id);


--
-- Name: idx_distribution_groups_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distribution_groups_status ON public.distribution_groups USING btree (status);


--
-- Name: idx_document_chunks_content_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_chunks_content_hash ON public.document_chunks USING btree (content_hash);


--
-- Name: idx_document_chunks_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_chunks_created_at ON public.document_chunks USING btree (created_at DESC);


--
-- Name: idx_document_chunks_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_chunks_document_id ON public.document_chunks USING btree (document_id);


--
-- Name: idx_document_insights_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_insights_created_at ON public.document_insights USING btree (created_at DESC);


--
-- Name: idx_document_insights_doc_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_insights_doc_title ON public.document_insights USING gin (to_tsvector('english'::regconfig, doc_title));


--
-- Name: idx_document_insights_document_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_insights_document_date ON public.document_insights USING btree (document_date);


--
-- Name: idx_document_insights_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_insights_document_id ON public.document_insights USING btree (document_id);


--
-- Name: idx_document_insights_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_insights_project_id ON public.document_insights USING btree (project_id);


--
-- Name: idx_document_insights_project_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_insights_project_name ON public.document_insights USING btree (project_name);


--
-- Name: idx_document_insights_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_insights_type ON public.document_insights USING btree (insight_type);


--
-- Name: idx_document_metadata_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_metadata_category ON public.document_metadata USING btree (category);


--
-- Name: idx_document_metadata_composite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_metadata_composite ON public.document_metadata USING btree (type, category, date DESC);


--
-- Name: idx_document_metadata_content_fts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_metadata_content_fts ON public.document_metadata USING gin (to_tsvector('english'::regconfig, content));


--
-- Name: idx_document_metadata_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_metadata_date ON public.document_metadata USING btree (date);


--
-- Name: idx_document_metadata_fireflies_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_metadata_fireflies_id ON public.document_metadata USING btree (fireflies_id);


--
-- Name: idx_document_metadata_lower_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_metadata_lower_title ON public.document_metadata USING btree (lower(title));


--
-- Name: idx_document_metadata_participants; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_metadata_participants ON public.document_metadata USING gin (to_tsvector('english'::regconfig, participants));


--
-- Name: idx_document_metadata_project_captured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_metadata_project_captured ON public.document_metadata USING btree (project_id, captured_at);


--
-- Name: idx_document_metadata_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_metadata_type ON public.document_metadata USING btree (type);


--
-- Name: idx_documents_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_created_at ON public.documents USING btree (created_at DESC);


--
-- Name: idx_documents_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_metadata ON public.documents USING gin (metadata);


--
-- Name: idx_documents_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_project_id ON public.documents USING btree (project_id);


--
-- Name: idx_documents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_status ON public.fm_documents USING btree (processing_status);


--
-- Name: idx_documents_storage_object_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_storage_object_id ON public.documents USING btree (storage_object_id);


--
-- Name: idx_documents_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_type ON public.fm_documents USING btree (document_type);


--
-- Name: idx_features_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_features_module ON public.procore_features USING btree (module_id);


--
-- Name: idx_figures_asrs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_figures_asrs_type ON public.fm_global_figures USING btree (asrs_type);


--
-- Name: idx_figures_container_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_figures_container_type ON public.fm_global_figures USING btree (container_type);


--
-- Name: idx_figures_embedding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_figures_embedding ON public.fm_global_figures USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: idx_figures_keywords; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_figures_keywords ON public.fm_global_figures USING gin (search_keywords);


--
-- Name: idx_figures_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_figures_number ON public.fm_global_figures USING btree (figure_number);


--
-- Name: idx_figures_tables; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_figures_tables ON public.fm_global_figures USING gin (related_tables);


--
-- Name: idx_figures_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_figures_type ON public.fm_global_figures USING btree (figure_type);


--
-- Name: idx_files_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_files_category ON public.files USING btree (category);


--
-- Name: idx_files_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_files_project_id ON public.files USING btree (project_id);


--
-- Name: idx_fm_blocks_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_blocks_search ON public.fm_blocks USING gin (search_vector);


--
-- Name: idx_fm_blocks_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_blocks_section ON public.fm_blocks USING btree (section_id, ordinal);


--
-- Name: idx_fm_blocks_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_blocks_type ON public.fm_blocks USING btree (block_type);


--
-- Name: idx_fm_documents_content_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_documents_content_search ON public.fm_documents USING gin (to_tsvector('english'::regconfig, content));


--
-- Name: idx_fm_global_figures_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_global_figures_number ON public.fm_global_figures USING btree (figure_number);


--
-- Name: idx_fm_global_tables_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_global_tables_number ON public.fm_global_tables USING btree (table_number);


--
-- Name: idx_fm_sections_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_sections_parent ON public.fm_sections USING btree (parent_id);


--
-- Name: idx_fm_sections_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_sections_slug ON public.fm_sections USING btree (slug);


--
-- Name: idx_fm_sections_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_sections_sort ON public.fm_sections USING btree (sort_key);


--
-- Name: idx_fm_tables_asrs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_tables_asrs_type ON public.fm_global_tables USING btree (asrs_type);


--
-- Name: idx_fm_tables_commodities; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_tables_commodities ON public.fm_global_tables USING gin (commodity_types);


--
-- Name: idx_fm_tables_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_tables_number ON public.fm_global_tables USING btree (table_number);


--
-- Name: idx_fm_tables_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_tables_status ON public.fm_global_tables USING btree (extraction_status);


--
-- Name: idx_fm_tables_system_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_tables_system_type ON public.fm_global_tables USING btree (system_type);


--
-- Name: idx_fm_tables_title_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_tables_title_search ON public.fm_global_tables USING gin (to_tsvector('english'::regconfig, title));


--
-- Name: idx_fm_tables_type_system; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_tables_type_system ON public.fm_global_tables USING btree (asrs_type, system_type);


--
-- Name: idx_fm_text_chunks_clause; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_text_chunks_clause ON public.fm_text_chunks USING btree (clause_id);


--
-- Name: idx_fm_text_chunks_embedding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_text_chunks_embedding ON public.fm_text_chunks USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: idx_fm_text_chunks_keywords; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_text_chunks_keywords ON public.fm_text_chunks USING gin (search_keywords);


--
-- Name: idx_fm_text_chunks_page; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_text_chunks_page ON public.fm_text_chunks USING btree (page_number);


--
-- Name: idx_fm_text_chunks_requirements; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_text_chunks_requirements ON public.fm_text_chunks USING gin (extracted_requirements);


--
-- Name: idx_fm_text_chunks_topics; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fm_text_chunks_topics ON public.fm_text_chunks USING gin (topics);


--
-- Name: idx_forecasting_curves_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forecasting_curves_active ON public.forecasting_curves USING btree (company_id, is_active);


--
-- Name: idx_forecasting_curves_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forecasting_curves_company ON public.forecasting_curves USING btree (company_id);


--
-- Name: idx_form_submissions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_form_submissions_created ON public.fm_form_submissions USING btree (created_at);


--
-- Name: idx_form_submissions_lead_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_form_submissions_lead_score ON public.fm_form_submissions USING btree (lead_score);


--
-- Name: idx_form_submissions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_form_submissions_status ON public.fm_form_submissions USING btree (lead_status);


--
-- Name: idx_initiatives_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_initiatives_category ON public.initiatives USING btree (category);


--
-- Name: idx_initiatives_keywords; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_initiatives_keywords ON public.initiatives USING gin (keywords);


--
-- Name: idx_initiatives_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_initiatives_owner ON public.initiatives USING btree (owner);


--
-- Name: idx_initiatives_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_initiatives_status ON public.initiatives USING btree (status);


--
-- Name: idx_insights_assignee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insights_assignee ON public.document_insights USING btree (assignee);


--
-- Name: idx_insights_critical_path; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insights_critical_path ON public.document_insights USING btree (critical_path_impact);


--
-- Name: idx_insights_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insights_due_date ON public.document_insights USING btree (due_date);


--
-- Name: idx_insights_resolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insights_resolved ON public.document_insights USING btree (resolved);


--
-- Name: idx_insights_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insights_severity ON public.document_insights USING btree (severity);


--
-- Name: idx_messages_computed_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_computed_session ON public.messages USING btree (computed_session_user_id);


--
-- Name: idx_messages_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_session ON public.messages USING btree (session_id);


--
-- Name: idx_modules_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modules_category ON public.procore_modules USING btree (category);


--
-- Name: idx_notes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_created_at ON public.notes USING btree (created_at);


--
-- Name: idx_notes_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_project_id ON public.notes USING btree (project_id);


--
-- Name: idx_owner_invoice_line_items_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_owner_invoice_line_items_invoice ON public.owner_invoice_line_items USING btree (invoice_id);


--
-- Name: idx_owner_invoice_line_items_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_owner_invoice_line_items_invoice_id ON public.owner_invoice_line_items USING btree (invoice_id);


--
-- Name: idx_owner_invoice_line_items_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_owner_invoice_line_items_updated_at ON public.owner_invoice_line_items USING btree (updated_at);


--
-- Name: idx_owner_invoices_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_owner_invoices_contract ON public.owner_invoices USING btree (contract_id);


--
-- Name: idx_owner_invoices_contract_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_owner_invoices_contract_id ON public.owner_invoices USING btree (contract_id);


--
-- Name: idx_owner_invoices_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_owner_invoices_updated_at ON public.owner_invoices USING btree (updated_at);


--
-- Name: idx_payments_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_approved_by ON public.contract_payments USING btree (approved_by);


--
-- Name: idx_payments_billing_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_billing_period ON public.contract_payments USING btree (billing_period_id);


--
-- Name: idx_payments_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_contract ON public.payment_transactions USING btree (contract_id);


--
-- Name: idx_payments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_created_at ON public.contract_payments USING btree (created_at);


--
-- Name: idx_payments_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_invoice ON public.payment_transactions USING btree (invoice_id);


--
-- Name: idx_payments_payment_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_payment_date ON public.contract_payments USING btree (payment_date);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_status ON public.contract_payments USING btree (status);


--
-- Name: idx_pcco_line_items_pcco; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pcco_line_items_pcco ON public.pcco_line_items USING btree (pcco_id);


--
-- Name: idx_pccos_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pccos_contract ON public.prime_contract_change_orders USING btree (contract_id);


--
-- Name: idx_pco_line_items_pco; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pco_line_items_pco ON public.pco_line_items USING btree (pco_id);


--
-- Name: idx_pcos_change_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pcos_change_event ON public.prime_potential_change_orders USING btree (change_event_id);


--
-- Name: idx_pcos_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pcos_contract ON public.prime_potential_change_orders USING btree (contract_id);


--
-- Name: idx_pcos_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pcos_project ON public.prime_potential_change_orders USING btree (project_id);


--
-- Name: idx_pdm_invite_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdm_invite_status ON public.project_directory_memberships USING btree (invite_status);


--
-- Name: idx_pdm_permission_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdm_permission_template_id ON public.project_directory_memberships USING btree (permission_template_id);


--
-- Name: idx_pdm_person_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdm_person_id ON public.project_directory_memberships USING btree (person_id);


--
-- Name: idx_pdm_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdm_project_id ON public.project_directory_memberships USING btree (project_id);


--
-- Name: idx_pdm_project_person; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdm_project_person ON public.project_directory_memberships USING btree (project_id, person_id);


--
-- Name: idx_pdm_project_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdm_project_status ON public.project_directory_memberships USING btree (project_id, status);


--
-- Name: idx_pdm_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdm_status ON public.project_directory_memberships USING btree (status);


--
-- Name: idx_people_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_people_company_id ON public.people USING btree (company_id);


--
-- Name: idx_people_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_people_created_at ON public.people USING btree (created_at DESC);


--
-- Name: idx_people_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_people_email ON public.people USING btree (email);


--
-- Name: idx_people_email_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_people_email_user ON public.people USING btree (email) WHERE ((person_type = 'user'::text) AND (email IS NOT NULL));


--
-- Name: idx_people_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_people_name ON public.people USING btree (last_name, first_name);


--
-- Name: idx_people_person_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_people_person_type ON public.people USING btree (person_type);


--
-- Name: idx_people_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_people_search ON public.people USING gin (to_tsvector('english'::regconfig, ((((COALESCE(first_name, ''::text) || ' '::text) || COALESCE(last_name, ''::text)) || ' '::text) || COALESCE(email, ''::text))));


--
-- Name: idx_people_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_people_status ON public.people USING btree (status);


--
-- Name: idx_permission_templates_is_system; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permission_templates_is_system ON public.permission_templates USING btree (is_system);


--
-- Name: idx_permission_templates_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permission_templates_scope ON public.permission_templates USING btree (scope);


--
-- Name: idx_po_sov_items_purchase_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_sov_items_purchase_order ON public.purchase_order_sov_items USING btree (purchase_order_id);


--
-- Name: idx_prime_contract_sovs_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prime_contract_sovs_contract ON public.prime_contract_sovs USING btree (contract_id);


--
-- Name: idx_prime_contracts_actual_completion_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prime_contracts_actual_completion_date ON public.prime_contracts USING btree (actual_completion_date);


--
-- Name: idx_prime_contracts_architect_engineer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prime_contracts_architect_engineer_id ON public.prime_contracts USING btree (architect_engineer_id);


--
-- Name: idx_prime_contracts_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prime_contracts_client_id ON public.prime_contracts USING btree (client_id);


--
-- Name: idx_prime_contracts_contract_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prime_contracts_contract_company_id ON public.prime_contracts USING btree (contract_company_id);


--
-- Name: idx_prime_contracts_contractor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prime_contracts_contractor_id ON public.prime_contracts USING btree (contractor_id);


--
-- Name: idx_prime_contracts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prime_contracts_created_at ON public.prime_contracts USING btree (created_at);


--
-- Name: idx_prime_contracts_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prime_contracts_created_by ON public.prime_contracts USING btree (created_by);


--
-- Name: idx_prime_contracts_executed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prime_contracts_executed_at ON public.prime_contracts USING btree (executed_at);


--
-- Name: idx_prime_contracts_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prime_contracts_number ON public.prime_contracts USING btree (contract_number);


--
-- Name: idx_prime_contracts_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prime_contracts_project ON public.prime_contracts USING btree (project_id);


--
-- Name: idx_prime_contracts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prime_contracts_status ON public.prime_contracts USING btree (status);


--
-- Name: idx_prime_contracts_substantial_completion_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prime_contracts_substantial_completion_date ON public.prime_contracts USING btree (substantial_completion_date);


--
-- Name: idx_prime_contracts_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prime_contracts_vendor ON public.prime_contracts USING btree (vendor_id);


--
-- Name: idx_processing_queue_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_processing_queue_document_id ON public.processing_queue USING btree (document_id);


--
-- Name: idx_processing_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_processing_queue_status ON public.processing_queue USING btree (status);


--
-- Name: idx_procore_pages_feature; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procore_pages_feature ON public.procore_pages USING btree (feature_id);


--
-- Name: idx_procore_pages_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procore_pages_status ON public.procore_pages USING btree (status);


--
-- Name: idx_project_budget_codes_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_budget_codes_active ON public.project_budget_codes USING btree (project_id, is_active) WHERE (is_active = true);


--
-- Name: idx_project_budget_codes_project_cost_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_budget_codes_project_cost_code ON public.project_budget_codes USING btree (project_id, cost_code_id);


--
-- Name: idx_project_budget_codes_project_cost_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_budget_codes_project_cost_type ON public.project_budget_codes USING btree (project_id, cost_type_id);


--
-- Name: idx_project_budget_codes_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_budget_codes_project_id ON public.project_budget_codes USING btree (project_id);


--
-- Name: idx_project_companies_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_companies_company ON public.project_companies USING btree (company_id);


--
-- Name: idx_project_companies_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_companies_company_id ON public.project_companies USING btree (company_id);


--
-- Name: idx_project_companies_company_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_companies_company_type ON public.project_companies USING btree (company_type);


--
-- Name: idx_project_companies_primary_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_companies_primary_contact_id ON public.project_companies USING btree (primary_contact_id);


--
-- Name: idx_project_companies_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_companies_project ON public.project_companies USING btree (project_id);


--
-- Name: idx_project_companies_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_companies_project_id ON public.project_companies USING btree (project_id);


--
-- Name: idx_project_companies_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_companies_status ON public.project_companies USING btree (status);


--
-- Name: idx_project_companies_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_companies_type ON public.project_companies USING btree (company_type);


--
-- Name: idx_project_directory_memberships_invite_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_directory_memberships_invite_token ON public.project_directory_memberships USING btree (invite_token) WHERE (invite_token IS NOT NULL);


--
-- Name: idx_project_directory_memberships_person; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_directory_memberships_person ON public.project_directory_memberships USING btree (person_id);


--
-- Name: idx_project_directory_memberships_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_directory_memberships_project ON public.project_directory_memberships USING btree (project_id);


--
-- Name: idx_project_directory_memberships_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_directory_memberships_status ON public.project_directory_memberships USING btree (status);


--
-- Name: idx_project_insights_project_captured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_insights_project_captured ON public.project_insights USING btree (project_id, captured_at DESC);


--
-- Name: idx_project_role_members_person; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_role_members_person ON public.project_role_members USING btree (person_id);


--
-- Name: idx_project_role_members_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_role_members_role ON public.project_role_members USING btree (project_role_id);


--
-- Name: idx_project_roles_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_roles_name ON public.project_roles USING btree (role_name);


--
-- Name: idx_project_roles_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_roles_project ON public.project_roles USING btree (project_id);


--
-- Name: idx_project_tasks_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_tasks_project ON public.project_tasks USING btree (project_id);


--
-- Name: idx_project_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_tasks_status ON public.project_tasks USING btree (status);


--
-- Name: idx_projects_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_archived ON public.projects USING btree (archived);


--
-- Name: idx_projects_delivery_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_delivery_method ON public.projects USING btree (delivery_method);


--
-- Name: idx_projects_health_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_health_score ON public.projects USING btree (health_score DESC);


--
-- Name: idx_projects_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_phase ON public.projects USING btree (phase);


--
-- Name: idx_projects_project_manager; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_project_manager ON public.projects USING btree (project_manager);


--
-- Name: idx_projects_project_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_projects_project_number ON public.projects USING btree (project_number) WHERE (project_number IS NOT NULL);


--
-- Name: idx_projects_project_sector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_project_sector ON public.projects USING btree (project_sector);


--
-- Name: idx_projects_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_state ON public.projects USING btree (state);


--
-- Name: idx_projects_summary_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_summary_updated ON public.projects USING btree (summary_updated_at DESC);


--
-- Name: idx_projects_work_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_work_scope ON public.projects USING btree (work_scope);


--
-- Name: idx_prospects_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prospects_assigned_to ON public.prospects USING btree (assigned_to);


--
-- Name: idx_prospects_industry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prospects_industry ON public.prospects USING btree (industry);


--
-- Name: idx_prospects_next_follow_up; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prospects_next_follow_up ON public.prospects USING btree (next_follow_up);


--
-- Name: idx_prospects_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prospects_status ON public.prospects USING btree (status);


--
-- Name: idx_purchase_orders_contract_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_contract_company ON public.purchase_orders USING btree (contract_company_id);


--
-- Name: idx_purchase_orders_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_deleted_at ON public.purchase_orders USING btree (deleted_at);


--
-- Name: idx_purchase_orders_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_project_id ON public.purchase_orders USING btree (project_id);


--
-- Name: idx_purchase_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_orders_status ON public.purchase_orders USING btree (status);


--
-- Name: idx_qa_page_audit_path; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_page_audit_path ON public.qa_page_audit USING btree (page_path);


--
-- Name: idx_qa_page_audit_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_page_audit_status ON public.qa_page_audit USING btree (auto_status);


--
-- Name: idx_qa_page_audit_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_page_audit_type ON public.qa_page_audit USING btree (page_type);


--
-- Name: idx_qto_items_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qto_items_project_id ON public.qto_items USING btree (project_id);


--
-- Name: idx_qto_items_qto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qto_items_qto_id ON public.qto_items USING btree (qto_id);


--
-- Name: idx_qtos_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qtos_project_id ON public.qtos USING btree (project_id);


--
-- Name: idx_rag_pipeline_state_last_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rag_pipeline_state_last_run ON public.rag_pipeline_state USING btree (last_run);


--
-- Name: idx_rag_pipeline_state_pipeline_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rag_pipeline_state_pipeline_type ON public.rag_pipeline_state USING btree (pipeline_type);


--
-- Name: idx_reviews_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_due_date ON public.reviews USING btree (due_date);


--
-- Name: idx_reviews_reviewer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_reviewer_id ON public.reviews USING btree (reviewer_id);


--
-- Name: idx_reviews_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_status ON public.reviews USING btree (status);


--
-- Name: idx_reviews_submittal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_submittal_id ON public.reviews USING btree (submittal_id);


--
-- Name: idx_rfis_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfis_due_date ON public.rfis USING btree (due_date);


--
-- Name: idx_rfis_number_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfis_number_project ON public.rfis USING btree (project_id, number);


--
-- Name: idx_rfis_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfis_project_id ON public.rfis USING btree (project_id);


--
-- Name: idx_rfis_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rfis_status ON public.rfis USING btree (status);


--
-- Name: idx_schedule_deadlines_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_deadlines_task ON public.schedule_deadlines USING btree (task_id);


--
-- Name: idx_schedule_deps_predecessor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_deps_predecessor ON public.schedule_dependencies USING btree (predecessor_task_id);


--
-- Name: idx_schedule_deps_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_deps_task ON public.schedule_dependencies USING btree (task_id);


--
-- Name: idx_schedule_of_values_commitment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_of_values_commitment ON public.schedule_of_values USING btree (commitment_id);


--
-- Name: idx_schedule_of_values_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_of_values_contract ON public.schedule_of_values USING btree (contract_id);


--
-- Name: idx_schedule_of_values_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_of_values_status ON public.schedule_of_values USING btree (status);


--
-- Name: idx_schedule_tasks_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_tasks_dates ON public.schedule_tasks USING btree (start_date, finish_date);


--
-- Name: idx_schedule_tasks_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_tasks_parent ON public.schedule_tasks USING btree (parent_task_id);


--
-- Name: idx_schedule_tasks_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_tasks_project ON public.schedule_tasks USING btree (project_id);


--
-- Name: idx_schedule_tasks_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_tasks_sort ON public.schedule_tasks USING btree (project_id, sort_order);


--
-- Name: idx_schedule_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_tasks_status ON public.schedule_tasks USING btree (status);


--
-- Name: idx_screenshots_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_screenshots_category ON public.procore_screenshots USING btree (category);


--
-- Name: idx_screenshots_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_screenshots_name ON public.procore_screenshots USING btree (name);


--
-- Name: idx_screenshots_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_screenshots_session ON public.procore_screenshots USING btree (session_id);


--
-- Name: idx_sov_items_budget_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sov_items_budget_code ON public.subcontract_sov_items USING btree (budget_code);


--
-- Name: idx_sov_items_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sov_items_sort_order ON public.subcontract_sov_items USING btree (subcontract_id, sort_order);


--
-- Name: idx_sov_items_subcontract_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sov_items_subcontract_id ON public.subcontract_sov_items USING btree (subcontract_id);


--
-- Name: idx_sov_line_items_cost_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sov_line_items_cost_code ON public.sov_line_items USING btree (cost_code_id);


--
-- Name: idx_sov_line_items_sov; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sov_line_items_sov ON public.sov_line_items USING btree (sov_id);


--
-- Name: idx_specifications_content_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_specifications_content_search ON public.specifications USING gin (to_tsvector('english'::regconfig, content));


--
-- Name: idx_specifications_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_specifications_project_id ON public.specifications USING btree (project_id);


--
-- Name: idx_specifications_requirements; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_specifications_requirements ON public.specifications USING gin (requirements);


--
-- Name: idx_specifications_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_specifications_section ON public.specifications USING btree (section_number);


--
-- Name: idx_sprinkler_configs_height; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sprinkler_configs_height ON public.fm_sprinkler_configs USING btree (ceiling_height_ft);


--
-- Name: idx_sprinkler_configs_kfactor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sprinkler_configs_kfactor ON public.fm_sprinkler_configs USING btree (k_factor);


--
-- Name: idx_sprinkler_configs_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sprinkler_configs_lookup ON public.fm_sprinkler_configs USING btree (table_id, ceiling_height_ft, k_factor);


--
-- Name: idx_sprinkler_configs_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sprinkler_configs_table ON public.fm_sprinkler_configs USING btree (table_id);


--
-- Name: idx_sub_jobs_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_jobs_active ON public.sub_jobs USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_sub_jobs_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_jobs_project ON public.sub_jobs USING btree (project_id);


--
-- Name: idx_subcontractor_contacts_subcontractor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subcontractor_contacts_subcontractor_id ON public.subcontractor_contacts USING btree (subcontractor_id);


--
-- Name: idx_subcontractor_documents_expiration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subcontractor_documents_expiration ON public.subcontractor_documents USING btree (expiration_date);


--
-- Name: idx_subcontractor_documents_subcontractor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subcontractor_documents_subcontractor_id ON public.subcontractor_documents USING btree (subcontractor_id);


--
-- Name: idx_subcontractor_documents_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subcontractor_documents_type ON public.subcontractor_documents USING btree (document_type);


--
-- Name: idx_subcontractor_projects_subcontractor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subcontractor_projects_subcontractor_id ON public.subcontractor_projects USING btree (subcontractor_id);


--
-- Name: idx_subcontractors_asrs_experience; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subcontractors_asrs_experience ON public.subcontractors USING btree (asrs_experience_years);


--
-- Name: idx_subcontractors_company_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subcontractors_company_name ON public.subcontractors USING btree (company_name);


--
-- Name: idx_subcontractors_fm_certified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subcontractors_fm_certified ON public.subcontractors USING btree (fm_global_certified);


--
-- Name: idx_subcontractors_service_areas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subcontractors_service_areas ON public.subcontractors USING gin (service_areas);


--
-- Name: idx_subcontractors_specialties; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subcontractors_specialties ON public.subcontractors USING gin (specialties);


--
-- Name: idx_subcontractors_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subcontractors_status ON public.subcontractors USING btree (status);


--
-- Name: idx_subcontractors_tier_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subcontractors_tier_level ON public.subcontractors USING btree (tier_level);


--
-- Name: idx_subcontracts_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subcontracts_company_id ON public.subcontracts USING btree (contract_company_id);


--
-- Name: idx_subcontracts_contract_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subcontracts_contract_number ON public.subcontracts USING btree (contract_number);


--
-- Name: idx_subcontracts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subcontracts_created_at ON public.subcontracts USING btree (created_at DESC);


--
-- Name: idx_subcontracts_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subcontracts_deleted_at ON public.subcontracts USING btree (deleted_at);


--
-- Name: idx_subcontracts_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subcontracts_project_id ON public.subcontracts USING btree (project_id);


--
-- Name: idx_subcontracts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subcontracts_status ON public.subcontracts USING btree (status);


--
-- Name: idx_submittal_documents_submittal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submittal_documents_submittal_id ON public.submittal_documents USING btree (submittal_id);


--
-- Name: idx_submittal_documents_text_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submittal_documents_text_search ON public.submittal_documents USING gin (to_tsvector('english'::regconfig, extracted_text));


--
-- Name: idx_submittal_history_submittal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submittal_history_submittal_id ON public.submittal_history USING btree (submittal_id);


--
-- Name: idx_submittal_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submittal_notifications_unread ON public.submittal_notifications USING btree (user_id, is_read);


--
-- Name: idx_submittal_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submittal_notifications_user_id ON public.submittal_notifications USING btree (user_id);


--
-- Name: idx_submittals_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submittals_metadata ON public.submittals USING gin (metadata);


--
-- Name: idx_submittals_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submittals_number ON public.submittals USING btree (submittal_number);


--
-- Name: idx_submittals_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submittals_project_id ON public.submittals USING btree (project_id);


--
-- Name: idx_submittals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submittals_status ON public.submittals USING btree (status);


--
-- Name: idx_submittals_submission_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submittals_submission_date ON public.submittals USING btree (submission_date);


--
-- Name: idx_table_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_table_project_id ON public.document_metadata USING btree (project_id);


--
-- Name: idx_user_directory_permissions_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_directory_permissions_level ON public.user_directory_permissions USING btree (permission_level);


--
-- Name: idx_user_directory_permissions_person; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_directory_permissions_person ON public.user_directory_permissions USING btree (person_id);


--
-- Name: idx_user_directory_permissions_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_directory_permissions_project ON public.user_directory_permissions USING btree (project_id);


--
-- Name: idx_user_email_notifications_person; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_email_notifications_person ON public.user_email_notifications USING btree (person_id);


--
-- Name: idx_user_email_notifications_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_email_notifications_project ON public.user_email_notifications USING btree (project_id);


--
-- Name: idx_user_project_roles_membership; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_project_roles_membership ON public.user_project_roles USING btree (membership_id);


--
-- Name: idx_user_schedule_notifications_person; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_schedule_notifications_person ON public.user_schedule_notifications USING btree (person_id);


--
-- Name: idx_user_schedule_notifications_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_schedule_notifications_project ON public.user_schedule_notifications USING btree (project_id);


--
-- Name: idx_users_auth_auth_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_auth_auth_user_id ON public.users_auth USING btree (auth_user_id);


--
-- Name: idx_users_auth_person_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_auth_person_id ON public.users_auth USING btree (person_id);


--
-- Name: idx_vendors_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_company ON public.vendors USING btree (company_id);


--
-- Name: idx_vendors_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_created_at ON public.vendors USING btree (created_at);


--
-- Name: idx_vendors_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_is_active ON public.vendors USING btree (is_active);


--
-- Name: idx_vendors_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_name ON public.vendors USING btree (name);


--
-- Name: idx_vertical_markup_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vertical_markup_project ON public.vertical_markup USING btree (project_id);


--
-- Name: meeting_segments_project_ids_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX meeting_segments_project_ids_gin_idx ON public.meeting_segments USING gin (project_ids);


--
-- Name: meeting_segments_summary_embedding_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX meeting_segments_summary_embedding_idx ON public.meeting_segments USING hnsw (summary_embedding public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: opportunities_client_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunities_client_idx ON public.opportunities USING btree (client_id);


--
-- Name: opportunities_embedding_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunities_embedding_idx ON public.opportunities USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='50');


--
-- Name: opportunities_metadata_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunities_metadata_idx ON public.opportunities USING btree (metadata_id);


--
-- Name: opportunities_project_ids_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunities_project_ids_gin_idx ON public.opportunities USING gin (project_ids);


--
-- Name: opportunities_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunities_project_idx ON public.opportunities USING btree (project_id);


--
-- Name: opportunities_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunities_status_idx ON public.opportunities USING btree (status);


--
-- Name: opportunities_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunities_type_idx ON public.opportunities USING btree (type);


--
-- Name: parts_message_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX parts_message_id_idx ON public.parts USING btree ("messageId");


--
-- Name: parts_message_id_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX parts_message_id_order_idx ON public.parts USING btree ("messageId", "order");


--
-- Name: project_cost_codes_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX project_cost_codes_code_idx ON public.project_cost_codes USING btree (cost_code_id);


--
-- Name: project_cost_codes_project_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX project_cost_codes_project_idx ON public.project_cost_codes USING btree (project_id);


--
-- Name: projects_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX projects_created_idx ON public.user_projects USING btree (created_at DESC);


--
-- Name: recommendations_priority_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX recommendations_priority_idx ON public.design_recommendations USING btree (priority_level);


--
-- Name: risks_embedding_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risks_embedding_idx ON public.risks USING hnsw (embedding public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: risks_project_ids_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risks_project_ids_gin_idx ON public.risks USING gin (project_ids);


--
-- Name: tasks_project_ids_gin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tasks_project_ids_gin_idx ON public.tasks USING gin (project_ids);


--
-- Name: user_projects_lead_score_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_projects_lead_score_idx ON public.user_projects USING btree (lead_score DESC);


--
-- Name: user_projects_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_projects_status_idx ON public.user_projects USING btree (status);


--
-- Name: ux_document_metadata_content_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_document_metadata_content_hash ON public.document_metadata USING btree (content_hash);


--
-- Name: ux_document_metadata_fireflies; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_document_metadata_fireflies ON public.document_metadata USING btree (fireflies_id) WHERE (fireflies_id IS NOT NULL);


--
-- Name: ux_ingestion_jobs_fireflies; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_ingestion_jobs_fireflies ON public.ingestion_jobs USING btree (fireflies_id) WHERE (fireflies_id IS NOT NULL);


--
-- Name: ai_insights _ai_insights_counts_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER _ai_insights_counts_del AFTER DELETE ON public.ai_insights FOR EACH ROW EXECUTE FUNCTION public._ai_insights_counts_trigger_fn();


--
-- Name: ai_insights _ai_insights_counts_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER _ai_insights_counts_ins AFTER INSERT ON public.ai_insights FOR EACH ROW EXECUTE FUNCTION public._ai_insights_counts_trigger_fn();


--
-- Name: ai_insights _ai_insights_counts_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER _ai_insights_counts_upd AFTER UPDATE ON public.ai_insights FOR EACH ROW EXECUTE FUNCTION public._ai_insights_counts_trigger_fn();


--
-- Name: contract_billing_periods billing_periods_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER billing_periods_updated_at BEFORE UPDATE ON public.contract_billing_periods FOR EACH ROW EXECUTE FUNCTION public.update_billing_periods_updated_at();


--
-- Name: budget_lines budget_line_changes_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER budget_line_changes_trigger BEFORE INSERT OR DELETE OR UPDATE ON public.budget_lines FOR EACH ROW EXECUTE FUNCTION public.track_budget_line_changes_before();


--
-- Name: budget_lines budget_lines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER budget_lines_updated_at BEFORE UPDATE ON public.budget_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: budget_mod_lines budget_mod_lines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER budget_mod_lines_updated_at BEFORE UPDATE ON public.budget_mod_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: budget_modification_lines budget_modification_lines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER budget_modification_lines_updated_at BEFORE UPDATE ON public.budget_modification_lines FOR EACH ROW EXECUTE FUNCTION public.update_budget_details_updated_at();


--
-- Name: budget_modifications budget_modifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER budget_modifications_updated_at BEFORE UPDATE ON public.budget_modifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: budget_view_columns budget_view_columns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER budget_view_columns_updated_at BEFORE UPDATE ON public.budget_view_columns FOR EACH ROW EXECUTE FUNCTION public.update_budget_views_updated_at();


--
-- Name: budget_views budget_views_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER budget_views_updated_at BEFORE UPDATE ON public.budget_views FOR EACH ROW EXECUTE FUNCTION public.update_budget_views_updated_at();


--
-- Name: change_event_line_items change_event_line_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER change_event_line_items_updated_at BEFORE UPDATE ON public.change_event_line_items FOR EACH ROW EXECUTE FUNCTION public.update_change_events_updated_at();


--
-- Name: change_event_rfq_responses change_event_rfq_responses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER change_event_rfq_responses_updated_at BEFORE UPDATE ON public.change_event_rfq_responses FOR EACH ROW EXECUTE FUNCTION public.update_change_events_updated_at();


--
-- Name: change_event_rfqs change_event_rfqs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER change_event_rfqs_updated_at BEFORE UPDATE ON public.change_event_rfqs FOR EACH ROW EXECUTE FUNCTION public.update_change_events_updated_at();


--
-- Name: change_events change_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER change_events_updated_at BEFORE UPDATE ON public.change_events FOR EACH ROW EXECUTE FUNCTION public.update_change_events_updated_at();


--
-- Name: change_order_lines change_order_lines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER change_order_lines_updated_at BEFORE UPDATE ON public.change_order_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: contract_change_orders change_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER change_orders_updated_at BEFORE UPDATE ON public.contract_change_orders FOR EACH ROW EXECUTE FUNCTION public.update_change_orders_updated_at();


--
-- Name: commitment_change_order_lines commitment_change_order_lines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER commitment_change_order_lines_updated_at BEFORE UPDATE ON public.commitment_change_order_lines FOR EACH ROW EXECUTE FUNCTION public.update_budget_details_updated_at();


--
-- Name: contract_documents contract_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER contract_documents_updated_at BEFORE UPDATE ON public.contract_documents FOR EACH ROW EXECUTE FUNCTION public.update_contract_documents_updated_at();


--
-- Name: contract_line_items contract_line_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER contract_line_items_updated_at BEFORE UPDATE ON public.contract_line_items FOR EACH ROW EXECUTE FUNCTION public.update_contract_line_items_updated_at();


--
-- Name: contract_views contract_views_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER contract_views_updated_at BEFORE UPDATE ON public.contract_views FOR EACH ROW EXECUTE FUNCTION public.update_contract_views_updated_at();


--
-- Name: document_metadata document_metadata_set_category_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER document_metadata_set_category_trigger BEFORE INSERT OR UPDATE ON public.document_metadata FOR EACH ROW EXECUTE FUNCTION public.document_metadata_set_category();


--
-- Name: budget_views ensure_single_default_budget_view; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ensure_single_default_budget_view BEFORE INSERT OR UPDATE ON public.budget_views FOR EACH ROW WHEN ((new.is_default = true)) EXECUTE FUNCTION public.ensure_single_default_view();


--
-- Name: fm_blocks fm_blocks_search_vector_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER fm_blocks_search_vector_trigger BEFORE INSERT OR UPDATE ON public.fm_blocks FOR EACH ROW EXECUTE FUNCTION public.update_search_vector();


--
-- Name: chunks generate-insights; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "generate-insights" AFTER INSERT OR UPDATE ON public.chunks FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://lgveqfnpkxvzbnnwuled.supabase.co/functions/v1/generate-insights', 'POST', '{"Content-type":"application/json"}', '{}', '5000');


--
-- Name: subcontracts generate_subcontract_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER generate_subcontract_number BEFORE INSERT ON public.subcontracts FOR EACH ROW EXECUTE FUNCTION public.generate_contract_number();


--
-- Name: change_events log_change_events_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_change_events_audit AFTER INSERT OR UPDATE ON public.change_events FOR EACH ROW EXECUTE FUNCTION public.log_change_event_changes();


--
-- Name: contract_payments payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.contract_payments FOR EACH ROW EXECUTE FUNCTION public.update_payments_updated_at();


--
-- Name: ai_insights populate_insight_names_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER populate_insight_names_trigger BEFORE INSERT ON public.ai_insights FOR EACH ROW EXECUTE FUNCTION public.populate_insight_names();


--
-- Name: prime_contracts prime_contracts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prime_contracts_updated_at BEFORE UPDATE ON public.prime_contracts FOR EACH ROW EXECUTE FUNCTION public.update_prime_contracts_updated_at();


--
-- Name: qa_page_audit qa_page_audit_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER qa_page_audit_updated_at BEFORE UPDATE ON public.qa_page_audit FOR EACH ROW EXECUTE FUNCTION public.update_qa_page_audit_updated_at();


--
-- Name: owner_invoice_line_items refresh_on_owner_invoice_line_items; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER refresh_on_owner_invoice_line_items AFTER INSERT OR DELETE OR UPDATE ON public.owner_invoice_line_items FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_contract_financial_summary_trigger();


--
-- Name: payment_transactions refresh_on_payment_transactions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER refresh_on_payment_transactions AFTER INSERT OR DELETE OR UPDATE ON public.payment_transactions FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_contract_financial_summary_trigger();


--
-- Name: pcco_line_items refresh_on_pcco_line_items; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER refresh_on_pcco_line_items AFTER INSERT OR DELETE OR UPDATE ON public.pcco_line_items FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_contract_financial_summary_trigger();


--
-- Name: pco_line_items refresh_on_pco_line_items; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER refresh_on_pco_line_items AFTER INSERT OR DELETE OR UPDATE ON public.pco_line_items FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_contract_financial_summary_trigger();


--
-- Name: change_events refresh_summary_on_change_event; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER refresh_summary_on_change_event AFTER INSERT OR DELETE OR UPDATE ON public.change_events FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_change_events_summary();


--
-- Name: change_event_line_items refresh_summary_on_line_item; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER refresh_summary_on_line_item AFTER INSERT OR DELETE OR UPDATE ON public.change_event_line_items FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_change_events_summary();


--
-- Name: change_event_rfq_responses refresh_summary_on_rfq_responses; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER refresh_summary_on_rfq_responses AFTER INSERT OR DELETE OR UPDATE ON public.change_event_rfq_responses FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_change_events_summary();


--
-- Name: change_event_rfqs refresh_summary_on_rfqs; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER refresh_summary_on_rfqs AFTER INSERT OR DELETE OR UPDATE ON public.change_event_rfqs FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_change_events_summary();


--
-- Name: fireflies_ingestion_jobs set_fireflies_ingestion_jobs_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_fireflies_ingestion_jobs_timestamp BEFORE UPDATE ON public.fireflies_ingestion_jobs FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();


--
-- Name: document_insights set_insight_severity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_insight_severity BEFORE INSERT ON public.document_insights FOR EACH ROW EXECUTE FUNCTION public.set_default_severity();


--
-- Name: opportunities set_opportunities_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_opportunities_timestamp BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.set_timestamp();


--
-- Name: documents set_project_id_by_title_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_project_id_by_title_trigger BEFORE INSERT OR UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_project_id_by_title();


--
-- Name: document_metadata set_project_id_from_title_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_project_id_from_title_trg BEFORE INSERT OR UPDATE ON public.document_metadata FOR EACH ROW EXECUTE FUNCTION public.set_project_id_from_title();


--
-- Name: submittals track_submittal_status_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER track_submittal_status_changes AFTER UPDATE ON public.submittals FOR EACH ROW EXECUTE FUNCTION public.track_submittal_changes();


--
-- Name: ai_insights trg_ai_insights_exact_quotes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ai_insights_exact_quotes BEFORE INSERT OR UPDATE ON public.ai_insights FOR EACH ROW EXECUTE FUNCTION public.ai_insights_exact_quotes_trigger();


--
-- Name: ai_tasks trg_ai_tasks_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ai_tasks_updated BEFORE UPDATE ON public.ai_tasks FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: cost_code_divisions trg_cost_code_divisions_propagate_title; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cost_code_divisions_propagate_title AFTER UPDATE ON public.cost_code_divisions FOR EACH ROW EXECUTE FUNCTION public.fn_propagate_division_title_change();


--
-- Name: documents trg_enqueue_for_insights; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enqueue_for_insights AFTER UPDATE ON public.documents FOR EACH ROW WHEN ((((new.processing_status)::text = 'generate_insights'::text) AND ((old.processing_status)::text IS DISTINCT FROM (new.processing_status)::text))) EXECUTE FUNCTION private.enqueue_document_for_insights();


--
-- Name: projects trg_projects_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_projects_audit AFTER INSERT OR DELETE OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.fn_log_projects_change();


--
-- Name: schedule_tasks trg_schedule_task_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_schedule_task_updated BEFORE UPDATE ON public.schedule_tasks FOR EACH ROW EXECUTE FUNCTION public.update_schedule_task_timestamp();


--
-- Name: ai_insights trg_sync_ai_insights_meeting_name; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_ai_insights_meeting_name BEFORE INSERT OR UPDATE OF meeting_id ON public.ai_insights FOR EACH ROW EXECUTE FUNCTION public.sync_ai_insights_meeting_name();


--
-- Name: projects trg_sync_client; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_client BEFORE INSERT OR UPDATE OF client_id ON public.projects FOR EACH ROW EXECUTE FUNCTION public.sync_client();


--
-- Name: projects trg_sync_doc_meta_on_project_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_doc_meta_on_project_update AFTER UPDATE OF name ON public.projects FOR EACH ROW EXECUTE FUNCTION public.sync_document_metadata_on_project_name_change();


--
-- Name: document_metadata trg_sync_document_project_name; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_document_project_name BEFORE INSERT OR UPDATE OF project_id ON public.document_metadata FOR EACH ROW EXECUTE FUNCTION public.sync_document_project_name();


--
-- Name: document_insights trg_sync_insight_project_on_insert_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_insight_project_on_insert_update BEFORE INSERT OR UPDATE OF document_id ON public.document_insights FOR EACH ROW EXECUTE FUNCTION public.sync_insight_project_from_document();


--
-- Name: documents trg_sync_project; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_project BEFORE INSERT OR UPDATE OF project_id ON public.documents FOR EACH ROW EXECUTE FUNCTION public.sync_project();


--
-- Name: document_insights trg_sync_project_on_document_insights; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sync_project_on_document_insights BEFORE INSERT OR UPDATE OF project_id ON public.document_insights FOR EACH ROW EXECUTE FUNCTION public.sync_document_insights_project();


--
-- Name: projects trigger_create_default_project_roles; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_default_project_roles AFTER INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.create_default_project_roles();


--
-- Name: forecasting_curves trigger_forecasting_curves_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_forecasting_curves_updated_at BEFORE UPDATE ON public.forecasting_curves FOR EACH ROW EXECUTE FUNCTION public.update_forecasting_curves_updated_at();


--
-- Name: purchase_orders trigger_generate_po_contract_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_po_contract_number BEFORE INSERT ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.generate_po_contract_number();


--
-- Name: budget_lines trigger_set_budget_line_from_project_budget_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_budget_line_from_project_budget_code BEFORE INSERT OR UPDATE ON public.budget_lines FOR EACH ROW EXECUTE FUNCTION public.set_budget_line_from_project_budget_code();


--
-- Name: billing_periods update_billing_periods_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_billing_periods_updated_at BEFORE UPDATE ON public.billing_periods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: direct_cost_line_items update_direct_cost_line_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_direct_cost_line_items_updated_at BEFORE UPDATE ON public.direct_cost_line_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: direct_costs update_direct_costs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_direct_costs_updated_at BEFORE UPDATE ON public.direct_costs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: discrepancies update_discrepancies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_discrepancies_updated_at BEFORE UPDATE ON public.discrepancies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: distribution_groups update_distribution_groups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_distribution_groups_updated_at BEFORE UPDATE ON public.distribution_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: documents update_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: fm_documents update_fm_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_fm_documents_updated_at BEFORE UPDATE ON public.fm_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: fm_form_submissions update_fm_form_submissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_fm_form_submissions_updated_at BEFORE UPDATE ON public.fm_form_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: fm_global_tables update_fm_global_tables_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_fm_global_tables_updated_at BEFORE UPDATE ON public.fm_global_tables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: fm_text_chunks update_fm_text_chunks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_fm_text_chunks_updated_at BEFORE UPDATE ON public.fm_text_chunks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: initiatives update_initiatives_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_initiatives_updated_at_trigger BEFORE UPDATE ON public.initiatives FOR EACH ROW EXECUTE FUNCTION public.update_initiatives_updated_at();


--
-- Name: ai_insights update_insight_names_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_insight_names_trigger BEFORE UPDATE ON public.ai_insights FOR EACH ROW EXECUTE FUNCTION public.update_insight_names();


--
-- Name: owner_invoice_line_items update_owner_invoice_line_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_owner_invoice_line_items_updated_at BEFORE UPDATE ON public.owner_invoice_line_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: owner_invoices update_owner_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_owner_invoices_updated_at BEFORE UPDATE ON public.owner_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: people update_people_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON public.people FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: permission_templates update_permission_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_permission_templates_updated_at BEFORE UPDATE ON public.permission_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: processing_queue update_processing_queue_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_processing_queue_updated_at BEFORE UPDATE ON public.processing_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: procore_modules update_procore_modules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_procore_modules_updated_at BEFORE UPDATE ON public.procore_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: procore_screenshots update_procore_screenshots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_procore_screenshots_updated_at BEFORE UPDATE ON public.procore_screenshots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_companies update_project_companies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_companies_updated_at BEFORE UPDATE ON public.project_companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_directory_memberships update_project_directory_memberships_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_directory_memberships_updated_at BEFORE UPDATE ON public.project_directory_memberships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_roles update_project_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_roles_updated_at BEFORE UPDATE ON public.project_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rag_pipeline_state update_rag_pipeline_state_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_rag_pipeline_state_updated_at BEFORE UPDATE ON public.rag_pipeline_state FOR EACH ROW EXECUTE FUNCTION public.update_rag_pipeline_state_updated_at();


--
-- Name: schedule_of_values update_schedule_of_values_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_schedule_of_values_updated_at BEFORE UPDATE ON public.schedule_of_values FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subcontract_sov_items update_sov_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sov_items_updated_at BEFORE UPDATE ON public.subcontract_sov_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sov_line_items update_sov_line_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sov_line_items_updated_at BEFORE UPDATE ON public.sov_line_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: specifications update_specifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_specifications_updated_at BEFORE UPDATE ON public.specifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sub_jobs update_sub_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sub_jobs_updated_at BEFORE UPDATE ON public.sub_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subcontractors update_subcontractors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subcontractors_updated_at BEFORE UPDATE ON public.subcontractors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subcontracts update_subcontracts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subcontracts_updated_at BEFORE UPDATE ON public.subcontracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: submittals update_submittals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_submittals_updated_at BEFORE UPDATE ON public.submittals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_directory_permissions update_user_directory_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_directory_permissions_updated_at BEFORE UPDATE ON public.user_directory_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_email_notifications update_user_email_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_email_notifications_updated_at BEFORE UPDATE ON public.user_email_notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_project_preferences update_user_project_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_project_preferences_updated_at BEFORE UPDATE ON public.user_project_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_schedule_notifications update_user_schedule_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_schedule_notifications_updated_at BEFORE UPDATE ON public.user_schedule_notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vertical_markup update_vertical_markup_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vertical_markup_updated_at BEFORE UPDATE ON public.vertical_markup FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vendors vendors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_vendors_updated_at();


--
-- Name: ai_analysis_jobs ai_analysis_jobs_submittal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_analysis_jobs
    ADD CONSTRAINT ai_analysis_jobs_submittal_id_fkey FOREIGN KEY (submittal_id) REFERENCES public.submittals(id) ON DELETE CASCADE;


--
-- Name: ai_insights ai_insights_chunks_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_insights
    ADD CONSTRAINT ai_insights_chunks_id_fkey FOREIGN KEY (chunks_id) REFERENCES public.chunks(id);


--
-- Name: ai_tasks ai_tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_tasks
    ADD CONSTRAINT ai_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: ai_tasks ai_tasks_source_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_tasks
    ADD CONSTRAINT ai_tasks_source_document_id_fkey FOREIGN KEY (source_document_id) REFERENCES public.document_metadata(id) ON DELETE SET NULL;


--
-- Name: app_capability_actions app_capability_actions_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_capability_actions
    ADD CONSTRAINT app_capability_actions_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.app_system_actions(id);


--
-- Name: app_capability_actions app_capability_actions_capability_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_capability_actions
    ADD CONSTRAINT app_capability_actions_capability_id_fkey FOREIGN KEY (capability_id) REFERENCES public.app_functional_capabilities(id);


--
-- Name: app_page_links app_page_links_from_page_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_page_links
    ADD CONSTRAINT app_page_links_from_page_fkey FOREIGN KEY (from_page) REFERENCES public.app_pages(id);


--
-- Name: app_pages app_pages_crawl_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_pages
    ADD CONSTRAINT app_pages_crawl_session_id_fkey FOREIGN KEY (crawl_session_id) REFERENCES public.app_crawl_sessions(id) ON DELETE CASCADE;


--
-- Name: app_parity_checks app_parity_checks_crawl_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_parity_checks
    ADD CONSTRAINT app_parity_checks_crawl_session_id_fkey FOREIGN KEY (crawl_session_id) REFERENCES public.app_crawl_sessions(id);


--
-- Name: app_state_transitions app_state_transitions_triggered_by_action_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_state_transitions
    ADD CONSTRAINT app_state_transitions_triggered_by_action_fkey FOREIGN KEY (triggered_by_action) REFERENCES public.app_system_actions(id);


--
-- Name: app_system_actions app_system_actions_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_system_actions
    ADD CONSTRAINT app_system_actions_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.app_pages(id);


--
-- Name: app_ui_components app_ui_components_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_ui_components
    ADD CONSTRAINT app_ui_components_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.app_pages(id) ON DELETE CASCADE;


--
-- Name: app_ui_table_columns app_ui_table_columns_ui_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_ui_table_columns
    ADD CONSTRAINT app_ui_table_columns_ui_table_id_fkey FOREIGN KEY (ui_table_id) REFERENCES public.app_ui_tables(id) ON DELETE CASCADE;


--
-- Name: app_ui_tables app_ui_tables_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_ui_tables
    ADD CONSTRAINT app_ui_tables_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.app_pages(id) ON DELETE CASCADE;


--
-- Name: asrs_blocks asrs_blocks_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asrs_blocks
    ADD CONSTRAINT asrs_blocks_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.asrs_sections(id);


--
-- Name: asrs_logic_cards asrs_logic_cards_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asrs_logic_cards
    ADD CONSTRAINT asrs_logic_cards_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.asrs_sections(id) ON UPDATE CASCADE ON DELETE SET DEFAULT;


--
-- Name: asrs_protection_rules asrs_protection_rules_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asrs_protection_rules
    ADD CONSTRAINT asrs_protection_rules_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.asrs_sections(id);


--
-- Name: asrs_sections asrs_sections_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asrs_sections
    ADD CONSTRAINT asrs_sections_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.asrs_sections(id);


--
-- Name: attachments attachments_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: billing_periods billing_periods_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_periods
    ADD CONSTRAINT billing_periods_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: block_embeddings block_embeddings_block_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_embeddings
    ADD CONSTRAINT block_embeddings_block_id_fkey FOREIGN KEY (block_id) REFERENCES public.asrs_blocks(id) ON DELETE CASCADE;


--
-- Name: briefing_runs briefing_runs_briefing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.briefing_runs
    ADD CONSTRAINT briefing_runs_briefing_id_fkey FOREIGN KEY (briefing_id) REFERENCES public.project_briefings(id);


--
-- Name: budget_line_history budget_line_history_budget_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_line_history
    ADD CONSTRAINT budget_line_history_budget_line_id_fkey FOREIGN KEY (budget_line_id) REFERENCES public.budget_lines(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: budget_line_history budget_line_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_line_history
    ADD CONSTRAINT budget_line_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);


--
-- Name: budget_line_history budget_line_history_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_line_history
    ADD CONSTRAINT budget_line_history_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: budget_lines budget_lines_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_lines
    ADD CONSTRAINT budget_lines_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id);


--
-- Name: budget_lines budget_lines_cost_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_lines
    ADD CONSTRAINT budget_lines_cost_type_id_fkey FOREIGN KEY (cost_type_id) REFERENCES public.cost_code_types(id);


--
-- Name: budget_lines budget_lines_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_lines
    ADD CONSTRAINT budget_lines_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: budget_lines budget_lines_default_curve_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_lines
    ADD CONSTRAINT budget_lines_default_curve_id_fkey FOREIGN KEY (default_curve_id) REFERENCES public.forecasting_curves(id) ON DELETE SET NULL;


--
-- Name: budget_lines budget_lines_project_budget_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_lines
    ADD CONSTRAINT budget_lines_project_budget_code_id_fkey FOREIGN KEY (project_budget_code_id) REFERENCES public.project_budget_codes(id) ON DELETE RESTRICT;


--
-- Name: budget_lines budget_lines_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_lines
    ADD CONSTRAINT budget_lines_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: budget_lines budget_lines_sub_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_lines
    ADD CONSTRAINT budget_lines_sub_job_id_fkey FOREIGN KEY (sub_job_id) REFERENCES public.sub_jobs(id) ON DELETE SET NULL;


--
-- Name: budget_lines budget_lines_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_lines
    ADD CONSTRAINT budget_lines_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: budget_mod_lines budget_mod_lines_budget_modification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_mod_lines
    ADD CONSTRAINT budget_mod_lines_budget_modification_id_fkey FOREIGN KEY (budget_modification_id) REFERENCES public.budget_modifications(id) ON DELETE CASCADE;


--
-- Name: budget_mod_lines budget_mod_lines_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_mod_lines
    ADD CONSTRAINT budget_mod_lines_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id);


--
-- Name: budget_mod_lines budget_mod_lines_cost_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_mod_lines
    ADD CONSTRAINT budget_mod_lines_cost_type_id_fkey FOREIGN KEY (cost_type_id) REFERENCES public.cost_code_types(id);


--
-- Name: budget_mod_lines budget_mod_lines_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_mod_lines
    ADD CONSTRAINT budget_mod_lines_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: budget_mod_lines budget_mod_lines_sub_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_mod_lines
    ADD CONSTRAINT budget_mod_lines_sub_job_id_fkey FOREIGN KEY (sub_job_id) REFERENCES public.sub_jobs(id) ON DELETE SET NULL;


--
-- Name: budget_modification_lines budget_modification_lines_budget_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_modification_lines
    ADD CONSTRAINT budget_modification_lines_budget_line_id_fkey FOREIGN KEY (budget_line_id) REFERENCES public.budget_lines(id) ON DELETE CASCADE;


--
-- Name: budget_modification_lines budget_modification_lines_budget_modification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_modification_lines
    ADD CONSTRAINT budget_modification_lines_budget_modification_id_fkey FOREIGN KEY (budget_modification_id) REFERENCES public.budget_modifications(id) ON DELETE CASCADE;


--
-- Name: budget_modifications budget_modifications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_modifications
    ADD CONSTRAINT budget_modifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: budget_modifications budget_modifications_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_modifications
    ADD CONSTRAINT budget_modifications_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: budget_view_columns budget_view_columns_view_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_view_columns
    ADD CONSTRAINT budget_view_columns_view_id_fkey FOREIGN KEY (view_id) REFERENCES public.budget_views(id) ON DELETE CASCADE;


--
-- Name: budget_views budget_views_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_views
    ADD CONSTRAINT budget_views_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: budget_views budget_views_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_views
    ADD CONSTRAINT budget_views_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: change_event_approvals change_event_approvals_change_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_approvals
    ADD CONSTRAINT change_event_approvals_change_event_id_fkey FOREIGN KEY (change_event_id) REFERENCES public.change_events(id) ON DELETE CASCADE;


--
-- Name: change_event_attachments change_event_attachments_change_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_attachments
    ADD CONSTRAINT change_event_attachments_change_event_id_fkey FOREIGN KEY (change_event_id) REFERENCES public.change_events(id) ON DELETE CASCADE;


--
-- Name: change_event_history change_event_history_change_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_history
    ADD CONSTRAINT change_event_history_change_event_id_fkey FOREIGN KEY (change_event_id) REFERENCES public.change_events(id) ON DELETE CASCADE;


--
-- Name: change_event_line_items change_event_line_items_budget_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_line_items
    ADD CONSTRAINT change_event_line_items_budget_code_id_fkey FOREIGN KEY (budget_code_id) REFERENCES public.budget_lines(id) ON DELETE SET NULL;


--
-- Name: change_event_line_items change_event_line_items_change_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_line_items
    ADD CONSTRAINT change_event_line_items_change_event_id_fkey FOREIGN KEY (change_event_id) REFERENCES public.change_events(id) ON DELETE CASCADE;


--
-- Name: change_event_line_items change_event_line_items_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_line_items
    ADD CONSTRAINT change_event_line_items_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;


--
-- Name: change_event_line_items change_event_line_items_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_line_items
    ADD CONSTRAINT change_event_line_items_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: change_event_rfq_attachments change_event_rfq_attachments_rfq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_rfq_attachments
    ADD CONSTRAINT change_event_rfq_attachments_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES public.change_event_rfqs(id) ON DELETE CASCADE;


--
-- Name: change_event_rfq_attachments change_event_rfq_attachments_rfq_response_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_rfq_attachments
    ADD CONSTRAINT change_event_rfq_attachments_rfq_response_id_fkey FOREIGN KEY (rfq_response_id) REFERENCES public.change_event_rfq_responses(id) ON DELETE CASCADE;


--
-- Name: change_event_rfq_responses change_event_rfq_responses_line_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_rfq_responses
    ADD CONSTRAINT change_event_rfq_responses_line_item_id_fkey FOREIGN KEY (line_item_id) REFERENCES public.change_event_line_items(id) ON DELETE SET NULL;


--
-- Name: change_event_rfq_responses change_event_rfq_responses_responder_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_rfq_responses
    ADD CONSTRAINT change_event_rfq_responses_responder_company_id_fkey FOREIGN KEY (responder_company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: change_event_rfq_responses change_event_rfq_responses_rfq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_rfq_responses
    ADD CONSTRAINT change_event_rfq_responses_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES public.change_event_rfqs(id) ON DELETE CASCADE;


--
-- Name: change_event_rfqs change_event_rfqs_assigned_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_rfqs
    ADD CONSTRAINT change_event_rfqs_assigned_company_id_fkey FOREIGN KEY (assigned_company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: change_event_rfqs change_event_rfqs_change_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_rfqs
    ADD CONSTRAINT change_event_rfqs_change_event_id_fkey FOREIGN KEY (change_event_id) REFERENCES public.change_events(id) ON DELETE CASCADE;


--
-- Name: change_event_rfqs change_event_rfqs_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_event_rfqs
    ADD CONSTRAINT change_event_rfqs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: change_events change_events_prime_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_events
    ADD CONSTRAINT change_events_prime_contract_id_fkey FOREIGN KEY (prime_contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;


--
-- Name: change_events change_events_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_events
    ADD CONSTRAINT change_events_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: change_order_approvals change_order_approvals_change_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_order_approvals
    ADD CONSTRAINT change_order_approvals_change_order_id_fkey FOREIGN KEY (change_order_id) REFERENCES public.change_orders(id) ON DELETE CASCADE;


--
-- Name: change_order_costs change_order_costs_change_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_order_costs
    ADD CONSTRAINT change_order_costs_change_order_id_fkey FOREIGN KEY (change_order_id) REFERENCES public.change_orders(id) ON DELETE CASCADE;


--
-- Name: change_order_lines change_order_lines_change_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_order_lines
    ADD CONSTRAINT change_order_lines_change_order_id_fkey FOREIGN KEY (change_order_id) REFERENCES public.change_orders(id) ON DELETE CASCADE;


--
-- Name: change_order_lines change_order_lines_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_order_lines
    ADD CONSTRAINT change_order_lines_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id);


--
-- Name: change_order_lines change_order_lines_cost_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_order_lines
    ADD CONSTRAINT change_order_lines_cost_type_id_fkey FOREIGN KEY (cost_type_id) REFERENCES public.cost_code_types(id);


--
-- Name: change_order_lines change_order_lines_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_order_lines
    ADD CONSTRAINT change_order_lines_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: change_order_lines change_order_lines_sub_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_order_lines
    ADD CONSTRAINT change_order_lines_sub_job_id_fkey FOREIGN KEY (sub_job_id) REFERENCES public.sub_jobs(id) ON DELETE SET NULL;


--
-- Name: change_orders change_orders_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_orders
    ADD CONSTRAINT change_orders_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: chat_history chat_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_history
    ADD CONSTRAINT chat_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;


--
-- Name: chat_sessions chat_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chat_thread_attachment_files chat_thread_attachment_files_attachment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_thread_attachment_files
    ADD CONSTRAINT chat_thread_attachment_files_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.chat_thread_attachments(id) ON DELETE CASCADE;


--
-- Name: chat_thread_attachments chat_thread_attachments_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_thread_attachments
    ADD CONSTRAINT chat_thread_attachments_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.chat_threads(id) ON DELETE CASCADE;


--
-- Name: chat_thread_feedback chat_thread_feedback_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_thread_feedback
    ADD CONSTRAINT chat_thread_feedback_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.chat_threads(id) ON DELETE CASCADE;


--
-- Name: chat_thread_items chat_thread_items_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_thread_items
    ADD CONSTRAINT chat_thread_items_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.chat_threads(id) ON DELETE CASCADE;


--
-- Name: chunks chunks_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chunks
    ADD CONSTRAINT chunks_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: clients clients_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: code_examples code_examples_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_examples
    ADD CONSTRAINT code_examples_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(source_id);


--
-- Name: commitment_change_order_lines commitment_change_order_lines_budget_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commitment_change_order_lines
    ADD CONSTRAINT commitment_change_order_lines_budget_line_id_fkey FOREIGN KEY (budget_line_id) REFERENCES public.budget_lines(id) ON DELETE SET NULL;


--
-- Name: commitment_change_order_lines commitment_change_order_lines_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commitment_change_order_lines
    ADD CONSTRAINT commitment_change_order_lines_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id);


--
-- Name: commitment_change_order_lines commitment_change_order_lines_cost_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commitment_change_order_lines
    ADD CONSTRAINT commitment_change_order_lines_cost_type_id_fkey FOREIGN KEY (cost_type_id) REFERENCES public.cost_code_types(id);


--
-- Name: contract_billing_periods contract_billing_periods_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_billing_periods
    ADD CONSTRAINT contract_billing_periods_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.prime_contracts(id) ON DELETE CASCADE;


--
-- Name: contract_change_orders contract_change_orders_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_change_orders
    ADD CONSTRAINT contract_change_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: contract_change_orders contract_change_orders_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_change_orders
    ADD CONSTRAINT contract_change_orders_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.prime_contracts(id) ON DELETE CASCADE;


--
-- Name: contract_change_orders contract_change_orders_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_change_orders
    ADD CONSTRAINT contract_change_orders_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id);


--
-- Name: contract_documents contract_documents_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_documents
    ADD CONSTRAINT contract_documents_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.prime_contracts(id) ON DELETE CASCADE;


--
-- Name: contract_documents contract_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_documents
    ADD CONSTRAINT contract_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);


--
-- Name: contract_line_items contract_line_items_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_line_items
    ADD CONSTRAINT contract_line_items_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.prime_contracts(id) ON DELETE CASCADE;


--
-- Name: contract_payments contract_payments_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_payments
    ADD CONSTRAINT contract_payments_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: contract_payments contract_payments_billing_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_payments
    ADD CONSTRAINT contract_payments_billing_period_id_fkey FOREIGN KEY (billing_period_id) REFERENCES public.contract_billing_periods(id) ON DELETE SET NULL;


--
-- Name: contract_payments contract_payments_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_payments
    ADD CONSTRAINT contract_payments_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.prime_contracts(id) ON DELETE CASCADE;


--
-- Name: contract_snapshots contract_snapshots_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_snapshots
    ADD CONSTRAINT contract_snapshots_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.prime_contracts(id) ON DELETE CASCADE;


--
-- Name: contract_snapshots contract_snapshots_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_snapshots
    ADD CONSTRAINT contract_snapshots_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: contract_views contract_views_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_views
    ADD CONSTRAINT contract_views_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: contract_views contract_views_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_views
    ADD CONSTRAINT contract_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: contracts contracts_architect_engineer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_architect_engineer_id_fkey FOREIGN KEY (architect_engineer_id) REFERENCES public.clients(id);


--
-- Name: contracts contracts_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;


--
-- Name: contracts contracts_contractor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.clients(id);


--
-- Name: contracts contracts_owner_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_owner_client_id_fkey FOREIGN KEY (owner_client_id) REFERENCES public.clients(id);


--
-- Name: contracts contracts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- Name: cost_codes cost_codes_division_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_codes
    ADD CONSTRAINT cost_codes_division_id_fkey FOREIGN KEY (division_id) REFERENCES public.cost_code_divisions(id);


--
-- Name: crawled_pages crawled_pages_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crawled_pages
    ADD CONSTRAINT crawled_pages_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(source_id);


--
-- Name: daily_log_equipment daily_log_equipment_daily_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_log_equipment
    ADD CONSTRAINT daily_log_equipment_daily_log_id_fkey FOREIGN KEY (daily_log_id) REFERENCES public.daily_logs(id) ON DELETE CASCADE;


--
-- Name: daily_log_manpower daily_log_manpower_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_log_manpower
    ADD CONSTRAINT daily_log_manpower_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: daily_log_manpower daily_log_manpower_daily_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_log_manpower
    ADD CONSTRAINT daily_log_manpower_daily_log_id_fkey FOREIGN KEY (daily_log_id) REFERENCES public.daily_logs(id) ON DELETE CASCADE;


--
-- Name: daily_log_notes daily_log_notes_daily_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_log_notes
    ADD CONSTRAINT daily_log_notes_daily_log_id_fkey FOREIGN KEY (daily_log_id) REFERENCES public.daily_logs(id) ON DELETE CASCADE;


--
-- Name: daily_logs daily_logs_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_logs
    ADD CONSTRAINT daily_logs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: decisions decisions_metadata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decisions
    ADD CONSTRAINT decisions_metadata_id_fkey FOREIGN KEY (metadata_id) REFERENCES public.document_metadata(id) ON DELETE CASCADE;


--
-- Name: decisions decisions_segment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decisions
    ADD CONSTRAINT decisions_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.meeting_segments(id) ON DELETE SET NULL;


--
-- Name: decisions decisions_source_chunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decisions
    ADD CONSTRAINT decisions_source_chunk_id_fkey FOREIGN KEY (source_chunk_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: direct_cost_line_items direct_cost_line_items_direct_cost_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_cost_line_items
    ADD CONSTRAINT direct_cost_line_items_direct_cost_id_fkey FOREIGN KEY (direct_cost_id) REFERENCES public.direct_costs(id) ON DELETE CASCADE;


--
-- Name: direct_costs direct_costs_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_costs
    ADD CONSTRAINT direct_costs_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id);


--
-- Name: direct_costs direct_costs_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_costs
    ADD CONSTRAINT direct_costs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: direct_costs direct_costs_updated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_costs
    ADD CONSTRAINT direct_costs_updated_by_user_id_fkey FOREIGN KEY (updated_by_user_id) REFERENCES auth.users(id);


--
-- Name: direct_costs direct_costs_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_costs
    ADD CONSTRAINT direct_costs_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: discrepancies discrepancies_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discrepancies
    ADD CONSTRAINT discrepancies_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.submittal_documents(id);


--
-- Name: discrepancies discrepancies_specification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discrepancies
    ADD CONSTRAINT discrepancies_specification_id_fkey FOREIGN KEY (specification_id) REFERENCES public.specifications(id);


--
-- Name: discrepancies discrepancies_submittal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discrepancies
    ADD CONSTRAINT discrepancies_submittal_id_fkey FOREIGN KEY (submittal_id) REFERENCES public.submittals(id) ON DELETE CASCADE;


--
-- Name: distribution_group_members distribution_group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_group_members
    ADD CONSTRAINT distribution_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.distribution_groups(id) ON DELETE CASCADE;


--
-- Name: distribution_group_members distribution_group_members_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_group_members
    ADD CONSTRAINT distribution_group_members_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id);


--
-- Name: distribution_groups distribution_groups_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_groups
    ADD CONSTRAINT distribution_groups_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: document_group_access document_group_access_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_group_access
    ADD CONSTRAINT document_group_access_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.document_metadata(id) ON DELETE CASCADE;


--
-- Name: document_group_access document_group_access_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_group_access
    ADD CONSTRAINT document_group_access_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: document_insights document_insights_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_insights
    ADD CONSTRAINT document_insights_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.document_metadata(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: document_metadata document_metadata_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_metadata
    ADD CONSTRAINT document_metadata_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: document_rows document_rows_dataset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_rows
    ADD CONSTRAINT document_rows_dataset_id_fkey FOREIGN KEY (dataset_id) REFERENCES public.document_metadata(id);


--
-- Name: document_user_access document_user_access_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_user_access
    ADD CONSTRAINT document_user_access_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.document_metadata(id) ON DELETE CASCADE;


--
-- Name: document_user_access document_user_access_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_user_access
    ADD CONSTRAINT document_user_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: documents documents_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.document_metadata(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: documents documents_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE SET DEFAULT;


--
-- Name: erp_sync_log erp_sync_log_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_sync_log
    ADD CONSTRAINT erp_sync_log_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: files files_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: financial_contracts financial_contracts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_contracts
    ADD CONSTRAINT financial_contracts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: financial_contracts financial_contracts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_contracts
    ADD CONSTRAINT financial_contracts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: financial_contracts financial_contracts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_contracts
    ADD CONSTRAINT financial_contracts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: financial_contracts financial_contracts_subcontractor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_contracts
    ADD CONSTRAINT financial_contracts_subcontractor_id_fkey FOREIGN KEY (subcontractor_id) REFERENCES public.subcontractors(id);


--
-- Name: fireflies_ingestion_jobs fireflies_ingestion_jobs_metadata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fireflies_ingestion_jobs
    ADD CONSTRAINT fireflies_ingestion_jobs_metadata_id_fkey FOREIGN KEY (metadata_id) REFERENCES public.document_metadata(id) ON DELETE SET NULL;


--
-- Name: design_recommendations fk_project_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.design_recommendations
    ADD CONSTRAINT fk_project_id FOREIGN KEY (project_id) REFERENCES public.user_projects(id);


--
-- Name: fm_blocks fm_blocks_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_blocks
    ADD CONSTRAINT fm_blocks_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.fm_sections(id) ON DELETE CASCADE;


--
-- Name: fm_global_tables fm_global_tables_figures_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_global_tables
    ADD CONSTRAINT fm_global_tables_figures_fkey FOREIGN KEY (figures) REFERENCES public.fm_global_figures(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fm_optimization_suggestions fm_optimization_suggestions_form_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_optimization_suggestions
    ADD CONSTRAINT fm_optimization_suggestions_form_submission_id_fkey FOREIGN KEY (form_submission_id) REFERENCES public.fm_form_submissions(id) ON DELETE CASCADE;


--
-- Name: fm_sections fm_sections_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_sections
    ADD CONSTRAINT fm_sections_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.fm_sections(id) ON DELETE SET NULL;


--
-- Name: fm_sprinkler_configs fm_sprinkler_configs_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_sprinkler_configs
    ADD CONSTRAINT fm_sprinkler_configs_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.fm_global_tables(table_id);


--
-- Name: fm_table_vectors fm_table_vectors_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fm_table_vectors
    ADD CONSTRAINT fm_table_vectors_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.fm_global_tables(table_id) ON DELETE CASCADE;


--
-- Name: forecasting_curves forecasting_curves_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecasting_curves
    ADD CONSTRAINT forecasting_curves_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: forecasting_curves forecasting_curves_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecasting_curves
    ADD CONSTRAINT forecasting_curves_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: forecasting_curves forecasting_curves_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecasting_curves
    ADD CONSTRAINT forecasting_curves_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: group_members group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: group_members group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: groups groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: ingestion_jobs ingestion_jobs_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingestion_jobs
    ADD CONSTRAINT ingestion_jobs_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.document_metadata(id) ON DELETE SET NULL;


--
-- Name: issues issues_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: meeting_segments meeting_segments_metadata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_segments
    ADD CONSTRAINT meeting_segments_metadata_id_fkey FOREIGN KEY (metadata_id) REFERENCES public.document_metadata(id) ON DELETE CASCADE;


--
-- Name: messages messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.conversations(session_id);


--
-- Name: nods_page nods_page_parent_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nods_page
    ADD CONSTRAINT nods_page_parent_page_id_fkey FOREIGN KEY (parent_page_id) REFERENCES public.nods_page(id);


--
-- Name: nods_page_section nods_page_section_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nods_page_section
    ADD CONSTRAINT nods_page_section_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.nods_page(id) ON DELETE CASCADE;


--
-- Name: notes notes_project_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_project_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: opportunities opportunities_metadata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_metadata_id_fkey FOREIGN KEY (metadata_id) REFERENCES public.document_metadata(id) ON DELETE CASCADE;


--
-- Name: opportunities opportunities_segment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.meeting_segments(id) ON DELETE SET NULL;


--
-- Name: opportunities opportunities_source_chunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_source_chunk_id_fkey FOREIGN KEY (source_chunk_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: owner_invoice_line_items owner_invoice_line_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owner_invoice_line_items
    ADD CONSTRAINT owner_invoice_line_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.owner_invoices(id) ON DELETE CASCADE;


--
-- Name: owner_invoices owner_invoices_billing_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owner_invoices
    ADD CONSTRAINT owner_invoices_billing_period_id_fkey FOREIGN KEY (billing_period_id) REFERENCES public.billing_periods(id);


--
-- Name: owner_invoices owner_invoices_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owner_invoices
    ADD CONSTRAINT owner_invoices_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.owner_invoices(id);


--
-- Name: pcco_line_items pcco_line_items_pcco_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pcco_line_items
    ADD CONSTRAINT pcco_line_items_pcco_id_fkey FOREIGN KEY (pcco_id) REFERENCES public.prime_contract_change_orders(id) ON DELETE CASCADE;


--
-- Name: pcco_line_items pcco_line_items_pco_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pcco_line_items
    ADD CONSTRAINT pcco_line_items_pco_id_fkey FOREIGN KEY (pco_id) REFERENCES public.prime_potential_change_orders(id);


--
-- Name: pco_line_items pco_line_items_pco_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pco_line_items
    ADD CONSTRAINT pco_line_items_pco_id_fkey FOREIGN KEY (pco_id) REFERENCES public.prime_potential_change_orders(id) ON DELETE CASCADE;


--
-- Name: people people_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: prime_contract_change_orders prime_contract_change_orders_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prime_contract_change_orders
    ADD CONSTRAINT prime_contract_change_orders_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: prime_contract_sovs prime_contract_sovs_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prime_contract_sovs
    ADD CONSTRAINT prime_contract_sovs_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: prime_contracts prime_contracts_architect_engineer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prime_contracts
    ADD CONSTRAINT prime_contracts_architect_engineer_id_fkey FOREIGN KEY (architect_engineer_id) REFERENCES public.companies(id);


--
-- Name: prime_contracts prime_contracts_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prime_contracts
    ADD CONSTRAINT prime_contracts_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: prime_contracts prime_contracts_contractor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prime_contracts
    ADD CONSTRAINT prime_contracts_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.companies(id);


--
-- Name: prime_contracts prime_contracts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prime_contracts
    ADD CONSTRAINT prime_contracts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: prime_contracts prime_contracts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prime_contracts
    ADD CONSTRAINT prime_contracts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: prime_contracts prime_contracts_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prime_contracts
    ADD CONSTRAINT prime_contracts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE SET NULL;


--
-- Name: prime_potential_change_orders prime_potential_change_orders_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prime_potential_change_orders
    ADD CONSTRAINT prime_potential_change_orders_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: prime_potential_change_orders prime_potential_change_orders_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prime_potential_change_orders
    ADD CONSTRAINT prime_potential_change_orders_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: procore_components procore_components_screenshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procore_components
    ADD CONSTRAINT procore_components_screenshot_id_fkey FOREIGN KEY (screenshot_id) REFERENCES public.procore_screenshots(id) ON DELETE CASCADE;


--
-- Name: procore_features procore_features_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procore_features
    ADD CONSTRAINT procore_features_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.procore_modules(id) ON DELETE CASCADE;


--
-- Name: procore_pages procore_pages_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procore_pages
    ADD CONSTRAINT procore_pages_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.procore_features(id) ON DELETE CASCADE;


--
-- Name: procore_screenshots procore_screenshots_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procore_screenshots
    ADD CONSTRAINT procore_screenshots_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.procore_capture_sessions(id) ON DELETE CASCADE;


--
-- Name: project_briefings project_briefings_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_briefings
    ADD CONSTRAINT project_briefings_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: project_budget_codes project_budget_codes_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budget_codes
    ADD CONSTRAINT project_budget_codes_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id);


--
-- Name: project_budget_codes project_budget_codes_cost_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budget_codes
    ADD CONSTRAINT project_budget_codes_cost_type_id_fkey FOREIGN KEY (cost_type_id) REFERENCES public.cost_code_types(id);


--
-- Name: project_budget_codes project_budget_codes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budget_codes
    ADD CONSTRAINT project_budget_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: project_budget_codes project_budget_codes_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budget_codes
    ADD CONSTRAINT project_budget_codes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_budget_codes project_budget_codes_sub_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_budget_codes
    ADD CONSTRAINT project_budget_codes_sub_job_id_fkey FOREIGN KEY (sub_job_id) REFERENCES public.sub_jobs(id) ON DELETE SET NULL;


--
-- Name: project_companies project_companies_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_companies
    ADD CONSTRAINT project_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: project_companies project_companies_primary_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_companies
    ADD CONSTRAINT project_companies_primary_contact_id_fkey FOREIGN KEY (primary_contact_id) REFERENCES public.people(id);


--
-- Name: project_companies project_companies_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_companies
    ADD CONSTRAINT project_companies_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_cost_codes project_cost_codes_cost_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_cost_codes
    ADD CONSTRAINT project_cost_codes_cost_code_id_fkey FOREIGN KEY (cost_code_id) REFERENCES public.cost_codes(id);


--
-- Name: project_cost_codes project_cost_codes_cost_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_cost_codes
    ADD CONSTRAINT project_cost_codes_cost_type_id_fkey FOREIGN KEY (cost_type_id) REFERENCES public.cost_code_types(id);


--
-- Name: project_cost_codes project_cost_codes_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_cost_codes
    ADD CONSTRAINT project_cost_codes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_directory_memberships project_directory_memberships_permission_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_directory_memberships
    ADD CONSTRAINT project_directory_memberships_permission_template_id_fkey FOREIGN KEY (permission_template_id) REFERENCES public.permission_templates(id);


--
-- Name: project_directory_memberships project_directory_memberships_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_directory_memberships
    ADD CONSTRAINT project_directory_memberships_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id);


--
-- Name: project_directory_memberships project_directory_memberships_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_directory_memberships
    ADD CONSTRAINT project_directory_memberships_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: project_insights project_insights_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_insights
    ADD CONSTRAINT project_insights_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_resources project_resources_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_resources
    ADD CONSTRAINT project_resources_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE SET DEFAULT;


--
-- Name: project_role_members project_role_members_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_role_members
    ADD CONSTRAINT project_role_members_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.people(id);


--
-- Name: project_role_members project_role_members_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_role_members
    ADD CONSTRAINT project_role_members_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: project_role_members project_role_members_project_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_role_members
    ADD CONSTRAINT project_role_members_project_role_id_fkey FOREIGN KEY (project_role_id) REFERENCES public.project_roles(id) ON DELETE CASCADE;


--
-- Name: project_roles project_roles_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_roles
    ADD CONSTRAINT project_roles_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_tasks project_tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project projects_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project
    ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: prospects prospects_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: prospects prospects_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_order_sov_items purchase_order_sov_items_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_sov_items
    ADD CONSTRAINT purchase_order_sov_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id);


--
-- Name: purchase_orders purchase_orders_contract_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_contract_company_id_fkey FOREIGN KEY (contract_company_id) REFERENCES public.companies(id);


--
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: purchase_orders purchase_orders_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: qto_items qto_items_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qto_items
    ADD CONSTRAINT qto_items_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: qto_items qto_items_qto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qto_items
    ADD CONSTRAINT qto_items_qto_id_fkey FOREIGN KEY (qto_id) REFERENCES public.qtos(id) ON DELETE CASCADE;


--
-- Name: qtos qtos_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qtos
    ADD CONSTRAINT qtos_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: requests requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- Name: review_comments review_comments_discrepancy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_discrepancy_id_fkey FOREIGN KEY (discrepancy_id) REFERENCES public.discrepancies(id);


--
-- Name: review_comments review_comments_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.submittal_documents(id);


--
-- Name: review_comments review_comments_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_submittal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_submittal_id_fkey FOREIGN KEY (submittal_id) REFERENCES public.submittals(id) ON DELETE CASCADE;


--
-- Name: rfi_assignees rfi_assignees_rfi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfi_assignees
    ADD CONSTRAINT rfi_assignees_rfi_id_fkey FOREIGN KEY (rfi_id) REFERENCES public.rfis(id) ON DELETE CASCADE;


--
-- Name: rfis rfis_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rfis
    ADD CONSTRAINT rfis_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: risks risks_metadata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_metadata_id_fkey FOREIGN KEY (metadata_id) REFERENCES public.document_metadata(id) ON DELETE CASCADE;


--
-- Name: risks risks_segment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.meeting_segments(id) ON DELETE SET NULL;


--
-- Name: risks risks_source_chunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_source_chunk_id_fkey FOREIGN KEY (source_chunk_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: schedule_deadlines schedule_deadlines_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_deadlines
    ADD CONSTRAINT schedule_deadlines_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.schedule_tasks(id) ON DELETE CASCADE;


--
-- Name: schedule_dependencies schedule_dependencies_predecessor_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_dependencies
    ADD CONSTRAINT schedule_dependencies_predecessor_task_id_fkey FOREIGN KEY (predecessor_task_id) REFERENCES public.schedule_tasks(id) ON DELETE CASCADE;


--
-- Name: schedule_dependencies schedule_dependencies_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_dependencies
    ADD CONSTRAINT schedule_dependencies_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.schedule_tasks(id) ON DELETE CASCADE;


--
-- Name: schedule_of_values schedule_of_values_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_of_values
    ADD CONSTRAINT schedule_of_values_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id);


--
-- Name: schedule_tasks schedule_tasks_parent_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_tasks
    ADD CONSTRAINT schedule_tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.schedule_tasks(id) ON DELETE SET NULL;


--
-- Name: schedule_tasks schedule_tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_tasks
    ADD CONSTRAINT schedule_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: sov_line_items sov_line_items_sov_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sov_line_items
    ADD CONSTRAINT sov_line_items_sov_id_fkey FOREIGN KEY (sov_id) REFERENCES public.schedule_of_values(id) ON DELETE CASCADE;


--
-- Name: specifications specifications_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.specifications
    ADD CONSTRAINT specifications_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: sub_jobs sub_jobs_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_jobs
    ADD CONSTRAINT sub_jobs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: subcontract_attachments subcontract_attachments_subcontract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontract_attachments
    ADD CONSTRAINT subcontract_attachments_subcontract_id_fkey FOREIGN KEY (subcontract_id) REFERENCES public.subcontracts(id) ON DELETE CASCADE;


--
-- Name: subcontract_attachments subcontract_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontract_attachments
    ADD CONSTRAINT subcontract_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);


--
-- Name: subcontract_sov_items subcontract_sov_items_subcontract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontract_sov_items
    ADD CONSTRAINT subcontract_sov_items_subcontract_id_fkey FOREIGN KEY (subcontract_id) REFERENCES public.subcontracts(id) ON DELETE CASCADE;


--
-- Name: subcontractor_contacts subcontractor_contacts_subcontractor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontractor_contacts
    ADD CONSTRAINT subcontractor_contacts_subcontractor_id_fkey FOREIGN KEY (subcontractor_id) REFERENCES public.subcontractors(id) ON DELETE CASCADE;


--
-- Name: subcontractor_documents subcontractor_documents_subcontractor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontractor_documents
    ADD CONSTRAINT subcontractor_documents_subcontractor_id_fkey FOREIGN KEY (subcontractor_id) REFERENCES public.subcontractors(id) ON DELETE CASCADE;


--
-- Name: subcontractor_projects subcontractor_projects_subcontractor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontractor_projects
    ADD CONSTRAINT subcontractor_projects_subcontractor_id_fkey FOREIGN KEY (subcontractor_id) REFERENCES public.subcontractors(id) ON DELETE CASCADE;


--
-- Name: subcontracts subcontracts_contract_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontracts
    ADD CONSTRAINT subcontracts_contract_company_id_fkey FOREIGN KEY (contract_company_id) REFERENCES public.companies(id);


--
-- Name: subcontracts subcontracts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontracts
    ADD CONSTRAINT subcontracts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: subcontracts subcontracts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcontracts
    ADD CONSTRAINT subcontracts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: submittal_analytics_events submittal_analytics_events_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submittal_analytics_events
    ADD CONSTRAINT submittal_analytics_events_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: submittal_analytics_events submittal_analytics_events_submittal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submittal_analytics_events
    ADD CONSTRAINT submittal_analytics_events_submittal_id_fkey FOREIGN KEY (submittal_id) REFERENCES public.submittals(id);


--
-- Name: submittal_documents submittal_documents_submittal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submittal_documents
    ADD CONSTRAINT submittal_documents_submittal_id_fkey FOREIGN KEY (submittal_id) REFERENCES public.submittals(id) ON DELETE CASCADE;


--
-- Name: submittal_history submittal_history_submittal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submittal_history
    ADD CONSTRAINT submittal_history_submittal_id_fkey FOREIGN KEY (submittal_id) REFERENCES public.submittals(id) ON DELETE CASCADE;


--
-- Name: submittal_notifications submittal_notifications_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submittal_notifications
    ADD CONSTRAINT submittal_notifications_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: submittal_notifications submittal_notifications_submittal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submittal_notifications
    ADD CONSTRAINT submittal_notifications_submittal_id_fkey FOREIGN KEY (submittal_id) REFERENCES public.submittals(id) ON DELETE CASCADE;


--
-- Name: submittal_performance_metrics submittal_performance_metrics_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submittal_performance_metrics
    ADD CONSTRAINT submittal_performance_metrics_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: submittals submittals_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submittals
    ADD CONSTRAINT submittals_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: submittals submittals_specification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submittals
    ADD CONSTRAINT submittals_specification_id_fkey FOREIGN KEY (specification_id) REFERENCES public.specifications(id);


--
-- Name: submittals submittals_submittal_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submittals
    ADD CONSTRAINT submittals_submittal_type_id_fkey FOREIGN KEY (submittal_type_id) REFERENCES public.submittal_types(id);


--
-- Name: tasks tasks_metadata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_metadata_id_fkey FOREIGN KEY (metadata_id) REFERENCES public.document_metadata(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tasks tasks_segment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.meeting_segments(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_source_chunk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_source_chunk_id_fkey FOREIGN KEY (source_chunk_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: todos todos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: user_directory_permissions user_directory_permissions_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_directory_permissions
    ADD CONSTRAINT user_directory_permissions_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: user_directory_permissions user_directory_permissions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_directory_permissions
    ADD CONSTRAINT user_directory_permissions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: user_email_notifications user_email_notifications_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_email_notifications
    ADD CONSTRAINT user_email_notifications_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: user_email_notifications user_email_notifications_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_email_notifications
    ADD CONSTRAINT user_email_notifications_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_project_preferences user_project_preferences_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_project_preferences
    ADD CONSTRAINT user_project_preferences_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: user_project_preferences user_project_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_project_preferences
    ADD CONSTRAINT user_project_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: user_project_roles user_project_roles_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_project_roles
    ADD CONSTRAINT user_project_roles_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.project_directory_memberships(id) ON DELETE CASCADE;


--
-- Name: user_schedule_notifications user_schedule_notifications_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_schedule_notifications
    ADD CONSTRAINT user_schedule_notifications_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: user_schedule_notifications user_schedule_notifications_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_schedule_notifications
    ADD CONSTRAINT user_schedule_notifications_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: user_schedule_notifications user_schedule_notifications_resource_tasks_assigned_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_schedule_notifications
    ADD CONSTRAINT user_schedule_notifications_resource_tasks_assigned_to_id_fkey FOREIGN KEY (resource_tasks_assigned_to_id) REFERENCES public.people(id);


--
-- Name: users_auth users_auth_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_auth
    ADD CONSTRAINT users_auth_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id);


--
-- Name: users_auth users_auth_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_auth
    ADD CONSTRAINT users_auth_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;


--
-- Name: vendors vendors_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: vertical_markup vertical_markup_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vertical_markup
    ADD CONSTRAINT vertical_markup_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: conversations Admins can insert conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert conversations" ON public.conversations FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: messages Admins can insert messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert messages" ON public.messages FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: requests Admins can insert requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert requests" ON public.requests FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: user_email_notifications Admins can manage any user email notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage any user email notifications" ON public.user_email_notifications USING ((EXISTS ( SELECT 1
   FROM ((public.project_directory_memberships pdm
     JOIN public.users_auth ua ON ((ua.person_id = pdm.person_id)))
     JOIN public.permission_templates pt ON ((pt.id = pdm.permission_template_id)))
  WHERE ((pdm.project_id = user_email_notifications.project_id) AND (ua.auth_user_id = auth.uid()) AND (pdm.status = 'active'::text) AND ((pt.rules_json -> 'directory'::text) ? 'admin'::text)))));


--
-- Name: user_schedule_notifications Admins can manage any user schedule notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage any user schedule notifications" ON public.user_schedule_notifications USING ((EXISTS ( SELECT 1
   FROM ((public.project_directory_memberships pdm
     JOIN public.users_auth ua ON ((ua.person_id = pdm.person_id)))
     JOIN public.permission_templates pt ON ((pt.id = pdm.permission_template_id)))
  WHERE ((pdm.project_id = user_schedule_notifications.project_id) AND (ua.auth_user_id = auth.uid()) AND (pdm.status = 'active'::text) AND ((pt.rules_json -> 'directory'::text) ? 'admin'::text)))));


--
-- Name: user_directory_permissions Admins can manage directory permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage directory permissions" ON public.user_directory_permissions USING (((EXISTS ( SELECT 1
   FROM (public.project_directory_memberships pdm
     JOIN public.permission_templates pt ON ((pt.id = pdm.permission_template_id)))
  WHERE ((pdm.project_id = user_directory_permissions.project_id) AND (pdm.status = 'active'::text) AND (pdm.person_id = auth.uid()) AND ((pt.rules_json -> 'directory'::text) ? 'admin'::text)))) OR (auth.role() = 'service_role'::text)));


--
-- Name: project_roles Admins can manage project roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage project roles" ON public.project_roles USING (((EXISTS ( SELECT 1
   FROM (public.project_directory_memberships pdm
     JOIN public.permission_templates pt ON ((pt.id = pdm.permission_template_id)))
  WHERE ((pdm.project_id = project_roles.project_id) AND (pdm.status = 'active'::text) AND (pdm.person_id = auth.uid()) AND ((pt.rules_json -> 'directory'::text) ? 'admin'::text)))) OR (auth.role() = 'service_role'::text)));


--
-- Name: project_role_members Admins can manage role members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage role members" ON public.project_role_members USING (((EXISTS ( SELECT 1
   FROM ((public.project_roles pr
     JOIN public.project_directory_memberships pdm ON ((pdm.project_id = pr.project_id)))
     JOIN public.permission_templates pt ON ((pt.id = pdm.permission_template_id)))
  WHERE ((pr.id = project_role_members.project_role_id) AND (pdm.status = 'active'::text) AND (pdm.person_id = auth.uid()) AND ((pt.rules_json -> 'directory'::text) ? 'admin'::text)))) OR (auth.role() = 'service_role'::text)));


--
-- Name: user_project_roles Admins can manage user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage user roles" ON public.user_project_roles USING ((EXISTS ( SELECT 1
   FROM (((public.project_directory_memberships pdm
     JOIN public.project_directory_memberships pdm2 ON ((pdm2.project_id = pdm.project_id)))
     JOIN public.users_auth ua ON ((ua.person_id = pdm2.person_id)))
     JOIN public.permission_templates pt ON ((pt.id = pdm2.permission_template_id)))
  WHERE ((pdm.id = user_project_roles.membership_id) AND (ua.auth_user_id = auth.uid()) AND (pdm2.status = 'active'::text) AND ((pt.rules_json -> 'directory'::text) ? 'admin'::text)))));


--
-- Name: conversations Admins can update all conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all conversations" ON public.conversations FOR UPDATE USING (public.is_admin());


--
-- Name: user_profiles Admins can update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all profiles" ON public.user_profiles FOR UPDATE USING (public.is_admin());


--
-- Name: conversations Admins can view all conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all conversations" ON public.conversations FOR SELECT USING (public.is_admin());


--
-- Name: messages Admins can view all messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all messages" ON public.messages FOR SELECT USING (public.is_admin());


--
-- Name: user_profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.user_profiles FOR SELECT USING (public.is_admin());


--
-- Name: requests Admins can view all requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all requests" ON public.requests FOR SELECT USING (public.is_admin());


--
-- Name: document_group_access Admins manage document_group_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage document_group_access" ON public.document_group_access USING (((auth.jwt() ->> 'role'::text) = 'admin'::text)) WITH CHECK (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: document_user_access Admins manage document_user_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage document_user_access" ON public.document_user_access USING (((auth.jwt() ->> 'role'::text) = 'admin'::text)) WITH CHECK (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: permission_templates All users can view permission templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All users can view permission templates" ON public.permission_templates FOR SELECT USING (true);


--
-- Name: qa_page_audit Allow anon insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anon insert" ON public.qa_page_audit FOR INSERT TO anon WITH CHECK (true);


--
-- Name: qa_page_audit Allow anon read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anon read" ON public.qa_page_audit FOR SELECT TO anon USING (true);


--
-- Name: qa_page_audit Allow anon update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anon update" ON public.qa_page_audit FOR UPDATE TO anon USING (true) WITH CHECK (true);


--
-- Name: ai_insights Allow anon users to view ai_insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow anon users to view ai_insights" ON public.ai_insights FOR SELECT TO anon USING (true);


--
-- Name: files Allow authenticated delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated delete" ON public.files FOR DELETE TO authenticated USING (true);


--
-- Name: qa_page_audit Allow authenticated delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated delete" ON public.qa_page_audit FOR DELETE TO authenticated USING (true);


--
-- Name: files Allow authenticated insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated insert" ON public.files FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: qa_page_audit Allow authenticated insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated insert" ON public.qa_page_audit FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: qa_page_audit Allow authenticated read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated read" ON public.qa_page_audit FOR SELECT TO authenticated USING (true);


--
-- Name: qa_page_audit Allow authenticated update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated update" ON public.qa_page_audit FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: ai_insights Allow authenticated users full access to ai_insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access to ai_insights" ON public.ai_insights TO authenticated USING (true) WITH CHECK (true);


--
-- Name: clients Allow authenticated users select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users select" ON public.clients FOR SELECT TO authenticated USING (true);


--
-- Name: companies Allow authenticated users select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users select" ON public.companies FOR SELECT TO authenticated USING (true);


--
-- Name: nods_page Allow authenticated users select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users select" ON public.nods_page FOR SELECT TO authenticated USING (true);


--
-- Name: nods_page_section Allow authenticated users select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users select" ON public.nods_page_section FOR SELECT TO authenticated USING (true);


--
-- Name: project_tasks Allow authenticated users select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users select" ON public.project_tasks FOR SELECT TO authenticated USING (true);


--
-- Name: projects Allow authenticated users select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users select" ON public.projects FOR SELECT TO authenticated USING (true);


--
-- Name: sync_status Allow authenticated users select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users select" ON public.sync_status FOR SELECT TO authenticated USING (true);


--
-- Name: users_auth Allow authenticated users to read users_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to read users_auth" ON public.users_auth FOR SELECT TO authenticated USING (true);


--
-- Name: asrs_configurations Allow public access on asrs_configurations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public access on asrs_configurations" ON public.asrs_configurations USING (true);


--
-- Name: cost_factors Allow public access on cost_factors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public access on cost_factors" ON public.cost_factors USING (true);


--
-- Name: user_projects Allow public access on projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public access on projects" ON public.user_projects USING (true);


--
-- Name: design_recommendations Allow public access on recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public access on recommendations" ON public.design_recommendations USING (true);


--
-- Name: files Allow public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read" ON public.files FOR SELECT USING (true);


--
-- Name: fm_table_vectors Allow public read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access" ON public.fm_table_vectors FOR SELECT USING (true);


--
-- Name: fm_blocks Allow public read access on fm_blocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access on fm_blocks" ON public.fm_blocks FOR SELECT USING (true);


--
-- Name: fm_sections Allow public read access on fm_sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access on fm_sections" ON public.fm_sections FOR SELECT USING ((is_visible = true));


--
-- Name: code_examples Allow public read access to code_examples; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to code_examples" ON public.code_examples FOR SELECT USING (true);


--
-- Name: crawled_pages Allow public read access to crawled_pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to crawled_pages" ON public.crawled_pages FOR SELECT USING (true);


--
-- Name: sources Allow public read access to sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to sources" ON public.sources FOR SELECT USING (true);


--
-- Name: subcontractors Authenticated users can insert subcontractors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert subcontractors" ON public.subcontractors FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: submittals Authenticated users can manage submittals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage submittals" ON public.submittals TO authenticated USING (true) WITH CHECK (true);


--
-- Name: subcontractors Authenticated users can update subcontractors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update subcontractors" ON public.subcontractors FOR UPDATE TO authenticated USING (true);


--
-- Name: subcontractors Authenticated users can view subcontractors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view subcontractors" ON public.subcontractors FOR SELECT TO authenticated USING (true);


--
-- Name: conversations Deny delete for conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny delete for conversations" ON public.conversations FOR DELETE USING (false);


--
-- Name: messages Deny delete for messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny delete for messages" ON public.messages FOR DELETE USING (false);


--
-- Name: requests Deny delete for requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny delete for requests" ON public.requests FOR DELETE USING (false);


--
-- Name: user_profiles Deny delete for user_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny delete for user_profiles" ON public.user_profiles FOR DELETE USING (false);


--
-- Name: documents Enable delete for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable delete for authenticated users" ON public.documents FOR DELETE TO authenticated USING (true);


--
-- Name: documents Enable insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for authenticated users" ON public.documents FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: document_chunks Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.document_chunks FOR SELECT USING (true);


--
-- Name: documents Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.documents FOR SELECT USING (true);


--
-- Name: documents Enable update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for authenticated users" ON public.documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: document_chunks Enable write access for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable write access for authenticated users" ON public.document_chunks USING (((auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text)));


--
-- Name: fm_global_figures Figures are viewable by anonymous users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Figures are viewable by anonymous users" ON public.fm_global_figures FOR SELECT USING (true);


--
-- Name: fm_global_figures Figures are viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Figures are viewable by authenticated users" ON public.fm_global_figures FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: todos Individuals can create todos.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Individuals can create todos." ON public.todos FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: todos Individuals can delete their own todos.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Individuals can delete their own todos." ON public.todos FOR DELETE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: todos Individuals can update their own todos.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Individuals can update their own todos." ON public.todos FOR UPDATE USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: todos Individuals can view their own todos. ; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Individuals can view their own todos. " ON public.todos FOR SELECT USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_profiles Only admins can change admin status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can change admin status" ON public.user_profiles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: Prospects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."Prospects" ENABLE ROW LEVEL SECURITY;

--
-- Name: documents Service role has full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role has full access" ON public.documents TO service_role USING (true) WITH CHECK (true);


--
-- Name: project_tasks Service role has full access to project_tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role has full access to project_tasks" ON public.project_tasks USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: contract_views Users can create their own views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own views" ON public.contract_views FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: contract_views Users can delete their own views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own views" ON public.contract_views FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: messages Users can insert messages in their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert messages in their conversations" ON public.messages FOR INSERT WITH CHECK ((auth.uid() = computed_session_user_id));


--
-- Name: conversations Users can insert their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own conversations" ON public.conversations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: sov_line_items Users can manage SOV line items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage SOV line items" ON public.sov_line_items USING (true);


--
-- Name: schedule_of_values Users can manage SOVs for their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage SOVs for their projects" ON public.schedule_of_values USING (true);


--
-- Name: billing_periods Users can manage billing periods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage billing periods" ON public.billing_periods USING (true);


--
-- Name: user_email_notifications Users can manage their own email notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own email notifications" ON public.user_email_notifications USING ((EXISTS ( SELECT 1
   FROM public.users_auth ua
  WHERE ((ua.person_id = user_email_notifications.person_id) AND (ua.auth_user_id = auth.uid())))));


--
-- Name: user_project_preferences Users can manage their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own preferences" ON public.user_project_preferences USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_schedule_notifications Users can manage their own schedule notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own schedule notifications" ON public.user_schedule_notifications USING ((EXISTS ( SELECT 1
   FROM public.users_auth ua
  WHERE ((ua.person_id = user_schedule_notifications.person_id) AND (ua.auth_user_id = auth.uid())))));


--
-- Name: vertical_markup Users can manage vertical markup; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage vertical markup" ON public.vertical_markup USING (true);


--
-- Name: fm_text_chunks Users can read text chunks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read text chunks" ON public.fm_text_chunks FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: conversations Users can update their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own conversations" ON public.conversations FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK (((auth.uid() = id) AND (NOT (is_admin IS DISTINCT FROM false))));


--
-- Name: contract_views Users can update their own views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own views" ON public.contract_views FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: sov_line_items Users can view SOV line items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view SOV line items" ON public.sov_line_items FOR SELECT USING (true);


--
-- Name: schedule_of_values Users can view SOVs for their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view SOVs for their projects" ON public.schedule_of_values FOR SELECT USING (true);


--
-- Name: people Users can view all people in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all people in their projects" ON public.people FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.project_directory_memberships pdm1
  WHERE ((pdm1.person_id = people.id) AND (pdm1.status = 'active'::text) AND (EXISTS ( SELECT 1
           FROM (public.project_directory_memberships pdm2
             JOIN public.users_auth ua ON ((ua.person_id = pdm2.person_id)))
          WHERE ((pdm2.project_id = pdm1.project_id) AND (pdm2.status = 'active'::text) AND (ua.auth_user_id = auth.uid()))))))));


--
-- Name: billing_periods Users can view billing periods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view billing periods" ON public.billing_periods FOR SELECT USING (true);


--
-- Name: budget_modification_lines Users can view budget modification lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view budget modification lines" ON public.budget_modification_lines FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: commitment_change_order_lines Users can view commitment change order lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view commitment change order lines" ON public.commitment_change_order_lines FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: project_companies Users can view companies in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view companies in their projects" ON public.project_companies FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.project_directory_memberships pdm
     JOIN public.users_auth ua ON ((ua.person_id = pdm.person_id)))
  WHERE ((pdm.project_id = project_companies.project_id) AND (pdm.status = 'active'::text) AND (ua.auth_user_id = auth.uid())))));


--
-- Name: user_directory_permissions Users can view directory permissions in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view directory permissions in their projects" ON public.user_directory_permissions FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.project_directory_memberships pdm
  WHERE ((pdm.project_id = user_directory_permissions.project_id) AND (pdm.status = 'active'::text) AND (pdm.person_id = auth.uid())))) OR (auth.role() = 'service_role'::text)));


--
-- Name: user_email_notifications Users can view email notifications in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view email notifications in their projects" ON public.user_email_notifications FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.project_directory_memberships pdm
     JOIN public.users_auth ua ON ((ua.person_id = pdm.person_id)))
  WHERE ((pdm.project_id = user_email_notifications.project_id) AND (pdm.status = 'active'::text) AND (ua.auth_user_id = auth.uid())))));


--
-- Name: distribution_groups Users can view groups in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view groups in their projects" ON public.distribution_groups FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.project_directory_memberships pdm
     JOIN public.users_auth ua ON ((ua.person_id = pdm.person_id)))
  WHERE ((pdm.project_id = distribution_groups.project_id) AND (pdm.status = 'active'::text) AND (ua.auth_user_id = auth.uid())))));


--
-- Name: project_role_members Users can view role members in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view role members in their projects" ON public.project_role_members FOR SELECT USING (((EXISTS ( SELECT 1
   FROM (public.project_roles pr
     JOIN public.project_directory_memberships pdm ON ((pdm.project_id = pr.project_id)))
  WHERE ((pr.id = project_role_members.project_role_id) AND (pdm.status = 'active'::text) AND (pdm.person_id = auth.uid())))) OR (auth.role() = 'service_role'::text)));


--
-- Name: project_roles Users can view roles in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view roles in their projects" ON public.project_roles FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.project_directory_memberships pdm
  WHERE ((pdm.project_id = project_roles.project_id) AND (pdm.status = 'active'::text) AND (pdm.person_id = auth.uid())))) OR (auth.role() = 'service_role'::text)));


--
-- Name: user_project_roles Users can view roles in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view roles in their projects" ON public.user_project_roles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.project_directory_memberships pdm
     JOIN public.users_auth ua ON ((ua.person_id = pdm.person_id)))
  WHERE ((pdm.id = user_project_roles.membership_id) AND (pdm.status = 'active'::text) AND (ua.auth_user_id = auth.uid())))));


--
-- Name: user_schedule_notifications Users can view schedule notifications in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view schedule notifications in their projects" ON public.user_schedule_notifications FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.project_directory_memberships pdm
     JOIN public.users_auth ua ON ((ua.person_id = pdm.person_id)))
  WHERE ((pdm.project_id = user_schedule_notifications.project_id) AND (pdm.status = 'active'::text) AND (ua.auth_user_id = auth.uid())))));


--
-- Name: conversations Users can view their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own conversations" ON public.conversations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: messages Users can view their own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING ((auth.uid() = computed_session_user_id));


--
-- Name: user_profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: requests Users can view their own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own requests" ON public.requests FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: contract_views Users can view their own views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own views" ON public.contract_views FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: vertical_markup Users can view vertical markup; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view vertical markup" ON public.vertical_markup FOR SELECT USING (true);


--
-- Name: distribution_groups Users with directory:admin can manage groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users with directory:admin can manage groups" ON public.distribution_groups USING ((EXISTS ( SELECT 1
   FROM ((public.project_directory_memberships pdm
     JOIN public.users_auth ua ON ((ua.person_id = pdm.person_id)))
     JOIN public.permission_templates pt ON ((pt.id = pdm.permission_template_id)))
  WHERE ((pdm.project_id = distribution_groups.project_id) AND (ua.auth_user_id = auth.uid()) AND (pdm.status = 'active'::text) AND ((pt.rules_json -> 'directory'::text) ? 'admin'::text)))));


--
-- Name: people Users with directory:write can create people; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users with directory:write can create people" ON public.people FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.project_directory_memberships pdm
     JOIN public.users_auth ua ON ((ua.person_id = pdm.person_id)))
     JOIN public.permission_templates pt ON ((pt.id = pdm.permission_template_id)))
  WHERE ((ua.auth_user_id = auth.uid()) AND (pdm.status = 'active'::text) AND ((pt.rules_json -> 'directory'::text) ? 'write'::text)))));


--
-- Name: project_companies Users with directory:write can manage project companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users with directory:write can manage project companies" ON public.project_companies USING ((EXISTS ( SELECT 1
   FROM ((public.project_directory_memberships pdm
     JOIN public.users_auth ua ON ((ua.person_id = pdm.person_id)))
     JOIN public.permission_templates pt ON ((pt.id = pdm.permission_template_id)))
  WHERE ((pdm.project_id = project_companies.project_id) AND (ua.auth_user_id = auth.uid()) AND (pdm.status = 'active'::text) AND ((pt.rules_json -> 'directory'::text) ? 'write'::text)))));


--
-- Name: people Users with directory:write can update people; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users with directory:write can update people" ON public.people FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ((public.project_directory_memberships pdm
     JOIN public.users_auth ua ON ((ua.person_id = pdm.person_id)))
     JOIN public.permission_templates pt ON ((pt.id = pdm.permission_template_id)))
  WHERE ((ua.auth_user_id = auth.uid()) AND (pdm.status = 'active'::text) AND ((pt.rules_json -> 'directory'::text) ? 'write'::text)))));


--
-- Name: document_metadata admin_all_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_all_access ON public.document_metadata TO authenticated USING (((auth.jwt() ->> 'role'::text) = 'admin'::text)) WITH CHECK (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: ai_insights ai_insights_select_project_visible; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_insights_select_project_visible ON public.ai_insights FOR SELECT TO authenticated USING (((project_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = ai_insights.project_id) AND ((p.archived = false) OR (p.archived_by = ( SELECT auth.uid() AS uid))))))));


--
-- Name: asrs_protection_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asrs_protection_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: distribution_group_members authenticated_delete_dgm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_delete_dgm ON public.distribution_group_members FOR DELETE TO authenticated USING (true);


--
-- Name: distribution_groups authenticated_delete_distribution_groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_delete_distribution_groups ON public.distribution_groups FOR DELETE TO authenticated USING (true);


--
-- Name: companies authenticated_insert_companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_insert_companies ON public.companies FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: distribution_group_members authenticated_insert_dgm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_insert_dgm ON public.distribution_group_members FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: distribution_groups authenticated_insert_distribution_groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_insert_distribution_groups ON public.distribution_groups FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: project_directory_memberships authenticated_insert_pdm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_insert_pdm ON public.project_directory_memberships FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: people authenticated_insert_people; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_insert_people ON public.people FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: permission_templates authenticated_insert_permission_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_insert_permission_templates ON public.permission_templates FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: project_companies authenticated_insert_project_companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_insert_project_companies ON public.project_companies FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: users_auth authenticated_insert_users_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_insert_users_auth ON public.users_auth FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: companies authenticated_read_companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_read_companies ON public.companies FOR SELECT TO authenticated USING (true);


--
-- Name: distribution_group_members authenticated_read_dgm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_read_dgm ON public.distribution_group_members FOR SELECT TO authenticated USING (true);


--
-- Name: distribution_groups authenticated_read_distribution_groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_read_distribution_groups ON public.distribution_groups FOR SELECT TO authenticated USING (true);


--
-- Name: project_directory_memberships authenticated_read_pdm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_read_pdm ON public.project_directory_memberships FOR SELECT TO authenticated USING (true);


--
-- Name: people authenticated_read_people; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_read_people ON public.people FOR SELECT TO authenticated USING (true);


--
-- Name: permission_templates authenticated_read_permission_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_read_permission_templates ON public.permission_templates FOR SELECT TO authenticated USING (true);


--
-- Name: project_companies authenticated_read_project_companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_read_project_companies ON public.project_companies FOR SELECT TO authenticated USING (true);


--
-- Name: users_auth authenticated_read_users_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_read_users_auth ON public.users_auth FOR SELECT TO authenticated USING (true);


--
-- Name: companies authenticated_update_companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_update_companies ON public.companies FOR UPDATE TO authenticated USING (true);


--
-- Name: distribution_groups authenticated_update_distribution_groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_update_distribution_groups ON public.distribution_groups FOR UPDATE TO authenticated USING (true);


--
-- Name: project_directory_memberships authenticated_update_pdm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_update_pdm ON public.project_directory_memberships FOR UPDATE TO authenticated USING (true);


--
-- Name: people authenticated_update_people; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_update_people ON public.people FOR UPDATE TO authenticated USING (true);


--
-- Name: permission_templates authenticated_update_permission_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_update_permission_templates ON public.permission_templates FOR UPDATE TO authenticated USING (true);


--
-- Name: project_companies authenticated_update_project_companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_update_project_companies ON public.project_companies FOR UPDATE TO authenticated USING (true);


--
-- Name: billing_periods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.billing_periods ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_line_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budget_line_history ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_line_history budget_line_history_insert_for_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_line_history_insert_for_authenticated ON public.budget_line_history FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: budget_line_history budget_line_history_select_for_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_line_history_select_for_authenticated ON public.budget_line_history FOR SELECT TO authenticated USING (true);


--
-- Name: budget_lines budget_lines_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_lines_delete ON public.budget_lines FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: budget_lines budget_lines_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_lines_insert ON public.budget_lines FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: budget_lines budget_lines_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_lines_select ON public.budget_lines FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: budget_lines budget_lines_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_lines_update ON public.budget_lines FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: budget_mod_lines budget_mod_lines_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_mod_lines_delete ON public.budget_mod_lines FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: budget_mod_lines budget_mod_lines_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_mod_lines_insert ON public.budget_mod_lines FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: budget_mod_lines budget_mod_lines_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_mod_lines_select ON public.budget_mod_lines FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: budget_mod_lines budget_mod_lines_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_mod_lines_update ON public.budget_mod_lines FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: budget_modification_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budget_modification_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_modifications budget_modifications_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_modifications_delete ON public.budget_modifications FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: budget_modifications budget_modifications_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_modifications_insert ON public.budget_modifications FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: budget_modifications budget_modifications_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_modifications_select ON public.budget_modifications FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: budget_modifications budget_modifications_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_modifications_update ON public.budget_modifications FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: budget_view_columns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budget_view_columns ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_view_columns budget_view_columns_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_view_columns_delete ON public.budget_view_columns FOR DELETE TO authenticated USING ((auth.uid() IS NOT NULL));


--
-- Name: budget_view_columns budget_view_columns_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_view_columns_insert ON public.budget_view_columns FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: budget_view_columns budget_view_columns_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_view_columns_select ON public.budget_view_columns FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));


--
-- Name: budget_view_columns budget_view_columns_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_view_columns_update ON public.budget_view_columns FOR UPDATE TO authenticated USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: budget_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budget_views ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_views budget_views_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_views_delete ON public.budget_views FOR DELETE TO authenticated USING ((auth.uid() IS NOT NULL));


--
-- Name: budget_views budget_views_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_views_insert ON public.budget_views FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: budget_views budget_views_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_views_select ON public.budget_views FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));


--
-- Name: budget_views budget_views_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY budget_views_update ON public.budget_views FOR UPDATE TO authenticated USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: change_event_approvals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.change_event_approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: change_event_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.change_event_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: change_event_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.change_event_history ENABLE ROW LEVEL SECURITY;

--
-- Name: change_event_line_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.change_event_line_items ENABLE ROW LEVEL SECURITY;

--
-- Name: change_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.change_events ENABLE ROW LEVEL SECURITY;

--
-- Name: change_order_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.change_order_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: change_order_lines change_order_lines_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY change_order_lines_delete ON public.change_order_lines FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: change_order_lines change_order_lines_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY change_order_lines_insert ON public.change_order_lines FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: change_order_lines change_order_lines_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY change_order_lines_select ON public.change_order_lines FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: change_order_lines change_order_lines_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY change_order_lines_update ON public.change_order_lines FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: chat_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

--
-- Name: code_examples; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.code_examples ENABLE ROW LEVEL SECURITY;

--
-- Name: commitment_change_order_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.commitment_change_order_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: companies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

--
-- Name: contract_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contract_views ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: cost_factors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cost_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: design_recommendations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.design_recommendations ENABLE ROW LEVEL SECURITY;

--
-- Name: direct_cost_line_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.direct_cost_line_items ENABLE ROW LEVEL SECURITY;

--
-- Name: direct_costs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.direct_costs ENABLE ROW LEVEL SECURITY;

--
-- Name: distribution_group_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.distribution_group_members ENABLE ROW LEVEL SECURITY;

--
-- Name: distribution_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.distribution_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: document_chunks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

--
-- Name: document_group_access; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.document_group_access ENABLE ROW LEVEL SECURITY;

--
-- Name: document_user_access; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.document_user_access ENABLE ROW LEVEL SECURITY;

--
-- Name: files; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

--
-- Name: fm_blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fm_blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: fm_global_figures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fm_global_figures ENABLE ROW LEVEL SECURITY;

--
-- Name: fm_sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fm_sections ENABLE ROW LEVEL SECURITY;

--
-- Name: fm_table_vectors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fm_table_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: fm_text_chunks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fm_text_chunks ENABLE ROW LEVEL SECURITY;

--
-- Name: forecasting_curves; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forecasting_curves ENABLE ROW LEVEL SECURITY;

--
-- Name: document_metadata leadership_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leadership_access ON public.document_metadata FOR SELECT TO authenticated USING ((((auth.jwt() ->> 'role'::text) = 'leadership'::text) AND (access_level = ANY (ARRAY['leadership'::text, 'team'::text]))));


--
-- Name: document_metadata leadership_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leadership_delete ON public.document_metadata FOR DELETE TO authenticated USING ((((auth.jwt() ->> 'role'::text) = 'leadership'::text) AND (access_level = ANY (ARRAY['leadership'::text, 'team'::text]))));


--
-- Name: document_metadata leadership_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leadership_insert ON public.document_metadata FOR INSERT TO authenticated WITH CHECK ((((auth.jwt() ->> 'role'::text) = 'leadership'::text) AND (access_level = ANY (ARRAY['leadership'::text, 'team'::text]))));


--
-- Name: document_metadata leadership_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leadership_update ON public.document_metadata FOR UPDATE TO authenticated USING ((((auth.jwt() ->> 'role'::text) = 'leadership'::text) AND (access_level = ANY (ARRAY['leadership'::text, 'team'::text])))) WITH CHECK ((access_level = ANY (ARRAY['leadership'::text, 'team'::text])));


--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: nods_page; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nods_page ENABLE ROW LEVEL SECURITY;

--
-- Name: nods_page_section; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nods_page_section ENABLE ROW LEVEL SECURITY;

--
-- Name: owner_invoice_line_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.owner_invoice_line_items ENABLE ROW LEVEL SECURITY;

--
-- Name: owner_invoice_line_items owner_invoice_line_items_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_invoice_line_items_delete ON public.owner_invoice_line_items FOR DELETE TO authenticated USING ((auth.uid() IS NOT NULL));


--
-- Name: owner_invoice_line_items owner_invoice_line_items_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_invoice_line_items_insert ON public.owner_invoice_line_items FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: owner_invoice_line_items owner_invoice_line_items_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_invoice_line_items_select ON public.owner_invoice_line_items FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));


--
-- Name: owner_invoice_line_items owner_invoice_line_items_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_invoice_line_items_update ON public.owner_invoice_line_items FOR UPDATE TO authenticated USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: owner_invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.owner_invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: owner_invoices owner_invoices_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_invoices_delete ON public.owner_invoices FOR DELETE TO authenticated USING ((auth.uid() IS NOT NULL));


--
-- Name: owner_invoices owner_invoices_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_invoices_insert ON public.owner_invoices FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: owner_invoices owner_invoices_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_invoices_select ON public.owner_invoices FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));


--
-- Name: owner_invoices owner_invoices_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_invoices_update ON public.owner_invoices FOR UPDATE TO authenticated USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: people; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

--
-- Name: permission_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.permission_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: processing_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: procore_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.procore_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: procore_pages procore_pages_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY procore_pages_delete ON public.procore_pages FOR DELETE TO authenticated USING (true);


--
-- Name: procore_pages procore_pages_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY procore_pages_insert ON public.procore_pages FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: procore_pages procore_pages_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY procore_pages_select ON public.procore_pages FOR SELECT TO authenticated USING (true);


--
-- Name: procore_pages procore_pages_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY procore_pages_update ON public.procore_pages FOR UPDATE TO authenticated USING (true);


--
-- Name: project_budget_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_budget_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: project_budget_codes project_budget_codes_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY project_budget_codes_delete ON public.project_budget_codes FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: project_budget_codes project_budget_codes_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY project_budget_codes_insert ON public.project_budget_codes FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: project_budget_codes project_budget_codes_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY project_budget_codes_select ON public.project_budget_codes FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: project_budget_codes project_budget_codes_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY project_budget_codes_update ON public.project_budget_codes FOR UPDATE USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: project_companies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_companies ENABLE ROW LEVEL SECURITY;

--
-- Name: project_directory_memberships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_directory_memberships ENABLE ROW LEVEL SECURITY;

--
-- Name: project_role_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_role_members ENABLE ROW LEVEL SECURITY;

--
-- Name: project_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: project_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: projects projects_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_insert_authenticated ON public.projects FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: purchase_order_sov_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_order_sov_items ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: qa_page_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.qa_page_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: rag_pipeline_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rag_pipeline_state ENABLE ROW LEVEL SECURITY;

--
-- Name: requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

--
-- Name: schedule_deadlines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.schedule_deadlines ENABLE ROW LEVEL SECURITY;

--
-- Name: schedule_dependencies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.schedule_dependencies ENABLE ROW LEVEL SECURITY;

--
-- Name: schedule_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.schedule_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: companies service_role_all_companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_all_companies ON public.companies TO service_role USING (true);


--
-- Name: distribution_group_members service_role_all_dgm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_all_dgm ON public.distribution_group_members TO service_role USING (true);


--
-- Name: distribution_groups service_role_all_distribution_groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_all_distribution_groups ON public.distribution_groups TO service_role USING (true);


--
-- Name: project_directory_memberships service_role_all_pdm; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_all_pdm ON public.project_directory_memberships TO service_role USING (true);


--
-- Name: people service_role_all_people; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_all_people ON public.people TO service_role USING (true);


--
-- Name: permission_templates service_role_all_permission_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_all_permission_templates ON public.permission_templates TO service_role USING (true);


--
-- Name: project_companies service_role_all_project_companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_all_project_companies ON public.project_companies TO service_role USING (true);


--
-- Name: users_auth service_role_all_users_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_all_users_auth ON public.users_auth TO service_role USING (true);


--
-- Name: sov_line_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sov_line_items ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sub_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_jobs sub_jobs_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sub_jobs_read ON public.sub_jobs FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: sub_jobs sub_jobs_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sub_jobs_write ON public.sub_jobs USING ((auth.uid() IS NOT NULL));


--
-- Name: subcontract_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subcontract_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: subcontract_sov_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subcontract_sov_items ENABLE ROW LEVEL SECURITY;

--
-- Name: subcontractors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;

--
-- Name: subcontracts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subcontracts ENABLE ROW LEVEL SECURITY;

--
-- Name: submittals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.submittals ENABLE ROW LEVEL SECURITY;

--
-- Name: sync_status; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;

--
-- Name: document_metadata team_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_access ON public.document_metadata FOR SELECT TO authenticated USING ((((auth.jwt() ->> 'role'::text) = 'team'::text) AND (access_level = 'team'::text)));


--
-- Name: document_metadata team_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_insert ON public.document_metadata FOR INSERT TO authenticated WITH CHECK ((((auth.jwt() ->> 'role'::text) = 'team'::text) AND (access_level = 'team'::text)));


--
-- Name: document_metadata team_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_update ON public.document_metadata FOR UPDATE TO authenticated USING ((((auth.jwt() ->> 'role'::text) = 'team'::text) AND (access_level = 'team'::text))) WITH CHECK ((((auth.jwt() ->> 'role'::text) = 'team'::text) AND (access_level = 'team'::text)));


--
-- Name: todos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

--
-- Name: user_directory_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_directory_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_email_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_email_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_project_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_project_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_project_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_project_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

--
-- Name: user_schedule_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_schedule_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: users_auth; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users_auth ENABLE ROW LEVEL SECURITY;

--
-- Name: document_metadata users_can_read_docs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_can_read_docs ON public.document_metadata FOR SELECT TO authenticated USING (((access_level = 'team'::text) OR (id IN ( SELECT document_user_access.document_id
   FROM public.document_user_access
  WHERE (document_user_access.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: vendors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

--
-- Name: vertical_markup; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vertical_markup ENABLE ROW LEVEL SECURITY;

--
-- Name: document_metadata zapier_access_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zapier_access_policy ON public.document_metadata TO zapier USING (true) WITH CHECK (true);


--
-- Name: document_metadata zapier_full_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY zapier_full_access ON public.document_metadata TO zapier USING (true) WITH CHECK (true);


--
-- PostgreSQL database dump complete
--

