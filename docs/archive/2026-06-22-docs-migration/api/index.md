# Alleato PM API Documentation

Welcome to the comprehensive API documentation for the Alleato PM construction project management platform. This documentation provides everything you need to integrate with and build applications using the Alleato PM API.

## 🚀 Getting Started

**New to the API?** Start here:

1. **[Quick Start Guide](./quick-start.md)** - Get up and running in minutes
2. **[Authentication & Security](./authentication-security.md)** - Learn about auth and permissions
3. **[Usage Examples](./usage-examples.md)** - See practical implementation examples

## 📖 Documentation

### Core Documentation

| Document | Description | Audience |
|----------|-------------|----------|
| **[API Reference Guide](./api-reference-guide.md)** | Complete endpoint documentation with examples | All developers |
| **[Schema Definitions](./schema-definitions.md)** | Comprehensive data models and type definitions | Frontend/Backend developers |
| **[Authentication & Security](./authentication-security.md)** | Security patterns, permissions, and best practices | DevOps, Security engineers |
| **[Usage Examples](./usage-examples.md)** | Real-world code examples and workflows | All developers |

### Development Tools

| Tool | Description | Use Case |
|------|-------------|----------|
| **[OpenAPI Specification](./alleato-pm-api-v1.yaml)** | Machine-readable API spec (OpenAPI 3.0+) | SDK generation, documentation tools |
| **[Postman Collection](./postman-collection.md)** | Interactive API testing and documentation | API testing, development |
| **[Quick Start Guide](./quick-start.md)** | Step-by-step setup instructions | First-time users |

## 🏗️ API Overview

### Base Information

- **Base URL**: `https://alleato-pm.vercel.app/api`
- **API Version**: v1.0.0
- **Authentication**: Bearer tokens via Supabase Auth
- **Response Format**: JSON
- **Rate Limit**: 1000 requests/hour (authenticated users)

### Core Features

The Alleato PM API provides comprehensive functionality for construction project management:

#### 🏢 Project Management

- Create and manage construction projects
- Track project status and timelines
- Manage project settings and metadata
- Handle project archiving and lifecycle

#### 👥 Directory Management

- Manage project team members and contacts
- Handle user permissions and roles
- Organize people by companies and groups
- Support user invitations and access control

#### 💰 Budget Tracking

- Create and manage budget line items
- Track budget modifications and changes
- Monitor committed vs actual costs
- Generate budget forecasts and variance reports
- Support multiple budget views and customization

#### 🔄 Change Management

- Create and track change events
- Manage change order workflows
- Handle line items and cost impacts
- Support document attachments and approvals

#### 📋 Contract Management

- Manage prime contracts and subcontracts
- Track contract change orders
- Handle commitment workflows
- Support contract line items and billing

#### 📊 Cost Tracking

- Record and categorize direct costs
- Track vendor invoices and payments
- Support bulk cost imports
- Generate cost reports and exports

#### 📅 Scheduling (Coming Soon)

- Task management and dependencies
- Schedule tracking and updates
- Resource allocation
- Timeline visualization

### Supported Operations

| Resource | Create | Read | Update | Delete | Bulk Operations |
|----------|---------|------|---------|---------|-----------------|
| Projects | ✅ | ✅ | ✅ | ✅ | ✅ (List/Filter) |
| Directory People | ✅ | ✅ | ✅ | ✅ | ✅ (Invite/Update) |
| Budget Lines | ✅ | ✅ | ✅ | ❌ | ✅ (Import/Export) |
| Change Events | ✅ | ✅ | ✅ | ❌ | ✅ (List/Filter) |
| Contracts | ✅ | ✅ | ✅ | ❌ | ✅ (List/Filter) |
| Direct Costs | ✅ | ✅ | ✅ | ✅ | ✅ (Bulk Create/Export) |

## 🔐 Authentication Quick Reference

### Getting Started with Auth

1. **Login to get access token**:

   ```javascript
   const { data } = await supabase.auth.signInWithPassword({
     email: 'user@example.com',
     password: 'password'
   })
   const accessToken = data.session.access_token
   ```bash
2. **Use token in API requests**:

   ```javascript
   const response = await fetch('/api/projects', {
     headers: {
       'Authorization': `Bearer ${accessToken}`,
       'Content-Type': 'application/json'
     }
   })
   ```text
3. **Handle token refresh**:

   ```javascript
   if (response.status === 401) {
     await supabase.auth.refreshSession()
     // Retry request with new token
   }
   ```

## 📋 Common API Patterns

### Standard Response Formats

**Single Resource**:

```json
{
  "id": "uuid-or-number",
  "name": "Resource Name",
  "created_at": "2024-01-31T10:00:00Z",
  "updated_at": "2024-01-31T15:30:00Z"
}
```
**List Resources**:
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```
**Error Response**:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": "Additional context"
}
```
### Query Parameters

**Pagination**:
- `page` - Page number (1-indexed)
- `limit` - Items per page (max 100)

**Filtering**:
- `search` - Search term
- `status` - Filter by status
- `type` - Filter by type
- `date_from`, `date_to` - Date range

**Sorting**:
- `sort` - Sort field(s)
- `order` - Sort direction (`asc`, `desc`)

## 🛠️ Development Resources

### Code Examples

**JavaScript/TypeScript**:
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lgveqfnpkxvzbnnwuled.supabase.co',
  'your-anon-key'
)

class AlleatoPMAPI {
  constructor(accessToken) {
    this.token = accessToken
    this.baseURL = 'https://alleato-pm.vercel.app/api'
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`API Error: ${error.error}`)
    }

    return response.json()
  }
}
```

**Python**:

```python
import requests

