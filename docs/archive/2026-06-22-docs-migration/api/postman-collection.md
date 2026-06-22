# Postman Collection

This guide helps you set up and use the Alleato PM API Postman collection for testing and development.

## Collection Overview

The Alleato PM Postman collection includes:

- **Authentication setup** with automatic token management
- **All API endpoints** with pre-configured requests
- **Environment variables** for easy switching between development and production
- **Test scripts** for automated validation
- **Example responses** with sample data

## Quick Setup

### 1. Download and Import

1. **Download Postman**: Get the latest version from [postman.com](https://www.postman.com/downloads/)

2. **Import Collection**: You can import the collection in several ways:

   **Option A: Direct Link**

   ```text
   https://www.postman.com/alleato-pm/workspace/alleato-pm-api
   ```

   **Option B: JSON Import**
   - Download the collection JSON file from the repository
   - In Postman: File → Import → Select the JSON file

   **Option C: GitHub Integration**
   - Connect your GitHub account in Postman
   - Import directly from the repository

### 2. Set Up Environment

Create a new environment with these variables:

```json
{
  "base_url": "https://alleato-pm.vercel.app/api",
  "supabase_url": "https://lgveqfnpkxvzbnnwuled.supabase.co",
  "supabase_anon_key": "{{your_supabase_anon_key}}",
  "email": "{{your_email}}",
  "password": "{{your_password}}",
  "access_token": "",
  "refresh_token": "",
  "project_id": "",
  "person_id": "",
  "change_event_id": ""
}
```
For development, create a separate environment:

```json
{
  "base_url": "http://localhost:3000/api",
  "supabase_url": "https://lgveqfnpkxvzbnnwuled.supabase.co",
  "supabase_anon_key": "{{your_supabase_anon_key}}",
  "email": "{{your_dev_email}}",
  "password": "{{your_dev_password}}"
}
```
### 3. Authentication Setup

The collection includes an authentication request that automatically sets the access token:

1. **Open the "Auth" folder** in the collection
2. **Run "Login"** request
3. **Access token is automatically set** in environment variables

## Collection Structure

```sql
Alleato PM API/
├── 📁 Auth/
│   ├── Login
│   ├── Refresh Token
│   └── Logout
├── 📁 System/
│   └── Health Check
├── 📁 Projects/
│   ├── List Projects
│   ├── Create Project
│   ├── Get Project
│   ├── Update Project
│   └── Delete Project
├── 📁 Directory/
│   ├── 📁 People/
│   │   ├── List People
│   │   ├── Create Person
│   │   ├── Get Person
│   │   ├── Update Person
│   │   ├── Delete Person
│   │   ├── Invite Person
│   │   ├── Deactivate Person
│   │   └── Reactivate Person
│   ├── 📁 Companies/
│   │   ├── List Companies
│   │   ├── Create Company
│   │   └── Get Company
│   └── 📁 Groups/
│       ├── List Groups
│       ├── Create Group
│       └── Manage Members
├── 📁 Budget/
│   ├── Get Budget Data
│   ├── Create Budget Lines
│   ├── List Budget Views
│   ├── Create Budget View
│   ├── Budget History
│   ├── Export Budget
│   └── Lock Budget
├── 📁 Change Events/
│   ├── List Change Events
│   ├── Create Change Event
│   ├── Get Change Event
│   ├── Update Change Event
│   ├── 📁 Line Items/
│   │   ├── List Line Items
│   │   ├── Create Line Item
│   │   ├── Update Line Item
│   │   └── Delete Line Item
│   └── 📁 Attachments/
│       ├── List Attachments
│       ├── Upload Attachment
│       ├── Download Attachment
│       └── Delete Attachment
├── 📁 Commitments/
│   ├── List Commitments
│   ├── Create Commitment
│   ├── Get Commitment
│   └── Update Commitment
├── 📁 Contracts/
│   ├── List Contracts
│   ├── Create Contract
│   ├── Get Contract
│   ├── 📁 Change Orders/
│   │   ├── List Change Orders
│   │   ├── Create Change Order
│   │   ├── Approve Change Order
│   │   └── Reject Change Order
│   └── 📁 Line Items/
│       ├── List Line Items
│       ├── Import Line Items
│       └── Update Line Item
├── 📁 Direct Costs/
│   ├── List Direct Costs
│   ├── Create Direct Cost
│   ├── Update Direct Cost
│   ├── Bulk Create
│   └── Export Direct Costs
└── 📁 Workflows/
    ├── Complete Project Setup
    ├── Create Budget Workflow
    ├── Change Event Workflow
    └── Monthly Reporting
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `base_url` | API base URL | `https://alleato-pm.vercel.app/api` |
| `supabase_url` | Supabase project URL | `https://your-project.supabase.co` |
| `supabase_anon_key` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIs...` |
| `email` | Your login email | `user@example.com` |
| `password` | Your password | `your-password` |

### Auto-Generated Variables

These are set automatically by the auth scripts:

| Variable | Description | Set By |
|----------|-------------|---------|
| `access_token` | Bearer token for API calls | Login request |
| `refresh_token` | Token for refreshing access | Login request |
| `token_expires_at` | Token expiration time | Login request |

### Dynamic Variables

These are set by requests for use in subsequent calls:

| Variable | Description | Set By |
|----------|-------------|---------|
| `project_id` | Current project ID | Create/Get Project |
| `person_id` | Current person ID | Create/Get Person |
| `change_event_id` | Current change event ID | Create/Get Change Event |
| `commitment_id` | Current commitment ID | Create/Get Commitment |
| `contract_id` | Current contract ID | Create/Get Contract |

## Pre-Request Scripts

### Authentication Middleware

Most requests include this pre-request script for automatic token management:

```javascript
// Check if token is about to expire (within 5 minutes)
const expiresAt = pm.environment.get("token_expires_at");
const now = Date.now();
const fiveMinutes = 5 * 60 * 1000;

if (!pm.environment.get("access_token") || (expiresAt && now >= expiresAt - fiveMinutes)) {
    console.log("Token missing or expiring soon, refreshing...");

    // Refresh token if available
    const refreshToken = pm.environment.get("refresh_token");
    if (refreshToken) {
        pm.sendRequest({
            url: pm.environment.get("supabase_url") + "/auth/v1/token?grant_type=refresh_token",
            method: 'POST',
            header: {
                'apikey': pm.environment.get("supabase_anon_key"),
                'Content-Type': 'application/json'
            },
            body: {
                mode: 'raw',
                raw: JSON.stringify({
                    refresh_token: refreshToken
                })
            }
        }, function (err, response) {
            if (!err && response.code === 200) {
                const data = response.json();
                pm.environment.set("access_token", data.access_token);
                pm.environment.set("refresh_token", data.refresh_token);
                pm.environment.set("token_expires_at", data.expires_at * 1000);
            }
        });
    }
}
```
### Dynamic Variable Setters

Many requests set variables for subsequent use:

```javascript
// Example: Set project_id after creating a project
if (pm.response.code === 201) {
    const project = pm.response.json();
    pm.environment.set("project_id", project.id);
    console.log("Set project_id:", project.id);
}
```
## Test Scripts

### Response Validation

Standard test script included in most requests:

```javascript
pm.test("Response status is successful", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);
});

