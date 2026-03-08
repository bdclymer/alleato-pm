# Quick Start Guide

Get up and running with the Alleato PM API in minutes.

## Prerequisites

- A Supabase account and project
- Valid Alleato PM user account
- Node.js 16+ (for JavaScript examples)
- curl or similar HTTP client

## 1. Get Your Access Token

### Method 1: Using Supabase JavaScript Client

```bash
npm install @supabase/supabase-js
```
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lgveqfnpkxvzbnnwuled.supabase.co',
  'YOUR_SUPABASE_ANON_KEY'
)

// Login to get access token
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'your-email@example.com',
  password: 'your-password'
})

if (error) {
  console.error('Login failed:', error.message)
} else {
  console.log('Access token:', data.session.access_token)
  // Use this token for API calls
}
```
### Method 2: Direct API Call

```bash
curl -X POST https://lgveqfnpkxvzbnnwuled.supabase.co/auth/v1/token?grant_type=password \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```
## 2. Make Your First API Call

### Test with curl

```bash
# Replace YOUR_ACCESS_TOKEN with the token from step 1
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     https://alleato-pm.vercel.app/api/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-31T10:00:00Z",
  "version": "1.0.0"
}
```
### Test with JavaScript

```javascript
const API_BASE = 'https://alleato-pm.vercel.app/api'
const accessToken = 'your-access-token-here'

async function testAPI() {
  const response = await fetch(`${API_BASE}/health`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  const data = await response.json()
  console.log('API Status:', data)
}

testAPI()
```
## 3. List Your Projects

```javascript
async function getProjects() {
  const response = await fetch(`${API_BASE}/projects`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const projects = await response.json()
  console.log('Your projects:', projects)
  return projects
}
```
### With curl

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     https://alleato-pm.vercel.app/api/projects
```

## 4. Create Your First Project

```javascript
async function createProject() {
  const projectData = {
    name: "My First Project",
    job_number: "DEMO-001",
    description: "Demo project via API",
    budget: 100000,
    state: "planning"
  }

  const response = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(projectData)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to create project: ${error.error}`)
  }

  const project = await response.json()
  console.log('Created project:', project)
  return project
}
```
### With curl

```bash
curl -X POST https://alleato-pm.vercel.app/api/projects \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Project",
    "job_number": "DEMO-001",
    "description": "Demo project via API",
    "budget": 100000,
    "state": "planning"
  }'
```
## 5. Add People to Project Directory

```javascript
async function addPersonToProject(projectId) {
  const personData = {
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
    person_type: "user",
    title: "Project Manager"
  }

  const response = await fetch(`${API_BASE}/projects/${projectId}/directory/people`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(personData)
  })

  const person = await response.json()
  console.log('Added person:', person)
  return person
}
```
## 6. Create Budget Line Items

```javascript
async function createBudget(projectId) {
  const budgetData = {
    lineItems: [
      {
        costCodeId: "01100",
        amount: 50000,
        description: "General Conditions"
      },
      {
        costCodeId: "03000",
        amount: 150000,
        description: "Concrete Work"
      }
    ]
  }

  const response = await fetch(`${API_BASE}/projects/${projectId}/budget`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(budgetData)
  })

  const result = await response.json()
  console.log('Budget created:', result)
  return result
}
```

## Complete Example: Full Workflow

Here's a complete example that demonstrates the full workflow:

```javascript
import { createClient } from '@supabase/supabase-js'

class AlleatoPMClient {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.apiBase = 'https://alleato-pm.vercel.app/api'
    this.accessToken = null
  }

  async login(email, password) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      throw new Error(`Login failed: ${error.message}`)
    }

    this.accessToken = data.session.access_token
    console.log('✅ Logged in successfully')
    return data.session
  }

  async apiCall(endpoint, options = {}) {
    const url = `${this.apiBase}${endpoint}`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
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

  async createFullProject() {
    try {
      // 1. Create project
      const project = await this.apiCall('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: "Complete Demo Project",
          job_number: "CDP-001",
          description: "Full workflow demonstration",
          budget: 500000,
          state: "planning"
        })
      })
      console.log('✅ Project created:', project.name)

      // 2. Add team members
      const teamMembers = [
        {
          first_name: "Alice",
          last_name: "Johnson",
          email: "alice@example.com",
          person_type: "user",
          title: "Project Manager"
        },
        {
          first_name: "Bob",
          last_name: "Smith",
          email: "bob@contractor.com",
          person_type: "contact",
          title: "Site Supervisor"
        }
      ]

      for (const member of teamMembers) {
        await this.apiCall(`/projects/${project.id}/directory/people`, {
          method: 'POST',
          body: JSON.stringify(member)
        })
        console.log(`✅ Added team member: ${member.first_name} ${member.last_name}`)
      }

      // 3. Create budget
      const budget = await this.apiCall(`/projects/${project.id}/budget`, {
        method: 'POST',
        body: JSON.stringify({
          lineItems: [
            {
              costCodeId: "01100",
              amount: 75000,
              description: "General Conditions"
            },
            {
              costCodeId: "02200",
              amount: 50000,
              description: "Site Preparation"
            },
            {
              costCodeId: "03000",
              amount: 200000,
              description: "Concrete Work"
            }
          ]
        })
      })
      console.log('✅ Budget created with', budget.data.length, 'line items')

      // 4. Create change event
      const changeEvent = await this.apiCall(`/projects/${project.id}/change-events`, {
        method: 'POST',
        body: JSON.stringify({
          title: "Foundation Design Change",
          type: "Design Change",
          scope: "Out of Scope",
          origin: "Field",
          description: "Modify foundation due to soil conditions",
          expecting_revenue: true
        })
      })
      console.log('✅ Change event created:', changeEvent.number)

      // 5. Update project to active
      const activeProject = await this.apiCall(`/projects/${project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ state: "active" })
      })
      console.log('✅ Project activated:', activeProject.state)

      return {
        project: activeProject,
        budget,
        changeEvent
      }

    } catch (error) {
      console.error('❌ Workflow failed:', error.message)
      throw error
    }
  }
}

