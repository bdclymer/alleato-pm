# API Usage Examples

This guide provides practical examples for common API usage patterns and workflows in the Alleato PM API.

## Quick Start

### 1. Authentication Setup

```javascript
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
)

// Login to get access token
const { data: authData, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'your-password'
})

if (error) {
  console.error('Login failed:', error.message)
  return
}

const accessToken = authData.session.access_token
```
### 2. Making API Requests

```javascript
// Base API URL
const API_BASE_URL = 'https://alleato-pm.vercel.app/api'

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
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
```
## Common Workflows

### Project Management

#### 1. Create a New Project

```javascript
async function createProject() {
  try {
    const projectData = {
      name: "Downtown Office Building",
      job_number: "DOB-2024-001",
      description: "Modern 10-story office building",
      address: "123 Business District, City, State",
      budget: 5000000,
      start_date: "2024-03-01",
      estimated_completion_date: "2025-06-30"
    }

    const project = await apiCall('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData)
    })

    console.log('Project created:', project)
    return project
  } catch (error) {
    console.error('Failed to create project:', error.message)
  }
}
```
#### 2. List All Projects with Filters

```javascript
async function getActiveProjects() {
  try {
    const projects = await apiCall('/projects?state=active&limit=20&page=1')

    console.log(`Found ${projects.meta.total} active projects`)

    projects.data.forEach(project => {
      console.log(`- ${project.name} (${project.job_number})`)
    })

    return projects
  } catch (error) {
    console.error('Failed to fetch projects:', error.message)
  }
}
```

#### 3. Update Project Status

```javascript
async function completeProject(projectId) {
  try {
    const updates = {
      state: "completed",
      actual_completion_date: new Date().toISOString().split('T')[0]
    }

    const project = await apiCall(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    })

    console.log('Project completed:', project.name)
    return project
  } catch (error) {
    console.error('Failed to update project:', error.message)
  }
}
```
### Directory Management

#### 1. Add People to Project Directory

```javascript
async function addPersonToProject(projectId) {
  try {
    const personData = {
      first_name: "Sarah",
      last_name: "Johnson",
      email: "sarah@contractor.com",
      phone: "+1-555-0123",
      person_type: "user",
      title: "Site Supervisor",
      company_id: "company-uuid-here"
    }

    const person = await apiCall(`/projects/${projectId}/directory/people`, {
      method: 'POST',
      body: JSON.stringify(personData)
    })

    console.log('Person added to directory:', person)
    return person
  } catch (error) {
    console.error('Failed to add person:', error.message)
  }
}
```
#### 2. Search Directory with Filters

```javascript
async function searchProjectDirectory(projectId, searchTerm) {
  try {
    const query = new URLSearchParams({
      search: searchTerm,
      type: 'user',
      status: 'active',
      sort: 'last_name,first_name'
    })

    const result = await apiCall(`/projects/${projectId}/directory/people?${query}`)

    console.log(`Found ${result.data.length} people matching "${searchTerm}"`)

    result.data.forEach(person => {
      console.log(`- ${person.first_name} ${person.last_name} (${person.email})`)
    })

    return result
  } catch (error) {
    console.error('Directory search failed:', error.message)
  }
}
```
#### 3. Bulk Actions on Directory

```javascript
async function inviteMultiplePeople(projectId, personIds) {
  try {
    const invitePromises = personIds.map(personId =>
      apiCall(`/projects/${projectId}/directory/people/${personId}/invite`, {
        method: 'POST'
      })
    )

    const results = await Promise.allSettled(invitePromises)

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`Invites sent: ${successful} successful, ${failed} failed`)

    return results
  } catch (error) {
    console.error('Bulk invite failed:', error.message)
  }
}
```

### Budget Management

#### 1. Get Complete Budget Data

```javascript
async function getBudgetSummary(projectId) {
  try {
    const budget = await apiCall(`/projects/${projectId}/budget`)

    console.log('Budget Summary:')
    console.log(`- Original Budget: $${budget.grandTotals.originalBudgetAmount.toLocaleString()}`)
    console.log(`- Revised Budget: $${budget.grandTotals.revisedBudget.toLocaleString()}`)
    console.log(`- Committed: $${budget.grandTotals.committedCosts.toLocaleString()}`)
    console.log(`- Actual Costs: $${budget.grandTotals.jobToDateCostDetail.toLocaleString()}`)
    console.log(`- Projected Over/Under: $${budget.grandTotals.projectedOverUnder.toLocaleString()}`)

    return budget
  } catch (error) {
    console.error('Failed to get budget:', error.message)
  }
}
```
#### 2. Create Budget Line Items

