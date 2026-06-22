# Claude Cache Monitoring Guide

**Last Updated:** 2026-02-02
**Status:** Production Ready

---

## Overview

This guide explains how to monitor and optimize your Claude prompt caching performance using the built-in monitoring system.

**Key Features:**
- ✅ Automatic tracking of all cache requests
- ✅ Real-time performance metrics
- ✅ Cost analysis and savings calculation
- ✅ Historical data storage (JSONL format)
- ✅ Daily/weekly reporting
- ✅ Optimization recommendations

---

## Quick Start

### 1. View Cache Statistics

```bash
npm run cache:stats
```

**Example output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 CLAUDE CACHE PERFORMANCE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 Overall Statistics:
  Total Requests:    47
  Cache Hits:        42 (89.4%)
  Cache Misses:      5

🎯 Token Usage:
  Total Input:       7,285,000 tokens
  Total Output:      56,400 tokens
  Cache Reads:       6,510,000 tokens
  Cache Writes:      775,000 tokens
  Avg Latency:       1,234ms

💰 Cost Analysis:
  Total Cost:        $2.4567
  Estimated Savings: $18.9234
  Savings Rate:      88.5%

📋 By Preset:
  database:
    Requests: 35 | Hit Rate: 91.4%
    Cost: $1.8234 | Savings: $16.2145
  basic:
    Requests: 12 | Hit Rate: 83.3%
    Cost: $0.6333 | Savings: $2.7089

📅 Recent Activity (Last 7 Days):
  2026-02-02: 15 reqs | 93% hits | $0.5234 | saved $4.8923
  2026-02-01: 18 reqs | 89% hits | $0.7123 | saved $6.4521
  2026-01-31: 14 reqs | 86% hits | $0.6210 | saved $5.1234

Last Updated: 2/2/2026, 4:32:15 PM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Recommendations:

✅ Excellent cache hit rate! Your caching strategy is working well.

💰 Great! You've saved $18.92 through caching.
```

### 2. View Recent Requests

```bash
npm run cache:recent
```

**Example output:**
```
📋 Last 10 Cache Events:

✅ HIT  | 2026-02-02T16:32:15.234Z | database
  Read: 155,000 | Write: 0 | Cost: $0.0465
  Context: schedule-task-api-creation

❌ MISS | 2026-02-02T16:28:42.123Z | database
  Read: 0 | Write: 155,000 | Cost: $0.5813
  Context: budget-line-item-migration

✅ HIT  | 2026-02-02T16:25:18.456Z | database
  Read: 155,000 | Write: 0 | Cost: $0.0465
  Context: rls-policy-creation
```

### 3. Export Data for Analysis

```bash
npm run cache:export
```

Creates a JSON file in `.cache-monitor/cache-export-{timestamp}.json` with all historical data.

### 4. Reset Statistics

```bash
npm run cache:reset
```

**⚠️ Warning:** This deletes all historical data. Use with caution.

---

## Automatic Tracking

### Method 1: Use Tracked Wrapper (Recommended)

```typescript
import {
  createCachedClient,
  buildCachedSystemPrompt,
  createTrackedCachedRequest,
  CachePreset
} from './scripts/claude-cache-helper';

const client = createCachedClient();

// Automatically tracks performance
const response = await createTrackedCachedRequest(
  client,
  {
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: buildCachedSystemPrompt(CachePreset.DATABASE),
    messages: [
      { role: 'user', content: 'Create a new API endpoint for schedule tasks' }
    ]
  },
  {
    preset: 'database',
    context: 'schedule-task-api-creation',
    enableMonitoring: true // Default: true
  }
);

// Check your stats
// npm run cache:stats
```

### Method 2: Manual Tracking

```typescript
import { CacheMonitor } from './scripts/cache-monitor';

const monitor = CacheMonitor.getInstance();

// Make your request
const response = await client.messages.create({...});

