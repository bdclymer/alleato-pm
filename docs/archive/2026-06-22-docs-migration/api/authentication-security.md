# Authentication & Security

## Overview

The Alleato PM API uses Supabase Auth for authentication and implements comprehensive security measures including Row Level Security (RLS), role-based access control, and project-level permissions.

## Authentication Methods

### Bearer Token Authentication

All API requests must include a valid Supabase access token in the Authorization header:

```http
Authorization: Bearer <supabase_access_token>
```
### Token-based vs Cookie-based Authentication

The API supports both authentication methods:

1. **Token-based** (recommended for API clients):
   ```http
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

1. **Cookie-based** (for web sessions):
   - Automatic session management via browser cookies
   - Used by the web application frontend

## Getting Access Tokens

### User Registration

Create a new user account:

```http
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "first_name": "John",
  "last_name": "Doe"
}
```
**Response:**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2024-01-31T10:00:00Z"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600
  }
}
```
### User Login

Using Supabase client library:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
)

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure_password'
})

// Use data.session.access_token for API requests
```

### Token Refresh

Access tokens expire after 1 hour. Use the refresh token to get new access tokens:

```javascript
const { data, error } = await supabase.auth.refreshSession({
  refresh_token: 'your_refresh_token'
})
```
## Authorization & Permissions

### Row Level Security (RLS)

All database tables use Supabase RLS policies to enforce data access control:

1. **User Identity**: Policies check `auth.uid()` to identify the current user
2. **Project Membership**: Users can only access projects they're members of
3. **Role-based Access**: Different access levels based on user roles
4. **Company Restrictions**: Users can only access data related to their company

### Permission System

#### User Profiles
Users have global profile settings:

```sql
-- user_profiles table
{
  "id": "uuid",
  "is_admin": false,
  "is_active": true,
  "created_at": "timestamp"
}
```
#### Project-Level Permissions

Users are granted project access through directory memberships:

```sql
-- project_directory_memberships table
{
  "id": "uuid",
  "project_id": "number",
  "person_id": "uuid",
  "status": "active|inactive|pending",
  "role": "admin|member|viewer",
  "permissions": "json"
}
```
#### Permission Templates

Standardized permission sets for different roles:

```sql
-- permission_templates table
{
  "id": "uuid",
  "name": "Project Manager",
  "permissions": {
    "budget": ["read", "write", "approve"],
    "directory": ["read", "write"],
    "change_events": ["read", "write", "approve"],
    "contracts": ["read", "write"]
  }
}
```

### Permission Checks

The API uses the `PermissionService` class for authorization:

```typescript
const permissionService = new PermissionService(supabase)

const hasPermission = await permissionService.hasPermission(
  userId,
  projectId,
  'budget', // resource
  'write'   // action
)

if (!hasPermission) {
  return NextResponse.json(
    { error: "Forbidden" },
    { status: 403 }
  )
}
```
## Security Patterns

### Input Validation

All API endpoints use Zod schemas for request validation:

```typescript
import { z } from 'zod'

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  job_number: z.string().min(1).max(100),
  budget: z.number().min(0).optional(),
  start_date: z.string().date().optional()
})

// In API route
const parsed = createProjectSchema.safeParse(body)
if (!parsed.success) {
  return NextResponse.json(
    { error: "Validation failed", details: parsed.error.flatten() },
    { status: 400 }
  )
}
```
### SQL Injection Prevention

Using Supabase client with parameterized queries:

```typescript
// ✅ Safe - parameterized query
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)
  .eq('status', status)

// ❌ Unsafe - never use raw SQL with user input
```
### File Upload Security

For file uploads and attachments:

1. **File Type Validation**: Only allowed file extensions
2. **Size Limits**: Maximum file sizes per type
3. **Virus Scanning**: All uploads are scanned
4. **Access Control**: Files respect same RLS policies

```typescript
// File upload validation
const allowedTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png']
const maxSize = 50 * 1024 * 1024 // 50MB

if (!allowedTypes.includes(fileExtension)) {
  throw new Error('File type not allowed')
}

if (fileSize > maxSize) {
  throw new Error('File too large')
}
```

## API Security Headers

All API responses include security headers:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```
## Rate Limiting

### Limits by User Type

