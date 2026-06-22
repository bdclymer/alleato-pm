# API REFERENCE FILE CONTENT GUIDE

## What Should Go in API Reference Files

API reference files document all the endpoints, request/response formats, and usage examples for a specific phase.

---

## STRUCTURE FOR API REFERENCE FILES

Create files at these locations with this structure:

```text
documentation/phases/phase-1a-budget-modifications/api-reference.md
documentation/phases/phase-1b-cost-actuals/api-reference.md
documentation/phases/phase-1c-snapshots/api-reference.md
documentation/phases/phase-2-forecasting/api-reference.md
documentation/phases/phase-3-variance-analysis/api-reference.md
documentation/phases/phase-4-change-history/api-reference.md
```diff
---

## TEMPLATE FOR API REFERENCE FILES

```markdown
# [Phase Name] - API Reference

**Phase:** Phase [#] - [Name]
**Last Updated:** [Date]
**Version:** 1.0

## Overview

[1-2 sentence description of what this API does]

Example:
"The Budget Modifications API provides endpoints for creating, reading, updating, and managing budget modification requests. Supports full workflow management from draft through approval/rejection."

---

## Base URL
```json
[Development]  http://localhost:3000/api/projects/{projectId}/budget/
[Staging]      https://staging.app.com/api/projects/{projectId}/budget/
[Production]   https://api.app.com/api/projects/{projectId}/budget/
```

---

## Authentication

[Describe authentication method]

Example:

```text
All requests require:
- Valid session cookie OR
- Bearer token in Authorization header

Authorization: Bearer [your_jwt_token]
```diff
---

## Common Parameters

### Path Parameters (all endpoints)

- `projectId` (UUID) - The project ID. Required for all endpoints.

### Query Parameters (shared across endpoints)

[List any common query parameters]

Example:

```markdown
- limit (number): Max results to return (default: 50, max: 100)
- offset (number): Pagination offset (default: 0)
- sort (string): Field to sort by (default: created_at)
- order (string): Sort order - 'asc' or 'desc' (default: desc)
```

### Common Request Headers

```yaml
Content-Type: application/json
Accept: application/json
```yaml
### Common Response Headers

```yaml
Content-Type: application/json
X-Request-ID: [unique request ID]
X-Total-Count: [total results if pagination]

