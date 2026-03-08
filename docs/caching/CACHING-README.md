# Claude Prompt Caching - Implementation Guide

**Status:** Ready to implement
**Created:** 2026-02-02
**Estimated Savings:** 78-90% on input token costs for repeated context

---

## Overview

This directory contains everything needed to implement Claude's prompt caching for the Alleato-Procore project.

### What's Included

1. **[CACHING-QUICK-REFERENCE.md](./CACHING-QUICK-REFERENCE.md)** - Quick lookup for common patterns
2. **[../docs-ai/contents/docs/CLAUDE-CACHING-STRATEGY.md](../docs-ai/contents/docs/CLAUDE-CACHING-STRATEGY.md)** - Full strategy document
3. **[../scripts/claude-cache-helper.ts](../scripts/claude-cache-helper.ts)** - TypeScript utilities for caching

---

## Quick Start (5 Minutes)

### 1. Install Dependencies

```bash
npm install @anthropic-ai/sdk
```

### 2. Set API Key

```bash
export ANTHROPIC_API_KEY="your-api-key"
# Or add to .env file
```

### 3. Use the Helper

```typescript
import {
  buildCachedSystemPrompt,
  createCachedClient,
  CachePreset,
  calculateCacheStats,
  logCacheStats
} from './scripts/claude-cache-helper';

const client = createCachedClient();

// For database work (most common)
const response = await client.messages.create({
  model: 'claude-sonnet-4-5',
  max_tokens: 4096,
  system: buildCachedSystemPrompt(CachePreset.DATABASE),
  messages: [
    { role: 'user', content: 'Create a new schedule task API endpoint' }
  ]
});

// Monitor performance
const stats = calculateCacheStats(response.usage);
logCacheStats(stats);
```

**Expected output:**
```
📊 Cache Performance:
  ❌ Cache MISS (creating new cache)
  Cache read:  0 tokens
  Cache write: 155,000 tokens
  New input:   50 tokens
  Output:      1,200 tokens
  Total input: 155,050 tokens
  Est. cost:   $0.5993
```

**Next request (within 5 min):**
```
📊 Cache Performance:
  ✅ Cache HIT
  Cache read:  155,000 tokens
  Cache write: 0 tokens
  New input:   50 tokens
  Output:      1,200 tokens
  Total input: 155,050 tokens
  Est. cost:   $0.0645
  💰 Saved ~100% on input tokens
```

---

## How It Works

### The 3-Layer Cache Strategy

```
┌─────────────────────────────────────┐
│ Layer 1: CLAUDE.md (~4.5K tokens)   │ ← Core instructions
│ Cache Control: ephemeral            │   Changes: Monthly
├─────────────────────────────────────┤
│ Layer 2: Rules (~15K tokens)        │ ← Mandatory gates
│ Cache Control: ephemeral            │   Changes: Weekly
├─────────────────────────────────────┤
│ Layer 3: DB Types (~136K tokens)    │ ← Schema (optional)
│ Cache Control: ephemeral            │   Changes: Per migration
└─────────────────────────────────────┘
Total: ~155K tokens cached
```

### What Gets Cached

