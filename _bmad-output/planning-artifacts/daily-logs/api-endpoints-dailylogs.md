---
title: API_ENDPOINTS DailyLogs
description: API_ENDPOINTS DailyLogs documentation
---

# Daily Logs API Endpoints Specification

## Endpoint Overview

Complete REST API for Daily Logs functionality supporting 13 distinct log types with comprehensive CRUD operations, bulk actions, and reporting capabilities.

### Base URL Pattern

```text
/api/projects/{projectId}/daily-logs
```typescript
### Endpoint Categories

1. **Core Daily Logs** - Main daily log entries
2. **Weather Logs** - Weather observations and delays
3. **Manpower Logs** - Labor tracking ✅ PARTIAL
4. **Equipment Logs** - Equipment usage ✅ PARTIAL
5. **Visitor Logs** - Site visitor tracking
6. **Delivery Logs** - Material delivery tracking
7. **Safety Logs** - Safety incidents and notices
8. **Inspection Logs** - Daily inspections
9. **Notes Logs** - General notes ✅ PARTIAL
10. **Waste Logs** - Waste disposal tracking
11. **Productivity Logs** - Work progress metrics
12. **Delay Logs** - Work delay documentation
13. **Attachment Logs** - Photo and file management
14. **Export/Import** - Data exchange operations
15. **Reports** - Analytics and summaries

## Detailed Specifications

### 1. Core Daily Logs

#### Get Daily Logs List

**Method**: GET
**URL**: `/api/projects/{projectId}/daily-logs`
**Purpose**: Retrieve paginated list of daily logs

**Query Parameters**:

```typescript
interface QueryParams {
  page?: number;           // Page number (default: 1)
  limit?: number;          // Items per page (default: 10, max: 100)
  startDate?: string;      // ISO date string
  endDate?: string;        // ISO date string
  createdBy?: string;      // User ID filter
  hasWeatherDelay?: boolean; // Filter by weather delays
  orderBy?: 'log_date' | 'created_at';
  order?: 'asc' | 'desc';
}
```typescript
**Response**:
```typescript
interface DailyLogsResponse {
  data: DailyLog[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface DailyLog {
  id: string;
  project_id: number;
  log_date: string;
  created_by: string;
  updated_by: string | null;
  general_notes: string | null;
  shift_info: object | null;
  created_at: string;
  updated_at: string;

  // Summary counts
  manpower_entries: number;
  equipment_entries: number;
  visitor_entries: number;
  safety_entries: number;
  weather_delays: boolean;
}
```

#### Get Daily Log by ID

**Method**: GET
**URL**: `/api/projects/{projectId}/daily-logs/{logId}`
**Purpose**: Get detailed daily log with all sections

**Response**:

```typescript
interface DailyLogDetail extends DailyLog {
  weather_entries: WeatherEntry[];
  manpower_entries: ManpowerEntry[];
  equipment_entries: EquipmentEntry[];
  visitor_entries: VisitorEntry[];
  delivery_entries: DeliveryEntry[];
  safety_entries: SafetyEntry[];
  inspection_entries: InspectionEntry[];
  note_entries: NoteEntry[];
  waste_entries: WasteEntry[];
  productivity_entries: ProductivityEntry[];
  delay_entries: DelayEntry[];
  attachments: AttachmentEntry[];
}
```typescript
#### Get Daily Log by Date
**Method**: GET
**URL**: `/api/projects/{projectId}/daily-logs/date/{date}`
**Purpose**: Get daily log for specific date (YYYY-MM-DD)

**Response**: Same as Get Daily Log by ID

#### Create Daily Log
**Method**: POST
**URL**: `/api/projects/{projectId}/daily-logs`
**Purpose**: Create new daily log entry

**Request Body**:
```typescript
interface CreateDailyLogRequest {
  log_date: string;        // YYYY-MM-DD format
  general_notes?: string;
  shift_info?: {
    start_time?: string;
    end_time?: string;
    break_duration?: number;
  };
}
```sql
**Response**:

```typescript
interface CreateDailyLogResponse {
  data: DailyLog;
  message: string;
}
```sql
#### Update Daily Log
**Method**: PUT
**URL**: `/api/projects/{projectId}/daily-logs/{logId}`
**Purpose**: Update daily log general information

**Request Body**: Same as Create Daily Log Request

**Response**: Same as Create Daily Log Response

#### Delete Daily Log
**Method**: DELETE
**URL**: `/api/projects/{projectId}/daily-logs/{logId}`
**Purpose**: Delete daily log and all associated entries

**Response**:
```typescript
interface DeleteResponse {
  success: boolean;
  message: string;
}
```

### 2. Weather Endpoints

#### Get Weather Entries

**Method**: GET
**URL**: `/api/projects/{projectId}/daily-logs/{logId}/weather`
**Purpose**: Get all weather observations for a daily log

**Response**:

```typescript
interface WeatherEntriesResponse {
  data: WeatherEntry[];
}

interface WeatherEntry {
  id: string;
  daily_log_id: string;
  time_observed: string;
  delay: boolean;
  sky_condition: string;
  temperature_high: number;
  temperature_low: number;
  temperature_unit: 'F' | 'C';
  precipitation_type: string;
  precipitation_amount: number;
  wind_speed: number;
  wind_direction: string;
  humidity_percent: number;
  weather_delay_hours: number;
  comments: string;
  created_at: string;
}
```typescript
#### Create Weather Entry
**Method**: POST
**URL**: `/api/projects/{projectId}/daily-logs/{logId}/weather`
**Purpose**: Add weather observation

**Request Body**:
```typescript
interface CreateWeatherRequest {
  time_observed: string;     // HH:MM format
  sky_condition: string;
  temperature_high?: number;
  temperature_low?: number;
  precipitation_type?: string;
  precipitation_amount?: number;
  wind_speed?: number;
  wind_direction?: string;
  humidity_percent?: number;
  delay?: boolean;
  weather_delay_hours?: number;
  comments?: string;
}
```sql
#### Update Weather Entry

**Method**: PUT
**URL**: `/api/projects/{projectId}/daily-logs/{logId}/weather/{weatherId}`

#### Delete Weather Entry

**Method**: DELETE
**URL**: `/api/projects/{projectId}/daily-logs/{logId}/weather/{weatherId}`

### 3. Manpower Endpoints ✅ PARTIAL IMPLEMENTATION

#### Get Manpower Entries

**Method**: GET
**URL**: `/api/projects/{projectId}/daily-logs/{logId}/manpower`

**Response**:

```typescript
interface ManpowerEntry {
  id: string;
  daily_log_id: string;
  company_id: string | null;
  trade: string;
  workers_count: number;
  hours_worked: number;
  overtime_hours: number;
  supervisor_id: string | null;
  location: string;
  cost_code: string;
  shift_start: string;
  shift_end: string;
  comments: string;
  created_at: string;

  // Populated relations
  company?: {
    id: string;
    name: string;
  };
  supervisor?: {
    id: string;
    full_name: string;
  };
}
```typescript
#### Create Manpower Entry ✅ IMPLEMENTED
**Method**: POST
**URL**: `/api/projects/{projectId}/daily-logs/{logId}/manpower`

**Existing Implementation**: `/frontend/src/app/(other)/actions/daily-log-actions.ts`
- Function: `createDailyLogManpower()`

**Request Body**:
```typescript
interface CreateManpowerRequest {
  company_id?: string;
  trade: string;
  workers_count: number;
  hours_worked: number;
  overtime_hours?: number;
  supervisor_id?: string;
  location?: string;
  cost_code?: string;
  shift_start?: string;
  shift_end?: string;
  comments?: string;
}
```

### 4. Equipment Endpoints ✅ PARTIAL IMPLEMENTATION

#### Create Equipment Entry ✅ IMPLEMENTED

**Method**: POST
**URL**: `/api/projects/{projectId}/daily-logs/{logId}/equipment`

