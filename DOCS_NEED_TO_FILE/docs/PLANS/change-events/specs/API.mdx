# CHANGE EVENTS API ENDPOINTS & EXAMPLES

### Phase 1: Core Operations

```
Endpoint 1.1: Create Change Event
Method: POST
Path: /api/v1/projects/{projectId}/change-events
Authentication: Bearer Token
Authorization: Standard, Admin
Request:
json{
  "title": "Phase 1 & 2 Carpet Installation",
  "type": "OWNER_CHANGE",
  "changeReasonId": 5,
  "scope": "OUT_OF_SCOPE",
  "origin": "FIELD",
  "description": "Includes carpet for phase 1 & 2",
  "expectingRevenue": true,
  "lineItemRevenueSource": "MATCH_LATEST_COST",
  "primeContractId": 42,
  "vendorId": 8
}
Response (201 Created):
json{
  "id": 562949955981358,
  "number": "007",
  "title": "Phase 1 & 2 Carpet Installation",
  "type": "OWNER_CHANGE",
  "changeReason": "Design Development",
  "scope": "OUT_OF_SCOPE",
  "status": "OPEN",
  "origin": "FIELD",
  "expectingRevenue": true,
  "lineItemRevenueSource": "MATCH_LATEST_COST",
  "primeContractForMarkupEstimates": {
    "id": 42,
    "name": "Goodwill Bart"
  },
  "vendor": {
    "id": 8,
    "name": "Carpet Supplier Inc"
  },
  "createdAt": "2026-01-06T20:05:47Z",
  "createdBy": {
    "id": 123,
    "name": "John Manager"
  },
  "_links": {
    "self": "/api/v1/projects/562949954728542/change-events/562949955981358",
    "lineItems": "/api/v1/projects/562949954728542/change-events/562949955981358/line-items",
    "rfqs": "/api/v1/projects/562949954728542/change-events/562949955981358/rfqs"
  }
}
Error (400 Bad Request):
json{
  "error": "VALIDATION_ERROR",
  "message": "Change reason is required",
  "details": [
    {
      "field": "changeReasonId",
      "message": "Field is required"
    }
  ]
}
```

### Endpoint 1.2: Get Change Event

```
Method: GET
Path: /api/v1/projects/{projectId}/change-events/{changeEventId}
Authentication: Bearer Token
Authorization: Read, Standard, Admin
Request: None
Response (200 OK):
json{
  "id": 562949955981358,
  "number": "007",
  "title": "Phase 1 & 2 Carpet Installation",
  "type": "OWNER_CHANGE",
  "changeReason": "Design Development",
  "scope": "OUT_OF_SCOPE",
  "status": "OPEN",
  "origin": "FIELD",
  "description": "Includes carpet for phase 1 & 2",
  "expectingRevenue": true,
  "lineItemRevenueSource": "MATCH_LATEST_COST",
  "primeContractForMarkupEstimates": {
    "id": 42,
    "name": "Goodwill Bart"
  },
  "vendor": {
    "id": 8,
    "name": "Carpet Supplier Inc"
  },
  "totals": {
    "rom": "$0.00",
    "primeTotals": "$0.00",
    "commitmentTotals": "$0.00",
    "rfqs": "$0.00"
  },
  "lineItemsCount": 0,
  "rfqsCount": 0,
  "attachmentsCount": 0,
  "createdAt": "2026-01-06T20:05:47Z",
  "createdBy": {
    "id": 123,
    "name": "John Manager"
  },
  "updatedAt": "2026-01-06T20:05:47Z",
  "updatedBy": {
    "id": 123,
    "name": "John Manager"
  },
  "_links": {
    "self": "/api/v1/projects/562949954728542/change-events/562949955981358",
    "edit": "/api/v1/projects/562949954728542/change-events/562949955981358",
    "delete": "/api/v1/projects/562949954728542/change-events/562949955981358",
    "lineItems": "/api/v1/projects/562949954728542/change-events/562949955981358/line-items",
    "rfqs": "/api/v1/projects/562949954728542/change-events/562949955981358/rfqs",
    "relatedItems": "/api/v1/projects/562949954728542/change-events/562949955981358/related-items"
  }
}
```