**✅ ALWAYS:**
- CLAUDE.md (core instructions)
- .claude/rules/*.md (mandatory gates)

**✅ IF DATABASE WORK:**
- frontend/src/types/database.types.ts

**✅ IF IMPLEMENTING FEATURE:**
- Relevant PRP document

**❌ NEVER:**
- Git status (changes constantly)
- Current code being edited
- Real-time test results

---

## Cache Presets

### Basic (No Database Work)
```typescript
buildCachedSystemPrompt(CachePreset.BASIC)
```
**Use for:** Documentation, frontend-only, non-DB tasks
**Tokens cached:** ~19,500

### Database (Most Common)
```typescript
buildCachedSystemPrompt(CachePreset.DATABASE)
```
**Use for:** API endpoints, migrations, DB queries, most CRUD work
**Tokens cached:** ~155,500

### Custom (With PRP or Additional Context)
```typescript
const prpContent = readFileSync('docs-ai/contents/docs/PRPs/my-feature.md', 'utf-8');
buildCachedSystemPrompt(CachePreset.CUSTOM, prpContent)
```
**Use for:** Feature implementations, scaffolding, multi-step workflows
**Tokens cached:** ~155,500 + PRP size

---

## Cost Comparison

### Scenario: 10 Database Tasks in One Session

**Without Caching:**
```
10 requests × 155K tokens = 1.55M input tokens
Cost: 1.55M × $3/MTok = $4.65
```

**With Caching:**
```
Request 1: 155K write tokens × $3.75/MTok = $0.58
Requests 2-10: 9 × 155K read tokens × $0.30/MTok = $0.42
Total: $1.00 (78% savings)
```

**Additional Benefits:**
- ⚡ Faster responses (cache hits skip processing)
- 📊 Cache hits don't count against rate limits
- 🎯 Consistent context across all requests

---

## Multi-Turn Conversations

For agent workflows with multiple back-and-forth exchanges:

```typescript
import { cacheConversationHistory } from './scripts/claude-cache-helper';

let messages: MessageParam[] = [];

// Turn 1
const response1 = await client.messages.create({
  model: 'claude-sonnet-4-5',
  max_tokens: 4096,
  system: buildCachedSystemPrompt(CachePreset.DATABASE),
  messages: [{ role: 'user', content: 'Create budget API endpoint' }]
});

messages.push(
  { role: 'user', content: 'Create budget API endpoint' },
  { role: 'assistant', content: response1.content[0].text }
);

// Turn 2 - reuses cache + caches conversation
messages.push({ role: 'user', content: 'Now add RLS policies' });

const response2 = await client.messages.create({
  model: 'claude-sonnet-4-5',
  max_tokens: 4096,
  system: buildCachedSystemPrompt(CachePreset.DATABASE),
  messages: cacheConversationHistory(messages) // Adds cache_control to last message
});
```

**Result:** Each turn reuses the previous cache + incrementally caches the conversation.

---

## When Cache Breaks (Invalidation)

Cache is invalidated when:

1. **Content changes** (even whitespace)
2. **>5 minutes pass** without cache use (TTL expires)
3. **Tool definitions change** (adding/removing tools)
4. **Images are added/removed** anywhere in prompt
5. **Schema changes** (after running migrations)

**After migrations:**
```typescript
import { CacheableContent } from './scripts/claude-cache-helper';

// Clear cached DB types
CacheableContent.clearCache();

// Next request will rebuild cache with new schema
```

---

## Monitoring & Debugging

### Enable Detailed Logging

```typescript
const stats = calculateCacheStats(response.usage);
logCacheStats(stats);

// Output:
// 📊 Cache Performance:
//   ✅ Cache HIT
//   Cache read:  155,000 tokens
//   Cache write: 0 tokens
//   New input:   50 tokens
//   💰 Saved ~100% on input tokens
```

### Expected Cache Hit Rates

| Scenario | Expected Rate | Notes |
|----------|--------------|-------|
| Same session | 90-95% | High if schema unchanged |
| Multi-turn | 95%+ | Incremental caching |
| After migration | 0% | Cache invalidated |
| Cross-session | 60-80% | Depends on timing |

### Troubleshooting

**Cache miss when expected hit?**

1. Check content is identical (no timestamps/random IDs)
2. Verify within 5-minute window
3. Ensure cache_control is in same position
4. Check for tool/image changes

**Costs higher than expected?**

1. Monitor cache hit rates
2. Check if content exceeds 1024 token minimum
3. Verify cache_control placement
4. Review if content is truly static

---

## Integration Points

### Claude Code CLI
Claude Code automatically handles basic caching. This helper is for:
- Custom integrations
- Batch processing
- Agent workflows
- Cost optimization

### API Integration
```typescript
// In your API routes or services
import { buildCachedSystemPrompt, CachePreset } from '@/scripts/claude-cache-helper';

export async function generateCode(prompt: string) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: buildCachedSystemPrompt(CachePreset.DATABASE),
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}
```

---

## Best Practices

### ✅ DO

- Cache static content (CLAUDE.md, rules, DB types)
- Use consistent file reading order
- Monitor cache hit rates
- Clear cache after schema changes
- Place cache_control on last block of each section

### ❌ DON'T

- Cache dynamic content (git status, timestamps)
- Add random content to cached blocks
- Change tool definitions mid-session
- Expect cache hits across organizations
- Cache content <1024 tokens (won't work)

---

## Next Steps

1. **Read:** [CACHING-QUICK-REFERENCE.md](./CACHING-QUICK-REFERENCE.md) for common patterns
2. **Review:** [Full strategy](../docs-ai/contents/docs/CLAUDE-CACHING-STRATEGY.md) for deep dive
3. **Implement:** Use [claude-cache-helper.ts](../scripts/claude-cache-helper.ts) in your code
4. **Monitor:** Track cache hit rates and costs
5. **Optimize:** Adjust strategy based on usage patterns

---

## Support

- **Claude Docs:** https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- **Cookbook:** https://platform.claude.com/cookbook/misc-prompt-caching
- **Project Docs:** See files above

---

## Changelog

- **2026-02-02**: Initial implementation guide created
  - Added quick start
  - Created TypeScript helper utilities
  - Documented 3-layer caching strategy
