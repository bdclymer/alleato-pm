# Claude Prompt Caching Strategy

**Last Updated:** 2026-02-02
**Target Model:** Claude Sonnet 4.5 (minimum 1024 tokens for caching)

---

## Executive Summary

This document outlines the prompt caching strategy for the Alleato-Procore codebase to optimize:
- **Latency**: Reduce time-to-first-token for large context
- **Cost**: Save 90% on input tokens for cached content
- **Rate Limits**: Cache hits don't count against rate limits

**Key Metrics:**
- Core instructions: ~22,000 tokens (CLAUDE.md + rules) → **High priority for caching**
- Database types: ~136,000 tokens → **Critical for caching** (changes only on migrations)
- PRPs/plans: Variable (5,000-50,000 tokens) → **Context-dependent caching**

---

## Cache Hierarchy Strategy

We use **3 primary cache breakpoints** following the tools → system → messages hierarchy:

### Breakpoint 1: Tools (If Using MCP/Custom Tools)
- **What:** Tool definitions for Supabase, Playwright, file operations
- **When to cache:** All tool definitions should be cached together
- **Invalidation:** Only when new tools are added or schemas change
- **TTL:** 5-minute (refreshes on each use)

### Breakpoint 2: Core System Instructions (MANDATORY)
- **What:** CLAUDE.md + .claude/rules/*.md
- **Size:** ~22,000 tokens
- **When to cache:** Every request
- **Invalidation:** Only when documentation is updated (rare)
- **TTL:** 5-minute (refreshes automatically)
- **Why:** These are the foundation rules that apply to ALL tasks

### Breakpoint 3: Database Schema (CRITICAL)
- **What:** `frontend/src/types/database.types.ts`
- **Size:** ~136,000 tokens
- **When to cache:** Any database-related work
- **Invalidation:** Only after migrations (rare)
- **TTL:** 5-minute
- **Why:** Prevents re-reading 546KB file on every DB query

### Breakpoint 4: Conversation History (OPTIONAL)
- **What:** Recent conversation turns
- **When to cache:** Multi-turn conversations
- **Invalidation:** Each new user message
- **TTL:** 5-minute

---

## Recommended Caching Patterns by Use Case

### Pattern 1: Database Work (Most Common)
```json
{
  "system": [
    {
      "type": "text",
      "text": "<CLAUDE.md content>",
      "cache_control": {"type": "ephemeral"}
    },
    {
      "type": "text",
      "text": "<.claude/rules/*.md concatenated>",
      "cache_control": {"type": "ephemeral"}
    },
    {
      "type": "text",
      "text": "<database.types.ts content>",
      "cache_control": {"type": "ephemeral"}
    }
  ],
  "messages": [...]
}
```

**Expected savings:**
- First request: Pay 1.25x for cache write (~158,000 tokens)
- Subsequent requests: Pay 0.1x for cache read (~158,000 tokens)
- **Cost reduction: 88% on cached content**

### Pattern 2: Feature Implementation with PRP
```json
{
  "system": [
    {
      "type": "text",
      "text": "<CLAUDE.md + rules>",
      "cache_control": {"type": "ephemeral"}
    },
    {
      "type": "text",
      "text": "<database.types.ts>",
      "cache_control": {"type": "ephemeral"}
    },
    {
      "type": "text",
      "text": "<PRP document>",
      "cache_control": {"type": "ephemeral"}
    }
  ],
  "messages": [...]
}
```

**Use this when:**
- Implementing a feature from a PRP
- PRP is stable and won't change mid-implementation
- Multiple code generation steps expected

### Pattern 3: General Coding (No Database)
```json
{
  "system": [
    {
      "type": "text",
      "text": "<CLAUDE.md + rules>",
      "cache_control": {"type": "ephemeral"}
    }
  ],
  "messages": [...]
}
```

**Use this when:**
- Frontend-only work
- Documentation updates
- Non-database tasks

### Pattern 4: Long Conversations (Agent Workflows)
```json
{
  "system": [
    {
      "type": "text",
      "text": "<CLAUDE.md + rules>",
      "cache_control": {"type": "ephemeral"}
    },
    {
      "type": "text",
      "text": "<context (DB types, PRP, etc.)>",
      "cache_control": {"type": "ephemeral"}
    }
  ],
  "messages": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."},
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."},
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Next step...",
          "cache_control": {"type": "ephemeral"}
        }
      ]
    }
  ]
}
```

**Use this when:**
- Multi-step agent workflows
- Extended debugging sessions
- Iterative code changes

---

## Content Categorization

### ALWAYS Cache (High Value, Low Change Rate)

| Content | Size | Change Frequency | Invalidation Trigger |
|---------|------|------------------|---------------------|
| CLAUDE.md | ~4,500 tokens | Monthly | Documentation updates |
| .claude/rules/*.md | ~15,000 tokens | Weekly | New rules added |
| database.types.ts | ~136,000 tokens | Per migration | Schema changes |

**Total baseline cache:** ~155,000 tokens
**Cost per cache write:** $0.58 (at $3.75/MTok)
**Cost per cache read:** $0.05 (at $0.30/MTok)
**Break-even:** 2 requests with same context

### CONDITIONALLY Cache (Context-Dependent)

| Content | When to Cache | TTL |
|---------|---------------|-----|
| PRPs | During implementation | 5-min |
| Scaffold templates | Multi-file generation | 5-min |
| Design system docs | UI work sessions | 5-min |
| API documentation | API endpoint work | 5-min |
| Test fixtures | Test writing/debugging | 5-min |

### NEVER Cache (High Change Rate)

- Current git status (changes every commit)
- Current working file content (changes constantly)
- Real-time test results
- Playwright browser output
- Build/compile errors
- User's specific task instructions (each is unique)

---

## Implementation Guidelines

### For SDK Integration

If integrating Claude API directly:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';

const client = new Anthropic();

// Load cacheable content once
const CLAUDE_MD = readFileSync('CLAUDE.md', 'utf-8');
const RULES = [
  'SUPABASE-GATE.md',
  'CRITICAL-NEXTJS-ROUTING-RULES.md',
  'E2E-TESTING-STANDARDS.md',
  // ... other critical rules
].map(f => readFileSync(`.claude/rules/${f}`, 'utf-8')).join('\n\n---\n\n');

const DB_TYPES = readFileSync('frontend/src/types/database.types.ts', 'utf-8');

// Helper function to create cached system prompt
function createCachedSystemPrompt(includeDbTypes = true, additionalContext = null) {
  const blocks = [
    {
      type: "text",
      text: CLAUDE_MD,
      cache_control: { type: "ephemeral" }
    },
    {
      type: "text",
      text: RULES,
      cache_control: { type: "ephemeral" }
    }
  ];

  if (includeDbTypes) {
    blocks.push({
      type: "text",
      text: `# Database Schema\n\n${DB_TYPES}`,
      cache_control: { type: "ephemeral" }
    });
  }

  if (additionalContext) {
    blocks.push({
      type: "text",
      text: additionalContext,
      cache_control: { type: "ephemeral" }
    });
  }

  return blocks;
}

// Usage
const response = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 4096,
  system: createCachedSystemPrompt(true),
  messages: [
    { role: "user", content: "Create a new budget line item API endpoint" }
  ]
});
```

### For Claude Code CLI

Claude Code automatically handles caching, but you can optimize by:

1. **Keep CLAUDE.md at project root** (always loaded)
2. **Reference rules in CLAUDE.md** (loaded together)
3. **Use `/create-feature` for DB work** (triggers automatic type reading)

---

## Cost Analysis

### Example: 10 Database-Related Tasks in a Session

**Without Caching:**
- 10 requests × 158,000 tokens = 1,580,000 input tokens
- Cost: 1.58M × $3/MTok = **$4.74**

**With Caching:**
- Request 1: 158,000 cache write tokens × $3.75/MTok = $0.59
- Requests 2-10: 9 × 158,000 cache read tokens × $0.30/MTok = $0.43
- Total: **$1.02** (78% savings)

**Additional benefits:**
- Faster responses (cache hits skip processing)
- Don't count against rate limits

---

## Monitoring Cache Performance

### Key Metrics to Track

```typescript
// After each API call
console.log('Cache Performance:', {
  cache_read_tokens: response.usage.cache_read_input_tokens,
  cache_write_tokens: response.usage.cache_creation_input_tokens,
  new_input_tokens: response.usage.input_tokens,
  cache_hit_rate: response.usage.cache_read_input_tokens > 0 ? 'HIT' : 'MISS'
});
```

### Expected Cache Hit Rates

| Scenario | Expected Hit Rate | Notes |
|----------|------------------|-------|
| Same session, DB work | 90%+ | High if schema unchanged |
| Different sessions, same day | 60-80% | Depends on 5-min TTL |
| After migration | 0% | Cache invalidated by schema change |
| Multi-turn conversation | 95%+ | Incremental caching |

---

## Troubleshooting

### Cache Miss When Expected Hit

**Checklist:**
1. ✅ Content is 100% identical (even whitespace matters)
2. ✅ Within 5-minute TTL window
3. ✅ Same cache_control placement
4. ✅ No tool_choice changes
5. ✅ No image additions/removals

### Common Mistakes

❌ **Mistake:** Dynamically generating CLAUDE.md content with timestamps
```typescript
// DON'T DO THIS
const system = `${CLAUDE_MD}\n\n<!-- Generated at ${Date.now()} -->`;
```

✅ **Fix:** Keep content static
```typescript
const system = CLAUDE_MD; // No dynamic content
```

❌ **Mistake:** Placing cache_control on empty blocks
```json
{"type": "text", "text": "", "cache_control": {"type": "ephemeral"}}
```

✅ **Fix:** Only cache non-empty content

---

## When to Use 1-Hour Cache TTL

Consider upgrading to 1-hour cache for:

1. **Long-running agent sessions** (>5 min between requests)
2. **Batch processing** where requests are spread out
3. **User-facing features** where users may take >5 min to respond

**Cost trade-off:**
- 5-min write: $3.75/MTok
- 1-hour write: $6/MTok (+60% premium)
- 1-hour read: $0.30/MTok (same as 5-min)

**Break-even:** If requests are 5-60 min apart, 1-hour cache pays off

---

## Validation Checklist

Before deploying caching strategy:

- [ ] CLAUDE.md is static (no timestamps or dynamic content)
- [ ] Rules files are concatenated in consistent order
- [ ] database.types.ts is regenerated before caching (if schema changed)
- [ ] cache_control is placed on last block of each section
- [ ] Minimum 1024 tokens per cached section (for Sonnet)
- [ ] Monitoring is in place to track cache hit rates

---

## References

- [Claude Prompt Caching Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Prompt Caching Cookbook](https://platform.claude.com/cookbook/misc-prompt-caching)
- Project instructions: [CLAUDE.md](../../CLAUDE.md)
- Rules directory: [.claude/rules/](./.claude/rules/)

---

## Changelog

- **2026-02-02**: Initial strategy created
  - Identified 3 primary cache breakpoints
  - Estimated ~155K token baseline cache
  - Projected 78% cost savings for DB work
