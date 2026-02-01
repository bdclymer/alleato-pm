import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{
    projectId: string;
    changeEventId: string;
    attachmentId: string;
  }>;
}

/**
 * GET /api/projects/[id]/change-events/[changeEventId]/attachments/[attachmentId]
 * Returns a single attachment metadata
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectId, changeEventId, attachmentId } = await params;
    const supabase = await createClient();

    // Verify change event exists
    const { data: changeEvent, error: eventError } = await supabase
      .from('change_events')
      .select('id')
      .eq('project_id', parseInt(projectId, 10))
      .eq('id', changeEventId)
      .is('deleted_at', null)
      .single();

    if (eventError || !changeEvent) {
      return NextResponse.json(
        { error: 'Change event not found' },
        { status: 404 }
      );
    }

    // Get attachment
    const { data: attachment, error } = await supabase
      .from('change_event_attachments')
      .select(`
        *,
        uploader:users(id, email)
      `)
      .eq('change_event_id', changeEventId)
      .eq('id', attachmentId)
      .single();

    if (error || !attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('project-files')
      .getPublicUrl(attachment.file_path);

    // Format response
    const response = {
      id: attachment.id,
      changeEventId: attachment.change_event_id,
      fileName: attachment.file_name,
      filePath: attachment.file_path,
      fileSize: attachment.file_size_bytes,
      mimeType: attachment.mime_type,
      uploadedBy: attachment.uploader,
      uploadedAt: attachment.uploaded_at,
      publicUrl,
      downloadUrl: `/api/projects/${projectId}/change-events/${changeEventId}/attachments/${attachmentId}/download`,
      _links: {
        self: `/api/projects/${projectId}/change-events/${changeEventId}/attachments/${attachmentId}`,
        download: `/api/projects/${projectId}/change-events/${changeEventId}/attachments/${attachmentId}/download`,
        changeEvent: `/api/projects/${projectId}/change-events/${changeEventId}`,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/change-events/[changeEventId]/attachments/[attachmentId]
 * Deletes a single attachment
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectId, changeEventId, attachmentId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify change event exists
    const { data: changeEvent, error: eventError } = await supabase
      .from('change_events')
      .select('id')
      .eq('project_id', parseInt(projectId, 10))
      .eq('id', changeEventId)
      .is('deleted_at', null)
      .single();

    if (eventError || !changeEvent) {
      return NextResponse.json(
        { error: 'Change event not found' },
        { status: 404 }
      );
    }

    // Get attachment details before deletion
    const { data: attachment, error: fetchError } = await supabase
      .from('change_event_attachments')
      .select('file_path, file_name')
      .eq('change_event_id', changeEventId)
      .eq('id', attachmentId)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('project-files')
      .remove([attachment.file_path]);

    if (storageError) {
      }

    // Delete database record
    const { error: deleteError } = await supabase
      .from('change_event_attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete attachment', details: deleteError.message },
        { status: 400 }
      );
    }

    // Update change event modification timestamp
    await supabase
      .from('change_events')
      .update({
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', changeEventId);

    // Create audit log entry
    await supabase.from('change_event_history').insert({
      change_event_id: changeEventId,
      field_name: 'attachment_removed',
      old_value: attachment.file_name,
      changed_by: user.id,
      change_type: 'UPDATE',
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
