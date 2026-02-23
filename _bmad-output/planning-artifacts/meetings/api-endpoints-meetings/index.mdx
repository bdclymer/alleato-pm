---
title: API_ENDPOINTS Meetings
description: API_ENDPOINTS Meetings documentation
---

# Meetings API Endpoints Specification

## Endpoint Overview

### Meeting CRUD Operations

- `GET /api/projects/[projectId]/meetings` - List project meetings
- `POST /api/projects/[projectId]/meetings` - Create new meeting
- `GET /api/projects/[projectId]/meetings/[meetingId]` - Get meeting details
- `PUT /api/projects/[projectId]/meetings/[meetingId]` - Update meeting
- `DELETE /api/projects/[projectId]/meetings/[meetingId]` - Delete meeting

### Meeting Content & Analysis

- `GET /api/projects/[projectId]/meetings/[meetingId]/segments` - Get meeting segments
- `POST /api/projects/[projectId]/meetings/[meetingId]/segments` - Create segment
- `GET /api/projects/[projectId]/meetings/[meetingId]/chunks` - Get meeting chunks
- `POST /api/projects/[projectId]/meetings/[meetingId]/transcript` - Upload transcript

### Meeting Management

- `GET /api/projects/[projectId]/meetings/templates` - List meeting templates
- `POST /api/projects/[projectId]/meetings/templates` - Create template
- `GET /api/projects/[projectId]/meetings/categories` - List categories
- `POST /api/projects/[projectId]/meetings/distribution` - Send meeting notifications

### Search & Analytics

- `GET /api/projects/[projectId]/meetings/search` - Search meetings
- `GET /api/projects/[projectId]/meetings/analytics` - Meeting analytics
- `POST /api/projects/[projectId]/meetings/semantic-search` - Semantic search

## Detailed Specifications

### 1. List Project Meetings

**Method**: GET
**URL**: `/api/projects/[projectId]/meetings`
**Purpose**: Retrieve paginated list of meetings for a project

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 20, max: 100) |
| status | string | No | Filter by status (pending, complete, etc.) |
| type | string | No | Filter by meeting type |
| date_from | string | No | Filter meetings after date (ISO 8601) |
| date_to | string | No | Filter meetings before date (ISO 8601) |
| search | string | No | Text search in title and summary |
| participant | string | No | Filter by participant name |
| sort | string | No | Sort field (date, title, duration) |
| order | string | No | Sort order (asc, desc) |

#### Request Example

```bash
GET /api/projects/123/meetings?page=1&limit=10&status=complete&sort=date&order=desc
Authorization: Bearer <token>
```markdown
#### Response
```json
{
  "meetings": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Weekly Project Standup",
      "summary": "Weekly status update and planning meeting",
      "date": "2024-01-15T10:00:00Z",
      "duration_minutes": 60,
      "participants": "John Doe, Jane Smith, Mike Johnson",
      "status": "complete",
      "access_level": "public",
      "project_id": 123,
      "metadata": {
        "meeting_type": "standup",
        "location": "Conference Room A",
        "agenda_items_count": 5
      },
      "created_at": "2024-01-14T15:30:00Z",
      "updated_at": "2024-01-15T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  },
  "filters": {
    "status": "complete",
    "sort": "date",
    "order": "desc"
  }
}
```markdown
### 2. Create New Meeting

**Method**: POST
**URL**: `/api/projects/[projectId]/meetings`
**Purpose**: Create a new meeting record

#### Request Body