// Usage
async function main() {
  const client = new AlleatoPMClient(
    'https://lgveqfnpkxvzbnnwuled.supabase.co',
    'YOUR_SUPABASE_ANON_KEY'
  )

  try {
    await client.login('your-email@example.com', 'your-password')
    const result = await client.createFullProject()

    console.log('\n🎉 Complete workflow finished!')
    console.log(`Project ID: ${result.project.id}`)
    console.log(`Change Event ID: ${result.changeEvent.id}`)

  } catch (error) {
    console.error('Failed:', error.message)
  }
}

main()
```
## Error Handling Best Practices

### 1. Handle Different Error Types

```javascript
async function robustAPICall(endpoint, options) {
  try {
    const response = await fetch(endpoint, options)

    // Handle HTTP errors
    if (!response.ok) {
      const error = await response.json()

      switch (response.status) {
        case 401:
          throw new Error('Authentication required. Please login again.')
        case 403:
          throw new Error('Permission denied. Check your access rights.')
        case 404:
          throw new Error('Resource not found.')
        case 429:
          throw new Error('Rate limit exceeded. Please try again later.')
        default:
          throw new Error(`API Error: ${error.error}`)
      }
    }

    return response.json()
  } catch (error) {
    if (error.name === 'TypeError') {
      throw new Error('Network error. Please check your connection.')
    }
    throw error
  }
}
```
### 2. Automatic Token Refresh

```javascript
class APIClient {
  constructor(supabase) {
    this.supabase = supabase
    this.accessToken = null
    this.tokenExpiry = null
  }

  async ensureValidToken() {
    const now = Date.now()

    // Refresh if token expires within 5 minutes
    if (!this.accessToken || (this.tokenExpiry && now >= this.tokenExpiry - 300000)) {
      const { data } = await this.supabase.auth.getSession()

      if (data.session) {
        this.accessToken = data.session.access_token
        this.tokenExpiry = data.session.expires_at * 1000
      } else {
        throw new Error('No valid session found')
      }
    }
  }

  async request(endpoint, options = {}) {
    await this.ensureValidToken()

    return fetch(endpoint, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
  }
}
```
## Environment Setup

### Development Environment

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://lgveqfnpkxvzbnnwuled.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ALLEATO_API_BASE_URL=http://localhost:3000/api
```

### Production Environment

```bash
# .env.production
NEXT_PUBLIC_SUPABASE_URL=https://lgveqfnpkxvzbnnwuled.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ALLEATO_API_BASE_URL=https://alleato-pm.vercel.app/api
```
## Testing Your Integration

### Simple Health Check Test

```bash
#!/bin/bash
# test-api.sh

TOKEN="your-access-token-here"
BASE_URL="https://alleato-pm.vercel.app/api"

echo "Testing API health..."
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/health" | jq '.'

echo "Testing project list..."
curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/projects?limit=5" | jq '.data | length'

echo "API test complete!"
```
### JavaScript Integration Test

```javascript
// test-integration.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

async function runIntegrationTest() {
  try {
    console.log('🧪 Running integration test...')

    // Login
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_EMAIL,
      password: process.env.TEST_PASSWORD
    })

    const token = authData.session.access_token

    // Test API endpoints
    const endpoints = [
      '/health',
      '/projects',
      '/projects?limit=1'
    ]

    for (const endpoint of endpoints) {
      const response = await fetch(`${process.env.API_BASE_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        console.log(`✅ ${endpoint}`)
      } else {
        console.log(`❌ ${endpoint}: ${response.status}`)
      }
    }

    console.log('🎉 Integration test complete!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

runIntegrationTest()
```

## Next Steps

1. **Explore the API**: Check out the [API Reference Guide](./api-reference-guide.md) for complete endpoint documentation
2. **Authentication**: Read the [Authentication & Security](./authentication-security.md) guide for advanced auth patterns
3. **Examples**: See [Usage Examples](./usage-examples.md) for more complex workflows
4. **Schemas**: Reference [Schema Definitions](./schema-definitions.md) for complete data models

## Need Help?

- 📖 [Full API Documentation](./api-reference-guide.md)
- 🔧 [Usage Examples](./usage-examples.md)
- 🔒 [Security Guide](./authentication-security.md)
- 💬 Support: <api-support@alleato.com>

---

**Last Updated**: January 31, 2024