- **Admin users**: 2000 requests/hour
- **Authenticated users**: 1000 requests/hour
- **Unauthenticated**: 100 requests/hour

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1643649600
X-RateLimit-Retry-After: 3600
```
### Rate Limit Responses

When rate limit is exceeded:

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 3600
}
```
## Common Security Patterns

### Authentication Middleware

Most API routes use this pattern:

```typescript
export async function GET(request: NextRequest, { params }) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check project access
  const hasAccess = await checkProjectAccess(user.id, projectId)
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Process request...
}
```

### Service Role Usage

For admin operations that bypass RLS:

```typescript
import { createServiceClient } from '@/lib/supabase/service'

// Only use service client when necessary
const supabase = createServiceClient()

// Example: Creating projects (needs to bypass RLS initially)
const { data, error } = await supabase
  .from('projects')
  .insert(projectData)
  .select()
  .single()
```
### Error Information Disclosure

Prevent sensitive information leakage:

```typescript
// ✅ Good - Generic error messages
return NextResponse.json(
  { error: "Access denied" },
  { status: 403 }
)

// ❌ Bad - Reveals system internals
return NextResponse.json(
  { error: "User john@example.com not found in users_auth table" },
  { status: 403 }
)
```
## Audit Logging

### Database Triggers

Automatic audit logging for sensitive operations:

```sql
-- Example: projects_audit table
{
  "id": "uuid",
  "table_name": "projects",
  "record_id": "123",
  "operation": "UPDATE",
  "old_values": "json",
  "new_values": "json",
  "user_id": "uuid",
  "timestamp": "timestamp"
}
```
### API Request Logging

Key operations are logged:

- Authentication attempts
- Permission denied events
- Data modifications
- File access
- Admin actions

## Security Monitoring

### Real-time Alerts

Monitor for:
- Multiple failed login attempts
- Unusual API usage patterns
- Permission escalation attempts
- Suspicious file access

### Security Metrics

Track:
- Authentication success/failure rates
- API response times by endpoint
- Rate limit violations
- Error rates by user

## Best Practices for API Clients

### Token Management

```javascript
class APIClient {
  constructor(supabase) {
    this.supabase = supabase
    this.accessToken = null
  }

  async request(url, options = {}) {
    // Ensure token is fresh
    await this.ensureValidToken()

    return fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
  }

  async ensureValidToken() {
    const { data } = await this.supabase.auth.getSession()
    if (data.session) {
      this.accessToken = data.session.access_token

      // Refresh if token expires soon
      const expiresAt = data.session.expires_at * 1000
      const timeUntilExpiry = expiresAt - Date.now()

      if (timeUntilExpiry < 5 * 60 * 1000) { // 5 minutes
        await this.supabase.auth.refreshSession()
      }
    }
  }
}
```

### Secure Storage

- **Never** store access tokens in localStorage
- Use secure storage mechanisms
- Implement token rotation
- Clear tokens on logout

### Error Handling

```javascript
async function makeAPIRequest(url, options) {
  try {
    const response = await fetch(url, options)

    if (response.status === 401) {
      // Token expired - refresh and retry
      await refreshToken()
      return makeAPIRequest(url, options)
    }

    if (response.status === 403) {
      // Insufficient permissions - don't retry
      throw new Error('Access denied')
    }

    if (response.status === 429) {
      // Rate limited - implement exponential backoff
      await delay(Math.pow(2, retryCount) * 1000)
      return makeAPIRequest(url, options)
    }

    return response.json()
  } catch (error) {
    // Handle network errors
    console.error('API request failed:', error)
    throw error
  }
}
```

## Compliance & Data Protection

### GDPR Compliance

- **Data minimization**: Only collect necessary data
- **Right to deletion**: Users can delete their accounts and data
- **Data portability**: Export functionality available
- **Consent management**: Clear privacy policies

### Data Encryption

- **In transit**: All API communications use HTTPS/TLS 1.3
- **At rest**: Supabase provides encryption for stored data
- **File storage**: Encrypted storage for all attachments

### Backup & Recovery

- **Automated backups**: Daily database backups
- **Point-in-time recovery**: Can restore to any point in last 30 days
- **Disaster recovery**: Multi-region backup strategy

---

**Last Updated**: January 31, 2024