pm.test("Response has valid JSON", function () {
    pm.response.to.have.jsonBody();
});

pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(5000);
});

// Specific tests based on endpoint
if (pm.response.code === 200) {
    pm.test("Response has required fields", function () {
        const response = pm.response.json();

        if (response.data) {
            // List endpoint
            pm.expect(response).to.have.property('data');
            pm.expect(response).to.have.property('meta');
            pm.expect(response.meta).to.have.property('total');
        } else {
            // Single entity endpoint
            pm.expect(response).to.have.property('id');
            pm.expect(response).to.have.property('created_at');
        }
    });
}
```
### Error Handling Tests

```javascript
if (pm.response.code >= 400) {
    pm.test("Error response has proper structure", function () {
        const response = pm.response.json();
        pm.expect(response).to.have.property('error');

        if (response.code) {
            pm.expect(response.code).to.be.a('string');
        }
    });
}
```

## Workflow Examples

### 1. Complete Project Setup Workflow

This workflow demonstrates creating a complete project with team and budget:

```javascript
// 1. Create Project
POST {{base_url}}/projects
{
    "name": "Workflow Demo Project",
    "job_number": "WDP-001",
    "budget": 500000,
    "state": "planning"
}

// 2. Add Team Members (run multiple times)
POST {{base_url}}/projects/{{project_id}}/directory/people
{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "person_type": "user",
    "title": "Project Manager"
}

// 3. Create Budget
POST {{base_url}}/projects/{{project_id}}/budget
{
    "lineItems": [
        {
            "costCodeId": "01100",
            "amount": 100000,
            "description": "General Conditions"
        },
        {
            "costCodeId": "03000",
            "amount": 200000,
            "description": "Concrete Work"
        }
    ]
}

// 4. Activate Project
PATCH {{base_url}}/projects/{{project_id}}
{
    "state": "active"
}
```
### 2. Change Event Workflow

```javascript
// 1. Create Change Event
POST {{base_url}}/projects/{{project_id}}/change-events
{
    "title": "Foundation Design Change",
    "type": "Design Change",
    "scope": "Out of Scope",
    "expecting_revenue": true
}