```json
{
  "title": "Project Kickoff Meeting",
  "summary": "Initial project planning and team introduction",
  "date": "2024-02-01T09:00:00Z",
  "duration_minutes": 120,
  "participants": ["john@company.com", "jane@company.com"],
  "meeting_type": "kickoff",
  "location": "Conference Room B",
  "access_level": "public",
  "agenda_items": [
    {
      "title": "Introductions",
      "description": "Team member introductions",
      "duration_minutes": 15,
      "type": "discussion"
    },
    {
      "title": "Project Overview",
      "description": "Present project scope and timeline",
      "duration_minutes": 30,
      "type": "presentation"
    }
  ],
  "template_id": "template-123",
  "recurring": false,
  "metadata": {
    "room_booking_id": "room-456",
    "external_calendar_id": "cal-789"
  }
}
```markdown
#### Response
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "Project Kickoff Meeting",
  "summary": "Initial project planning and team introduction",
  "date": "2024-02-01T09:00:00Z",
  "duration_minutes": 120,
  "participants": "john@company.com, jane@company.com",
  "status": "pending",
  "access_level": "public",
  "project_id": 123,
  "agenda_items_count": 2,
  "created_at": "2024-01-20T14:30:00Z",
  "updated_at": "2024-01-20T14:30:00Z"
}
```

### 3. Get Meeting Details

**Method**: GET
**URL**: `/api/projects/[projectId]/meetings/[meetingId]`
**Purpose**: Retrieve complete meeting information including segments

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| include_segments | boolean | No | Include meeting segments (default: false) |
| include_chunks | boolean | No | Include meeting chunks (default: false) |
| include_analytics | boolean | No | Include meeting analytics (default: false) |

#### Response

```json
{
  "meeting": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Weekly Project Standup",
    "summary": "Weekly status update and planning meeting",
    "date": "2024-01-15T10:00:00Z",
    "duration_minutes": 60,
    "participants": "John Doe, Jane Smith, Mike Johnson",
    "status": "complete",
    "access_level": "public",
    "project_id": 123,
    "file_path": "/uploads/meetings/meeting-123.mp4",
    "metadata": {
      "meeting_type": "standup",
      "location": "Conference Room A",
      "recording_url": "https://zoom.us/rec/123",
      "external_links": ["https://calendar.google.com/event/123"]
    },
    "created_at": "2024-01-14T15:30:00Z",
    "updated_at": "2024-01-15T11:00:00Z"
  },
  "segments": [
    {
      "id": "seg-123",
      "title": "Project Status Review",
      "content": "Discussed current project status and upcoming milestones...",
      "segment_type": "discussion",
      "start_time": 300,
      "end_time": 900,
      "decisions": [
        {
          "decision": "Move deadline to next Friday",
          "rationale": "Need more time for testing",
          "impact": "Low risk, 1 week delay"
        }
      ],
      "action_items": [
        {
          "item": "Update project timeline",
          "assigned_to": "John Doe",
          "due_date": "2024-01-17T17:00:00Z"
        }
      ]
    }
  ],
  "analytics": {
    "total_segments": 5,
    "decisions_count": 3,
    "action_items_count": 7,
    "participation_score": 0.85
  }
}
```markdown
### 4. Update Meeting
**Method**: PUT
**URL**: `/api/projects/[projectId]/meetings/[meetingId]`
**Purpose**: Update existing meeting information

#### Request Body
```json
{
  "title": "Updated Meeting Title",
  "summary": "Updated meeting summary",
  "date": "2024-01-15T14:00:00Z",
  "duration_minutes": 90,
  "status": "complete",
  "participants": "John Doe, Jane Smith, Mike Johnson, Sarah Wilson",
  "metadata": {
    "meeting_type": "standup",
    "location": "Conference Room B",
    "notes": "Meeting moved to larger room"
  }
}
```markdown
### 5. Delete Meeting

**Method**: DELETE
**URL**: `/api/projects/[projectId]/meetings/[meetingId]`
**Purpose**: Delete a meeting and its associated data

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| permanent | boolean | No | Permanently delete vs soft delete (default: false) |

#### Response

```json
{
  "message": "Meeting deleted successfully",
  "deleted_at": "2024-01-20T15:30:00Z",
  "permanent": false
}
```markdown
### 6. Meeting Segments
**Method**: GET
**URL**: `/api/projects/[projectId]/meetings/[meetingId]/segments`
**Purpose**: Get meeting segments with decisions and action items

#### Response
```json
{
  "segments": [
    {
      "id": "seg-123",
      "title": "Budget Review",
      "content": "Reviewed current budget status and upcoming expenses...",
      "segment_type": "discussion",
      "start_time": 0,
      "end_time": 600,
      "participants": ["John Doe", "Jane Smith"],
      "decisions": [
        {
          "decision": "Approve additional budget for equipment",
          "amount": 5000,
          "rationale": "Critical for project completion"
        }
      ],
      "action_items": [
        {
          "item": "Submit purchase orders",
          "assigned_to": "Jane Smith",
          "due_date": "2024-01-20T17:00:00Z",
          "priority": "high"
        }
      ],
      "confidence_score": 0.92
    }
  ],
  "summary": {
    "total_segments": 5,
    "total_decisions": 3,
    "total_action_items": 8,
    "meeting_duration": 3600
  }
}
```

### 7. Search Meetings

**Method**: GET
**URL**: `/api/projects/[projectId]/meetings/search`
**Purpose**: Search meetings by text or semantic similarity

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query |
| type | string | No | Search type (text, semantic) |
| limit | number | No | Max results (default: 20) |
| threshold | number | No | Similarity threshold for semantic search |

#### Response

```json
{
  "results": [
    {
      "meeting_id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Weekly Project Standup",
      "date": "2024-01-15T10:00:00Z",
      "match_type": "title",
      "similarity": 0.95,
      "excerpt": "...discussed budget constraints and timeline adjustments..."
    }
  ],
  "search_meta": {
    "query": "budget timeline",
    "type": "semantic",
    "total_results": 12,
    "search_time_ms": 45
  }
}
```markdown
### 8. Meeting Analytics
**Method**: GET
**URL**: `/api/projects/[projectId]/meetings/analytics`
**Purpose**: Get meeting statistics and insights for the project

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| period | string | No | Analysis period (week, month, quarter, year) |
| start_date | string | No | Start date for custom period |
| end_date | string | No | End date for custom period |

#### Response
```json
{
  "summary": {
    "total_meetings": 45,
    "meetings_this_week": 3,
    "meetings_this_month": 12,
    "avg_duration_minutes": 67,
    "total_participants": 23,
    "total_decisions": 156,
    "total_action_items": 312
  },
  "trends": {
    "meeting_frequency": [
      {"date": "2024-01-01", "count": 3},
      {"date": "2024-01-08", "count": 4},
      {"date": "2024-01-15", "count": 2}
    ],
    "avg_duration_trend": [
      {"date": "2024-01-01", "duration": 65},
      {"date": "2024-01-08", "duration": 58},
      {"date": "2024-01-15", "duration": 72}
    ]
  },
  "top_participants": [
    {"name": "John Doe", "meeting_count": 23, "participation_score": 0.87},
    {"name": "Jane Smith", "meeting_count": 19, "participation_score": 0.92}
  ],
  "meeting_types": [
    {"type": "standup", "count": 15, "avg_duration": 45},
    {"type": "planning", "count": 8, "avg_duration": 90}
  ]
}
```typescript
## Authentication Requirements

### Authorization Headers

All endpoints require authentication via Bearer token:

```typescript
Authorization: Bearer <jwt_token>
```

### Permission Levels

- **Viewer**: Can view meetings they have access to
- **Editor**: Can create and edit meetings
- **Admin**: Can manage templates and categories
- **Owner**: Full access to all meeting functionality

### Row Level Security

Database-level security ensures users can only access meetings for projects they're members of.

## Rate Limiting

### Standard Endpoints

- **Read operations**: 100 requests/minute
- **Write operations**: 60 requests/minute
- **Search operations**: 30 requests/minute

### Bulk Operations

- **Meeting creation**: 10 requests/minute
- **File uploads**: 5 requests/minute

## Error Codes and Handling

### Standard HTTP Status Codes

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (duplicate)
- `422 Unprocessable Entity` - Validation error
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Meeting title is required",
    "details": {
      "field": "title",
      "rule": "required"
    }
  },
  "request_id": "req-123456789"
}
```typescript
### Common Error Codes
- `VALIDATION_ERROR` - Request validation failed
- `MEETING_NOT_FOUND` - Meeting does not exist
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `PROJECT_ACCESS_DENIED` - User not member of project
- `DUPLICATE_MEETING` - Meeting already exists for time slot
- `INVALID_DATE_RANGE` - Date parameters are invalid
- `FILE_TOO_LARGE` - Uploaded file exceeds size limit

## Example Requests/Responses

### Complete Meeting Creation Flow
```javascript
// 1. Create meeting
const meetingResponse = await fetch('/api/projects/123/meetings', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Project Planning Meeting',
    date: '2024-02-01T09:00:00Z',
    duration_minutes: 120,
    participants: ['john@company.com', 'jane@company.com']
  })
});

const meeting = await meetingResponse.json();

// 2. Upload meeting transcript
const transcriptResponse = await fetch(`/api/projects/123/meetings/${meeting.id}/transcript`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    transcript: 'Meeting transcript content...',
    format: 'text'
  })
});

// 3. Get meeting with segments
const detailResponse = await fetch(`/api/projects/123/meetings/${meeting.id}?include_segments=true`, {
  headers: {
    'Authorization': 'Bearer <token>'
  }
});

const meetingDetails = await detailResponse.json();
```

This API specification provides comprehensive coverage of all meeting-related functionality with proper authentication, validation, and error handling patterns.