```javascript
async function createBudgetLineItems(projectId) {
  try {
    const budgetData = {
      lineItems: [
        {
          costCodeId: "01100",
          costType: "Labor",
          amount: 250000,
          description: "General Conditions - Labor",
          qty: 100,
          uom: "hours",
          unitCost: 2500
        },
        {
          costCodeId: "01100",
          costType: "Equipment",
          amount: 75000,
          description: "General Conditions - Equipment",
          qty: 5,
          uom: "months",
          unitCost: 15000
        }
      ]
    }

    const result = await apiCall(`/projects/${projectId}/budget`, {
      method: 'POST',
      body: JSON.stringify(budgetData)
    })

    console.log(result.message)
    console.log(`Total budget added: $${result.totalBudget.toLocaleString()}`)

    return result
  } catch (error) {
    console.error('Failed to create budget lines:', error.message)
  }
}
```
#### 3. Work with Budget Views

```javascript
async function manageBudgetViews(projectId) {
  try {
    // Get existing views
    const views = await apiCall(`/projects/${projectId}/budget/views`)
    console.log(`Found ${views.length} budget views`)

    // Create custom view
    const newViewData = {
      name: "Cost Control View",
      description: "Focus on cost tracking and variances",
      columns: [
        {
          field_name: "cost_code",
          display_name: "Cost Code",
          width: 100,
          visible: true,
          sort_order: 1
        },
        {
          field_name: "description",
          display_name: "Description",
          width: 200,
          visible: true,
          sort_order: 2
        },
        {
          field_name: "revised_budget",
          display_name: "Revised Budget",
          width: 120,
          visible: true,
          sort_order: 3
        },
        {
          field_name: "committed_costs",
          display_name: "Committed",
          width: 120,
          visible: true,
          sort_order: 4
        },
        {
          field_name: "projected_over_under",
          display_name: "Variance",
          width: 120,
          visible: true,
          sort_order: 5
        }
      ]
    }

    const newView = await apiCall(`/projects/${projectId}/budget/views`, {
      method: 'POST',
      body: JSON.stringify(newViewData)
    })

    console.log('Created budget view:', newView.name)
    return newView
  } catch (error) {
    console.error('Budget view operations failed:', error.message)
  }
}
```
### Change Events Management

#### 1. Create and Manage Change Events

```javascript
async function createChangeEvent(projectId) {
  try {
    const changeEventData = {
      title: "HVAC System Upgrade",
      type: "Design Change",
      scope: "Out of Scope",
      origin: "Field",
      reason: "Code compliance requirements",
      description: "Upgrade HVAC system to meet new energy efficiency standards",
      expecting_revenue: true,
      line_item_revenue_source: "Change Order",
      prime_contract_id: 123
    }

    const changeEvent = await apiCall(`/projects/${projectId}/change-events`, {
      method: 'POST',
      body: JSON.stringify(changeEventData)
    })

    console.log(`Created change event ${changeEvent.number}: ${changeEvent.title}`)
    return changeEvent
  } catch (error) {
    console.error('Failed to create change event:', error.message)
  }
}
```

#### 2. Add Line Items to Change Event

```javascript
async function addChangeEventLineItems(projectId, changeEventId) {
  try {
    const lineItems = [
      {
        cost_code_id: "15000",
        description: "HVAC Equipment - High Efficiency Units",
        quantity: 5,
        unit_cost: 8500,
        total_cost: 42500
      },
      {
        cost_code_id: "15000",
        description: "HVAC Installation Labor",
        quantity: 80,
        unit_cost: 125,
        total_cost: 10000
      }
    ]

    const lineItemPromises = lineItems.map(item =>
      apiCall(`/projects/${projectId}/change-events/${changeEventId}/line-items`, {
        method: 'POST',
        body: JSON.stringify(item)
      })
    )

    const results = await Promise.all(lineItemPromises)

    const totalCost = results.reduce((sum, item) => sum + item.total_cost, 0)
    console.log(`Added ${results.length} line items, total cost: $${totalCost.toLocaleString()}`)

    return results
  } catch (error) {
    console.error('Failed to add line items:', error.message)
  }
}
```
### File Attachments

#### 1. Upload Files to Change Events