// Track manually
const event = monitor.createEvent(response.usage, {
  model: 'claude-sonnet-4-5',
  preset: 'database',
  context: 'my-task-description'
});
monitor.recordEvent(event);
```

---

## Understanding the Metrics

### Overall Statistics

| Metric | Description | Good Target |
|--------|-------------|-------------|
| **Total Requests** | Number of API calls made | N/A |
| **Cache Hits** | Requests that used cache | >80% |
| **Cache Misses** | Requests that created cache | <20% |
| **Hit Rate** | Percentage of cache hits | >80% |

### Token Usage

| Metric | Description | Optimization |
|--------|-------------|--------------|
| **Total Input** | All input tokens (including cache) | N/A |
| **Total Output** | All output tokens | N/A |
| **Cache Reads** | Tokens read from cache | Higher is better |
| **Cache Writes** | Tokens written to cache | Should be ~20% of total |
| **Avg Latency** | Time to first token (ms) | <2000ms ideal |

### Cost Analysis

| Metric | Description | Formula |
|--------|-------------|---------|
| **Total Cost** | Actual cost paid | Sum of all requests |
| **Estimated Savings** | Money saved by caching | What you would have paid without cache |
| **Savings Rate** | Percentage saved | `savings / (cost + savings)` |

**Example calculation:**
```
Without cache: 155K tokens × $3/MTok = $0.465
With cache read: 155K tokens × $0.30/MTok = $0.0465
Savings: $0.465 - $0.0465 = $0.4185 (90% savings)
```

---

## Data Storage

### File Locations

```
.cache-monitor/
├── cache-stats.jsonl      # All events (one JSON per line)
└── cache-summary.json     # Aggregated statistics
```

### Event Format (JSONL)

Each line in `cache-stats.jsonl` is a JSON object:

```json
{
  "timestamp": "2026-02-02T16:32:15.234Z",
  "requestId": "req_1706891535234_abc123",
  "model": "claude-sonnet-4-5",
  "preset": "database",
  "cacheReadTokens": 155000,
  "cacheWriteTokens": 0,
  "inputTokens": 50,
  "outputTokens": 1200,
  "cacheHit": true,
  "cost": 0.0465,
  "latency": 1234,
  "context": "schedule-task-api-creation"
}
```

### Summary Format (JSON)

```json
{
  "totalRequests": 47,
  "cacheHits": 42,
  "cacheMisses": 5,
  "hitRate": 0.894,
  "totalCost": 2.4567,
  "estimatedSavings": 18.9234,
  "totalTokensRead": 6510000,
  "totalTokensWritten": 775000,
  "byPreset": {
    "database": {
      "requests": 35,
      "hits": 32,
      "hitRate": 0.914,
      "cost": 1.8234,
      "savings": 16.2145
    }
  },
  "byDay": {
    "2026-02-02": {
      "date": "2026-02-02",
      "requests": 15,
      "hits": 14,
      "cost": 0.5234,
      "savings": 4.8923
    }
  }
}
```

---

## Performance Optimization

### When Hit Rate is Low (<50%)

**Possible causes:**
1. Content is not truly static (timestamps, random IDs, etc.)
2. Requests are >5 minutes apart (cache expired)
3. Inconsistent cache breakpoint placement
4. Tool definitions or images changing between requests

**Solutions:**
```typescript
// ❌ BAD - Dynamic content breaks cache
const system = `${CLAUDE_MD}\n\n<!-- Generated at ${Date.now()} -->`;

// ✅ GOOD - Static content enables caching
const system = CLAUDE_MD;
```

### When Hit Rate is High (>90%)

**You're doing great! Consider:**
- Using 1-hour TTL for long-running sessions
- Expanding cache to include more context (PRPs, docs)
- Documenting your strategy for team members

### When Costs Are High

**Check:**
1. Are you caching too much content?
2. Is cache content >200K tokens?
3. Are you getting cache hits?

**Optimization:**
```typescript
// Only cache what you need
if (taskType === 'database-work') {
  // Include DB types
  buildCachedSystemPrompt(CachePreset.DATABASE);
} else {
  // Skip DB types to reduce cache size
  buildCachedSystemPrompt(CachePreset.BASIC);
}
```

---

## Automated Recommendations

The monitoring system provides automatic recommendations:

### Example Recommendations

**Low hit rate:**
```
⚠️  Cache hit rate is below 50%. Check if:
   - Content is truly static (no timestamps/random IDs)
   - Requests are within 5-minute TTL window
   - Cache breakpoints are consistently placed
```

**High cache writes:**
```
💡 High cache write volume detected. Consider:
   - Using 1-hour TTL for long-running sessions
   - Splitting large context into smaller sections
   - Removing unnecessary cached content
