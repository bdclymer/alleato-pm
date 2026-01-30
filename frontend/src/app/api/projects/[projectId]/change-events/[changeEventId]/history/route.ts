import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{
    projectId: string;
    changeEventId: string;
  }>;
}

/**
 * GET /api/projects/[id]/change-events/[changeEventId]/history
 * Returns the audit history for a change event
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectId, changeEventId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);

    // Verify change event exists
    const { data: changeEvent, error: eventError } = await supabase
      .from('change_events')
      .select('id')
      .eq('project_id', parseInt(projectId, 10))
      .eq('id', parseInt(changeEventId, 10))
      .single();

    if (eventError || !changeEvent) {
      return NextResponse.json(
        { error: 'Change event not found' },
        { status: 404 }
      );
    }

    // Parse query params
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Get history entries with user details
    const { data: historyEntries, error, count } = await supabase
      .from('change_event_history')
      .select(
        `
        *,
        user:users(id, email)
        `,
        { count: 'exact' }
      )
      .eq('change_event_id', parseInt(changeEventId, 10))
      .order('changed_at', { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch history', details: error.message },
        { status: 400 }
      );
    }

    // Format history entries
    const formattedHistory = (historyEntries || []).map(entry => ({
      id: entry.id,
      changeEventId: entry.change_event_id,
      action: entry.change_type,
      fieldName: formatFieldName(entry.field_name),
      oldValue: formatFieldValue(entry.field_name, entry.old_value),
      newValue: formatFieldValue(entry.field_name, entry.new_value),
      changedBy: entry.user,
      changedAt: entry.changed_at,
      description: generateChangeDescription(entry),
    }));

    // Calculate pagination
    const totalPages = count ? Math.ceil(count / limit) : 0;

    return NextResponse.json({
      data: formattedHistory,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalRecords: count || 0,
        totalPages,
      },
      _links: {
        self: `/api/projects/${projectId}/change-events/${changeEventId}/history?page=${page}&limit=${limit}`,
        first: `/api/projects/${projectId}/change-events/${changeEventId}/history?page=1&limit=${limit}`,
        last: `/api/projects/${projectId}/change-events/${changeEventId}/history?page=${totalPages}&limit=${limit}`,
        changeEvent: `/api/projects/${projectId}/change-events/${changeEventId}`,
        ...(page > 1 && {
          prev: `/api/projects/${projectId}/change-events/${changeEventId}/history?page=${page - 1}&limit=${limit}`,
        }),
        ...(page < totalPages && {
          next: `/api/projects/${projectId}/change-events/${changeEventId}/history?page=${page + 1}&limit=${limit}`,
        }),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Format field names for display
 */
function formatFieldName(fieldName: string): string {
  const fieldNameMap: { [key: string]: string } = {
    'title': 'Title',
    'type': 'Type',
    'reason': 'Change Reason',
    'scope': 'Scope',
    'status': 'Status',
    'notes': 'Description',
    'deleted': 'Deleted',
    'line_item_added': 'Line Item Added',
    'line_item_removed': 'Line Item Removed',
    'line_item_updated': 'Line Item Updated',
    'attachment_added': 'Attachment Added',
    'attachment_removed': 'Attachment Removed',
    'expecting_revenue': 'Expecting Revenue',
    'line_item_revenue_source': 'Revenue Source',
  };

  return fieldNameMap[fieldName] || fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format field values for display
 */
function formatFieldValue(fieldName: string, value: string | null): string | null {
  if (value === null) return null;

  // Format specific field types
  switch (fieldName) {
    case 'type':
      return value.toUpperCase().replace(' ', '_');
    case 'scope':
      return value.toUpperCase().replace(' ', '_');
    case 'status':
      return value.toUpperCase();
    case 'expecting_revenue':
    case 'deleted':
      return value === 'true' ? 'Yes' : 'No';
    case 'line_item_revenue_source':
      return value.toUpperCase();
    default:
      return value;
  }
}

/**
 * Generate a human-readable description of the change
 */
function generateChangeDescription(entry: any): string {
  const { change_type, field_name, old_value, new_value } = entry;

  switch (change_type) {
    case 'CREATE':
      return 'Change event created';
    case 'UPDATE':
      switch (field_name) {
        case 'line_item_added':
          return `Added line item: "${new_value}"`;
        case 'line_item_removed':
          return `Removed line item: "${old_value}"`;
        case 'line_item_updated':
          return `Updated line item`;
        case 'attachment_added':
          return `Added attachment: "${new_value}"`;
        case 'attachment_removed':
          return `Removed attachment: "${old_value}"`;
        case 'deleted':
          return new_value === 'true' ? 'Change event deleted' : 'Change event restored';
        default:
          if (old_value && new_value) {
            return `Changed ${formatFieldName(field_name)} from "${formatFieldValue(field_name, old_value)}" to "${formatFieldValue(field_name, new_value)}"`;
          } else if (new_value) {
            return `Set ${formatFieldName(field_name)} to "${formatFieldValue(field_name, new_value)}"`;
          } else {
            return `Cleared ${formatFieldName(field_name)}`;
          }
      }
    case 'DELETE':
      return 'Change event deleted';
    case 'VOID':
      return 'Change event voided';
    case 'RECOVER':
      return 'Change event recovered from recycle bin';
    default:
      return `${change_type} - ${field_name}`;
  }
}