**Existing Implementation**: `/frontend/src/app/(other)/actions/daily-log-actions.ts`

- Function: `createDailyLogEquipment()`

**Request Body**:

```typescript
interface CreateEquipmentRequest {
  equipment_name: string;
  equipment_id?: string;
  operator_id?: string;
  hours_operated?: number;
  hours_idle?: number;
  fuel_consumed?: number;
  location?: string;
  equipment_condition: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Out of Service';
  maintenance_performed?: boolean;
  notes?: string;
}
```typescript
### 5. Visitor Endpoints

#### Get Visitor Entries
**Method**: GET
**URL**: `/api/projects/{projectId}/daily-logs/{logId}/visitors`

#### Create Visitor Entry
**Method**: POST
**URL**: `/api/projects/{projectId}/daily-logs/{logId}/visitors`

**Request Body**:
```typescript
interface CreateVisitorRequest {
  visitor_name: string;
  company_name?: string;
  company_id?: string;
  contact_phone?: string;
  contact_email?: string;
  badge_number?: string;
  purpose_of_visit: string;
  areas_visited?: string;
  escort_required?: boolean;
  escort_id?: string;
  check_in_time: string;    // ISO timestamp
  check_out_time?: string;  // ISO timestamp
  safety_briefing_completed?: boolean;
  ppe_provided?: boolean;
  comments?: string;
}
```typescript
#### Check Out Visitor

**Method**: PATCH
**URL**: `/api/projects/{projectId}/daily-logs/{logId}/visitors/{visitorId}/checkout`

**Request Body**:

```typescript
interface CheckOutVisitorRequest {
  check_out_time: string;   // ISO timestamp
  comments?: string;
}
```typescript
### 6. Safety Endpoints

#### Get Safety Entries
**Method**: GET
**URL**: `/api/projects/{projectId}/daily-logs/{logId}/safety`

#### Create Safety Entry
**Method**: POST
**URL**: `/api/projects/{projectId}/daily-logs/{logId}/safety`

**Request Body**:
```typescript
interface CreateSafetyRequest {
  incident_type: string;
  severity_level: 'Low' | 'Medium' | 'High' | 'Critical';
  incident_time: string;    // ISO timestamp
  location: string;
  people_involved?: string;
  companies_involved?: string;
  description: string;
  immediate_actions?: string;
  root_cause?: string;
  corrective_actions?: string;
  safety_notice_issued?: boolean;
  notice_issued_to?: string;
  compliance_due_date?: string;
  investigation_required?: boolean;
  reportable_to_authorities?: boolean;
}
```

### 7. Productivity Endpoints

#### Get Productivity Entries

**Method**: GET
**URL**: `/api/projects/{projectId}/daily-logs/{logId}/productivity`

#### Create Productivity Entry

**Method**: POST
**URL**: `/api/projects/{projectId}/daily-logs/{logId}/productivity`

**Request Body**:

```typescript
interface CreateProductivityRequest {
  activity_name: string;
  resource_type: 'Labor' | 'Equipment' | 'Material';
  resource_name: string;
  planned_units?: number;
  actual_units?: number;
  unit_of_measure: string;
  crew_size?: number;
  hours_worked?: number;
  quality_rating?: 'Excellent' | 'Good' | 'Acceptable' | 'Poor';
  rework_required?: boolean;
  rework_percentage?: number;
  obstacles_encountered?: string;
  weather_impact?: boolean;
  comments?: string;
}
```typescript
### 8. Attachment Endpoints

#### Get Attachments
**Method**: GET
**URL**: `/api/projects/{projectId}/daily-logs/{logId}/attachments`

**Query Parameters**:
```typescript
interface AttachmentQueryParams {
  section_type?: string;     // Filter by section
  is_photo?: boolean;        // Photos only
  tags?: string[];           // Filter by tags
}
```sql
#### Upload Attachments

**Method**: POST
**URL**: `/api/projects/{projectId}/daily-logs/{logId}/attachments`
**Content-Type**: multipart/form-data