```

**Significant savings:**
```
💰 Great! You've saved $18.92 through caching.
```

---

## Integration with CI/CD

### Track Cache Performance in CI

```yaml
# .github/workflows/test.yml
- name: Run tests with cache monitoring
  run: |
    npm run test
    npm run cache:stats

- name: Upload cache stats
  uses: actions/upload-artifact@v3
  with:
    name: cache-stats
    path: .cache-monitor/
```

### Weekly Reports

```bash
#!/bin/bash
# scripts/weekly-cache-report.sh

echo "📊 Weekly Cache Performance Report"
echo "==================================="
echo ""

npm run cache:stats

# Email the report
npm run cache:export
# ... send email with exported data
```

---

## Troubleshooting

### No Data Showing

**Possible causes:**
1. Monitoring not enabled (`enableMonitoring: false`)
2. Using unwrapped API calls
3. Monitor directory doesn't exist

**Solution:**
```typescript
// Ensure monitoring is enabled
const response = await createTrackedCachedRequest(
  client,
  {...},
  { enableMonitoring: true } // Explicitly enable
);
```

### Inaccurate Cost Estimates

**Note:** Cost estimates use Sonnet 4.5 pricing by default.

**For different models:**
```typescript
// Update pricing in cache-monitor.ts
const BASE_INPUT_PRICE = 15.0 / 1_000_000; // For Opus
```

### Missing Events

**Cause:** Events are written to JSONL file immediately, but summary updates may be delayed.

**Solution:** Check `cache-stats.jsonl` directly:
```bash
tail -20 .cache-monitor/cache-stats.jsonl
```

---

## Advanced Analytics

### Export to Spreadsheet

```bash
npm run cache:export

# Convert JSONL to CSV (requires jq)
cat .cache-monitor/cache-stats.jsonl | \
  jq -r '[.timestamp, .preset, .cacheHit, .cost] | @csv' > cache-data.csv
```

### Analyze by Context

```bash
# Find all budget-related requests
cat .cache-monitor/cache-stats.jsonl | \
  jq 'select(.context | contains("budget"))'
```

### Calculate ROI

```typescript
const { summary } = monitor.exportData();

const roi = summary.estimatedSavings / summary.totalCost;
console.log(`ROI: ${(roi * 100).toFixed(0)}% return on caching investment`);
```

---

## Best Practices

### ✅ DO

- **Track all requests** - Enable monitoring by default
- **Use descriptive contexts** - Makes analysis easier
- **Review stats weekly** - Identify trends and issues
- **Export data monthly** - Keep historical records
- **Share stats with team** - Demonstrate value of caching

### ❌ DON'T

- **Reset stats frequently** - You lose historical data
- **Ignore low hit rates** - Investigate and fix causes
- **Cache without monitoring** - You can't optimize what you don't measure
- **Skip preset labels** - Makes analysis harder

---

## FAQ

### How much disk space does monitoring use?

**Typical usage:** ~1KB per request

**Example:** 1,000 requests = ~1MB of data

### Does monitoring affect performance?

**No.** Monitoring is asynchronous and writes to disk after the API call completes.

### Can I disable monitoring for specific requests?

**Yes:**
```typescript
const response = await createTrackedCachedRequest(
  client,
  {...},
  { enableMonitoring: false } // Disable for this request
);
```

### How long should I keep historical data?

**Recommended:** 30-90 days

Export and archive older data if needed for long-term analysis.

---

## Next Steps

1. **Start tracking** - Use `createTrackedCachedRequest()` in your code
2. **Review daily** - Check `npm run cache:stats` each day
3. **Optimize** - Follow recommendations to improve hit rate
4. **Share results** - Show cost savings to stakeholders

---

## Support

- **Monitoring code:** [scripts/cache-monitor.ts](../../../scripts/cache-monitor.ts)
- **Helper code:** [scripts/claude-cache-helper.ts](../../../scripts/claude-cache-helper.ts)
- **Strategy:** [CLAUDE-CACHING-STRATEGY.md](./CLAUDE-CACHING-STRATEGY.md)

---

## Changelog

- **2026-02-02**: Initial monitoring system created
  - Automatic event tracking
  - Performance metrics
  - Cost analysis
  - Recommendations engine
