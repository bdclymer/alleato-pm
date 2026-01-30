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
 * GET /api/projects/[id]/change-events/[changeEventId]/attachments/[attachmentId]/download
 * Downloads an attachment file from Supabase Storage
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectId, changeEventId, attachmentId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify change event exists and belongs to project
    const { data: changeEvent, error: eventError } = await supabase
      .from('change_events')
      .select('id')
      .eq('project_id', parseInt(projectId, 10))
      .eq('id', parseInt(changeEventId, 10))
      .is('deleted_at', null)
      .single();

    if (eventError || !changeEvent) {
      return NextResponse.json(
        { error: 'Change event not found' },
        { status: 404 }
      );
    }

    // Get attachment metadata
    const { data: attachment, error: fetchError } = await supabase
      .from('change_event_attachments')
      .select('file_path, file_name, mime_type')
      .eq('change_event_id', parseInt(changeEventId, 10))
      .eq('id', parseInt(attachmentId, 10))
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('project-files')
      .download(attachment.file_path);

    if (downloadError || !fileData) {
      return NextResponse.json(
        {
          error: 'Failed to download file',
          details: downloadError?.message
        },
        { status: 404 }
      );
    }

    // Convert blob to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Set appropriate headers for file download
    const headers = new Headers();
    headers.set('Content-Type', attachment.mime_type || 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
    headers.set('Content-Length', buffer.length.toString());

    return new NextResponse(buffer, { headers });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