Error Responses
All endpoints return errors in this format:
json{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "status": 400,
    "details": {
      "field": "fieldName",
      "reason": "Detailed reason for error"
    }
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| INVALID_INPUT | 400 | Request body failed validation |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | User lacks permission |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource conflict (e.g., already exists) |
| RATE_LIMITED | 429 | Too many requests |
| SERVER_ERROR | 500 | Internal server error |

---

## Endpoints

### ENDPOINT 1: [Endpoint Name]

**Route:** `[METHOD] /[path]`

**Description:** [What this endpoint does]

**Authentication:** ✅ Required | ☐ Optional | ☐ Not Required

**Permissions Required:** [List required roles/permissions]

#### Request

**Method:** [GET | POST | PATCH | PUT | DELETE]

**Headers:**

```typescript
Content-Type: application/json
Path Parameters:
ParameterTypeRequiredDescriptionprojectIdUUID✅The project ID
Query Parameters (if applicable):
ParameterTypeRequiredDefaultDescriptionparam1string☐N/ADescription of param1param2number☐50Description of param2
Request Body (if applicable):
Schema:
typescriptinterface RequestBody {
  field1: string;      // Required. Description
  field2?: number;     // Optional. Description
  field3: boolean;     // Required. Description
}
Example:
json{
  "field1": "value1",
  "field2": 100,
  "field3": true
}
Validation Rules:

field1: Min length 3, max length 255
field2: Min value 0, max value 999999
field3: Must be boolean

Response
Status Code: [200, 201, 202, etc.]
Response Schema:
typescriptinterface SuccessResponse {
  id: UUID;
  field1: string;
  field2: number;
  field3: boolean;
  created_at: ISO8601DateTime;
  updated_at: ISO8601DateTime;
}
Example Response:
json{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "field1": "value1",
  "field2": 100,
  "field3": true,
  "created_at": "2025-01-06T10:30:00Z",
  "updated_at": "2025-01-06T10:30:00Z"
}
```tsx
**Response Headers:**

```tsx
X-Request-ID: req_123456789
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
Error Responses
Status 400 - Bad Request
json{
  "error": {
    "code": "INVALID_INPUT",
    "message": "field1 is required",
    "status": 400,
    "details": {
      "field": "field1",
      "reason": "Field is required but not provided"
    }
  }
}
Status 403 - Forbidden
json{
  "error": {
    "code": "FORBIDDEN",
    "message": "User lacks PROJECT_MANAGER role",
    "status": 403
  }
}
Status 404 - Not Found
json{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "status": 404
  }
}
Code Examples
cURL:
bashcurl -X POST http://localhost:3000/api/projects/{projectId}/budget/endpoint \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{
    "field1": "value1",
    "field2": 100,
    "field3": true
  }'
JavaScript/Fetch:
javascriptconst response = await fetch('/api/projects/{projectId}/budget/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    field1: 'value1',
    field2: 100,
    field3: true
  })
});

const data = await response.json();
console.log(data);
TypeScript/Axios:
typescriptimport axios from 'axios';

interface RequestPayload {
  field1: string;
  field2: number;
  field3: boolean;
}

const response = await axios.post<SuccessResponse>(
  `/api/projects/${projectId}/budget/endpoint`,
  {
    field1: 'value1',
    field2: 100,
    field3: true
  } as RequestPayload,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

console.log(response.data);
React Hook:
typescriptconst useCreateResource = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (projectId: string, data: RequestPayload) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/projects/${projectId}/budget/endpoint`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to create resource');
      }
      
      const result = await response.json();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { create, loading, error };
};
Rate Limiting

Rate Limit: 100 requests per minute
Header: X-RateLimit-Limit: 100
Remaining: X-RateLimit-Remaining: 99
Reset: X-RateLimit-Reset: 1641513600

When limit exceeded (429):
json{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Try again after 60 seconds.",
    "status": 429,
    "retryAfter": 60
  }
}
```

---

### ENDPOINT 2: [Next Endpoint]

[Repeat same structure as ENDPOINT 1 above]

---

## Pagination

For endpoints that return lists, use these parameters:

**Query Parameters:**

```javascript
?limit=50&offset=0&sort=created_at&order=desc
Response Format:
json{
  "items": [
    { /* item 1 */ },
    { /* item 2 */ }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 247,
    "hasMore": true
  }
}
JavaScript Example:
javascript// Get first 50 items
const response1 = await fetch('/api/projects/123/budget?limit=50&offset=0');
const data1 = await response1.json();

// Get next 50 items
const response2 = await fetch('/api/projects/123/budget?limit=50&offset=50');
const data2 = await response2.json();

// Continue until hasMore = false
while (data.pagination.hasMore) {
  const nextOffset = data.pagination.offset + data.pagination.limit;
  const response = await fetch(
    `/api/projects/123/budget?limit=50&offset=${nextOffset}`
  );
  data = await response.json();
}
```diff
---

## Filtering

[If applicable, describe filtering syntax]

**Example:**

```text
GET /api/projects/{projectId}/budget/modifications?status=approved&sort=created_at
```

**Filterable Fields:**

| Field | Operator | Example |
|-------|----------|---------|
| status | = | ?status=approved |
| created_at | >= | ?created_at=2025-01-01 |
| amount | > | ?amount=1000 |

---

## Sorting

[Describe sorting options]

**Example:**

```text
GET /api/projects/{projectId}/budget/modifications?sort=created_at&order=desc
Sortable Fields:

created_at (default)
updated_at
amount
status
name