### Endpoint 1.3: List Change Events
Method: GET
Path: /api/v1/projects/{projectId}/change-events
Authentication: Bearer Token
Authorization: Read, Standard, Admin
Query Parameters:

page=1 (default: 1)
limit=25 (default: 25, max: 100)
status=OPEN (optional filter)
type=OWNER_CHANGE (optional filter)
scope=IN_SCOPE (optional filter)
search=carpet (optional search term)
sort=createdAt (default: createdAt)
order=desc (asc|desc)
includeDeleted=false (boolean)

Request: None
Response (200 OK):
json{
  "data": [
    {
      "id": 562949955981358,
      "number": "007",
      "title": "Phase 1 & 2 Carpet Installation",
      "type": "OWNER_CHANGE",
      "scope": "OUT_OF_SCOPE",
      "status": "OPEN",
      "origin": "FIELD",
      "changeReason": "Design Development",
      "rom": "$0.00",
      "primeTotals": "$0.00",
      "commitmentTotals": "$0.00",
      "rfqs": "$0.00",
      "rfqCount": 0,
      "lineItemsCount": 0,
      "createdAt": "2026-01-06T20:05:47Z",
      "createdBy": "John Manager",
      "_links": {
        "self": "/api/v1/projects/562949954728542/change-events/562949955981358"
      }
    },
    {
      "id": 562949955981359,
      "number": "006",
      "title": "Phase 2 Plumbing",
      "type": "OWNER_CHANGE",
      "scope": "OUT_OF_SCOPE",
      "status": "OPEN",
      "origin": "FIELD",
      "changeReason": "Design Development",
      "rom": "$0.00",
      "primeTotals": "$0.00",
      "commitmentTotals": "$0.00",
      "rfqs": "$0.00",
      "rfqCount": 0,
      "lineItemsCount": 0,
      "createdAt": "2025-12-15T10:30:00Z",
      "createdBy": "Jane Architect",
      "_links": {
        "self": "/api/v1/projects/562949954728542/change-events/562949955981359"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 25,
    "totalRecords": 3,
    "totalPages": 1
  },
  "_links": {
    "self": "/api/v1/projects/562949954728542/change-events?page=1&limit=25",
    "first": "/api/v1/projects/562949954728542/change-events?page=1&limit=25",
    "last": "/api/v1/projects/562949954728542/change-events?page=1&limit=25"
  }
}

### Endpoint 1.4: Update Change Event

Method: PATCH
Path: /api/v1/projects/{projectId}/change-events/{changeEventId}
Authentication: Bearer Token
Authorization: Standard (own), Admin
Request:
json{
  "title": "Phase 1 & 2 Carpet Installation - Updated",
  "description": "Includes premium carpet for phase 1 & 2",
  "scope": "IN_SCOPE",
  "expectingRevenue": false
}
Response (200 OK):
json{
  "id": 562949955981358,
  "number": "007",
  "title": "Phase 1 & 2 Carpet Installation - Updated",
  "type": "OWNER_CHANGE",
  "description": "Includes premium carpet for phase 1 & 2",
  "scope": "IN_SCOPE",
  "expectingRevenue": false,
  "updatedAt": "2026-01-06T20:15:00Z",
  "updatedBy": {
    "id": 123,
    "name": "John Manager"
  },
  "_links": {
    "self": "/api/v1/projects/562949954728542/change-events/562949955981358"
  }
}

### Endpoint 1.5: Delete Change Event
Method: DELETE
Path: /api/v1/projects/{projectId}/change-events/{changeEventId}
Authentication: Bearer Token
Authorization: Standard (own), Admin
Request: None
Response (204 No Content)
Error (409 Conflict):
json{
  "error": "CANNOT_DELETE",
  "message": "Cannot delete change event with status CLOSED or active related change orders"
}

## PHASE 2: RFQ Management