// 2. Add Line Items
POST {{base_url}}/projects/{{project_id}}/change-events/{{change_event_id}}/line-items
{
    "cost_code_id": "03100",
    "description": "Additional Concrete",
    "quantity": 50,
    "unit_cost": 500,
    "total_cost": 25000
}

// 3. Upload Attachment
POST {{base_url}}/projects/{{project_id}}/change-events/{{change_event_id}}/attachments
[Form Data with file upload]
```
### 3. Monthly Reporting Workflow

```javascript
// 1. Get Project List
GET {{base_url}}/projects?state=active

// 2. For each project, get budget status
GET {{base_url}}/projects/{{project_id}}/budget

// 3. Get change events for the month
GET {{base_url}}/projects/{{project_id}}/change-events?date_from=2024-01-01&date_to=2024-01-31

// 4. Get direct costs for the month
GET {{base_url}}/projects/{{project_id}}/direct-costs?date_from=2024-01-01&date_to=2024-01-31
```
## Advanced Features

### 1. Data Generation

Use Postman's dynamic variables for realistic test data:

```javascript
// In request body
{
    "name": "Project {{$randomWords}}",
    "job_number": "{{$randomAlphaNumeric}}-{{$timestamp}}",
    "email": "{{$randomEmail}}",
    "phone": "{{$randomPhoneNumber}}",
    "amount": {{$randomInt}},
    "start_date": "{{$randomDateFuture}}"
}
```

### 2. Collection Variables

Set variables at the collection level for common values:

```json
{
    "api_version": "v1",
    "timeout": 5000,
    "default_page_size": 50,
    "test_project_prefix": "TEST-"
}
```
### 3. Mock Servers

Create mock servers for testing without hitting the actual API:

1. **Right-click collection** → Create Mock Server
2. **Set up example responses** for each endpoint
3. **Use mock URL** in environment for testing

### 4. Newman (CLI) Integration

Run collections from command line:

```bash
# Install Newman
npm install -g newman

# Run collection
newman run "Alleato PM API.postman_collection.json" \
    -e "Production.postman_environment.json" \
    --reporters html,json \
    --reporter-html-export results.html

# Run specific folder
newman run "Alleato PM API.postman_collection.json" \
    -e "Production.postman_environment.json" \
    --folder "Projects"
```
## Troubleshooting

### Common Issues

**1. Authentication Failures**

```javascript
// Check in console:
console.log("Access token:", pm.environment.get("access_token"));
console.log("Token expires:", new Date(pm.environment.get("token_expires_at")));

// Clear and re-authenticate:
pm.environment.unset("access_token");
pm.environment.unset("refresh_token");
```
**2. Environment Variable Issues**
```javascript
// Debug environment state:
console.log("Current environment:", pm.environment.name);
console.log("Base URL:", pm.environment.get("base_url"));
console.log("All variables:", pm.environment.toObject());
```

**3. Request Failures**

```javascript
// Add to test scripts for debugging:
console.log("Request URL:", pm.request.url.toString());
console.log("Request Headers:", pm.request.headers.toObject());
console.log("Response Status:", pm.response.code);
console.log("Response Body:", pm.response.text());
```
### Console Debugging

Enable Postman console (View → Show Postman Console) and add debug logs:

```javascript
// Pre-request script debugging
console.log("=== PRE-REQUEST DEBUG ===");
console.log("Environment:", pm.environment.name);
console.log("Variables:", {
    base_url: pm.environment.get("base_url"),
    access_token: pm.environment.get("access_token") ? "SET" : "NOT SET",
    project_id: pm.environment.get("project_id")
});

// Test script debugging
console.log("=== RESPONSE DEBUG ===");
console.log("Status:", pm.response.code);
console.log("Time:", pm.response.responseTime + "ms");
console.log("Size:", pm.response.responseSize + " bytes");
```

## Collection Maintenance

### Keeping Updated

1. **Subscribe to updates** if using shared workspace
2. **Pull latest changes** from version control
3. **Update environment variables** when API changes
4. **Test critical workflows** after updates

### Contributing

1. **Fork the collection** before making changes
2. **Test thoroughly** in development environment
3. **Document new features** in request descriptions
4. **Submit pull request** with clear change description

---

## Download Links

- **Postman Collection**: [Download JSON](./alleato-pm-api.postman_collection.json)
- **Environment Template**: [Download JSON](./alleato-pm-environment.postman_environment.json)
- **Newman CLI Documentation**: [Newman Docs](https://learning.postman.com/docs/running-collections/using-newman-cli/)

---

**Last Updated**: January 31, 2024