Webhooks (if applicable)
[Document any webhook events this API triggers]
Example:
json{
  "event": "modification.approved",
  "timestamp": "2025-01-06T10:30:00Z",
  "data": {
    "modification_id": "...",
    "project_id": "...",
    "status": "approved"
  }
}
```sql
---

## Rate Limits

- **General:** 100 requests/minute per user
- **Bulk Operations:** 10 requests/minute per user
- **Search:** 30 requests/minute per user

---

## Timeouts

- **Default:** 30 seconds
- **Long Operations:** 60 seconds

---

## Versioning

Current API Version: `v1`

[Describe how versioning is handled, if applicable]

---

## Changelog

### v1.0 (2025-01-06)

- Initial API release
- [Endpoint 1] added
- [Endpoint 2] added
- [Endpoint 3] added

---

## Migration Guides

[If there are previous versions, document migration paths]

---

## Support & Troubleshooting

### Common Issues

**Issue: 403 Forbidden when accessing endpoint**

- Solution: Verify user has PROJECT_MANAGER role
- Check: `GET /api/user/permissions`

**Issue: 400 Bad Request with validation error**

- Solution: Review validation rules in endpoint documentation
- Check: All required fields are provided
- Verify: Field types match specification

**Issue: 429 Too Many Requests**

- Solution: Implement exponential backoff
- Recommended: Wait 1-2 seconds before retry
- Check: X-RateLimit-Remaining header

### Getting Help

- Documentation: [Link to full docs]
- Issues: [Link to issue tracker]
- Contact: [Support email]
- Community: [Discord/Slack link]

---

## Related Documentation

- [Phase Specification](specification.md)
- [Completion Report](completion-report.md)
- [Database Schema](../DATABASE.md)
- [Architecture Guide](../../ARCHITECTURE.md)

---

## Last Updated

**Date:** 2025-01-06
**Version:** 1.0
**Author:** Claude Code
**Reviewed By:** [Name]

```sql
---

## CONTENT BY PHASE

### Phase 1A - Budget Modifications API Reference

Should include:
```markdown
# Phase 1A - Budget Modifications API Reference

## Endpoints

1. **POST /budget/modifications** - Create modification
2. **GET /budget/modifications** - List modifications
3. **GET /budget/modifications/{modificationId}** - Get single modification
4. **PATCH /budget/modifications/{modificationId}** - Update status (submit, approve, reject, void)
5. **DELETE /budget/modifications/{modificationId}** - Delete draft modification

## Workflow Actions (PATCH endpoint)

Valid actions:
- submit (Draft → Pending)
- approve (Pending → Approved)
- reject (Pending → Rejected)
- void (Approved → Void)

## Response Examples

Examples for each status:
- Draft modification response
- Submitted modification response
- Approved modification response
- Rejected modification response
- Voided modification response
```

### Phase 1B - Cost Actuals API Reference

Should include:

```markdown
# Phase 1B - Cost Actuals API Reference

## Endpoints

1. **GET /direct-costs** - Get direct costs for project
2. **GET /budget** - Get budget with cost aggregation

## Cost Types

- Invoice
- Expense
- Payroll
- Subcontractor Invoice

## Cost Aggregations Explained

- Job to Date Cost Detail (includes all 4 types)
- Direct Costs (excludes Subcontractor Invoice)
- Pending Cost Changes (from SOV items + change orders)

## Response Examples

Examples showing:
- Cost breakdown by type
- Aggregation calculations
- How pending costs are calculated
```markdown
### Phase 1C - Snapshots API Reference

Should include:
```markdown
# Phase 1C - Project Status Snapshots API Reference

## Endpoints

1. **POST /snapshots** - Create snapshot
2. **GET /snapshots/{snapshotId}** - Get snapshot details
3. **GET /snapshots** - List snapshots
4. **PATCH /snapshots/{snapshotId}** - Update snapshot metadata
5. **GET /snapshots/{id1}/compare/{id2}** - Compare two snapshots

## Response Examples

Examples for:
- Snapshot creation
- Snapshot detail with all cost codes
- Snapshot list with summaries
- Comparison between two snapshots
```markdown
### Phase 2 - Forecasting API Reference