```javascript
async function uploadChangeEventAttachment(projectId, changeEventId, file) {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('description', 'HVAC specifications document')
    formData.append('category', 'specifications')

    const attachment = await fetch(`${API_BASE_URL}/projects/${projectId}/change-events/${changeEventId}/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
      body: formData
    })

    if (!attachment.ok) {
      throw new Error('Upload failed')
    }

    const result = await attachment.json()
    console.log('File uploaded:', result.filename)
    return result
  } catch (error) {
    console.error('File upload failed:', error.message)
  }
}
```
#### 2. Download Attachments

```javascript
async function downloadAttachment(projectId, changeEventId, attachmentId) {
  try {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/change-events/${changeEventId}/attachments/${attachmentId}/download`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error('Download failed')
    }

    // Get filename from response headers
    const contentDisposition = response.headers.get('content-disposition')
    const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'download'

    // Create blob and download
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    console.log('File downloaded:', filename)
  } catch (error) {
    console.error('Download failed:', error.message)
  }
}
```
## Advanced Patterns

### 1. Pagination Helper

```javascript
async function getAllPages(endpoint, options = {}) {
  const allData = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const query = new URLSearchParams({
      page: page.toString(),
      limit: '100',
      ...options.params
    })

    const result = await apiCall(`${endpoint}?${query}`)

    allData.push(...result.data)

    hasMore = page < result.meta.totalPages
    page++
  }

  return allData
}

// Usage
const allProjects = await getAllPages('/projects', {
  params: { state: 'active' }
})
```

### 2. Batch Operations with Rate Limiting

```javascript
async function batchProcessWithRateLimit(items, processor, batchSize = 5, delay = 1000) {
  const results = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)

    const batchPromises = batch.map(processor)
    const batchResults = await Promise.allSettled(batchPromises)

    results.push(...batchResults)

    // Add delay between batches to respect rate limits
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return results
}

// Usage: Update multiple projects
const projectUpdates = [
  { id: 1, state: 'active' },
  { id: 2, state: 'completed' },
  // ... more updates
]

const updateResults = await batchProcessWithRateLimit(
  projectUpdates,
  async (update) => {
    return apiCall(`/projects/${update.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: update.state })
    })
  },
  3, // 3 requests per batch
  2000 // 2 second delay between batches
)
```
### 3. Error Handling and Retry Logic

```javascript
async function apiCallWithRetry(endpoint, options = {}, maxRetries = 3) {
  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall(endpoint, options)
    } catch (error) {
      lastError = error

      // Don't retry on client errors (4xx)
      if (error.message.includes('400') || error.message.includes('403')) {
        throw error
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000
      console.log(`Request failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`)

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}
```
### 4. Real-time Updates with WebSocket

```javascript
// Note: This is conceptual - actual WebSocket implementation depends on your setup
class RealTimeAPIClient {
  constructor(accessToken) {
    this.token = accessToken
    this.ws = null
    this.subscribers = new Map()
  }

  connect() {
    this.ws = new WebSocket(`wss://alleato-pm.vercel.app/api/monitoring/websocket?token=${this.token}`)

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      // Notify subscribers
      const subscribers = this.subscribers.get(data.type) || []
      subscribers.forEach(callback => callback(data))
    }
  }

  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, [])
    }
    this.subscribers.get(eventType).push(callback)
  }

  // Subscribe to project updates
  subscribeToProject(projectId, callback) {
    this.subscribe('project_update', (data) => {
      if (data.project_id === projectId) {
        callback(data)
      }
    })
  }
}
```
## Performance Optimization

### 1. Request Caching

```javascript
class CachedAPIClient {
  constructor() {
    this.cache = new Map()
    this.cacheTTL = 5 * 60 * 1000 // 5 minutes
  }

  async get(endpoint) {
    const cacheKey = endpoint
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data
    }

    const data = await apiCall(endpoint)
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    })

    return data
  }

  invalidateCache(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

const cachedAPI = new CachedAPIClient()

// Usage
const projects = await cachedAPI.get('/projects')

// Invalidate cache after updates
await apiCall('/projects', { method: 'POST', body: JSON.stringify(newProject) })
cachedAPI.invalidateCache('/projects')
```

### 2. Optimistic Updates

```javascript
async function optimisticUpdate(projectId, updates, updateCallback) {
  // Apply update immediately to UI
  updateCallback(updates)

  try {
    // Make API call
    const result = await apiCall(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    })

    // Confirm update with server response
    updateCallback(result)
    return result
  } catch (error) {
    // Revert on failure
    updateCallback(null) // or previous state
    throw error
  }
}
```
## Testing API Integration

### 1. Unit Tests with Mocking

```javascript
// Using Jest and fetch mock
import { jest } from '@jest/globals'

global.fetch = jest.fn()

describe('API Client', () => {
  beforeEach(() => {
    fetch.mockClear()
  })

  test('should create project successfully', async () => {
    const mockProject = {
      id: 123,
      name: 'Test Project',
      job_number: 'TEST-001'
    }

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProject
    })

    const result = await createProject()

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/projects'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': expect.stringContaining('Bearer')
        })
      })
    )

    expect(result).toEqual(mockProject)
  })
})
```
### 2. Integration Testing

```javascript
// Integration test with real API calls
describe('API Integration', () => {
  let testProjectId

  beforeAll(async () => {
    // Create test project
    const project = await createProject()
    testProjectId = project.id
  })

  afterAll(async () => {
    // Clean up test data
    await apiCall(`/projects/${testProjectId}`, {
      method: 'DELETE'
    })
  })

  test('should manage project lifecycle', async () => {
    // Test project updates
    const updatedProject = await apiCall(`/projects/${testProjectId}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'active' })
    })

    expect(updatedProject.state).toBe('active')

    // Test adding people to directory
    const person = await addPersonToProject(testProjectId)
    expect(person.project_id).toBe(testProjectId)

    // Test budget creation
    const budget = await createBudgetLineItems(testProjectId)
    expect(budget.success).toBe(true)
  })
})
```

---

This guide covers the most common API usage patterns. For more specific examples or advanced use cases, refer to the full API reference documentation or contact support.

**Last Updated**: January 31, 2024