**Form Data**:

```typescript
interface UploadAttachmentRequest {
  files: File[];             // Multiple files
  section_type: string;      // weather, manpower, etc.
  section_item_id?: string;  // Specific entry ID
  description?: string;
  tags?: string[];
  photo_location?: string;
  photo_timestamp?: string;
}
```sql
#### Delete Attachment
**Method**: DELETE
**URL**: `/api/projects/{projectId}/daily-logs/{logId}/attachments/{attachmentId}`

### 9. Export Endpoints

#### Export Daily Log to PDF
**Method**: GET
**URL**: `/api/projects/{projectId}/daily-logs/{logId}/export/pdf`

**Query Parameters**:
```typescript
interface ExportPDFParams {
  sections?: string[];       // Specific sections to include
  include_photos?: boolean;  // Include photo attachments
  template?: 'standard' | 'detailed' | 'summary';
}
```

**Response**: PDF file download

#### Export Daily Logs to Excel

**Method**: GET
**URL**: `/api/projects/{projectId}/daily-logs/export/excel`

**Query Parameters**:

```typescript
interface ExportExcelParams {
  start_date: string;        // YYYY-MM-DD
  end_date: string;          // YYYY-MM-DD
  sections?: string[];       // Sections to include
  format?: 'xlsx' | 'csv';
}
```typescript
**Response**: Excel/CSV file download

#### Bulk Import Daily Logs
**Method**: POST
**URL**: `/api/projects/{projectId}/daily-logs/import`
**Content-Type**: multipart/form-data

**Form Data**:
```typescript
interface ImportRequest {
  file: File;                // Excel or CSV file
  sheet_name?: string;       // Excel sheet name
  skip_rows?: number;        // Rows to skip
  mapping?: object;          // Column mapping
  dry_run?: boolean;         // Validate only
}
```typescript
**Response**:

```typescript
interface ImportResponse {
  success: boolean;
  imported_count: number;
  error_count: number;
  errors: {
    row: number;
    message: string;
  }[];
  preview?: DailyLog[];      // If dry_run=true
}
```typescript
### 10. Calendar/Dashboard Endpoints

#### Get Calendar Data
**Method**: GET
**URL**: `/api/projects/{projectId}/daily-logs/calendar`

**Query Parameters**:
```typescript
interface CalendarParams {
  year: number;
  month: number;             // 1-12
  view?: 'month' | 'week' | 'day';
}
```

**Response**:

```typescript
interface CalendarResponse {
  data: {
    [date: string]: {       // YYYY-MM-DD
      log_id: string | null;
      has_entries: boolean;
      weather_delay: boolean;
      safety_incidents: number;
      total_workers: number;
      total_hours: number;
    }
  };
}
```typescript
#### Get Dashboard Metrics
**Method**: GET
**URL**: `/api/projects/{projectId}/daily-logs/dashboard`

**Query Parameters**:
```typescript
interface DashboardParams {
  period: 'week' | 'month' | 'quarter' | 'year';
  end_date?: string;         // Default: today
}
```typescript
**Response**:

```typescript
interface DashboardResponse {
  period_summary: {
    total_logs: number;
    weather_delays: number;
    safety_incidents: number;
    total_worker_hours: number;
    equipment_hours: number;
    visitor_count: number;
  };
  trends: {
    daily_workers: { date: string; count: number; }[];
    weather_delays: { date: string; hours: number; }[];
    productivity: { date: string; efficiency: number; }[];
  };
  recent_safety: SafetyEntry[];
  upcoming_inspections: InspectionEntry[];
}
```typescript
### 11. Search Endpoints

#### Search Daily Logs
**Method**: GET
**URL**: `/api/projects/{projectId}/daily-logs/search`

**Query Parameters**:
```typescript
interface SearchParams {
  q: string;                 // Search query
  section?: string;          // Section to search
  start_date?: string;
  end_date?: string;
  limit?: number;
}
```

**Response**:

```typescript
interface SearchResponse {
  data: {
    log_id: string;
    log_date: string;
    section_type: string;
    section_id: string;
    snippet: string;
    match_score: number;
  }[];
  total: number;
}
```markdown
## Authentication & Authorization

### Authentication Requirements
All endpoints require valid JWT token in Authorization header:
```text
Authorization: Bearer <jwt-token>

```markdown
### Permission Levels
```typescript
enum DailyLogPermissions {
  VIEW = 'daily_logs:view',
  CREATE = 'daily_logs:create',
  EDIT = 'daily_logs:edit',
  DELETE = 'daily_logs:delete',
  EXPORT = 'daily_logs:export',
  MANAGE_SAFETY = 'daily_logs:manage_safety'
}
```

### Row Level Security (RLS)

- Users can only access logs for projects they have access to
- Safety incidents may require special permissions
- Audit trail maintained for all modifications

## Error Codes & Handling

### Standard HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `422` - Unprocessable Entity (business logic errors)
- `500` - Internal Server Error

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;            // Machine-readable error code
    message: string;         // Human-readable message
    details?: object;        // Additional error details
    validation_errors?: {
      field: string;
      message: string;
    }[];
  };
  request_id: string;        // For debugging
}
```markdown
### Common Error Codes
```typescript
enum DailyLogErrorCodes {
  DAILY_LOG_NOT_FOUND = 'DAILY_LOG_NOT_FOUND',
  DUPLICATE_LOG_DATE = 'DUPLICATE_LOG_DATE',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  FUTURE_DATE_NOT_ALLOWED = 'FUTURE_DATE_NOT_ALLOWED',
  WEATHER_ENTRY_NOT_FOUND = 'WEATHER_ENTRY_NOT_FOUND',
  INVALID_TEMPERATURE_RANGE = 'INVALID_TEMPERATURE_RANGE',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  EXPORT_GENERATION_FAILED = 'EXPORT_GENERATION_FAILED'
}
```yaml
## Rate Limiting

### Rate Limit Rules

- General endpoints: 100 requests/minute per user
- File upload endpoints: 10 requests/minute per user
- Export endpoints: 5 requests/minute per user
- Bulk operations: 2 requests/minute per user

### Rate Limit Headers

```yaml
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Example Requests & Responses

### Create Daily Log with Weather

```bash
# Create daily log
curl -X POST \
  /api/projects/123/daily-logs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "log_date": "2024-01-15",
    "general_notes": "Good progress on foundation work",
    "shift_info": {
      "start_time": "07:00",
      "end_time": "17:00"
    }
  }'

# Response
{
  "data": {
    "id": "log-uuid-123",
    "project_id": 123,
    "log_date": "2024-01-15",
    "created_by": "user-uuid-456",
    "general_notes": "Good progress on foundation work",
    "shift_info": {
      "start_time": "07:00",
      "end_time": "17:00"
    },
    "created_at": "2024-01-15T08:00:00Z",
    "updated_at": "2024-01-15T08:00:00Z"
  },
  "message": "Daily log created successfully"
}

# Add weather entry
curl -X POST \
  /api/projects/123/daily-logs/log-uuid-123/weather \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "time_observed": "08:00",
    "sky_condition": "Clear",
    "temperature_high": 75,
    "temperature_low": 45,
    "delay": false,
    "comments": "Perfect weather for concrete pour"
  }'
```typescript
## File Upload Examples

### Photo Upload
```bash
curl -X POST \
  /api/projects/123/daily-logs/log-uuid-123/attachments \
  -H "Authorization: Bearer <token>" \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg" \
  -F "section_type=weather" \
  -F "description=Morning site conditions" \
  -F "tags=progress,foundation" \
  -F "photo_location=Building A - East Side"
```typescript
### Bulk Import

```bash
curl -X POST \
  /api/projects/123/daily-logs/import \
  -H "Authorization: Bearer <token>" \
  -F "file=@daily-logs-import.xlsx" \
  -F "sheet_name=Daily Logs" \
  -F "skip_rows=1" \
  -F "dry_run=true"
```