class AlleatoPMAPI:
    def __init__(self, access_token):
        self.token = access_token
        self.base_url = 'https://alleato-pm.vercel.app/api'
        self.headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

    def request(self, endpoint, method='GET', data=None):
        url = f'{self.base_url}{endpoint}'
        response = requests.request(
            method,
            url,
            headers=self.headers,
            json=data
        )
        response.raise_for_status()
        return response.json()

# Usage
api = AlleatoPMAPI('your-access-token')
projects = api.request('/projects')
```
**cURL**:
```bash
# List projects
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://alleato-pm.vercel.app/api/projects

# Create project
curl -X POST https://alleato-pm.vercel.app/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Project",
    "job_number": "NP-001",
    "budget": 500000
  }'
```
### SDK Generation

Generate client SDKs from our OpenAPI specification:

**OpenAPI Generator**:

```bash
# Install
npm install @openapitools/openapi-generator-cli -g

# Generate TypeScript client
openapi-generator-cli generate \
  -i alleato-pm-api-v1.yaml \
  -g typescript-fetch \
  -o ./generated-client

# Generate Python client
openapi-generator-cli generate \
  -i alleato-pm-api-v1.yaml \
  -g python \
  -o ./python-client
```
## 📚 Learning Path

### For New Developers

1. **Start**: [Quick Start Guide](./quick-start.md)
2. **Learn**: [Authentication & Security](./authentication-security.md)
3. **Practice**: [Usage Examples](./usage-examples.md)
4. **Reference**: [API Reference Guide](./api-reference-guide.md)

### For Experienced Developers

1. **Overview**: [API Reference Guide](./api-reference-guide.md)
2. **Data Models**: [Schema Definitions](./schema-definitions.md)
3. **Security**: [Authentication & Security](./authentication-security.md)
4. **Testing**: [Postman Collection](./postman-collection.md)

### For System Integrators

1. **Specification**: [OpenAPI YAML](./alleato-pm-api-v1.yaml)
2. **Authentication**: [Authentication & Security](./authentication-security.md)
3. **Workflows**: [Usage Examples](./usage-examples.md)
4. **Testing**: [Postman Collection](./postman-collection.md)

## 🔄 API Workflows

### Common Integration Patterns

#### 1. Project Setup Workflow
```

Create Project → Add Team Members → Setup Budget → Activate Project

```
#### 2. Change Management Workflow
```bash
Create Change Event → Add Line Items → Upload Docs → Submit for Approval

```
#### 3. Cost Tracking Workflow
```

Record Direct Costs → Categorize by Cost Code → Update Budget → Generate Reports

```
#### 4. Reporting Workflow
```bash
List Projects → Get Budget Status → Export Data → Generate Dashboard

```

## 📊 API Metrics & Limits

### Rate Limits

| User Type | Requests/Hour | Burst Limit |
|-----------|---------------|-------------|
| Unauthenticated | 100 | 10/minute |
| Authenticated | 1,000 | 100/minute |
| Admin | 2,000 | 200/minute |

### Response Limits

| Resource | Max Page Size | Export Limit |
|----------|---------------|--------------|
| Projects | 100 | 10,000 |
| Budget Lines | 1,000 | 50,000 |
| Directory People | 100 | 5,000 |
| Change Events | 100 | 10,000 |

### File Upload Limits

| File Type | Max Size | Allowed Extensions |
|-----------|----------|-------------------|
| Documents | 50MB | pdf, doc, docx, xls, xlsx |
| Images | 10MB | jpg, jpeg, png, gif |
| Drawings | 100MB | dwg, pdf, jpg, png |

## 🆘 Support & Resources

### Documentation

- **API Reference**: Complete endpoint documentation
- **Schema Definitions**: Data models and types
- **Usage Examples**: Real-world code samples
- **Quick Start**: Get started in minutes

### Tools

- **Postman Collection**: Interactive API testing
- **OpenAPI Spec**: Machine-readable documentation
- **TypeScript Types**: Full type safety

### Community

- **Support Email**: <api-support@alleato.com>
- **Status Page**: [status.alleato.com](https://status.alleato.com)
- **GitHub Issues**: Report bugs and request features
- **Developer Forum**: Connect with other developers

### Updates

- **API Changelog**: Track changes and deprecations
- **Breaking Changes**: 30-day notice for breaking changes
- **New Features**: Regular feature announcements
- **SDK Updates**: Automatic client library updates

## 🔮 Roadmap

### Coming Soon

- **WebSocket API**: Real-time updates and notifications
- **GraphQL Endpoint**: Flexible data querying
- **Batch Operations**: Improved bulk operations
- **Advanced Reporting**: Custom report generation
- **Mobile SDKs**: Native iOS and Android clients

### In Development

- **Scheduling API**: Complete task and timeline management
- **Document AI**: Automated document processing
- **Cost Forecasting**: Predictive budget analysis
- **Integration Hub**: Pre-built integrations with popular tools

---

## Quick Navigation

| Need | Go To |
|------|-------|
| **First time using the API** | [Quick Start Guide](./quick-start.md) |
| **Setting up authentication** | [Authentication & Security](./authentication-security.md) |
| **Looking for specific endpoints** | [API Reference Guide](./api-reference-guide.md) |
| **Need data structure info** | [Schema Definitions](./schema-definitions.md) |
| **Want code examples** | [Usage Examples](./usage-examples.md) |
| **Testing the API** | [Postman Collection](./postman-collection.md) |
| **Generating an SDK** | [OpenAPI Specification](./alleato-pm-api-v1.yaml) |

---

**API Version**: 1.0.0
**Last Updated**: January 31, 2024
**Next Update**: February 2024