Should include:

```markdown
# Phase 2 - Forecasting Engine API Reference

## Endpoints

1. **POST /forecast/generate** - Generate forecast
2. **GET /forecast/{costCodeId}** - Get cost code forecast
3. **GET /forecast/summary** - Get project forecast summary
4. **PATCH /forecast/{forecastId}** - Update forecast (manual override)
5. **POST /forecast/scenarios** - Generate forecast scenarios
6. **GET /forecast/trends** - Get forecast trends

## Forecast Methods

- LinearTrend
- BurnRate
- CommittedBased
- Manual

## Scenario Types

- Optimistic (20% better)
- Base (most likely)
- Pessimistic (20% worse)
- Risk-Adjusted
```markdown
### Phase 3 - Variance Analysis API Reference

Should include:
```markdown
# Phase 3 - Budget Variance Analysis API Reference

## Endpoints

1. **POST /variance/generate** - Generate variance analysis
2. **GET /variance/{analysisId}** - Get variance analysis details
3. **GET /variance/summary** - Get project variance summary
4. **POST /variance/{analysisId}/explanations** - Add variance explanation
5. **GET /variance/trends** - Get variance trends
6. **POST /variance/reports** - Generate variance report
7. **PATCH /variance/reports/{reportId}/publish** - Publish report
8. **GET /variance/alerts** - Get active variance alerts
```

### Phase 4 - Change History API Reference

Should include:

```markdown
# Phase 4 - Change History & Audit Trail API Reference

## Endpoints

1. **GET /history** - Get change history
2. **GET /history/{changeId}** - Get change details
3. **POST /history/{changeId}/reverse** - Reverse a change
4. **PATCH /history/{changeId}/submit** - Submit for approval
5. **PATCH /history/{changeId}/approve** - Approve change
6. **PATCH /history/{changeId}/reject** - Reject change
7. **POST /history/export** - Export change history
8. **GET /history/statistics** - Get change statistics
```diff
---

## TIPS FOR WRITING API REFERENCES

1. **Be Comprehensive**: Include all information needed to call the endpoint
2. **Be Consistent**: Use same structure for all endpoints
3. **Provide Examples**: Show real request/response examples
4. **Include Error Cases**: Document what can go wrong
5. **Add Code Samples**: Provide JavaScript, TypeScript, cURL examples
6. **Document Limits**: Rate limits, pagination, timeouts
7. **Make it Searchable**: Use clear headings and sections
8. **Keep it Updated**: Update when API changes
9. **Link Everything**: Link to related docs, specs, reports
10. **Include Workflow**: For stateful resources, document the workflow

---

## LOCATION IN PROJECT
```text
documentation/
├── phases/
│   ├── phase-1a-budget-modifications/
│   │   ├── specification.md
│   │   ├── completion-report.md
│   │   └── api-reference.md         ← Save here
│   ├── phase-1b-cost-actuals/
│   │   ├── specification.md
│   │   ├── completion-report.md
│   │   └── api-reference.md         ← Save here
│   ├── phase-1c-snapshots/
│   │   ├── specification.md
│   │   ├── completion-report.md
│   │   └── api-reference.md         ← Save here
│   ├── phase-2-forecasting/
│   │   ├── specification.md
│   │   ├── completion-report.md
│   │   └── api-reference.md         ← Save here
│   ├── phase-3-variance-analysis/
│   │   ├── specification.md
│   │   ├── completion-report.md
│   │   └── api-reference.md         ← Save here
│   └── phase-4-change-history/
│       ├── specification.md
│       ├── completion-report.md
│       └── api-reference.md         ← Save here

```

---
